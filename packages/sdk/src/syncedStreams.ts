import { SyncCookie } from '@river-build/proto'
import { DLogger, check, dlog, dlogError } from '@river-build/dlog'
import { StreamRpcClient } from './makeStreamRpcClient'
import { SyncedStreamEvents } from './streamEvents'
import TypedEmitter from 'typed-emitter'
import { isDefined } from './check'
import { streamIdAsString } from './id'
import { PingInfo, SyncState, SyncedStreamsLoop } from './syncedStreamsLoop'
import { SyncedStream } from './syncedStream'
import { UnpackEnvelopeOpts } from './sign'

// Configuration constants
const DEFAULT_BATCH_SIZE = 20
const MIN_BATCH_SIZE = 5
const MAX_BATCH_SIZE = 50
const BATCH_DELAY = 5
const CACHE_CLEANUP_INTERVAL = 5 * 60 * 1000
const CACHE_MAX_AGE = 30 * 60 * 1000
const GC_INTERVAL = 60 * 1000
const MAX_RETRY_ATTEMPTS = 3
const CONNECTION_POOL_SIZE = 3
const PARALLEL_BATCH_LIMIT = 5
const CHUNK_SIZE = 100
const MEMORY_THRESHOLD = 0.8 // 80% memory threshold
const CACHE_PRIORITY_THRESHOLD = 0.7 // 70% priority threshold for cache retention

// Add prewarm configuration
const PREWARM_THRESHOLD = 5 // Number of accesses before prewarming
const PREWARM_INTERVAL = 30 * 1000 // 30 seconds
const MAX_PREWARM_STREAMS = 10

interface StreamCacheEntry {
    stream: SyncedStream
    lastAccessed: number
    priority: number
    retryCount: number
    lastError?: Error
    memoryUsage: number
    accessCount: number
    isPrewarmed: boolean
}

interface ConnectionPoolEntry {
    client: StreamRpcClient
    inUse: boolean
    lastUsed: number
}

interface Metrics {
    cacheHits: number
    cacheMisses: number
    retryAttempts: number
    successfulRetries: number
    failedRetries: number
    gcRuns: number
    gcCollected: number
    activeConnections: number
    totalPreloaded: number
    highPriorityLoaded: number
    normalPriorityLoaded: number
    averagePreloadTime: number
    incrementCacheHits(): void
    incrementFailedRetries(): void
}

interface Logger {
    error(message: string, metadata?: Record<string, unknown>): void
}

interface Performance {
    memory?: {
        usedJSHeapSize: number
        jsHeapSizeLimit: number
    }
}

export class SyncedStreams {
    private syncedStreamsLoop: SyncedStreamsLoop | undefined
    private highPriorityIds: Set<string> = new Set()
    // userId is the current user id
    private readonly userId: string
    // mapping of stream id to stream
    private readonly streams: Map<string, SyncedStream> = new Map()
    // loggers
    private readonly logSync: DLogger
    private readonly logError: DLogger
    // clientEmitter is used to proxy the events from the streams to the client
    private readonly clientEmitter: TypedEmitter<SyncedStreamEvents>
    // rpcClient is used to receive sync updates from the server
    private readonly rpcClient: StreamRpcClient
    private initializationPromise: Promise<void> | null = null
    private readonly streamCache: Map<string, StreamCacheEntry> = new Map()
    private readonly connectionPool: ConnectionPoolEntry[] = []
    private cleanupInterval: number | undefined
    private gcInterval: number | undefined
    private preloadQueue: string[] = []
    private metrics: Metrics
    private logger: Logger
    private normalPriorityStreams: Set<string>
    private prewarmInterval: number | undefined

