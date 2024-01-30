import { PersistedMiniblock, PersistedSyncedStream } from '@river/proto'
import Dexie, { Table } from 'dexie'
import { ParsedMiniblock } from './types'
import {
    persistedSyncedStreamToParsedSyncedStream,
    persistedMiniblockToParsedMiniblock,
    parsedMiniblockToPersistedMiniblock,
} from './streamUtils'

import { dlog, isDefined } from '@river/waterproof'

export class PersistenceStore extends Dexie {
    log = dlog('csb:persistence')

    cleartexts!: Table<{ cleartext: string; eventId: string }>
    syncedStreams!: Table<{ streamId: string; data: Uint8Array }>
    miniblocks!: Table<{ streamId: string; miniblockNum: string; data: Uint8Array }>

    constructor(databaseName: string) {
        super(databaseName)

        this.version(4)
            .stores({
                cleartexts: 'eventId',
                syncedStreams: 'streamId',
                miniblocks: '[streamId+miniblockNum]',
            })
            .upgrade(async (tx) => {
                await tx.table('miniblocks').clear()
                await tx.table('syncedStreams').clear()
            })

        this.version(3)
            .stores({
                cleartexts: 'eventId',
                syncedStreams: 'streamId',
                miniblocks: '[streamId+miniblockNum]',
            })
            .upgrade(async (tx) => {
                await tx.table('miniblocks').clear()
                await tx.table('syncedStreams').clear()
            })

        this.version(2).stores({
            cleartexts: 'eventId',
            syncedStreams: 'streamId',
            miniblocks: '[streamId+miniblockNum]',
        })

        this.requestPersistentStorage()
        this.logPersistenceStats()
    }

    async saveCleartext(eventId: string, cleartext: string) {
        await this.cleartexts.put({ eventId, cleartext })
    }

    async getCleartext(eventId: string) {
        const record = await this.cleartexts.get(eventId)
        return record?.cleartext
    }

    async getCleartexts(eventIds: string[]) {
        const records = await this.cleartexts.bulkGet(eventIds)
        return records.length === 0
            ? undefined
            : records.reduce((acc, record) => {
                  if (record !== undefined) {
                      acc[record.eventId] = record.cleartext
                  }
                  return acc
              }, {} as Record<string, string>)
    }

    async getSyncedStream(streamId: string) {
        const record = await this.syncedStreams.get(streamId)
        if (!record) {
            return undefined
        }
        const cachedSyncedStream = PersistedSyncedStream.fromBinary(record.data)
        return persistedSyncedStreamToParsedSyncedStream(cachedSyncedStream)
    }

    async saveSyncedStream(streamId: string, syncedStream: PersistedSyncedStream) {
        this.log('saving synced stream', streamId)
        await this.syncedStreams.put({
            streamId,
            data: syncedStream.toBinary(),
        })
    }

    async saveMiniblock(streamId: string, miniblock: ParsedMiniblock) {
        this.log('saving miniblock', streamId)
        const cachedMiniblock = parsedMiniblockToPersistedMiniblock(miniblock)
        await this.miniblocks.put({
            streamId: streamId,
            miniblockNum: miniblock.header.miniblockNum.toString(),
            data: cachedMiniblock.toBinary(),
        })
    }

    async getMiniblock(
        streamId: string,
        miniblockNum: bigint,
    ): Promise<ParsedMiniblock | undefined> {
        const record = await this.miniblocks.get([streamId, miniblockNum.toString()])
        if (!record) {
            return undefined
        }
        const cachedMiniblock = PersistedMiniblock.fromBinary(record.data)
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
                const cachedMiniblock = PersistedMiniblock.fromBinary(record.data)
                return persistedMiniblockToParsedMiniblock(cachedMiniblock)
            })
            .filter(isDefined)
        return miniblocks.length === ids.length ? miniblocks : []
    }

    private requestPersistentStorage() {
        if (navigator.storage && navigator.storage.persist) {
            navigator.storage
                .persist()
                .then((persisted) => {
                    this.log('Persisted storage granted: ', persisted)
                })
                .catch((e) => {
                    this.log("Couldn't get persistent storage: ", e)
                })
        } else {
            this.log('navigator.storage unavailable')
        }
    }

    private logPersistenceStats() {
        if (navigator.storage && navigator.storage.estimate) {
            navigator.storage
                .estimate()
                .then((estimate) => {
                    const usage = ((estimate.usage ?? 0) / 1024 / 1024).toFixed(1)
                    const quota = ((estimate.quota ?? 0) / 1024 / 1024).toFixed(1)
                    this.log(`Using ${usage} out of ${quota} MB.`)
                })
                .catch((e) => {
                    this.log("Couldn't get storage estimate: ", e)
                })
        } else {
            this.log('navigator.storage unavailable')
        }
    }
}
