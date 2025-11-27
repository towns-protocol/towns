/**
 * Dexie (IndexedDB) storage adapter implementation.
 * Supports IndexedDB via Dexie with efficient indexed queries.
 */

import type Dexie from 'dexie'
import type { Table, Collection, IndexableType, UpdateSpec } from 'dexie'
import type {
    StorageAdapter,
    WhereClause,
    SortBy,
    TableChange,
    JoinOptions,
    JoinConfig,
    TypedSchemaDef,
    TypedTableDef,
} from '../../types.js'

/**
 * Default limit for one-to-many joins.
 */
const DEFAULT_JOIN_LIMIT = 100

/**
 * Check if a record matches a single where clause.
 */
function matchesClause(record: Record<string, unknown>, clause: WhereClause): boolean {
    const value = record[clause.field]

    switch (clause.operator ?? 'eq') {
        case 'eq':
            return value === clause.value
        case 'ne':
            return value !== clause.value
        case 'gt':
            return (value as number) > (clause.value as number)
        case 'gte':
            return (value as number) >= (clause.value as number)
        case 'lt':
            return (value as number) < (clause.value as number)
        case 'lte':
            return (value as number) <= (clause.value as number)
        case 'in':
            return (clause.value as unknown[]).includes(value)
        case 'not_in':
            return !(clause.value as unknown[]).includes(value)
        case 'contains':
            return String(value).includes(String(clause.value))
        case 'starts_with':
            return String(value).startsWith(String(clause.value))
        case 'ends_with':
            return String(value).endsWith(String(clause.value))
        default:
            return value === clause.value
    }
}

/**
 * Check if any clause has an OR connector.
 */
function hasOrConnector(where: WhereClause[]): boolean {
    return where.some((c) => c.connector === 'OR')
}

/**
 * Split where clauses into groups based on OR connectors.
 * Each group contains clauses that should be AND-ed together.
 * Groups are OR-ed with each other.
 */
function splitByOrConnector(where: WhereClause[]): WhereClause[][] {
    const groups: WhereClause[][] = []
    let currentGroup: WhereClause[] = []

    for (const clause of where) {
        if (clause.connector === 'OR' && currentGroup.length > 0) {
            groups.push(currentGroup)
            currentGroup = [clause]
        } else {
            currentGroup.push(clause)
        }
    }

    if (currentGroup.length > 0) {
        groups.push(currentGroup)
    }

    return groups
}

/**
 * Check if a record matches all clauses in a group (AND logic).
 */
function matchesAllClauses(record: Record<string, unknown>, clauses: WhereClause[]): boolean {
    return clauses.every((clause) => matchesClause(record, clause))
}

/**
 * Build a Dexie collection from where clauses.
 * Uses indexed queries when possible for performance.
 * Supports both AND and OR connectors.
 */
function buildCollection<T>(table: Table<T>, where: WhereClause[]): Collection<T> {
    if (!where.length) {
        return table.toCollection()
    }

    // If there are OR connectors, use filter-based approach
    if (hasOrConnector(where)) {
        const groups = splitByOrConnector(where)
        return table.toCollection().and((record) => {
            // Record matches if it matches any group (OR logic between groups)
            return groups.some((group) =>
                matchesAllClauses(record as Record<string, unknown>, group),
            )
        })
    }

    // All AND logic - use indexed queries when possible
    // Separate eq clauses from non-eq clauses
    const eqClauses = where.filter((c) => (c.operator ?? 'eq') === 'eq')
    const nonEqClauses = where.filter((c) => (c.operator ?? 'eq') !== 'eq')

    let collection: Collection<T>

    // If we have multiple eq clauses, use compound where for potential index usage
    if (eqClauses.length > 1) {
        const whereObj = Object.fromEntries(eqClauses.map((c) => [c.field, c.value]))
        collection = table.where(whereObj)

        // Add non-eq clauses as filters
        for (const clause of nonEqClauses) {
            collection = collection.and((record) =>
                matchesClause(record as Record<string, unknown>, clause),
            )
        }
    } else if (eqClauses.length === 1) {
        // Single eq clause - use indexed where
        const clause = eqClauses[0]
        collection = table.where(clause.field).equals(clause.value as IndexableType)

        // Add non-eq clauses as filters
        for (const nonEqClause of nonEqClauses) {
            collection = collection.and((record) =>
                matchesClause(record as Record<string, unknown>, nonEqClause),
            )
        }
    } else {
        // No eq clauses - try to use first non-eq clause for indexed query
        const firstClause = nonEqClauses[0]
        const remainingClauses = nonEqClauses.slice(1)

        switch (firstClause.operator) {
            case 'gt':
                collection = table
                    .where(firstClause.field)
                    .above(firstClause.value as IndexableType)
                break
            case 'gte':
                collection = table
                    .where(firstClause.field)
                    .aboveOrEqual(firstClause.value as IndexableType)
                break
            case 'lt':
                collection = table
                    .where(firstClause.field)
                    .below(firstClause.value as IndexableType)
                break
            case 'lte':
                collection = table
                    .where(firstClause.field)
                    .belowOrEqual(firstClause.value as IndexableType)
                break
            case 'in':
                collection = table
                    .where(firstClause.field)
                    .anyOf(firstClause.value as IndexableType[])
                break
            case 'starts_with':
                collection = table.where(firstClause.field).startsWith(firstClause.value as string)
                break
            default:
                // Fall back to full scan with filter
                collection = table.toCollection()
                collection = collection.and((record) =>
                    matchesClause(record as Record<string, unknown>, firstClause),
                )
        }

        // Add remaining clauses as filters
        for (const clause of remainingClauses) {
            collection = collection.and((record) =>
                matchesClause(record as Record<string, unknown>, clause),
            )
        }
    }

    return collection
}

