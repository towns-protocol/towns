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
import { NotifyUsersSchema } from '../../schema/notificationSchema'
import { notificationService } from '../notificationService'
import { isChannelStreamId, isDMChannelStreamId, isGDMChannelStreamId } from './id'
import { StreamKind, SyncedStream } from '@prisma/client'

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
        console.log('[SyncedStreams] stream set', streamId)
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
        return await this.createSyncLoop()
    }

    public checkStartTicking() {
        console.log('[SyncedStreams] checkStartTicking', this.responsesQueue.length)
        if (this.inProgressTick) {
            console.log('[SyncedStreams] inProgressTick', this.inProgressTick)
            return
        }

        if (this.responsesQueue.length === 0) {
            return
        }

        const tick = this.tick()
        this.inProgressTick = tick
        queueMicrotask(() => {
            tick.catch((e) => console.error('[SyncedStreams] ProcessTick Error', e)).finally(() => {
                this.inProgressTick = undefined
                this.checkStartTicking()
            })
        })
    }

    private async tick() {
        console.log('[SyncedStreams] tick', this.responsesQueue.length)
        const item = this.responsesQueue.shift()
        if (!item || item.syncId !== this.syncId) {
            return
        }
        await this.onUpdate(item)
    }

    public async stopSync() {
        console.log('[SyncedStreams] sync STOP CALLED')
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
                          console.log('[SyncedStreams] calling forceStopSyncStreams', syncId)
                          this.forceStopSyncStreams?.()
                      }, 5000)
                    : undefined

                console.log('[SyncedStreams] stopSync syncState', syncState)
                console.log('[SyncedStreams] stopSync syncLoop', syncLoop)
                console.log('[SyncedStreams] stopSync syncId', syncId)
                const result = await Promise.allSettled([
                    syncId ? await this.rpcClient.cancelSync({ syncId }) : undefined,
                    syncLoop,
                ])
                console.log('[SyncedStreams] syncLoop awaited', syncId, result)
                clearTimeout(breakTimeout)
            } catch (e) {
                console.log('[SyncedStreams] sync STOP ERROR', e)
            }
            console.log('[SyncedStreams] sync STOP DONE', syncId)
        } else {
            console.log(`WARN: stopSync called from invalid state ${this.syncState}`)
        }
    }

    // adds stream to the sync subscription
    public async addStreamToSync(syncCookie: SyncCookie): Promise<void> {
        /*
        const stream = this.streams.has(syncCookie.streamId)

        if (stream) {
            console.log('[SyncedStreams] addStreamToSync streamId already syncing', syncCookie)
            return
        }
        */
        if (this.syncState === SyncState.Syncing) {
            try {
                await this.rpcClient.addStreamToSync({
                    syncId: this.syncId,
                    syncPos: syncCookie,
                })
                console.log('[SyncedStreams] addedStreamToSync', syncCookie)
            } catch (err) {
                // Trigger restart of sync loop
                console.log(`addedStreamToSync error`, err)
                if (errorContains(err, Err.BAD_SYNC_COOKIE)) {
                    console.log('[SyncedStreams] addStreamToSync BAD_SYNC_COOKIE', syncCookie)
                    throw err
                }
            }
        } else {
            console.log(
                '[SyncedStream] addStreamToSync: not in "syncing" state; let main sync loop handle this with its streams map',
                syncCookie.streamId,
            )
        }
    }

    // remove stream from the sync subsbscription
    public async removeStreamFromSync(streamId: string): Promise<void> {
        const stream = this.streams.get(streamId)
        if (!stream) {
            console.log('[SyncedStreams] removeStreamFromSync streamId not found', streamId)
            // no such stream
            return
        }
        if (this.syncState === SyncState.Syncing) {
            try {
                await this.rpcClient.removeStreamFromSync({
                    syncId: this.syncId,
                    streamId: streamIdToBytes(streamId),
                })
            } catch (err) {
                // Trigger restart of sync loop
                console.log('[SyncedStreams] removeStreamFromSync err', err)
            }
            // stream.stop()
            this.streams.delete(streamId)
            console.log('[SyncedStreams] removed stream from sync', streamId)
        } else {
            console.log(
                '[SyncedStream] removeStreamFromSync: not in "syncing" state; let main sync loop handle this with its streams map',
                streamId,
            )
        }
    }

    private async createSyncLoop() {
        return new Promise<void>((resolve, reject) => {
            if (stateConstraints[this.syncState].has(SyncState.Starting)) {
                this.setSyncState(SyncState.Starting)
                console.log('[SyncedStreams] starting sync loop')
            } else {
                console.log(
                    '[SyncedStream] runSyncLoop: invalid state transition',
                    this.syncState,
                    '->',
                    SyncState.Starting,
                )
                reject(new Error('invalid state transition'))
            }

            if (this.syncLoop) {
                reject(new Error('createSyncLoop called while a loop exists'))
            }

            this.syncLoop = (async (): Promise<number> => {
                let iteration = 0

                console.log('[SyncedStreams] sync loop created')
                resolve()

                try {
                    while (
                        this.syncState === SyncState.Starting ||
                        this.syncState === SyncState.Syncing ||
                        this.syncState === SyncState.Retrying
                    ) {
                        console.log(
                            '[SyncedStreams] sync ITERATION start',
                            ++iteration,
                            this.syncState,
                        )
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
                                console.log(
                                    '[SyncedStreams] dbStream.syncCookie',
                                    dbStream.syncCookie,
                                )
                                syncCookies.push(SyncCookie.fromJsonString(dbStream.syncCookie))
                            }

                            if (syncCookies.length === 0) {
                                console.log('no syncCookies found')
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
                                            console.log(
                                                '[SyncedStreams] forceStopSyncStreams called',
                                            )
                                            resolve()
                                        }
                                        this.interruptSync = (e: unknown) => {
                                            console.log('[SyncedStreams] sync interrupted', e)
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
                                    console.log('[SyncedStreams] exiting syncStreams', done, value)
                                    // exit the syncLoop, it's done
                                    this.forceStopSyncStreams = undefined
                                    this.interruptSync = undefined
                                    return iteration
                                }

                                console.log(
                                    '[SyncedStream] got syncStreams response',
                                    'syncOp',
                                    value.syncOp,
                                    'syncId',
                                    value.syncId,
                                )

                                if (!value.syncId || !value.syncOp) {
                                    console.log('[SyncedStreams] missing syncId or syncOp', value)
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
                                        console.log('[SyncedStreams] SYNC_UPDATE', value)
                                        this.responsesQueue.push(value)
                                        this.checkStartTicking()
                                        break
                                    case SyncOp.SYNC_PONG:
                                        console.log('[SyncedStreams] SYNC_PONG', value)
                                        pingStats = this.pingInfo.nonces[value.pongNonce]
                                        if (pingStats) {
                                            pingStats.receivedAt = performance.now()
                                            pingStats.duration =
                                                pingStats.receivedAt - pingStats.pingAt
                                        } else {
                                            console.error(
                                                '[SyncedStreams] pong nonce not found',
                                                value.pongNonce,
                                            )
                                            this.printNonces()
                                        }
                                        break
                                    default:
                                        console.log(
                                            `[SyncedStream] unknown syncOp { syncId: ${this.syncId}, syncOp: ${value.syncOp} }`,
                                        )
                                        break
                                }
                            }
                        } catch (err) {
                            console.error('[SyncedStreams] syncLoop error', err)
                            await this.attemptRetry()
                        }
                    }
                } finally {
                    console.log('[SyncedStreams] sync loop stopping ITERATION', iteration)
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
                        console.log(
                            '[SyncedStream] onStopped: invalid state transition',
                            this.syncState,
                            '->',
                            SyncState.NotSyncing,
                        )
                    }
                    console.log('[SyncedStreams] sync loop stopped ITERATION', iteration)
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
        console.log('[SyncedStreams] syncState', this._syncState, '->', newState)
        this._syncState = newState
    }

    // The sync loop will keep retrying until it is shutdown, it has no max attempts
    private async attemptRetry(): Promise<void> {
        console.log(`attemptRetry`, this.syncState)
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
            console.log(
                '[SyncedStream] sync error, retrying in',
                retryDelay,
                'ms',
                ', { currentRetryCount:',
                this.currentRetryCount,
                ', nextRetryCount:',
                nextRetryCount,
                ', MAX_RETRY_COUNT:',
                MAX_RETRY_DELAY_FACTOR,
                '}',
            )
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
            console.error('[SyncedStreams] attemptRetry: invalid state transition', this.syncState)
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
            console.log('[SyncedStreams] syncStarted', 'syncId', this.syncId)
            console.log('[SyncedStreams] emitted streamSyncActive', true)
        } else {
            console.log(
                '[SyncedStream] syncStarted: invalid state transition',
                this.syncState,
                '->',
                SyncState.Syncing,
            )
            //throw new Error('syncStarted: invalid state transition')
        }
    }

    private syncClosed() {
        this.stopPing()
        if (this.syncState === SyncState.Canceling) {
            console.log('[SyncedStreams] server acknowledged our close atttempt', this.syncId)
        } else {
            console.log(
                '[SyncedStreams] server cancelled unepexectedly, go through the retry loop',
                this.syncId,
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
                    /*
                    console.log(
                        'sync RESULTS for stream',
                        streamId,
                        'events=',
                        streamAndCookie.events.length,
                        'nextSyncCookie=',
                        streamAndCookie.nextSyncCookie,
                        'startSyncCookie=',
                        streamAndCookie.startSyncCookie,
                    )
                    */
                    const streamId = syncStream.nextSyncCookie?.streamId
                        ? bin_toHexString(syncStream.nextSyncCookie.streamId)
                        : ''

                    // console.log('[SyncedStreams] sync got stream', streamId, 'NOT FOUND')
                    // } else if (syncStream.syncReset) {
                    if (syncStream.syncReset) {
                        // const response = await unpackStream(syncStream)
                        // await stream.initializeFromResponse(response)
                    } else {
                        const streamAndCookie = await unpackStreamAndCookie(syncStream)
                        const stream = this.streams.get(streamId)
                        if (stream === undefined) {
                            this.streams.set(streamId, syncStream)
                        }
                        console.log('[SyncedStreams] streamAndCookie', streamAndCookie)

                        if (streamAndCookie.events.length > 0) {
                            if (isDMChannelStreamId(streamId) || isGDMChannelStreamId(streamId)) {
                                await this.handleDmOrGDMStreamUpdate(streamAndCookie, streamId)
                            } else if (isChannelStreamId(streamId)) {
                                console.log('[SyncedStreams] ChannelStreamId', streamId)
                            }
                        }

                        await database.syncedStream.update({
                            where: {
                                streamId,
                            },
                            data: {
                                syncCookie: streamAndCookie.nextSyncCookie.toJsonString(),
                            },
                        })
                    }
                } catch (err) {
                    console.error('[SyncedStreams] onUpdate error:', err)
                }
            } else {
                console.log('[SyncedStreams] sync RESULTS no stream', syncStream)
            }
        } else {
            console.log(
                '[SyncedStream] onUpdate: invalid state',
                this.syncState,
                'should have been',
                SyncState.Syncing,
            )
        }
    }
    private async handleDmOrGDMStreamUpdate(
        streamAndCookie: ParsedStreamAndCookie,
        streamId: string,
    ) {
        const syncedStream = await database.syncedStream.findUnique({
            where: { streamId },
        })

        if (!syncedStream) {
            console.log('[SyncedStreams] syncedStream not found')
            return
        }

        const streamKind = syncedStream.kind
        let payloadCase = ''
        if (streamKind === StreamKind.DM) {
            payloadCase = 'dmChannelPayload'
        } else if (streamKind === StreamKind.GDM) {
            payloadCase = 'gdmChannelPayload'
        }

        console.log('[SyncedStreams] handleDmOrGDMStreamUpdate for', streamKind)

        for (const { event, creatorUserId } of streamAndCookie.events) {
            const isMessage =
                event.payload.case === payloadCase && event.payload.value.content.case === 'message'
            const isMembershipUpdate =
                event.payload.case === 'memberPayload' &&
                event.payload.value.content.case === 'membership'

            if (isMessage) {
                await this.handleMessageStreamUpdate(syncedStream, streamId, event, creatorUserId)
            } else if (isMembershipUpdate) {
                await this.handleMembershipUpdate(syncedStream, streamId, event)
            }
        }
    }

    private async handleMessageStreamUpdate(
        syncedStream: SyncedStream,
        streamId: string,
        event: StreamEvent,
        creatorUserId: string,
    ) {
        console.log('[SyncedStreams] handleMessageStreamUpdate', streamId)

        const usersToNotify: Set<string> = new Set()
        const dbStreamUsers = syncedStream.userIds
        if (!dbStreamUsers.includes(creatorUserId)) {
            console.error(
                '[SyncedStreams] creatorUserId not in stream',
                creatorUserId,
                dbStreamUsers,
            )
            return
        }

        dbStreamUsers.forEach((user) => {
            if (user !== creatorUserId) {
                usersToNotify.add(user)
            }
        })
        console.log('[SyncedStreams] usersToNotify', usersToNotify)

        const usersToNotifyArray = Array.from(usersToNotify)

        const notificationData: NotifyUsersSchema = {
            sender: creatorUserId,
            users: usersToNotifyArray,
            payload: {
                content: {
                    kind: 'direct_message',
                    channelId: streamId,
                    senderId: creatorUserId,
                    recipients: usersToNotifyArray,
                    event: event.toJson(),
                },
            },
            forceNotify: false,
        }

        await this.dispatchNotification(notificationData, usersToNotify)
    }

    private async handleMembershipUpdate(
        syncedStream: SyncedStream,
        streamId: string,
        event: StreamEvent,
    ) {
        console.log('[SyncedStreams] handleMembershipUpdate', streamId)

        const value = event.payload.value?.content.value as MemberPayload_Membership
        const { op } = value
        if (op === MembershipOp.SO_JOIN) {
            console.log('[SyncedStreams] membership update SO_JOIN')
            const userAddress = userIdFromAddress(value.userAddress)
            if (!syncedStream?.userIds.includes(userAddress)) {
                console.log('[SyncedStreams] adding user to stream', userAddress)
                await database.syncedStream.update({
                    where: { streamId },
                    data: {
                        userIds: {
                            push: userAddress,
                        },
                    },
                })
            }
        }
        if (op === MembershipOp.SO_LEAVE) {
            console.log('[SyncedStreams] membership update SO_LEAVE')
            const userAddress = userIdFromAddress(value.userAddress)
            if (syncedStream?.userIds.includes(userAddress)) {
                console.log('[SyncedStreams] removing user from stream', userAddress)
                await database.syncedStream.update({
                    where: { streamId },
                    data: {
                        userIds: {
                            set: syncedStream.userIds.filter((u) => u !== userAddress),
                        },
                    },
                })
            }
        }
    }

    private async dispatchNotification(
        notificationData: NotifyUsersSchema,
        usersToNotify: Set<string>,
    ) {
        const pushNotificationRequests = await notificationService.createNotificationAsyncRequests(
            notificationData,
            usersToNotify,
        )

        const notificationsSentCount = await notificationService.dispatchAllPushNotification(
            pushNotificationRequests,
        )

        console.log('[SyncedStreams] notificationsSentCount', notificationsSentCount)
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
            console.log(
                `[SyncedStream] sequence=${n.sequence}, nonce=${n.nonce}, pingAt=${
                    n.pingAt
                }, receivedAt=${n.receivedAt ?? 'none'}, duration=${n.duration ?? 'none'}`,
            )
        }
    }

    private logInvalidStateAndReturnError(currentState: SyncState, newState: SyncState): Error {
        console.log(`invalid state transition ${currentState} -> ${newState}`)
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
