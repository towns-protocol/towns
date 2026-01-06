/**
 * Interface for cache storage backends
 * This abstracts the underlying storage mechanism (TTLCache, KV, Redis, etc.)
 */
export interface ICacheStorage<V> {
    /**
     * Get a value from the cache
     * Returns undefined if not found or expired
     */
    get(key: string): Promise<V | undefined>

    /**
     * Set a value in the cache
     * @param key Cache key
     * @param value Value to store
     * @param ttlMs Time-to-live in milliseconds (optional, uses default if not provided)
     */
    set(key: string, value: V, ttlMs?: number): Promise<void>

    /**
     * Delete a value from the cache
     */
    delete(key: string): Promise<void>

    /**
     * Clear all values from the cache (optional - not all implementations support this)
     */
    clear?(): Promise<void>
}

/**
 * Configuration for creating cache storage instances
 */
export interface CacheStorageConfig {
    /** Default TTL in milliseconds */
    ttlMs?: number
    /** Maximum number of entries (for size-limited caches) */
    maxSize?: number
    /** Key prefix (for shared storage backends like KV) */
    keyPrefix?: string
}

/**
 * Factory function type for creating cache storage instances
 * This allows injection of different storage backends (memory, KV, etc.)
 */
export type CreateStorageFn<V> = (config: CacheStorageConfig) => ICacheStorage<V>
