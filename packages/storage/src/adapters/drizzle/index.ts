/**
 * Drizzle ORM SQLite storage adapter implementation.
 *
 * Inspired by https://github.com/better-auth/better-auth/tree/main/packages/better-auth/src/adapters
 */

import {
    eq,
    ne,
    gt,
    gte,
    lt,
    lte,
    like,
    inArray,
    notInArray,
    and,
    or,
    sql,
    desc,
    asc,
} from 'drizzle-orm'
import type { SQLWrapper } from 'drizzle-orm'
import type { StorageAdapter, WhereClause, SortBy, JoinOptions, JoinConfig } from '../../types.js'

/**
 * Drizzle table type - a table object with columns.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DrizzleTable = { [key: string]: any }

/**
 * Drizzle SQLite database instance type.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DrizzleDB = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    select: (fields?: any) => any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    insert: (table: any) => any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    update: (table: any) => any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete: (table: any) => any
    // Transaction support
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    transaction?: (fn: (tx: any) => Promise<any>) => Promise<any>
    // Execute raw SQL (for sync drivers)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    run?: (query: any) => any
}

/**
 * Max limit value for offset-only queries.
 * SQLite requires LIMIT when using OFFSET.
 */
const MAX_LIMIT = 2147483647

/**
 * Default limit for one-to-many joins.
 */
const DEFAULT_JOIN_LIMIT = 100

/**
 * Schema type - a record of table name to Drizzle table object.
 */
type DrizzleSchema = Record<string, DrizzleTable>

/**
 * Build a Drizzle where condition from WhereClause array.
 */
function buildWhere(table: DrizzleTable, where: WhereClause[]): SQLWrapper | undefined {
    if (!where.length) return undefined

    const conditions: SQLWrapper[] = []
    const orGroups: SQLWrapper[][] = [[]]

    for (let i = 0; i < where.length; i++) {
        const clause = where[i]
        const column = table[clause.field]

        if (!column) {
            throw new Error(`Unknown column: ${clause.field}`)
        }

        let condition: SQLWrapper

        switch (clause.operator ?? 'eq') {
            case 'eq':
                condition = eq(column, clause.value)
                break
            case 'ne':
                condition = ne(column, clause.value)
                break
            case 'gt':
                condition = gt(column, clause.value)
                break
            case 'gte':
                condition = gte(column, clause.value)
                break
            case 'lt':
                condition = lt(column, clause.value)
                break
            case 'lte':
                condition = lte(column, clause.value)
                break
            case 'in':
                condition = inArray(column, clause.value as unknown[])
                break
            case 'not_in':
                condition = notInArray(column, clause.value as unknown[])
                break
            case 'contains':
                condition = like(column, `%${clause.value}%`)
                break
            case 'starts_with':
                condition = like(column, `${clause.value}%`)
                break
            case 'ends_with':
                condition = like(column, `%${clause.value}`)
                break
            default:
                condition = eq(column, clause.value)
        }

        // Handle connectors
        if (i > 0 && clause.connector === 'OR') {
            // Start a new OR group
            orGroups.push([condition])
        } else {
            // Add to current group (AND)
            orGroups[orGroups.length - 1].push(condition)
        }
    }

    // Build the final condition
    // Each group is ANDed together, groups are ORed
    if (orGroups.length === 1) {
        // Simple case: all AND
        conditions.push(...orGroups[0])
        return conditions.length === 1 ? conditions[0] : and(...conditions)
    } else {
        // Complex case: has OR groups
        const groupConditions = orGroups.map((group) =>
            group.length === 1 ? group[0] : and(...group),
        )
        return or(...(groupConditions as [SQLWrapper, ...SQLWrapper[]]))
    }
}

/**
 * Normalize join config - convert `true` to default config.
 */
function normalizeJoinConfig(joinModel: string, config: JoinConfig | true): JoinConfig {
    if (config === true) {
        return {
            on: { from: 'id', to: `${joinModel}_id` },
            relation: 'one-to-many',
            limit: DEFAULT_JOIN_LIMIT,
        }
    }
    return {
        ...config,
        limit: config.limit ?? DEFAULT_JOIN_LIMIT,
    }
}

/**
 * Create a Drizzle SQLite storage adapter.
 *
 * @param db - Drizzle SQLite database instance
 * @param schema - Schema object mapping model names to Drizzle tables
 * @returns A StorageAdapter implementation
 *
 * @example
 * ```typescript
 * import { drizzle } from 'drizzle-orm/libsql'
 * import { createClient } from '@libsql/client'
 * import * as schema from './schema'
 * import { drizzleSqliteAdapter } from '@towns-protocol/storage/adapters/drizzle'
 *
 * const client = createClient({ url: ':memory:' })
 * const db = drizzle(client, { schema })
 * const adapter = drizzleSqliteAdapter(db, schema)
 * ```
 */
