import {
    Envelope,
    Err,
    MemberPayload_Membership,
    MembershipOp,
    Miniblock,
    MiniblockHeader,
    StreamAndCookie,
    StreamEvent,
    SyncCookie,
    SyncOp,
    SyncStreamsResponse,
} from '@river-build/proto'
import assert from 'assert'

import { StreamRpcClient, errorContains } from './streamRpcClient'
import {
    bin_toHexString,
    generateRandomUUID,
    streamIdFromBytes,
    streamIdToBytes,
    userIdFromAddress,
} from './utils'
import { database } from '../../prisma'
import { ParsedEvent, ParsedMiniblock, ParsedStreamAndCookie } from './types'
import { NotifyUser, notificationService } from '../../notificationService'
import { isChannelStreamId, isDMChannelStreamId, isGDMChannelStreamId } from './id'
import { Mute, StreamKind, SyncedStream } from '@prisma/client'
import { NotificationKind, NotifyUsersSchema } from '../../../types'
import { StreamsMonitorService } from './streamsMonitorService'
import { notificationServiceLogger } from '../../logger'
import { streamIdAsString } from '@river-build/sdk'

const logger = notificationServiceLogger.child({ label: 'syncedStreams' })

export function isDefined<T>(value: T | undefined | null): value is T {
    return <T>value !== undefined && <T>value !== null
}

export enum SyncState {
    Canceling = 'Canceling', // syncLoop, maybe syncId if was syncing, not is was starting or retrying
    NotSyncing = 'NotSyncing', // no syncLoop
    Retrying = 'Retrying', // syncLoop set, no syncId
    Starting = 'Starting', // syncLoop set, no syncId
    Syncing = 'Syncing', // syncLoop and syncId
}

export interface NonceStats {
    sequence: number
    nonce: string
    pingAt: number
    receivedAt?: number
    duration?: number
}

interface Nonces {
    [nonce: string]: NonceStats
}

interface PingHistogram {
    '0-10ms': number
    '10-50ms': number
    '50-100ms': number
    '100-500ms': number
    '500ms-1s': number
    '1s-5s': number
    '5s+': number
}

export interface PingInfo {
    nonces: Nonces // the nonce that the server should echo back
    currentSequence: number // the current sequence number
    pingInterval?: NodeJS.Timeout // for cancelling the next ping
    histogram: PingHistogram
}

export class SyncedStreams {
    // Starting the client creates the syncLoop
    // If an unrecverable error occurs, the process is exited(1)
    private syncLoop?: Promise<void>

    // syncId is used to add and remove streams from the sync subscription
    // The syncId is only set once a connection is established
    // On retry, it is cleared
    // After being cancelled, it is cleared
    private _syncId?: string

    // rpcClient is used to receive sync updates from the server
    private rpcClient: StreamRpcClient

    // retry logic
    private addToSyncQueue: SyncCookie[] = []
    private addToSyncInProcess: string | undefined = undefined
    private addSyncTask: Promise<void> | undefined

    private pingSendFailures: number = 0

    // Only responses related to the current syncId are processed.
    // Responses are queued and processed in order
    // and are cleared when sync stops
    private pingInfo: PingInfo = {
        currentSequence: 0,
        nonces: {},
        histogram: {
            '0-10ms': 0,
            '10-50ms': 0,
            '50-100ms': 0,
            '100-500ms': 0,
            '500ms-1s': 0,
            '1s-5s': 0,
            '5s+': 0,
        },
        pingInterval: undefined,
    }

    constructor(rpcClient: StreamRpcClient) {
        this.rpcClient = rpcClient
    }

    // public readonly syncId
    public get syncId(): string | undefined {
        return this._syncId
    }

    private set syncId(syncId: string | undefined) {
        this._syncId = syncId
    }

    public async startSyncStreams() {
        logger.info('startSyncStreams called')
        await this.createSyncLoop()
        logger.info('startSyncStreams created sync loop')
    }

