/**
 * Core storage adapter interface and types.
 *
 * Inspired by https://github.com/better-auth/better-auth/tree/main/packages/better-auth/src/adapters
 *
 * All storage backends (Memory, Drizzle, Dexie) implement this interface.
 */

import type { AnyColumnBuilder, InferTableType } from './builders.js'
import type {
    TableConstraint,
    IndexConstraint,
    PrimaryKeyConstraint,
    ForeignKeyConstraint,
} from './constraints.js'

// ============= Utility Types =============

/** Flattens intersection types for better IDE display */
export type Prettify<T> = { [K in keyof T]: T[K] } & {}

// ============= Where Clause Types =============

/**
 * Operators for where clause filtering.
 */
export type WhereOperator =
    | 'eq' // equals (default)
    | 'ne' // not equals
    | 'gt' // greater than
    | 'gte' // greater than or equal
    | 'lt' // less than
    | 'lte' // less than or equal
    | 'in' // in array
    | 'not_in' // not in array
    | 'contains' // string contains
    | 'starts_with' // string starts with
    | 'ends_with' // string ends with

/**
 * A single condition in a where clause.
 */
export interface WhereClause {
    /** Field name to filter on */
    field: string
    /** Value to compare against */
    value: unknown
    /** Comparison operator (defaults to 'eq') */
    operator?: WhereOperator
    /** Logical connector with previous clause (defaults to 'AND') */
    connector?: 'AND' | 'OR'
}

/**
 * Sort configuration for queries.
 */
export interface SortBy {
    /** Field name to sort by */
    field: string
    /** Sort direction */
    direction: 'asc' | 'desc'
}

// ============= Join Types =============

/**
 * Configuration for a single join relation.
 */
export interface JoinConfig {
    /** Field mapping: { from: 'local_field', to: 'foreign_field' } */
    on: {
        /** Field on the base model */
        from: string
        /** Field on the joined model */
        to: string
    }
    /** Relation type */
    relation: 'one-to-one' | 'one-to-many'
    /** Maximum number of joined records (for one-to-many, default: 100) */
    limit?: number
}

/**
 * Join options mapping model names to join configuration.
 * Can be a full JoinConfig or `true` to use defaults.
 */
export type JoinOptions = Record<string, JoinConfig | true>

// ============= Change Events =============

/**
 * Represents a change event for reactive subscriptions.
 * Used for TanStack DB compatibility.
 */
export interface TableChange<T> {
    /** Type of change */
    type: 'insert' | 'update' | 'delete'
    /** The affected record */
    data: T
}

// ============= Storage Adapter Interface =============

/**
 * Generic storage adapter interface.
 * Provides CRUD operations with where clause filtering and joins.
 */
export interface StorageAdapter {
    // ============= Create =============

    /**
     * Create a new record.
     * @param params.model - Table/model name
     * @param params.data - Record data to insert
     * @returns The created record
     */
    create<T>(params: { model: string; data: Partial<T> }): Promise<T>

    /**
     * Create multiple records in a batch.
     * @param params.model - Table/model name
     * @param params.data - Array of record data to insert
     * @returns The created records
     */
    createMany<T>(params: { model: string; data: Partial<T>[] }): Promise<T[]>

    // ============= Read =============

    /**
     * Find a single record matching the where clause.
     * @param params.model - Table/model name
     * @param params.where - Filter conditions
     * @param params.join - Optional join configuration for related data
     * @returns The matching record or null
     */
    findOne<T>(params: {
        model: string
        where: WhereClause[]
        join?: JoinOptions
    }): Promise<T | null>

    /**
     * Find multiple records with optional filtering, sorting, pagination, and joins.
     * @param params.model - Table/model name
     * @param params.where - Optional filter conditions
     * @param params.sortBy - Optional sort configuration
     * @param params.limit - Optional maximum number of results
     * @param params.offset - Optional number of results to skip
     * @param params.join - Optional join configuration for related data
     * @returns Array of matching records
     */
    findMany<T>(params: {
        model: string
        where?: WhereClause[]
        sortBy?: SortBy
        limit?: number
        offset?: number
        join?: JoinOptions
    }): Promise<T[]>

