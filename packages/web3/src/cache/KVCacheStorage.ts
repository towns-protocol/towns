import { BigNumber } from 'ethers'
import SuperJson from 'superjson'
import TTLCache from '@isaacs/ttlcache'
import { CacheStorageConfig, CreateStorageFn, ICacheStorage } from './ICacheStorage'
import { dlogger } from '@towns-protocol/utils'

const logger = dlogger('web3:kvcache')

/**
 * Configuration options specific to KVCacheStorage
 */
export interface KVCacheStorageConfig extends CacheStorageConfig {
    /**
     * Disable the local in-memory cache layer.
     * When enabled (default), a local TTLCache is used as a synchronous first-level cache
     * before falling back to KV. This is intended for use in workers where the local
     * cache only exists for the duration of a single request, providing fast access
     * for repeated reads within the same request without hitting KV multiple times.
     */
    disableLocalCache?: boolean
}

// Register ethers BigNumber with SuperJSON
SuperJson.registerCustom<BigNumber, string>(
    {
        isApplicable: (v): v is BigNumber => BigNumber.isBigNumber(v),
        serialize: (v) => v.toHexString(),
        deserialize: (v) => BigNumber.from(v),
    },
    'ethers.BigNumber',
)

/**
 * Detects if a value is an ethers.js struct output (array with named properties).
 * These are arrays that have string-keyed properties in addition to numeric indices.
 */
function isEthersStructOutput(value: unknown): value is Array<unknown> & Record<string, unknown> {
    if (!Array.isArray(value)) return false
    const namedKeys = Object.keys(value).filter((key) => isNaN(Number(key)))
    return namedKeys.length > 0
}

/**
 * Converts ethers.js struct outputs to plain objects for proper serialization.
 * Works recursively for nested structures.
 */
function normalizeEthersOutput(value: unknown): unknown {
    if (value === null || value === undefined) {
        return value
    }

    // Let SuperJson's registered BigNumber serializer handle BigNumbers
    // BigNumber properties (_hex, _isBigNumber) are non-enumerable, so Object.entries
    // would return an empty array and corrupt the BigNumber into {}
    if (BigNumber.isBigNumber(value)) {
        return value
    }

    // Handle ethers struct outputs (arrays with named properties)
    if (isEthersStructOutput(value)) {
        const namedKeys = Object.keys(value).filter((key) => isNaN(Number(key)))
        const obj: Record<string, unknown> = { __ethersStruct: true }
        for (const key of namedKeys) {
            obj[key] = normalizeEthersOutput((value as Record<string, unknown>)[key])
        }
        return obj
    }

    // Handle regular arrays (recurse into elements)
    if (Array.isArray(value)) {
        return value.map(normalizeEthersOutput)
    }

    // Handle plain objects (recurse into values)
    if (typeof value === 'object') {
        const obj: Record<string, unknown> = {}
        for (const [key, val] of Object.entries(value)) {
            obj[key] = normalizeEthersOutput(val)
        }
        return obj
    }

    // Primitives pass through unchanged
    return value
}

/**
 * Restores ethers-like struct outputs from normalized objects.
 * The restored object has both array indices and named properties.
 */
function denormalizeEthersOutput(value: unknown): unknown {
    if (value === null || value === undefined) {
        return value
    }

    // Preserve BigNumber objects - they've already been deserialized by SuperJson
    // BigNumber properties are non-enumerable, so Object.entries would corrupt them
    if (BigNumber.isBigNumber(value)) {
        return value
    }

    // Handle normalized ethers struct objects
    if (
        typeof value === 'object' &&
        !Array.isArray(value) &&
        (value as Record<string, unknown>).__ethersStruct === true
    ) {
        const valueObj = value as Record<string, unknown>
        const keys = Object.keys(valueObj).filter((k) => k !== '__ethersStruct')
        // Create array-like object with both indices and named properties
        const result = keys.map((key) => denormalizeEthersOutput(valueObj[key])) as Array<unknown> &
            Record<string, unknown>
        for (let i = 0; i < keys.length; i++) {
            result[keys[i]] = result[i]
        }
        return result
    }

    // Handle regular arrays (recurse into elements)
    if (Array.isArray(value)) {
        return value.map(denormalizeEthersOutput)
    }

    // Handle plain objects (recurse into values)
    if (typeof value === 'object') {
        const obj: Record<string, unknown> = {}
        for (const [key, val] of Object.entries(value)) {
            obj[key] = denormalizeEthersOutput(val)
        }
        return obj
    }

    // Primitives pass through unchanged
    return value
}

/**
 * Cloudflare KV namespace interface
 */
export interface KVNamespace {
    get(
        key: string,
        options?: { type?: 'text' | 'json' | 'arrayBuffer' | 'stream' },
    ): Promise<string | null>
    put(
        key: string,
        value: string,
        options?: { expirationTtl?: number; expiration?: number; metadata?: unknown },
    ): Promise<void>
    delete(key: string): Promise<void>
    list(options?: { prefix?: string; limit?: number; cursor?: string }): Promise<{
        keys: { name: string; expiration?: number; metadata?: unknown }[]
        list_complete: boolean
        cursor?: string
    }>
}

/**
 * Wrapper value stored in KV with expiration metadata
 * This provides belt-and-suspenders TTL checking since KV expiration
 * only provides 60-second minimum granularity
 */
