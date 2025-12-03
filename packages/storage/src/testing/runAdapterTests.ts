/**
 * Shared test suite for storage adapters.
 * Any adapter implementation must pass these tests to be considered valid.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import type { StorageAdapter, TableChange } from '../types.js'
import { t } from '../builders.js'
import { table, schema } from '../schema.js'
import { typedAdapter, type TypedStorageAdapter, type Models } from '../types.js'

// ============= Test Schema Definition =============

/**
 * Users table - basic user records.
 */
const usersTable = table('users', {
    id: t.string().primaryKey(),
    name: t.string(),
    email: t.string().nullable(),
    age: t.integer().nullable(),
})

/**
 * Items table - for testing numeric operations.
 */
const itemsTable = table('items', {
    id: t.string().primaryKey(),
    value: t.integer(),
    category: t.string().nullable(),
})

/**
 * Posts table - for join testing (one-to-many with users).
 */
const postsTable = table('posts', {
    id: t.string().primaryKey(),
    title: t.string(),
    content: t.string().nullable(),
    user_id: t.string(),
})

/**
 * Profiles table - for join testing (one-to-one with users).
 */
const profilesTable = table('profiles', {
    id: t.string().primaryKey(),
    bio: t.string().nullable(),
    user_id: t.string(),
})

/**
 * Test schema containing all test tables.
 */
const testSchema = schema('test', {
    tables: [usersTable, itemsTable, postsTable, profilesTable] as const,
    version: 1,
})

// ============= Inferred Types from Schema =============

type TestModels = Models<typeof testSchema>
type TestUser = TestModels['users']
type TestItem = TestModels['items']
type TestPost = TestModels['posts']
type TestProfile = TestModels['profiles']

/**
 * Run the shared adapter test suite.
 *
 * @param name - Name of the adapter (for test description)
 * @param createAdapter - Factory function to create a fresh adapter instance
 * @param cleanup - Optional cleanup function called after each test
 *
 * @example
 * ```typescript
 * import { runAdapterTests } from '@towns-protocol/storage/testing'
 * import { memoryAdapter, createMemoryDB, type MemoryDB } from '@towns-protocol/storage/adapters/memory'
 *
 * let db: MemoryDB
 *
 * runAdapterTests(
 *   'Memory',
 *   async () => {
 *     db = createMemoryDB()
 *     return memoryAdapter(db)
 *   },
 *   async () => {
 *     // Cleanup if needed
 *   }
 * )
 * ```
 */
