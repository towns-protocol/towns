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
} from '@river/proto'
import assert from 'assert'
import { nanoid } from 'nanoid'

import { StreamRpcClient, errorContains } from '../../../infrastructure/rpc/streamRpcClient'
import { bin_toHexString, streamIdToBytes, userIdFromAddress } from './utils'
import { database } from '../../../infrastructure/database/prisma'
import { ParsedEvent, ParsedMiniblock, ParsedStreamAndCookie } from './types'
import { NotifyUser, NotifyUsers, notificationService } from '../notificationService'
import { isChannelStreamId, isDMChannelStreamId, isGDMChannelStreamId } from './id'
import { StreamKind, SyncedStream } from '@prisma/client'
import { NotificationKind, NotifyUsersSchema } from '../../../types'
import { createLogger } from '../logger'

const logger = createLogger('syncedStreams')

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

/**
 * See https://www.notion.so/herenottherelabs/RFC-Sync-hardening-e0552a4ed68a4d07b42ae34c69ee1bec?pvs=4#861081756f86423ea668c62b9eb76f4b
 Valid state transitions:
	[*] --> NotSyncing
	NotSyncing --> Starting
	Starting --> Syncing
	Starting --> Canceling: failed / stop sync
	Starting --> Retrying: connection error
	Syncing --> Canceling: connection aborted / stop sync
	Syncing --> Retrying: connection error
    Syncing --> Syncing: resync
	Retrying --> Canceling: stop sync
	Retrying --> Syncing: resume
    Retrying --> Retrying: still retrying
	Canceling --> NotSyncing
 */
const stateConstraints: Record<SyncState, Set<SyncState>> = {
    [SyncState.NotSyncing]: new Set([SyncState.Starting]),
    [SyncState.Starting]: new Set([SyncState.Syncing, SyncState.Retrying, SyncState.Canceling]),
    [SyncState.Syncing]: new Set([SyncState.Canceling, SyncState.Retrying]),
    [SyncState.Retrying]: new Set([
        SyncState.Starting,
        SyncState.Canceling,
        SyncState.Syncing,
        SyncState.Retrying,
    ]),
    [SyncState.Canceling]: new Set([SyncState.NotSyncing]),
}

interface NonceStats {
    sequence: number
    nonce: string
    pingAt: number
    receivedAt?: number
    duration?: number
}

interface Nonces {
    [nonce: string]: NonceStats
}

interface PingInfo {
    nonces: Nonces // the nonce that the server should echo back
    currentSequence: number // the current sequence number
    pingInterval?: NodeJS.Timeout // for cancelling the next ping
}

export class SyncedStreams {
    // mapping of stream id to stream
    private readonly streams: Map<string, StreamAndCookie> = new Map()

    // Starting the client creates the syncLoop
    // While a syncLoop exists, the client tried to keep the syncLoop connected, and if it reconnects, it
    // will restart sync for all Streams
    // on stop, the syncLoop will be cancelled if it is runnign and removed once it stops
    private syncLoop?: Promise<number>

    // syncId is used to add and remove streams from the sync subscription
    // The syncId is only set once a connection is established
    // On retry, it is cleared
    // After being cancelled, it is cleared
    private syncId?: string

    // rpcClient is used to receive sync updates from the server
    private rpcClient: StreamRpcClient
    // syncState is used to track the current sync state
    private _syncState: SyncState = SyncState.NotSyncing
    // retry logic
    private abortRetry: (() => void) | undefined
    private currentRetryCount: number = 0
    private forceStopSyncStreams: (() => void) | undefined
    private interruptSync: ((err: unknown) => void) | undefined

    // Only responses related to the current syncId are processed.
    // Responses are queued and processed in order
    // and are cleared when sync stops
    private responsesQueue: SyncStreamsResponse[] = []
    private inProgressTick?: Promise<void>
    private pingInfo: PingInfo = {
        currentSequence: 0,
        nonces: {},
    }

    constructor(rpcClient: StreamRpcClient) {
        this.rpcClient = rpcClient
    }

    public has(streamId: string): boolean {
        return this.streams.get(streamId) !== undefined
    }

    public get(streamId: string): StreamAndCookie | undefined {
        return this.streams.get(streamId)
    }

    public set(streamId: string, stream: StreamAndCookie): void {
        logger.info(`set ${streamId}`, { streamId })
        this.streams.set(streamId, stream)
    }

