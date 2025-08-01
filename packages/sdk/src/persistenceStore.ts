import {
    PersistedMiniblockSchema,
    PersistedSyncedStream,
    PersistedSyncedStreamSchema,
    SnapshotSchema,
    Snapshot,
} from '@towns-protocol/proto'
import Dexie, { Table } from 'dexie'
import { ParsedMiniblock } from './types'
import {
    persistedSyncedStreamToParsedSyncedStream,
    persistedMiniblockToParsedMiniblock,
    parsedMiniblockToPersistedMiniblock,
    ParsedPersistedSyncedStream,
} from './streamUtils'

import { bin_toHexString, dlog, dlogError } from '@towns-protocol/dlog'
import { isDefined } from './check'
import { isChannelStreamId, isDMChannelStreamId, isGDMChannelStreamId } from './id'
import { fromBinary, toBinary } from '@bufbuild/protobuf'

const MAX_CACHED_SCROLLBACK_COUNT = 3
const DEFAULT_RETRY_COUNT = 2
const log = dlog('csb:persistence', { defaultEnabled: false })
const logWarn = dlog('csb:persistence:warn', { defaultEnabled: true })
const logError = dlogError('csb:persistence:error')

export interface LoadedStream {
    persistedSyncedStream: ParsedPersistedSyncedStream
    miniblocks: ParsedMiniblock[]
    cleartexts: Record<string, Uint8Array | string> | undefined
    snapshot: Snapshot
    prependedMiniblocks: ParsedMiniblock[]
    prevSnapshotMiniblockNum: bigint
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
                logWarn('retrying...', `${retryCounter}/${retries} retries left`)
                retryCounter--
                // wait a bit before retrying
                await new Promise((resolve) => setTimeout(resolve, 100))
            }
            return await fn()
        } catch (err) {
            lastErr = err
            const e = err as any
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            switch (e.name) {
                case 'AbortError':
                    // catch and retry on abort errors
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                    if (e.inner) {
                        log(
                            'AbortError reason:',
                            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                            e.inner,
                            `${retryCounter}/${retries} retries left`,
                        )
                    } else {
                        log(
                            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                            'AbortError message:' + e.message,
                            `${retryCounter}/${retries} retries left`,
                        )
                    }
                    break
                default:
                    // don't retry for unknown errors
                    logError('Unhandled error:', err)
                    throw lastErr
            }
        }
    }
    // if we're out of retries, throw the last error
    throw lastErr
}

export interface IPersistenceStore {
    setHighPriorityStreams(streamIds: string[]): void
    saveCleartext(eventId: string, cleartext: Uint8Array | string): Promise<void>
    getCleartext(eventId: string): Promise<Uint8Array | string | undefined>
    getCleartexts(eventIds: string[]): Promise<Record<string, Uint8Array | string> | undefined>
    getSyncedStream(streamId: string): Promise<ParsedPersistedSyncedStream | undefined>
    saveSyncedStream(streamId: string, syncedStream: PersistedSyncedStream): Promise<void>
    loadStream(
        streamId: string,
        inPersistedSyncedStream?: ParsedPersistedSyncedStream,
    ): Promise<LoadedStream | undefined>
    loadStreams(streamIds: string[]): Promise<{
        streams: Record<string, LoadedStream | undefined>
        lastAccessedAt: Record<string, number>
    }>
    saveMiniblock(streamId: string, miniblock: ParsedMiniblock): Promise<void>
    saveMiniblocks(
        streamId: string,
        miniblocks: ParsedMiniblock[],
        direction: 'forward' | 'backward',
    ): Promise<void>
    getMiniblock(streamId: string, miniblockNum: bigint): Promise<ParsedMiniblock | undefined>
    getMiniblocks(
        streamId: string,
        rangeStart: bigint,
        randeEnd: bigint,
    ): Promise<ParsedMiniblock[]>
    saveSnapshot(streamId: string, miniblockNum: bigint, snapshot: Snapshot): Promise<void>
}

const SCRATCH_ID = '0'
type ScratchData = {
    lastAccessedAt: { [streamId: string]: number }
}

export class PersistenceStore extends Dexie implements IPersistenceStore {
    cleartexts!: Table<{ cleartext: Uint8Array | string; eventId: string }>
    syncedStreams!: Table<{ streamId: string; data: Uint8Array }>
    miniblocks!: Table<{ streamId: string; miniblockNum: string; data: Uint8Array }>
    snapshots!: Table<{ streamId: string; data: { miniblockNum: bigint; snapshot: Uint8Array } }>
    scratch!: Table<{ id: string; data: ScratchData }>

    private scratchQueue: ((scratchData: ScratchData) => void)[] = []
    private scratchTimerId: NodeJS.Timeout | undefined

