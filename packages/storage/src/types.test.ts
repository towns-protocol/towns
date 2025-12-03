/**
 * Type tests for the storage schema builders and typed adapter.
 * Uses vitest's expectTypeOf for compile-time type assertions.
 *
 * @see https://vitest.dev/api/expect-typeof.html
 */

import { describe, it, expectTypeOf } from 'vitest'
import { t, type InferColumnType, type InferTableType } from './builders.js'
import { table, schema } from './schema.js'
import {
    type TypedStorageAdapter,
    type Models,
    type TypedWhereClause,
    type TypedSortBy,
    type TypedJoinOptions,
    type WithJoins,
    type Prettify,
} from './types.js'

// ============= Column Builder Type Tests =============

describe('column builder types', () => {
    it('t.string() infers string type', () => {
        const col = t.string()
        expectTypeOf<InferColumnType<typeof col>>().toEqualTypeOf<string>()
    })

    it('t.integer() infers number type', () => {
        const col = t.integer()
        expectTypeOf<InferColumnType<typeof col>>().toEqualTypeOf<number>()
    })

    it('t.boolean() infers boolean type', () => {
        const col = t.boolean()
        expectTypeOf<InferColumnType<typeof col>>().toEqualTypeOf<boolean>()
    })

    it('t.bytes() infers Uint8Array type', () => {
        const col = t.bytes()
        expectTypeOf<InferColumnType<typeof col>>().toEqualTypeOf<Uint8Array>()
    })

    it('t.bigint() infers bigint type', () => {
        const col = t.bigint()
        expectTypeOf<InferColumnType<typeof col>>().toEqualTypeOf<bigint>()
    })

    it('t.date() infers Date type', () => {
        const col = t.date()
        expectTypeOf<InferColumnType<typeof col>>().toEqualTypeOf<Date>()
    })

    it('t.json() infers unknown by default', () => {
        const col = t.json()
        expectTypeOf<InferColumnType<typeof col>>().toEqualTypeOf<unknown>()
    })

    it('t.json().type<T>() infers custom type', () => {
        const col = t.json().type<{ foo: string; bar: number }>()
        expectTypeOf<InferColumnType<typeof col>>().toEqualTypeOf<{ foo: string; bar: number }>()
    })

    it('nullable columns add | null to type', () => {
        const col = t.string().nullable()
        expectTypeOf<InferColumnType<typeof col>>().toEqualTypeOf<string | null>()
    })

    it('nullable json with custom type', () => {
        const col = t.json().type<string[]>().nullable()
        expectTypeOf<InferColumnType<typeof col>>().toEqualTypeOf<string[] | null>()
    })

    it('primaryKey does not change type', () => {
        const col = t.string().primaryKey()
        expectTypeOf<InferColumnType<typeof col>>().toEqualTypeOf<string>()
    })

    it('chaining nullable after primaryKey', () => {
        const col = t.integer().primaryKey().nullable()
        expectTypeOf<InferColumnType<typeof col>>().toEqualTypeOf<number | null>()
    })
})

// ============= Table Type Inference Tests =============

describe('table type inference', () => {
    const usersTable = table('users', {
        id: t.string().primaryKey(),
        name: t.string(),
        age: t.integer().nullable(),
        avatar: t.bytes(),
        metadata: t.json().type<{ role: string }>(),
    })

    it('table has correct name', () => {
        expectTypeOf(usersTable.name).toEqualTypeOf<'users'>()
    })

    it('InferTableType extracts correct record type', () => {
        type UserRecord = InferTableType<typeof usersTable.columns>
        expectTypeOf<UserRecord>().toEqualTypeOf<{
            id: string
            name: string
            age: number | null
            avatar: Uint8Array
            metadata: { role: string }
        }>()
    })
})

// ============= Schema Type Inference Tests =============

