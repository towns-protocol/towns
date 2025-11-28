/**
 * Configuration options for the event deduplication cache.
 */
export interface EventDedupConfig {
    /**
     * Maximum number of event IDs to store per stream.
     * When exceeded, oldest entries are removed (FIFO).
     */
    maxSizePerStream?: number
}

const DEFAULT_MAX_SIZE_PER_STREAM = 15000

/**
 * In-memory deduplication cache for bot events, organized per stream.
 *
 * The App Registry may send duplicate events during restarts or replays.
 * This cache tracks recently seen event IDs to prevent duplicate processing.
 *
 * Each stream has its own cache to prevent hot streams from evicting
 * events from quieter streams.
 *
 * @example
 * ```typescript
 * const dedup = new EventDedup({ maxSizePerStream: 1000 })
 *
 * // Check and add in one call
 * if (dedup.checkAndAdd(streamId, eventId)) {
 *   // Duplicate - skip processing
 *   return
 * }
 * // Not a duplicate - process the event
 * ```
 */
export class EventDedup {
    // Map from streamId to Set of eventIds
    private readonly caches: Map<string, Set<string>> = new Map()
    private readonly maxSizePerStream: number

    constructor(config: EventDedupConfig = {}) {
        this.maxSizePerStream = config.maxSizePerStream ?? DEFAULT_MAX_SIZE_PER_STREAM
    }

    /**
     * Check if an event ID has been seen recently for a specific stream.
     * Does not modify the cache.
     *
     * Note: Map.get() and Set.has() are both O(1) average - they use
     * hash tables internally, not linear scans.
     */
    has(streamId: string, eventId: string): boolean {
        const streamCache = this.caches.get(streamId)
        return streamCache?.has(eventId) ?? false
    }

    /**
     * Add an event ID to the cache for a specific stream.
     * If the stream's cache is full, removes oldest entries (FIFO).
     */
    add(streamId: string, eventId: string): void {
        let streamCache = this.caches.get(streamId)
        if (!streamCache) {
            streamCache = new Set()
            this.caches.set(streamId, streamCache)
        }

        // Evict oldest entry if at capacity for this stream
        if (streamCache.size >= this.maxSizePerStream) {
            const oldest = streamCache.values().next().value
            if (oldest !== undefined) {
                streamCache.delete(oldest)
            }
        }

        streamCache.add(eventId)
    }

    /**
     * Check if an event ID is a duplicate and add it to the cache if not.
     * Returns true if the event was already seen (duplicate), false otherwise.
     *
     * This is the recommended method for deduplication as it combines
     * the check and add in a single atomic operation.
     */
    checkAndAdd(streamId: string, eventId: string): boolean {
        if (this.has(streamId, eventId)) {
            // eslint-disable-next-line no-console
            console.warn('[@towns-protocol/bot] duplicate event detected', {
                streamId,
                eventId,
            })
            return true
        }
        this.add(streamId, eventId)
        return false
    }

    /**
     * Clear all entries from all stream caches.
     * Useful for testing.
     */
    clear(): void {
        this.caches.clear()
    }

    /**
     * Get the total number of events across all streams.
     * Useful for testing and monitoring.
     */
    get size(): number {
        let total = 0
        for (const cache of this.caches.values()) {
            total += cache.size
        }
        return total
    }

    /**
     * Get the number of streams being tracked.
     * Useful for testing and monitoring.
     */
    get streamCount(): number {
        return this.caches.size
    }
}
