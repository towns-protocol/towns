import { DLogger, dlog } from './dlog'
import { SyncCookie, SyncOp, SyncStreamsResponse } from '@river/proto'

import { EmittedEvents } from './client'
import EventEmitter from 'events'
import { PersistenceStore } from './persistenceStore'
import { Stream } from './stream'
import { StreamRpcClientType } from './makeStreamRpcClient'
import { SyncEvents } from './syncEvents'
import TypedEmitter from 'typed-emitter'
import { shortenHexString } from './binary'
import { unpackStreamAndCookie } from './sign'

export enum SyncState {
    Canceling = 'Canceling',
    NotSyncing = 'NotSyncing',
    Retrying = 'Retrying',
    Starting = 'Starting',
    Syncing = 'Syncing',
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
    [SyncState.Syncing]: new Set([SyncState.Canceling, SyncState.Retrying, SyncState.Syncing]),
    [SyncState.Retrying]: new Set([SyncState.Canceling, SyncState.Syncing, SyncState.Retrying]),
    [SyncState.Canceling]: new Set([SyncState.NotSyncing]),
}

const continueIteration = new Set([SyncState.Starting, SyncState.Retrying])

export class SyncedStreams extends (EventEmitter as new () => TypedEmitter<SyncEvents>) {
    // userId is the current user id
    private readonly userId: string
    // mapping of stream id to stream
    private readonly streams: Map<string, Stream> = new Map()
    // loggers
    private readonly logSync: DLogger
    private readonly logStream: DLogger
    // clientEmitter is used to proxy the events from the streams to the client
    private readonly clientEmitter: TypedEmitter<EmittedEvents>
    private readonly persistenceStore: PersistenceStore

    // syncId is used to add and remove streams from the sync subscription
    private syncId: string = ''
    // a handle to the current sync loop
    private syncLoop?: Promise<unknown>
    // rpcClient is used to receive sync updates from the server
    private rpcClient: StreamRpcClientType
    // syncState is used to track the current sync state
    private _syncState: SyncState = SyncState.NotSyncing
    // retry logic
    private retryPromise: Promise<void> | undefined
    private abortRetry: (() => void) | undefined
    private currentRetryCount: number = 0

    constructor(
        userId: string,
        rpcClient: StreamRpcClientType,
        persistenceStore: PersistenceStore,
        clientEmitter: TypedEmitter<EmittedEvents>,
    ) {
        super()
        this.userId = userId
        this.rpcClient = rpcClient
        this.persistenceStore = persistenceStore
        this.clientEmitter = clientEmitter
        const shortId = shortenHexString(
            this.userId.startsWith('0x') ? this.userId.slice(2) : this.userId,
        )
        this.logSync = dlog('csb:cl:sync:v2').extend(shortId)
        this.logStream = dlog('csb:cl:sync:v2:stream').extend(shortId)
    }

    // isActiveSyncEvents is used to filter
    // the list of events to emit to the client
    private isActiveSyncEvents = new Set([
        SyncState.Starting.toString(),
        SyncState.Syncing.toString(),
        SyncState.Retrying.toString(),
        SyncState.Canceling.toString(),
        SyncState.NotSyncing.toString(),
    ])
    public emit<E extends keyof SyncEvents>(event: E, ...args: Parameters<SyncEvents[E]>): boolean {
        this.logStream(event, ...args)
        if (this.isActiveSyncEvents.has(event.toString())) {
            const isSyncing = this.syncState === SyncState.Syncing
            this.clientEmitter.emit('streamSyncActive', isSyncing)
        }
        return super.emit(event, ...args)
    }

    public has(streamId: string): boolean {
        return this.streams.get(streamId) !== undefined
    }

    public get(streamId: string): Stream | undefined {
        return this.streams.get(streamId)
    }