    public delete(streamId: string) {
        // this.streams.get(streamId)?.stop()
        this.streams.delete(streamId)
    }

    public size(): number {
        return this.streams.size
    }

    public getStreams(): StreamAndCookie[] {
        return Array.from(this.streams.values())
    }

    public getStreamIds(): string[] {
        return Array.from(this.streams.keys())
    }

    public async startSyncStreams() {
        return this.createSyncLoop()
    }

    public checkStartTicking() {
        if (this.inProgressTick) {
            logger.info('inProgressTick')
            return
        }

        if (this.responsesQueue.length === 0) {
            return
        }

        const tick = this.tick()
        this.inProgressTick = tick
        queueMicrotask(() => {
            tick.catch((error) => logger.error('ProcessTick Error', { error })).finally(() => {
                this.inProgressTick = undefined
                this.checkStartTicking()
            })
        })
    }

    private async tick() {
        const item = this.responsesQueue.shift()
        if (!item || item.syncId !== this.syncId) {
            return
        }
        await this.onUpdate(item)
    }

    public async stopSync() {
        logger.info('sync STOP CALLED')
        this.responsesQueue = []
        if (stateConstraints[this.syncState].has(SyncState.Canceling)) {
            const syncId = this.syncId
            const syncLoop = this.syncLoop
            const syncState = this.syncState
            this.setSyncState(SyncState.Canceling)
            this.stopPing()
            try {
                this.abortRetry?.()
                // Give the server 5 seconds to respond to the cancelSync RPC before forceStopSyncStreams
                const breakTimeout = syncId
                    ? setTimeout(() => {
                          logger.info(`calling forceStopSyncStreams ${syncId}`, {
                              syncId,
                          })
                          this.forceStopSyncStreams?.()
                      }, 5000)
                    : undefined

                logger.info('stopSync syncState', { syncState })
                logger.info('stopSync syncLoop', { syncLoop })
                logger.info('stopSync syncId', { syncId })
                const result = await Promise.allSettled([
                    syncId ? await this.rpcClient.cancelSync({ syncId }) : undefined,
                    syncLoop,
                ])
                logger.info('syncLoop awaited', { syncId, result })
                clearTimeout(breakTimeout)
            } catch (error) {
                logger.info('sync STOP ERROR', { error })
            }
            logger.info('sync STOP DONE', { syncId })
        } else {
            logger.info(`WARN: stopSync called from invalid state ${this.syncState}`)
        }
    }

    // adds stream to the sync subscription
    public async addStreamToSync(syncCookie: SyncCookie): Promise<void> {
        /*
        const stream = this.streams.has(syncCookie.streamId)

        if (stream) {
            logger.info('addStreamToSync streamId already syncing', syncCookie)
            return
        }
        */
        if (this.syncState === SyncState.Syncing) {
            try {
                await this.rpcClient.addStreamToSync({
                    syncId: this.syncId,
                    syncPos: syncCookie,
                })
                logger.info('addedStreamToSync', { syncCookie })
            } catch (error) {
                // Trigger restart of sync loop
                logger.error(`addedStreamToSync error`, { error })
                if (errorContains(error, Err.BAD_SYNC_COOKIE)) {
                    logger.error('addStreamToSync BAD_SYNC_COOKIE', { syncCookie })
                    throw error
                }
            }
        } else {
            logger.info(
                `addStreamToSync: not in "syncing" state; let main sync loop handle this with its streams map ${syncCookie.streamId}`,
            )
        }
    }

    // remove stream from the sync subsbscription
    public async removeStreamFromSync(streamId: string): Promise<void> {
        const stream = this.streams.get(streamId)
        if (!stream) {
            logger.info(`removeStreamFromSync streamId ${streamId} not found`, {
                streamId,
            })
            // no such stream
            return
        }
        if (this.syncState === SyncState.Syncing) {
            try {
                await this.rpcClient.removeStreamFromSync({
                    syncId: this.syncId,
                    streamId: streamIdToBytes(streamId),
                })
            } catch (error) {
                // Trigger restart of sync loop
                logger.info('removeStreamFromSync error', { error })
            }
            // stream.stop()
            this.streams.delete(streamId)
            logger.info(`removed stream ${streamId} from sync`, { streamId })
        } else {
            logger.info(
                'removeStreamFromSync: not in "syncing" state; let main sync loop handle this with its streams map',
                { streamId },
            )
        }
    }

