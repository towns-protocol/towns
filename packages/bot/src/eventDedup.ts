/**
 * Configuration options for the event deduplication cache.
 */
export interface EventDedupConfig {
    /**
     * Maximum number of event IDs to store in the cache.
     * When exceeded, oldest entries are removed.
     */
    maxSize?: number
}

const DEFAULT_MAX_SIZE = 10000

/**
 * In-memory deduplication cache for bot events.
 *
 * The App Registry may send duplicate events during restarts or replays.
 * This cache tracks recently seen event IDs to prevent duplicate processing.
 *
 * The cache is bounded by maximum entry count to prevent unbounded memory growth.
 * When the limit is reached, oldest entries are evicted (FIFO).
 *
 * @example
 * ```typescript
 * const dedup = new EventDedup({ maxSize: 5000 })
 *
 * // Check and add in one call
 * if (dedup.checkAndAdd(eventId)) {
 *   // Duplicate - skip processing
 *   return
 * }
 * // Not a duplicate - process the event
 * ```
 */
export class EventDedup {
    private readonly cache: Set<string> = new Set()
    private readonly maxSize: number

    constructor(config: EventDedupConfig = {}) {
        this.maxSize = config.maxSize ?? DEFAULT_MAX_SIZE
    }

    /**
     * Check if an event ID has been seen recently.
     * Does not modify the cache.
     *
     * Note: Set.has() is O(1) average - it uses a hash table internally,
     * not a linear scan.
     */
    has(eventId: string): boolean {
        return this.cache.has(eventId)
    }

    /**
     * Add an event ID to the cache.
     * If the cache is full, removes oldest entries.
     */
    add(eventId: string): void {
        // Evict oldest entry if at capacity
        if (this.cache.size >= this.maxSize) {
            const oldest = this.cache.values().next().value
            if (oldest !== undefined) {
                this.cache.delete(oldest)
            }
        }

        this.cache.add(eventId)
    }

    /**
     * Check if an event ID is a duplicate and add it to the cache if not.
     * Returns true if the event was already seen (duplicate), false otherwise.
     *
     * This is the recommended method for deduplication as it combines
     * the check and add in a single atomic operation.
     */
    checkAndAdd(eventId: string): boolean {
        if (this.has(eventId)) {
            // eslint-disable-next-line no-console
        console.warn('[@towns-protocol/bot] duplicate event detected', { eventId })
            return true
        }
        this.add(eventId)
        return false
    }

    /**
     * Clear all entries from the cache.
     * Useful for testing.
     */
    clear(): void {
        this.cache.clear()
    }

    /**
     * Get the current number of entries in the cache.
     * Useful for testing and monitoring.
     */
    get size(): number {
        return this.cache.size
    }
}
