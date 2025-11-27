/**
 * Tests for constraint builders.
 */

import { describe, it, expect } from 'vitest'
import { t } from './builders.js'
import { table } from './schema.js'
import { index, uniqueIndex, primaryKey, foreignKey, columnRef } from './constraints.js'

describe('constraint builders', () => {
    describe('index()', () => {
        it('creates a single-column index', () => {
            const usersTable = table(
                'users',
                {
                    id: t.string().primaryKey(),
                    name: t.string(),
                    email: t.string(),
                },
                (tbl) => [index('idx_name').on(tbl.name)],
            )

            expect(usersTable.constraints).toHaveLength(1)
            expect(usersTable.constraints![0]).toEqual({
                type: 'index',
                name: 'idx_name',
                columns: ['name'],
                unique: false,
            })
        })

        it('creates a compound index', () => {
            const logsTable = table(
                'logs',
                {
                    userId: t.string(),
                    action: t.string(),
                    timestamp: t.date(),
                },
                (tbl) => [index('idx_user_action').on(tbl.userId, tbl.action)],
            )

            expect(logsTable.constraints).toHaveLength(1)
            expect(logsTable.constraints![0]).toEqual({
                type: 'index',
                name: 'idx_user_action',
                columns: ['userId', 'action'],
                unique: false,
            })
        })

        it('throws when no columns provided', () => {
            expect(() => index('empty').on()).toThrow('Index must have at least one column')
        })
    })

    describe('uniqueIndex()', () => {
        it('creates a unique index', () => {
            const usersTable = table(
                'users',
                {
                    id: t.string().primaryKey(),
                    email: t.string(),
                },
                (tbl) => [uniqueIndex('idx_email').on(tbl.email)],
            )

            expect(usersTable.constraints).toHaveLength(1)
            expect(usersTable.constraints![0]).toEqual({
                type: 'index',
                name: 'idx_email',
                columns: ['email'],
                unique: true,
            })
        })

        it('creates a compound unique index', () => {
            const sessionsTable = table(
                'sessions',
                {
                    userId: t.string(),
                    deviceId: t.string(),
                    token: t.string(),
                },
                (tbl) => [uniqueIndex('idx_user_device').on(tbl.userId, tbl.deviceId)],
            )

            expect(sessionsTable.constraints).toBeDefined()
            const constraint = sessionsTable.constraints![0]
            expect(constraint.type).toBe('index')
            if (constraint.type === 'index') {
                expect(constraint.unique).toBe(true)
                expect(constraint.columns).toEqual(['userId', 'deviceId'])
            }
        })
    })

    describe('primaryKey()', () => {
        it('creates a composite primary key', () => {
            const sessionsTable = table(
                'sessions',
                {
                    streamId: t.string(),
                    sessionId: t.string(),
                    data: t.bytes(),
                },
                (tbl) => [primaryKey({ columns: [tbl.streamId, tbl.sessionId] })],
            )

            expect(sessionsTable.constraints).toHaveLength(1)
            expect(sessionsTable.constraints![0]).toEqual({
                type: 'primaryKey',
                name: undefined,
                columns: ['streamId', 'sessionId'],
            })
        })

        it('supports named primary key', () => {
            const sessionsTable = table(
                'sessions',
                {
                    streamId: t.string(),
                    sessionId: t.string(),
                    data: t.bytes(),
                },
                (tbl) => [
                    primaryKey({
                        name: 'pk_sessions',
                        columns: [tbl.streamId, tbl.sessionId],
                    }),
                ],
            )

            expect(sessionsTable.constraints![0]).toEqual({
                type: 'primaryKey',
                name: 'pk_sessions',
                columns: ['streamId', 'sessionId'],
            })
        })

        it('throws when no columns provided', () => {
            expect(() => primaryKey({ columns: [] })).toThrow(
                'Primary key must have at least one column',
            )
        })
    })

    describe('foreignKey()', () => {
        it('creates a foreign key constraint', () => {
            const usersTable = table('users', {
                id: t.string().primaryKey(),
                name: t.string(),
            })

            const postsTable = table(
                'posts',
                {
                    id: t.string().primaryKey(),
                    userId: t.string(),
                    content: t.string(),
                },
                (tbl) => [
                    foreignKey({
                        columns: [tbl.userId],
                        foreignColumns: [columnRef('users', 'id')],
                    }),
                ],
            )

            expect(postsTable.constraints).toHaveLength(1)
            expect(postsTable.constraints![0]).toEqual({
                type: 'foreignKey',
                name: undefined,
                columns: ['userId'],
                foreignTable: 'users',
                foreignColumns: ['id'],
                onDelete: undefined,
                onUpdate: undefined,
            })
        })

        it('supports cascade options', () => {
            const postsTable = table(
                'posts',
                {
                    id: t.string().primaryKey(),
                    userId: t.string(),
                },
                (tbl) => [
                    foreignKey({
                        name: 'fk_posts_user',
                        columns: [tbl.userId],
                        foreignColumns: [columnRef('users', 'id')],
                        onDelete: 'cascade',
                        onUpdate: 'cascade',
                    }),
                ],
            )

            const constraint = postsTable.constraints![0]
            expect(constraint.type).toBe('foreignKey')
            if (constraint.type === 'foreignKey') {
                expect(constraint.name).toBe('fk_posts_user')
                expect(constraint.onDelete).toBe('cascade')
                expect(constraint.onUpdate).toBe('cascade')
            }
        })

        it('supports all referential actions for onDelete', () => {
            const actions = ['cascade', 'restrict', 'no action', 'set null', 'set default'] as const

            for (const action of actions) {
                const testTable = table(
                    'test',
                    {
                        id: t.string().primaryKey(),
                        refId: t.string(),
                    },
                    (tbl) => [
                        foreignKey({
                            columns: [tbl.refId],
                            foreignColumns: [columnRef('other', 'id')],
                            onDelete: action,
                        }),
                    ],
                )

                const constraint = testTable.constraints![0]
                expect(constraint.type).toBe('foreignKey')
                if (constraint.type === 'foreignKey') {
                    expect(constraint.onDelete).toBe(action)
                }
            }
        })

        it('supports all referential actions for onUpdate', () => {
            const actions = ['cascade', 'restrict', 'no action', 'set null', 'set default'] as const

            for (const action of actions) {
                const testTable = table(
                    'test',
                    {
                        id: t.string().primaryKey(),
                        refId: t.string(),
                    },
                    (tbl) => [
                        foreignKey({
                            columns: [tbl.refId],
                            foreignColumns: [columnRef('other', 'id')],
                            onUpdate: action,
                        }),
                    ],
                )

                const constraint = testTable.constraints![0]
                expect(constraint.type).toBe('foreignKey')
                if (constraint.type === 'foreignKey') {
                    expect(constraint.onUpdate).toBe(action)
                }
            }
        })

        it('defaults to undefined when no action specified', () => {
            const postsTable = table(
                'posts',
                {
                    id: t.string().primaryKey(),
                    userId: t.string(),
                },
                (tbl) => [
                    foreignKey({
                        columns: [tbl.userId],
                        foreignColumns: [columnRef('users', 'id')],
                    }),
                ],
            )

            const constraint = postsTable.constraints![0]
            expect(constraint.type).toBe('foreignKey')
            if (constraint.type === 'foreignKey') {
                expect(constraint.onDelete).toBeUndefined()
                expect(constraint.onUpdate).toBeUndefined()
            }
        })

        it('throws when column counts mismatch', () => {
            expect(() =>
                foreignKey({
                    columns: [columnRef('posts', 'userId'), columnRef('posts', 'orgId')],
                    foreignColumns: [columnRef('users', 'id')],
                }),
            ).toThrow('Foreign key column count must match foreign column count')
        })
    })

    describe('multiple constraints', () => {
        it('supports multiple constraints on a table', () => {
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

            expect(sessionsTable.constraints).toHaveLength(3)
            expect(sessionsTable.constraints![0].type).toBe('primaryKey')
            expect(sessionsTable.constraints![1].type).toBe('index')
            expect(sessionsTable.constraints![2].type).toBe('index')
        })
    })
})