    private async addSyncTaskFunction(syncCookie: SyncCookie) {
        try {
            await this.rpcClient.addStreamToSync({
                syncId: this.syncId,
                syncPos: syncCookie,
            })
            logger.info('addedStreamToSync requested', {
                syncId: this.syncId,
                streamId: streamIdAsString(syncCookie?.streamId ?? ''),
            })
        } catch (error) {
            // Trigger restart of sync loop
            logger.error(`addedStreamToSync error`, { error })
            if (errorContains(error, Err.BAD_SYNC_COOKIE)) {
                logger.error('addStreamToSync BAD_SYNC_COOKIE', { syncCookie })
                throw error
            }
        } finally {
            // The next request will be started when the current one is completed
            this.addSyncTask = undefined
        }
    }

    private startAddToSyncRequest(syncCookie: SyncCookie) {
        // For now we only allow one at a time
        if (this.addSyncTask) {
            // If the pending addSyncTask is already in progress, wait for it to complete
            logger.warn('startAddToSyncRequest: addSyncTask already exists')
            this.addSyncTask.then(() => {
                this.addSyncTask = this.addSyncTaskFunction(syncCookie)
            })
        } else {
            this.addSyncTask = this.addSyncTaskFunction(syncCookie)
        }
    }

    // adds stream to the sync subscription
    public addStreamToSync(syncCookie: SyncCookie) {
        if (this.syncId) {
            this.addToSyncQueue.push(syncCookie)

            if (!this.addToSyncInProcess) {
                if (this.addToSyncQueue.length > 0) {
                    const nextSyncCookie = this.addToSyncQueue.shift()
                    if (nextSyncCookie) {
                        this.addToSyncInProcess = streamIdAsString(nextSyncCookie.streamId)
                        this.startAddToSyncRequest(nextSyncCookie)
                    }
                }
            }
        } else {
            logger.info(
                'addStreamToSync: not in "syncing" state; let main sync loop handle this with its streams map',
                {
                    syncId: this.syncId ?? 'undefined',
                    streamId: syncCookie.streamId,
                },
            )
        }
    }

    // remove stream from the sync subsbscription
    public async removeStreamFromSync(streamId: string): Promise<void> {
        if (this.syncId) {
            try {
                await this.rpcClient.removeStreamFromSync({
                    syncId: this.syncId,
                    streamId: streamIdToBytes(streamId),
                })
            } catch (error) {
                // Trigger restart of sync loop
                logger.info('removeStreamFromSync error', { error })
            }
            logger.info(`removed stream ${streamId} from sync`, { streamId })
        } else {
            logger.info(
                'removeStreamFromSync: not in "syncing" state; let main sync loop handle this with its streams map',
                {
                    syncId: this.syncId ?? 'undefined',
                    streamId,
                },
            )
        }
    }

    private async createSyncLoop() {
        logger.info('createSyncLoop called')
        return new Promise<void>((resolve, reject) => {
            logger.info('starting sync loop')

            if (this.syncLoop) {
                reject(new Error('createSyncLoop called while a loop exists'))
            }

            this.syncLoop = (async (): Promise<void> => {
                logger.info('sync loop created')
                resolve()

                try {
                    // syncId needs to be reset before starting a new syncStreams
                    // syncStreams() should return a new syncId
                    this.syncId = undefined

                    logger.info('calling syncStreams')
                    // Start an empty sync, streams will be added later
                    const streams = this.rpcClient.syncStreams({})

                    logger.info('called syncStreams', { streams })
                    const iterator = streams[Symbol.asyncIterator]()

                    let result

                    while (!(result = await iterator.next()).done) {
                        const { value } = result
                        logger.info('syncStreams received next', { value })

                        if (value === undefined) {
                            logger.warn('syncStreams received undefined')
                            process.exit(1)
                        }

                        if (!value.syncId || !value.syncOp) {
                            logger.info('missing syncId or syncOp', {
                                value,
                            })
                            continue
                        }
                        switch (value.syncOp) {
                            case SyncOp.SYNC_NEW:
                                await this.syncStarted(value.syncId)
                                break
                            case SyncOp.SYNC_CLOSE:
                                this.syncClose(value)
                                break
                            case SyncOp.SYNC_UPDATE:
                                await this.syncUpdate(value)
                                break
                            case SyncOp.SYNC_PONG:
                                this.syncPong(value)
                                break
                            case SyncOp.SYNC_DOWN:
                                await this.syncDown(value)
                                break
                            default:
                                logger.warn(
                                    `unknown syncOp { syncId: ${this.syncId}, syncOp: ${value.syncOp} }`,
                                )
                                break
                        }
                    }
                } catch (error) {
                    logger.error('syncLoop error', { error })
                    // This is running in AWA ECS, so it will get restarted
                    process.exit(1)
                }
            })()
        })
    }