    constructor(
        userId: string,
        rpcClient: StreamRpcClient,
        clientEmitter: TypedEmitter<SyncedStreamEvents>,
        private readonly unpackEnvelopeOpts: UnpackEnvelopeOpts | undefined,
        private readonly logId: string,
        private readonly streamOpts?: { useModifySync?: boolean },
    ) {
        this.userId = userId
        this.rpcClient = rpcClient
        this.clientEmitter = clientEmitter
        this.logSync = dlog('csb:cl:sync').extend(this.logId)
        this.logError = dlogError('csb:cl:sync:stream').extend(this.logId)
        this.initializeConnectionPool()
        this.startCacheCleanup()
        this.startGarbageCollection()
        this.startPrewarmInterval()
        this.normalPriorityStreams = new Set()
        this.metrics = {
            cacheHits: 0,
            cacheMisses: 0,
            retryAttempts: 0,
            successfulRetries: 0,
            failedRetries: 0,
            gcRuns: 0,
            gcCollected: 0,
            activeConnections: 0,
            totalPreloaded: 0,
            highPriorityLoaded: 0,
            normalPriorityLoaded: 0,
            averagePreloadTime: 0,
            incrementCacheHits(): void {
                this.cacheHits++
            },
            incrementFailedRetries(): void {
                this.failedRetries++
            },
        }
        this.logger = {
            error(message: string, metadata?: Record<string, unknown>): void {
                dlogError('csb:cl:sync:stream')(message, metadata)
            },
        }
        // Initialize cache entries with all required properties
        this.streams.forEach((stream) => {
            this.streamCache.set(
                stream.streamId,
                this.createCacheEntry(stream, this.highPriorityIds.has(stream.streamId) ? 2 : 0),
            )
        })
    }

    private initializeConnectionPool() {
        for (let i = 0; i < CONNECTION_POOL_SIZE; i++) {
            this.connectionPool.push({
                client: this.rpcClient,
                inUse: false,
                lastUsed: Date.now(),
            })
        }
    }

    private startGarbageCollection() {
        this.gcInterval = window.setInterval(() => {
            this.metrics.gcRuns++
            let collected = 0

            for (const [id, entry] of this.streamCache) {
                if (this.shouldCollect(entry)) {
                    this.streamCache.delete(id)
                    collected++
                }
            }

            this.metrics.gcCollected += collected
            if (collected > 0) {
                this.logSync('Garbage collection complete', { collected })
            }
        }, GC_INTERVAL)
    }

    private shouldCollect(entry: StreamCacheEntry): boolean {
        const now = Date.now()
        const hasError = entry.lastError !== undefined
        return (
            (now - entry.lastAccessed > CACHE_MAX_AGE && entry.priority < 1) ||
            (entry.retryCount >= MAX_RETRY_ATTEMPTS && hasError)
        )
    }

    private startCacheCleanup() {
        this.cleanupInterval = window.setInterval(() => {
            const now = Date.now()
            for (const [id, entry] of this.streamCache) {
                if (now - entry.lastAccessed > CACHE_MAX_AGE) {
                    this.streamCache.delete(id)
                    this.logSync('Cache entry expired', id)
                }
            }
        }, CACHE_CLEANUP_INTERVAL)
    }

    // Create a helper function to create cache entries with all required properties
    private createCacheEntry(
        stream: SyncedStream,
        priority: number,
        isPrewarmed = false,
        accessCount = 0,
    ): StreamCacheEntry {
        return {
            stream,
            lastAccessed: Date.now(),
            priority,
            retryCount: 0,
            accessCount,
            memoryUsage: this.calculateStreamMemoryUsage(stream),
            isPrewarmed,
        }
    }

    private calculateStreamMemoryUsage(stream: SyncedStream): number {
        // Only calculate size of essential properties to avoid circular references
        const streamSize = {
            streamId: stream.streamId,
            userId: stream.userId,
            // Add other essential properties that don't create circular references
        }
        return JSON.stringify(streamSize).length / 1024 // KB
    }

