/**
 * In-memory storage adapter implementation with indexed lookups.
 * Provides O(1) lookups via primary key indexes and LRU eviction.
 */

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
 * Internal record with LRU tracking.
 */
interface IndexedRecord {
    data: Record<string, unknown>
    accessTime: number
}

/**
 * Indexed table with O(1) lookups via primary key.
 */
interface IndexedTable {
    /** All records with access time tracking */
    records: Map<string, IndexedRecord>
    /** Primary key fields for this table */
    primaryKey: string[]
    /** Secondary indexes: field -> value -> set of primary keys */
    secondaryIndexes: Map<string, Map<unknown, Set<string>>>
}

/**
 * In-memory database structure with indexes.
 */
export interface MemoryDB {
    tables: Map<string, IndexedTable>
}

/**
 * Options for the memory adapter.
 */
export interface MemoryAdapterOptions {
    /**
     * Maximum number of entries per model/table.
     * When exceeded, entries are evicted based on eviction policy.
     */
    maxEntries?: number
    /**
     * Eviction policy when maxEntries is exceeded.
     * - 'lru': Least Recently Used (default) - evicts least recently accessed
     * - 'fifo': First In First Out - evicts oldest inserted
     */
    eviction?: 'lru' | 'fifo'
    /**
     * Schema defining primary keys and indexes for tables.
     * If not provided, falls back to 'id' as default primary key.
     */
    schema?: TypedSchemaDef
}

/**
 * Subscriber callback type.
 */
type Subscriber<T> = (changes: TableChange<T>[]) => void

/**
 * Default limit for one-to-many joins.
 */
const DEFAULT_JOIN_LIMIT = 100

/**
 * Generate a composite key string from record and key fields.
 */
function makeKey(record: Record<string, unknown>, keyFields: string[]): string {
    return keyFields.map((f) => String(record[f] ?? '')).join('\0')
}

/**
 * Generate a composite key string from where clauses (if all key fields have eq operator).
 */
function makeKeyFromWhere(where: WhereClause[], keyFields: string[]): string | null {
    const values: Record<string, unknown> = {}
    for (const clause of where) {
        if ((clause.operator ?? 'eq') === 'eq') {
            values[clause.field] = clause.value
        }
    }
    // Check if all key fields are present
    for (const field of keyFields) {
        if (!(field in values)) return null
    }
    return keyFields.map((f) => String(values[f] ?? '')).join('\0')
}

/**
 * Check if a record matches a set of where clauses.
 */
function matchesWhere(record: Record<string, unknown>, where: WhereClause[]): boolean {
    if (!where.length) return true

    let result = true
    for (let i = 0; i < where.length; i++) {
        const clause = where[i]
        const value = record[clause.field]
        let matches: boolean

        switch (clause.operator ?? 'eq') {
            case 'eq':
                matches = value === clause.value
                break
            case 'ne':
                matches = value !== clause.value
                break
            case 'gt':
                matches = (value as number) > (clause.value as number)
                break
            case 'gte':
                matches = (value as number) >= (clause.value as number)
                break
            case 'lt':
                matches = (value as number) < (clause.value as number)
                break
            case 'lte':
                matches = (value as number) <= (clause.value as number)
                break
            case 'in':
                matches = (clause.value as unknown[]).includes(value)
                break
            case 'not_in':
                matches = !(clause.value as unknown[]).includes(value)
                break
            case 'contains':
                matches = String(value).includes(String(clause.value))
                break
            case 'starts_with':
                matches = String(value).startsWith(String(clause.value))
                break
            case 'ends_with':
                matches = String(value).endsWith(String(clause.value))
                break
            default:
                matches = value === clause.value
        }

        // First clause always uses its match result
        if (i === 0) {
            result = matches
        } else if (clause.connector === 'OR') {
            result = result || matches
        } else {
            // Default to AND
            result = result && matches
        }
    }
    return result
}

/**
 * Sort records by a field.
 */