    public set(streamId: string, stream: Stream): void {
        this.streams.set(streamId, stream)
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

    public startSync(): void {
        if (this.syncId) {
            this.logSync('already syncing with syncId', this.syncId)
        }
        this.logSync('sync START')
        const syncLoop = async (): Promise<void> => {
            return this.runSyncLoop()
        }
        this.syncLoop = syncLoop()
    }

    public async stopSync(): Promise<unknown> {
        this.logSync('sync STOP CALLED')
        let err: unknown = undefined
        const beforeCancel = this.syncState
        this.onCancel()
        if (beforeCancel === SyncState.Syncing) {
            const syncId = this.syncId
            const syncLoop = this.syncLoop
            if (syncId && syncLoop) {
                try {
                    await Promise.allSettled([this.rpcClient.cancelSync({ syncId }), syncLoop])
                } catch (e) {
                    if (!isConnectError(e)) {
                        err = e
                        this.logSync('sync STOP ERROR', err)
                        this.emit('syncError', this.syncId, err)
                    }
                }
            }
        }
        this.logSync('sync STOP DONE')
        return err
    }

    // adds stream to the sync subscription
    public async addStreamToSync(syncCookie: SyncCookie): Promise<void> {
        if (this.syncState === SyncState.Syncing) {
            try {
                await this.rpcClient.addStreamToSync({
                    syncId: this.syncId,
                    syncPos: syncCookie,
                })
            } catch (err) {
                this.onError(err)
            }
        } else {
            this.logSync(
                'addStreamToSync: not in "syncing" state; let main sync loop handle this with its streams map',
                syncCookie.streamId,
            )
        }
    }

    // remove stream from the sync subsbscription
    public async removeStreamFromSync(streamId: string): Promise<void> {
        const stream = this.streams.get(streamId)
        if (!stream) {
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
                this.onError(err)
            }
        }
        stream.removeAllListeners()
        this.streams.delete(streamId)
        this.logSync('removed stream from sync', streamId)
    }

    private async runSyncLoop(): Promise<void> {
        if (this.syncState !== SyncState.NotSyncing) {
            this.logSync('ERROR: sync loop already running')
            return
        }
        // fresh sync
        this.onStarting()
        let iteration = 0

        try {
            syncLoop: while (continueIteration.has(this.syncState)) {
                this.logSync('sync ITERATION start', ++iteration)

                // get cookies from all streams to sync
                const syncCookies = Array.from(this.streams.values())
                    .map((stream) => stream.view.syncCookie)
                    .filter((syncCookie) => syncCookie) as SyncCookie[]

                try {
                    // syncId needs to be reset before starting a new syncStreams
                    // syncStreams() should return a new syncId
                    this.syncId = ''
                    const streams = this.rpcClient.syncStreams({
                        syncPos: syncCookies,
                    })

                    this.logSync('syncing streams')

                    // from here on, read sync commands and data from the streams iterator
                    for await (const res of streams) {
                        this.logSync(
                            'got syncStreams response',
                            'syncOp',
                            res.syncOp,
                            'syncId',
                            res.syncId,
                        )
                        if (!res.syncId || !res.syncOp) {
                            this.onError(new Error('missing syncId or syncOp'))
                            continue
                        }
                        switch (res.syncOp) {
                            case SyncOp.SYNC_CLOSE:
                                this.onCancel()
                                break syncLoop
                            case SyncOp.SYNC_NEW:
                                this.onNew(res.syncId)
                                break
                            case SyncOp.SYNC_UPDATE:
                                await this.onUpdate(res)
                                break
                            default:
                                this.onError(
                                    new Error(
                                        `unknown syncOp { syncId: ${this.syncId}, syncOp: ${res.syncOp} }`,
                                    ),
                                )
                                break
                        }
                    }
                    this.logSync('read loop ended')
                } catch (err) {
                    this.onError(err)
                    await this.onRetry()
                }
            }
        } catch (err) {
            this.logSync('ERROR: sync loop', err)
            this.emit('syncError', this.syncId, err)
        }
        this.logSync('sync loop stopped ITERATION', iteration)
        this.onStopped()
    }

    public get syncState(): SyncState {
        return this._syncState
    }

    private setSyncState(newState: SyncState) {
        if (this._syncState === newState) {
            // no state change
            return
        }
        if (!stateConstraints[this._syncState].has(newState)) {
            throw this.logInvalidStateAndReturnError(this._syncState, newState)
        }
        this.logSync('syncState', this._syncState, '->', newState)
        this._syncState = newState
    }

    private async onRetry(): Promise<void> {
        if (stateConstraints[this.syncState].has(SyncState.Retrying)) {
            if (this.retryPromise) {
                return this.retryPromise
            }
            this.setSyncState(SyncState.Retrying)
            // currentRetryCount will increment until MAX_RETRY_COUNT. Then it will stay
            // fixed at this value
            // 3 retries = 2^3 = 8 seconds
            // 5 retries = 2^5 = 32 seconds
            // 8 retries = 2^8 = 256 seconds (~4 min)
            const MAX_RETRY_COUNT = 2
            const nextRetryCount =
                this.currentRetryCount >= MAX_RETRY_COUNT
                    ? MAX_RETRY_COUNT
                    : this.currentRetryCount + 1
            const retryDelay = 2 ** nextRetryCount * 1000 // 2^n seconds
            this.logSync(
                'sync error, retrying in',
                retryDelay,
                'ms',
                ', { currentRetryCount:',
                this.currentRetryCount,
                ', nextRetryCount:',
                nextRetryCount,
                ', MAX_RETRY_COUNT:',
                MAX_RETRY_COUNT,
                '}',
            )
            this.currentRetryCount = nextRetryCount
            this.retryPromise = new Promise<void>((resolve) => {
                const timeout = setTimeout(() => {
                    this.retryPromise = undefined
                    resolve()
                }, retryDelay)
                this.abortRetry = () => {
                    clearTimeout(timeout)
                    this.retryPromise = undefined
                    resolve()
                }
            })
            this.emit('syncRetrying', retryDelay)
            return this.retryPromise
        }
    }

