import { Keyable } from './Keyable'
import { ICacheStorage, CreateStorageFn } from './ICacheStorage'
import { createDefaultStorage } from './TTLCacheStorage'

export interface SimpleCacheOptions<V> {
    ttlSeconds?: number
    maxSize?: number
    /** Factory function to create storage. Defaults to in-memory TTLCacheStorage */
    createStorageFn?: CreateStorageFn<V>
}

export class SimpleCache<K extends Keyable, V> {
    private readonly storage: ICacheStorage<V>
    private pendingFetches: Map<string, Promise<V>> = new Map()

    /**
     * @param options.ttlSeconds Optional time-to-live for cache entries in seconds. If not provided, cache entries do not expire.
     * @param options.maxSize Optional maximum number of entries in the cache.
     * @param options.createStorageFn Optional factory to create storage backend. Defaults to in-memory TTLCache.
     */
    constructor(options: SimpleCacheOptions<V> = {}) {
        const ttlMs = options.ttlSeconds !== undefined ? options.ttlSeconds * 1000 : undefined
        const createFn = options.createStorageFn ?? createDefaultStorage
        this.storage = createFn({
            ttlMs,
            maxSize: options.maxSize,
        })
    }

    async get(key: K): Promise<V | undefined> {
        return this.storage.get(key.toKey())
    }

    async add(key: K, value: V): Promise<void> {
        return this.storage.set(key.toKey(), value)
    }

    async remove(key: K): Promise<void> {
        return this.storage.delete(key.toKey())
    }

    async clear(): Promise<void> {
        if (this.storage.clear) {
            return this.storage.clear()
        }
    }

    /**
     * Executes a function to fetch a value if it's not in the cache,
     * stores the result, and returns it.
     */
    async executeUsingCache(
        key: K,
        fetchFn: (key: K) => Promise<V>,
        opts?: { skipCache?: boolean },
    ): Promise<V> {
        const cacheKey = key.toKey()

        // 1. Check for pending fetch FIRST (synchronous check before any await)
        // This prevents race conditions where concurrent calls interleave
        const pendingPromise = this.pendingFetches.get(cacheKey)
        if (pendingPromise) {
            return pendingPromise
        }

        // 2. Create promise that checks cache then fetches if needed
        // Store it synchronously BEFORE any await to prevent races
        const operationPromise = (async (): Promise<V> => {
            // Check main cache
            if (opts?.skipCache !== true) {
                const cachedValue = await this.storage.get(cacheKey)
                if (cachedValue !== undefined) {
                    return cachedValue
                }
            }

            // No cached value: Initiate fetch
            const fetchedValue = await fetchFn(key)
            // Add to main cache only on successful fetch
            await this.storage.set(cacheKey, fetchedValue)
            return fetchedValue
        })()

        this.pendingFetches.set(cacheKey, operationPromise)

        try {
            return await operationPromise
        } finally {
            // Remove from pending fetches regardless of success or failure
            this.pendingFetches.delete(cacheKey)
        }
    }
}
