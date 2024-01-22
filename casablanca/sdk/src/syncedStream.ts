import TypedEmitter from 'typed-emitter'
import {
    PersistedSyncedStream,
    MiniblockHeader,
    Snapshot,
    SyncCookie,
    WrappedEncryptedData,
} from '@river/proto'
import { Stream } from './stream'
import { ParsedMiniblock, ParsedEvent, ParsedStreamResponse } from './types'
import { EmittedEvents } from './client'
import { DLogger, bin_toHexString, dlog, isDefined } from '@river/mecholm'
import { PersistenceStore } from './persistenceStore'

export class SyncedStream extends Stream {
    log: DLogger
    readonly persistenceStore: PersistenceStore
    constructor(
        userId: string,
        streamId: string,
        clientEmitter: TypedEmitter<EmittedEvents>,
        logEmitFromStream: DLogger,
        persistenceStore: PersistenceStore,
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

        const snapshotEventIds = eventIdsFromSnapshot(snapshot)
        const eventIds = miniblocks.flatMap((mb) => mb.events.map((e) => e.hashStr))
        const cleartexts = await this.persistenceStore.getCleartexts([
            ...eventIds,
            ...snapshotEventIds,
        ])

        this.log('Initializing from persistence', this.streamId)
        super.initialize(
            cachedSyncedStream.syncCookie,
            cachedSyncedStream.minipoolEvents,
            snapshot,
            miniblocks,
            miniblocks[0].header.prevSnapshotMiniblockNum,
            cleartexts,
        )
        return true
    }

    async initialize(
        nextSyncCookie: SyncCookie,
        events: ParsedEvent[],
        snapshot: Snapshot,
        miniblocks: ParsedMiniblock[],
        prevSnapshotMiniblockNum: bigint,
        cleartexts: Record<string, string> | undefined,
    ): Promise<void> {
        super.initialize(
            nextSyncCookie,
            events,
            snapshot,
            miniblocks,
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
        for (const mb of miniblocks) {
            await this.persistenceStore.saveMiniblock(this.streamId, mb)
        }
    }

    async initializeFromResponse(response: ParsedStreamResponse) {
        this.log('initializing from response', this.streamId)
        const cleartexts = await this.persistenceStore.getCleartexts(response.eventIds)
        await this.initialize(
            response.streamAndCookie.nextSyncCookie,
            response.streamAndCookie.events,
            response.snapshot,
            response.streamAndCookie.miniblocks,
            response.prevSnapshotMiniblockNum,
            cleartexts,
        )
    }

    async appendEvents(
        events: ParsedEvent[],
        nextSyncCookie: SyncCookie,
        cleartexts: Record<string, string> | undefined,
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
    }

    async saveMiniblocks(miniblocks: ParsedMiniblock[]) {
        for (const miniblock of miniblocks) {
            await this.persistenceStore.saveMiniblock(this.streamId, miniblock)
        }
    }

    async onMiniblockHeader(
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
            .filter((e) => !e.confirmedEventNum)
            .map((e) => e.remoteEvent)
            .filter(isDefined)

        const cachedSyncedStream = new PersistedSyncedStream({
            syncCookie: syncCookie,
            lastSnapshotMiniblockNum: miniblock.header.prevSnapshotMiniblockNum,
            minipoolEvents: minipoolEvents,
            lastMiniblockNum: miniblock.header.miniblockNum,
        })
        await this.persistenceStore.saveSyncedStream(this.streamId, cachedSyncedStream)
    }
}

function eventIdsFromSnapshot(snapshot: Snapshot): string[] {
    switch (snapshot.content.case) {
        case 'gdmChannelContent': {
            const channelPropertiesEventIds = snapshot.content.value.channelProperties
                ? [bin_toHexString(snapshot.content.value.channelProperties.eventHash)]
                : []
            const usernameEventIds = eventIdsFromWrappedEncryptedData(
                snapshot.content.value.usernames,
            )
            const displayNameEventIds = eventIdsFromWrappedEncryptedData(
                snapshot.content.value.displayNames,
            )
            return [...usernameEventIds, ...displayNameEventIds, ...channelPropertiesEventIds]
        }
        case 'dmChannelContent':
        case 'spaceContent': {
            const usernameEventIds = eventIdsFromWrappedEncryptedData(
                snapshot.content.value.usernames,
            )
            const displayNameEventIds = eventIdsFromWrappedEncryptedData(
                snapshot.content.value.displayNames,
            )
            return [...usernameEventIds, ...displayNameEventIds]
        }
        default:
            return []
    }
}

function eventIdsFromWrappedEncryptedData(content: {
    [key: string]: WrappedEncryptedData
}): string[] {
    return Object.values(content).map((e) => bin_toHexString(e.eventHash))
}
