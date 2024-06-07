import { Err, SyncCookie, SyncOp, SyncStreamsResponse } from '@river-build/proto'
import { DLogger, dlog, dlogError, shortenHexString } from '@river-build/dlog'
import { StreamRpcClientType, errorContains } from './makeStreamRpcClient'
import { unpackStream, unpackStreamAndCookie } from './sign'
import { StreamStateEvents } from './streamEvents'
import { SyncedStream } from './syncedStream'
import TypedEmitter from 'typed-emitter'
import { isDefined } from './check'
import { nanoid } from 'nanoid'
import { isMobileSafari } from './utils'
import { streamIdAsBytes, streamIdAsString } from './id'

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
    pingTimeout?: NodeJS.Timeout // for cancelling the next ping
}

export class SyncedStreams {
    // userId is the current user id
    private readonly userId: string
    // mapping of stream id to stream
    private readonly streams: Map<string, SyncedStream> = new Map()
    // loggers
    private readonly logSync: DLogger
    private readonly logError: DLogger
    // clientEmitter is used to proxy the events from the streams to the client
    private readonly clientEmitter: TypedEmitter<StreamStateEvents>

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
    private rpcClient: StreamRpcClientType
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
    private inProgressTick?: Promise<void>
    private pingInfo: PingInfo = {
        currentSequence: 0,
        nonces: {},
    }

    constructor(
        userId: string,
        rpcClient: StreamRpcClientType,
        clientEmitter: TypedEmitter<StreamStateEvents>,
    ) {
        this.userId = userId
        this.rpcClient = rpcClient
        this.clientEmitter = clientEmitter
        const shortId = shortenHexString(
            this.userId.startsWith('0x') ? this.userId.slice(2) : this.userId,
        )
        this.logSync = dlog('csb:cl:sync').extend(shortId)
        this.logError = dlogError('csb:cl:sync:stream').extend(shortId)
    }

    public has(streamId: string | Uint8Array): boolean {
        return this.streams.get(streamIdAsString(streamId)) !== undefined
    }

    public get(streamId: string | Uint8Array): SyncedStream | undefined {
        return this.streams.get(streamIdAsString(streamId))
    }

    public set(streamId: string | Uint8Array, stream: SyncedStream): void {
        this.log('stream set', streamId)
        this.streams.set(streamIdAsString(streamId), stream)
    }

    public delete(inStreamId: string | Uint8Array): void {
        const streamId = streamIdAsString(inStreamId)
        this.streams.get(streamId)?.stop()
        this.streams.delete(streamId)
    }

    public size(): number {
        return this.streams.size
    }

    public getStreams(): SyncedStream[] {
        return Array.from(this.streams.values())
    }

    public getStreamIds(): string[] {
        return Array.from(this.streams.keys())
    }

    public onNetworkStatusChanged(isOnline: boolean) {
        this.log('network status changed. Network online?', isOnline)
        if (isOnline) {
            // immediate retry if the network comes back online
            this.log('back online, release retry wait', { syncState: this.syncState })
            this.releaseRetryWait?.()
        }
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

    public async startSyncStreams() {
        if (isMobileSafari()) {
            document.addEventListener('visibilitychange', this.onMobileSafariBackgrounded)
        }
        return await this.createSyncLoop()
    }

    private checkStartTicking() {
        if (this.inProgressTick) {
            return
        }

        if (this.responsesQueue.length === 0) {
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

    // adds stream to the sync subscription
    public async addStreamToSync(syncCookie: SyncCookie): Promise<void> {
        const streamId = streamIdAsString(syncCookie.streamId)
        this.log('addStreamToSync', streamId)
        if (!this.streams.has(streamId)) {
            // perhaps we called stopSync while loading a stream from persistence
            this.logError('streamId not in this.streams, not adding to sync', streamId)
        }
        if (this.syncState === SyncState.Starting || this.syncState === SyncState.Retrying) {
            await this.waitForSyncingState()
        }
        if (this.syncState === SyncState.Syncing) {
            try {
                await this.rpcClient.addStreamToSync({
                    syncId: this.syncId,
                    syncPos: syncCookie,
                })
                this.log('addStreamToSync complete', syncCookie)
            } catch (err) {
                // Trigger restart of sync loop
                this.log(`addStreamToSync error`, err)
                if (errorContains(err, Err.BAD_SYNC_COOKIE)) {
                    this.log('addStreamToSync BAD_SYNC_COOKIE', syncCookie)
                    throw err
                }
            }
        } else {
            this.log(
                'addStreamToSync: not in "syncing" state; let main sync loop handle this with its streams map',
                { streamId: syncCookie.streamId, syncState: this.syncState },
            )
        }
    }

    // remove stream from the sync subsbscription
    public async removeStreamFromSync(inStreamId: string | Uint8Array): Promise<void> {
        const streamId = streamIdAsString(inStreamId)
        const stream = this.streams.get(streamId)
        if (!stream) {
            this.log('removeStreamFromSync streamId not found', streamId)
            // no such stream
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
            stream.stop()
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

    private async createSyncLoop() {
        return new Promise<void>((resolve, reject) => {
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
                reject(new Error('invalid state transition'))
            }

            if (this.syncLoop) {
                reject(new Error('createSyncLoop called while a loop exists'))
            }

            this.syncLoop = (async (): Promise<number> => {
                let iteration = 0

                this.log('sync loop created')
                resolve()

                try {
                    while (
                        this.syncState === SyncState.Starting ||
                        this.syncState === SyncState.Syncing ||
                        this.syncState === SyncState.Retrying
                    ) {
                        this.log('sync ITERATION start', ++iteration, this.syncState)
                        if (this.syncState === SyncState.Retrying) {
                            this.setSyncState(SyncState.Starting)
                        }

                        // get cookies from all the known streams to sync
                        const syncCookies = Array.from(this.streams.values())
                            .map((stream) => stream.view.syncCookie)
                            .filter(isDefined)

                        try {
                            // syncId needs to be reset before starting a new syncStreams
                            // syncStreams() should return a new syncId
                            this.syncId = undefined
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
                                            this.log('forceStopSyncStreams called')
                                            resolve()
                                        }
                                        this.interruptSync = (e: unknown) => {
                                            this.log('sync interrupted', e)
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
                                    this.log('exiting syncStreams', done, value)
                                    // exit the syncLoop, it's done
                                    this.forceStopSyncStreams = undefined
                                    this.interruptSync = undefined
                                    return iteration
                                }

                                this.log(
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
                                            pingStats.duration =
                                                pingStats.receivedAt - pingStats.pingAt
                                        } else {
                                            this.logError('pong nonce not found', value.pongNonce)
                                            this.printNonces()
                                        }
                                        break
                                    default:
                                        this.log(
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
                        this.streams.forEach((stream) => {
                            stream.stop()
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

    private syncClosed() {
        this.stopPing()
        if (this.syncState === SyncState.Canceling) {
            this.log('server acknowledged our close atttempt', this.syncId)
        } else {
            this.log('server cancelled unepexectedly, go through the retry loop', this.syncId)
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
                    const stream = this.streams.get(streamId)
                    if (stream === undefined) {
                        this.log('sync got stream', streamId, 'NOT FOUND')
                    } else if (syncStream.syncReset) {
                        this.log('initStream from sync reset', streamId, 'RESET')
                        const response = await unpackStream(syncStream)
                        await stream.initializeFromResponse(response)
                    } else {
                        const streamAndCookie = await unpackStreamAndCookie(syncStream)
                        await stream.appendEvents(
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