export function drizzleSqliteAdapter(db: DrizzleDB, schema: DrizzleSchema): StorageAdapter {
    const getTable = (model: string): DrizzleTable => {
        const table = schema[model]
        if (!table) {
            throw new Error(`Unknown model: ${model}`)
        }
        return table
    }

    /**
     * Apply joins to records by querying related tables.
     */
    async function applyJoins(
        database: DrizzleDB,
        records: Record<string, unknown>[],
        join: JoinOptions,
    ): Promise<Record<string, unknown>[]> {
        if (!join || Object.keys(join).length === 0) {
            return records
        }

        const results: Record<string, unknown>[] = []

        for (const record of records) {
            const result = { ...record }

            for (const [joinModel, joinConfigOrTrue] of Object.entries(join)) {
                const config = normalizeJoinConfig(joinModel, joinConfigOrTrue)
                const joinTable = schema[joinModel]

                if (!joinTable) {
                    result[joinModel] = config.relation === 'one-to-one' ? null : []
                    continue
                }

                const localValue = record[config.on.from]
                const foreignColumn = joinTable[config.on.to]

                if (!foreignColumn) {
                    result[joinModel] = config.relation === 'one-to-one' ? null : []
                    continue
                }

                // Query the joined table
                let query = database.select().from(joinTable).where(eq(foreignColumn, localValue))

                if (config.relation === 'one-to-one') {
                    query = query.limit(1)
                } else {
                    query = query.limit(config.limit ?? DEFAULT_JOIN_LIMIT)
                }

                const joinedRecords = await query

                if (config.relation === 'one-to-one') {
                    result[joinModel] = joinedRecords[0] ?? null
                } else {
                    result[joinModel] = joinedRecords
                }
            }

            results.push(result)
        }

        return results
    }

    // Helper to create a transactional adapter
    const createAdapter = (database: DrizzleDB): StorageAdapter => {
        const adapter: StorageAdapter = {
            async create<T>({ model, data }: { model: string; data: Partial<T> }): Promise<T> {
                const table = getTable(model)
                const [result] = await database.insert(table).values(data).returning()
                return result as T
            },

            async createMany<T>({
                model,
                data,
            }: {
                model: string
                data: Partial<T>[]
            }): Promise<T[]> {
                if (data.length === 0) return []
                const table = getTable(model)
                const results = await database.insert(table).values(data).returning()
                return results as T[]
            },

            async findOne<T>({
                model,
                where,
                join,
            }: {
                model: string
                where: WhereClause[]
                join?: JoinOptions
            }): Promise<T | null> {
                const table = getTable(model)
                const whereCondition = buildWhere(table, where)
                const query = database.select().from(table)

                const results = whereCondition
                    ? await query.where(whereCondition).limit(1)
                    : await query.limit(1)

                if (results.length === 0) return null

                if (join) {
                    const [withJoins] = await applyJoins(database, results, join)
                    return withJoins as T
                }

                return results[0] as T
            },

            async findMany<T>({
                model,
                where = [],
                sortBy,
                limit,
                offset,
                join,
            }: {
                model: string
                where?: WhereClause[]
                sortBy?: SortBy
                limit?: number
                offset?: number
                join?: JoinOptions
            }): Promise<T[]> {
                const table = getTable(model)
                const whereCondition = buildWhere(table, where)
                let query = database.select().from(table)

                if (whereCondition) {
                    query = query.where(whereCondition)
                }

                if (sortBy) {
                    const column = table[sortBy.field]
                    if (column) {
                        query = query.orderBy(
                            sortBy.direction === 'asc' ? asc(column) : desc(column),
                        )
                    }
                }

                // SQLite requires LIMIT when using OFFSET
                if (offset !== undefined && offset > 0) {
                    // If offset is provided but no limit, use max limit
                    query = query.limit(limit !== undefined && limit > 0 ? limit : MAX_LIMIT)
                    query = query.offset(offset)
                } else if (limit !== undefined && limit > 0) {
                    query = query.limit(limit)
                }

                let results = await query

                if (join) {
                    results = await applyJoins(database, results, join)
                }

                return results as T[]
            },

            async count({
                model,
                where = [],
            }: {
                model: string
                where?: WhereClause[]
            }): Promise<number> {
                const table = getTable(model)
                const whereCondition = buildWhere(table, where)
                let query = database.select({ count: sql<number>`count(*)` }).from(table)

                if (whereCondition) {
                    query = query.where(whereCondition)
                }

                const result = await query
                return Number(result[0]?.count ?? 0)
            },

            async exists({
                model,
                where,
            }: {
                model: string
                where: WhereClause[]
            }): Promise<boolean> {
                const table = getTable(model)
                const whereCondition = buildWhere(table, where)

                if (!whereCondition) {
                    throw new Error('Exists requires a where clause')
                }

                const results = await database.select().from(table).where(whereCondition).limit(1)
                return results.length > 0
            },

            async update<T>({
                model,
                where,
                data,
            }: {
                model: string
                where: WhereClause[]
                data: Partial<T>
            }): Promise<T | null> {
                const table = getTable(model)
                const whereCondition = buildWhere(table, where)

                if (!whereCondition) {
                    throw new Error('Update requires a where clause')
                }

                const results = await database
                    .update(table)
                    .set(data)
                    .where(whereCondition)
                    .returning()

                return (results[0] as T) ?? null
            },

            async upsert<T>({
                model,
                where,
                create,
                update,
            }: {
                model: string
                where: WhereClause[]
                create: Partial<T>
                update: Partial<T>
            }): Promise<T> {
                const table = getTable(model)
                const whereCondition = buildWhere(table, where)

                if (!whereCondition) {
                    throw new Error('Upsert requires a where clause')
                }

                // Check if record exists
                const existing = await database.select().from(table).where(whereCondition).limit(1)

                if (existing.length > 0) {
                    // Update existing record
                    const [updated] = await database
                        .update(table)
                        .set(update)
                        .where(whereCondition)
                        .returning()
                    return updated as T
                } else {
                    // Create new record
                    const [created] = await database.insert(table).values(create).returning()
                    return created as T
                }
            },

            async updateMany<T>({
                model,
                where,
                data,
            }: {
                model: string
                where: WhereClause[]
                data: Partial<T>
            }): Promise<number> {
                const table = getTable(model)
                const whereCondition = buildWhere(table, where)

                if (!whereCondition) {
                    throw new Error('UpdateMany requires a where clause')
                }

                // Most Drizzle drivers don't return affected row count directly from returning()
                // We need to count first, then update
                const countResult = await adapter.count({ model, where })

                if (countResult === 0) {
                    return 0
                }

                await database.update(table).set(data).where(whereCondition)

                return countResult
            },

            async delete({ model, where }: { model: string; where: WhereClause[] }): Promise<void> {
                const table = getTable(model)
                const whereCondition = buildWhere(table, where)

                if (!whereCondition) {
                    throw new Error('Delete requires a where clause')
                }

                await database.delete(table).where(whereCondition)
            },

            async deleteMany({
                model,
                where,
            }: {
                model: string
                where: WhereClause[]
            }): Promise<number> {
                const table = getTable(model)
                const whereCondition = buildWhere(table, where)

                if (!whereCondition) {
                    throw new Error('DeleteMany requires a where clause')
                }

                // Count first since most drivers don't return affected count
                const countResult = await adapter.count({ model, where })

                if (countResult === 0) {
                    return 0
                }

                await database.delete(table).where(whereCondition)

                return countResult
            },

            async clear({ model }: { model: string }): Promise<number> {
                const table = getTable(model)
                // Count first since most drivers don't return affected count
                const countResult = await adapter.count({ model })

                if (countResult === 0) {
                    return 0
                }

                // Delete all records - use sql`1=1` as a universal "true" condition
                await database.delete(table).where(sql`1=1`)

                return countResult
            },

            async transaction<T>(fn: (adapter: StorageAdapter) => Promise<T>): Promise<T> {
                // For sync SQLite drivers, transactions must be synchronous.
                // We use manual BEGIN/COMMIT/ROLLBACK with raw SQL.
                if (database.run) {
                    try {
                        database.run(sql`BEGIN`)
                        const result = await fn(adapter)
                        database.run(sql`COMMIT`)
                        return result
                    } catch (error) {
                        database.run(sql`ROLLBACK`)
                        throw error
                    }
                } else {
                    // For async drivers, use the standard transaction API
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const dbWithTransaction = database as any
                    if (typeof dbWithTransaction.transaction === 'function') {
                        return dbWithTransaction.transaction(async (tx: DrizzleDB) => {
                            const txAdapter = createAdapter(tx)
                            return fn(txAdapter)
                        })
                    }
                    // Fallback: just run without transaction
                    return fn(adapter)
                }
            },
        }

        return adapter
    }

    return createAdapter(db)
}

// Re-export schema compiler functions
export { toSqliteTable, toSqliteSchema } from './sqlite-schema.js'
export type { SqliteTableResult, SqliteSchemaResult } from './sqlite-schema.js'