    private async syncStarted(syncId: string) {
        if (!this.syncId) {
            this.syncId = syncId

            this.sendKeepAlivePings() // ping the server periodically to keep the connection alive
            logger.info(`syncStarted syncId: ${this.syncId}`, {
                syncId: this.syncId,
            })

            // TODO This needs to be stopped if the sync stops before loading from the database is complete
            const start = Date.now()

            const dbSyncedStreams = await database.syncedStream.findMany()

            logger.info('fetched streams to sync', {
                streamCount: dbSyncedStreams.length,
                duration: Date.now() - start,
            })

            for (const dbStream of dbSyncedStreams) {
                const syncCookie = SyncCookie.fromJsonString(dbStream.SyncCookie)
                this.addStreamToSync(syncCookie)
            }

            logger.info('addStreamToSync completed with len of syncCookies', {
                streamCount: dbSyncedStreams.length,
            })
        } else {
            logger.info(`syncStarted: invalid state transition `)
            process.exit(1)
        }
    }

    private async syncClose(res: SyncStreamsResponse) {
        logger.warn('syncClose', { res })
        if (this.syncId !== res.syncId) {
            logger.error('syncDown syncId mismatch', {
                syncId: this.syncId,
                resSyncId: res.syncId,
            })
        }
        process.exit(1)
    }

    private async syncDown(res: SyncStreamsResponse) {
        logger.warn('syncDown', { res })
        if (this.syncId !== res.syncId) {
            logger.error('syncDown syncId mismatch', {
                syncId: this.syncId,
                resSyncId: res.syncId,
            })
            process.exit(1)
        }
    }

    private updatePingHistogram(duration: number) {
        if (duration <= 10) {
            this.pingInfo.histogram['0-10ms']++
        } else if (duration <= 50) {
            this.pingInfo.histogram['10-50ms']++
        } else if (duration <= 100) {
            this.pingInfo.histogram['50-100ms']++
        } else if (duration <= 500) {
            this.pingInfo.histogram['100-500ms']++
        } else if (duration <= 1000) {
            this.pingInfo.histogram['500ms-1s']++
        } else if (duration <= 5000) {
            this.pingInfo.histogram['1s-5s']++
        } else {
            this.pingInfo.histogram['5s+']++
        }
    }

    private syncPong(value: SyncStreamsResponse) {
        const pingStats = this.pingInfo.nonces[value.pongNonce]
        if (pingStats) {
            pingStats.receivedAt = performance.now()
            pingStats.duration = pingStats.receivedAt - pingStats.pingAt

            this.updatePingHistogram(pingStats.duration)
            delete this.pingInfo.nonces[value.pongNonce]
        } else {
            logger.error(`pong nonce not found`, { pingInfo: this.pingInfo, value })
        }
    }

