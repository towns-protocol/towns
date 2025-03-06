import TypedEmitter from 'typed-emitter'
import { PersistedSyncedStream, MiniblockHeader, Snapshot, SyncCookie } from '@river-build/proto'
import { Stream } from './stream'
import { ParsedMiniblock, ParsedEvent, ParsedStreamResponse } from './types'
import { DLogger, bin_toHexString, dlog, dlogError } from '@river-build/dlog'
import { isDefined } from './check'
import { IPersistenceStore, LoadedStream } from './persistenceStore'
import { StreamEvents } from './streamEvents'
import { ISyncedStream } from './syncedStreamsLoop'

// Configuration constants
const MEMORY_THRESHOLD = 0.8 // 80% memory threshold
const MAX_RETRY_ATTEMPTS = 3
const INITIALIZATION_TIMEOUT = 30000 // 30 seconds

interface StreamMetrics {
    initializationTime: number
    lastAccessTime: number
    retryCount: number
    memoryUsage: number
    successfulOperations: number
    failedOperations: number
    lastError?: Error
    efficiency?: {
        successRate: number
        averageInitTime: number
        currentMemoryUsage: number
    }
}

export class SyncedStream extends Stream implements ISyncedStream {
    log: DLogger
    private logError: DLogger
    isUpToDate = false
    readonly persistenceStore: IPersistenceStore
    private metrics: StreamMetrics

    constructor(
        userId: string,
        streamId: string,
        clientEmitter: TypedEmitter<StreamEvents>,
        logEmitFromStream: DLogger,
        persistenceStore: IPersistenceStore,
    ) {
        super(userId, streamId, clientEmitter, logEmitFromStream)
        this.log = dlog('csb:syncedStream', { defaultEnabled: false }).extend(userId)
        this.logError = dlogError('csb:syncedStream').extend(userId)
        this.persistenceStore = persistenceStore
        this.metrics = {
            initializationTime: 0,
            lastAccessTime: Date.now(),
            retryCount: 0,
            memoryUsage: 0,
            successfulOperations: 0,
            failedOperations: 0,
        }
    }

    private calculateMemoryUsage(): number {
        const streamSize = {
            streamId: this.streamId,
            userId: this.userId,
            events: this.view.events.size,
            timeline: this.view.timeline.length,
        }
        return JSON.stringify(streamSize).length / 1024 // KB
    }

    async initializeFromPersistence(persistedData?: LoadedStream): Promise<boolean> {
        const startTime = performance.now()
        this.metrics.lastAccessTime = Date.now()

        try {
            const loadedStream =
                persistedData ?? (await this.persistenceStore.loadStream(this.streamId))
            if (!loadedStream) {
                this.log('No persisted data found for stream', this.streamId, persistedData)
                return false
            }

            await Promise.race([
                Promise.resolve().then(() => {
                    return super.initialize(
                        loadedStream.persistedSyncedStream.syncCookie,
                        loadedStream.persistedSyncedStream.minipoolEvents,
                        loadedStream.snapshot,
                        loadedStream.miniblocks,
                        loadedStream.prependedMiniblocks,
                        loadedStream.miniblocks[0].header.prevSnapshotMiniblockNum,
                        loadedStream.cleartexts,
                    )
                }),
                new Promise((_, reject) =>
                    setTimeout(
                        () => reject(new Error('Initialization timeout')),
                        INITIALIZATION_TIMEOUT,
                    ),
                ),
            ])

            this.metrics.initializationTime = performance.now() - startTime
            this.metrics.memoryUsage = this.calculateMemoryUsage()
            this.metrics.successfulOperations++

            this.log('Stream initialized successfully', {
                streamId: this.streamId,
                initTime: this.metrics.initializationTime,
                memoryUsage: this.metrics.memoryUsage,
            })

            return true
        } catch (error) {
            this.metrics.failedOperations++
            this.metrics.lastError = error instanceof Error ? error : new Error(String(error))
            this.metrics.retryCount++

            this.logError('Error initializing from persistence', {
                streamId: this.streamId,
                error: this.metrics.lastError.message,
                retryCount: this.metrics.retryCount,
            })

            if (this.metrics.retryCount >= MAX_RETRY_ATTEMPTS) {
                this.logError('Max retry attempts reached', {
                    streamId: this.streamId,
                    maxAttempts: MAX_RETRY_ATTEMPTS,
                })
            }

            return false
        }
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
        const startTime = performance.now()
        this.metrics.lastAccessTime = Date.now()

        try {
            await Promise.resolve().then(() => {
                return super.initialize(
                    nextSyncCookie,
                    events,
                    snapshot,
                    miniblocks,
                    prependedMiniblocks,
                    prevSnapshotMiniblockNum,
                    cleartexts,
                )
            })

            const cachedSyncedStream = new PersistedSyncedStream({
                syncCookie: nextSyncCookie,
                lastSnapshotMiniblockNum: miniblocks[0].header.miniblockNum,
                minipoolEvents: events,
                lastMiniblockNum: miniblocks[miniblocks.length - 1].header.miniblockNum,
            })

            await this.persistenceStore.saveSyncedStream(this.streamId, cachedSyncedStream)
            await this.persistenceStore.saveMiniblocks(this.streamId, miniblocks, 'forward')

            this.metrics.initializationTime = performance.now() - startTime
            this.metrics.memoryUsage = this.calculateMemoryUsage()
            this.metrics.successfulOperations++

            if (this.metrics.memoryUsage > MEMORY_THRESHOLD) {
                this.log('High memory usage detected', {
                    streamId: this.streamId,
                    memoryUsage: this.metrics.memoryUsage,
                    threshold: MEMORY_THRESHOLD,
                })
            }

            this.markUpToDate()
        } catch (error) {
            this.metrics.failedOperations++
            this.metrics.lastError = error instanceof Error ? error : new Error(String(error))
            this.logError('Error in stream initialization', {
                streamId: this.streamId,
                error: this.metrics.lastError.message,
            })
            throw error
        }
    }