describe('schema type inference', () => {
    const usersTable = table('users', {
        id: t.string().primaryKey(),
        email: t.string(),
    })

    const postsTable = table('posts', {
        id: t.string().primaryKey(),
        userId: t.string(),
        content: t.string(),
        createdAt: t.date(),
    })

    const testSchema = schema('test', {
        tables: [usersTable, postsTable] as const,
        version: 1,
    })

    it('Models extracts all model types', () => {
        type TestModels = Models<typeof testSchema>

        expectTypeOf<TestModels['users']>().toEqualTypeOf<{
            id: string
            email: string
        }>()

        expectTypeOf<TestModels['posts']>().toEqualTypeOf<{
            id: string
            userId: string
            content: string
            createdAt: Date
        }>()
    })

    it('schema has correct name', () => {
        expectTypeOf(testSchema.name).toEqualTypeOf<'test'>()
    })

    it('schema has correct version', () => {
        expectTypeOf(testSchema.version).toEqualTypeOf<number>()
    })
})

// ============= TypedStorageAdapter Tests =============

describe('TypedStorageAdapter', () => {
    const accountTable = table('account', {
        id: t.string().primaryKey(),
        balance: t.bigint(),
        active: t.boolean(),
    })

    const sessionsTable = table('sessions', {
        sessionId: t.string().primaryKey(),
        accountId: t.string(),
        data: t.bytes(),
        expiresAt: t.date().nullable(),
    })

    const testSchema = schema('test', {
        tables: [accountTable, sessionsTable] as const,
        version: 1,
    })

    // Type alias for the typed adapter
    type TestAdapter = TypedStorageAdapter<typeof testSchema>

    describe('findOne', () => {
        it('returns correct type for model', () => {
            // Test the return type of findOne for 'account' model
            type FindOneResult = Awaited<ReturnType<TestAdapter['findOne']>>
            expectTypeOf<FindOneResult>().toEqualTypeOf<
                | {
                      id: string
                      balance: bigint
                      active: boolean
                  }
                | {
                      sessionId: string
                      accountId: string
                      data: Uint8Array
                      expiresAt: Date | null
                  }
                | null
            >()
        })

        it('where clause field is constrained to model fields', () => {
            type AccountWhere = TypedWhereClause<Models<typeof testSchema>['account']>
            expectTypeOf<AccountWhere['field']>().toEqualTypeOf<'id' | 'balance' | 'active'>()

            type SessionsWhere = TypedWhereClause<Models<typeof testSchema>['sessions']>
            expectTypeOf<SessionsWhere['field']>().toEqualTypeOf<
                'sessionId' | 'accountId' | 'data' | 'expiresAt'
            >()
        })
    })

    describe('findMany', () => {
        it('sessions model has correct fields', () => {
            type SessionRecord = Models<typeof testSchema>['sessions']
            expectTypeOf<SessionRecord>().toEqualTypeOf<{
                sessionId: string
                accountId: string
                data: Uint8Array
                expiresAt: Date | null
            }>()
        })

        it('sortBy field type is constrained', () => {
            type SessionSort = TypedSortBy<Models<typeof testSchema>['sessions']>
            expectTypeOf<SessionSort['field']>().toEqualTypeOf<
                'sessionId' | 'accountId' | 'data' | 'expiresAt'
            >()
            expectTypeOf<SessionSort['direction']>().toEqualTypeOf<'asc' | 'desc'>()
        })
    })

    describe('create', () => {
        it('account model has correct type', () => {
            type AccountRecord = Models<typeof testSchema>['account']
            expectTypeOf<AccountRecord>().toEqualTypeOf<{
                id: string
                balance: bigint
                active: boolean
            }>()
        })
    })

    describe('update', () => {
        it('partial data type is correct', () => {
            type AccountRecord = Models<typeof testSchema>['account']
            type PartialAccount = Partial<AccountRecord>
            expectTypeOf<PartialAccount>().toEqualTypeOf<{
                id?: string
                balance?: bigint
                active?: boolean
            }>()
        })
    })

    describe('upsert', () => {
        it('sessions create data type is correct', () => {
            type SessionRecord = Models<typeof testSchema>['sessions']
            expectTypeOf<SessionRecord['expiresAt']>().toEqualTypeOf<Date | null>()
        })
    })

    describe('count and exists', () => {
        it('count method exists on adapter type', () => {
            expectTypeOf<TestAdapter['count']>().toBeFunction()
        })

        it('exists method exists on adapter type', () => {
            expectTypeOf<TestAdapter['exists']>().toBeFunction()
        })
    })

    describe('delete operations', () => {
        it('delete method exists on adapter type', () => {
            expectTypeOf<TestAdapter['delete']>().toBeFunction()
        })

        it('deleteMany method exists on adapter type', () => {
            expectTypeOf<TestAdapter['deleteMany']>().toBeFunction()
        })

        it('clear method exists on adapter type', () => {
            expectTypeOf<TestAdapter['clear']>().toBeFunction()
        })
    })

    describe('transaction', () => {
        it('transaction method exists on adapter type', () => {
            expectTypeOf<TestAdapter['transaction']>().toBeFunction()
        })
    })
})

