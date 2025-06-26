import TypedEmitter from 'typed-emitter'
import {
    MiniblockHeader,
    Snapshot,
    SyncCookie,
    PersistedSyncedStreamSchema,
} from '@towns-protocol/proto'
import { Stream } from './stream'
import { ParsedMiniblock, ParsedEvent, ParsedStreamResponse, ParsedSnapshot } from './types'
import { DLogger, bin_equal, bin_toHexString, dlog } from '@towns-protocol/dlog'
import { isDefined } from './check'
import { IPersistenceStore, LoadedStream } from './persistenceStore'
import { StreamEvents } from './streamEvents'
import { ISyncedStream } from './syncedStreamsLoop'
import { create } from '@bufbuild/protobuf'
import { StreamsView } from './views/streamsView'

export class SyncedStream extends Stream implements ISyncedStream {
    log: DLogger
    get isUpToDate(): boolean {
        return this.streamsView.streamStatus.get(this.streamId).isUpToDate
    }
    private set isUpToDate(value: boolean) {
        this.streamsView.streamStatus.setIsUpToDate(this.streamId, value)
    }
    readonly persistenceStore: IPersistenceStore
    constructor(
        userId: string,
        streamId: string,
        streamsView: StreamsView,
        clientEmitter: TypedEmitter<StreamEvents>,
        logEmitFromStream: DLogger,
        persistenceStore: IPersistenceStore,
    ) {
        super(userId, streamId, streamsView, clientEmitter, logEmitFromStream)
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

    // TODO: possibly a bug. Stream interface expects a non promise initialize.
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
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

        const cachedSyncedStream = create(PersistedSyncedStreamSchema, {
            syncCookie: nextSyncCookie,
            lastSnapshotMiniblockNum: miniblocks[0].header.miniblockNum,
            minipoolEvents: events,
            lastMiniblockNum: miniblocks[miniblocks.length - 1].header.miniblockNum,
        })
        await this.persistenceStore.saveSyncedStream(this.streamId, cachedSyncedStream)
        await this.persistenceStore.saveMiniblocks(this.streamId, miniblocks, 'forward')
        await this.persistenceStore.saveSnapshot(
            this.streamId,
            miniblocks[0].header.miniblockNum,
            snapshot,
        )
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
        snapshot: ParsedSnapshot | undefined,
        cleartexts: Record<string, Uint8Array | string> | undefined,
    ): Promise<void> {
        const minipoolEvents = new Map<string, ParsedEvent>(
            Array.from(this.view.minipoolEvents.entries())
                .filter(([_, event]) => isDefined(event.remoteEvent))
                .map(([hash, event]) => [hash, event.remoteEvent!]),
        )
        await super.appendEvents(events, nextSyncCookie, snapshot, cleartexts)
        for (const event of events) {
            const payload = event.event.payload
            switch (payload.case) {
                case 'miniblockHeader': {
                    await this.onMiniblockHeader(
                        payload.value,
                        event,
                        event.hash,
                        snapshot,
                        minipoolEvents,
                    )
                    break
                }
                default:
                    minipoolEvents.set(event.hashStr, event)
                    break
            }
        }
        this.markUpToDate()
    }

    private async onMiniblockHeader(
        miniblockHeader: MiniblockHeader,
        miniblockEvent: ParsedEvent,
        hash: Uint8Array,
        snapshot: ParsedSnapshot | undefined,
        viewMinipoolEvents: Map<string, ParsedEvent>,
    ) {
        this.log(
            'Received miniblock header',
            miniblockHeader.miniblockNum.toString(),
            this.streamId,
        )

        const eventHashes = miniblockHeader.eventHashes.map(bin_toHexString)
        const events = eventHashes.map((hash) => viewMinipoolEvents.get(hash)).filter(isDefined)

        if (events.length !== eventHashes.length) {
            throw new Error(
                `Couldn't find event for hash in miniblock ${miniblockHeader.miniblockNum.toString()} ${eventHashes.join(
                    ', ',
                )} ${Array.from(viewMinipoolEvents.keys()).join(', ')}`,
            )
        }

        const miniblock: ParsedMiniblock = {
            hash: hash,
            header: miniblockHeader,
            events: [...events, miniblockEvent],
        }
        if (snapshot && bin_equal(snapshot.hash, miniblockHeader.snapshotHash)) {
            await this.persistenceStore.saveSnapshot(
                this.streamId,
                miniblock.header.miniblockNum,
                snapshot.snapshot,
            )
        } else if (miniblockHeader.snapshot !== undefined) {
            await this.persistenceStore.saveSnapshot(
                this.streamId,
                miniblockHeader.miniblockNum,
                miniblockHeader.snapshot,
            )
        }
        await this.persistenceStore.saveMiniblock(this.streamId, miniblock)

        const syncCookie = this.view.syncCookie
        if (!syncCookie) {
            return
        }

        const minipoolEvents = Array.from(this.view.minipoolEvents.values())

        const lastSnapshotMiniblockNum =
            miniblock.header.snapshot !== undefined || miniblock.header.snapshotHash !== undefined
                ? miniblock.header.miniblockNum
                : miniblock.header.prevSnapshotMiniblockNum

        const cachedSyncedStream = create(PersistedSyncedStreamSchema, {
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
