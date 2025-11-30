/**
 * PersistenceStore implementation that uses a StorageAdapter.
 * This allows users to bring their own database (Drizzle, etc.) for persistence storage.
 */

import type { StorageAdapter } from '@towns-protocol/storage'
import { typedAdapter, type TypedStorageAdapter } from '@towns-protocol/storage'
import type { IPersistenceStore, LoadedStream } from '../persistenceStore.js'
import type { ParsedMiniblock } from '../types.js'
import type { PersistedSyncedStream, Snapshot } from '@towns-protocol/proto'
import {
    PersistedSyncedStreamSchema,
    PersistedMiniblockSchema,
    SnapshotSchema,
} from '@towns-protocol/proto'
import { fromBinary, toBinary } from '@bufbuild/protobuf'
import {
    persistedSyncedStreamToParsedSyncedStream,
    persistedMiniblockToParsedMiniblock,
    parsedMiniblockToPersistedMiniblock,
    ParsedPersistedSyncedStream,
} from '../streamUtils.js'
import { isDefined } from '../check.js'
import { isChannelStreamId, isDMChannelStreamId, isGDMChannelStreamId } from '../id.js'
import { dlog, dlogError } from '@towns-protocol/utils'
import { eventIdsFromSnapshot } from '../persistenceStore.js'
import { persistenceSchema } from './persistenceSchema.js'

const MAX_CACHED_SCROLLBACK_COUNT = 3
const DEFAULT_RETRY_COUNT = 3
const SCRATCH_ID = '0'

const log = {
    debug: dlog('csb:persistence:adapter', { defaultEnabled: false }),
    info: dlog('csb:persistence:adapter:info', { defaultEnabled: true }),
    warn: dlog('csb:persistence:adapter:warn', { defaultEnabled: true }),
    error: dlogError('csb:persistence:adapter:error'),
}

type ScratchData = {
    lastAccessedAt: { [streamId: string]: number }
}

async function fnReadRetryer<T>(
    fn: () => Promise<T | undefined>,
    retries: number,
): Promise<T | undefined> {
    let lastErr: unknown
    let retryCounter = retries
    while (retryCounter > 0) {
        try {
            if (retryCounter < retries) {
                log.warn('retrying...', `${retryCounter}/${retries} retries left`)
                await new Promise((resolve) => setTimeout(resolve, 100))
            }
            retryCounter -= 1
            return await fn()
        } catch (err) {
            lastErr = err
            const e = err as any
            switch ((e as Error).name) {
                case 'AbortError':
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                    if (e.inner) {
                        log.info(
                            'AbortError reason:',
                            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                            e.inner,
                            `${retryCounter}/${retries} retries left`,
                        )
                    } else {
                        log.info(
                            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                            'AbortError message:' + e.message,
                            `${retryCounter}/${retries} retries left`,
                        )
                    }
                    break
                default:
                    log.error('Unhandled error:', err)
                    throw lastErr
            }
        }
    }
    throw lastErr
}

/**
 * PersistenceStore implementation that uses a StorageAdapter.
 * Allows using any database backend (Drizzle, PostgreSQL, etc.) for persistence storage.
 */
export class PersistenceStoreAdapter implements IPersistenceStore {
    private readonly adapter: TypedStorageAdapter<typeof persistenceSchema>
    private scratchQueue: ((scratchData: ScratchData) => void)[] = []
    private scratchTimerId: ReturnType<typeof setTimeout> | undefined

    constructor(adapter: StorageAdapter) {
        this.adapter = typedAdapter(adapter, persistenceSchema)
    }

    setHighPriorityStreams(streamIds: string[]): void {
        this.scratchQueue.push((scratchData: ScratchData) => {
            streamIds.forEach((streamId) => {
                scratchData.lastAccessedAt[streamId] = Date.now()
            })
        })
        clearTimeout(this.scratchTimerId)
        this.scratchTimerId = setTimeout(() => {
            this.processScratchQueue().catch((e) => {
                log.error('Error processing scratch queue', e)
            })
        }, 1000)
    }