    private onStarting(): void {
        if (stateConstraints[this.syncState].has(SyncState.Starting)) {
            this.setSyncState(SyncState.Starting)
            this.logSync('starting sync loop')
            this.emit('syncStarting')
        } else {
            this.logSync(
                'onNew: invalid state transition',
                this.syncState,
                '->',
                SyncState.Starting,
            )
        }
    }

    private onNew(syncId: string): void {
        if (stateConstraints[this.syncState].has(SyncState.Syncing)) {
            this.setSyncState(SyncState.Syncing)
            this.syncId = syncId
            // On sucessful sync, reset retryCount
            this.currentRetryCount = 0
            this.logSync('onSyncing', 'syncId', this.syncId)
            this.emit('syncing', this.syncId)
        } else {
            this.logSync('onNew: invalid state transition', this.syncState, '->', SyncState.Syncing)
        }
    }

    private async onUpdate(res: SyncStreamsResponse): Promise<void> {
        if (stateConstraints[this.syncState].has(SyncState.Syncing)) {
            if (this.syncId != res.syncId) {
                throw new Error(
                    `syncId mismatch; has:'${this.syncId}', got:${res.syncId}'. Throw away update.`,
                )
            }
            const syncStream = res.stream
            if (syncStream !== undefined) {
                try {
                    const streamAndCookie = unpackStreamAndCookie(syncStream)
                    const streamId = streamAndCookie.nextSyncCookie?.streamId || ''
                    /*
                    this.logSync(
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
                    const stream = this.streams.get(streamId)
                    if (stream === undefined) {
                        this.logSync('sync got stream', streamId, 'NOT FOUND')
                        this.onError(new Error(`stream not found ${streamId}`))
                    } else {
                        const cleartexts = await this.persistenceStore.getCleartexts(
                            streamAndCookie.events.map((e) => e.hashStr),
                        )
                        stream.appendEvents(streamAndCookie, cleartexts)
                    }
                } catch (err) {
                    this.onError(err)
                }
            } else {
                this.logSync('sync RESULTS no stream', syncStream)
            }
        } else {
            this.logSync(
                'onUpdate: invalid state transition',
                this.syncState,
                '->',
                SyncState.Syncing,
            )
        }
    }

    private onCancel(): void {
        if (stateConstraints[this.syncState].has(SyncState.Canceling)) {
            this.setSyncState(SyncState.Canceling)
            // reset sync states
            this.abortRetry?.()
            this.abortRetry = undefined
            this.logSync('onCancel')
            this.emit('syncCanceling', this.syncId)
        } else {
            this.logSync(
                'onCancel: invalid state transition',
                this.syncState,
                '->',
                SyncState.Canceling,
            )
        }
    }

    private onStopped(): void {
        if (stateConstraints[this.syncState].has(SyncState.NotSyncing)) {
            this.setSyncState(SyncState.NotSyncing)
            // reset sync states
            this.abortRetry?.()
            this.abortRetry = undefined
            this.streams.forEach((stream) => {
                stream.removeAllListeners()
            })
            this.streams.clear()
            this.syncLoop = undefined
            this.syncId = ''
            this.logSync('onStop')
            this.emit('syncStopped')
        } else {
            this.logSync(
                'onStopped: invalid state transition',
                this.syncState,
                '->',
                SyncState.NotSyncing,
            )
        }
    }

    private onError(err: unknown): void {
        this.logSync('onError', err)
        this.emit('syncError', this.syncId, err)
    }

    private logInvalidStateAndReturnError(currentState: SyncState, newState: SyncState): Error {
        this.logSync(`invalid state transition ${currentState} -> ${newState}`)
        return new Error(`invalid state transition ${currentState} -> ${newState}`)
    }
}

function isConnectError(err: unknown): boolean {
    return (
        err !== null &&
        typeof err === 'object' &&
        'name' in err &&
        typeof err.name === 'string' &&
        err.name === 'ConnectError'
    )
}