    private async preloadNextBatch(streamIds: string[]): Promise<void> {
        const startTime = performance.now()
        const memory = (performance as Performance).memory
        const memoryUsage = memory ? memory.usedJSHeapSize / memory.jsHeapSizeLimit : 0

        // Adjust batch size based on memory usage
        const dynamicBatchSize = Math.max(
            MIN_BATCH_SIZE,
            Math.min(
                MAX_BATCH_SIZE,
                memoryUsage > MEMORY_THRESHOLD ? MIN_BATCH_SIZE : DEFAULT_BATCH_SIZE,
            ),
        )

        // Split streams into chunks for better memory management
        const chunks: string[][] = []
        for (let i = 0; i < streamIds.length; i += CHUNK_SIZE) {
            chunks.push(streamIds.slice(i, i + CHUNK_SIZE))
        }

        // Process each chunk with dynamic batch sizing
        for (const chunk of chunks) {
            const batches: string[][] = []
            for (let i = 0; i < chunk.length; i += dynamicBatchSize) {
                batches.push(chunk.slice(i, i + dynamicBatchSize))
            }

            const processBatch = async (batch: string[]) => {
                const batchStartTime = performance.now()
                await Promise.all(
                    batch.map(async (streamId) => {
                        try {
                            const cached = this.streamCache.get(streamId)
                            if (cached) {
                                cached.lastAccessed = Date.now()
                                cached.accessCount++
                                this.metrics.incrementCacheHits()
                                return
                            }

                            const stream = this.streams.get(streamId)
                            if (!stream) return

                            await stream.initializeFromPersistence()

                            const cacheEntry = this.createCacheEntry(
                                stream,
                                this.highPriorityIds.has(streamId) ? 2 : 0,
                                false,
                                1,
                            )
                            this.streamCache.set(streamId, cacheEntry)

                            // Clean up cache if memory usage is high
                            if (cacheEntry.memoryUsage > MEMORY_THRESHOLD) {
                                this.cleanupCache()
                            }
                        } catch (error) {
                            this.logger.error('Error initializing stream', {
                                streamId,
                                error: error instanceof Error ? error.message : String(error),
                            })
                            this.metrics.incrementFailedRetries()
                        }
                    }),
                )
                const batchDuration = performance.now() - batchStartTime
                this.metrics.averagePreloadTime =
                    (this.metrics.averagePreloadTime * this.metrics.totalPreloaded +
                        batchDuration) /
                    (this.metrics.totalPreloaded + batch.length)
                this.metrics.totalPreloaded += batch.length

                this.logSync('Batch processing complete', {
                    batchSize: batch.length,
                    duration: batchDuration,
                    averageTimePerStream: batchDuration / batch.length,
                    memoryUsage,
                })
            }

            // Process batches in parallel with adaptive limit
            const parallelLimit =
                memoryUsage > MEMORY_THRESHOLD
                    ? Math.max(1, Math.floor(PARALLEL_BATCH_LIMIT / 2))
                    : PARALLEL_BATCH_LIMIT

            for (let i = 0; i < batches.length; i += parallelLimit) {
                const currentBatches = batches.slice(i, i + parallelLimit)
                await Promise.all(currentBatches.map(processBatch))
                if (i + parallelLimit < batches.length) {
                    await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY))
                }
            }

