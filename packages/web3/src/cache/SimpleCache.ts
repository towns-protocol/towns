import TTLCache from '@isaacs/ttlcache'
import { Keyable } from './Keyable'

export class SimpleCache<K extends Keyable, V> {
    private cache: TTLCache<string, V>
    private pendingFetches: Map<string, Promise<V>> = new Map()

    /**
     * @param ttlSeconds Optional time-to-live for cache entries in seconds. If not provided, cache entries do not expire.
     * @param maxSize Optional maximum number of entries in the cache.
     */
    constructor(args: { ttlSeconds?: number; maxSize?: number } = {}) {
        const ttlMilliseconds = args.ttlSeconds !== undefined ? args.ttlSeconds * 1000 : Infinity
        const maxSize = args.maxSize ?? 10_000
        this.cache = new TTLCache({
            ttl: ttlMilliseconds,
            max: maxSize,
        })
    }

    get(key: K): V | undefined {
        return this.cache.get(key.toKey())
    }

    add(key: K, value: V): void {
        this.cache.set(key.toKey(), value)
    }

    remove(key: K): void {
        this.cache.delete(key.toKey())
    }

    clear(): void {
        this.cache.clear()
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

        // 1. Check main cache
        if (opts?.skipCache !== true) {
            const cachedValue = this.cache.get(cacheKey)
            if (cachedValue !== undefined) {
                return cachedValue
            }
        }

        // 2. Check for pending fetch
        const pendingPromise = this.pendingFetches.get(cacheKey)
        if (pendingPromise) {
            return pendingPromise // Return existing promise
        }

        // 3. No cached value, no pending fetch: Initiate fetch
        const fetchPromise = fetchFn(key).catch((err) => {
            this.pendingFetches.delete(cacheKey)
            throw err
        })

        this.pendingFetches.set(cacheKey, fetchPromise)

        try {
            const fetchedValue = await fetchPromise
            // Add to main cache only on successful fetch
            this.cache.set(cacheKey, fetchedValue)
            return fetchedValue
        } finally {
            // Remove from pending fetches regardless of success or failure
            this.pendingFetches.delete(cacheKey)
        }
    }
}