    /**
     * Count records matching the where clause.
     * @param params.model - Table/model name
     * @param params.where - Optional filter conditions
     * @returns Number of matching records
     */
    count(params: { model: string; where?: WhereClause[] }): Promise<number>

    /**
     * Check if a record exists matching the where clause.
     * More efficient than findOne when you only need to check existence.
     * @param params.model - Table/model name
     * @param params.where - Filter conditions
     * @returns True if a matching record exists
     */
    exists(params: { model: string; where: WhereClause[] }): Promise<boolean>

    // ============= Update =============

    /**
     * Update a single record matching the where clause.
     * @param params.model - Table/model name
     * @param params.where - Filter conditions to find the record
     * @param params.data - Fields to update
     * @returns The updated record or null if not found
     */
    update<T>(params: { model: string; where: WhereClause[]; data: Partial<T> }): Promise<T | null>

    /**
     * Create or update a record (upsert).
     * If a record matching the where clause exists, update it; otherwise create a new one.
     * @param params.model - Table/model name
     * @param params.where - Filter conditions to find existing record
     * @param params.create - Data for creating a new record
     * @param params.update - Data for updating an existing record
     * @returns The created or updated record
     */
    upsert<T>(params: {
        model: string
        where: WhereClause[]
        create: Partial<T>
        update: Partial<T>
    }): Promise<T>

    /**
     * Update multiple records matching the where clause.
     * @param params.model - Table/model name
     * @param params.where - Filter conditions
     * @param params.data - Fields to update
     * @returns Number of records updated
     */
    updateMany<T>(params: {
        model: string
        where: WhereClause[]
        data: Partial<T>
    }): Promise<number>

    // ============= Delete =============

    /**
     * Delete a single record matching the where clause.
     * @param params.model - Table/model name
     * @param params.where - Filter conditions to find the record
     */
    delete(params: { model: string; where: WhereClause[] }): Promise<void>

    /**
     * Delete multiple records matching the where clause.
     * @param params.model - Table/model name
     * @param params.where - Filter conditions
     * @returns Number of records deleted
     */
    deleteMany(params: { model: string; where: WhereClause[] }): Promise<number>

    /**
     * Delete all records from a table.
     * @param params.model - Table/model name
     * @returns Number of records deleted
     */
    clear(params: { model: string }): Promise<number>

    // ============= Transaction =============

    /**
     * Execute a function within a transaction.
     * If the function throws, the transaction is rolled back.
     * @param fn - Function to execute with a transactional adapter
     * @returns The result of the function
     */
    transaction<T>(fn: (adapter: StorageAdapter) => Promise<T>): Promise<T>

    // ============= Reactive Subscriptions =============

    /**
     * Subscribe to changes on a model (optional, for TanStack DB compatibility).
     * @param model - Table/model name to watch
     * @param callback - Function called when changes occur
     * @returns Unsubscribe function
     */
    subscribe?<T>(model: string, callback: (changes: TableChange<T>[]) => void): () => void
}

// ============= Table Definition with Type Inference =============

/**
 * A table definition with inferred types from column builders.
 */
export interface TypedTableDef<
    Name extends string = string,
    Columns extends Record<string, AnyColumnBuilder> = Record<string, AnyColumnBuilder>,
> {
    readonly name: Name
    readonly columns: Columns
    /** Table constraints (indexes, primary keys, foreign keys) defined via callback */
    readonly constraints?: TableConstraint[]
}

// Re-export constraint types for convenience
export type { TableConstraint, IndexConstraint, PrimaryKeyConstraint, ForeignKeyConstraint }

/**
 * A schema definition with inferred types from tables.
 */
export interface TypedSchemaDef<
    Name extends string = string,
    Tables extends readonly TypedTableDef[] = readonly TypedTableDef[],
> {
    readonly name: Name
    readonly version: number
    readonly tables: Tables
}

// ============= Type Inference from Schema =============

/**
 * Extract model names from a schema's tables.
 */
export type ModelNames<S extends TypedSchemaDef> = S['tables'][number]['name']

/**
 * Build a map of model name → record type from schema tables.
 */