// ============= Edge Cases =============

describe('edge cases', () => {
    it('empty table with no columns', () => {
        const emptyTable = table('empty', {})
        type EmptyRecord = InferTableType<typeof emptyTable.columns>
        // eslint-disable-next-line @typescript-eslint/ban-types
        expectTypeOf<EmptyRecord>().toEqualTypeOf<{}>()
    })

    it('table with all nullable columns', () => {
        const nullableTable = table('nullable', {
            a: t.string().nullable(),
            b: t.integer().nullable(),
            c: t.boolean().nullable(),
        })
        type NullableRecord = InferTableType<typeof nullableTable.columns>
        expectTypeOf<NullableRecord>().toEqualTypeOf<{
            a: string | null
            b: number | null
            c: boolean | null
        }>()
    })

    it('complex json types', () => {
        interface ComplexData {
            nested: {
                items: Array<{ id: number; value: string }>
            }
            optional?: string
        }

        const complexTable = table('complex', {
            id: t.string().primaryKey(),
            data: t.json().type<ComplexData>(),
        })

        type ComplexRecord = InferTableType<typeof complexTable.columns>
        expectTypeOf<ComplexRecord['data']>().toEqualTypeOf<ComplexData>()
    })

    it('table with indexes via constraints callback', () => {
        const indexedTable = table(
            'indexed',
            {
                id: t.string().primaryKey(),
                category: t.string(),
                createdAt: t.date(),
            },
            (tbl) => [
                index('idx_category').on(tbl.category),
                index('idx_created').on(tbl.createdAt),
            ],
        )

        expectTypeOf(indexedTable.constraints).toEqualTypeOf<
            | Array<
                  | { type: 'index'; name: string; columns: string[]; unique: boolean }
                  | { type: 'primaryKey'; name?: string; columns: string[] }
                  | {
                        type: 'foreignKey'
                        name?: string
                        columns: string[]
                        foreignTable: string
                        foreignColumns: string[]
                        onDelete?: 'cascade' | 'restrict' | 'no action' | 'set null' | 'set default'
                        onUpdate?: 'cascade' | 'restrict' | 'no action' | 'set null' | 'set default'
                    }
              >
            | undefined
        >()
    })
})

// ============= Constraint Builder Tests =============

import { index, uniqueIndex, primaryKey, foreignKey } from './constraints.js'