    async initializeFromResponse(response: ParsedStreamResponse) {
        const startTime = performance.now()
        this.metrics.lastAccessTime = Date.now()

        try {
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

            this.metrics.initializationTime = performance.now() - startTime
            this.metrics.successfulOperations++
            this.markUpToDate()
        } catch (error) {
            this.metrics.failedOperations++
            this.metrics.lastError = error instanceof Error ? error : new Error(String(error))
            this.logError('Error initializing from response', {
                streamId: this.streamId,
                error: this.metrics.lastError.message,
            })
            throw error
        }
    }

    async appendEvents(
        events: ParsedEvent[],
        nextSyncCookie: SyncCookie,
        cleartexts: Record<string, Uint8Array | string> | undefined,
    ): Promise<void> {
        const startTime = performance.now()
        this.metrics.lastAccessTime = Date.now()

        try {
            await super.appendEvents(events, nextSyncCookie, cleartexts)

            for (const event of events) {
                const payload = event.event.payload
                if (payload.case === 'miniblockHeader') {
                    await this.onMiniblockHeader(payload.value, event, event.hash)
                }
            }

            this.metrics.successfulOperations++
            this.metrics.memoryUsage = this.calculateMemoryUsage()
            this.markUpToDate()

            this.log('Events appended successfully', {
                streamId: this.streamId,
                eventCount: events.length,
                duration: performance.now() - startTime,
                memoryUsage: this.metrics.memoryUsage,
            })
        } catch (error) {
            this.metrics.failedOperations++
            this.metrics.lastError = error instanceof Error ? error : new Error(String(error))
            this.logError('Error appending events', {
                streamId: this.streamId,
                error: this.metrics.lastError.message,
                eventCount: events.length,
            })
            throw error
        }
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

    getMetrics(): StreamMetrics {
        return {
            ...this.metrics,
            lastAccessTime: Date.now(),
            efficiency: {
                successRate:
                    (this.metrics.successfulOperations /
                        (this.metrics.successfulOperations + this.metrics.failedOperations)) *
                    100,
                averageInitTime: this.metrics.initializationTime,
                currentMemoryUsage: this.metrics.memoryUsage,
            },
        }
    }

    resetMetrics(): void {
        this.metrics = {
            initializationTime: 0,
            lastAccessTime: Date.now(),
            retryCount: 0,
            memoryUsage: this.calculateMemoryUsage(),
            successfulOperations: 0,
            failedOperations: 0,
        }
    }
}