function sortRecords<T extends Record<string, unknown>>(records: T[], sortBy?: SortBy): T[] {
    if (!sortBy) return records

    return [...records].sort((a, b) => {
        const aVal = a[sortBy.field]
        const bVal = b[sortBy.field]

        let cmp: number
        if (aVal === bVal) {
            cmp = 0
        } else if (aVal === null || aVal === undefined) {
            cmp = 1
        } else if (bVal === null || bVal === undefined) {
            cmp = -1
        } else if (typeof aVal === 'string' && typeof bVal === 'string') {
            cmp = aVal.localeCompare(bVal)
        } else {
            cmp = aVal < bVal ? -1 : 1
        }

        return sortBy.direction === 'asc' ? cmp : -cmp
    })
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
 * Apply joins to a set of records.
 */
function applyJoins(
    db: MemoryDB,
    records: Record<string, unknown>[],
    join: JoinOptions,
): Record<string, unknown>[] {
    if (!join || Object.keys(join).length === 0) {
        return records
    }

    return records.map((record) => {
        const result = { ...record }

        for (const [joinModel, joinConfigOrTrue] of Object.entries(join)) {
            const config = normalizeJoinConfig(joinModel, joinConfigOrTrue)
            const joinTable = db.tables.get(joinModel)
            const localValue = record[config.on.from]

            if (!joinTable) {
                result[joinModel] = config.relation === 'one-to-one' ? null : []
                continue
            }

            // Find matching records in the joined table
            const matchingRecords: Record<string, unknown>[] = []
            for (const indexed of joinTable.records.values()) {
                if (indexed.data[config.on.to] === localValue) {
                    matchingRecords.push(indexed.data)
                }
            }

            if (config.relation === 'one-to-one') {
                result[joinModel] = matchingRecords[0] ? { ...matchingRecords[0] } : null
            } else {
                const limited = matchingRecords.slice(0, config.limit)
                result[joinModel] = limited.map((r) => ({ ...r }))
            }
        }

        return result
    })
}

/**
 * Extract primary key fields from schema for a model.
 * Checks both column-level primaryKey flags and constraint-based composite primary keys.
 */
function getPrimaryKeyFromSchema(schema: TypedSchemaDef | undefined, model: string): string[] {
    if (!schema?.tables) return ['id']
    const table = schema.tables.find((t: TypedTableDef) => t.name === model)
    if (!table) return ['id']

    // First check for constraint-based composite primary key
    const pkConstraint = table.constraints?.find((c) => c.type === 'primaryKey')
    if (pkConstraint && pkConstraint.type === 'primaryKey' && pkConstraint.columns.length > 0) {
        return pkConstraint.columns
    }

    // Fall back to column-level primaryKey flags
    const pkFields = Object.entries(table.columns)
        .filter(([, col]) => col._config.primaryKey)
        .map(([name]) => name)
    return pkFields.length > 0 ? pkFields : ['id']
}

/**
 * Extract secondary index fields from schema for a model.
 */
function getSecondaryIndexesFromSchema(
    schema: TypedSchemaDef | undefined,
    model: string,
): string[][] {
    if (!schema?.tables) return []
    const table = schema.tables.find((t: TypedTableDef) => t.name === model)
    if (!table?.constraints) return []

    return table.constraints
        .filter((c) => c.type === 'index')
        .map((c) => (c.type === 'index' ? c.columns : []))
}

/**
 * Create an in-memory storage adapter with indexed lookups.
 * @param options - Optional configuration for the adapter
 * @returns A StorageAdapter implementation
 *
 * @example
 * ```typescript
 * import { inmemory } from '@towns-protocol/storage/adapters/memory'
 *
 * // Basic usage
 * const adapter = inmemory()
 *
 * // With maxEntries and LRU eviction
 * const adapter = inmemory({ maxEntries: 5000, eviction: 'lru' })
 *
 * // With schema for O(1) lookups
 * const adapter = inmemory({ schema: mySchema })
 * ```
 */
export function inmemory(options?: MemoryAdapterOptions): StorageAdapter {
    const db = createMemoryDB()
    return memoryAdapter(db, options)
}

/**
 * Create a memory storage adapter with a shared database.
 * @param db - The in-memory database object (can be shared across multiple adapters)
 * @param options - Optional configuration for the adapter
 * @returns A StorageAdapter implementation
 */
export function memoryAdapter(db: MemoryDB, options?: MemoryAdapterOptions): StorageAdapter {
    const { maxEntries, eviction = 'lru', schema } = options ?? {}

    // Subscribers for reactive updates
    const subscribers = new Map<string, Set<Subscriber<unknown>>>()

    const ensureTable = (model: string): IndexedTable => {
        let table = db.tables.get(model)
        if (!table) {
            const primaryKey = getPrimaryKeyFromSchema(schema, model)
            const secondaryIndexFields = getSecondaryIndexesFromSchema(schema, model)
            table = {
                records: new Map(),
                primaryKey,
                secondaryIndexes: new Map(),
            }
            // Initialize secondary indexes
            for (const fields of secondaryIndexFields) {
                if (fields.length === 1) {
                    table.secondaryIndexes.set(fields[0], new Map())
                }
            }
            db.tables.set(model, table)
        }
        return table
    }

    const notifySubscribers = <T>(model: string, changes: TableChange<T>[]) => {
        const subs = subscribers.get(model)
        if (subs) {
            for (const sub of subs) {
                sub(changes as TableChange<unknown>[])
            }
        }
    }

    /**
     * Add record to secondary indexes.
     */
    const addToSecondaryIndexes = (
        table: IndexedTable,
        record: Record<string, unknown>,
        pk: string,
    ) => {
        for (const [field, index] of table.secondaryIndexes) {
            const value = record[field]
            let keys = index.get(value)
            if (!keys) {
                keys = new Set()
                index.set(value, keys)
            }
            keys.add(pk)
        }
    }

    /**
     * Remove record from secondary indexes.
     */
    const removeFromSecondaryIndexes = (
        table: IndexedTable,
        record: Record<string, unknown>,
        pk: string,
    ) => {
        for (const [field, index] of table.secondaryIndexes) {
            const value = record[field]
            const keys = index.get(value)
            if (keys) {
                keys.delete(pk)
                if (keys.size === 0) {
                    index.delete(value)
                }
            }
        }
    }

    /**
     * Enforce maxEntries limit by evicting based on policy.
     */
    const enforceMaxEntries = (model: string, table: IndexedTable) => {
        if (maxEntries === undefined || table.records.size <= maxEntries) return

        const toRemove = table.records.size - maxEntries
        const entries = Array.from(table.records.entries())

        // Sort by access time for LRU, or use insertion order for FIFO
        if (eviction === 'lru') {
            entries.sort((a, b) => a[1].accessTime - b[1].accessTime)
        }
        // For FIFO, Map maintains insertion order, so entries are already in order

        const removed: Record<string, unknown>[] = []
        for (let i = 0; i < toRemove && i < entries.length; i++) {
            const [pk, indexed] = entries[i]
            removeFromSecondaryIndexes(table, indexed.data, pk)
            table.records.delete(pk)
            removed.push(indexed.data)
        }

        if (removed.length > 0) {
            const changes: TableChange<unknown>[] = removed.map((r) => ({
                type: 'delete',
                data: r,
            }))
            notifySubscribers(model, changes)
        }
    }

    /**
     * Find record by primary key (O(1)).
     */
    const findByPrimaryKey = (
        table: IndexedTable,
        where: WhereClause[],
    ): IndexedRecord | undefined => {
        const pk = makeKeyFromWhere(where, table.primaryKey)
        if (pk === null) return undefined
        return table.records.get(pk)
    }

    /**
     * Find records using secondary index if available.
     */
    const findBySecondaryIndex = (
        table: IndexedTable,
        where: WhereClause[],
    ): IndexedRecord[] | null => {
        // Check if any where clause matches a secondary index with eq operator
        for (const clause of where) {
            if ((clause.operator ?? 'eq') === 'eq' && table.secondaryIndexes.has(clause.field)) {
                const index = table.secondaryIndexes.get(clause.field)!
                const pks = index.get(clause.value)
                if (!pks || pks.size === 0) return []

                // Get records by primary keys, then filter by remaining clauses
                const records: IndexedRecord[] = []
                for (const pk of pks) {
                    const indexed = table.records.get(pk)
                    if (indexed && matchesWhere(indexed.data, where)) {
                        records.push(indexed)
                    }
                }
                return records
            }
        }
        return null // No index available
    }

    const adapter: StorageAdapter = {
        async create<T>({ model, data }: { model: string; data: Partial<T> }): Promise<T> {
            const table = ensureTable(model)
            const record = { ...data } as Record<string, unknown>
            const pk = makeKey(record, table.primaryKey)
            const indexed: IndexedRecord = { data: record, accessTime: Date.now() }
            table.records.set(pk, indexed)
            addToSecondaryIndexes(table, record, pk)
            enforceMaxEntries(model, table)
            notifySubscribers(model, [{ type: 'insert', data: record as T }])
            return record as T
        },

        async createMany<T>({ model, data }: { model: string; data: Partial<T>[] }): Promise<T[]> {
            const table = ensureTable(model)
            const now = Date.now()
            const records: Record<string, unknown>[] = []
            for (const d of data) {
                const record = { ...d } as Record<string, unknown>
                const pk = makeKey(record, table.primaryKey)
                const indexed: IndexedRecord = { data: record, accessTime: now }
                table.records.set(pk, indexed)
                addToSecondaryIndexes(table, record, pk)
                records.push(record)
            }
            enforceMaxEntries(model, table)
            notifySubscribers(
                model,
                records.map((r) => ({ type: 'insert', data: r as T })),
            )
            return records as T[]
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
            const table = ensureTable(model)

            // Try O(1) lookup by primary key
            let indexed = findByPrimaryKey(table, where)

            // If no direct match, try secondary index
            if (!indexed) {
                const indexResults = findBySecondaryIndex(table, where)
                if (indexResults !== null) {
                    indexed = indexResults[0]
                } else {
                    // Fall back to O(n) scan
                    for (const rec of table.records.values()) {
                        if (matchesWhere(rec.data, where)) {
                            indexed = rec
                            break
                        }
                    }
                }
            }

            if (!indexed) return null

            // Update access time for LRU
            indexed.accessTime = Date.now()

            if (join) {
                const [withJoins] = applyJoins(db, [indexed.data], join)
                return withJoins as T
            }
            return indexed.data as T
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
            const table = ensureTable(model)
            const now = Date.now()
            let results: Record<string, unknown>[]

            // Try secondary index first
            const indexResults = where.length > 0 ? findBySecondaryIndex(table, where) : null
            if (indexResults !== null) {
                results = indexResults.map((r) => {
                    r.accessTime = now
                    return r.data
                })
            } else {
                // Fall back to O(n) scan
                results = []
                for (const indexed of table.records.values()) {
                    if (matchesWhere(indexed.data, where)) {
                        indexed.accessTime = now
                        results.push(indexed.data)
                    }
                }
            }

            results = sortRecords(results, sortBy)

            if (offset !== undefined && offset > 0) {
                results = results.slice(offset)
            }
            if (limit !== undefined && limit > 0) {
                results = results.slice(0, limit)
            }

            if (join) {
                results = applyJoins(db, results, join)
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
            const table = ensureTable(model)

            // Try secondary index
            const indexResults = where.length > 0 ? findBySecondaryIndex(table, where) : null
            if (indexResults !== null) {
                return indexResults.length
            }

            // Fall back to O(n) scan
            let count = 0
            for (const indexed of table.records.values()) {
                if (matchesWhere(indexed.data, where)) {
                    count++
                }
            }
            return count
        },

        async exists({ model, where }: { model: string; where: WhereClause[] }): Promise<boolean> {
            const table = ensureTable(model)

            // Try O(1) lookup by primary key
            if (findByPrimaryKey(table, where)) {
                return true
            }

            // Try secondary index
            const indexResults = findBySecondaryIndex(table, where)
            if (indexResults !== null) {
                return indexResults.length > 0
            }

            // Fall back to O(n) scan
            for (const indexed of table.records.values()) {
                if (matchesWhere(indexed.data, where)) {
                    return true
                }
            }
            return false
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
            const table = ensureTable(model)

            // Try O(1) lookup
            let indexed = findByPrimaryKey(table, where)
            let pk: string | undefined

            if (indexed) {
                pk = makeKeyFromWhere(where, table.primaryKey) ?? undefined
            } else {
                // Try secondary index or fall back to scan
                const indexResults = findBySecondaryIndex(table, where)
                if (indexResults !== null && indexResults.length > 0) {
                    indexed = indexResults[0]
                    pk = makeKey(indexed.data, table.primaryKey)
                } else {
                    for (const [key, rec] of table.records) {
                        if (matchesWhere(rec.data, where)) {
                            indexed = rec
                            pk = key
                            break
                        }
                    }
                }
            }

            if (indexed && pk) {
                // Remove from secondary indexes with old values
                removeFromSecondaryIndexes(table, indexed.data, pk)
                // Update record
                Object.assign(indexed.data, data)
                indexed.accessTime = Date.now()
                // Re-add to secondary indexes with new values
                addToSecondaryIndexes(table, indexed.data, pk)
                notifySubscribers(model, [{ type: 'update', data: indexed.data as T }])
                return indexed.data as T
            }
            return null
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
            const table = ensureTable(model)

            // Try O(1) lookup by primary key
            let indexed = findByPrimaryKey(table, where)
            let pk = indexed ? (makeKeyFromWhere(where, table.primaryKey) ?? undefined) : undefined

            if (!indexed) {
                // Try secondary index or fall back to scan
                const indexResults = findBySecondaryIndex(table, where)
                if (indexResults !== null && indexResults.length > 0) {
                    indexed = indexResults[0]
                    pk = makeKey(indexed.data, table.primaryKey)
                } else {
                    for (const [key, rec] of table.records) {
                        if (matchesWhere(rec.data, where)) {
                            indexed = rec
                            pk = key
                            break
                        }
                    }
                }
            }

            if (indexed && pk) {
                // Update existing
                removeFromSecondaryIndexes(table, indexed.data, pk)
                Object.assign(indexed.data, update)
                indexed.accessTime = Date.now()
                addToSecondaryIndexes(table, indexed.data, pk)
                notifySubscribers(model, [{ type: 'update', data: indexed.data as T }])
                return indexed.data as T
            } else {
                // Create new
                const record = { ...create } as Record<string, unknown>
                const newPk = makeKey(record, table.primaryKey)
                const newIndexed: IndexedRecord = { data: record, accessTime: Date.now() }
                table.records.set(newPk, newIndexed)
                addToSecondaryIndexes(table, record, newPk)
                enforceMaxEntries(model, table)
                notifySubscribers(model, [{ type: 'insert', data: record as T }])
                return record as T
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
            const table = ensureTable(model)
            const now = Date.now()
            const changes: TableChange<T>[] = []

            // Try secondary index
            const indexResults = findBySecondaryIndex(table, where)
            const toUpdate: Array<[string, IndexedRecord]> =
                indexResults !== null
                    ? indexResults.map((r) => [makeKey(r.data, table.primaryKey), r])
                    : Array.from(table.records.entries()).filter(([, rec]) =>
                          matchesWhere(rec.data, where),
                      )

            for (const [pk, indexed] of toUpdate) {
                removeFromSecondaryIndexes(table, indexed.data, pk)
                Object.assign(indexed.data, data)
                indexed.accessTime = now
                addToSecondaryIndexes(table, indexed.data, pk)
                changes.push({ type: 'update', data: indexed.data as T })
            }

            if (changes.length > 0) {
                notifySubscribers(model, changes)
            }
            return changes.length
        },

        async delete({ model, where }: { model: string; where: WhereClause[] }): Promise<void> {
            const table = ensureTable(model)

            // Try O(1) lookup
            let indexed = findByPrimaryKey(table, where)
            let pk = indexed ? (makeKeyFromWhere(where, table.primaryKey) ?? undefined) : undefined

            if (!indexed) {
                const indexResults = findBySecondaryIndex(table, where)
                if (indexResults !== null && indexResults.length > 0) {
                    indexed = indexResults[0]
                    pk = makeKey(indexed.data, table.primaryKey)
                } else {
                    for (const [key, rec] of table.records) {
                        if (matchesWhere(rec.data, where)) {
                            indexed = rec
                            pk = key
                            break
                        }
                    }
                }
            }

            if (indexed && pk) {
                removeFromSecondaryIndexes(table, indexed.data, pk)
                table.records.delete(pk)
                notifySubscribers(model, [{ type: 'delete', data: indexed.data }])
            }
        },

        async deleteMany({
            model,
            where,
        }: {
            model: string
            where: WhereClause[]
        }): Promise<number> {
            const table = ensureTable(model)
            const changes: TableChange<unknown>[] = []

            // Try secondary index
            const indexResults = findBySecondaryIndex(table, where)
            const toDelete: Array<[string, IndexedRecord]> =
                indexResults !== null
                    ? indexResults.map((r) => [makeKey(r.data, table.primaryKey), r])
                    : Array.from(table.records.entries()).filter(([, rec]) =>
                          matchesWhere(rec.data, where),
                      )

            for (const [pk, indexed] of toDelete) {
                removeFromSecondaryIndexes(table, indexed.data, pk)
                table.records.delete(pk)
                changes.push({ type: 'delete', data: indexed.data })
            }

            if (changes.length > 0) {
                notifySubscribers(model, changes)
            }
            return changes.length
        },

        async clear({ model }: { model: string }): Promise<number> {
            const table = ensureTable(model)
            const count = table.records.size
            const changes: TableChange<unknown>[] = []

            for (const indexed of table.records.values()) {
                changes.push({ type: 'delete', data: indexed.data })
            }

            table.records.clear()
            for (const index of table.secondaryIndexes.values()) {
                index.clear()
            }

            if (changes.length > 0) {
                notifySubscribers(model, changes)
            }
            return count
        },

        async transaction<T>(fn: (adapter: StorageAdapter) => Promise<T>): Promise<T> {
            // Create a snapshot for rollback (only copy the data, not the full structure)
            const snapshot = new Map<string, Map<string, IndexedRecord>>()
            for (const [model, table] of db.tables) {
                const recordsCopy = new Map<string, IndexedRecord>()
                for (const [pk, indexed] of table.records) {
                    recordsCopy.set(pk, {
                        data: { ...indexed.data },
                        accessTime: indexed.accessTime,
                    })
                }
                snapshot.set(model, recordsCopy)
            }

            try {
                return await fn(adapter)
            } catch (error) {
                // Rollback: restore from snapshot
                for (const [model, recordsCopy] of snapshot) {
                    const table = db.tables.get(model)
                    if (table) {
                        table.records.clear()
                        for (const index of table.secondaryIndexes.values()) {
                            index.clear()
                        }
                        for (const [pk, indexed] of recordsCopy) {
                            table.records.set(pk, indexed)
                            addToSecondaryIndexes(table, indexed.data, pk)
                        }
                    }
                }
                throw error
            }
        },

        subscribe<T>(model: string, callback: (changes: TableChange<T>[]) => void): () => void {
            if (!subscribers.has(model)) {
                subscribers.set(model, new Set())
            }
            subscribers.get(model)!.add(callback as Subscriber<unknown>)

            return () => {
                const subs = subscribers.get(model)
                if (subs) {
                    subs.delete(callback as Subscriber<unknown>)
                    if (subs.size === 0) {
                        subscribers.delete(model)
                    }
                }
            }
        },
    }

    return adapter
}

/**
 * Create a fresh, empty MemoryDB instance.
 * Useful for testing.
 */
export function createMemoryDB(): MemoryDB {
    return { tables: new Map() }
}