describe('constraint builders', () => {
    it('table with callback-based constraints', () => {
        const sessionsTable = table(
            'sessions',
            {
                streamId: t.string(),
                sessionId: t.string(),
                data: t.bytes(),
                createdAt: t.date(),
            },
            (tbl) => [
                primaryKey({ columns: [tbl.streamId, tbl.sessionId] }),
                index('idx_created').on(tbl.createdAt),
            ],
        )

        expectTypeOf(sessionsTable.name).toEqualTypeOf<'sessions'>()
        expectTypeOf(sessionsTable.constraints).toEqualTypeOf<
            | Array<
                  | { type: 'index'; name: string; columns: string[]; unique: boolean }
                  | { type: 'primaryKey'; name?: string; columns: string[] }
                  | {
                        type: 'foreignKey'
                        name?: string
                        columns: string[]
                        foreignTable: string
                        foreignColumns: string[]
                        onDelete?: 'cascade' | 'restrict' | 'no action' | 'set null' | 'set default'
                        onUpdate?: 'cascade' | 'restrict' | 'no action' | 'set null' | 'set default'
                    }
              >
            | undefined
        >()
    })

    it('unique index constraint', () => {
        const usersTable = table(
            'users',
            {
                id: t.string(),
                email: t.string(),
            },
            (tbl) => [uniqueIndex('idx_email').on(tbl.email)],
        )

        expectTypeOf(usersTable.constraints).not.toBeUndefined()
    })

    it('foreign key constraint', () => {
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
                    foreignColumns: [{ _columnName: 'id', _tableName: 'users' }],
                    onDelete: 'cascade',
                }),
            ],
        )

        expectTypeOf(postsTable.name).toEqualTypeOf<'posts'>()
    })

    it('compound index', () => {
        const logsTable = table(
            'logs',
            {
                userId: t.string(),
                action: t.string(),
                timestamp: t.date(),
            },
            (tbl) => [index('idx_user_action').on(tbl.userId, tbl.action)],
        )

        expectTypeOf(logsTable.constraints).not.toBeUndefined()
    })
})

// ============= Join Type Inference Tests =============