            // Allow event loop to process between chunks
            await new Promise((resolve) => setTimeout(resolve, 0))
        }

        const totalDuration = performance.now() - startTime
        this.logSync('Preload batch complete', {
            totalStreams: streamIds.length,
            chunks: chunks.length,
            totalDuration,
            averageTimePerStream: totalDuration / streamIds.length,
            cacheHits: this.metrics.cacheHits,
            failures: this.metrics.failedRetries,
            memoryUsage,
        })
    }

    private cleanupCache(): void {
        const now = Date.now()
        const entries = Array.from(this.streamCache.entries()).sort((a, b) => {
            // Score based on priority, access count, and age
            const scoreA =
                a[1].priority * 10 + a[1].accessCount * 0.1 - (now - a[1].lastAccessed) / 1000
            const scoreB =
                b[1].priority * 10 + b[1].accessCount * 0.1 - (now - b[1].lastAccessed) / 1000
            return scoreA - scoreB
        })

        // Remove low scoring entries until we're below threshold
        let totalMemory = entries.reduce((sum, [, entry]) => sum + entry.memoryUsage, 0)
        let removed = 0

        for (const [id, entry] of entries) {
            if (
                entry.priority < CACHE_PRIORITY_THRESHOLD &&
                (now - entry.lastAccessed > CACHE_MAX_AGE || totalMemory > MEMORY_THRESHOLD)
            ) {
                this.streamCache.delete(id)
                totalMemory -= entry.memoryUsage
                removed++
            }
        }

        if (removed > 0) {
            this.logSync('Cache cleanup complete', {
                removed,
                remainingEntries: this.streamCache.size,
            })
        }
    }

    public getMetrics() {
        const totalProcessed = this.metrics.totalPreloaded
        const failedStreams = this.metrics.failedRetries
        const successfulStreams = totalProcessed - failedStreams

        return {
            ...this.metrics,
            cacheSize: this.streamCache.size,
            activeConnections: this.connectionPool.filter((e) => e.inUse).length,
            highPriorityStreams: this.highPriorityIds.size,
            queueLength: this.preloadQueue.length,
            averagePreloadTimeMs: Math.round(this.metrics.averagePreloadTime),
            successRate: totalProcessed
                ? ((successfulStreams / totalProcessed) * 100).toFixed(2) + '%'
                : '0%',
            throughput: totalProcessed
                ? (totalProcessed / (this.metrics.averagePreloadTime / 1000)).toFixed(2) +
                  ' streams/s'
                : '0 streams/s',
            efficiency: {
                cacheHitRate: totalProcessed
                    ? ((this.metrics.cacheHits / totalProcessed) * 100).toFixed(2) + '%'
                    : '0%',
                failureRate: totalProcessed
                    ? ((failedStreams / totalProcessed) * 100).toFixed(2) + '%'
                    : '0%',
                averageRetries: totalProcessed
                    ? (this.metrics.retryAttempts / totalProcessed).toFixed(2)
                    : '0',
            },
        }
    }

    public get syncState(): SyncState {
        return this.syncedStreamsLoop?.syncState ?? SyncState.NotSyncing
    }

    public get pingInfo(): PingInfo | undefined {
        return this.syncedStreamsLoop?.pingInfo
    }

    public stats() {
        return this.syncedStreamsLoop?.stats()
    }

    public has(streamId: string | Uint8Array): boolean {
        return this.streams.get(streamIdAsString(streamId)) !== undefined
    }

    public get(streamId: string | Uint8Array): SyncedStream | undefined {
        const id = streamIdAsString(streamId)
        const cached = this.streamCache.get(id)
        if (cached) {
            cached.lastAccessed = Date.now()
            return cached.stream
        }
        return this.streams.get(id)
    }

    public set(streamId: string | Uint8Array, stream: SyncedStream): void {
        this.log('stream set', streamId)
        const id = streamIdAsString(streamId)
        check(id.length > 0, 'streamId cannot be empty')
        this.streams.set(id, stream)
        this.streamCache.set(
            id,
            this.createCacheEntry(stream, this.highPriorityIds.has(id) ? 2 : 0),
        )
    }

    public setHighPriorityStreams(streamIds: string[]) {
        this.highPriorityIds = new Set(streamIds)
        this.logSync('Set High Priority Streams', streamIds)
    }

    public delete(inStreamId: string | Uint8Array): void {
        const streamId = streamIdAsString(inStreamId)
        this.streams.get(streamId)?.stop()
        this.streams.delete(streamId)
    }

    public size(): number {
        return this.streams.size
    }

    public getSyncId(): string | undefined {
        return this.syncedStreamsLoop?.getSyncId()
    }

    public getStreams(): SyncedStream[] {
        return Array.from(this.streams.values())
    }

    public getStreamIds(): string[] {
        return Array.from(this.streams.keys())
    }

    public onNetworkStatusChanged(isOnline: boolean) {
        this.log('network status changed. Network online?', isOnline)
        if (isOnline) {
            // immediate retry if the network comes back online
            this.log('back online, release retry wait', { syncState: this.syncState })
            this.syncedStreamsLoop?.releaseRetryWait?.()
        }
    }

    private async initializeStreamBatch(streams: Array<{ stream: SyncedStream }>) {
        const startTime = performance.now()
        await Promise.all(
            streams.map(async ({ stream }) => {
                try {
                    // Check cache first
                    const cached = this.streamCache.get(stream.streamId)
                    if (cached) {
                        this.logSync('Using cached stream', stream.streamId)
                        cached.lastAccessed = Date.now()
                        return
                    }

                    await stream.initializeFromPersistence()
                    this.streamCache.set(
                        stream.streamId,
                        this.createCacheEntry(
                            stream,
                            this.highPriorityIds.has(stream.streamId) ? 2 : 0,
                            false,
                            0,
                        ),
                    )
                } catch (error) {
                    this.logger.error('Error initializing stream', {
                        streamId: stream.streamId,
                        error: error instanceof Error ? error.message : String(error),
                    })
                }
            }),
        )
        const duration = performance.now() - startTime
        this.logSync('Batch initialization complete', { count: streams.length, duration })
    }

    public async startSyncStreams() {
        const coldStartTime = performance.now()
        this.logSync('Starting cold start initialization')

        if (this.initializationPromise) {
            await this.initializationPromise
            return
        }

        const streamRecords = Array.from(this.streams.values())
            .filter((x) => isDefined(x.syncCookie))
            .map((stream) => ({ syncCookie: stream.syncCookie!, stream }))

        // Sort streams by priority with optimized filtering
        const highPriorityStreams = []
        const startTime = performance.now()

        // Single pass stream sorting
        for (const { stream } of streamRecords) {
            if (this.highPriorityIds.has(stream.streamId)) {
                highPriorityStreams.push({ stream })
            } else {
                this.normalPriorityStreams.add(stream.streamId)
            }
        }

        // Prefetch high priority streams in parallel
        if (highPriorityStreams.length > 0) {
            const highPriorityStartTime = performance.now()
            this.logSync('Starting high priority streams initialization', {
                count: highPriorityStreams.length,
                startTime: highPriorityStartTime,
            })
            await Promise.all(
                highPriorityStreams.map(async ({ stream }) => {
                    try {
                        await stream.initializeFromPersistence()
                        this.streamCache.set(
                            stream.streamId,
                            this.createCacheEntry(stream, 2, false, 0),
                        )
                    } catch (error) {
                        this.logger.error('Error prefetching high priority stream', {
                            streamId: stream.streamId,
                            error: error instanceof Error ? error.message : String(error),
                        })
                    }
                }),
            )
            const highPriorityDuration = performance.now() - highPriorityStartTime
            this.logSync('High priority streams initialized', {
                count: highPriorityStreams.length,
                duration: highPriorityDuration,
            })
        }

        // Start timing low priority streams
        const lowPriorityStartTime = performance.now()
        this.logSync('Starting low priority streams initialization', {
            count: this.normalPriorityStreams.size,
            startTime: lowPriorityStartTime,
        })

        // Set up optimized preload queue for normal priority streams
        const batchSize = Math.max(
            MIN_BATCH_SIZE,
            Math.min(DEFAULT_BATCH_SIZE, Math.ceil(this.normalPriorityStreams.size / 3)),
        )
        this.preloadQueue = Array.from(this.normalPriorityStreams)
            .slice(batchSize)
            .map((streamId) => streamId)

        this.initializationPromise = (async () => {
            // Initialize first batch of normal priority streams
            const firstBatch = Array.from(this.normalPriorityStreams)
                .slice(0, batchSize)
                .map((streamId) => ({ stream: this.streams.get(streamId)! }))
            if (firstBatch.length > 0) {
                await this.initializeStreamBatch(firstBatch)
            }

            // Start the sync loop
            this.syncedStreamsLoop = new SyncedStreamsLoop(
                this.clientEmitter,
                this.rpcClient,
                streamRecords,
                this.logId,
                this.unpackEnvelopeOpts,
                this.highPriorityIds,
                this.streamOpts,
            )
            this.syncedStreamsLoop.start()

            // Start preloading remaining streams with optimized batching
            if (this.preloadQueue.length > 0) {
                this.preloadNextBatch(this.preloadQueue).catch((error) => {
                    this.logger.error('Error in preload queue', {
                        error: error instanceof Error ? error.message : String(error),
                    })
                })
            }

            const lowPriorityDuration = performance.now() - lowPriorityStartTime
            const totalDuration = performance.now() - coldStartTime

            this.logSync('Cold start complete', {
                highPriorityCount: highPriorityStreams.length,
                normalPriorityCount: this.normalPriorityStreams.size,
                highPriorityDuration: highPriorityStreams.length
                    ? performance.now() - startTime
                    : 0,
                lowPriorityDuration,
                totalDuration,
                streamsFromCache: this.metrics.cacheHits,
                streamsFromNetwork: this.metrics.totalPreloaded - this.metrics.cacheHits,
                failedStreams: this.metrics.failedRetries,
            })
        })()

        await this.initializationPromise
    }

    public async stopSync() {
        if (this.cleanupInterval) {
            window.clearInterval(this.cleanupInterval)
            this.cleanupInterval = undefined
        }
        if (this.gcInterval) {
            window.clearInterval(this.gcInterval)
            this.gcInterval = undefined
        }
        if (this.prewarmInterval) {
            window.clearInterval(this.prewarmInterval)
            this.prewarmInterval = undefined
        }
        this.preloadQueue = []
        this.streamCache.clear()
        await this.syncedStreamsLoop?.stop()
        this.syncedStreamsLoop = undefined
    }

    // adds stream to the sync subscription
    public addStreamToSync(streamId: string, syncCookie: SyncCookie): void {
        if (!this.syncedStreamsLoop) {
            return
        }
        this.log('addStreamToSync', streamId)
        const stream = this.streams.get(streamId)
        if (!stream) {
            // perhaps we called stopSync while loading a stream from persistence
            this.logger.error('streamId not in this.streams, not adding to sync', { streamId })
            return
        }
        this.syncedStreamsLoop.addStreamToSync(streamId, syncCookie, stream)
    }

    // remove stream from the sync subsbscription
    public async removeStreamFromSync(inStreamId: string | Uint8Array): Promise<void> {
        const streamId = streamIdAsString(inStreamId)
        const stream = this.streams.get(streamId)
        if (!stream) {
            this.log('removeStreamFromSync streamId not found', streamId)
            // no such stream
            return
        }
        await this.syncedStreamsLoop?.removeStreamFromSync(streamId)
        this.streams.delete(streamId)
    }

    private log(...args: unknown[]): void {
        this.logSync(...args)
    }

    private async initializeStream(streamId: string): Promise<void> {
        const stream = this.streams.get(streamId)
        if (!stream) {
            this.logger.error(`Stream not found: ${streamId}`)
            return
        }
        await stream.initializeFromPersistence()

        // Ensure cache entry exists with all required properties
        if (!this.streamCache.has(streamId)) {
            this.streamCache.set(streamId, {
                stream,
                lastAccessed: Date.now(),
                priority: this.highPriorityIds.has(streamId) ? 2 : 0,
                retryCount: 0,
                accessCount: 0,
                memoryUsage: this.calculateStreamMemoryUsage(stream),
                isPrewarmed: false,
            })
        }
    }

    private startPrewarmInterval(): void {
        this.prewarmInterval = window.setInterval(() => {
            void this.prewarmFrequentStreams().catch((error) => {
                this.logger.error('Error in prewarm interval', {
                    error: error instanceof Error ? error.message : String(error),
                })
            })
        }, PREWARM_INTERVAL)
    }

    private async prewarmFrequentStreams(): Promise<void> {
        const frequentStreams = Array.from(this.streamCache.entries())
            .filter(([, entry]) => !entry.isPrewarmed && entry.accessCount >= PREWARM_THRESHOLD)
            .sort((a, b) => b[1].accessCount - a[1].accessCount)
            .slice(0, MAX_PREWARM_STREAMS)

        for (const [id, entry] of frequentStreams) {
            try {
                await entry.stream.initializeFromPersistence()
                entry.isPrewarmed = true
                entry.lastAccessed = Date.now()
                entry.accessCount++
                this.logSync('Prewarmed stream', {
                    streamId: id,
                    accessCount: entry.accessCount,
                })
            } catch (error) {
                this.logger.error('Failed to prewarm stream', {
                    streamId: id,
                    error: error instanceof Error ? error.message : String(error),
                })
            }
        }
    }
}
