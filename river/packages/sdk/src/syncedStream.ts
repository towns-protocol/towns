import TypedEmitter from 'typed-emitter'
import { PersistedSyncedStream, MiniblockHeader, Snapshot, SyncCookie } from '@river-build/proto'
import { Stream } from './stream'
import { ParsedMiniblock, ParsedEvent, ParsedStreamResponse } from './types'
import { DLogger, bin_toHexString, dlog } from '@river-build/dlog'
import { isDefined } from './check'
import { IPersistenceStore } from './persistenceStore'
import { StreamEvents } from './streamEvents'
import { isChannelStreamId, isDMChannelStreamId, isGDMChannelStreamId } from './id'
import { ISyncedStream } from './syncedStreamsLoop'

const MAX_CACHED_SCROLLBACK_COUNT = 3
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
        this.log = dlog('csb:syncedStream').extend(userId)
        this.persistenceStore = persistenceStore
    }

    async initializeFromPersistence(): Promise<boolean> {
        const cachedSyncedStream = await this.persistenceStore.getSyncedStream(this.streamId)
        if (!cachedSyncedStream) {
            return false
        }
        const miniblocks = await this.persistenceStore.getMiniblocks(
            this.streamId,
            cachedSyncedStream.lastSnapshotMiniblockNum,
            cachedSyncedStream.lastMiniblockNum,
        )

        if (miniblocks.length === 0) {
            return false
        }

        const snapshot = miniblocks[0].header.snapshot
        if (!snapshot) {
            return false
        }

        const isChannelStream =
            isChannelStreamId(this.streamId) ||
            isDMChannelStreamId(this.streamId) ||
            isGDMChannelStreamId(this.streamId)
        const prependedMiniblocks = isChannelStream
            ? hasTopLevelRenderableEvent(miniblocks)
                ? []
                : await this.cachedScrollback(
                      miniblocks[0].header.prevSnapshotMiniblockNum,
                      miniblocks[0].header.miniblockNum,
                  )
            : []

        const snapshotEventIds = eventIdsFromSnapshot(snapshot)
        const eventIds = miniblocks.flatMap((mb) => mb.events.map((e) => e.hashStr))
        const prependedEventIds = prependedMiniblocks.flatMap((mb) =>
            mb.events.map((e) => e.hashStr),
        )

        const cleartexts = await this.persistenceStore.getCleartexts([
            ...eventIds,
            ...snapshotEventIds,
            ...prependedEventIds,
        ])

        this.log('Initializing from persistence', this.streamId)
        try {
            super.initialize(
                cachedSyncedStream.syncCookie,
                cachedSyncedStream.minipoolEvents,
                snapshot,
                miniblocks,
                prependedMiniblocks,
                miniblocks[0].header.prevSnapshotMiniblockNum,
                cleartexts,
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

    private async cachedScrollback(
        fromInclusive: bigint,
        toExclusive: bigint,
    ): Promise<ParsedMiniblock[]> {
        // If this is a channel, DM or GDM, perform a few scrollbacks
        if (
            !isChannelStreamId(this.streamId) &&
            !isDMChannelStreamId(this.streamId) &&
            !isGDMChannelStreamId(this.streamId)
        ) {
            return []
        }
        let miniblocks: ParsedMiniblock[] = []
        for (let i = 0; i < MAX_CACHED_SCROLLBACK_COUNT; i++) {
            if (toExclusive <= 0n) {
                break
            }
            const result = await this.persistenceStore.getMiniblocks(
                this.streamId,
                fromInclusive,
                toExclusive - 1n,
            )
            if (result.length > 0) {
                miniblocks = [...result, ...miniblocks]
                fromInclusive = result[0].header.prevSnapshotMiniblockNum
                toExclusive = result[0].header.miniblockNum
                if (hasTopLevelRenderableEvent(miniblocks)) {
                    break
                }
            } else {
                break
            }
        }
        return miniblocks
    }

    private markUpToDate(): void {
        if (this.isUpToDate) {
            return
        }
        this.isUpToDate = true
        this.emit('streamUpToDate', this.streamId)
    }
}

function eventIdsFromSnapshot(snapshot: Snapshot): string[] {
    const usernameEventIds =
        snapshot.members?.joined
            .filter((m) => isDefined(m.username))
            .map((m) => bin_toHexString(m.username!.eventHash)) ?? []
    const displayNameEventIds =
        snapshot.members?.joined
            .filter((m) => isDefined(m.displayName))
            .map((m) => bin_toHexString(m.displayName!.eventHash)) ?? []

    switch (snapshot.content.case) {
        case 'gdmChannelContent': {
            const channelPropertiesEventIds = snapshot.content.value.channelProperties
                ? [bin_toHexString(snapshot.content.value.channelProperties.eventHash)]
                : []

            return [...usernameEventIds, ...displayNameEventIds, ...channelPropertiesEventIds]
        }
        default:
            return [...usernameEventIds, ...displayNameEventIds]
    }
}

function hasTopLevelRenderableEvent(miniblocks: ParsedMiniblock[]): boolean {
    for (const mb of miniblocks) {
        if (topLevelRenderableEventInMiniblock(mb)) {
            return true
        }
    }
    return false
}

function topLevelRenderableEventInMiniblock(miniblock: ParsedMiniblock): boolean {
    for (const e of miniblock.events) {
        switch (e.event.payload.case) {
            case 'channelPayload':
            case 'gdmChannelPayload':
            case 'dmChannelPayload':
                switch (e.event.payload.value.content.case) {
                    case 'message':
                        if (!e.event.payload.value.content.value.refEventId) {
                            return true
                        }
                }
        }
    }
    return false
}
