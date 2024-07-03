import TTLCache from '@isaacs/ttlcache'

export interface Keyable {
    toKey(): string
}

export interface CacheResult<V> {
    value: V
    cacheHit: boolean
    isPositive: boolean
}

export class EntitlementCache<K extends Keyable, V> {
    private readonly negativeCache: TTLCache<string, CacheResult<V>>
    private readonly positiveCache: TTLCache<string, CacheResult<V>>

    constructor(options?: {
        positiveCacheTTLSeconds: number
        negativeCacheTTLSeconds: number
        positiveCacheSize?: number
        negativeCacheSize?: number
    }) {
        const positiveCacheTTLSeconds = options?.positiveCacheTTLSeconds ?? 15 * 60
        const negativeCacheTTLSeconds = options?.negativeCacheTTLSeconds ?? 2
        const positiveCacheSize = options?.positiveCacheSize ?? 10000
        const negativeCacheSize = options?.negativeCacheSize ?? 10000

        this.negativeCache = new TTLCache({
            ttl: negativeCacheTTLSeconds * 1000,
            max: negativeCacheSize,
        })
        this.positiveCache = new TTLCache({
            ttl: positiveCacheTTLSeconds * 1000,
            max: positiveCacheSize,
        })
    }

    async executeUsingCache(
        keyable: K,
        onCacheMiss: (k: K) => Promise<CacheResult<V>>,
    ): Promise<CacheResult<V>> {
        const key = keyable.toKey()
        const negativeCacheResult = this.negativeCache.get(key)
        if (negativeCacheResult !== undefined) {
            negativeCacheResult.cacheHit = true
            return negativeCacheResult
        }

        const positiveCacheResult = this.positiveCache.get(key)
        if (positiveCacheResult !== undefined) {
            positiveCacheResult.cacheHit = true
            return positiveCacheResult
        }

        const result = await onCacheMiss(keyable)
        if (result.isPositive) {
            this.positiveCache.set(key, result)
        } else {
            this.negativeCache.set(key, result)
        }

        return result
    }
}