    constructor(databaseName: string) {
        super(databaseName)

        this.version(7).stores({
            cleartexts: 'eventId',
            syncedStreams: 'streamId',
            miniblocks: '[streamId+miniblockNum]',
            snapshots: 'streamId',
        })
        // Version 8: changed how we store snapshots, drop all saved miniblocks, syncedStreams and snapshots
        this.version(8).upgrade((tx) => {
            return Promise.all([
                tx.table('miniblocks').toCollection().delete(),
                tx.table('syncedStreams').toCollection().delete(),
                tx.table('snapshots').toCollection().delete(),
            ])
        })

        this.version(9).stores({
            cleartexts: 'eventId',
            syncedStreams: 'streamId',
            miniblocks: '[streamId+miniblockNum]',
            snapshots: 'streamId',
            scratch: 'id',
        })

        this.requestPersistentStorage()
        this.logPersistenceStats()
    }

    setHighPriorityStreams(streamIds: string[]) {
        this.scratchQueue.push((scratchData: ScratchData) => {
            streamIds.forEach((streamId) => {
                scratchData.lastAccessedAt[streamId] = Date.now()
            })
        })
        clearTimeout(this.scratchTimerId)
        this.scratchTimerId = setTimeout(() => {
            this.processScratchQueue().catch((e) => {
                logError('Error processing scratch queue', e)
            })
        }, 1000)
    }

    async processScratchQueue() {
        const scratchData = (await this.scratch.get(SCRATCH_ID)) || {
            id: SCRATCH_ID,
            data: { lastAccessedAt: {} } satisfies ScratchData,
        }
        this.scratchQueue.forEach((fn) => fn(scratchData.data))
        this.scratchQueue = []
        await this.scratch.put({ id: SCRATCH_ID, data: scratchData.data })
    }

    async saveCleartext(eventId: string, cleartext: Uint8Array | string) {
        await this.cleartexts.put({ eventId, cleartext })
    }

    async getCleartext(eventId: string) {
        const record = await this.cleartexts.get(eventId)
        return record?.cleartext
    }

    async getCleartexts(eventIds: string[]) {
        return fnReadRetryer(async () => {
            const records = await this.cleartexts.bulkGet(eventIds)
            return records.length === 0
                ? undefined
                : records.reduce(
                      (acc, record) => {
                          if (record !== undefined) {
                              acc[record.eventId] = record.cleartext
                          }
                          return acc
                      },
                      {} as Record<string, Uint8Array | string>,
                  )
        }, DEFAULT_RETRY_COUNT)
    }

