import { DLogger, dlog, dlogError, shortenHexString } from '@river/dlog'
import { isDefined } from './check'
import { Err, SyncCookie, SyncOp, SyncStreamsResponse } from '@river/proto'
import { IPersistenceStore } from './persistenceStore'
import { Stream } from './stream'
import { StreamRpcClientType, errorContains } from './makeStreamRpcClient'
import TypedEmitter from 'typed-emitter'
import { unpackStreamAndCookie, unpackStream } from './sign'
import { SyncedStream } from './syncedStream'
import { StreamStateEvents } from './streamEvents'

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

export class SyncedStreams {
    // userId is the current user id
    private readonly userId: string
    // mapping of stream id to stream
    private readonly streams: Map<string, SyncedStream> = new Map()
    // loggers
    private readonly logSync: DLogger
    private readonly logStream: DLogger
    private readonly logError: DLogger
    // clientEmitter is used to proxy the events from the streams to the client
    private readonly clientEmitter: TypedEmitter<StreamStateEvents>
    private readonly persistenceStore: IPersistenceStore

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
    private abortRetry: (() => void) | undefined
    private currentRetryCount: number = 0
    private forceStopSyncStreams: (() => void) | undefined

    // Only responses related to the current syncId are processed.
    // Responses are queued and processed in order
    // and are cleared when sync stops
    private responsesQueue: SyncStreamsResponse[] = []
    private inProgressTick?: Promise<void>

    constructor(
        userId: string,
        rpcClient: StreamRpcClientType,
        persistenceStore: IPersistenceStore,
        clientEmitter: TypedEmitter<StreamStateEvents>,
    ) {
        this.userId = userId
        this.rpcClient = rpcClient
        this.persistenceStore = persistenceStore
        this.clientEmitter = clientEmitter
        const shortId = shortenHexString(
            this.userId.startsWith('0x') ? this.userId.slice(2) : this.userId,
        )
        this.logSync = dlog('csb:cl:sync').extend(shortId)
        this.logStream = dlog('csb:cl:sync:stream').extend(shortId)
        this.logError = dlogError('csb:cl:sync:stream').extend(shortId)
    }

    public has(streamId: string): boolean {
        return this.streams.get(streamId) !== undefined
    }

    public get(streamId: string): SyncedStream | undefined {
        return this.streams.get(streamId)
    }

    public set(streamId: string, stream: SyncedStream): void {
        this.log('stream set', streamId)
        this.streams.set(streamId, stream)
    }

    public delete(streamId: string) {
        this.streams.get(streamId)?.stop()
        this.streams.delete(streamId)
    }

    public size(): number {
        return this.streams.size
    }

    public getStreams(): Stream[] {
        return Array.from(this.streams.values())
    }

    public getStreamIds(): string[] {
        return Array.from(this.streams.keys())
    }

    public async startSyncStreams() {
        return await this.createSyncLoop()
    }

    private checkStartTicking() {
        if (this.inProgressTick) {
            return
        }

        if (this.responsesQueue.length === 0) {
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
            try {
                this.abortRetry?.()
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
    }

    // adds stream to the sync subscription
    public async addStreamToSync(syncCookie: SyncCookie): Promise<void> {
        /*
        const stream = this.streams.has(syncCookie.streamId)
        
        if (stream) {
            this.log('addStreamToSync streamId already syncing', syncCookie)
            return
        }
        */
        if (this.syncState === SyncState.Syncing) {
            try {
                await this.rpcClient.addStreamToSync({
                    syncId: this.syncId,
                    syncPos: syncCookie,
                })
                this.log('addedStreamToSync', syncCookie)
            } catch (err) {
                // Trigger restart of sync loop
                this.log(`addedStreamToSync error`, err)
                if (errorContains(err, Err.BAD_SYNC_COOKIE)) {
                    this.log('addStreamToSync BAD_SYNC_COOKIE', syncCookie)
                    throw err
                }
            }
        } else {
            this.log(
                'addStreamToSync: not in "syncing" state; let main sync loop handle this with its streams map',
                syncCookie.streamId,
            )
        }
    }

    // remove stream from the sync subsbscription
    public async removeStreamFromSync(streamId: string): Promise<void> {
        const stream = this.streams.get(streamId)
        if (!stream) {
            this.log('removeStreamFromSync streamId not found', streamId)
            // no such stream
            return
        }
        if (this.syncState === SyncState.Syncing) {
            try {
                await this.rpcClient.removeStreamFromSync({
                    syncId: this.syncId,
                    streamId: streamId,
                })
            } catch (err) {
                // Trigger restart of sync loop
                this.log('removeStreamFromSync err', err)
            }
            stream.stop()
            this.streams.delete(streamId)
            this.log('removed stream from sync', streamId)
            this.clientEmitter.emit('streamRemovedFromSync', streamId)
        } else {
            this.log(
                'removeStreamFromSync: not in "syncing" state; let main sync loop handle this with its streams map',
                streamId,
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
                                const breakSyncStreamsPromise = new Promise<void>(
                                    (resolve) =>
                                        (this.forceStopSyncStreams = () => {
                                            this.log('forceStopSyncStreams called')
                                            resolve()
                                        }),
                                )
                                const { value, done } = await Promise.race([
                                    iterator.next(),
                                    breakSyncStreamsPromise.then(() => ({
                                        value: undefined,
                                        done: true,
                                    })),
                                ])
                                this.forceStopSyncStreams = undefined
                                if (done || value === undefined) {
                                    this.log('exiting syncStreams', done, value)
                                    // exit the syncLoop, it's done
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
                    this.log('sync loop stopping ITERATION', iteration)
                    if (stateConstraints[this.syncState].has(SyncState.NotSyncing)) {
                        this.setSyncState(SyncState.NotSyncing)
                        this.streams.forEach((stream) => {
                            stream.stop()
                        })
                        this.streams.clear()
                        this.abortRetry = undefined
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
    }

    // The sync loop will keep retrying until it is shutdown, it has no max attempts
    private async attemptRetry(): Promise<void> {
        this.log(`attemptRetry`, this.syncState)
        if (stateConstraints[this.syncState].has(SyncState.Retrying)) {
            if (this.syncState !== SyncState.Retrying) {
                this.setSyncState(SyncState.Retrying)
                this.syncId = undefined
                this.clientEmitter.emit('streamSyncActive', false)
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
                    const streamId = syncStream.nextSyncCookie?.streamId ?? ''
                    const stream = this.streams.get(streamId)
                    if (stream === undefined) {
                        this.log('sync got stream', streamId, 'NOT FOUND')
                    } else if (syncStream.syncReset) {
                        const response = await unpackStream(syncStream)
                        await stream.initializeFromResponse(response)
                    } else {
                        const streamAndCookie = await unpackStreamAndCookie(syncStream)
                        const cleartexts = await this.persistenceStore.getCleartexts(
                            streamAndCookie.events.map((e) => e.hashStr),
                        )
                        await stream.appendEvents(
                            streamAndCookie.events,
                            streamAndCookie.nextSyncCookie,
                            cleartexts,
                        )
                    }
                } catch (err) {
                    this.logError('onUpdate error', err)
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

    private logInvalidStateAndReturnError(currentState: SyncState, newState: SyncState): Error {
        this.log(`invalid state transition ${currentState} -> ${newState}`)
        return new Error(`invalid state transition ${currentState} -> ${newState}`)
    }

    private log(...args: unknown[]): void {
        this.logSync(...args)
    }
}