    private async syncUpdate(res: SyncStreamsResponse): Promise<void> {
        const start = Date.now()
        // Until we've completed canceling, accept responses
        if (this.syncId != res.syncId) {
            throw new Error(
                `syncId mismatch; has:'${this.syncId}', got:${res.syncId}'. Throw away update.`,
            )
        }
        const syncStream = res.stream
        if (syncStream !== undefined) {
            logger.info('check addToSyncInProcess ', {
                addToSyncInProcess: this.addToSyncInProcess,
                nextSyncCookie: syncStream.nextSyncCookie,
                streamId: streamIdAsString(syncStream.nextSyncCookie?.streamId ?? ''),
            })
            // Once we have data acknowling the pending addStreamToSync, we can start the next one
            if (
                this.addToSyncInProcess &&
                syncStream.nextSyncCookie &&
                this.addToSyncInProcess === streamIdAsString(syncStream.nextSyncCookie.streamId)
            ) {
                logger.info('addToSyncInProcess acknowledged', {
                    streamId: this.addToSyncInProcess,
                })
                if (this.addToSyncQueue.length > 0) {
                    const nextSyncCookie = this.addToSyncQueue.shift()
                    if (nextSyncCookie) {
                        this.addToSyncInProcess = streamIdAsString(nextSyncCookie.streamId)
                        this.startAddToSyncRequest(nextSyncCookie)
                    }
                }
            }
            const streamId = syncStream.nextSyncCookie?.streamId
                ? bin_toHexString(syncStream.nextSyncCookie.streamId)
                : ''
            try {
                logger.info('sync onUpdate', { streamId })
                if (syncStream.syncReset) {
                    logger.warn('syncReset', { streamId })
                }

                const streamAndCookie = await unpackStreamAndCookie(syncStream)

                if (streamAndCookie.events.length > 0) {
                    if (isDMChannelStreamId(streamId) || isGDMChannelStreamId(streamId)) {
                        await this.handleDmOrGDMStreamUpdate(streamAndCookie, streamId)
                    } else if (isChannelStreamId(streamId)) {
                        await this.handleChannelStreamUpdate(streamAndCookie, streamId)
                    }
                }

                const kind = isDMChannelStreamId(streamId)
                    ? StreamKind.DM
                    : isChannelStreamId(streamId)
                    ? StreamKind.Channel
                    : isGDMChannelStreamId(streamId)
                    ? StreamKind.GDM
                    : undefined

                if (kind === undefined) {
                    logger.error('stream kind is undefined', { streamId })
                } else {
                    await database.syncedStream.upsert({
                        where: {
                            StreamId: streamId,
                        },
                        update: {
                            SyncCookie: streamAndCookie.nextSyncCookie.toJsonString(),
                        },
                        create: {
                            Kind: kind,
                            StreamId: streamId,
                            SyncCookie: streamAndCookie.nextSyncCookie.toJsonString(),
                        },
                    })
                }
            } catch (error) {
                logger.error('onUpdate error:', { error, syncStream, streamId })
            }
        } else {
            logger.info('sync RESULTS no stream', { syncStream })
        }
        logger.info('syncUpdate completed', { duration: Date.now() - start })
    }

    private async handleDmOrGDMStreamUpdate(
        streamAndCookie: ParsedStreamAndCookie,
        streamId: string,
    ) {
        const syncedStream = await database.syncedStream.findUnique({
            where: { StreamId: streamId },
        })

        if (!syncedStream) {
            logger.info(`syncedStream not found for streamId ${streamId}`, {
                streamId,
            })
            return
        }

        const streamKind = syncedStream.Kind
        let payloadCase = ''
        if (streamKind === StreamKind.DM) {
            payloadCase = 'dmChannelPayload'
        } else if (streamKind === StreamKind.GDM) {
            payloadCase = 'gdmChannelPayload'
        }

        logger.info(`handleDmOrGDMStreamUpdate for ${streamKind}`)

        for (const { event, creatorUserId } of streamAndCookie.events) {
            const isMessage =
                event.payload.case === payloadCase && event.payload.value.content.case === 'message'
            const isMembershipUpdate =
                event.payload.case === 'memberPayload' &&
                event.payload.value.content.case === 'membership'

            if (isMessage) {
                await this.handleDmOrGdmMessageUpdate(syncedStream, streamId, event, creatorUserId)
            } else if (isMembershipUpdate) {
                await this.handleMembershipUpdate(syncedStream, streamId, event)
            }
        }
    }

    private async handleChannelStreamUpdate(
        streamAndCookie: ParsedStreamAndCookie,
        streamId: string,
    ) {
        const syncedStream = await database.syncedStream.findUnique({
            where: { StreamId: streamId },
        })

        if (!syncedStream) {
            logger.info(`syncedStream not found for streamId ${streamId}`, {
                streamId,
            })
            return
        }

        logger.info(`handleChannelStreamUpdate ${streamId}`, { streamId })

        for (const { event, creatorUserId } of streamAndCookie.events) {
            const isMessage =
                event.payload.case === 'channelPayload' &&
                event.payload.value.content.case === 'message'
            const isMembershipUpdate =
                event.payload.case === 'memberPayload' &&
                event.payload.value.content.case === 'membership'

            if (isMessage) {
                await this.handleChannelMessageUpdate(syncedStream, streamId, event, creatorUserId)
            } else if (isMembershipUpdate) {
                await this.handleMembershipUpdate(syncedStream, streamId, event)
            }
        }
    }