    private async createSyncLoop() {
        return new Promise<void>((resolve, reject) => {
            if (stateConstraints[this.syncState].has(SyncState.Starting)) {
                this.setSyncState(SyncState.Starting)
                logger.info('starting sync loop')
            } else {
                logger.info(
                    `runSyncLoop invalid state transition: ${this.syncState} -> ${SyncState.Starting}`,
                )
                reject(new Error('invalid state transition'))
            }

            if (this.syncLoop) {
                reject(new Error('createSyncLoop called while a loop exists'))
            }

            this.syncLoop = (async (): Promise<number> => {
                let iteration = 0

                logger.info('sync loop created')
                resolve()

                try {
                    while (
                        this.syncState === SyncState.Starting ||
                        this.syncState === SyncState.Syncing ||
                        this.syncState === SyncState.Retrying
                    ) {
                        logger.info(`sync ITERATION start ${++iteration} ${this.syncState}`)
                        if (this.syncState === SyncState.Retrying) {
                            this.setSyncState(SyncState.Starting)
                        }

                        // const syncCookies = Array.from(this.streams.values())
                        //     .map((stream) => stream.syncCookie)
                        //     .filter(isDefined)

                        try {
                            // syncId needs to be reset before starting a new syncStreams
                            // syncStreams() should return a new syncId
                            this.syncId = undefined

                            const dbSyncedStreams = await database.syncedStream.findMany()

                            const syncCookies: SyncCookie[] = []
                            for (const dbStream of dbSyncedStreams) {
                                syncCookies.push(SyncCookie.fromJsonString(dbStream.SyncCookie))
                            }

                            if (syncCookies.length === 0) {
                                logger.info('no syncCookies found')
                                await this.attemptRetry()
                                continue
                            }

                            const streams = this.rpcClient.syncStreams({
                                syncPos: syncCookies,
                            })

                            const iterator = streams[Symbol.asyncIterator]()

                            while (
                                this.syncState === SyncState.Syncing ||
                                this.syncState === SyncState.Starting
                            ) {
                                const interruptSyncPromise = new Promise<void>(
                                    (resolve, reject) => {
                                        this.forceStopSyncStreams = () => {
                                            logger.info('forceStopSyncStreams called')
                                            resolve()
                                        }
                                        this.interruptSync = (e: unknown) => {
                                            logger.info('sync interrupted', { e })
                                            reject(e)
                                        }
                                    },
                                )
                                const { value, done } = await Promise.race([
                                    iterator.next(),
                                    interruptSyncPromise.then(() => ({
                                        value: undefined,
                                        done: true,
                                    })),
                                ])
                                if (done || value === undefined) {
                                    logger.info('exiting syncStreams', done, value)
                                    // exit the syncLoop, it's done
                                    this.forceStopSyncStreams = undefined
                                    this.interruptSync = undefined
                                    return iteration
                                }

                                logger.info(
                                    `got syncStreams response syncOp ${value.syncOp} syncId ${value.syncId}`,
                                )

                                if (!value.syncId || !value.syncOp) {
                                    logger.info('missing syncId or syncOp', {
                                        value,
                                    })
                                    continue
                                }
                                let pingStats: NonceStats | undefined
                                switch (value.syncOp) {
                                    case SyncOp.SYNC_NEW:
                                        this.syncStarted(value.syncId)
                                        break
                                    case SyncOp.SYNC_CLOSE:
                                        this.syncClosed()
                                        break
                                    case SyncOp.SYNC_UPDATE:
                                        logger.info('SYNC_UPDATE', { value })
                                        this.responsesQueue.push(value)
                                        this.checkStartTicking()
                                        break
                                    case SyncOp.SYNC_PONG:
                                        logger.info('SYNC_PONG', { value })
                                        pingStats = this.pingInfo.nonces[value.pongNonce]
                                        if (pingStats) {
                                            pingStats.receivedAt = performance.now()
                                            pingStats.duration =
                                                pingStats.receivedAt - pingStats.pingAt
                                        } else {
                                            logger.error(`pong nonce not found ${value.pongNonce}`)
                                            this.printNonces()
                                        }
                                        break
                                    default:
                                        logger.info(
                                            `unknown syncOp { syncId: ${this.syncId}, syncOp: ${value.syncOp} }`,
                                        )
                                        break
                                }
                            }
                        } catch (error) {
                            logger.error('syncLoop error', { error })
                            await this.attemptRetry()
                        }
                    }
                } finally {
                    logger.info(`sync loop stopping ITERATION ${iteration}`)
                    this.stopPing()
                    if (stateConstraints[this.syncState].has(SyncState.NotSyncing)) {
                        this.setSyncState(SyncState.NotSyncing)
                        // this.streams.forEach((stream) => {
                        // stream.stop()
                        // })
                        this.streams.clear()
                        this.abortRetry = undefined
                        this.syncId = undefined
                    } else {
                        logger.info(
                            `onStopped: invalid state transition ${this.syncState} -> ${SyncState.NotSyncing}`,
                        )
                    }
                    logger.info(`sync loop stopped ITERATION ${iteration}`)
                }
                return iteration
            })()
        })
    }

