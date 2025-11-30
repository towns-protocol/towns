/**
 * Tests for SQLite schema compiler.
 */

import { describe, it, expect } from 'vitest'
import { getTableName, getTableColumns } from 'drizzle-orm'
import { t } from '../../builders.js'
import { table, schema } from '../../schema.js'
import { index, uniqueIndex, primaryKey, foreignKey, columnRef } from '../../constraints.js'
import { toSqliteTable, toSqliteSchema } from './sqlite-schema.js'

describe('toSqliteTable', () => {
    it('compiles a simple table with single primary key', () => {
        const usersTable = table('users', {
            id: t.string().primaryKey(),
            name: t.string(),
            age: t.integer().nullable(),
        })

        const drizzleTable = toSqliteTable(usersTable)

        expect(getTableName(drizzleTable)).toBe('users')
        const columns = getTableColumns(drizzleTable)
        expect(Object.keys(columns)).toEqual(['id', 'name', 'age'])
    })

    it('compiles all column types correctly', () => {
        const allTypesTable = table('all_types', {
            textCol: t.string(),
            intCol: t.integer(),
            boolCol: t.boolean(),
            blobCol: t.bytes(),
            bigintCol: t.bigint(),
            jsonCol: t.json(),
            dateCol: t.date(),
        })

        const drizzleTable = toSqliteTable(allTypesTable)
        const columns = getTableColumns(drizzleTable)

        // Verify all columns exist
        expect(Object.keys(columns)).toEqual([
            'textCol',
            'intCol',
            'boolCol',
            'blobCol',
            'bigintCol',
            'jsonCol',
            'dateCol',
        ])
    })

    it('handles nullable columns', () => {
        const nullableTable = table('nullable', {
            id: t.string().primaryKey(),
            optional: t.string().nullable(),
            required: t.string(),
        })

        const drizzleTable = toSqliteTable(nullableTable)
        const columns = getTableColumns(drizzleTable)

        // Check notNull property on columns
        expect(columns.optional.notNull).toBe(false)
        expect(columns.required.notNull).toBe(true)
    })

    it('compiles composite primary key from constraint', () => {
        const sessionsTable = table(
            'sessions',
            {
                streamId: t.string(),
                sessionId: t.string(),
                data: t.bytes(),
            },
            (tbl) => [primaryKey({ columns: [tbl.streamId, tbl.sessionId] })],
        )

        const drizzleTable = toSqliteTable(sessionsTable)

        expect(getTableName(drizzleTable)).toBe('sessions')
        const columns = getTableColumns(drizzleTable)
        expect(Object.keys(columns)).toEqual(['streamId', 'sessionId', 'data'])
    })

    it('compiles composite primary key from multiple column-level PKs', () => {
        const weirdTable = table('weird', {
            a: t.string().primaryKey(),
            b: t.string().primaryKey(),
        })

        const drizzleTable = toSqliteTable(weirdTable)

        expect(getTableName(drizzleTable)).toBe('weird')
        const columns = getTableColumns(drizzleTable)
        expect(Object.keys(columns)).toEqual(['a', 'b'])
    })

    it('compiles indexes', () => {
        const usersTable = table(
            'users',
            {
                id: t.string().primaryKey(),
                name: t.string(),
                email: t.string(),
            },
            (tbl) => [index('idx_name').on(tbl.name)],
        )

        const drizzleTable = toSqliteTable(usersTable)

        expect(getTableName(drizzleTable)).toBe('users')
    })

    it('compiles unique indexes', () => {
        const usersTable = table(
            'users',
            {
                id: t.string().primaryKey(),
                email: t.string(),
            },
            (tbl) => [uniqueIndex('idx_email').on(tbl.email)],
        )

        const drizzleTable = toSqliteTable(usersTable)

        expect(getTableName(drizzleTable)).toBe('users')
    })

    it('compiles compound indexes', () => {
        const logsTable = table(
            'logs',
            {
                id: t.string().primaryKey(),
                userId: t.string(),
                action: t.string(),
            },
            (tbl) => [index('idx_user_action').on(tbl.userId, tbl.action)],
        )

        const drizzleTable = toSqliteTable(logsTable)

        expect(getTableName(drizzleTable)).toBe('logs')
    })
})

describe('toSqliteSchema', () => {
    it('compiles a schema with multiple tables', () => {
        const usersTable = table('users', {
            id: t.string().primaryKey(),
            name: t.string(),
        })

        const postsTable = table('posts', {
            id: t.string().primaryKey(),
            authorId: t.string(),
            content: t.string(),
        })

        const testSchema = schema('test', {
            tables: [usersTable, postsTable] as const,
            version: 1,
        })

        const drizzleTables = toSqliteSchema(testSchema)

        expect(Object.keys(drizzleTables)).toEqual(['users', 'posts'])
        expect(getTableName(drizzleTables.users)).toBe('users')
        expect(getTableName(drizzleTables.posts)).toBe('posts')
    })

    it('compiles foreign keys between tables', () => {
        const usersTable = table('users', {
            id: t.string().primaryKey(),
            name: t.string(),
        })

        const postsTable = table(
            'posts',
            {
                id: t.string().primaryKey(),
                authorId: t.string(),
                content: t.string(),
            },
            (tbl) => [
                foreignKey({
                    columns: [tbl.authorId],
                    foreignColumns: [columnRef('users', 'id')],
                    onDelete: 'cascade',
                }),
            ],
        )

        const testSchema = schema('test', {
            tables: [usersTable, postsTable] as const,
            version: 1,
        })

        const drizzleTables = toSqliteSchema(testSchema)

        expect(Object.keys(drizzleTables)).toEqual(['users', 'posts'])
    })

    it('compiles foreign keys with all referential actions', () => {
        const usersTable = table('users', {
            id: t.string().primaryKey(),
        })

        const postsTable = table(
            'posts',
            {
                id: t.string().primaryKey(),
                authorId: t.string(),
            },
            (tbl) => [
                foreignKey({
                    columns: [tbl.authorId],
                    foreignColumns: [columnRef('users', 'id')],
                    onDelete: 'cascade',
                    onUpdate: 'set null',
                }),
            ],
        )

        const testSchema = schema('test', {
            tables: [usersTable, postsTable] as const,
            version: 1,
        })

        const drizzleTables = toSqliteSchema(testSchema)

        expect(Object.keys(drizzleTables)).toEqual(['users', 'posts'])
    })

    it('handles tables without foreign keys', () => {
        const standaloneTable = table('standalone', {
            id: t.string().primaryKey(),
            value: t.integer(),
        })

        const testSchema = schema('test', {
            tables: [standaloneTable] as const,
            version: 1,
        })

        const drizzleTables = toSqliteSchema(testSchema)

        expect(Object.keys(drizzleTables)).toEqual(['standalone'])
    })

    it('compiles complex schema with mixed constraints', () => {
        const usersTable = table(
            'users',
            {
                id: t.string().primaryKey(),
                email: t.string(),
                name: t.string(),
            },
            (tbl) => [uniqueIndex('idx_email').on(tbl.email)],
        )

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
                foreignKey({
                    columns: [tbl.userId],
                    foreignColumns: [columnRef('users', 'id')],
                    onDelete: 'cascade',
                }),
            ],
        )

        const testSchema = schema('test', {
            tables: [usersTable, sessionsTable] as const,
            version: 1,
        })

        const drizzleTables = toSqliteSchema(testSchema)

        expect(Object.keys(drizzleTables)).toEqual(['users', 'sessions'])
        expect(getTableName(drizzleTables.users)).toBe('users')
        expect(getTableName(drizzleTables.sessions)).toBe('sessions')
    })
})