    private async processScratchQueue(): Promise<void> {
        const scratchRecord = await this.adapter.findOne({
            model: 'scratch',
            where: [{ field: 'id', value: SCRATCH_ID }],
        })

        // scratch.data is already parsed as JSON (Record<string, unknown>)
        const scratchData: ScratchData = scratchRecord
            ? (scratchRecord.data as ScratchData)
            : { lastAccessedAt: {} }

        this.scratchQueue.forEach((fn) => fn(scratchData))
        this.scratchQueue = []

        await this.adapter.upsert({
            model: 'scratch',
            where: [{ field: 'id', value: SCRATCH_ID }],
            create: { id: SCRATCH_ID, data: scratchData as Record<string, unknown> },
            update: { data: scratchData as Record<string, unknown> },
        })
    }

    async saveCleartext(eventId: string, cleartext: Uint8Array | string): Promise<void> {
        // Schema defines bytes (Uint8Array), but interface accepts string too for backwards compatibility
        const data = cleartext as unknown as Uint8Array
        await this.adapter.upsert({
            model: 'cleartexts',
            where: [{ field: 'eventId', value: eventId }],
            create: { eventId, cleartext: data },
            update: { cleartext: data },
        })
    }

    async getCleartext(eventId: string): Promise<Uint8Array | undefined> {
        const record = await this.adapter.findOne({
            model: 'cleartexts',
            where: [{ field: 'eventId', value: eventId }],
        })
        return record?.cleartext
    }

    async getCleartexts(
        eventIds: string[],
    ): Promise<Record<string, Uint8Array | string> | undefined> {
        return fnReadRetryer(async () => {
            if (eventIds.length === 0) {
                return undefined
            }

            const records = await this.adapter.findMany({
                model: 'cleartexts',
                where: [{ field: 'eventId', operator: 'in', value: eventIds }],
            })

            if (records.length === 0) {
                return undefined
            }

            const result: Record<string, Uint8Array | string> = {}
            for (const record of records) {
                result[record.eventId] = record.cleartext
            }
            return result
        }, DEFAULT_RETRY_COUNT)
    }

    async getSyncedStream(streamId: string): Promise<ParsedPersistedSyncedStream | undefined> {
        const record = await this.adapter.findOne({
            model: 'syncedStreams',
            where: [{ field: 'streamId', value: streamId }],
        })
        if (!record) {
            return undefined
        }
        const cachedSyncedStream = fromBinary(PersistedSyncedStreamSchema, record.data)
        return persistedSyncedStreamToParsedSyncedStream(streamId, cachedSyncedStream)
    }

    async saveSyncedStream(streamId: string, syncedStream: PersistedSyncedStream): Promise<void> {
        log.debug('saving synced stream', streamId)
        const data = toBinary(PersistedSyncedStreamSchema, syncedStream)

        await this.adapter.upsert({
            model: 'syncedStreams',
            where: [{ field: 'streamId', value: streamId }],
            create: { streamId, data },
            update: { data },
        })
    }

