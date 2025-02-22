import TypedEmitter from 'typed-emitter'
import { PersistedSyncedStream, MiniblockHeader, Snapshot, SyncCookie } from '@river-build/proto'
import { Stream } from './stream'
import { ParsedMiniblock, ParsedEvent, ParsedStreamResponse } from './types'
import { DLogger, bin_toHexString, dlog } from '@river-build/dlog'
import { isDefined } from './check'
import { IPersistenceStore, LoadedStream } from './persistenceStore'
import { StreamEvents } from './streamEvents'
import { ISyncedStream } from './syncedStreamsLoop'

export class SyncedStream extends Stream implements ISyncedStream {
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

    async initializeFromPersistence(persistedData?: LoadedStream): Promise<boolean> {
        const loadedStream =
            persistedData ?? (await this.persistenceStore.loadStream(this.streamId))
        if (!loadedStream) {
            this.log('No persisted data found for stream', this.streamId, persistedData)
            return false
        }
        try {
            super.initialize(
                loadedStream.persistedSyncedStream.syncCookie,
                loadedStream.persistedSyncedStream.minipoolEvents,
                loadedStream.snapshot,
                loadedStream.miniblocks,
                loadedStream.prependedMiniblocks,
                loadedStream.miniblocks[0].header.prevSnapshotMiniblockNum,
                loadedStream.cleartexts,
            )
        } catch (e) {
            this.log('Error initializing from persistence', this.streamId, e)
            return false
        }
        return true
    }

    async initialize(
        nextSyncCookie: SyncCookie,
        events: ParsedEvent[],
        snapshot: Snapshot,
        miniblocks: ParsedMiniblock[],
        prependedMiniblocks: ParsedMiniblock[],
        prevSnapshotMiniblockNum: bigint,
        cleartexts: Record<string, Uint8Array | string> | undefined,
    ): Promise<void> {
        super.initialize(
            nextSyncCookie,
            events,
            snapshot,
            miniblocks,
            prependedMiniblocks,
            prevSnapshotMiniblockNum,
            cleartexts,
        )

        const cachedSyncedStream = new PersistedSyncedStream({
            syncCookie: nextSyncCookie,
            lastSnapshotMiniblockNum: miniblocks[0].header.miniblockNum,
            minipoolEvents: events,
            lastMiniblockNum: miniblocks[miniblocks.length - 1].header.miniblockNum,
        })
        await this.persistenceStore.saveSyncedStream(this.streamId, cachedSyncedStream)
        await this.persistenceStore.saveMiniblocks(this.streamId, miniblocks, 'forward')
        this.markUpToDate()
    }

    async initializeFromResponse(response: ParsedStreamResponse) {
        this.log('initializing from response', this.streamId)
        const cleartexts = await this.persistenceStore.getCleartexts(response.eventIds)
        await this.initialize(
            response.streamAndCookie.nextSyncCookie,
            response.streamAndCookie.events,
            response.snapshot,
            response.streamAndCookie.miniblocks,
            [],
            response.prevSnapshotMiniblockNum,
            cleartexts,
        )
        this.markUpToDate()
    }

    async appendEvents(
        events: ParsedEvent[],
        nextSyncCookie: SyncCookie,
        cleartexts: Record<string, Uint8Array | string> | undefined,
    ): Promise<void> {
        await super.appendEvents(events, nextSyncCookie, cleartexts)
        for (const event of events) {
            const payload = event.event.payload
            switch (payload.case) {
                case 'miniblockHeader': {
                    await this.onMiniblockHeader(payload.value, event, event.hash)
                    break
                }
                default:
                    break
            }
        }
        this.markUpToDate()
    }

    private async onMiniblockHeader(
        miniblockHeader: MiniblockHeader,
        miniblockEvent: ParsedEvent,
        hash: Uint8Array,
    ) {
        this.log(
            'Received miniblock header',
            miniblockHeader.miniblockNum.toString(),
            this.streamId,
        )

        const eventHashes = miniblockHeader.eventHashes.map(bin_toHexString)
        const events = eventHashes
            .map((hash) => this.view.events.get(hash)?.remoteEvent)
            .filter(isDefined)

        if (events.length !== eventHashes.length) {
            throw new Error("Couldn't find event for hash in miniblock")
        }

        const miniblock: ParsedMiniblock = {
            hash: hash,
            header: miniblockHeader,
            events: [...events, miniblockEvent],
        }
        await this.persistenceStore.saveMiniblock(this.streamId, miniblock)

        const syncCookie = this.view.syncCookie
        if (!syncCookie) {
            return
        }

        const minipoolEvents = this.view.timeline
            .filter((e) => e.confirmedEventNum === undefined)
            .map((e) => e.remoteEvent)
            .filter(isDefined)

        const lastSnapshotMiniblockNum =
            miniblock.header.snapshot !== undefined
                ? miniblock.header.miniblockNum
                : miniblock.header.prevSnapshotMiniblockNum

        const cachedSyncedStream = new PersistedSyncedStream({
            syncCookie: syncCookie,
            lastSnapshotMiniblockNum: lastSnapshotMiniblockNum,
            minipoolEvents: minipoolEvents,
            lastMiniblockNum: miniblock.header.miniblockNum,
        })
        await this.persistenceStore.saveSyncedStream(this.streamId, cachedSyncedStream)
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
