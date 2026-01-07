/**
 * @group main
 */

import { KVCacheStorage, KVNamespace } from '../src/cache/KVCacheStorage'
import { describe, it, expect, beforeEach } from 'vitest'

/**
 * Creates a mock ethers.js struct output - an array with named properties.
 * This mimics how ethers.js represents Solidity structs.
 */
function createEthersStructOutput<T extends unknown[]>(
    values: T,
    names: string[],
): T & Record<string, unknown> {
    const result = [...values] as T & Record<string, unknown>
    for (let i = 0; i < names.length && i < values.length; i++) {
        result[names[i]] = values[i]
    }
    return result
}

/**
 * Mock KVNamespace that stores values in memory
 */
class MockKVNamespace implements KVNamespace {
    private storage = new Map<string, string>()

    async get(key: string): Promise<string | null> {
        return this.storage.get(key) ?? null
    }

    async put(key: string, value: string): Promise<void> {
        this.storage.set(key, value)
    }

    async delete(key: string): Promise<void> {
        this.storage.delete(key)
    }

    async list(): Promise<{
        keys: { name: string; expiration?: number; metadata?: unknown }[]
        list_complete: boolean
        cursor?: string
    }> {
        return {
            keys: Array.from(this.storage.keys()).map((name) => ({ name })),
            list_complete: true,
        }
    }

    // Helper to inspect raw stored values for testing
    getRaw(key: string): string | undefined {
        return this.storage.get(key)
    }
}