describe('join type inference', () => {
    const usersTable = table('users', {
        id: t.string().primaryKey(),
        name: t.string(),
        email: t.string().nullable(),
    })

    const postsTable = table('posts', {
        id: t.string().primaryKey(),
        title: t.string(),
        content: t.string().nullable(),
        user_id: t.string(),
    })

    const profilesTable = table('profiles', {
        id: t.string().primaryKey(),
        bio: t.string().nullable(),
        user_id: t.string(),
    })

    const testSchema = schema('test', {
        tables: [usersTable, postsTable, profilesTable] as const,
        version: 1,
    })

    type TestModels = Models<typeof testSchema>

    describe('WithJoins type', () => {
        it('one-to-many join adds array property', () => {
            type JoinOptions = {
                posts: {
                    on: { from: 'id'; to: 'user_id' }
                    relation: 'one-to-many'
                }
            }

            type Result = Prettify<WithJoins<typeof testSchema, TestModels['users'], JoinOptions>>

            expectTypeOf<Result>().toEqualTypeOf<{
                id: string
                name: string
                email: string | null
                posts: Array<{
                    id: string
                    title: string
                    content: string | null
                    user_id: string
                }>
            }>()
        })

        it('one-to-one join adds nullable property', () => {
            type JoinOptions = {
                profiles: {
                    on: { from: 'id'; to: 'user_id' }
                    relation: 'one-to-one'
                }
            }

            type Result = Prettify<WithJoins<typeof testSchema, TestModels['users'], JoinOptions>>

            expectTypeOf<Result>().toEqualTypeOf<{
                id: string
                name: string
                email: string | null
                profiles: {
                    id: string
                    bio: string | null
                    user_id: string
                } | null
            }>()
        })

        it('multiple joins add multiple properties', () => {
            type JoinOptions = {
                posts: {
                    on: { from: 'id'; to: 'user_id' }
                    relation: 'one-to-many'
                }
                profiles: {
                    on: { from: 'id'; to: 'user_id' }
                    relation: 'one-to-one'
                }
            }

            type Result = Prettify<WithJoins<typeof testSchema, TestModels['users'], JoinOptions>>

            expectTypeOf<Result>().toEqualTypeOf<{
                id: string
                name: string
                email: string | null
                posts: Array<{
                    id: string
                    title: string
                    content: string | null
                    user_id: string
                }>
                profiles: {
                    id: string
                    bio: string | null
                    user_id: string
                } | null
            }>()
        })

        it('no joins returns base model', () => {
            type Result = WithJoins<typeof testSchema, TestModels['users'], undefined>

            expectTypeOf<Result>().toEqualTypeOf<{
                id: string
                name: string
                email: string | null
            }>()
        })
    })

    describe('TypedJoinOptions', () => {
        it('join keys are constrained to model names', () => {
            type JoinOpts = TypedJoinOptions<typeof testSchema, TestModels['users']>
            expectTypeOf<keyof JoinOpts>().toEqualTypeOf<'users' | 'posts' | 'profiles'>()
        })

        it('join on.from is constrained to base model fields', () => {
            type JoinOpts = TypedJoinOptions<typeof testSchema, TestModels['users']>
            type PostsJoinConfig = NonNullable<JoinOpts['posts']>
            expectTypeOf<PostsJoinConfig['on']['from']>().toEqualTypeOf<'id' | 'name' | 'email'>()
        })

        it('join on.to is constrained to joined model fields', () => {
            type JoinOpts = TypedJoinOptions<typeof testSchema, TestModels['users']>
            type PostsJoinConfig = NonNullable<JoinOpts['posts']>
            expectTypeOf<PostsJoinConfig['on']['to']>().toEqualTypeOf<
                'id' | 'title' | 'content' | 'user_id'
            >()

            type ProfilesJoinConfig = NonNullable<JoinOpts['profiles']>
            expectTypeOf<ProfilesJoinConfig['on']['to']>().toEqualTypeOf<'id' | 'bio' | 'user_id'>()
        })
    })

    describe('TypedStorageAdapter findOne with joins', () => {
        it('findOne with one-to-many join returns correct type', () => {
            // Test the computed result type directly using WithJoins
            type JoinOpts = {
                posts: {
                    on: { from: 'id'; to: 'user_id' }
                    relation: 'one-to-many'
                }
            }
            type Result = Prettify<
                WithJoins<typeof testSchema, TestModels['users'], JoinOpts>
            > | null

            expectTypeOf<Result>().toEqualTypeOf<{
                id: string
                name: string
                email: string | null
                posts: Array<{
                    id: string
                    title: string
                    content: string | null
                    user_id: string
                }>
            } | null>()
        })

        it('findOne with one-to-one join returns correct type', () => {
            type JoinOpts = {
                profiles: {
                    on: { from: 'id'; to: 'user_id' }
                    relation: 'one-to-one'
                }
            }
            type Result = Prettify<
                WithJoins<typeof testSchema, TestModels['users'], JoinOpts>
            > | null

            expectTypeOf<Result>().toEqualTypeOf<{
                id: string
                name: string
                email: string | null
                profiles: {
                    id: string
                    bio: string | null
                    user_id: string
                } | null
            } | null>()
        })

        it('findOne without join returns base model', () => {
            type Result = Prettify<
                WithJoins<typeof testSchema, TestModels['users'], undefined>
            > | null

            expectTypeOf<Result>().toEqualTypeOf<{
                id: string
                name: string
                email: string | null
            } | null>()
        })
    })

    describe('TypedStorageAdapter findMany with joins', () => {
        it('findMany with join returns array of joined type', () => {
            type JoinOpts = {
                posts: {
                    on: { from: 'id'; to: 'user_id' }
                    relation: 'one-to-many'
                }
            }
            type Result = Array<
                Prettify<WithJoins<typeof testSchema, TestModels['users'], JoinOpts>>
            >

            expectTypeOf<Result>().toEqualTypeOf<
                Array<{
                    id: string
                    name: string
                    email: string | null
                    posts: Array<{
                        id: string
                        title: string
                        content: string | null
                        user_id: string
                    }>
                }>
            >()
        })

        it('findMany without join returns array of base model', () => {
            type Result = Array<
                Prettify<WithJoins<typeof testSchema, TestModels['users'], undefined>>
            >

            expectTypeOf<Result>().toEqualTypeOf<
                Array<{
                    id: string
                    name: string
                    email: string | null
                }>
            >()
        })
    })
})