/**
 * Normalize join config - convert `true` to default config.
 */
function normalizeJoinConfig(joinModel: string, config: JoinConfig | true): JoinConfig {
    if (config === true) {
        // Default: assume foreign key is `${baseModel}_id` on joined model
        // and relation is one-to-many
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
 * Apply joins to records using Dexie tables.
 */
async function applyJoins<T>(db: Dexie, records: T[], join: JoinOptions): Promise<T[]> {
    if (!join || Object.keys(join).length === 0) {
        return records
    }

    const results: T[] = []

    for (const record of records) {
        const result = { ...record } as Record<string, unknown>

        for (const [joinModel, joinConfigOrTrue] of Object.entries(join)) {
            const config = normalizeJoinConfig(joinModel, joinConfigOrTrue)
            const joinTable = db.table(joinModel)
            const localValue = (record as Record<string, unknown>)[config.on.from]

            // Find matching records in the joined table
            const matchingRecords = await joinTable
                .where(config.on.to)
                .equals(localValue as IndexableType)
                .toArray()

            if (config.relation === 'one-to-one') {
                // For one-to-one, return single object or null
                result[joinModel] = matchingRecords[0] ? { ...matchingRecords[0] } : null
            } else {
                // For one-to-many, return array with limit
                const limited = matchingRecords.slice(0, config.limit)
                result[joinModel] = limited.map((r) => ({ ...r }))
            }
        }

        results.push(result as T)
    }

    return results
}

/**
 * Create a Dexie storage adapter.
 *
 * @param db - Dexie database instance
 * @returns A StorageAdapter implementation
 *
 * @example
 * ```typescript
 * import Dexie from 'dexie'
 * import { dexieAdapter } from '@towns-protocol/storage/adapters/dexie'
 *
 * const db = new Dexie('myDatabase')
 * db.version(1).stores({
 *   users: 'id,name,email',
 *   posts: 'id,userId,title'
 * })
 *
 * const adapter = dexieAdapter(db)
 * ```
 */
export function dexieAdapter(db: Dexie): StorageAdapter {
    const getTable = <T>(model: string): Table<T> => {
        const table = db.table<T>(model)
        if (!table) {
            throw new Error(`Unknown model: ${model}`)
        }
        return table
    }

    const adapter: StorageAdapter = {
        async create<T>({ model, data }: { model: string; data: Partial<T> }): Promise<T> {
            const table = getTable<T>(model)
            await table.add(data as T)
            return data as T
        },

        async createMany<T>({ model, data }: { model: string; data: Partial<T>[] }): Promise<T[]> {
            if (data.length === 0) return []
            const table = getTable<T>(model)
            await table.bulkAdd(data as T[])
            return data as T[]
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
            const table = getTable<T>(model)
            const collection = buildCollection(table, where)
            const result = await collection.first()
            if (!result) return null

            if (join) {
                const [withJoins] = await applyJoins(db, [result], join)
                return withJoins as T
            }
            return result
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
            const table = getTable<T>(model)
            let collection = buildCollection(table, where)

            let results: T[]

            // Apply sorting
            if (sortBy) {
                if (sortBy.direction === 'desc') {
                    collection = collection.reverse()
                }
                // Note: Dexie's sortBy requires the field to be indexed
                // For non-indexed fields, we sort in memory
                results = await collection.sortBy(sortBy.field)

                // Apply offset and limit
                if (offset !== undefined && offset > 0) {
                    results = results.slice(offset)
                }
                if (limit !== undefined && limit > 0) {
                    results = results.slice(0, limit)
                }
            } else {
                // Apply offset and limit without sorting
                if (offset !== undefined && offset > 0) {
                    collection = collection.offset(offset)
                }
                if (limit !== undefined && limit > 0) {
                    collection = collection.limit(limit)
                }

                results = await collection.toArray()
            }

            // Apply joins if specified
            if (join) {
                results = await applyJoins(db, results, join)
            }

            return results
        },

        async count({
            model,
            where = [],
        }: {
            model: string
            where?: WhereClause[]
        }): Promise<number> {
            const table = getTable(model)
            const collection = buildCollection(table, where)
            return collection.count()
        },

        async exists({ model, where }: { model: string; where: WhereClause[] }): Promise<boolean> {
            const table = getTable(model)
            const collection = buildCollection(table, where)
            const first = await collection.first()
            return first !== undefined
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
            const table = getTable<T>(model)
            const collection = buildCollection(table, where)

            // Get the first matching record
            const existing = await collection.first()
            if (!existing) {
                return null
            }

            // Modify it
            await collection.modify(data as UpdateSpec<T>)

            // Return merged data
            return { ...existing, ...data } as T
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
            const table = getTable<T>(model)
            const collection = buildCollection(table, where)

            const existing = await collection.first()
            if (existing) {
                await collection.modify(update as UpdateSpec<T>)
                return { ...existing, ...update } as T
            } else {
                await table.add(create as T)
                return create as T
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
            const table = getTable<T>(model)
            const collection = buildCollection(table, where)
            return collection.modify(data as UpdateSpec<T>)
        },

        async delete({ model, where }: { model: string; where: WhereClause[] }): Promise<void> {
            const table = getTable(model)
            const collection = buildCollection(table, where)
            await collection.limit(1).delete()
        },

        async deleteMany({
            model,
            where,
        }: {
            model: string
            where: WhereClause[]
        }): Promise<number> {
            const table = getTable(model)
            const collection = buildCollection(table, where)
            return collection.delete()
        },

        async clear({ model }: { model: string }): Promise<number> {
            const table = getTable(model)
            const count = await table.count()
            await table.clear()
            return count
        },

        async transaction<T>(fn: (adapter: StorageAdapter) => Promise<T>): Promise<T> {
            // Get all table names for the transaction scope
            const tableNames = db.tables.map((t) => t.name)

            return db.transaction('rw', tableNames, async () => {
                // Within a Dexie transaction, all operations on the same db
                // automatically participate in the transaction
                return fn(adapter)
            })
        },

        // Note: subscribe() could be implemented using Dexie's liveQuery
        // but it's optional in StorageAdapter and not needed for CryptoStore
    }

    return adapter
}

// ============= Schema to Dexie Store Utilities =============

/**
 * Generate Dexie store definitions from a typed schema.
 *
 * This utility converts our schema definition into the format expected
 * by Dexie's `db.version(n).stores({...})` method.
 *
 * Index format in Dexie:
 * - `id` - single primary key
 * - `[a+b]` - compound primary key
 * - `*field` - multi-entry index (for arrays)
 * - `&field` - unique index
 * - `field` - regular index
 *
 * @example
 * ```typescript
 * import Dexie from 'dexie'
 * import { t, table, schema, index, primaryKey } from '@towns-protocol/storage'
 * import { generateDexieStores } from '@towns-protocol/storage/adapters/dexie'
 *
 * const sessionsTable = table('sessions', {
 *     streamId: t.string(),
 *     sessionId: t.string(),
 *     data: t.bytes(),
 *     createdAt: t.date(),
 * }, (tbl) => [
 *     primaryKey({ columns: [tbl.streamId, tbl.sessionId] }),
 *     index('idx_created').on(tbl.createdAt),
 * ])
 *
 * const mySchema = schema('myapp', {
 *     tables: [sessionsTable] as const,
 *     version: 1,
 * })
 *
 * const db = new Dexie('myapp')
 * db.version(1).stores(generateDexieStores(mySchema))
 * // { sessions: '[streamId+sessionId],createdAt' }
 * ```
 */
export function generateDexieStores(schemaDef: TypedSchemaDef): Record<string, string> {
    const stores: Record<string, string> = {}

    for (const table of schemaDef.tables) {
        stores[table.name] = generateDexieStoreDefinition(table)
    }

    return stores
}

/**
 * Generate a single Dexie store definition from a typed table.
 */
export function generateDexieStoreDefinition(table: TypedTableDef): string {
    const parts: string[] = []

    // Determine primary key(s)
    const primaryKeyColumns: string[] = []

    // Check constraints for composite primary key
    if (table.constraints) {
        for (const constraint of table.constraints) {
            if (constraint.type === 'primaryKey') {
                primaryKeyColumns.push(...constraint.columns)
            }
        }
    }

    // If no composite primary key defined, check column-level primary keys
    if (primaryKeyColumns.length === 0) {
        for (const [columnName, builder] of Object.entries(table.columns)) {
            if (builder._config.primaryKey) {
                primaryKeyColumns.push(columnName)
            }
        }
    }

    // Build primary key part
    if (primaryKeyColumns.length === 0) {
        // Default to 'id' if no primary key defined
        parts.push('id')
    } else if (primaryKeyColumns.length === 1) {
        parts.push(primaryKeyColumns[0])
    } else {
        // Compound primary key: [a+b+c]
        parts.push(`[${primaryKeyColumns.join('+')}]`)
    }

    // Add indexes from constraints
    if (table.constraints) {
        for (const constraint of table.constraints) {
            if (constraint.type === 'index') {
                if (constraint.columns.length === 1) {
                    // Single-column index
                    const prefix = constraint.unique ? '&' : ''
                    parts.push(`${prefix}${constraint.columns[0]}`)
                } else {
                    // Compound index: [a+b]
                    const prefix = constraint.unique ? '&' : ''
                    parts.push(`${prefix}[${constraint.columns.join('+')}]`)
                }
            }
        }
    }

    return parts.join(',')
}