    private async handleChannelMessageUpdate(
        syncedStream: SyncedStream,
        streamId: string,
        event: StreamEvent,
        creatorUserId: string,
    ) {
        logger.info(`handleChannelMessageStreamUpdate ${streamId}`, { streamId })

        const usersTaggedOrMentioned = await database.notificationTag.findMany({
            where: {
                ChannelId: streamId,
            },
        })

        if (usersTaggedOrMentioned.length < 0) {
            logger.info(`no users tagged or mentioned for stream ${streamId}`, {
                streamId,
            })
            return
        }

        const channelSettings = await database.userSettingsChannel.findFirst({
            where: { ChannelId: streamId },
        })
        if (!channelSettings) {
            logger.error(`channelSettings not found for stream ${streamId}`, {
                streamId,
            })
            return
        }

        const notificationData: NotifyUsersSchema = {
            sender: creatorUserId,
            users: syncedStream.UserIds,
            payload: {
                content: {
                    kind: NotificationKind.NewMessage,
                    spaceId: channelSettings.SpaceId,
                    channelId: streamId,
                    senderId: creatorUserId,
                    event: event.toJson(),
                },
            },
            forceNotify: false,
        }

        const usersToNotify = await notificationService.getUsersToNotify(
            notificationData,
            streamId,
            usersTaggedOrMentioned,
        )

        if (usersToNotify.length === 0) {
            logger.info(`no users to notify for channel stream ${streamId}`, {
                streamId,
            })
            return
        }

        logger.info(`usersToNotify`, { usersToNotify })

        await this.dispatchNotification(notificationData, usersToNotify)

        await database.notificationTag.deleteMany({
            where: {
                ChannelId: streamId,
            },
        })
    }

    private async handleDmOrGdmMessageUpdate(
        syncedStream: SyncedStream,
        streamId: string,
        event: StreamEvent,
        creatorUserId: string,
    ) {
        logger.info(`handleMessageStreamUpdate ${streamId}`, { streamId })

        const userIds: string[] = []
        const dbStreamUsers = syncedStream.UserIds
        if (!dbStreamUsers.includes(creatorUserId)) {
            logger.error(`creatorUserId not in stream: ${creatorUserId}`, {
                dbStreamUsers,
            })
            return
        }

        dbStreamUsers.forEach((user) => {
            if (user !== creatorUserId) {
                userIds.push(user)
            }
        })

        const usersTaggedOrMentioned = await database.notificationTag.findMany({
            where: {
                ChannelId: streamId,
            },
        })

        const notificationData: NotifyUsersSchema = {
            sender: creatorUserId,
            users: userIds,
            payload: {
                content: {
                    kind: NotificationKind.DirectMessage,
                    channelId: streamId,
                    senderId: creatorUserId,
                    recipients: userIds,
                    event: event.toJson(),
                },
            },
            forceNotify: false,
        }

        const usersToNotify = await notificationService.getUsersToNotify(
            notificationData,
            streamId,
            usersTaggedOrMentioned,
        )

        if (usersToNotify.length === 0) {
            logger.info(`no users to notify for channel stream ${streamId}`, {
                streamId,
            })
            return
        }

        await this.dispatchNotification(notificationData, Object.values(usersToNotify))

        await database.notificationTag.deleteMany({
            where: {
                ChannelId: streamId,
            },
        })
    }