export function runAdapterTests(
    name: string,
    createAdapter: () => Promise<StorageAdapter>,
    cleanup?: () => Promise<void>,
): void {
    describe(`${name} Adapter`, () => {
        let adapter: TypedStorageAdapter<typeof testSchema>
        let rawAdapter: StorageAdapter

        beforeEach(async () => {
            rawAdapter = await createAdapter()
            adapter = typedAdapter(rawAdapter, testSchema)
        })

        afterEach(async () => {
            await cleanup?.()
        })

        describe('create', () => {
            it('should create a record', async () => {
                const result = await adapter.create({
                    model: 'users',
                    data: { id: '1', name: 'Alice', email: 'alice@example.com' },
                })
                expect(result).toMatchObject({ id: '1', name: 'Alice', email: 'alice@example.com' })
            })

            it('should create multiple records', async () => {
                await adapter.create({ model: 'users', data: { id: '1', name: 'Alice' } })
                await adapter.create({ model: 'users', data: { id: '2', name: 'Bob' } })

                const count = await adapter.count({ model: 'users' })
                expect(count).toBe(2)
            })
        })

        describe('createMany', () => {
            it('should create multiple records in batch', async () => {
                const results = await adapter.createMany({
                    model: 'users',
                    data: [
                        { id: '1', name: 'Alice' },
                        { id: '2', name: 'Bob' },
                        { id: '3', name: 'Charlie' },
                    ],
                })

                expect(results).toHaveLength(3)
                expect(results[0]).toMatchObject({ id: '1', name: 'Alice' })
                expect(results[1]).toMatchObject({ id: '2', name: 'Bob' })
                expect(results[2]).toMatchObject({ id: '3', name: 'Charlie' })

                const count = await adapter.count({ model: 'users' })
                expect(count).toBe(3)
            })

            it('should return empty array when creating empty batch', async () => {
                const results = await adapter.createMany({
                    model: 'users',
                    data: [],
                })

                expect(results).toHaveLength(0)
            })
        })

        describe('findOne', () => {
            it('should find a record by field', async () => {
                await adapter.create({ model: 'users', data: { id: '1', name: 'Alice' } })

                const result = await adapter.findOne({
                    model: 'users',
                    where: [{ field: 'id', value: '1' }],
                })
                expect(result).toMatchObject({ id: '1', name: 'Alice' })
            })

            it('should return null for non-existent record', async () => {
                const result = await adapter.findOne({
                    model: 'users',
                    where: [{ field: 'id', value: 'nonexistent' }],
                })
                expect(result).toBeNull()
            })

            it('should find by multiple where clauses (AND)', async () => {
                await adapter.create({
                    model: 'users',
                    data: { id: '1', name: 'Alice', age: 30 },
                })
                await adapter.create({
                    model: 'users',
                    data: { id: '2', name: 'Alice', age: 25 },
                })

                const result = await adapter.findOne({
                    model: 'users',
                    where: [
                        { field: 'name', value: 'Alice' },
                        { field: 'age', value: 30 },
                    ],
                })
                expect(result).toMatchObject({ id: '1', name: 'Alice', age: 30 })
            })
        })

        describe('findMany', () => {
            it('should find multiple records', async () => {
                await adapter.create({ model: 'users', data: { id: '1', name: 'Alice' } })
                await adapter.create({ model: 'users', data: { id: '2', name: 'Bob' } })

                const results = await adapter.findMany({ model: 'users' })
                expect(results).toHaveLength(2)
            })

            it('should filter with where clause', async () => {
                await adapter.create({ model: 'users', data: { id: '1', name: 'Alice' } })
                await adapter.create({ model: 'users', data: { id: '2', name: 'Bob' } })

                const results = await adapter.findMany({
                    model: 'users',
                    where: [{ field: 'name', value: 'Alice' }],
                })
                expect(results).toHaveLength(1)
                expect(results[0]).toMatchObject({ name: 'Alice' })
            })

            it('should support limit', async () => {
                for (let i = 0; i < 5; i++) {
                    await adapter.create({
                        model: 'users',
                        data: { id: String(i), name: `User${i}` },
                    })
                }

                const results = await adapter.findMany({
                    model: 'users',
                    limit: 2,
                })
                expect(results).toHaveLength(2)
            })

            it('should support offset', async () => {
                for (let i = 0; i < 5; i++) {
                    await adapter.create({
                        model: 'users',
                        data: { id: String(i), name: `User${i}` },
                    })
                }

                const results = await adapter.findMany({
                    model: 'users',
                    offset: 3,
                })
                expect(results).toHaveLength(2)
            })

            it('should support limit and offset together', async () => {
                for (let i = 0; i < 5; i++) {
                    await adapter.create({
                        model: 'users',
                        data: { id: String(i), name: `User${i}` },
                    })
                }

                const results = await adapter.findMany({
                    model: 'users',
                    limit: 2,
                    offset: 1,
                })
                expect(results).toHaveLength(2)
            })

            it('should support sorting ascending', async () => {
                await adapter.create({
                    model: 'users',
                    data: { id: '1', name: 'Charlie' },
                })
                await adapter.create({
                    model: 'users',
                    data: { id: '2', name: 'Alice' },
                })
                await adapter.create({ model: 'users', data: { id: '3', name: 'Bob' } })

                const results = await adapter.findMany({
                    model: 'users',
                    sortBy: { field: 'name', direction: 'asc' },
                })
                expect(results[0].name).toBe('Alice')
                expect(results[1].name).toBe('Bob')
                expect(results[2].name).toBe('Charlie')
            })

            it('should support sorting descending', async () => {
                await adapter.create({
                    model: 'users',
                    data: { id: '1', name: 'Charlie' },
                })
                await adapter.create({
                    model: 'users',
                    data: { id: '2', name: 'Alice' },
                })
                await adapter.create({ model: 'users', data: { id: '3', name: 'Bob' } })

                const results = await adapter.findMany({
                    model: 'users',
                    sortBy: { field: 'name', direction: 'desc' },
                })
                expect(results[0].name).toBe('Charlie')
                expect(results[1].name).toBe('Bob')
                expect(results[2].name).toBe('Alice')
            })

            it('should return empty array for empty model', async () => {
                const results = await rawAdapter.findMany({ model: 'empty_model' })
                expect(results).toEqual([])
            })
        })

        describe('count', () => {
            it('should count all records', async () => {
                await adapter.create({ model: 'users', data: { id: '1', name: 'Alice' } })
                await adapter.create({ model: 'users', data: { id: '2', name: 'Bob' } })

                const count = await adapter.count({ model: 'users' })
                expect(count).toBe(2)
            })

            it('should count with where clause', async () => {
                await adapter.create({ model: 'users', data: { id: '1', name: 'Alice' } })
                await adapter.create({ model: 'users', data: { id: '2', name: 'Bob' } })
                await adapter.create({ model: 'users', data: { id: '3', name: 'Alice' } })

                const count = await adapter.count({
                    model: 'users',
                    where: [{ field: 'name', value: 'Alice' }],
                })
                expect(count).toBe(2)
            })

            it('should return 0 for empty model', async () => {
                const count = await rawAdapter.count({ model: 'empty_model' })
                expect(count).toBe(0)
            })
        })

        describe('exists', () => {
            it('should return true when record exists', async () => {
                await adapter.create({ model: 'users', data: { id: '1', name: 'Alice' } })

                const exists = await adapter.exists({
                    model: 'users',
                    where: [{ field: 'id', value: '1' }],
                })
                expect(exists).toBe(true)
            })

            it('should return false when record does not exist', async () => {
                const exists = await adapter.exists({
                    model: 'users',
                    where: [{ field: 'id', value: 'nonexistent' }],
                })
                expect(exists).toBe(false)
            })

            it('should work with complex where clause', async () => {
                await adapter.create({
                    model: 'users',
                    data: { id: '1', name: 'Alice', age: 30 },
                })

                const exists = await adapter.exists({
                    model: 'users',
                    where: [
                        { field: 'name', value: 'Alice' },
                        { field: 'age', value: 30 },
                    ],
                })
                expect(exists).toBe(true)

                const notExists = await adapter.exists({
                    model: 'users',
                    where: [
                        { field: 'name', value: 'Alice' },
                        { field: 'age', value: 25 },
                    ],
                })
                expect(notExists).toBe(false)
            })
        })

        describe('update', () => {
            it('should update a record', async () => {
                await adapter.create({ model: 'users', data: { id: '1', name: 'Alice' } })

                const result = await adapter.update({
                    model: 'users',
                    where: [{ field: 'id', value: '1' }],
                    data: { name: 'Alice Updated' },
                })
                expect(result).toMatchObject({ id: '1', name: 'Alice Updated' })
            })

            it('should return null when updating non-existent record', async () => {
                const result = await adapter.update({
                    model: 'users',
                    where: [{ field: 'id', value: 'nonexistent' }],
                    data: { name: 'Updated' },
                })
                expect(result).toBeNull()
            })

            it('should update only matching record', async () => {
                await adapter.create({ model: 'users', data: { id: '1', name: 'Alice' } })
                await adapter.create({ model: 'users', data: { id: '2', name: 'Bob' } })

                await adapter.update({
                    model: 'users',
                    where: [{ field: 'id', value: '1' }],
                    data: { name: 'Alice Updated' },
                })

                const alice = await adapter.findOne({
                    model: 'users',
                    where: [{ field: 'id', value: '1' }],
                })
                const bob = await adapter.findOne({
                    model: 'users',
                    where: [{ field: 'id', value: '2' }],
                })

                expect(alice?.name).toBe('Alice Updated')
                expect(bob?.name).toBe('Bob')
            })
        })

        describe('upsert', () => {
            it('should create a record when it does not exist', async () => {
                const result = await adapter.upsert({
                    model: 'users',
                    where: [{ field: 'id', value: '1' }],
                    create: { id: '1', name: 'Alice' },
                    update: { name: 'Alice Updated' },
                })

                expect(result).toMatchObject({ id: '1', name: 'Alice' })

                const found = await adapter.findOne({
                    model: 'users',
                    where: [{ field: 'id', value: '1' }],
                })
                expect(found?.name).toBe('Alice')
            })

            it('should update a record when it exists', async () => {
                await adapter.create({ model: 'users', data: { id: '1', name: 'Alice' } })

                const result = await adapter.upsert({
                    model: 'users',
                    where: [{ field: 'id', value: '1' }],
                    create: { id: '1', name: 'Alice New' },
                    update: { name: 'Alice Updated' },
                })

                expect(result).toMatchObject({ id: '1', name: 'Alice Updated' })

                const found = await adapter.findOne({
                    model: 'users',
                    where: [{ field: 'id', value: '1' }],
                })
                expect(found?.name).toBe('Alice Updated')
            })

            it('should not affect other records', async () => {
                await adapter.create({ model: 'users', data: { id: '1', name: 'Alice' } })
                await adapter.create({ model: 'users', data: { id: '2', name: 'Bob' } })

                await adapter.upsert({
                    model: 'users',
                    where: [{ field: 'id', value: '1' }],
                    create: { id: '1', name: 'Alice New' },
                    update: { name: 'Alice Updated' },
                })

                const bob = await adapter.findOne({
                    model: 'users',
                    where: [{ field: 'id', value: '2' }],
                })
                expect(bob?.name).toBe('Bob')
            })
        })

        describe('updateMany', () => {
            it('should update multiple records', async () => {
                await adapter.create({
                    model: 'users',
                    data: { id: '1', name: 'Alice', age: 30 },
                })
                await adapter.create({
                    model: 'users',
                    data: { id: '2', name: 'Bob', age: 30 },
                })
                await adapter.create({
                    model: 'users',
                    data: { id: '3', name: 'Charlie', age: 25 },
                })

                const count = await adapter.updateMany({
                    model: 'users',
                    where: [{ field: 'age', value: 30 }],
                    data: { age: 31 },
                })
                expect(count).toBe(2)

                const results = await adapter.findMany({
                    model: 'users',
                    where: [{ field: 'age', value: 31 }],
                })
                expect(results).toHaveLength(2)
            })

            it('should return 0 when no records match', async () => {
                const count = await adapter.updateMany({
                    model: 'users',
                    where: [{ field: 'id', value: 'nonexistent' }],
                    data: { name: 'Updated' },
                })
                expect(count).toBe(0)
            })
        })

        describe('delete', () => {
            it('should delete a record', async () => {
                await adapter.create({ model: 'users', data: { id: '1', name: 'Alice' } })

                await adapter.delete({
                    model: 'users',
                    where: [{ field: 'id', value: '1' }],
                })

                const result = await adapter.findOne({
                    model: 'users',
                    where: [{ field: 'id', value: '1' }],
                })
                expect(result).toBeNull()
            })

            it('should not throw when deleting non-existent record', async () => {
                await expect(
                    adapter.delete({
                        model: 'users',
                        where: [{ field: 'id', value: 'nonexistent' }],
                    }),
                ).resolves.not.toThrow()
            })
        })

        describe('deleteMany', () => {
            it('should delete multiple records', async () => {
                await adapter.create({
                    model: 'users',
                    data: { id: '1', name: 'Alice', age: 30 },
                })
                await adapter.create({
                    model: 'users',
                    data: { id: '2', name: 'Bob', age: 30 },
                })
                await adapter.create({
                    model: 'users',
                    data: { id: '3', name: 'Charlie', age: 25 },
                })

                const count = await adapter.deleteMany({
                    model: 'users',
                    where: [{ field: 'age', value: 30 }],
                })
                expect(count).toBe(2)

                const remaining = await adapter.count({ model: 'users' })
                expect(remaining).toBe(1)
            })

            it('should return 0 when no records match', async () => {
                const count = await adapter.deleteMany({
                    model: 'users',
                    where: [{ field: 'id', value: 'nonexistent' }],
                })
                expect(count).toBe(0)
            })
        })

        describe('clear', () => {
            it('should delete all records from a table', async () => {
                await adapter.create({ model: 'users', data: { id: '1', name: 'Alice' } })
                await adapter.create({ model: 'users', data: { id: '2', name: 'Bob' } })
                await adapter.create({
                    model: 'users',
                    data: { id: '3', name: 'Charlie' },
                })

                const deletedCount = await adapter.clear({ model: 'users' })
                expect(deletedCount).toBe(3)

                const remaining = await adapter.count({ model: 'users' })
                expect(remaining).toBe(0)
            })

            it('should return 0 when table is empty', async () => {
                const count = await rawAdapter.clear({ model: 'empty_model' })
                expect(count).toBe(0)
            })

            it('should not affect other tables', async () => {
                await adapter.create({ model: 'users', data: { id: '1', name: 'Alice' } })
                await adapter.create({
                    model: 'items',
                    data: { id: '1', value: 10, category: 'A' },
                })

                await adapter.clear({ model: 'users' })

                const usersCount = await adapter.count({ model: 'users' })
                const itemsCount = await adapter.count({ model: 'items' })
                expect(usersCount).toBe(0)
                expect(itemsCount).toBe(1)
            })
        })

        describe('where operators', () => {
            beforeEach(async () => {
                await adapter.create({
                    model: 'items',
                    data: { id: '1', value: 10, category: 'A' },
                })
                await adapter.create({
                    model: 'items',
                    data: { id: '2', value: 20, category: 'B' },
                })
                await adapter.create({
                    model: 'items',
                    data: { id: '3', value: 30, category: 'A' },
                })
            })

            it('should support eq operator (default)', async () => {
                const results = await adapter.findMany({
                    model: 'items',
                    where: [{ field: 'value', value: 20 }],
                })
                expect(results).toHaveLength(1)
                expect(results[0].id).toBe('2')
            })

            it('should support ne operator', async () => {
                const results = await adapter.findMany({
                    model: 'items',
                    where: [{ field: 'value', operator: 'ne', value: 20 }],
                })
                expect(results).toHaveLength(2)
            })

            it('should support gt operator', async () => {
                const results = await adapter.findMany({
                    model: 'items',
                    where: [{ field: 'value', operator: 'gt', value: 15 }],
                })
                expect(results).toHaveLength(2)
            })

            it('should support gte operator', async () => {
                const results = await adapter.findMany({
                    model: 'items',
                    where: [{ field: 'value', operator: 'gte', value: 20 }],
                })
                expect(results).toHaveLength(2)
            })

            it('should support lt operator', async () => {
                const results = await adapter.findMany({
                    model: 'items',
                    where: [{ field: 'value', operator: 'lt', value: 25 }],
                })
                expect(results).toHaveLength(2)
            })

            it('should support lte operator', async () => {
                const results = await adapter.findMany({
                    model: 'items',
                    where: [{ field: 'value', operator: 'lte', value: 20 }],
                })
                expect(results).toHaveLength(2)
            })

            it('should support in operator', async () => {
                const results = await adapter.findMany({
                    model: 'items',
                    where: [{ field: 'value', operator: 'in', value: [10, 30] }],
                })
                expect(results).toHaveLength(2)
            })

            it('should support not_in operator', async () => {
                const results = await adapter.findMany({
                    model: 'items',
                    where: [{ field: 'value', operator: 'not_in', value: [10, 30] }],
                })
                expect(results).toHaveLength(1)
                expect(results[0].value).toBe(20)
            })

            it('should support contains operator', async () => {
                await adapter.create({
                    model: 'users',
                    data: { id: '1', name: 'Alice Smith' },
                })
                await adapter.create({
                    model: 'users',
                    data: { id: '2', name: 'Bob Jones' },
                })

                const results = await adapter.findMany({
                    model: 'users',
                    where: [{ field: 'name', operator: 'contains', value: 'Smith' }],
                })
                expect(results).toHaveLength(1)
                expect(results[0].name).toBe('Alice Smith')
            })

            it('should support starts_with operator', async () => {
                await adapter.create({
                    model: 'users',
                    data: { id: '1', name: 'Alice' },
                })
                await adapter.create({
                    model: 'users',
                    data: { id: '2', name: 'Alfred' },
                })
                await adapter.create({ model: 'users', data: { id: '3', name: 'Bob' } })

                const results = await adapter.findMany({
                    model: 'users',
                    where: [{ field: 'name', operator: 'starts_with', value: 'Al' }],
                })
                expect(results).toHaveLength(2)
            })

            it('should support ends_with operator', async () => {
                await adapter.create({
                    model: 'users',
                    data: { id: '1', name: 'Alice' },
                })
                await adapter.create({ model: 'users', data: { id: '2', name: 'Bruce' } })
                await adapter.create({ model: 'users', data: { id: '3', name: 'Bob' } })

                const results = await adapter.findMany({
                    model: 'users',
                    where: [{ field: 'name', operator: 'ends_with', value: 'ce' }],
                })
                expect(results).toHaveLength(2)
            })
        })

        describe('where clause connectors', () => {
            beforeEach(async () => {
                await adapter.create({
                    model: 'items',
                    data: { id: '1', value: 10, category: 'A' },
                })
                await adapter.create({
                    model: 'items',
                    data: { id: '2', value: 20, category: 'B' },
                })
                await adapter.create({
                    model: 'items',
                    data: { id: '3', value: 30, category: 'A' },
                })
            })

            it('should support OR connector', async () => {
                const results = await adapter.findMany({
                    model: 'items',
                    where: [
                        { field: 'value', value: 10 },
                        { field: 'value', value: 30, connector: 'OR' },
                    ],
                })
                expect(results).toHaveLength(2)
            })

            it('should support AND connector (default)', async () => {
                const results = await adapter.findMany({
                    model: 'items',
                    where: [
                        { field: 'category', value: 'A' },
                        { field: 'value', operator: 'gt', value: 15 },
                    ],
                })
                expect(results).toHaveLength(1)
                expect(results[0].id).toBe('3')
            })
        })

        describe('transaction', () => {
            it('should commit successful transaction', async () => {
                await adapter.create({ model: 'users', data: { id: '1', name: 'Alice' } })

                await adapter.transaction(async (tx) => {
                    await tx.update({
                        model: 'users',
                        where: [{ field: 'id', value: '1' }],
                        data: { name: 'Alice Updated' },
                    })
                    await tx.create({
                        model: 'users',
                        data: { id: '2', name: 'Bob' },
                    })
                })

                const alice = await adapter.findOne({
                    model: 'users',
                    where: [{ field: 'id', value: '1' }],
                })
                const bob = await adapter.findOne({
                    model: 'users',
                    where: [{ field: 'id', value: '2' }],
                })

                expect(alice?.name).toBe('Alice Updated')
                expect(bob).toBeTruthy()
            })

            it('should rollback on error', async () => {
                await adapter.create({ model: 'users', data: { id: '1', name: 'Alice' } })

                try {
                    await adapter.transaction(async (tx) => {
                        await tx.update({
                            model: 'users',
                            where: [{ field: 'id', value: '1' }],
                            data: { name: 'Updated' },
                        })
                        throw new Error('Rollback!')
                    })
                } catch {
                    // Expected
                }

                const result = await adapter.findOne({
                    model: 'users',
                    where: [{ field: 'id', value: '1' }],
                })
                expect(result?.name).toBe('Alice') // Should be unchanged
            })

            it('should return transaction result', async () => {
                const result = await adapter.transaction(async (tx) => {
                    const user = await tx.create({
                        model: 'users',
                        data: { id: '1', name: 'Alice' },
                    })
                    return user
                })

                expect(result).toMatchObject({ id: '1', name: 'Alice' })
            })
        })

        describe('subscribe', () => {
            it('should notify on create', async () => {
                if (!adapter.subscribe) {
                    return // Skip if not implemented
                }

                const changes: TableChange<TestModels['users']>[] = []
                const unsubscribe = adapter.subscribe('users', (c) => changes.push(...c))

                await adapter.create({ model: 'users', data: { id: '1', name: 'Alice' } })

                expect(changes).toHaveLength(1)
                expect(changes[0].type).toBe('insert')
                expect(changes[0].data).toMatchObject({ id: '1', name: 'Alice' })

                unsubscribe()
            })

            it('should notify on update', async () => {
                if (!adapter.subscribe) {
                    return // Skip if not implemented
                }

                await adapter.create({ model: 'users', data: { id: '1', name: 'Alice' } })

                const changes: TableChange<TestModels['users']>[] = []
                const unsubscribe = adapter.subscribe('users', (c) => changes.push(...c))

                await adapter.update({
                    model: 'users',
                    where: [{ field: 'id', value: '1' }],
                    data: { name: 'Updated' },
                })

                expect(changes).toHaveLength(1)
                expect(changes[0].type).toBe('update')
                expect(changes[0].data).toMatchObject({ name: 'Updated' })

                unsubscribe()
            })

            it('should notify on delete', async () => {
                if (!adapter.subscribe) {
                    return // Skip if not implemented
                }

                await adapter.create({ model: 'users', data: { id: '1', name: 'Alice' } })

                const changes: TableChange<TestModels['users']>[] = []
                const unsubscribe = adapter.subscribe('users', (c) => changes.push(...c))

                await adapter.delete({
                    model: 'users',
                    where: [{ field: 'id', value: '1' }],
                })

                expect(changes).toHaveLength(1)
                expect(changes[0].type).toBe('delete')

                unsubscribe()
            })

            it('should stop notifying after unsubscribe', async () => {
                if (!adapter.subscribe) {
                    return // Skip if not implemented
                }

                const changes: TableChange<TestModels['users']>[] = []
                const unsubscribe = adapter.subscribe('users', (c) => changes.push(...c))

                await adapter.create({ model: 'users', data: { id: '1', name: 'Alice' } })
                expect(changes).toHaveLength(1)

                unsubscribe()

                await adapter.create({ model: 'users', data: { id: '2', name: 'Bob' } })
                expect(changes).toHaveLength(1) // Should not have changed
            })
        })

        describe('joins', () => {
            beforeEach(async () => {
                // Create test data for joins
                await adapter.create({
                    model: 'users',
                    data: { id: 'u1', name: 'Alice' },
                })
                await adapter.create({
                    model: 'users',
                    data: { id: 'u2', name: 'Bob' },
                })

                // Create posts (one-to-many)
                await adapter.create({
                    model: 'posts',
                    data: { id: 'p1', title: 'Post 1', content: 'Content 1', user_id: 'u1' },
                })
                await adapter.create({
                    model: 'posts',
                    data: { id: 'p2', title: 'Post 2', content: 'Content 2', user_id: 'u1' },
                })
                await adapter.create({
                    model: 'posts',
                    data: { id: 'p3', title: 'Post 3', content: 'Content 3', user_id: 'u2' },
                })

                // Create profiles (one-to-one)
                await adapter.create({
                    model: 'profiles',
                    data: { id: 'pr1', bio: 'Alice bio', user_id: 'u1' },
                })
            })

            describe('one-to-many joins', () => {
                it('should join posts to user with findOne', async () => {
                    const result = await adapter.findOne({
                        model: 'users',
                        where: [{ field: 'id', value: 'u1' }],
                        join: {
                            posts: {
                                on: { from: 'id', to: 'user_id' },
                                relation: 'one-to-many',
                            },
                        },
                    })

                    expect(result).not.toBeNull()
                    expect(result!.name).toBe('Alice')
                    expect(result!.posts).toHaveLength(2)
                    expect(result!.posts.map((p) => p.title).sort()).toEqual(['Post 1', 'Post 2'])
                })

                it('should join posts to users with findMany', async () => {
                    const results = await adapter.findMany({
                        model: 'users',
                        join: {
                            posts: {
                                on: { from: 'id', to: 'user_id' },
                                relation: 'one-to-many',
                            },
                        },
                    })

                    expect(results).toHaveLength(2)

                    const alice = results.find((u) => u.name === 'Alice')
                    const bob = results.find((u) => u.name === 'Bob')

                    expect(alice!.posts).toHaveLength(2)
                    expect(bob!.posts).toHaveLength(1)
                })

                it('should return empty array when no related records', async () => {
                    // Create user with no posts
                    await adapter.create({
                        model: 'users',
                        data: { id: 'u3', name: 'Charlie' },
                    })

                    const result = await adapter.findOne({
                        model: 'users',
                        where: [{ field: 'id', value: 'u3' }],
                        join: {
                            posts: {
                                on: { from: 'id', to: 'user_id' },
                                relation: 'one-to-many',
                            },
                        },
                    })

                    expect(result!.posts).toEqual([])
                })

                it('should respect join limit', async () => {
                    const result = await adapter.findOne({
                        model: 'users',
                        where: [{ field: 'id', value: 'u1' }],
                        join: {
                            posts: {
                                on: { from: 'id', to: 'user_id' },
                                relation: 'one-to-many',
                                limit: 1,
                            },
                        },
                    })

                    expect(result!.posts).toHaveLength(1)
                })
            })

            describe('one-to-one joins', () => {
                it('should join profile to user with findOne', async () => {
                    const result = await adapter.findOne({
                        model: 'users',
                        where: [{ field: 'id', value: 'u1' }],
                        join: {
                            profiles: {
                                on: { from: 'id', to: 'user_id' },
                                relation: 'one-to-one',
                            },
                        },
                    })

                    expect(result).not.toBeNull()
                    expect(result!.name).toBe('Alice')
                    expect(result!.profiles).not.toBeNull()
                    expect(result!.profiles!.bio).toBe('Alice bio')
                })

                it('should return null when no related record', async () => {
                    const result = await adapter.findOne({
                        model: 'users',
                        where: [{ field: 'id', value: 'u2' }],
                        join: {
                            profiles: {
                                on: { from: 'id', to: 'user_id' },
                                relation: 'one-to-one',
                            },
                        },
                    })

                    expect(result).not.toBeNull()
                    expect(result!.name).toBe('Bob')
                    expect(result!.profiles).toBeNull()
                })
            })

            describe('multiple joins', () => {
                it('should support multiple joins in one query', async () => {
                    const result = await adapter.findOne({
                        model: 'users',
                        where: [{ field: 'id', value: 'u1' }],
                        join: {
                            posts: {
                                on: { from: 'id', to: 'user_id' },
                                relation: 'one-to-many',
                            },
                            profiles: {
                                on: { from: 'id', to: 'user_id' },
                                relation: 'one-to-one',
                            },
                        },
                    })

                    expect(result).not.toBeNull()
                    expect(result!.posts).toHaveLength(2)
                    expect(result!.profiles).not.toBeNull()
                    expect(result!.profiles!.bio).toBe('Alice bio')
                })
            })
        })
    })
}
