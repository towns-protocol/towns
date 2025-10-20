/**
 * @group main
 */

import { SimpleCache } from '../src/reads/cache/simpleCache'
import { Keyable } from '../src/reads/cache/keyable'
import { describe, it, expect } from 'vitest'

class TestKey implements Keyable {
    private readonly key: string
    toKey(): string {
        return this.key
    }
    constructor(key: string) {
        this.key = key
    }
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

describe('SimpleCacheTests', () => {
    it('should cache and retrieve values', async () => {
        const cache = new SimpleCache<TestKey, string>()
        let fetchCount = 0
        const fetchFn = async (_key: TestKey): Promise<string> => {
            fetchCount++
            return 'test-value'
        }

        const key = new TestKey('key1')

        // First call: should fetch
        const value1 = await cache.executeUsingCache(key, fetchFn)
        expect(value1).toBe('test-value')
        expect(fetchCount).toBe(1)

        // Second call: should hit cache
        const value2 = await cache.executeUsingCache(key, fetchFn)
        expect(value2).toBe('test-value')
        expect(fetchCount).toBe(1) // Fetch count should not increase

        // Direct get: should hit cache
        const value3 = cache.get(key)
        expect(value3).toBe('test-value')
    })

    it('should expire values after TTL', async () => {
        const ttlSeconds = 1
        const cache = new SimpleCache<TestKey, number>({ ttlSeconds })
        let fetchCount = 0
        const fetchFn = async (_key: TestKey): Promise<number> => {
            fetchCount++
            return Date.now()
        }

        const key = new TestKey('key-ttl')

        // First call: should fetch
        const value1 = await cache.executeUsingCache(key, fetchFn)
        expect(fetchCount).toBe(1)

        // Immediate get: should hit cache
        const value2 = cache.get(key)
        expect(value2).toBe(value1)

        // Wait for TTL to expire (plus a buffer)
        await wait(ttlSeconds * 1000 + 500)

        // Get after expiration: should be undefined
        const value3 = cache.get(key)
        expect(value3).toBeUndefined()

        // Execute after expiration: should fetch again
        const value4 = await cache.executeUsingCache(key, fetchFn)
        expect(fetchCount).toBe(2)
        expect(value4).not.toBe(value1) // Should be a new timestamp
    })

    it('should not expire values without TTL', async () => {
        const cache = new SimpleCache<TestKey, number>() // No TTL
        let fetchCount = 0
        const fetchFn = async (_key: TestKey): Promise<number> => {
            fetchCount++
            return 123
        }

        const key = new TestKey('key-no-ttl')

        // First call: should fetch
        const value1 = await cache.executeUsingCache(key, fetchFn)
        expect(value1).toBe(123)
        expect(fetchCount).toBe(1)

        await wait(1000)

        // Get after waiting: should still be cached
        const value2 = cache.get(key)
        expect(value2).toBe(123)

        // Execute after waiting: should hit cache
        const value3 = await cache.executeUsingCache(key, fetchFn)
        expect(value3).toBe(123)
        expect(fetchCount).toBe(1) // Fetch count should not increase
    })

    it('should remove values using remove()', async () => {
        const cache = new SimpleCache<TestKey, string>()
        const key = new TestKey('key-remove')
        const value = 'value-to-remove'

        // Add value directly
        cache.add(key, value)

        // Verify it's cached
        expect(cache.get(key)).toBe(value)

        // Remove the value
        cache.remove(key)

        // Verify it's removed
        expect(cache.get(key)).toBeUndefined()

        // Test remove via executeUsingCache
        let fetchCount = 0
        const fetchFn = async (_key: TestKey): Promise<string> => {
            fetchCount++
            return 'fetched-after-remove'
        }
        await cache.executeUsingCache(key, fetchFn) // Add it back via execute
        expect(cache.get(key)).toBe('fetched-after-remove')
        expect(fetchCount).toBe(1)

        cache.remove(key)
        expect(cache.get(key)).toBeUndefined()

        // Execute again, should fetch
        await cache.executeUsingCache(key, fetchFn)
        expect(fetchCount).toBe(2)
        expect(cache.get(key)).toBe('fetched-after-remove')
    })

    it('should clear all values using clear()', async () => {
        const cache = new SimpleCache<TestKey, number>()
        const key1 = new TestKey('key-clear-1')
        const key2 = new TestKey('key-clear-2')

        cache.add(key1, 1)
        cache.add(key2, 2)

        // Verify items are cached
        expect(cache.get(key1)).toBe(1)
        expect(cache.get(key2)).toBe(2)

        // Clear the cache
        cache.clear()

        // Verify items are removed
        expect(cache.get(key1)).toBeUndefined()
        expect(cache.get(key2)).toBeUndefined()
    })
})
