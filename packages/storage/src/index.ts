/**
 * @towns-protocol/storage
 *
 * Modular storage adapter system for Towns Protocol.
 * Provides a unified interface for different storage backends.
 *
 * Inspired by https://github.com/better-auth/better-auth/tree/main/packages/better-auth/src/adapters
 */

// Core types
export type {
    StorageAdapter,
    WhereClause,
    WhereOperator,
    SortBy,
    JoinConfig,
    JoinOptions,
    TableChange,
} from './types.js'

// Type-safe schema builders
export { t } from './builders.js'
export type {
    ColumnBuilder,
    JsonColumnBuilder,
    StorageType,
    ColumnConfig,
    InferColumnType,
    InferTableType,
    AnyColumnBuilder,
} from './builders.js'

// Type-safe schema definitions
export { table, schema } from './schema.js'
export type { ConstraintsCallback } from './schema.js'
export type {
    TypedTableDef,
    TypedSchemaDef,
    TypedStorageAdapter,
    TypedWhereClause,
    TypedSortBy,
    TypedJoinConfig,
    TypedJoinOptions,
    WithJoins,
    Models,
    ModelNames,
    InferSchemaModels,
    TableConstraint,
    IndexConstraint,
    PrimaryKeyConstraint,
    ForeignKeyConstraint,
    Prettify,
} from './types.js'

// Constraint builders
export {
    index,
    uniqueIndex,
    primaryKey,
    foreignKey,
    columnRef,
    createTableProxy,
} from './constraints.js'
export type {
    ReferentialAction,
    IndexBuilder,
    PrimaryKeyOptions,
    ForeignKeyOptions,
    ColumnRef,
    TableColumnsProxy,
} from './constraints.js'

// Typed adapter wrapper
export { typedAdapter } from './types.js'

// Adapters are exported from their own subpaths:
// - @towns-protocol/storage/adapters/memory
// - @towns-protocol/storage/adapters/dexie
//
// Test utilities are exported from:
// - @towns-protocol/storage/testing
