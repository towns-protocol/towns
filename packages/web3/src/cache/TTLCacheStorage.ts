import TTLCache from '@isaacs/ttlcache'
import { ICacheStorage, CacheStorageConfig } from './ICacheStorage'

/**
 * In-memory cache storage implementation using TTLCache
 * This is the default storage backend for SimpleCache and EntitlementCache
 */
export class TTLCacheStorage<V> implements ICacheStorage<V> {
    private readonly cache: TTLCache<string, V>
    private readonly defaultTtlMs: number

    constructor(config?: CacheStorageConfig) {
        this.defaultTtlMs = config?.ttlMs ?? Infinity
        this.cache = new TTLCache({
            ttl: this.defaultTtlMs,
            max: config?.maxSize ?? 10_000,
        })
    }

    async get(key: string): Promise<V | undefined> {
        return this.cache.get(key)
    }

    async set(key: string, value: V, ttlMs?: number): Promise<void> {
        if (ttlMs !== undefined) {
            this.cache.set(key, value, { ttl: ttlMs })
        } else {
            this.cache.set(key, value)
        }
    }

    async delete(key: string): Promise<void> {
        this.cache.delete(key)
    }

    async clear(): Promise<void> {
        this.cache.clear()
    }
}

/**
 * Default factory function that creates in-memory TTLCacheStorage
 */
export function createDefaultStorage<V>(config: CacheStorageConfig): ICacheStorage<V> {
    return new TTLCacheStorage<V>(config)
}
