import { PersistedMiniblock, PersistedSyncedStream, SyncCookie } from '@river-build/proto'
import Dexie, { Table } from 'dexie'
import { ParsedEvent, ParsedMiniblock } from './types'
import {
    persistedSyncedStreamToParsedSyncedStream,
    persistedMiniblockToParsedMiniblock,
    parsedMiniblockToPersistedMiniblock,
} from './streamUtils'

import { dlog, dlogError } from '@river-build/dlog'
import { isDefined } from './check'

const DEFAULT_RETRY_COUNT = 2
const log = dlog('csb:persistence')
const logError = dlogError('csb:persistence')

async function fnReadRetryer<T>(
    fn: () => Promise<T | undefined>,
    retries: number,
): Promise<T | undefined> {
    let lastErr: unknown
    let retryCounter = retries
    while (retryCounter > 0) {
        try {
            if (retryCounter < retries) {
                log('retrying...', `${retryCounter}/${retries} retries left`)
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
    saveCleartext(eventId: string, cleartext: string): Promise<void>
    getCleartext(eventId: string): Promise<string | undefined>
    getCleartexts(eventIds: string[]): Promise<Record<string, string> | undefined>
    getSyncedStream(streamId: string): Promise<
        | {
              syncCookie: SyncCookie
              lastSnapshotMiniblockNum: bigint
              minipoolEvents: ParsedEvent[]
              lastMiniblockNum: bigint
          }
        | undefined
    >
    saveSyncedStream(streamId: string, syncedStream: PersistedSyncedStream): Promise<void>
    saveMiniblock(streamId: string, miniblock: ParsedMiniblock): Promise<void>
    saveMiniblocks(streamId: string, miniblocks: ParsedMiniblock[]): Promise<void>
    getMiniblock(streamId: string, miniblockNum: bigint): Promise<ParsedMiniblock | undefined>
    getMiniblocks(
        streamId: string,
        rangeStart: bigint,
        randeEnd: bigint,
    ): Promise<ParsedMiniblock[]>
}

export class PersistenceStore extends Dexie implements IPersistenceStore {
    cleartexts!: Table<{ cleartext: string; eventId: string }>
    syncedStreams!: Table<{ streamId: string; data: Uint8Array }>
    miniblocks!: Table<{ streamId: string; miniblockNum: string; data: Uint8Array }>

    constructor(databaseName: string) {
        super(databaseName)

        this.version(1).stores({
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
        return fnReadRetryer(async () => {
            const records = await this.cleartexts.bulkGet(eventIds)
            return records.length === 0
                ? undefined
                : records.reduce((acc, record) => {
                      if (record !== undefined) {
                          acc[record.eventId] = record.cleartext
                      }
                      return acc
                  }, {} as Record<string, string>)
        }, DEFAULT_RETRY_COUNT)
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
        log('saving synced stream', streamId)
        await this.syncedStreams.put({
            streamId,
            data: syncedStream.toBinary(),
        })
    }

    async saveMiniblock(streamId: string, miniblock: ParsedMiniblock) {
        log('saving miniblock', streamId)
        const cachedMiniblock = parsedMiniblockToPersistedMiniblock(miniblock)
        await this.miniblocks.put({
            streamId: streamId,
            miniblockNum: miniblock.header.miniblockNum.toString(),
            data: cachedMiniblock.toBinary(),
        })
    }

    async saveMiniblocks(streamId: string, miniblocks: ParsedMiniblock[]) {
        await this.miniblocks.bulkPut(
            miniblocks.map((mb) => {
                return {
                    streamId: streamId,
                    miniblockNum: mb.header.miniblockNum.toString(),
                    data: parsedMiniblockToPersistedMiniblock(mb).toBinary(),
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
        if (navigator.storage && navigator.storage.estimate) {
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
}

//Linting below is disable as this is a stub class which is used for testing and just follows the interface
export class StubPersistenceStore implements IPersistenceStore {
    //eslint-disable-next-line @typescript-eslint/no-unused-vars
    async saveCleartext(eventId: string, cleartext: string) {
        return Promise.resolve()
    }

    //eslint-disable-next-line @typescript-eslint/no-unused-vars
    async getCleartext(eventId: string) {
        return Promise.resolve(undefined)
    }

    //eslint-disable-next-line @typescript-eslint/no-unused-vars
    async getCleartexts(eventIds: string[]) {
        return Promise.resolve(undefined)
    }

    //eslint-disable-next-line @typescript-eslint/no-unused-vars
    async getSyncedStream(streamId: string) {
        return Promise.resolve(undefined)
    }

    //eslint-disable-next-line @typescript-eslint/no-unused-vars
    async saveSyncedStream(streamId: string, syncedStream: PersistedSyncedStream) {
        return Promise.resolve()
    }

    //eslint-disable-next-line @typescript-eslint/no-unused-vars
    async saveMiniblock(streamId: string, miniblock: ParsedMiniblock) {
        return Promise.resolve()
    }

    //eslint-disable-next-line @typescript-eslint/no-unused-vars
    async saveMiniblocks(streamId: string, miniblocks: ParsedMiniblock[]) {
        return Promise.resolve()
    }

    /* eslint-disable @typescript-eslint/no-unused-vars */
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
    /* eslint-enable @typescript-eslint/no-unused-vars */
}
