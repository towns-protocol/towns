/**
 * @group main
 */

import { EntitlementCache, Keyable, CacheResult } from './EntitlementCache'

class Key implements Keyable {
    private readonly key: string
    toKey(): string {
        return this.key
    }
    constructor(key: string) {
        this.key = key
    }
}

class BooleanCacheResult implements CacheResult<boolean> {
    value: boolean
    cacheHit: boolean
    isPositive: boolean
    constructor(value: boolean) {
        this.value = value
        this.cacheHit = false
        this.isPositive = value
    }
}

class StringCacheResult implements CacheResult<string> {
    value: string
    cacheHit: boolean
    isPositive: boolean
    constructor(value: string) {
        this.value = value
        this.cacheHit = false
        this.isPositive = value !== ''
    }
}

describe('EntitlementsCacheTests', () => {
    it('caches repeat positive values', async () => {
        const cache = new EntitlementCache<Key, boolean>({
            positiveCacheTTLSeconds: 10,
            negativeCacheTTLSeconds: 10,
        })

        const onMiss = (_: Keyable): Promise<CacheResult<boolean>> => {
            return Promise.resolve(new BooleanCacheResult(true))
        }

        const { value, cacheHit } = await cache.executeUsingCache(new Key('key'), onMiss)
        expect(value).toBe(true)
        expect(cacheHit).toBe(false)

        const { value: value2, cacheHit: cacheHit2 } = await cache.executeUsingCache(
            new Key('key'),
            onMiss,
        )
        expect(value2).toBe(true)
        expect(cacheHit2).toBe(true)
    })

    it('caches repeat negative values', async () => {
        const cache = new EntitlementCache<Key, boolean>({
            positiveCacheTTLSeconds: 10,
            negativeCacheTTLSeconds: 10,
        })

        const onMiss = (_: Keyable): Promise<CacheResult<boolean>> => {
            return Promise.resolve(new BooleanCacheResult(false))
        }

        const { value, cacheHit } = await cache.executeUsingCache(new Key('key'), onMiss)
        expect(value).toBe(false)
        expect(cacheHit).toBe(false)

        const { value: value2, cacheHit: cacheHit2 } = await cache.executeUsingCache(
            new Key('key'),
            onMiss,
        )
        expect(value2).toBe(false)
        expect(cacheHit2).toBe(true)
    })

    it('caches non-boolean positive values', async () => {
        const cache = new EntitlementCache<Key, string>({
            positiveCacheTTLSeconds: 10,
            negativeCacheTTLSeconds: 10,
        })

        const onMiss = (_: Keyable): Promise<CacheResult<string>> => {
            return Promise.resolve(new StringCacheResult('value'))
        }

        const { value, cacheHit } = await cache.executeUsingCache(new Key('key'), onMiss)
        expect(value).toBe('value')
        expect(cacheHit).toBe(false)

        const { value: value2, cacheHit: cacheHit2 } = await cache.executeUsingCache(
            new Key('key'),
            onMiss,
        )
        expect(value2).toBe('value')
        expect(cacheHit2).toBe(true)
    })

    it('caches non-boolean falsy keys', async () => {
        const cache = new EntitlementCache<Key, string>({
            positiveCacheTTLSeconds: 10,
            negativeCacheTTLSeconds: 10,
        })

        const onMiss = (_: Keyable): Promise<CacheResult<string>> => {
            return Promise.resolve(new StringCacheResult(''))
        }

        const { value, cacheHit } = await cache.executeUsingCache(new Key('key'), onMiss)
        expect(value).toBe('')
        expect(cacheHit).toBe(false)

        const { value: value2, cacheHit: cacheHit2 } = await cache.executeUsingCache(
            new Key('key'),
            onMiss,
        )
        expect(value2).toBe('')
        expect(cacheHit2).toBe(true)
    })

    it('positive cache values expire after ttl', async () => {
        const cache = new EntitlementCache<Key, boolean>({
            positiveCacheTTLSeconds: 1,
            negativeCacheTTLSeconds: 10,
        })

        const onMiss = (_: Keyable): Promise<CacheResult<boolean>> => {
            return Promise.resolve(new BooleanCacheResult(true))
        }

        const { value, cacheHit } = await cache.executeUsingCache(new Key('key'), onMiss)
        expect(value).toBe(true)
        expect(cacheHit).toBe(false)

        // Wait 5 seconds for the positive auth cache to expire
        await new Promise((f) => setTimeout(f, 5000))

        const { value: value2, cacheHit: cacheHit2 } = await cache.executeUsingCache(
            new Key('key'),
            onMiss,
        )
        expect(value2).toBe(true)
        expect(cacheHit2).toBe(false)
    })

    it('negative cache values expire after ttl', async () => {
        const cache = new EntitlementCache<Key, boolean>({
            positiveCacheTTLSeconds: 10,
            negativeCacheTTLSeconds: 1,
        })

        const onMiss = (_: Keyable): Promise<CacheResult<boolean>> => {
            return Promise.resolve(new BooleanCacheResult(false))
        }

        const { value, cacheHit } = await cache.executeUsingCache(new Key('key'), onMiss)
        expect(value).toBe(false)
        expect(cacheHit).toBe(false)

        // Wait 5 seconds for the positive auth cache to expire
        await new Promise((f) => setTimeout(f, 1000))

        const { value: value2, cacheHit: cacheHit2 } = await cache.executeUsingCache(
            new Key('key'),
            onMiss,
        )
        expect(value2).toBe(false)
        expect(cacheHit2).toBe(false)
    })
})
