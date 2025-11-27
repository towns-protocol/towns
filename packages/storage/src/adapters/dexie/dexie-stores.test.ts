/**
 * Tests for Dexie store generation utilities.
 */

import { describe, it, expect } from 'vitest'
import { t } from '../../builders.js'
import { table, schema } from '../../schema.js'
import { index, uniqueIndex, primaryKey } from '../../constraints.js'
import { generateDexieStores, generateDexieStoreDefinition } from './index.js'

describe('generateDexieStores', () => {
    it('generates stores for a simple schema', () => {
        const usersTable = table('users', {
            id: t.string().primaryKey(),
            name: t.string(),
            email: t.string(),
        })

        const itemsTable = table('items', {
            id: t.string().primaryKey(),
            value: t.integer(),
        })

        const testSchema = schema('test', {
            tables: [usersTable, itemsTable] as const,
            version: 1,
        })

        const stores = generateDexieStores(testSchema)

        expect(stores).toEqual({
            users: 'id',
            items: 'id',
        })
    })

    it('generates composite primary keys', () => {
        const sessionsTable = table(
            'sessions',
            {
                streamId: t.string(),
                sessionId: t.string(),
                data: t.bytes(),
            },
            (tbl) => [primaryKey({ columns: [tbl.streamId, tbl.sessionId] })],
        )

        const stores = generateDexieStores(
            schema('test', { tables: [sessionsTable] as const, version: 1 }),
        )

        expect(stores.sessions).toBe('[streamId+sessionId]')
    })

    it('generates indexes', () => {
        const usersTable = table(
            'users',
            {
                id: t.string().primaryKey(),
                name: t.string(),
                email: t.string(),
                createdAt: t.date(),
            },
            (tbl) => [index('idx_name').on(tbl.name), index('idx_created').on(tbl.createdAt)],
        )

        const stores = generateDexieStores(
            schema('test', { tables: [usersTable] as const, version: 1 }),
        )

        expect(stores.users).toBe('id,name,createdAt')
    })

    it('generates unique indexes with & prefix', () => {
        const usersTable = table(
            'users',
            {
                id: t.string().primaryKey(),
                email: t.string(),
            },
            (tbl) => [uniqueIndex('idx_email').on(tbl.email)],
        )

        const stores = generateDexieStores(
            schema('test', { tables: [usersTable] as const, version: 1 }),
        )

        expect(stores.users).toBe('id,&email')
    })

    it('generates compound indexes', () => {
        const logsTable = table(
            'logs',
            {
                id: t.string().primaryKey(),
                userId: t.string(),
                action: t.string(),
                timestamp: t.date(),
            },
            (tbl) => [index('idx_user_action').on(tbl.userId, tbl.action)],
        )

        const stores = generateDexieStores(
            schema('test', { tables: [logsTable] as const, version: 1 }),
        )

        expect(stores.logs).toBe('id,[userId+action]')
    })

    it('generates unique compound indexes', () => {
        const sessionsTable = table(
            'sessions',
            {
                id: t.string().primaryKey(),
                userId: t.string(),
                deviceId: t.string(),
            },
            (tbl) => [uniqueIndex('idx_user_device').on(tbl.userId, tbl.deviceId)],
        )

        const stores = generateDexieStores(
            schema('test', { tables: [sessionsTable] as const, version: 1 }),
        )

        expect(stores.sessions).toBe('id,&[userId+deviceId]')
    })

    it('combines composite PK with indexes', () => {
        const sessionsTable = table(
            'sessions',
            {
                streamId: t.string(),
                sessionId: t.string(),
                userId: t.string(),
                createdAt: t.date(),
            },
            (tbl) => [
                primaryKey({ columns: [tbl.streamId, tbl.sessionId] }),
                index('idx_user').on(tbl.userId),
                index('idx_created').on(tbl.createdAt),
            ],
        )

        const stores = generateDexieStores(
            schema('test', { tables: [sessionsTable] as const, version: 1 }),
        )

        expect(stores.sessions).toBe('[streamId+sessionId],userId,createdAt')
    })

    it('defaults to id primary key when none defined', () => {
        const itemsTable = table('items', {
            value: t.integer(),
            category: t.string(),
        })

        const definition = generateDexieStoreDefinition(itemsTable)

        expect(definition).toBe('id')
    })
})

describe('generateDexieStoreDefinition', () => {
    it('handles table with multiple column-level primary keys', () => {
        // This is technically invalid (should use composite PK constraint)
        // but we support it for backwards compatibility
        const weirdTable = table('weird', {
            a: t.string().primaryKey(),
            b: t.string().primaryKey(),
        })

        const definition = generateDexieStoreDefinition(weirdTable)

        expect(definition).toBe('[a+b]')
    })
})