    async loadStream(
        streamId: string,
        inPersistedSyncedStream?: ParsedPersistedSyncedStream,
    ): Promise<LoadedStream | undefined> {
        const persistedSyncedStream =
            inPersistedSyncedStream ?? (await this.getSyncedStream(streamId))
        if (!persistedSyncedStream) {
            return undefined
        }

        if (
            persistedSyncedStream.lastMiniblockNum !==
            persistedSyncedStream.syncCookie.minipoolGen - 1n
        ) {
            log.error(
                'Persisted miniblock num mismatch',
                streamId,
                persistedSyncedStream.lastMiniblockNum,
                persistedSyncedStream.syncCookie.minipoolGen - 1n,
            )
            return undefined
        }

        const miniblocks = await this.getMiniblocks(
            streamId,
            persistedSyncedStream.lastSnapshotMiniblockNum,
            persistedSyncedStream.lastMiniblockNum,
        )
        if (miniblocks.length === 0) {
            return undefined
        }

        const snapshot = await this.getSnapshot(streamId)
        if (!snapshot) {
            log.error(
                'Persisted Snapshot undefined',
                streamId,
                persistedSyncedStream.lastSnapshotMiniblockNum,
            )
            return undefined
        }

        if (snapshot.miniblockNum !== persistedSyncedStream.lastSnapshotMiniblockNum) {
            log.error(
                'Persisted Snapshot miniblock num mismatch',
                streamId,
                snapshot.miniblockNum,
                persistedSyncedStream.lastSnapshotMiniblockNum,
            )
            return undefined
        }

        const isChannelStream =
            isChannelStreamId(streamId) ||
            isDMChannelStreamId(streamId) ||
            isGDMChannelStreamId(streamId)
        const prependedMiniblocks = isChannelStream
            ? this.hasTopLevelRenderableEvent(miniblocks)
                ? []
                : await this.cachedScrollback(
                      streamId,
                      miniblocks[0].header.prevSnapshotMiniblockNum,
                      miniblocks[0].header.miniblockNum,
                  )
            : []

        const minipoolEventIds = persistedSyncedStream.minipoolEvents.map((e) => e.hashStr)
        const snapshotEventIds = eventIdsFromSnapshot(snapshot.snapshot)
        const eventIds = miniblocks.flatMap((mb) => mb.events.map((e) => e.hashStr))
        const prependedEventIds = prependedMiniblocks.flatMap((mb) =>
            mb.events.map((e) => e.hashStr),
        )
        const cleartexts = await this.getCleartexts([
            ...minipoolEventIds,
            ...eventIds,
            ...snapshotEventIds,
            ...prependedEventIds,
        ])
        return {
            persistedSyncedStream,
            miniblocks,
            cleartexts,
            snapshot: snapshot.snapshot,
            prependedMiniblocks,
            prevSnapshotMiniblockNum: miniblocks[0].header.prevSnapshotMiniblockNum,
        }
    }

    async loadStreams(streamIds: string[]): Promise<{
        streams: Record<string, LoadedStream | undefined>
        lastAccessedAt: Record<string, number>
    }> {
        return this.adapter.transaction(async () => {
            const scratchRecord = await this.adapter.findOne({
                model: 'scratch',
                where: [{ field: 'id', value: SCRATCH_ID }],
            })
            // scratch.data is already parsed as JSON (Record<string, unknown>)
            const scratchData: ScratchData = scratchRecord
                ? (scratchRecord.data as ScratchData)
                : { lastAccessedAt: {} }

            const syncedStreams = await this.getSyncedStreams(streamIds)
            const retVal: Record<string, LoadedStream | undefined> = {}
            for (const streamId of streamIds) {
                if (syncedStreams[streamId]) {
                    const stream = await this.loadStream(streamId, syncedStreams[streamId])
                    if (stream) {
                        retVal[streamId] = stream
                    }
                }
            }
            return {
                streams: retVal,
                lastAccessedAt: scratchData.lastAccessedAt,
            }
        })
    }

    private async getSyncedStreams(
        streamIds: string[],
    ): Promise<Record<string, ParsedPersistedSyncedStream | undefined>> {
        const result: Record<string, ParsedPersistedSyncedStream | undefined> = {}
        for (const streamId of streamIds) {
            result[streamId] = await this.getSyncedStream(streamId)
        }
        return result
    }

    async saveMiniblock(streamId: string, miniblock: ParsedMiniblock): Promise<void> {
        log.debug('saving miniblock', streamId)
        const cachedMiniblock = parsedMiniblockToPersistedMiniblock(miniblock, 'forward')
        const miniblockNum = miniblock.header.miniblockNum.toString()
        const data = toBinary(PersistedMiniblockSchema, cachedMiniblock)

        await this.adapter.upsert({
            model: 'miniblocks',
            where: [
                { field: 'streamId', value: streamId },
                { field: 'miniblockNum', value: miniblockNum },
            ],
            create: { streamId, miniblockNum, data },
            update: { data },
        })
    }

    async saveMiniblocks(
        streamId: string,
        miniblocks: ParsedMiniblock[],
        direction: 'forward' | 'backward',
    ): Promise<void> {
        for (const mb of miniblocks) {
            const miniblockNum = mb.header.miniblockNum.toString()
            const data = toBinary(
                PersistedMiniblockSchema,
                parsedMiniblockToPersistedMiniblock(mb, direction),
            )

            await this.adapter.upsert({
                model: 'miniblocks',
                where: [
                    { field: 'streamId', value: streamId },
                    { field: 'miniblockNum', value: miniblockNum },
                ],
                create: { streamId, miniblockNum, data },
                update: { data },
            })
        }
    }

