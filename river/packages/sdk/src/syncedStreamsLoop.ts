import { SyncCookie, SyncOp, SyncStreamsResponse } from '@river-build/proto'
import { DLogger, dlog, dlogError } from '@river-build/dlog'
import { StreamRpcClient } from './makeStreamRpcClient'
import { UnpackEnvelopeOpts, unpackStream, unpackStreamAndCookie } from './sign'
import { SyncedStreamEvents } from './streamEvents'
import TypedEmitter from 'typed-emitter'
import { nanoid } from 'nanoid'
import { isMobileSafari } from './utils'
import {
    spaceIdFromChannelId,
    isDMChannelStreamId,
    isGDMChannelStreamId,
    isSpaceStreamId,
    isUserDeviceStreamId,
    isUserInboxStreamId,
    isUserSettingsStreamId,
    isUserStreamId,
    streamIdAsBytes,
    streamIdAsString,
    isChannelStreamId,
} from './id'
import { ParsedEvent, ParsedStreamResponse } from './types'
import { isDefined, logNever } from './check'

export enum SyncState {
    Canceling = 'Canceling', // syncLoop, maybe syncId if was syncing, not is was starting or retrying
    NotSyncing = 'NotSyncing', // no syncLoop
    Retrying = 'Retrying', // syncLoop set, no syncId
    Starting = 'Starting', // syncLoop set, no syncId
    Syncing = 'Syncing', // syncLoop and syncId
}

/**
 * Valid state transitions:
 * - [*] -\> NotSyncing
 * - NotSyncing -\> Starting
 * - Starting -\> Syncing
 * - Starting -\> Canceling: failed / stop sync
 * - Starting -\> Retrying: connection error
 * - Syncing -\> Canceling: connection aborted / stop sync
 * - Syncing -\> Retrying: connection error
 * - Syncing -\> Syncing: resync
 * - Retrying -\> Canceling: stop sync
 * - Retrying -\> Syncing: resume
 * - Retrying -\> Retrying: still retrying
 * - Canceling -\> NotSyncing
 * @see https://www.notion.so/herenottherelabs/RFC-Sync-hardening-e0552a4ed68a4d07b42ae34c69ee1bec?pvs=4#861081756f86423ea668c62b9eb76f4b
 */