interface KVCacheEntry<V> {
    value: V
    expiresAt: number
}

/**
 * Cloudflare KV-backed cache storage implementation
 * Implements ICacheStorage from @towns-protocol/web3 for use as a SpaceDapp cache backend
 *
 * This implementation includes an optional local in-memory cache layer (enabled by default)
 * that sits in front of KV. This is intended for use in Cloudflare Workers or similar
 * serverless environments where the local cache only exists for the duration of a single
 * request. This provides fast access for repeated reads within the same request without
 * hitting KV multiple times, while still benefiting from KV's persistence across requests.
 */
export class KVCacheStorage<V> implements ICacheStorage<V> {
    private readonly kv: KVNamespace
    private readonly keyPostfix: string
    private readonly defaultTtlMs: number
    private readonly minKVTtlSeconds = 60 // KV minimum TTL
    /**
     * Local in-memory cache that serves as a synchronous first-level cache before KV.
     * In a worker context, this cache only exists for the duration of the request,
     * providing fast repeated access without additional KV reads.
     * TTLCache handles expiration automatically via its built-in TTL support.
     */
    private readonly localCache: TTLCache<string, V> | null

    constructor(kv: KVNamespace, config: KVCacheStorageConfig) {
        this.kv = kv
        this.keyPostfix = config?.keyPostfix ?? ''
        this.defaultTtlMs = config?.ttlMs ?? 15 * 60 * 1000 // 15 minutes default

        // Initialize local cache unless explicitly disabled
        // Uses the same TTL and maxSize config as the KV cache
        this.localCache = config?.disableLocalCache
            ? null
            : new TTLCache<string, V>({
                  ttl: this.defaultTtlMs,
                  max: config?.maxSize ?? 10_000,
              })
    }

    private getKey(key: string): string {
        return this.keyPostfix ? `${key}:${this.keyPostfix}` : key
    }

    async get(key: string): Promise<V | undefined> {
        try {
            // Check local cache first if enabled (synchronous)
            if (this.localCache) {
                const localValue = this.localCache.get(key)
                if (localValue !== undefined) {
                    return localValue
                }
            }

            const cached = await this.kv.get(this.getKey(key))
            if (cached === null) {
                return undefined
            }

            const entry = SuperJson.parse<KVCacheEntry<V>>(cached)

            // Check if expired (belt-and-suspenders with KV TTL)
            if (entry.expiresAt <= Date.now()) {
                // Expired - clean up and return undefined
                void this.kv.delete(this.getKey(key))
                return undefined
            }

            // Denormalize ethers.js struct outputs back to array-like objects with named properties
            const value = denormalizeEthersOutput(entry.value) as V

            // Populate local cache on successful KV fetch with remaining TTL
            if (this.localCache) {
                const remainingTtlMs = entry.expiresAt - Date.now()
                if (remainingTtlMs > 0) {
                    this.localCache.set(key, value, { ttl: remainingTtlMs })
                }
            }

            return value
        } catch (error) {
            logger.error('KVCacheStorage.get error:', error)
            return undefined
        }
    }

    async set(key: string, value: V, ttlMs?: number): Promise<void> {
        try {
            const effectiveTtlMs = ttlMs ?? this.defaultTtlMs
            const expiresAt = Date.now() + effectiveTtlMs

            // Set in local cache if enabled (synchronous)
            if (this.localCache) {
                this.localCache.set(key, value, { ttl: effectiveTtlMs })
            }

            // Normalize ethers.js struct outputs to plain objects for proper serialization
            const normalizedValue = normalizeEthersOutput(value) as V

            const entry: KVCacheEntry<V> = {
                value: normalizedValue,
                expiresAt,
            }

            // KV requires minimum 60 second TTL
            const kvTtlSeconds = Math.max(this.minKVTtlSeconds, Math.ceil(effectiveTtlMs / 1000))

            const valueStr = SuperJson.stringify(entry)

            await this.kv.put(this.getKey(key), valueStr, {
                expirationTtl: kvTtlSeconds,
            })
        } catch (error) {
            logger.error('KVCacheStorage.set error:', error)
        }
    }

    async delete(key: string): Promise<void> {
        try {
            // Delete from local cache if enabled (synchronous)
            if (this.localCache) {
                this.localCache.delete(key)
            }

            await this.kv.delete(this.getKey(key))
        } catch (error) {
            logger.error('KVCacheStorage.delete error:', error)
        }
    }

    // Note: clear() is not implemented for KV as it would require listing all keys
    // and deleting them one by one, which is expensive and slow
}

/**
 * Create a factory function that creates KV-backed cache storage instances
 * This is what you pass to SpaceDapp as the createStorageFn parameter
 *
 * @param kv The Cloudflare or Hosting provider KV namespace
 * @param options Optional configuration for the KV storage (e.g., disableLocalCache)
 * @returns A factory function compatible with SpaceDapp's createStorageFn parameter
 */
export function createKVStorageFactory<V = unknown>(
    kv: KVNamespace,
    options?: Pick<KVCacheStorageConfig, 'disableLocalCache'>,
): CreateStorageFn<V> {
    return (config: CacheStorageConfig): ICacheStorage<V> => {
        // Combine base prefix with config prefix and options
        return new KVCacheStorage<V>(kv, { ...config, ...options })
    }
}
