/**
 * SQLite schema compiler for Drizzle ORM.
 *
 * Compiles typed schema definitions into Drizzle SQLite table definitions.
 * This allows you to define your schema once and generate Drizzle tables
 * with proper column types, constraints, and foreign keys.
 *
 * @example
 * ```typescript
 * import { t, table, schema, index, foreignKey, columnRef } from '@towns-protocol/storage'
 * import { toSqliteSchema } from '@towns-protocol/storage/adapters/drizzle'
 *
 * const usersTable = table('users', {
 *     id: t.string().primaryKey(),
 *     name: t.string(),
 *     email: t.string(),
 * }, (tbl) => [
 *     index('idx_email').on(tbl.email),
 * ])
 *
 * const postsTable = table('posts', {
 *     id: t.string().primaryKey(),
 *     authorId: t.string(),
 *     content: t.string(),
 * }, (tbl) => [
 *     foreignKey({
 *         columns: [tbl.authorId],
 *         foreignColumns: [columnRef('users', 'id')],
 *         onDelete: 'cascade',
 *     }),
 * ])
 *
 * const mySchema = schema('app', {
 *     tables: [usersTable, postsTable] as const,
 *     version: 1,
 * })
 *
 * // Generate Drizzle SQLite tables
 * const drizzleTables = toSqliteSchema(mySchema)
 * // { users: SQLiteTable, posts: SQLiteTable }
 * ```
 */

import {
    sqliteTable,
    text,
    integer,
    blob,
    index as drizzleIndex,
    uniqueIndex as drizzleUniqueIndex,
    primaryKey as drizzlePrimaryKey,
    foreignKey as drizzleForeignKey,
} from 'drizzle-orm/sqlite-core'
import type { SQLiteTableWithColumns, AnySQLiteColumn } from 'drizzle-orm/sqlite-core'
import type { TypedTableDef, TypedSchemaDef } from '../../types.js'
import type { StorageType } from '../../builders.js'
import type {
    ReferentialAction,
    IndexConstraint,
    PrimaryKeyConstraint,
    ForeignKeyConstraint,
} from '../../constraints.js'

// ============= Type Mappings =============

/**
 * Map our storage type to Drizzle SQLite column builder.
 */
function createColumn(
    name: string,
    storageType: StorageType,
    nullable: boolean,
    isPrimaryKey: boolean,
) {
    let column
    switch (storageType) {
        case 'text':
            column = text(name)
            break
        case 'integer':
            column = integer(name)
            break
        case 'boolean':
            column = integer(name, { mode: 'boolean' })
            break
        case 'blob':
            column = blob(name)
            break
        case 'bigint':
            column = blob(name, { mode: 'bigint' })
            break
        case 'json':
            column = text(name, { mode: 'json' })
            break
        case 'date':
            column = integer(name, { mode: 'timestamp_ms' })
            break
        default:
            column = text(name)
    }
    // Apply constraints
    if (isPrimaryKey) {
        column = column.primaryKey()
    }
    if (!nullable && !isPrimaryKey) {
        column = column.notNull()
    }
    return column
}

/**
 * Map referential action to Drizzle format.
 */
function mapReferentialAction(
    action: ReferentialAction | undefined,
): 'cascade' | 'restrict' | 'no action' | 'set null' | 'set default' | undefined {
    return action
}

// ============= Schema Types =============

/**
 * Result type for toSqliteTable - a Drizzle SQLite table with columns.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SqliteTableResult = SQLiteTableWithColumns<any>

/**
 * Result type for toSqliteSchema - a record of table names to Drizzle tables.
 */
export type SqliteSchemaResult = Record<string, SqliteTableResult>

// ============= Compilation Functions =============

/**
 * Compile a single typed table definition to a Drizzle SQLite table.
 *
 * This function generates a `sqliteTable()` call with:
 * - All columns with appropriate SQLite types
 * - Primary key constraints (single or composite)
 * - Indexes (regular and unique)
 *
 * Note: Foreign keys require a two-pass compilation via `toSqliteSchema()`
 * since they need references to other tables.
 *
 * @param tableDef - The typed table definition to compile
 * @returns A Drizzle SQLite table
 *
 * @example
 * ```typescript
 * const usersTable = table('users', {
 *     id: t.string().primaryKey(),
 *     name: t.string(),
 *     age: t.integer().nullable(),
 * })
 *
 * const drizzleTable = toSqliteTable(usersTable)
 * ```
 */
export function toSqliteTable(tableDef: TypedTableDef): SqliteTableResult {
    return toSqliteTableInternal(tableDef, {})
}

/**
 * Compile a typed schema definition to Drizzle SQLite tables.
 *
 * This function performs a two-pass compilation:
 * 1. First pass: Create all tables with columns, primary keys, and indexes
 * 2. Second pass: Add foreign key constraints (requires table references)
 *
 * @param schemaDef - The typed schema definition to compile
 * @returns A record mapping table names to Drizzle SQLite tables
 *
 * @example
 * ```typescript
 * const mySchema = schema('app', {
 *     tables: [usersTable, postsTable] as const,
 *     version: 1,
 * })
 *
 * const drizzleTables = toSqliteSchema(mySchema)
 * // Use with drizzle:
 * const db = drizzle(client, { schema: drizzleTables })
 * ```
 */