    public get syncState(): SyncState {
        return this._syncState
    }

    private setSyncState(newState: SyncState) {
        if (this._syncState === newState) {
            throw new Error('setSyncState called for the existing state')
        }
        if (!stateConstraints[this._syncState].has(newState)) {
            throw this.logInvalidStateAndReturnError(this._syncState, newState)
        }
        logger.info(`syncState ${this._syncState} -> ${newState}`)
        this._syncState = newState
    }

    // The sync loop will keep retrying until it is shutdown, it has no max attempts
    private async attemptRetry(): Promise<void> {
        logger.info(`attemptRetry`, this.syncState)
        this.stopPing()
        if (stateConstraints[this.syncState].has(SyncState.Retrying)) {
            if (this.syncState !== SyncState.Retrying) {
                this.setSyncState(SyncState.Retrying)
                this.syncId = undefined
            }

            // currentRetryCount will increment until MAX_RETRY_COUNT. Then it will stay
            // fixed at this value
            // 6 retries = 2^6 = 64 seconds (~1 min)
            const MAX_RETRY_DELAY_FACTOR = 6
            const nextRetryCount =
                this.currentRetryCount >= MAX_RETRY_DELAY_FACTOR
                    ? MAX_RETRY_DELAY_FACTOR
                    : this.currentRetryCount + 1
            const retryDelay = 2 ** nextRetryCount * 1000 // 2^n seconds
            logger.info(`sync error, retrying in ${retryDelay} ms`, {
                currentRetryCount: this.currentRetryCount,
                nextRetryCount,
                MAX_RETRY_DELAY_FACTOR,
            })
            this.currentRetryCount = nextRetryCount

            await new Promise<void>((resolve) => {
                const timeout = setTimeout(() => {
                    this.abortRetry = undefined
                    resolve()
                }, retryDelay)
                this.abortRetry = () => {
                    clearTimeout(timeout)
                    this.abortRetry = undefined
                    resolve()
                }
            })
        } else {
            logger.error('attemptRetry: invalid state transition', {
                syncState: this.syncState,
            })
            // throw new Error('attemptRetry from invalid state')
        }
    }

    private syncStarted(syncId: string): void {
        if (!this.syncId && stateConstraints[this.syncState].has(SyncState.Syncing)) {
            this.setSyncState(SyncState.Syncing)
            this.syncId = syncId
            // On sucessful sync, reset retryCount
            this.currentRetryCount = 0
            this.sendKeepAlivePings() // ping the server periodically to keep the connection alive
            logger.info(`syncStarted syncId: ${this.syncId}`, {
                syncId: this.syncId,
            })
        } else {
            logger.info(
                `syncStarted: invalid state transition ${this.syncState} -> ${SyncState.Syncing}`,
            )
            //throw new Error('syncStarted: invalid state transition')
        }
    }

    private syncClosed() {
        this.stopPing()
        if (this.syncState === SyncState.Canceling) {
            logger.info(`server acknowledged our close attempt ${this.syncId}`, {
                syncId: this.syncId,
            })
        } else {
            logger.info(
                `server cancelled unepexectedly, go through the retry loop ${this.syncId}`,
                {
                    syncId: this.syncId,
                },
            )
            this.setSyncState(SyncState.Retrying)
        }
    }

