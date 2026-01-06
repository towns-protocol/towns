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

export class EntitlementCache<K extends Keyable, V> {
    private readonly negativeStorage: ReturnType<CreateStorageFn<CacheResult<V>>>
    private readonly positiveStorage: ReturnType<CreateStorageFn<CacheResult<V>>>

    constructor(options?: EntitlementCacheOptions<V>) {
        const positiveCacheTTLSeconds = options?.positiveCacheTTLSeconds ?? 15 * 60
        const negativeCacheTTLSeconds = options?.negativeCacheTTLSeconds ?? 2
        const positiveCacheSize = options?.positiveCacheSize ?? 10000
        const negativeCacheSize = options?.negativeCacheSize ?? 10000

        const createFn = options?.createStorageFn ?? createDefaultStorage

        this.negativeStorage = createFn({
            ttlMs: negativeCacheTTLSeconds * 1000,
            maxSize: negativeCacheSize,
            keyPrefix: 'neg',
        })

        this.positiveStorage = createFn({
            ttlMs: positiveCacheTTLSeconds * 1000,
            maxSize: positiveCacheSize,
            keyPrefix: 'pos',
        })
    }

    async invalidate(keyable: K): Promise<void> {
        const key = keyable.toKey()
        await Promise.all([this.negativeStorage.delete(key), this.positiveStorage.delete(key)])
    }

    async executeUsingCache(
        keyable: K,
        onCacheMiss: (k: K) => Promise<CacheResult<V>>,
    ): Promise<CacheResult<V>> {
        const key = keyable.toKey()

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
    }
}
