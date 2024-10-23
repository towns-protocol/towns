import { SyncCookie } from '@river-build/proto'
import { DLogger, dlog, dlogError, shortenHexString } from '@river-build/dlog'
import { StreamRpcClient } from './makeStreamRpcClient'
import { SyncedStreamEvents } from './streamEvents'
import TypedEmitter from 'typed-emitter'
import { isDefined } from './check'
import { streamIdAsString } from './id'
import { PingInfo, SyncState, SyncedStreamsLoop } from './syncedStreamsLoop'
import { SyncedStream } from './syncedStream'
import { UnpackEnvelopeOpts } from './sign'

export class SyncedStreams {
    private syncedStreamsLoop: SyncedStreamsLoop | undefined
    // userId is the current user id
    private readonly userId: string
    private readonly logNamespace: string
    // mapping of stream id to stream
    private readonly streams: Map<string, SyncedStream> = new Map()
    // loggers
    private readonly logSync: DLogger
    private readonly logError: DLogger
    // clientEmitter is used to proxy the events from the streams to the client
    private readonly clientEmitter: TypedEmitter<SyncedStreamEvents>
    // rpcClient is used to receive sync updates from the server
    private rpcClient: StreamRpcClient

    constructor(
        userId: string,
        rpcClient: StreamRpcClient,
        clientEmitter: TypedEmitter<SyncedStreamEvents>,
        private readonly unpackEnvelopeOpts: UnpackEnvelopeOpts | undefined,
    ) {
        this.userId = userId
        this.rpcClient = rpcClient
        this.clientEmitter = clientEmitter
        this.logNamespace = shortenHexString(
            this.userId.startsWith('0x') ? this.userId.slice(2) : this.userId,
        )
        this.logSync = dlog('csb:cl:sync').extend(this.logNamespace)
        this.logError = dlogError('csb:cl:sync:stream').extend(this.logNamespace)
    }

    public get syncState(): SyncState {
        return this.syncedStreamsLoop?.syncState ?? SyncState.NotSyncing
    }

    public get pingInfo(): PingInfo | undefined {
        return this.syncedStreamsLoop?.pingInfo
    }

    public stats() {
        return this.syncedStreamsLoop?.stats()
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

    public getSyncId(): string | undefined {
        return this.syncedStreamsLoop?.getSyncId()
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
            this.syncedStreamsLoop?.releaseRetryWait?.()
        }
    }

    public async startSyncStreams() {
        const streamRecords = Array.from(this.streams.values())
            .filter((x) => isDefined(x.syncCookie))
            .map((stream) => ({ syncCookie: stream.syncCookie!, stream }))

        this.syncedStreamsLoop = new SyncedStreamsLoop(
            this.clientEmitter,
            this.rpcClient,
            streamRecords,
            this.logNamespace,
            this.unpackEnvelopeOpts,
        )
        await this.syncedStreamsLoop.start()
    }

    public async stopSync() {
        await this.syncedStreamsLoop?.stop()
        this.syncedStreamsLoop = undefined
    }

    // adds stream to the sync subscription
    public async addStreamToSync(syncCookie: SyncCookie): Promise<void> {
        const streamId = streamIdAsString(syncCookie.streamId)
        this.log('addStreamToSync', streamId)
        const stream = this.streams.get(streamId)
        if (!stream) {
            // perhaps we called stopSync while loading a stream from persistence
            this.logError('streamId not in this.streams, not adding to sync', streamId)
            return
        }
        await this.syncedStreamsLoop?.addStreamToSync(syncCookie, stream)
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
        await this.syncedStreamsLoop?.removeStreamFromSync(streamId)
        this.streams.delete(streamId)
    }

    private log(...args: unknown[]): void {
        this.logSync(...args)
    }
}