    private async handleMembershipUpdate(
        syncedStream: SyncedStream,
        streamId: string,
        event: StreamEvent,
    ) {
        logger.info(`handleMembershipUpdate ${streamId}`, { streamId })

        const value = event.payload.value?.content.value as MemberPayload_Membership
        const { op } = value
        if (op === MembershipOp.SO_JOIN) {
            const userAddress = userIdFromAddress(value.userAddress)
            const parentStreamId = value.streamParentId
                ? streamIdFromBytes(value.streamParentId)
                : ''
            logger.info(`stream ${streamId} membership update SO_JOIN for user ${userAddress}`, {
                parentStreamId: parentStreamId,
                streamId,
                userAddress,
            })
            if (!syncedStream?.UserIds.includes(userAddress)) {
                logger.info('adding user to stream', userAddress)
                await database.syncedStream.update({
                    where: { StreamId: streamId },
                    data: {
                        UserIds: {
                            push: userAddress,
                        },
                    },
                })
            }
            await this.addJoinedUserToChannelSettings(parentStreamId, streamId, userAddress)
            await StreamsMonitorService.instance.addNewStreamsToDB(new Set([streamId]))
        }
        if (op === MembershipOp.SO_LEAVE) {
            const userAddress = userIdFromAddress(value.userAddress)
            logger.info(`stream ${streamId} membership update SO_LEAVE for user ${userAddress}`, {
                streamId,
                userAddress,
            })
            if (syncedStream?.UserIds.includes(userAddress)) {
                logger.info('removing user from stream', userAddress)
                await database.syncedStream.update({
                    where: { StreamId: streamId },
                    data: {
                        UserIds: {
                            set: syncedStream.UserIds.filter((u) => u !== userAddress),
                        },
                    },
                })
            }
            await this.removeLeftUserFromChannelSettings(streamId, userAddress)
        }
    }

    private async addJoinedUserToChannelSettings(
        spaceId: string,
        channelId: string,
        userId: string,
    ) {
        logger.info('add user who had joined the channel', {
            spaceId,
            channelId,
            userId,
        })
        await database.userSettingsChannel.upsert({
            where: {
                UserId_ChannelId: {
                    ChannelId: channelId,
                    UserId: userId,
                },
            },
            update: {},
            create: {
                ChannelId: channelId,
                UserId: userId,
                SpaceId: spaceId,
                ChannelMute: Mute.default,
            },
        })
    }

    private async removeLeftUserFromChannelSettings(channelId: string, userId: string) {
        logger.info('remove user who had left the channel', {
            channelId,
            userId,
        })
        await database.userSettingsChannel.delete({
            where: {
                UserId_ChannelId: {
                    ChannelId: channelId,
                    UserId: userId,
                },
            },
        })
    }

    private async dispatchNotification(
        notificationData: NotifyUsersSchema,
        usersToNotify: NotifyUser[],
    ) {
        const pushNotificationRequests = await notificationService.createNotificationAsyncRequests(
            notificationData,
            usersToNotify,
        )

        const result = await Promise.allSettled(pushNotificationRequests)
        let notificationSuccessCount = 0
        let notificationFailureCount = 0
        let notificationExceptionCount = 0
        for (const r of result) {
            if (r.status === 'rejected') {
                logger.error('dispatchNotification exception', { exception: r.reason })
                notificationExceptionCount++
            } else {
                if (r.value.status === 'success') {
                    notificationSuccessCount++
                } else {
                    notificationFailureCount++
                }
            }
        }
        logger.info('notificationsSentCount', {
            userNotifiedCount: usersToNotify.length,
            notificationSuccessCount,
            notificationFailureCount,
            notificationExceptionCount,
        })
    }

    public async healthCheck() {
        notificationServiceLogger.info(`logging heahtlCheck`)
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { pingInterval, ...pingInfoWithoutInterval } = this.pingInfo

        return { pingSendFailures: this.pingSendFailures, pingInfo: pingInfoWithoutInterval }
    }

    private sendKeepAlivePings() {
        // periodically ping the server to keep the connection alive
        this.pingInfo.pingInterval = setTimeout(() => {
            const ping = async () => {
                if (this.syncId) {
                    const n = generateRandomUUID()
                    try {
                        this.pingInfo.nonces[n] = {
                            sequence: this.pingInfo.currentSequence++,
                            nonce: n,
                            pingAt: performance.now(),
                        }
                        //
                        if (Object.keys(this.pingInfo.nonces).length > 5) {
                            logger.error('too many outstanding pings', { pingInfo: this.pingInfo })
                            process.exit(1)
                        }
                        await this.rpcClient.pingSync({
                            syncId: this.syncId,
                            nonce: n,
                        })
                        this.pingSendFailures = 0
                    } catch (error) {
                        this.pingSendFailures++
                        logger.error('sendKeepAlivePings error', {
                            error,
                            pingSendFailures: this.pingSendFailures,
                        })
                        if (this.pingSendFailures > 5) {
                            logger.error('too many ping failures')
                            process.exit(1)
                        }
                    }
                    this.sendKeepAlivePings()
                }
            }
            void ping()
        }, 10 * 1000) // every 10 seconds
    }

