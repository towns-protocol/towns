import { LoadedStream } from '../persistenceStore'
import { Stream } from '../stream'
import { ClientInitStatus } from '../types'

export interface ISyncedStreamsController {
    initStatus: ClientInitStatus
    start: () => void
    stop: () => Promise<void>
    setStreamIds: (streamIds: string[]) => void
    setHighPriorityStreams: (streamIds: string[]) => void
    setStartSyncRequested: (startSyncRequested: boolean) => void
}

export interface SyncedStreamsControllerDelegate {
    startSyncStreams: (lastAccessedAt: Record<string, number>) => Promise<void>
    initStream(
        streamId: string,
        allowGetStream: boolean,
        persistedData?: LoadedStream,
    ): Promise<Stream>
    emitClientInitStatus: (status: ClientInitStatus) => void
}
