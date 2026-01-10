import { SyncCookie, SyncOp, SyncStreamsResponse } from '@towns-protocol/proto'
import { DLogger, dlog, dlogError } from '@towns-protocol/utils'
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
import { ParsedEvent, ParsedSnapshot, ParsedStreamResponse } from './types'
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
        snapshot: ParsedSnapshot | undefined,
        cleartexts: Record<string, Uint8Array | string> | undefined,
    ): Promise<void>
    resetUpToDate(): void
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

const isHighPriorityStreamForSync = (streamId: string | Uint8Array): boolean =>
    isChannelStreamId(streamId) || isDMChannelStreamId(streamId) || isGDMChannelStreamId(streamId)

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
    // on stop, the syncLoop will be cancelled if it is running and removed once it stops
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
    private releaseRetryWait: (() => void) | undefined
    private currentRetryCount: number = 0
    private forceStopSyncStreams: (() => void) | undefined
    private interruptSync: ((err: unknown) => void) | undefined
    private isMobileSafariBackgrounded = false

    // Only responses related to the current syncId are processed.
    // Responses are queued and processed in order
    // and are cleared when sync stops
    private responsesQueue: SyncStreamsResponse[] = []
    private inProgressResponseTick?: Promise<void>
    private inProgressModificationTick?: Promise<void>
    private pendingSyncCookies: string[] = []
    private inFlightSyncCookies = new Set<string>()
    private pendingStreamsToDelete: string[] = []
    private lastLogInflightAt = 0
    private syncStartedAt: number | undefined = undefined
    private processedStreamCount = 0
    private streamSyncStalled: NodeJS.Timeout | undefined
    private abortController?: AbortController
    private readonly MAX_IN_FLIGHT_COOKIES = 40
    private readonly MIN_IN_FLIGHT_COOKIES = 10
    private readonly MAX_IN_FLIGHT_STREAMS_TO_DELETE = 40

    // Batched syncDown handling to prevent feedback loops
    private syncDownStreams = new Set<string>()
    private syncDownTimer?: NodeJS.Timeout
    private readonly SYNC_DOWN_BATCH_DELAY_MS = 10_000

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
        private lastAccessedAt: Record<string, number>,
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
        this.clearSyncDownBatch()
        if (stateConstraints[this.syncState].has(SyncState.Canceling)) {
            const syncId = this.syncId
            const syncLoop = this.syncLoop
            const syncState = this.syncState
            this.syncId = undefined
            this.setSyncState(SyncState.Canceling)
            this.stopPing()
            try {
                this.releaseRetryWait?.()
                // Give the server 5 seconds to respond to the cancelSync RPC before forceStopSyncStreams
                const cancelSyncAbortController = new AbortController()
                const breakTimeout = syncId
                    ? setTimeout(() => {
                          this.log('calling forceStopSyncStreams', syncId)
                          cancelSyncAbortController.abort()
                          this.forceStopSyncStreams?.()
                      }, 5000)
                    : undefined

                this.log('stopSync syncState', syncState)
                this.log('stopSync syncLoop', syncLoop)
                this.log('stopSync syncId', syncId)
                const result = await Promise.allSettled([
                    syncId
                        ? this.rpcClient.cancelSync(
                              { syncId },
                              { signal: cancelSyncAbortController.signal },
                          )
                        : undefined,
                    syncLoop,
                ])
                this.log('syncLoop awaited', syncId, result)
                clearTimeout(breakTimeout)
            } catch (e) {
                this.log('sync STOP ERROR', e)
            }
            this.abortController?.abort()
            this.abortController = undefined
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
        // check if pending delete
        const pendingIndex = this.pendingStreamsToDelete.indexOf(streamId)
        if (pendingIndex !== -1) {
            this.pendingStreamsToDelete.splice(pendingIndex, 1)
            this.log('removed stream from pending deletion list', streamId)
        }
        // add to streams, enqueue for add
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
            streamRecord.stream.stop()
            this.streams.delete(streamId)
            this.log('removed stream from pending sync', streamId)
            return
        }
        if (this.pendingStreamsToDelete.includes(streamId)) {
            this.log('stream already in pending delete', streamId)
            return
        }
        if (this.syncState === SyncState.Starting || this.syncState === SyncState.Retrying) {
            await this.waitForSyncingState()
        }
        if (this.syncState === SyncState.Syncing) {
            this.pendingStreamsToDelete.push(streamId)
            streamRecord.stream.stop()
            this.streams.delete(streamId)
            this.log('removed stream from sync', streamId)
            this.clientEmitter.emit('streamRemovedFromSync', streamId)
        } else {
            this.log(
                'removeStreamFromSync: not in "syncing" state; let main sync loop handle this with its streams map',
                { streamId, syncState: this.syncState },
            )
        }
        this.inFlightSyncCookies.delete(streamId)
    }

    public setHighPriorityStreams(streamIds: string[]) {
        this.highPriorityIds = new Set(streamIds)
        streamIds.forEach((x) => (this.lastAccessedAt[x] = Date.now()))
        this.checkStartTicking()
    }

    public onNetworkStatusChanged(isOnline: boolean) {
        if (isOnline) {
            this.log('back online, release retry wait', { syncState: this.syncState })
            this.releaseRetryWait?.()
        }
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
                    this.pendingStreamsToDelete = []
                    const syncCookies: SyncCookie[] = []

                    // if the stream is a channel, dm, or gdm, add the sync cookie to the initial sync cookies
                    // prioritized spaces will be added later during the calls to tick()
                    for (const id of this.highPriorityIds) {
                        if (isHighPriorityStreamForSync(id)) {
                            const syncCookie = this.streams.get(id)?.syncCookie
                            if (syncCookie) {
                                syncCookies.push(syncCookie)
                                this.inFlightSyncCookies.add(id)
                            }
                        }
                    }
                    // pending sync cookies are all streams that are not in the inFlightSyncCookies
                    this.pendingSyncCookies = Array.from(this.streams.keys()).filter(
                        (id) => !this.inFlightSyncCookies.has(id),
                    )

                    this.syncStartedAt = performance.now()
                    this.processedStreamCount = 0

                    this.log(
                        'sync ITERATION start',
                        ++iteration,
                        this.syncState,
                        `pending: ${this.pendingSyncCookies.length}`,
                        `pendingDelete: ${this.pendingStreamsToDelete.length}`,
                    )

                    if (this.syncState === SyncState.Retrying) {
                        this.setSyncState(SyncState.Starting)
                    }

                    try {
                        // syncId needs to be reset before starting a new syncStreams
                        // syncStreams() should return a new syncId
                        this.abortController?.abort()
                        this.abortController = new AbortController()
                        this.syncId = undefined
                        const streams = this.rpcClient.syncStreams(
                            {
                                syncPos: syncCookies,
                            },
                            {
                                timeoutMs: -1,
                                signal: this.abortController.signal,
                            },
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
                                    // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
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
                                        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                                        `unknown syncOp { syncId: ${this.syncId}, syncOp: ${value.syncOp} }`,
                                    )
                                    break
                            }
                        }
                    } catch (err) {
                        this.logError(
                            {
                                syncId: this.syncId,
                                nodeUrl: this.rpcClient.url,
                                syncState: this.syncState,
                                syncStartedAt: this.syncStartedAt,
                                duration: performance.now() - this.syncStartedAt,
                            },
                            'syncLoop error',
                            err,
                        )
                        await this.attemptRetry()
                    }
                }
            } finally {
                this.log('sync loop stopping ITERATION', {
                    iteration,
                    syncState: this.syncState,
                })
                this.stopPing()
                clearTimeout(this.streamSyncStalled)
                this.clearSyncDownBatch()
                if (stateConstraints[this.syncState].has(SyncState.NotSyncing)) {
                    this.setSyncState(SyncState.NotSyncing)
                    this.streams.forEach((streamRecord) => {
                        streamRecord.stream.stop()
                    })
                    this.streams.clear()
                    this.releaseRetryWait = undefined
                    this.syncId = undefined
                    this.abortController?.abort()
                    this.abortController = undefined
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
        this.checkStartTickingResponses()
        this.checkStartTickingModifications()
    }

    private checkStartTickingModifications() {
        if (this.inProgressModificationTick) {
            return
        }

        if (this.pendingSyncCookies.length === 0 && this.pendingStreamsToDelete.length === 0) {
            return
        }

        const tick = this.tickModifications()
        this.inProgressModificationTick = tick
        queueMicrotask(() => {
            tick.catch((e) => this.logError('ProcessModificationTick Error', e)).finally(() => {
                this.inProgressModificationTick = undefined
                setTimeout(() => this.checkStartTickingModifications())
            })
        })
    }

    private checkStartTickingResponses() {
        if (this.inProgressResponseTick) {
            return
        }

        if (this.responsesQueue.length === 0) {
            return
        }

        if (this.isMobileSafariBackgrounded) {
            return
        }

        const tick = this.tickResponses()
        this.inProgressResponseTick = tick
        queueMicrotask(() => {
            tick.catch((e) => this.logError('ProcessResponseTick Error', e)).finally(() => {
                this.inProgressResponseTick = undefined
                // Tick both queues, not just the response queue. Handled responses affect the ModifySync flow
                // in the modifications queue.
                setTimeout(() => this.checkStartTicking())
            })
        })
    }

    private async tickResponses() {
        const item = this.responsesQueue.shift()
        if (item) {
            await this.onUpdate(item)
        }
    }

    private async tickModifications() {
        if (this.syncState === SyncState.Syncing) {
            const pendingStreamsToDelete = this.pendingStreamsToDelete.filter(
                (x) => !this.inFlightSyncCookies.has(x),
            )
            const highPriorityStreamsToAdd = this.pendingSyncCookies.filter((x) =>
                this.highPriorityIds.has(x),
            )
            if (highPriorityStreamsToAdd.length > 0) {
                // call modify sync with high priority streams
                this.log('tick: modifySync: high priority streams to add', {
                    syncId: this.syncId,
                    addHighPriorityStreams: highPriorityStreamsToAdd,
                })
                this.pendingSyncCookies = this.pendingSyncCookies.filter(
                    (x) => !highPriorityStreamsToAdd.includes(x),
                )
                await this.modifySync(highPriorityStreamsToAdd, [])
            } else if (
                (this.inFlightSyncCookies.size <= this.MIN_IN_FLIGHT_COOKIES &&
                    this.pendingSyncCookies.length > 0) ||
                pendingStreamsToDelete.length > 0
            ) {
                this.pendingSyncCookies.sort((a, b) => {
                    const aPriority = priorityFromStreamId(a, this.highPriorityIds)
                    const bPriority = priorityFromStreamId(b, this.highPriorityIds)
                    if (aPriority === bPriority) {
                        const aLastAccessedAt = this.lastAccessedAt[a] ?? 0
                        const bLastAccessedAt = this.lastAccessedAt[b] ?? 0
                        return bLastAccessedAt - aLastAccessedAt
                    }
                    return aPriority - bPriority
                })
                const streamsToAdd = this.pendingSyncCookies.splice(0, this.MAX_IN_FLIGHT_COOKIES)
                const streamsToDelete = pendingStreamsToDelete.splice(
                    0,
                    this.MAX_IN_FLIGHT_STREAMS_TO_DELETE,
                )
                this.pendingStreamsToDelete = pendingStreamsToDelete.filter(
                    (x) => !streamsToDelete.find((y) => x === y),
                )
                this.logSync('tick: modifySync', {
                    syncId: this.syncId,
                    addStreams: streamsToAdd,
                    deleteStreams: streamsToDelete,
                    inFlight: this.inFlightSyncCookies.size,
                })
                await this.modifySync(streamsToAdd, streamsToDelete)
            }
        }
    }

    private async modifySync(streamsToAdd: string[], streamsToDelete: string[]) {
        const syncId = this.syncId
        if (!syncId) {
            throw new Error('modifySync called without a syncId')
        }
        if (!this.abortController) {
            throw new Error('modifySync called before abortController is set')
        }
        streamsToAdd.forEach((x) => this.inFlightSyncCookies.add(x))
        const syncPos = streamsToAdd.map((x) => this.streams.get(x)?.syncCookie)
        try {
            const resp = await this.rpcClient.modifySync(
                {
                    syncId,
                    addStreams: syncPos.filter(isDefined),
                    removeStreams: streamsToDelete.map(streamIdAsBytes),
                },
                { signal: this.abortController.signal },
            )
            if (resp.removals.length > 0) {
                this.logError('modifySync removal errors', resp.removals)
            }
            if (resp.adds.length > 0) {
                this.logError('modifySync addition errors', resp.adds)
                resp.adds.forEach((x) =>
                    this.inFlightSyncCookies.delete(streamIdAsString(x.streamId)),
                )
            }
        } catch (err) {
            this.logError('modifySync error', err)
            if (this.syncId === syncId && this.syncState === SyncState.Syncing) {
                streamsToAdd.forEach((x) => {
                    if (this.inFlightSyncCookies.delete(x)) {
                        this.pendingSyncCookies.push(x)
                    }
                })
                this.pendingStreamsToDelete.push(...streamsToDelete)
                this.checkStartTicking()
            }
        }
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
                this.abortController?.abort()
                this.abortController = undefined
                this.syncId = undefined
                this.streams.forEach((streamRecord) => {
                    streamRecord.stream.resetUpToDate()
                })
                this.inFlightSyncCookies.clear()
                this.pendingSyncCookies = []
                this.pendingStreamsToDelete = []
                this.clearSyncDownBatch()
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
            if (!this.abortController) {
                this.logError('syncStarted: abortController not set, creating new one')
                this.abortController = new AbortController()
            }
            // On successful sync, reset retryCount
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

    private syncDown(streamId: Uint8Array): void {
        if (this.syncId === undefined) {
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
        const streamIdStr = streamIdAsString(streamId)
        // remove from inflight sync cookies
        this.onModifySyncResponseReceived(streamIdStr)

        // Add to the batched set of streams to re-sync
        this.syncDownStreams.add(streamIdStr)
        this.log('syncDown: queued stream for batch re-sync', {
            streamId: streamIdStr,
            queuedCount: this.syncDownStreams.size,
        })

        // Start or reset the debounced timer
        if (!this.syncDownTimer) {
            this.syncDownTimer = setTimeout(() => {
                this.processSyncDownBatch()
            }, this.SYNC_DOWN_BATCH_DELAY_MS)
        }
    }

    private processSyncDownBatch(): void {
        this.syncDownTimer = undefined

        if (this.syncDownStreams.size === 0) {
            return
        }
        if (this.syncId === undefined || this.syncState !== SyncState.Syncing) {
            this.syncDownStreams.clear()
            return
        }

        // Add all syncDown streams to pendingSyncCookies and let the existing tick machinery handle it
        const streamIds = Array.from(this.syncDownStreams)
        this.log('processSyncDownBatch: adding streams to pendingSyncCookies', {
            streamCount: streamIds.length,
            streamIds,
        })

        for (const streamIdStr of streamIds) {
            if (
                !this.pendingSyncCookies.includes(streamIdStr) &&
                !this.inFlightSyncCookies.has(streamIdStr) &&
                this.streams.has(streamIdStr)
            ) {
                this.pendingSyncCookies.push(streamIdStr)
            }
        }
        this.syncDownStreams.clear()

        this.checkStartTicking()
    }

    private clearSyncDownBatch(): void {
        clearTimeout(this.syncDownTimer)
        this.syncDownTimer = undefined
        this.syncDownStreams.clear()
    }

    private syncClosed() {
        this.stopPing()
        if (this.syncState === SyncState.Canceling) {
            this.log('server acknowledged our close attempt', this.syncId)
        } else {
            this.log('server cancelled unepexectedly, go through the retry loop', this.syncId)
            this.setSyncState(SyncState.Retrying)
        }
    }

    private async onUpdate(res: SyncStreamsResponse): Promise<void> {
        // Until we've completed canceling, accept responses
        if (this.syncState === SyncState.Syncing || this.syncState === SyncState.Canceling) {
            if (this.syncId != res.syncId) {
                this.logError(
                    `syncId mismatch; has:'${this.syncId}', got:${res.syncId}'. Throw away update.`,
                )
                return
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
                    this.onModifySyncResponseReceived(streamId)
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
                            // Miniblocks are not provided in the sync updates so skipping signature validation
                            // that ensures that the snapshot creator is the same address as its miniblock creator.
                            {
                                disableHashValidation: false,
                                disableSignatureValidation: true,
                            },
                        )
                        streamRecord.syncCookie = streamAndCookie.nextSyncCookie
                        await streamRecord.stream.appendEvents(
                            streamAndCookie.events,
                            streamAndCookie.nextSyncCookie,
                            streamAndCookie.snapshot,
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

    private onModifySyncResponseReceived(streamId: string) {
        if (this.inFlightSyncCookies.has(streamId)) {
            this.inFlightSyncCookies.delete(streamId)
            this.processedStreamCount++

            if (this.inFlightSyncCookies.size === 0 || Date.now() - this.lastLogInflightAt > 5000) {
                if (this.inFlightSyncCookies.size === 0 && this.syncStartedAt !== undefined) {
                    const duration = performance.now() - this.syncStartedAt
                    this.log('sync completed in', duration, 'ms')
                    this.clientEmitter.emit('streamSyncBatchCompleted', {
                        duration,
                        count: this.processedStreamCount,
                    })
                    this.syncStartedAt = undefined
                    this.processedStreamCount = 0
                    clearTimeout(this.streamSyncStalled)
                } else {
                    this.log(
                        `sync status inflight:${this.inFlightSyncCookies.size} enqueued:${this.pendingSyncCookies.length}`,
                    )

                    clearTimeout(this.streamSyncStalled)
                    this.streamSyncStalled = setTimeout(() => {
                        if (this.syncStartedAt) {
                            const duration = performance.now() - this.syncStartedAt
                            this.logError(
                                {
                                    syncId: this.syncId,
                                    nodeUrl: this.rpcClient.url,
                                    syncState: this.syncState,
                                    syncStartedAt: this.syncStartedAt,
                                    duration,
                                },
                                `sync has stalled after ${duration}ms`,
                            )
                            this.clientEmitter.emit('streamSyncTimedOut', {
                                duration,
                            })
                        }
                        this.streamSyncStalled = undefined
                    }, 10_000)
                }
                this.lastLogInflightAt = Date.now()
            }
        }
    }

    private sendKeepAlivePings() {
        // periodically ping the server to keep the connection alive
        this.pingInfo.pingTimeout = setTimeout(
            () => {
                const ping = async () => {
                    if (!this.syncId || !this.abortController) {
                        this.log('sendKeepAlivePings: syncId or abortController not set', {
                            syncId: this.syncId,
                            abortController: this.abortController,
                        })
                        return
                    }
                    if (this.syncState === SyncState.Syncing && this.syncId) {
                        const n = nanoid()
                        this.pingInfo.nonces[n] = {
                            sequence: this.pingInfo.currentSequence++,
                            nonce: n,
                            pingAt: performance.now(),
                        }
                        await this.rpcClient.pingSync(
                            {
                                syncId: this.syncId,
                                nonce: n,
                            },
                            { signal: this.abortController.signal },
                        )
                    }
                    if (this.syncState === SyncState.Syncing) {
                        // schedule the next ping
                        this.sendKeepAlivePings()
                    }
                }
                ping().catch((err) => {
                    this.interruptSync?.(err)
                })
            },
            5 * 1000 * 60,
        ) // every 5 minutes
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
    if (isDMChannelStreamId(streamId) || isGDMChannelStreamId(streamId)) {
        if (highPriorityIds.size > 0) {
            const firstHPI = Array.from(highPriorityIds.values())[0]
            if (isDMChannelStreamId(firstHPI) || isGDMChannelStreamId(firstHPI)) {
                return 2
            }
        }
        return 3
    }

    // we need spaces to structure the app
    if (isSpaceStreamId(streamId)) {
        return 5
    }

    return 6
}