export function toSqliteSchema(schemaDef: TypedSchemaDef): SqliteSchemaResult {
    const result: SqliteSchemaResult = {}

    // First pass: Create all tables without foreign keys
    for (const tableDef of schemaDef.tables) {
        result[tableDef.name] = toSqliteTableInternal(tableDef, result)
    }

    return result
}

/**
 * Internal helper to compile a table with foreign key support.
 */
function toSqliteTableInternal(
    tableDef: TypedTableDef,
    existingTables: SqliteSchemaResult,
): SqliteTableResult {
    // Build columns object
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const columns: Record<string, any> = {}

    // Track primary key columns from column-level definitions
    const columnPrimaryKeys: string[] = []

    for (const [colName, builder] of Object.entries(tableDef.columns)) {
        const config = builder._config
        const isPrimaryKey = config.primaryKey || false

        if (isPrimaryKey) {
            columnPrimaryKeys.push(colName)
        }

        // For single primary keys, apply directly; for composite, defer
        const shouldApplyPK = isPrimaryKey && columnPrimaryKeys.length <= 1
        columns[colName] = createColumn(colName, config.storageType, config.nullable, shouldApplyPK)
    }

    // Check for composite primary key from constraints
    const compositePK = tableDef.constraints?.find(
        (c): c is PrimaryKeyConstraint => c.type === 'primaryKey',
    )

    // Collect indexes and foreign keys
    const indexConstraints =
        tableDef.constraints?.filter((c): c is IndexConstraint => c.type === 'index') || []

    const fkConstraints =
        tableDef.constraints?.filter((c): c is ForeignKeyConstraint => c.type === 'foreignKey') ||
        []

    // Determine if we need extra constraints callback
    const hasCompositePK = compositePK || columnPrimaryKeys.length > 1
    const hasIndexes = indexConstraints.length > 0
    const hasForeignKeys = fkConstraints.length > 0 && Object.keys(existingTables).length > 0

    if (!hasCompositePK && !hasIndexes && !hasForeignKeys) {
        // Simple table with single or no primary key, no indexes
        return sqliteTable(tableDef.name, columns)
    }

    // Build the table with extra constraints
    return sqliteTable(tableDef.name, columns, (table) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const extraConstraints: Record<string, any> = {}

        // Handle composite primary key
        if (compositePK && compositePK.columns.length > 0) {
            const pkCols = compositePK.columns.map((col) => table[col] as AnySQLiteColumn)
            if (pkCols.length > 0) {
                extraConstraints[compositePK.name || `pk_${tableDef.name}`] = drizzlePrimaryKey({
                    columns: pkCols as [AnySQLiteColumn, ...AnySQLiteColumn[]],
                })
            }
        } else if (columnPrimaryKeys.length > 1) {
            // Multiple column-level primary keys - treat as composite
            const pkCols = columnPrimaryKeys.map((col) => table[col] as AnySQLiteColumn)
            if (pkCols.length > 0) {
                extraConstraints[`pk_${tableDef.name}`] = drizzlePrimaryKey({
                    columns: pkCols as [AnySQLiteColumn, ...AnySQLiteColumn[]],
                })
            }
        }

        // Add indexes
        for (const idx of indexConstraints) {
            const idxCols = idx.columns.map((col) => table[col] as AnySQLiteColumn)
            if (idxCols.length > 0) {
                if (idx.unique) {
                    extraConstraints[idx.name] = drizzleUniqueIndex(idx.name).on(
                        ...(idxCols as [AnySQLiteColumn, ...AnySQLiteColumn[]]),
                    )
                } else {
                    extraConstraints[idx.name] = drizzleIndex(idx.name).on(
                        ...(idxCols as [AnySQLiteColumn, ...AnySQLiteColumn[]]),
                    )
                }
            }
        }

        // Add foreign keys
        for (const fk of fkConstraints) {
            const foreignTable = existingTables[fk.foreignTable]
            if (foreignTable) {
                const fkName = fk.name || `fk_${tableDef.name}_${fk.columns.join('_')}`
                const localCols = fk.columns.map((col) => table[col] as AnySQLiteColumn)
                const foreignCols = fk.foreignColumns.map(
                    (col) => foreignTable[col] as unknown as AnySQLiteColumn,
                )

                if (localCols.length > 0 && foreignCols.length > 0) {
                    let fkBuilder = drizzleForeignKey({
                        columns: localCols as [AnySQLiteColumn, ...AnySQLiteColumn[]],
                        foreignColumns: foreignCols as [AnySQLiteColumn, ...AnySQLiteColumn[]],
                    })

                    if (fk.onDelete) {
                        fkBuilder = fkBuilder.onDelete(
                            mapReferentialAction(fk.onDelete) || 'no action',
                        )
                    }
                    if (fk.onUpdate) {
                        fkBuilder = fkBuilder.onUpdate(
                            mapReferentialAction(fk.onUpdate) || 'no action',
                        )
                    }

                    extraConstraints[fkName] = fkBuilder
                }
            }
        }

        return extraConstraints
    })
}
