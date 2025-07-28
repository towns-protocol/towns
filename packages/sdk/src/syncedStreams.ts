import { SyncCookie } from '@towns-protocol/proto'
import { DLogger, check, dlog, dlogError } from '@towns-protocol/dlog'
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
    private highPriorityIds: Set<string> = new Set()
    // userId is the current user id
    private readonly userId: string
    // mapping of stream id to stream
    private readonly streams: Map<string, SyncedStream> = new Map()
    // loggers
    private readonly log: DLogger
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
        private readonly logId: string,
        private readonly streamOpts?: { useSharedSyncer?: boolean } | undefined,
        highPriorityStreamIds?: string[],
    ) {
        this.userId = userId
        this.rpcClient = rpcClient
        this.clientEmitter = clientEmitter
        this.log = dlog('csb:cl:sync').extend(this.logId)
        this.logError = dlogError('csb:cl:sync:stream').extend(this.logId)
        this.highPriorityIds = new Set(highPriorityStreamIds ?? [])
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
        const id = streamIdAsString(streamId)
        check(id.length > 0, 'streamId cannot be empty')
        this.streams.set(id, stream)
    }

    public setHighPriorityStreams(streamIds: string[]) {
        this.highPriorityIds = new Set(streamIds)
        this.syncedStreamsLoop?.setHighPriorityStreams(streamIds)
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
        this.syncedStreamsLoop?.onNetworkStatusChanged(isOnline)
    }

    public startSyncStreams(lastAccessedAt: Record<string, number>) {
        const streamRecords = Array.from(this.streams.values())
            .filter((x) => isDefined(x.syncCookie))
            .map((stream) => ({ syncCookie: stream.syncCookie!, stream }))

        this.syncedStreamsLoop = new SyncedStreamsLoop(
            this.clientEmitter,
            this.rpcClient,
            streamRecords,
            this.logId,
            this.unpackEnvelopeOpts,
            this.highPriorityIds,
            this.streamOpts,
            lastAccessedAt,
        )
        this.syncedStreamsLoop.start()
    }

    public async stopSync() {
        await this.syncedStreamsLoop?.stop()
        this.syncedStreamsLoop = undefined
    }

    // adds stream to the sync subscription
    public addStreamToSync(streamId: string, syncCookie: SyncCookie): void {
        if (!this.syncedStreamsLoop) {
            return
        }
        this.log('addStreamToSync', streamId)
        const stream = this.streams.get(streamId)
        if (!stream) {
            // perhaps we called stopSync while loading a stream from persistence
            this.logError('streamId not in this.streams, not adding to sync', streamId)
            return
        }
        this.syncedStreamsLoop.addStreamToSync(streamId, syncCookie, stream)
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
}
