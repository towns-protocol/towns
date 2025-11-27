/**
 * Type-safe column builders for schema definitions.
 * Inspired by Drizzle ORM and Zod.
 */

// ============= Storage Type Constants =============

export type StorageType = 'text' | 'integer' | 'boolean' | 'blob' | 'bigint' | 'json' | 'date'

// ============= Column Configuration =============

export interface ColumnConfig {
    storageType: StorageType
    primaryKey: boolean
    nullable: boolean
    defaultValue?: unknown
}

// ============= Column Builder Interface =============

/**
 * Base column builder interface.
 * The type parameters carry the TypeScript type and nullable state.
 */
export interface ColumnBuilder<T, Nullable extends boolean = false> {
    /** Mark this column as part of the primary key */
    primaryKey(): ColumnBuilder<T, Nullable>
    /** Mark this column as nullable (allows null values) */
    nullable(): ColumnBuilder<T, true>
    /** Set a default value for this column */
    default(value: T): ColumnBuilder<T, Nullable>

    // Internal properties for type inference and runtime config
    readonly _type: T
    readonly _nullable: Nullable
    readonly _config: ColumnConfig
}

/**
 * JSON column builder with type override capability.
 */
export interface JsonColumnBuilder<T = unknown, Nullable extends boolean = false>
    extends ColumnBuilder<T, Nullable> {
    /** Override the TypeScript type for this JSON column */
    type<U>(): JsonColumnBuilder<U, Nullable>

    // Override to return JsonColumnBuilder for chaining
    primaryKey(): JsonColumnBuilder<T, Nullable>
    nullable(): JsonColumnBuilder<T, true>
    default(value: T): JsonColumnBuilder<T, Nullable>
}

// ============= Column Builder Implementation =============

class ColumnBuilderImpl<T, Nullable extends boolean = false> implements ColumnBuilder<T, Nullable> {
    readonly _type!: T
    readonly _nullable!: Nullable
    readonly _config: ColumnConfig

    constructor(storageType: StorageType) {
        this._config = {
            storageType,
            primaryKey: false,
            nullable: false,
        }
    }

    primaryKey(): ColumnBuilder<T, Nullable> {
        this._config.primaryKey = true
        return this as unknown as ColumnBuilder<T, Nullable>
    }

    nullable(): ColumnBuilder<T, true> {
        this._config.nullable = true
        return this as unknown as ColumnBuilder<T, true>
    }

    default(value: T): ColumnBuilder<T, Nullable> {
        this._config.defaultValue = value
        return this as unknown as ColumnBuilder<T, Nullable>
    }
}

class JsonColumnBuilderImpl<T = unknown, Nullable extends boolean = false>
    extends ColumnBuilderImpl<T, Nullable>
    implements JsonColumnBuilder<T, Nullable>
{
    constructor() {
        super('json')
    }

    type<U>(): JsonColumnBuilder<U, Nullable> {
        return this as unknown as JsonColumnBuilder<U, Nullable>
    }

    override primaryKey(): JsonColumnBuilder<T, Nullable> {
        return super.primaryKey() as unknown as JsonColumnBuilder<T, Nullable>
    }

    override nullable(): JsonColumnBuilder<T, true> {
        return super.nullable() as unknown as JsonColumnBuilder<T, true>
    }

    override default(value: T): JsonColumnBuilder<T, Nullable> {
        return super.default(value) as unknown as JsonColumnBuilder<T, Nullable>
    }
}

// ============= Type Builders Namespace =============

/**
 * Type builders for defining schema columns.
 *
 * @example
 * ```typescript
 * import { t, defineTable } from '@towns-protocol/storage'
 *
 * const userTable = defineTable('users', {
 *   id: t.string().primaryKey(),
 *   name: t.string(),
 *   age: t.integer().nullable(),
 *   data: t.json().type<{ foo: string }>(),
 *   avatar: t.bytes(),
 * })
 * ```
 */
export const t = {
    /** Text/string column → `string` */
    string: (): ColumnBuilder<string> => new ColumnBuilderImpl<string>('text'),

    /** Integer column → `number` */
    integer: (): ColumnBuilder<number> => new ColumnBuilderImpl<number>('integer'),

    /** Boolean column → `boolean` */
    boolean: (): ColumnBuilder<boolean> => new ColumnBuilderImpl<boolean>('boolean'),

    /** Binary/blob column → `Uint8Array` */
    bytes: (): ColumnBuilder<Uint8Array> => new ColumnBuilderImpl<Uint8Array>('blob'),

    /** BigInt column → `bigint` */
    bigint: (): ColumnBuilder<bigint> => new ColumnBuilderImpl<bigint>('bigint'),

    /** JSON column → `unknown` by default, use `.type<T>()` to override */
    json: (): JsonColumnBuilder<unknown> => new JsonColumnBuilderImpl<unknown>(),

    /** Date column → `Date` */
    date: (): ColumnBuilder<Date> => new ColumnBuilderImpl<Date>('date'),
} as const

// ============= Type Inference Utilities =============

/**
 * Infer the TypeScript type from a column builder.
 * Handles nullable columns by adding `| null`.
 */
export type InferColumnType<C> =
    C extends ColumnBuilder<infer T, infer N> ? (N extends true ? T | null : T) : never

/**
 * Infer the record type from a table's columns definition.
 */
export type InferTableType<Columns extends Record<string, ColumnBuilder<unknown, boolean>>> = {
    [K in keyof Columns]: InferColumnType<Columns[K]>
}

// ============= Any Column Builder Type =============

/**
 * Type representing any column builder (for use in generic constraints).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyColumnBuilder = ColumnBuilder<any, boolean>
