import { Keyable } from './Keyable'
import { CreateStorageFn } from './ICacheStorage'
import { createDefaultStorage } from './TTLCacheStorage'

export interface CacheResult<V> {
    value: V
    cacheHit: boolean
    isPositive: boolean
}

export interface EntitlementCacheOptions<V> {
    positiveCacheTTLSeconds?: number
    negativeCacheTTLSeconds?: number
    positiveCacheSize?: number
    negativeCacheSize?: number
    /** Factory function to create storage. Defaults to in-memory TTLCacheStorage */
    createStorageFn?: CreateStorageFn<CacheResult<V>>
}

export class EntitlementCache<V> {
    private readonly negativeStorage: ReturnType<CreateStorageFn<CacheResult<V>>>
    private readonly positiveStorage: ReturnType<CreateStorageFn<CacheResult<V>>>
    private readonly pendingFetches: Map<string, Promise<CacheResult<V>>> = new Map()

    constructor(options: EntitlementCacheOptions<V>) {
        const positiveCacheTTLSeconds = options?.positiveCacheTTLSeconds ?? 15 * 60
        const negativeCacheTTLSeconds = options?.negativeCacheTTLSeconds ?? 2
        const positiveCacheSize = options?.positiveCacheSize ?? 10000
        const negativeCacheSize = options?.negativeCacheSize ?? 10000

        const createFn = options?.createStorageFn ?? createDefaultStorage

        this.negativeStorage = createFn({
            ttlMs: negativeCacheTTLSeconds * 1000,
            maxSize: negativeCacheSize,
            keyPostfix: 'neg',
        })

        this.positiveStorage = createFn({
            ttlMs: positiveCacheTTLSeconds * 1000,
            maxSize: positiveCacheSize,
            keyPostfix: 'pos',
        })
    }

    async invalidate(keyable: Keyable): Promise<void> {
        const key = keyable.toKey()
        // Clear pending fetch first to prevent returning stale in-flight data
        this.pendingFetches.delete(key)
        await Promise.all([this.negativeStorage.delete(key), this.positiveStorage.delete(key)])
    }

    async executeUsingCache(
        keyable: Keyable,
        onCacheMiss: (k: Keyable) => Promise<CacheResult<V>>,
    ): Promise<CacheResult<V>> {
        const key = keyable.toKey()

        // 1. Check for pending fetch FIRST (synchronous check before any await)
        // This prevents race conditions where concurrent calls interleave
        const pendingPromise = this.pendingFetches.get(key)
        if (pendingPromise) {
            return pendingPromise
        }

        // 2. Create promise that checks caches then fetches if needed
        // Store it synchronously BEFORE any await to prevent races
        const operationPromise = (async (): Promise<CacheResult<V>> => {
            const negativeCacheResult = await this.negativeStorage.get(key)
            if (negativeCacheResult !== undefined) {
                negativeCacheResult.cacheHit = true
                return negativeCacheResult
            }

            const positiveCacheResult = await this.positiveStorage.get(key)
            if (positiveCacheResult !== undefined) {
                positiveCacheResult.cacheHit = true
                return positiveCacheResult
            }

            const result = await onCacheMiss(keyable)
            if (result.isPositive) {
                await this.positiveStorage.set(key, result)
            } else {
                await this.negativeStorage.set(key, result)
            }

            return result
        })()

        this.pendingFetches.set(key, operationPromise)

        try {
            return await operationPromise
        } finally {
            this.pendingFetches.delete(key)
        }
    }
}