    async getSyncedStream(streamId: string) {
        const record = await this.syncedStreams.get(streamId)
        if (!record) {
            return undefined
        }
        const cachedSyncedStream = fromBinary(PersistedSyncedStreamSchema, record.data)
        const psstpss = persistedSyncedStreamToParsedSyncedStream(streamId, cachedSyncedStream)
        return psstpss
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
            logError(
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
            logError(
                'Persisted Snapshot undefined',
                streamId,
                persistedSyncedStream.lastSnapshotMiniblockNum,
            )
            return undefined
        }

        if (snapshot.miniblockNum !== persistedSyncedStream.lastSnapshotMiniblockNum) {
            logError(
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
            ? hasTopLevelRenderableEvent(miniblocks)
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

    async loadStreams(streamIds: string[]) {
        const result = await this.transaction(
            'r',
            [this.syncedStreams, this.cleartexts, this.miniblocks, this.snapshots, this.scratch],
            async () => {
                const scratchData = await this.scratch.get(SCRATCH_ID)
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
                    lastAccessedAt: scratchData?.data.lastAccessedAt ?? {},
                }
            },
        )
        return result
    }

    private async getSyncedStreams(streamIds: string[]) {
        const records = await this.syncedStreams.bulkGet(streamIds)
        const cachedSyncedStreams = records.map((x) =>
            x
                ? { streamId: x.streamId, data: fromBinary(PersistedSyncedStreamSchema, x.data) }
                : undefined,
        )
        const psstpss = cachedSyncedStreams.reduce(
            (acc, x) => {
                if (x) {
                    acc[x.streamId] = persistedSyncedStreamToParsedSyncedStream(x.streamId, x.data)
                }
                return acc
            },
            {} as Record<string, ParsedPersistedSyncedStream | undefined>,
        )
        return psstpss
    }

    async saveSyncedStream(streamId: string, syncedStream: PersistedSyncedStream) {
        log('saving synced stream', streamId)
        await this.syncedStreams.put({
            streamId,
            data: toBinary(PersistedSyncedStreamSchema, syncedStream),
        })
    }

    async saveMiniblock(streamId: string, miniblock: ParsedMiniblock) {
        log('saving miniblock', streamId)
        const cachedMiniblock = parsedMiniblockToPersistedMiniblock(miniblock, 'forward')
        await this.miniblocks.put({
            streamId: streamId,
            miniblockNum: miniblock.header.miniblockNum.toString(),
            data: toBinary(PersistedMiniblockSchema, cachedMiniblock),
        })
    }

    async saveMiniblocks(
        streamId: string,
        miniblocks: ParsedMiniblock[],
        direction: 'forward' | 'backward',
    ) {
        await this.miniblocks.bulkPut(
            miniblocks.map((mb) => {
                return {
                    streamId: streamId,
                    miniblockNum: mb.header.miniblockNum.toString(),
                    data: toBinary(
                        PersistedMiniblockSchema,
                        parsedMiniblockToPersistedMiniblock(mb, direction),
                    ),
                }
            }),
        )
    }

    async getMiniblock(
        streamId: string,
        miniblockNum: bigint,
    ): Promise<ParsedMiniblock | undefined> {
        const record = await this.miniblocks.get([streamId, miniblockNum.toString()])
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
        const ids: [string, string][] = []
        for (let i = rangeStart; i <= rangeEnd; i++) {
            ids.push([streamId, i.toString()])
        }
        const records = await this.miniblocks.bulkGet(ids)
        // All or nothing
        const miniblocks = records
            .map((record) => {
                if (!record) {
                    return undefined
                }
                const cachedMiniblock = fromBinary(PersistedMiniblockSchema, record.data)
                return persistedMiniblockToParsedMiniblock(cachedMiniblock)
            })
            .filter(isDefined)
        return miniblocks.length === ids.length ? miniblocks : []
    }

    async saveSnapshot(streamId: string, miniblockNum: bigint, snapshot: Snapshot): Promise<void> {
        const record = await this.snapshots.get(streamId)
        if (record && record.data.miniblockNum >= miniblockNum) {
            return
        }
        log('saving snapshot', streamId)
        await this.snapshots.put({
            streamId: streamId,
            data: {
                snapshot: toBinary(SnapshotSchema, snapshot),
                miniblockNum: miniblockNum,
            },
        })
    }

    async getSnapshot(
        streamId: string,
    ): Promise<{ snapshot: Snapshot; miniblockNum: bigint } | undefined> {
        const record = await this.snapshots.get(streamId)
        if (!record) {
            return undefined
        }
        return {
            snapshot: fromBinary(SnapshotSchema, record.data.snapshot),
            miniblockNum: record.data.miniblockNum,
        }
    }

    private requestPersistentStorage() {
        if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
            navigator.storage
                .persist()
                .then((persisted) => {
                    log('Persisted storage granted: ', persisted)
                })
                .catch((e) => {
                    log("Couldn't get persistent storage: ", e)
                })
        } else {
            log('navigator.storage unavailable')
        }
    }

    private logPersistenceStats() {
        if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
            navigator.storage
                .estimate()
                .then((estimate) => {
                    const usage = ((estimate.usage ?? 0) / 1024 / 1024).toFixed(1)
                    const quota = ((estimate.quota ?? 0) / 1024 / 1024).toFixed(1)
                    log(`Using ${usage} out of ${quota} MB.`)
                })
                .catch((e) => {
                    log("Couldn't get storage estimate: ", e)
                })
        } else {
            log('navigator.storage unavailable')
        }
    }
    private async cachedScrollback(
        streamId: string,
        fromInclusive: bigint,
        toExclusive: bigint,
    ): Promise<ParsedMiniblock[]> {
        // If this is a channel, DM or GDM, perform a few scrollbacks
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
                if (hasTopLevelRenderableEvent(miniblocks)) {
                    break
                }
            } else {
                break
            }
        }
        return miniblocks
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

export function eventIdsFromSnapshot(snapshot: Snapshot): string[] {
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

//Linting below is disable as this is a stub class which is used for testing and just follows the interface
/* eslint-disable @typescript-eslint/no-unused-vars */
export class StubPersistenceStore implements IPersistenceStore {
    setHighPriorityStreams(streamIds: string[]) {
        return
    }

    async saveCleartext(eventId: string, cleartext: Uint8Array) {
        return Promise.resolve()
    }

    async getCleartext(eventId: string) {
        return Promise.resolve(undefined)
    }

    async getCleartexts(eventIds: string[]) {
        return Promise.resolve(undefined)
    }

    async getSyncedStream(streamId: string) {
        return Promise.resolve(undefined)
    }

    async loadStream(streamId: string, inPersistedSyncedStream?: ParsedPersistedSyncedStream) {
        return Promise.resolve(undefined)
    }

    async loadStreams(streamIds: string[]) {
        return Promise.resolve({ streams: {}, lastAccessedAt: {} })
    }

    async saveSyncedStream(streamId: string, syncedStream: PersistedSyncedStream) {
        return Promise.resolve()
    }

    async saveMiniblock(streamId: string, miniblock: ParsedMiniblock) {
        return Promise.resolve()
    }

    async saveMiniblocks(
        streamId: string,
        miniblocks: ParsedMiniblock[],
        direction: 'forward' | 'backward',
    ) {
        return Promise.resolve()
    }

    async getMiniblock(
        streamId: string,
        miniblockNum: bigint,
    ): Promise<ParsedMiniblock | undefined> {
        return Promise.resolve(undefined)
    }

    async getMiniblocks(
        streamId: string,
        rangeStart: bigint,
        rangeEnd: bigint,
    ): Promise<ParsedMiniblock[]> {
        return Promise.resolve([])
    }

    async saveSnapshot(streamId: string, miniblockNum: bigint, snapshot: Snapshot): Promise<void> {
        return Promise.resolve()
    }
    /* eslint-enable @typescript-eslint/no-unused-vars */
}
