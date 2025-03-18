import { DLogger, check, dlog, dlogError } from '@towns-protocol/dlog'
import { streamIdAsString } from './id'
import { SyncedStream } from './syncedStream'

export class SyncedStreams {
    // mapping of stream id to stream
    readonly streams: Map<string, SyncedStream> = new Map()
    // loggers
    private readonly log: DLogger
    private readonly logError: DLogger

    constructor(private readonly userId: string, private readonly logId: string) {
        this.log = dlog('csb:cl:sync').extend(this.logId)
        this.logError = dlogError('csb:cl:sync:error').extend(this.logId)
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

    public delete(inStreamId: string | Uint8Array): void {
        const streamId = streamIdAsString(inStreamId)
        this.streams.get(streamId)?.stop()
        this.streams.delete(streamId)
    }

    public clear(): void {
        this.streams.clear()
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
}
