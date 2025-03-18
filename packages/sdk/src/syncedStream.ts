import TypedEmitter from 'typed-emitter'
import { SyncCookie } from '@towns-protocol/proto'
import { Stream } from './stream'
import { ParsedEvent } from './types'
import { DLogger, dlog } from '@towns-protocol/dlog'
import { eventIdsFromSnapshot, IPersistenceStore } from './persistenceStore'
import { StreamEvents } from './streamEvents'
import { LoadedStream2 } from './streamsService'

export class SyncedStream extends Stream {
    log: DLogger
    isUpToDate = false
    readonly persistenceStore: IPersistenceStore
    constructor(
        userId: string,
        streamId: string,
        clientEmitter: TypedEmitter<StreamEvents>,
        logEmitFromStream: DLogger,
        persistenceStore: IPersistenceStore,
    ) {
        super(userId, streamId, clientEmitter, logEmitFromStream)
        this.log = dlog('csb:syncedStream', { defaultEnabled: false }).extend(userId)
        this.persistenceStore = persistenceStore
    }

    async initializeFromPersistence(loadedStream: LoadedStream2): Promise<boolean> {
        const eventIds = [
            ...loadedStream.manifest.minipool.map((x) => x.hashStr),
            ...loadedStream.timelineEvents.map((x) => x.event.hashStr),
            ...eventIdsFromSnapshot(loadedStream.snapshot),
        ]
        const cleartexts = await this.persistenceStore.getCleartexts(eventIds)

        try {
            super.initialize(loadedStream, cleartexts)
        } catch (e) {
            this.log('Error initializing from persistence', this.streamId, e)
            return false
        }
        return true
    }

    // TODO: possibly a bug. Stream interface expects a non promise initialize.
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    async initialize(
        loadedStream: LoadedStream2,
        cleartexts: Record<string, Uint8Array | string> | undefined,
    ): Promise<void> {
        super.initialize(loadedStream, cleartexts)

        this.markUpToDate()
    }

    async initializeFromResponse(loadedStream: LoadedStream2) {
        this.log('initializing from response', this.streamId)
        const eventIds = [
            ...loadedStream.manifest.minipool.map((x) => x.hashStr),
            ...loadedStream.timelineEvents.map((x) => x.event.hashStr),
            ...eventIdsFromSnapshot(loadedStream.snapshot),
        ]
        const cleartexts = await this.persistenceStore.getCleartexts(eventIds)

        await this.initialize(loadedStream, cleartexts)
        this.markUpToDate()
    }

    async appendEvents(
        events: ParsedEvent[],
        nextSyncCookie: SyncCookie,
        cleartexts: Record<string, Uint8Array | string> | undefined,
    ): Promise<void> {
        await super.appendEvents(events, nextSyncCookie, cleartexts)
        this.markUpToDate()
    }

    private markUpToDate(): void {
        if (this.isUpToDate) {
            return
        }
        this.isUpToDate = true
        this.emit('streamUpToDate', this.streamId)
    }

    resetUpToDate(): void {
        this.isUpToDate = false
    }
}