export const stateConstraints: Record<SyncState, Set<SyncState>> = {
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

export interface ISyncedStream {
    syncCookie?: SyncCookie
    stop(): void
    initializeFromResponse(response: ParsedStreamResponse): Promise<void>
    appendEvents(
        events: ParsedEvent[],
        nextSyncCookie: SyncCookie,
        cleartexts: Record<string, Uint8Array | string> | undefined,
    ): Promise<void>
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

export interface PingInfo {
    nonces: Nonces // the nonce that the server should echo back
    currentSequence: number // the current sequence number
    pingTimeout?: NodeJS.Timeout // for cancelling the next ping
}
export class SyncedStreamsLoop {
    // mapping of stream id to stream
    private readonly streams: Map<string, { syncCookie: SyncCookie; stream: ISyncedStream }>
    // loggers
    private readonly logSync: DLogger
    private readonly logDebug: DLogger
    private readonly logError: DLogger
    // clientEmitter is used to proxy the events from the streams to the client
    private readonly clientEmitter: TypedEmitter<SyncedStreamEvents>

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
    releaseRetryWait: (() => void) | undefined
    private currentRetryCount: number = 0
    private forceStopSyncStreams: (() => void) | undefined
    private interruptSync: ((err: unknown) => void) | undefined
    private isMobileSafariBackgrounded = false

    // Only responses related to the current syncId are processed.
    // Responses are queued and processed in order
    // and are cleared when sync stops
    private responsesQueue: SyncStreamsResponse[] = []
    private inProgressTick?: Promise<void>
    private pendingSyncCookies: string[] = []
    private inFlightSyncCookies = new Set<string>()
    private readonly MAX_IN_FLIGHT_COOKIES = 40
    private readonly MIN_IN_FLIGHT_COOKIES = 10

    public pingInfo: PingInfo = {
        currentSequence: 0,
        nonces: {},
    }

    constructor(
        clientEmitter: TypedEmitter<SyncedStreamEvents>,
        rpcClient: StreamRpcClient,
        streams: { syncCookie: SyncCookie; stream: ISyncedStream }[],
        logNamespace: string,
        readonly unpackEnvelopeOpts: UnpackEnvelopeOpts | undefined,
        private highPriorityIds: Set<string>,
    ) {
        this.rpcClient = rpcClient
        this.clientEmitter = clientEmitter
        this.streams = new Map(
            streams.map(({ syncCookie, stream }) => [
                streamIdAsString(syncCookie.streamId),
                { syncCookie, stream },
            ]),
        )
        this.logDebug = dlog('csb:cl:sync:debug').extend(logNamespace)
        this.logSync = dlog('csb:cl:sync', { defaultEnabled: true }).extend(logNamespace)
        this.logError = dlogError('csb:cl:sync:stream').extend(logNamespace)
    }

    public get syncState(): SyncState {
        return this._syncState
    }

    public stats() {
        return {
            syncState: this.syncState,
            streams: this.streams.size,
            syncId: this.syncId,
            queuedResponses: this.responsesQueue.length,
        }
    }

    public getSyncId(): string | undefined {
        return this.syncId
    }

    public start() {
        if (isMobileSafari()) {
            document.addEventListener('visibilitychange', this.onMobileSafariBackgrounded)
        }

        this.createSyncLoop()
    }

    public async stop() {
        this.log('sync STOP CALLED')
        this.responsesQueue = []
        if (stateConstraints[this.syncState].has(SyncState.Canceling)) {
            const syncId = this.syncId
            const syncLoop = this.syncLoop
            const syncState = this.syncState
            this.setSyncState(SyncState.Canceling)
            this.stopPing()
            try {
                this.releaseRetryWait?.()
                // Give the server 5 seconds to respond to the cancelSync RPC before forceStopSyncStreams
                const breakTimeout = syncId
                    ? setTimeout(() => {
                          this.log('calling forceStopSyncStreams', syncId)
                          this.forceStopSyncStreams?.()
                      }, 5000)
                    : undefined

                this.log('stopSync syncState', syncState)
                this.log('stopSync syncLoop', syncLoop)
                this.log('stopSync syncId', syncId)
                const result = await Promise.allSettled([
                    syncId ? await this.rpcClient.cancelSync({ syncId }) : undefined,
                    syncLoop,
                ])
                this.log('syncLoop awaited', syncId, result)
                clearTimeout(breakTimeout)
            } catch (e) {
                this.log('sync STOP ERROR', e)
            }
            this.log('sync STOP DONE', syncId)
        } else {
            this.log(`WARN: stopSync called from invalid state ${this.syncState}`)
        }
        if (isMobileSafari()) {
            document.removeEventListener('visibilitychange', this.onMobileSafariBackgrounded)
        }
    }

    // adds stream to the sync subscription
    public addStreamToSync(streamId: string, syncCookie: SyncCookie, stream: ISyncedStream) {
        this.logDebug('addStreamToSync', streamId)
        if (this.streams.has(streamId)) {
            this.log('stream already in sync', streamId)
            return
        }
        this.streams.set(streamId, { syncCookie, stream })
        this.pendingSyncCookies.push(streamId)
        this.checkStartTicking()
    }

    // remove stream from the sync subsbscription
    public async removeStreamFromSync(inStreamId: string | Uint8Array): Promise<void> {
        const streamId = streamIdAsString(inStreamId)
        const streamRecord = this.streams.get(streamId)
        if (!streamRecord) {
            this.log('removeStreamFromSync streamId not found', streamId)
            // no such stream
            return
        }
        const pendingIndex = this.pendingSyncCookies.indexOf(streamId)
        if (pendingIndex !== -1) {
            this.pendingSyncCookies.splice(pendingIndex, 1)
            this.inFlightSyncCookies.delete(streamId)
            streamRecord.stream.stop()
            this.streams.delete(streamId)
            this.log('removed stream from pending sync', streamId)
            return
        }
        if (this.syncState === SyncState.Starting || this.syncState === SyncState.Retrying) {
            await this.waitForSyncingState()
        }
        if (this.syncState === SyncState.Syncing) {
            try {
                await this.rpcClient.removeStreamFromSync({
                    syncId: this.syncId,
                    streamId: streamIdAsBytes(streamId),
                })
            } catch (err) {
                // Trigger restart of sync loop
                this.log('removeStreamFromSync err', err)
            }
            streamRecord.stream.stop()
            this.streams.delete(streamId)
            this.log('removed stream from sync', streamId)
            this.clientEmitter.emit('streamRemovedFromSync', streamIdAsString(inStreamId))
        } else {
            this.log(
                'removeStreamFromSync: not in "syncing" state; let main sync loop handle this with its streams map',
                { streamId, syncState: this.syncState },
            )
        }
    }

    public setHighPriorityStreams(streamIds: string[]) {
        this.highPriorityIds = new Set(streamIds)
    }

    private createSyncLoop() {
        if (stateConstraints[this.syncState].has(SyncState.Starting)) {
            this.setSyncState(SyncState.Starting)
            this.log('starting sync loop')
        } else {
            this.log(
                'runSyncLoop: invalid state transition',
                this.syncState,
                '->',
                SyncState.Starting,
            )
            throw new Error('invalid state transition')
        }

        if (this.syncLoop) {
            throw new Error('createSyncLoop called while a loop exists')
        }

        this.syncLoop = (async (): Promise<number> => {
            let iteration = 0

            this.log('sync loop created')

            try {
                while (
                    this.syncState === SyncState.Starting ||
                    this.syncState === SyncState.Syncing ||
                    this.syncState === SyncState.Retrying
                ) {
                    // get cookies from all the known streams to sync
                    this.inFlightSyncCookies.clear()
                    this.pendingSyncCookies = Array.from(this.streams.keys())

                    this.log(
                        'sync ITERATION start',
                        ++iteration,
                        this.syncState,
                        `pending: ${this.pendingSyncCookies.length}`,
                    )
                    if (this.syncState === SyncState.Retrying) {
                        this.setSyncState(SyncState.Starting)
                    }

                    try {
                        // syncId needs to be reset before starting a new syncStreams
                        // syncStreams() should return a new syncId
                        this.syncId = undefined
                        const streams = this.rpcClient.syncStreams(
                            {
                                syncPos: [],
                            },
                            { timeoutMs: -1 },
                        )

                        const iterator = streams[Symbol.asyncIterator]()

                        while (
                            this.syncState === SyncState.Syncing ||
                            this.syncState === SyncState.Starting
                        ) {
                            const interruptSyncPromise = new Promise<void>((resolve, reject) => {
                                this.forceStopSyncStreams = () => {
                                    this.log('forceStopSyncStreams called')
                                    resolve()
                                }
                                this.interruptSync = (e: unknown) => {
                                    this.logError('sync interrupted', e)
                                    reject(e)
                                }
                            })
                            const { value, done } = await Promise.race([
                                iterator.next(),
                                interruptSyncPromise.then(() => ({
                                    value: undefined,
                                    done: true,
                                })),
                            ])
                            if (done || value === undefined) {
                                this.log('exiting syncStreams', done, value)
                                // exit the syncLoop, it's done
                                this.forceStopSyncStreams = undefined
                                this.interruptSync = undefined
                                return iteration
                            }

                            this.logDebug(
                                'got syncStreams response',
                                'syncOp',
                                value.syncOp,
                                'syncId',
                                value.syncId,
                            )

                            if (!value.syncId || !value.syncOp) {
                                this.log('missing syncId or syncOp', value)
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
                                    this.responsesQueue.push(value)
                                    this.checkStartTicking()
                                    break
                                case SyncOp.SYNC_PONG:
                                    pingStats = this.pingInfo.nonces[value.pongNonce]
                                    if (pingStats) {
                                        pingStats.receivedAt = performance.now()
                                        pingStats.duration = pingStats.receivedAt - pingStats.pingAt
                                    } else {
                                        this.logError('pong nonce not found', value.pongNonce)
                                        this.printNonces()
                                    }
                                    break
                                case SyncOp.SYNC_DOWN:
                                    this.syncDown(value.streamId)
                                    break
                                default:
                                    logNever(
                                        value.syncOp,
                                        `unknown syncOp { syncId: ${this.syncId}, syncOp: ${value.syncOp} }`,
                                    )
                                    break
                            }
                        }
                    } catch (err) {
                        this.logError('syncLoop error', err)
                        await this.attemptRetry()
                    }
                }
            } finally {
                this.log('sync loop stopping ITERATION', {
                    iteration,
                    syncState: this.syncState,
                })
                this.stopPing()
                if (stateConstraints[this.syncState].has(SyncState.NotSyncing)) {
                    this.setSyncState(SyncState.NotSyncing)
                    this.streams.forEach((streamRecord) => {
                        streamRecord.stream.stop()
                    })
                    this.streams.clear()
                    this.releaseRetryWait = undefined
                    this.syncId = undefined
                    this.clientEmitter.emit('streamSyncActive', false)
                } else {
                    this.log(
                        'onStopped: invalid state transition',
                        this.syncState,
                        '->',
                        SyncState.NotSyncing,
                    )
                }
                this.log('sync loop stopped ITERATION', iteration)
            }
            return iteration
        })()
    }

    private onMobileSafariBackgrounded = () => {
        this.isMobileSafariBackgrounded = document.visibilityState === 'hidden'
        this.log('onMobileSafariBackgrounded', this.isMobileSafariBackgrounded)
        if (!this.isMobileSafariBackgrounded) {
            // if foregrounded, attempt to retry
            this.log('foregrounded, release retry wait', { syncState: this.syncState })
            this.releaseRetryWait?.()
            this.checkStartTicking()
        }
    }

    private checkStartTicking() {
        if (this.inProgressTick) {
            return
        }

        if (this.responsesQueue.length === 0 && this.pendingSyncCookies.length === 0) {
            return
        }

        if (this.isMobileSafariBackgrounded) {
            return
        }

        const tick = this.tick()
        this.inProgressTick = tick
        queueMicrotask(() => {
            tick.catch((e) => this.logError('ProcessTick Error', e)).finally(() => {
                this.inProgressTick = undefined
                setTimeout(() => this.checkStartTicking())
            })
        })
    }

    private async tick() {
        if (this.syncState === SyncState.Syncing) {
            if (
                this.inFlightSyncCookies.size <= this.MIN_IN_FLIGHT_COOKIES &&
                this.pendingSyncCookies.length > 0
            ) {
                this.pendingSyncCookies.sort((a, b) => {
                    const aPriority = priorityFromStreamId(a, this.highPriorityIds)
                    const bPriority = priorityFromStreamId(b, this.highPriorityIds)
                    return aPriority - bPriority
                })
                const streamsToAdd = this.pendingSyncCookies.splice(0, this.MAX_IN_FLIGHT_COOKIES)
                this.logSync('tick: modifySync', {
                    syncId: this.syncId,
                    addStreams: streamsToAdd,
                    inFlight: this.inFlightSyncCookies.size,
                })
                streamsToAdd.forEach((x) => this.inFlightSyncCookies.add(x))
                const syncPos = streamsToAdd.map((x) => this.streams.get(x)?.syncCookie)
                try {
                    await this.rpcClient.modifySync({
                        syncId: this.syncId,
                        addStreams: syncPos.filter(isDefined),
                    })
                } catch (err) {
                    this.logError('modifySync error', err)
                }
            }
        }
        const item = this.responsesQueue.shift()
        if (!item || item.syncId !== this.syncId) {
            return
        }
        await this.onUpdate(item)
    }

    private async waitForSyncingState() {
        // if we can transition to syncing, wait for it
        if (stateConstraints[this.syncState].has(SyncState.Syncing)) {
            this.log('waitForSyncing', this.syncState)
            // listen for streamSyncStateChange event from client emitter
            return new Promise<void>((resolve) => {
                const onStreamSyncStateChange = (syncState: SyncState) => {
                    if (!stateConstraints[this.syncState].has(SyncState.Syncing)) {
                        this.log('waitForSyncing complete', syncState)
                        this.clientEmitter.off('streamSyncStateChange', onStreamSyncStateChange)
                        resolve()
                    } else {
                        this.log('waitForSyncing continues', syncState)
                    }
                }
                this.clientEmitter.on('streamSyncStateChange', onStreamSyncStateChange)
            })
        }
    }

    private setSyncState(newState: SyncState) {
        if (this._syncState === newState) {
            throw new Error('setSyncState called for the existing state')
        }
        if (!stateConstraints[this._syncState].has(newState)) {
            throw this.logInvalidStateAndReturnError(this._syncState, newState)
        }
        this.log('syncState', this._syncState, '->', newState)
        this._syncState = newState
        this.clientEmitter.emit('streamSyncStateChange', newState)
    }

    // The sync loop will keep retrying until it is shutdown, it has no max attempts
    private async attemptRetry(): Promise<void> {
        this.log(`attemptRetry`, this.syncState)
        this.stopPing()
        if (stateConstraints[this.syncState].has(SyncState.Retrying)) {
            if (this.syncState !== SyncState.Retrying) {
                this.setSyncState(SyncState.Retrying)
                this.syncId = undefined
                this.clientEmitter.emit('streamSyncActive', false)
            }

            // currentRetryCount will increment until MAX_RETRY_COUNT. Then it will stay
            // fixed at this value
            // 7 retries = 2^7 = 128 seconds (~2 mins)
            const MAX_RETRY_DELAY_FACTOR = 7
            const nextRetryCount =
                this.currentRetryCount >= MAX_RETRY_DELAY_FACTOR
                    ? MAX_RETRY_DELAY_FACTOR
                    : this.currentRetryCount + 1
            const retryDelay = 2 ** nextRetryCount * 1000 // 2^n seconds
            this.log(
                'sync error, retrying in',
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
                    this.releaseRetryWait = undefined
                    resolve()
                }, retryDelay)
                this.releaseRetryWait = () => {
                    clearTimeout(timeout)
                    this.releaseRetryWait = undefined
                    resolve()
                    this.log('retry released')
                }
            })
        } else {
            this.logError('attemptRetry: invalid state transition', this.syncState)
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
            this.log('syncStarted', 'syncId', this.syncId)
            this.clientEmitter.emit('streamSyncActive', true)
            this.log('emitted streamSyncActive', true)
            this.checkStartTicking()
        } else {
            this.log(
                'syncStarted: invalid state transition',
                this.syncState,
                '->',
                SyncState.Syncing,
            )
            //throw new Error('syncStarted: invalid state transition')
        }
    }

    private syncDown(
        streamId: Uint8Array,
        retryParams?: { syncId: string; retryCount: number },
    ): void {
        if (this.syncId === undefined) {
            return
        }
        if (retryParams !== undefined && retryParams.syncId !== this.syncId) {
            return
        }
        if (streamId === undefined || streamId.length === 0) {
            this.logError('syncDown: streamId is empty')
            return
        }
        if (this.syncState !== SyncState.Syncing) {
            this.logError('syncDown: invalid state transition', this.syncState)
            return
        }
        const stream = this.streams.get(streamIdAsString(streamId))
        if (!stream) {
            this.log('syncDown: stream not found', streamIdAsString(streamId))
            return
        }
        const cookie = stream.syncCookie
        if (!cookie) {
            this.logError('syncDown: syncCookie not found', streamIdAsString(streamId))
            return
        }
        const syncId = this.syncId
        const retryCount = retryParams?.retryCount ?? 0
        this.rpcClient
            .addStreamToSync({
                syncId: this.syncId,
                syncPos: cookie,
            })
            .catch((err) => {
                const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 60000)
                this.logError(
                    'syncDown: addStreamToSync error',
                    err,
                    'retryParams',
                    retryParams,
                    'retryDelay',
                    retryDelay,
                )
                setTimeout(() => {
                    this.syncDown(streamId, {
                        syncId,
                        retryCount: retryCount + 1,
                    })
                }, retryDelay)
            })
    }

    private syncClosed() {
        this.stopPing()
        if (this.syncState === SyncState.Canceling) {
            this.log('server acknowledged our close atttempt', this.syncId)
        } else {
            this.log('server cancelled unepexectedly, go through the retry loop', this.syncId)
            this.setSyncState(SyncState.Retrying)
        }
    }

    private lastLogInflightAt = 0
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
                    this.log(
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
                    const streamIdBytes = syncStream.nextSyncCookie?.streamId ?? Uint8Array.from([])
                    const streamId = streamIdAsString(streamIdBytes)
                    if (this.inFlightSyncCookies.has(streamId)) {
                        this.inFlightSyncCookies.delete(streamId)
                        if (
                            this.inFlightSyncCookies.size === 0 ||
                            Date.now() - this.lastLogInflightAt > 3000
                        ) {
                            this.log(
                                'onUpdate: remaining streams in flight',
                                this.inFlightSyncCookies.size,
                            )
                            this.lastLogInflightAt = Date.now()
                        }
                    }
                    const streamRecord = this.streams.get(streamId)
                    if (streamRecord === undefined) {
                        this.log('sync got stream', streamId, 'NOT FOUND')
                    } else if (syncStream.syncReset) {
                        this.logDebug('initStream from sync reset', streamId, 'RESET')
                        const response = await unpackStream(syncStream, this.unpackEnvelopeOpts)
                        streamRecord.syncCookie = response.streamAndCookie.nextSyncCookie
                        await streamRecord.stream.initializeFromResponse(response)
                    } else {
                        const streamAndCookie = await unpackStreamAndCookie(
                            syncStream,
                            this.unpackEnvelopeOpts,
                        )
                        streamRecord.syncCookie = streamAndCookie.nextSyncCookie
                        await streamRecord.stream.appendEvents(
                            streamAndCookie.events,
                            streamAndCookie.nextSyncCookie,
                            undefined,
                        )
                    }
                } catch (err) {
                    const e = err as any
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                    switch (e.name) {
                        case 'AbortError':
                            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                            if (e.inner) {
                                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                                this.logError('AbortError reason:', e.inner)
                            } else {
                                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                                this.logError('AbortError message:' + e.message)
                            }
                            break
                        case 'QuotaExceededError':
                            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                            this.logError('QuotaExceededError:', e.message)
                            break
                        default:
                            this.logError('onUpdate error:', err)
                            break
                    }
                }
            } else {
                this.log('sync RESULTS no stream', syncStream)
            }
        } else {
            this.log(
                'onUpdate: invalid state',
                this.syncState,
                'should have been',
                SyncState.Syncing,
            )
        }
    }

    private sendKeepAlivePings() {
        // periodically ping the server to keep the connection alive
        this.pingInfo.pingTimeout = setTimeout(() => {
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
        clearTimeout(this.pingInfo.pingTimeout)
        this.pingInfo.pingTimeout = undefined
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
            this.log(
                `sequence=${n.sequence}, nonce=${n.nonce}, pingAt=${n.pingAt}, receivedAt=${
                    n.receivedAt ?? 'none'
                }, duration=${n.duration ?? 'none'}`,
            )
        }
    }

    private logInvalidStateAndReturnError(currentState: SyncState, newState: SyncState): Error {
        this.log(`invalid state transition ${currentState} -> ${newState}`)
        return new Error(`invalid state transition ${currentState} -> ${newState}`)
    }

    private log(...args: unknown[]): void {
        this.logSync(...args)
    }
}

// priority from stream id for syncing, dms if that's what we're looking at
// channels for any high priority spaces are more important than spaces we're not looking at
// then spaces, then other channels
function priorityFromStreamId(streamId: string, highPriorityIds: Set<string>) {
    if (
        isUserDeviceStreamId(streamId) ||
        isUserInboxStreamId(streamId) ||
        isUserStreamId(streamId) ||
        isUserSettingsStreamId(streamId)
    ) {
        return 0
    }
    if (highPriorityIds.has(streamId)) {
        return 1
    }

    if (isChannelStreamId(streamId)) {
        const spaceId = spaceIdFromChannelId(streamId)
        if (highPriorityIds.has(spaceId)) {
            return 2
        } else {
            return 3
        }
    }
    // if we're prioritizing dms, load other dms and gdm channels
    if (highPriorityIds.size > 0) {
        const firstHPI = Array.from(highPriorityIds.values())[0]
        if (isDMChannelStreamId(firstHPI) || isGDMChannelStreamId(firstHPI)) {
            if (isDMChannelStreamId(streamId) || isGDMChannelStreamId(streamId)) {
                return 4
            }
        }
    }

    // we need spaces to structure the app
    if (isSpaceStreamId(streamId)) {
        return 5
    }

    return 6
}