    private logInvalidStateAndReturnError(currentState: SyncState, newState: SyncState): Error {
        logger.info(`invalid state transition ${currentState} -> ${newState}`)
        return new Error(`invalid state transition ${currentState} -> ${newState}`)
    }
}

export async function unpackStream(stream?: StreamAndCookie): Promise<ParsedStreamAndCookie> {
    assert(stream !== undefined, 'bad stream')
    const streamAndCookie = await unpackStreamAndCookie(stream)
    assert(
        stream.miniblocks.length > 0,
        `bad stream: no blocks ${streamAndCookie.nextSyncCookie.streamId}`,
    )

    return streamAndCookie
}

export async function unpackStreamAndCookie(
    streamAndCookie: StreamAndCookie,
): Promise<ParsedStreamAndCookie> {
    assert(streamAndCookie.nextSyncCookie !== undefined, 'bad stream: no cookie')
    const miniblocks = await Promise.all(
        streamAndCookie.miniblocks.map(async (mb) => await unpackMiniblock(mb)),
    )
    return {
        events: await unpackEnvelopes(streamAndCookie.events),
        nextSyncCookie: streamAndCookie.nextSyncCookie,
        miniblocks: miniblocks,
    }
}

export async function unpackMiniblock(miniblock: Miniblock): Promise<ParsedMiniblock> {
    // check(isDefined(miniblock.header), 'Miniblock header is not set')
    const header = await unpackEnvelope(miniblock.header!)
    // check(
    // header.event.payload.case === 'miniblockHeader',
    // `bad miniblock header: wrong case received: ${header.event.payload.case}`,
    // )
    const events = await unpackEnvelopes(miniblock.events)
    return {
        hash: miniblock.header!.hash,
        header: header.event.payload.value as MiniblockHeader,
        events: [...events, header],
    }
}

export async function unpackEnvelope(envelope: Envelope): Promise<ParsedEvent> {
    // check(hasElements(envelope.event), 'Event base is not set', Err.BAD_EVENT)
    // check(hasElements(envelope.hash), 'Event hash is not set', Err.BAD_EVENT)
    // check(hasElements(envelope.signature), 'Event signature is not set', Err.BAD_EVENT)

    // const hash = riverHash(envelope.event)
    // check(bin_equal(hash, envelope.hash), 'Event id is not valid', Err.BAD_EVENT_ID)

    // const recoveredPubKey = riverRecoverPubKey(hash, envelope.signature)

    const event = StreamEvent.fromBinary(envelope.event)
    // if (!hasElements(event.delegateSig)) {
    //     const address = publicKeyToAddress(recoveredPubKey)
    //     check(
    //         bin_equal(address, event.creatorAddress),
    //         'Event signature is not valid',
    //         Err.BAD_EVENT_SIGNATURE,
    //     )
    // } else {
    //     checkDelegateSig(recoveredPubKey, event.creatorAddress, event.delegateSig)
    // }

    // if (event.prevMiniblockHash) {
    //     // TODO replace with a proper check
    //     // check(
    //     //     bin_equal(e.prevEvents[0], prevEventHash),
    //     //     'prevEvents[0] is not valid',
    //     //     Err.BAD_PREV_EVENTS,
    //     // )
    // }

    return {
        event,
        hash: envelope.hash,
        hashStr: bin_toHexString(envelope.hash),
        prevMiniblockHashStr: event.prevMiniblockHash
            ? bin_toHexString(event.prevMiniblockHash)
            : undefined,
        creatorUserId: userIdFromAddress(event.creatorAddress),
    }
}

export async function unpackEnvelopes(event: Envelope[]): Promise<ParsedEvent[]> {
    const ret: ParsedEvent[] = []
    //let prevEventHash: Uint8Array | undefined = undefined
    for (const e of event) {
        // TODO: this handling of prevEventHash is not correct,
        // hashes should be checked against all preceding events in the stream.
        ret.push(await unpackEnvelope(e))
        //prevEventHash = e.hash!
    }
    return ret
}