    async getMiniblock(
        streamId: string,
        miniblockNum: bigint,
    ): Promise<ParsedMiniblock | undefined> {
        const record = await this.adapter.findOne({
            model: 'miniblocks',
            where: [
                { field: 'streamId', value: streamId },
                { field: 'miniblockNum', value: miniblockNum.toString() },
            ],
        })
        if (!record) {
            return undefined
        }
        const cachedMiniblock = fromBinary(PersistedMiniblockSchema, record.data)
        return persistedMiniblockToParsedMiniblock(cachedMiniblock)
    }

    async getMiniblocks(
        streamId: string,
        rangeStart: bigint,
        rangeEnd: bigint,
    ): Promise<ParsedMiniblock[]> {
        const miniblocks: (ParsedMiniblock | undefined)[] = []
        for (let i = rangeStart; i <= rangeEnd; i++) {
            const mb = await this.getMiniblock(streamId, i)
            miniblocks.push(mb)
        }
        // All or nothing
        const filtered = miniblocks.filter(isDefined)
        return filtered.length === miniblocks.length ? filtered : []
    }

    async saveSnapshot(streamId: string, miniblockNum: bigint, snapshot: Snapshot): Promise<void> {
        const existing = await this.adapter.findOne({
            model: 'snapshots',
            where: [{ field: 'streamId', value: streamId }],
        })

        if (existing && BigInt(existing.miniblockNum) >= miniblockNum) {
            return
        }

        log.debug('saving snapshot', streamId)
        const snapshotData = toBinary(SnapshotSchema, snapshot)

        if (existing) {
            await this.adapter.update({
                model: 'snapshots',
                where: [{ field: 'streamId', value: streamId }],
                data: { miniblockNum: Number(miniblockNum), snapshot: snapshotData },
            })
        } else {
            await this.adapter.create({
                model: 'snapshots',
                data: { streamId, miniblockNum: Number(miniblockNum), snapshot: snapshotData },
            })
        }
    }

    private async getSnapshot(
        streamId: string,
    ): Promise<{ snapshot: Snapshot; miniblockNum: bigint } | undefined> {
        const record = await this.adapter.findOne({
            model: 'snapshots',
            where: [{ field: 'streamId', value: streamId }],
        })
        if (!record) {
            return undefined
        }
        return {
            snapshot: fromBinary(SnapshotSchema, record.snapshot),
            miniblockNum: BigInt(record.miniblockNum),
        }
    }

    private async cachedScrollback(
        streamId: string,
        fromInclusive: bigint,
        toExclusive: bigint,
    ): Promise<ParsedMiniblock[]> {
        if (
            !isChannelStreamId(streamId) &&
            !isDMChannelStreamId(streamId) &&
            !isGDMChannelStreamId(streamId)
        ) {
            return []
        }
        let miniblocks: ParsedMiniblock[] = []
        for (let i = 0; i < MAX_CACHED_SCROLLBACK_COUNT; i++) {
            if (toExclusive <= 0n) {
                break
            }
            const result = await this.getMiniblocks(streamId, fromInclusive, toExclusive - 1n)
            if (result.length > 0) {
                miniblocks = [...result, ...miniblocks]
                fromInclusive = result[0].header.prevSnapshotMiniblockNum
                toExclusive = result[0].header.miniblockNum
                if (this.hasTopLevelRenderableEvent(miniblocks)) {
                    break
                }
            } else {
                break
            }
        }
        return miniblocks
    }

    private hasTopLevelRenderableEvent(miniblocks: ParsedMiniblock[]): boolean {
        for (const mb of miniblocks) {
            if (this.topLevelRenderableEventInMiniblock(mb)) {
                return true
            }
        }
        return false
    }

    private topLevelRenderableEventInMiniblock(miniblock: ParsedMiniblock): boolean {
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
}