export type InferSchemaModels<Tables extends readonly TypedTableDef[]> = {
    [T in Tables[number] as T['name']]: InferTableType<T['columns']>
}

/**
 * Shorthand for getting the models map from a schema.
 */
export type Models<S extends TypedSchemaDef> = InferSchemaModels<S['tables']>

// ============= Type-Safe Query Types =============

/**
 * Type-safe where clause with field autocomplete based on model.
 */
export interface TypedWhereClause<T> {
    /** Field name (autocompletes to model's fields) */
    field: keyof T & string
    /** Value to compare against */
    value: unknown
    /** Comparison operator (defaults to 'eq') */
    operator?: WhereOperator
    /** Logical connector with previous clause (defaults to 'AND') */
    connector?: 'AND' | 'OR'
}

/**
 * Type-safe sort configuration with field autocomplete.
 */
export interface TypedSortBy<T> {
    /** Field name to sort by (autocompletes to model's fields) */
    field: keyof T & string
    /** Sort direction */
    direction: 'asc' | 'desc'
}

// ============= Type-Safe Join Types =============

/**
 * Type-safe join configuration with field autocomplete for both models.
 *
 * @typeParam BaseModel - The base model type (for `from` field autocomplete)
 * @typeParam JoinedModel - The joined model type (for `to` field autocomplete)
 */
export interface TypedJoinConfig<BaseModel, JoinedModel> {
    /** Field mapping: { from: 'local_field', to: 'foreign_field' } */
    on: {
        /** Field on the base model */
        from: keyof BaseModel & string
        /** Field on the joined model */
        to: keyof JoinedModel & string
    }
    /** Relation type */
    relation: 'one-to-one' | 'one-to-many'
    /** Maximum number of joined records (for one-to-many, default: 100) */
    limit?: number
}

/**
 * Type-safe join options mapping model names to join configuration.
 * Provides autocomplete for both the join key (model name) and the field names.
 */
export type TypedJoinOptions<S extends TypedSchemaDef, T> = {
    [K in keyof Models<S> & string]?: TypedJoinConfig<T, Models<S>[K]>
}

/**
 * Compute the result type with joined fields based on join options.
 * - one-to-many: adds `joinKey: JoinedModel[]`
 * - one-to-one: adds `joinKey: JoinedModel | null`
 */
export type WithJoins<
    S extends TypedSchemaDef,
    BaseModel,
    J extends TypedJoinOptions<S, BaseModel> | undefined,
> = J extends undefined
    ? BaseModel
    : BaseModel & {
          [K in keyof J as J[K] extends { relation: 'one-to-many' | 'one-to-one' }
              ? K
              : never]: K extends keyof Models<S>
              ? J[K] extends { relation: 'one-to-many' }
                  ? Models<S>[K][]
                  : J[K] extends { relation: 'one-to-one' }
                    ? Models<S>[K] | null
                    : never
              : never
      }

// ============= Type-Safe Storage Adapter =============

/**
 * Type-safe storage adapter interface.
 *
 * Provides:
 * - Model name autocomplete
 * - Field name autocomplete in where clauses
 * - Inferred return types based on model
 *
 * @example
 * ```typescript
 * const adapter: TypedStorageAdapter<typeof mySchema> = inmemory()
 *
 * // Model name autocompletes, return type is inferred
 * const user = await adapter.findOne({
 *   model: 'users',  // ← autocomplete
 *   where: [{ field: 'id', value: '123' }],  // ← field autocomplete
 * })
 * // user: { id: string; name: string; ... } | null
 * ```
 */
export interface TypedStorageAdapter<S extends TypedSchemaDef> {
    // ============= Create =============

    /**
     * Create a new record.
     */
    create<M extends keyof Models<S> & string>(params: {
        model: M
        data: Partial<Models<S>[M]>
    }): Promise<Models<S>[M]>

    /**
     * Create multiple records in a batch.
     */
    createMany<M extends keyof Models<S> & string>(params: {
        model: M
        data: Partial<Models<S>[M]>[]
    }): Promise<Models<S>[M][]>

    // ============= Read =============