describe('KVCacheStorage', () => {
    let mockKV: MockKVNamespace

    beforeEach(() => {
        mockKV = new MockKVNamespace()
    })

    describe('ethers struct output serialization', () => {
        it('should preserve named properties on ethers struct outputs after round-trip', async () => {
            const cache = new KVCacheStorage<unknown>(mockKV, {
                keyPostfix: '',
                ttlMs: 60000,
            })

            // Create a mock ethers struct output like getEntitlements() returns
            // This is an array with both indices AND named properties
            const entitlement = createEthersStructOutput(
                ['User Entitlement', '0x5264b2A880f54c61727400bF08b99d1f146052BE', 'UserEntitlement', true],
                ['name', 'moduleAddress', 'moduleType', 'isImmutable'],
            )

            // Verify it has both array access and named properties before caching
            expect(entitlement[0]).toBe('User Entitlement')
            expect(entitlement.name).toBe('User Entitlement')
            expect(entitlement[1]).toBe('0x5264b2A880f54c61727400bF08b99d1f146052BE')
            expect(entitlement.moduleAddress).toBe('0x5264b2A880f54c61727400bF08b99d1f146052BE')
            expect(entitlement[2]).toBe('UserEntitlement')
            expect(entitlement.moduleType).toBe('UserEntitlement')
            expect(entitlement[3]).toBe(true)
            expect(entitlement.isImmutable).toBe(true)

            // Store in cache
            await cache.set('testKey', entitlement)

            // Retrieve from cache
            const retrieved = (await cache.get('testKey')) as typeof entitlement

            // Verify named properties are preserved
            expect(retrieved).toBeDefined()
            expect(retrieved.name).toBe('User Entitlement')
            expect(retrieved.moduleAddress).toBe('0x5264b2A880f54c61727400bF08b99d1f146052BE')
            expect(retrieved.moduleType).toBe('UserEntitlement')
            expect(retrieved.isImmutable).toBe(true)

            // Verify array access still works
            expect(retrieved[0]).toBe('User Entitlement')
            expect(retrieved[1]).toBe('0x5264b2A880f54c61727400bF08b99d1f146052BE')
            expect(retrieved[2]).toBe('UserEntitlement')
            expect(retrieved[3]).toBe(true)
        })

        it('should preserve named properties on arrays of ethers struct outputs', async () => {
            const cache = new KVCacheStorage<unknown>(mockKV, {
                keyPostfix: '',
                ttlMs: 60000,
            })

            // Create multiple entitlements like getEntitlements() returns
            const entitlements = [
                createEthersStructOutput(
                    ['User Entitlement', '0x5264b2A880f54c61727400bF08b99d1f146052BE', 'UserEntitlement', true],
                    ['name', 'moduleAddress', 'moduleType', 'isImmutable'],
                ),
                createEthersStructOutput(
                    ['Rule Entitlement V2', '0x04C2EDe8fC5edC5802588a840FbF7136c3686Fba', 'RuleEntitlementV2', true],
                    ['name', 'moduleAddress', 'moduleType', 'isImmutable'],
                ),
            ]

            // Store in cache
            await cache.set('entitlements', entitlements)

            // Retrieve from cache
            const retrieved = (await cache.get('entitlements')) as typeof entitlements

            // Verify array length
            expect(retrieved).toHaveLength(2)

            // Verify first entitlement
            expect(retrieved[0].name).toBe('User Entitlement')
            expect(retrieved[0].moduleAddress).toBe('0x5264b2A880f54c61727400bF08b99d1f146052BE')
            expect(retrieved[0].moduleType).toBe('UserEntitlement')
            expect(retrieved[0].isImmutable).toBe(true)
            expect(retrieved[0][0]).toBe('User Entitlement')
            expect(retrieved[0][1]).toBe('0x5264b2A880f54c61727400bF08b99d1f146052BE')

            // Verify second entitlement
            expect(retrieved[1].name).toBe('Rule Entitlement V2')
            expect(retrieved[1].moduleAddress).toBe('0x04C2EDe8fC5edC5802588a840FbF7136c3686Fba')
            expect(retrieved[1].moduleType).toBe('RuleEntitlementV2')
            expect(retrieved[1].isImmutable).toBe(true)
            expect(retrieved[1][0]).toBe('Rule Entitlement V2')
            expect(retrieved[1][1]).toBe('0x04C2EDe8fC5edC5802588a840FbF7136c3686Fba')
        })

        it('should handle nested ethers struct outputs', async () => {
            const cache = new KVCacheStorage<unknown>(mockKV, {
                keyPostfix: '',
                ttlMs: 60000,
            })

            // Create nested structures
            const nested = {
                outer: createEthersStructOutput(
                    ['outerValue1', 'outerValue2'],
                    ['field1', 'field2'],
                ),
                array: [
                    createEthersStructOutput(['inner1'], ['innerField']),
                    createEthersStructOutput(['inner2'], ['innerField']),
                ],
            }

            // Store in cache
            await cache.set('nested', nested)

            // Retrieve from cache
            const retrieved = (await cache.get('nested')) as typeof nested

            // Verify outer struct
            expect(retrieved.outer.field1).toBe('outerValue1')
            expect(retrieved.outer.field2).toBe('outerValue2')
            expect(retrieved.outer[0]).toBe('outerValue1')
            expect(retrieved.outer[1]).toBe('outerValue2')

            // Verify inner array of structs
            expect(retrieved.array[0].innerField).toBe('inner1')
            expect(retrieved.array[0][0]).toBe('inner1')
            expect(retrieved.array[1].innerField).toBe('inner2')
            expect(retrieved.array[1][0]).toBe('inner2')
        })

        it('should handle regular arrays without named properties', async () => {
            const cache = new KVCacheStorage<unknown>(mockKV, {
                keyPostfix: '',
                ttlMs: 60000,
            })

            const regularArray = [1, 2, 3, 'four', { nested: true }]

            await cache.set('regularArray', regularArray)
            const retrieved = (await cache.get('regularArray')) as typeof regularArray

            expect(retrieved).toEqual([1, 2, 3, 'four', { nested: true }])
            expect(retrieved).toHaveLength(5)
        })

        it('should handle plain objects', async () => {
            const cache = new KVCacheStorage<unknown>(mockKV, {
                keyPostfix: '',
                ttlMs: 60000,
            })

            const plainObject = {
                name: 'test',
                value: 123,
                nested: { deep: true },
            }

            await cache.set('plainObject', plainObject)
            const retrieved = await cache.get('plainObject')

            expect(retrieved).toEqual(plainObject)
        })

        it('should handle primitives', async () => {
            const cache = new KVCacheStorage<unknown>(mockKV, {
                keyPostfix: '',
                ttlMs: 60000,
            })

            await cache.set('string', 'hello')
            await cache.set('number', 42)
            await cache.set('boolean', true)
            await cache.set('null', null)

            expect(await cache.get('string')).toBe('hello')
            expect(await cache.get('number')).toBe(42)
            expect(await cache.get('boolean')).toBe(true)
            expect(await cache.get('null')).toBe(null)
        })
    })

    describe('basic cache operations', () => {
        it('should return undefined for missing keys', async () => {
            const cache = new KVCacheStorage<string>(mockKV, {
                keyPostfix: '',
                ttlMs: 60000,
            })

            const result = await cache.get('nonexistent')
            expect(result).toBeUndefined()
        })

        it('should delete cached values', async () => {
            const cache = new KVCacheStorage<string>(mockKV, {
                keyPostfix: '',
                ttlMs: 60000,
            })

            await cache.set('deleteMe', 'value')
            expect(await cache.get('deleteMe')).toBe('value')

            await cache.delete('deleteMe')
            expect(await cache.get('deleteMe')).toBeUndefined()
        })

        it('should apply key postfix', async () => {
            const cache = new KVCacheStorage<string>(mockKV, {
                keyPostfix: 'postfix',
                ttlMs: 60000,
            })

            await cache.set('key', 'value')

            // The raw key in storage should include the postfix
            expect(mockKV.getRaw('key:postfix')).toBeDefined()
            expect(mockKV.getRaw('key')).toBeUndefined()
        })
    })
})