describe('foreign key constraints with referential actions', () => {
    it('stores onDelete and onUpdate in typed table definition', () => {
        const postsTable = table(
            'posts',
            {
                id: t.string().primaryKey(),
                authorId: t.string(),
                content: t.string(),
            },
            (tbl) => [
                foreignKey({
                    name: 'fk_posts_author',
                    columns: [tbl.authorId],
                    foreignColumns: [columnRef('users', 'id')],
                    onDelete: 'cascade',
                    onUpdate: 'set null',
                }),
            ],
        )

        // Verify the constraint is stored correctly
        expect(postsTable.constraints).toHaveLength(1)
        const fk = postsTable.constraints![0]
        expect(fk.type).toBe('foreignKey')
        if (fk.type === 'foreignKey') {
            expect(fk.name).toBe('fk_posts_author')
            expect(fk.columns).toEqual(['authorId'])
            expect(fk.foreignTable).toBe('users')
            expect(fk.foreignColumns).toEqual(['id'])
            expect(fk.onDelete).toBe('cascade')
            expect(fk.onUpdate).toBe('set null')
        }
    })

    it('preserves foreign key constraints in schema for DDL generation', () => {
        const usersTable = table('users', {
            id: t.string().primaryKey(),
            name: t.string(),
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
                }),
            ],
        )

        const commentsTable = table(
            'comments',
            {
                id: t.string().primaryKey(),
                postId: t.string(),
                authorId: t.string(),
            },
            (tbl) => [
                foreignKey({
                    columns: [tbl.postId],
                    foreignColumns: [columnRef('posts', 'id')],
                    onDelete: 'cascade',
                }),
                foreignKey({
                    columns: [tbl.authorId],
                    foreignColumns: [columnRef('users', 'id')],
                    onDelete: 'set null',
                }),
            ],
        )

        // Verify foreign keys are accessible from the table definitions
        expect(postsTable.constraints?.filter((c) => c.type === 'foreignKey')).toHaveLength(1)
        expect(commentsTable.constraints?.filter((c) => c.type === 'foreignKey')).toHaveLength(2)

        // Verify referential actions
        const postFk = postsTable.constraints![0]
        if (postFk.type === 'foreignKey') {
            expect(postFk.onDelete).toBe('cascade')
        }

        const commentFks = commentsTable.constraints!.filter((c) => c.type === 'foreignKey')
        expect(commentFks).toHaveLength(2)
    })

    it('supports set default action', () => {
        const postsTable = table(
            'posts',
            {
                id: t.string().primaryKey(),
                categoryId: t.string(),
            },
            (tbl) => [
                foreignKey({
                    columns: [tbl.categoryId],
                    foreignColumns: [columnRef('categories', 'id')],
                    onDelete: 'set default',
                    onUpdate: 'set default',
                }),
            ],
        )

        const fk = postsTable.constraints![0]
        if (fk.type === 'foreignKey') {
            expect(fk.onDelete).toBe('set default')
            expect(fk.onUpdate).toBe('set default')
        }
    })

    it('supports restrict and no action', () => {
        const ordersTable = table(
            'orders',
            {
                id: t.string().primaryKey(),
                customerId: t.string(),
                productId: t.string(),
            },
            (tbl) => [
                foreignKey({
                    columns: [tbl.customerId],
                    foreignColumns: [columnRef('customers', 'id')],
                    onDelete: 'restrict',
                }),
                foreignKey({
                    columns: [tbl.productId],
                    foreignColumns: [columnRef('products', 'id')],
                    onDelete: 'no action',
                }),
            ],
        )

        const fks = ordersTable.constraints!.filter((c) => c.type === 'foreignKey')
        expect(fks).toHaveLength(2)

        const customerFk = fks[0]
        const productFk = fks[1]

        if (customerFk.type === 'foreignKey') {
            expect(customerFk.onDelete).toBe('restrict')
        }
        if (productFk.type === 'foreignKey') {
            expect(productFk.onDelete).toBe('no action')
        }
    })
})

/**
 * Note: Foreign key constraint enforcement behavior by adapter:
 *
 * - **Drizzle**: Foreign keys are defined in the native Drizzle schema using
 *   `.references()` or `foreignKey()`. The database enforces the constraints.
 *   Our schema's foreign key constraints are metadata only for this adapter.
 *
 * - **Dexie/IndexedDB**: IndexedDB does not support foreign key constraints.
 *   The constraints in our schema are metadata that can be used for validation
 *   at the application level if needed.
 *
 * - **Memory**: The in-memory adapter does not enforce foreign key constraints.
 *   The constraints are schema metadata only.
 *
 * The `onDelete` and `onUpdate` actions are primarily useful for:
 * 1. DDL generation (SQL migrations)
 * 2. Documentation purposes
 * 3. Application-level validation if implemented
 */