    /**
     * Find a single record matching the where clause.
     */
    findOne<
        M extends keyof Models<S> & string,
        J extends TypedJoinOptions<S, Models<S>[M]> | undefined = undefined,
    >(params: {
        model: M
        where: TypedWhereClause<Models<S>[M]>[]
        join?: J
    }): Promise<Prettify<WithJoins<S, Models<S>[M], J>> | null>

    /**
     * Find multiple records with optional filtering, sorting, pagination.
     */
    findMany<
        M extends keyof Models<S> & string,
        J extends TypedJoinOptions<S, Models<S>[M]> | undefined = undefined,
    >(params: {
        model: M
        where?: TypedWhereClause<Models<S>[M]>[]
        sortBy?: TypedSortBy<Models<S>[M]>
        limit?: number
        offset?: number
        join?: J
    }): Promise<Prettify<WithJoins<S, Models<S>[M], J>>[]>

    /**
     * Count records matching the where clause.
     */
    count<M extends keyof Models<S> & string>(params: {
        model: M
        where?: TypedWhereClause<Models<S>[M]>[]
    }): Promise<number>

    /**
     * Check if a record exists matching the where clause.
     */
    exists<M extends keyof Models<S> & string>(params: {
        model: M
        where: TypedWhereClause<Models<S>[M]>[]
    }): Promise<boolean>

    // ============= Update =============

    /**
     * Update a single record matching the where clause.
     */
    update<M extends keyof Models<S> & string>(params: {
        model: M
        where: TypedWhereClause<Models<S>[M]>[]
        data: Partial<Models<S>[M]>
    }): Promise<Models<S>[M] | null>

    /**
     * Create or update a record (upsert).
     */
    upsert<M extends keyof Models<S> & string>(params: {
        model: M
        where: TypedWhereClause<Models<S>[M]>[]
        create: Partial<Models<S>[M]>
        update: Partial<Models<S>[M]>
    }): Promise<Models<S>[M]>

    /**
     * Update multiple records matching the where clause.
     */
    updateMany<M extends keyof Models<S> & string>(params: {
        model: M
        where: TypedWhereClause<Models<S>[M]>[]
        data: Partial<Models<S>[M]>
    }): Promise<number>

    // ============= Delete =============

    /**
     * Delete a single record matching the where clause.
     */
    delete<M extends keyof Models<S> & string>(params: {
        model: M
        where: TypedWhereClause<Models<S>[M]>[]
    }): Promise<void>

    /**
     * Delete multiple records matching the where clause.
     */
    deleteMany<M extends keyof Models<S> & string>(params: {
        model: M
        where: TypedWhereClause<Models<S>[M]>[]
    }): Promise<number>

    /**
     * Delete all records from a table.
     */
    clear<M extends keyof Models<S> & string>(params: { model: M }): Promise<number>

    // ============= Transaction =============

    /**
     * Execute a function within a transaction.
     */
    transaction<T>(fn: (adapter: TypedStorageAdapter<S>) => Promise<T>): Promise<T>

    // ============= Reactive Subscriptions =============

    /**
     * Subscribe to changes on a model.
     */
    subscribe?<M extends keyof Models<S> & string>(
        model: M,
        callback: (changes: TableChange<Models<S>[M]>[]) => void,
    ): () => void
}

// ============= Adapter Wrapper =============

/**
 * Wrap an untyped StorageAdapter with type-safe schema inference.
 *
 * This is a zero-cost wrapper at runtime - it just provides TypeScript types.
 *
 * @example
 * ```typescript
 * import { inmemory } from '@towns-protocol/storage/adapters/memory'
 * import { typedAdapter } from '@towns-protocol/storage'
 * import { mySchema } from './schema'
 *
 * const adapter = typedAdapter(inmemory(), mySchema)
 * // adapter: TypedStorageAdapter<typeof mySchema>
 * ```
 */
export function typedAdapter<S extends TypedSchemaDef>(
    adapter: StorageAdapter,
    _schema: S,
): TypedStorageAdapter<S> {
    // The adapter is already compatible at runtime - we just cast the types
    return adapter as unknown as TypedStorageAdapter<S>
}
