/**
 * Schema definition types for the modular storage system.
 * Each package exports its own schema that gets composed at runtime.
 *
 * Uses the type-safe builder API with full TypeScript inference.
 */

import type { AnyColumnBuilder } from './builders.js'
import type { TypedTableDef, TypedSchemaDef } from './types.js'
import type { TableConstraint, TableColumnsProxy } from './constraints.js'
import { createTableProxy } from './constraints.js'

// ============= Type-Safe Builder API =============

/**
 * Callback function type for defining table constraints.
 */
export type ConstraintsCallback<Columns extends Record<string, AnyColumnBuilder>> = (
    table: TableColumnsProxy<Columns>,
) => TableConstraint[]

/**
 * Define a table with type-safe column builders.
 *
 * @example
 * ```typescript
 * import { t, table, index, uniqueIndex, primaryKey } from '@towns-protocol/storage'
 *
 * // Simple table with column-level primary key
 * const userTable = table('users', {
 *   id: t.string().primaryKey(),
 *   name: t.string(),
 *   age: t.integer().nullable(),
 *   metadata: t.json().type<{ foo: string }>(),
 * })
 *
 * // Table with composite primary key and indexes
 * const sessionsTable = table('sessions', {
 *   streamId: t.string(),
 *   sessionId: t.string(),
 *   data: t.bytes(),
 *   createdAt: t.date(),
 * }, (tbl) => [
 *   primaryKey({ columns: [tbl.streamId, tbl.sessionId] }),
 *   index('idx_created').on(tbl.createdAt),
 * ])
 *
 * // Inferred type: { streamId: string; sessionId: string; data: Uint8Array; createdAt: Date }
 * ```
 */
export function table<Name extends string, Columns extends Record<string, AnyColumnBuilder>>(
    name: Name,
    columns: Columns,
    constraints?: ConstraintsCallback<Columns>,
): TypedTableDef<Name, Columns> {
    if (constraints) {
        const proxy = createTableProxy(name, columns)
        const constraintList = constraints(proxy)
        return {
            name,
            columns,
            constraints: constraintList,
        }
    }

    return {
        name,
        columns,
    }
}

/**
 * Define a schema with type-safe tables.
 *
 * @example
 * ```typescript
 * import { t, table, schema } from '@towns-protocol/storage'
 *
 * const userTable = table('users', { ... })
 * const postTable = table('posts', { ... })
 *
 * const mySchema = schema('myapp', {
 *   tables: [userTable, postTable] as const,
 *   version: 1,
 * })
 * ```
 */
export function schema<Name extends string, Tables extends readonly TypedTableDef[]>(
    name: Name,
    options: { tables: Tables; version: number },
): TypedSchemaDef<Name, Tables> {
    return {
        name,
        version: options.version,
        tables: options.tables,
    }
}