    private async onUpdate(res: SyncStreamsResponse): Promise<void> {
        // Until we've completed canceling, accept responses
        if (this.syncState === SyncState.Syncing || this.syncState === SyncState.Canceling) {
            if (this.syncId != res.syncId) {
                throw new Error(
                    `syncId mismatch; has:'${this.syncId}', got:${res.syncId}'. Throw away update.`,
                )
            }
            const syncStream = res.stream
            if (syncStream !== undefined) {
                try {
                    const streamId = syncStream.nextSyncCookie?.streamId
                        ? bin_toHexString(syncStream.nextSyncCookie.streamId)
                        : ''

                    if (syncStream.syncReset) {
                        // const response = await unpackStream(syncStream)
                        // await stream.initializeFromResponse(response)
                    } else {
                        const streamAndCookie = await unpackStreamAndCookie(syncStream)
                        const stream = this.streams.get(streamId)
                        if (stream === undefined) {
                            this.streams.set(streamId, syncStream)
                        }

                        if (streamAndCookie.events.length > 0) {
                            if (isDMChannelStreamId(streamId) || isGDMChannelStreamId(streamId)) {
                                await this.handleDmOrGDMStreamUpdate(streamAndCookie, streamId)
                            } else if (isChannelStreamId(streamId)) {
                                await this.handleChannelStreamUpdate(streamAndCookie, streamId)
                            }
                        }

                        await database.syncedStream.update({
                            where: {
                                StreamId: streamId,
                            },
                            data: {
                                SyncCookie: streamAndCookie.nextSyncCookie.toJsonString(),
                            },
                        })
                    }
                } catch (error) {
                    logger.error('onUpdate error:', { error })
                }
            } else {
                logger.info('sync RESULTS no stream', { syncStream })
            }
        } else {
            logger.info(
                `onUpdate: invalid state ${this.syncState}, should have been ${SyncState.Syncing}`,
            )
        }
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

        const usersToNotify: NotifyUsers = {}
        const dbStreamUsers = syncedStream.UserIds
        if (!dbStreamUsers.includes(creatorUserId)) {
            logger.error(`creatorUserId not in stream: ${creatorUserId}`, {
                dbStreamUsers,
            })
            return
        }

        dbStreamUsers.forEach((user) => {
            if (user !== creatorUserId) {
                usersToNotify[user] = {
                    userId: user,
                    kind: NotificationKind.DirectMessage,
                }
            }
        })
        logger.info(`usersToNotify`, { usersToNotify })

        const userIds = Object.keys(usersToNotify)

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

        await this.dispatchNotification(notificationData, Object.values(usersToNotify))
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
            logger.info(`stream ${streamId} membership update SO_JOIN for user ${userAddress}`, {
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
        }
    }

    private async dispatchNotification(
        notificationData: NotifyUsersSchema,
        usersToNotify: NotifyUser[],
    ) {
        const pushNotificationRequests = await notificationService.createNotificationAsyncRequests(
            notificationData,
            usersToNotify,
        )

        const notificationsSentCount = await notificationService.dispatchAllPushNotification(
            pushNotificationRequests,
        )

        logger.info(`notificationsSentCount ${notificationsSentCount}`)
    }

    private sendKeepAlivePings() {
        // periodically ping the server to keep the connection alive
        this.pingInfo.pingInterval = setTimeout(() => {
            const ping = async () => {
                if (this.syncState === SyncState.Syncing && this.syncId) {
                    const n = nanoid()
                    this.pingInfo.nonces[n] = {
                        sequence: this.pingInfo.currentSequence++,
                        nonce: n,
                        pingAt: performance.now(),
                    }
                    await this.rpcClient.pingSync({
                        syncId: this.syncId,
                        nonce: n,
                    })
                }
                if (this.syncState === SyncState.Syncing) {
                    // schedule the next ping
                    this.sendKeepAlivePings()
                }
            }
            ping().catch((err) => {
                this.interruptSync?.(err)
            })
        }, 5 * 1000 * 60) // every 5 minutes
    }

    private stopPing() {
        clearTimeout(this.pingInfo.pingInterval)
        this.pingInfo.pingInterval = undefined
        // print out the nonce stats
        this.printNonces()
        // reset the nonce stats
        this.pingInfo.nonces = {}
        this.pingInfo.currentSequence = 0
    }

    private printNonces() {
        const sortedNonces = Object.values(this.pingInfo.nonces).sort(
            (a, b) => a.sequence - b.sequence,
        )
        for (const n of sortedNonces) {
            logger.info(
                `sequence=${n.sequence}, nonce=${n.nonce}, pingAt=${n.pingAt}, receivedAt=${
                    n.receivedAt ?? 'none'
                }, duration=${n.duration ?? 'none'}`,
            )
        }
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
