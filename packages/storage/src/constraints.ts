/**
 * Constraint builders for defining indexes, primary keys, and foreign keys on tables.
 *
 * This module provides a Drizzle ORM-inspired API for defining table constraints
 * using a callback-based approach. Constraints are defined as the third parameter
 * of the `table()` function.
 *
 * @see https://orm.drizzle.team/docs/indexes-constraints
 *
 * @example
 * ```typescript
 * import { t, table, index, uniqueIndex, primaryKey, foreignKey } from '@towns-protocol/storage'
 *
 * const usersTable = table('users', {
 *     id: t.string().primaryKey(),
 *     name: t.string(),
 *     email: t.string(),
 * }, (tbl) => [
 *     uniqueIndex('idx_email').on(tbl.email),
 * ])
 *
 * const sessionsTable = table('sessions', {
 *     streamId: t.string(),
 *     sessionId: t.string(),
 *     userId: t.string(),
 *     data: t.bytes(),
 * }, (tbl) => [
 *     primaryKey({ columns: [tbl.streamId, tbl.sessionId] }),
 *     index('idx_userId').on(tbl.userId),
 *     foreignKey({
 *         columns: [tbl.userId],
 *         foreignColumns: [usersTable.id],
 *         onDelete: 'cascade',
 *     }),
 * ])
 * ```
 *
 * @module constraints
 */

// ============= Referential Action Types =============

/**
 * Referential actions for foreign key constraints.
 *
 * These actions determine what happens to child rows when the referenced
 * parent row is deleted or updated.
 *
 * @see https://orm.drizzle.team/docs/indexes-constraints#foreign-key
 *
 * | Action | Description |
 * |--------|-------------|
 * | `cascade` | Automatically delete/update child rows when parent is deleted/updated |
 * | `restrict` | Prevent deletion/update of parent if child rows exist (checked immediately) |
 * | `no action` | Same as restrict, but checked at end of transaction (default in most DBs) |
 * | `set null` | Set foreign key column(s) to NULL when parent is deleted/updated |
 * | `set default` | Set foreign key column(s) to their default value when parent is deleted/updated |
 */
export type ReferentialAction = 'cascade' | 'restrict' | 'no action' | 'set null' | 'set default'

// ============= Constraint Types =============

/**
 * Index constraint definition.
 *
 * Represents an index on one or more columns. Indexes improve query performance
 * for lookups, sorting, and filtering operations on the indexed columns.
 */
export interface IndexConstraint {
    /** Discriminator for constraint type */
    type: 'index'
    /** Name of the index (used in database DDL) */
    name: string
    /** Column names included in the index (order matters for compound indexes) */
    columns: string[]
    /** Whether the index enforces uniqueness */
    unique: boolean
}

/**
 * Primary key constraint definition.
 *
 * Represents a composite primary key spanning multiple columns.
 * Use this when the table's primary key consists of more than one column.
 *
 * For single-column primary keys, prefer using `.primaryKey()` on the column builder:
 * ```typescript
 * const table = table('users', {
 *     id: t.string().primaryKey(),  // Single-column PK
 * })
 * ```
 */
export interface PrimaryKeyConstraint {
    /** Discriminator for constraint type */
    type: 'primaryKey'
    /** Optional constraint name (for database DDL) */
    name?: string
    /** Column names that form the composite primary key */
    columns: string[]
}

/**
 * Foreign key constraint definition.
 *
 * Represents a referential integrity constraint between tables.
 * Foreign keys ensure that values in the referencing columns exist
 * in the referenced table's columns.
 */
export interface ForeignKeyConstraint {
    /** Discriminator for constraint type */
    type: 'foreignKey'
    /** Optional constraint name (for database DDL) */
    name?: string
    /** Column names in this table that reference the foreign table */
    columns: string[]
    /** Name of the referenced (parent) table */
    foreignTable: string
    /** Column names in the foreign table being referenced */
    foreignColumns: string[]
    /**
     * Action to take when a referenced row is deleted.
     *
     * - `cascade`: Delete child rows automatically
     * - `restrict`: Prevent deletion if child rows exist
     * - `no action`: Same as restrict (default)
     * - `set null`: Set foreign key to NULL
     * - `set default`: Set foreign key to default value
     */
    onDelete?: ReferentialAction
    /**
     * Action to take when a referenced row's key is updated.
     *
     * - `cascade`: Update child rows automatically
     * - `restrict`: Prevent update if child rows exist
     * - `no action`: Same as restrict (default)
     * - `set null`: Set foreign key to NULL
     * - `set default`: Set foreign key to default value
     */
    onUpdate?: ReferentialAction
}

/**
 * Union of all table constraint types.
 */
export type TableConstraint = IndexConstraint | PrimaryKeyConstraint | ForeignKeyConstraint

// ============= Column Reference =============

/**
 * A reference to a column in a table.
 *
 * Column references are used in constraint definitions to refer to specific columns.
 * They are typically created automatically via the table proxy in constraint callbacks,
 * but can also be created manually using `columnRef()` for cross-table references.
 *
 * @example
 * ```typescript
 * // Automatic via table proxy (recommended)
 * table('posts', { userId: t.string() }, (tbl) => [
 *     index('idx').on(tbl.userId),  // tbl.userId is a ColumnRef
 * ])
 *
 * // Manual for cross-table references
 * foreignKey({
 *     columns: [tbl.userId],
 *     foreignColumns: [columnRef('users', 'id')],
 * })
 * ```
 */
export interface ColumnRef {
    /** The column name */
    readonly _columnName: string
    /** The table name this column belongs to */
    readonly _tableName: string
}

/**
 * Create a column reference manually.
 *
 * Use this when you need to reference a column from another table,
 * such as in foreign key definitions.
 *
 * @param tableName - The name of the table
 * @param columnName - The name of the column
 * @returns A column reference object
 *
 * @example
 * ```typescript
 * const fk = foreignKey({
 *     columns: [tbl.authorId],
 *     foreignColumns: [columnRef('users', 'id')],
 *     onDelete: 'cascade',
 * })
 * ```
 */
export function columnRef(tableName: string, columnName: string): ColumnRef {
    return {
        _columnName: columnName,
        _tableName: tableName,
    }
}

// ============= Index Builder =============

/**
 * Builder interface for creating index constraints.
 *
 * The builder pattern allows for a fluent API where you first specify
 * the index name, then chain `.on()` to specify the columns.
 */
export interface IndexBuilder {
    /**
     * Specify the column(s) for this index.
     *
     * For compound indexes, the order of columns matters for query optimization.
     * Place the most selective (highest cardinality) columns first.
     *
     * @param columns - One or more column references
     * @returns The complete index constraint
     * @throws Error if no columns are provided
     *
     * @example
     * ```typescript
     * // Single column index
     * index('idx_email').on(tbl.email)
     *
     * // Compound index (userId, createdAt)
     * index('idx_user_date').on(tbl.userId, tbl.createdAt)
     * ```
     */
    on(...columns: ColumnRef[]): IndexConstraint
}

/**
 * Create a non-unique index on the specified columns.
 *
 * Indexes improve query performance for:
 * - WHERE clause lookups
 * - ORDER BY sorting
 * - JOIN operations
 *
 * @param name - The index name (must be unique within the table)
 * @returns An index builder to specify columns
 *
 * @example
 * ```typescript
 * const usersTable = table('users', {
 *     id: t.string().primaryKey(),
 *     name: t.string(),
 *     email: t.string(),
 *     createdAt: t.date(),
 * }, (tbl) => [
 *     // Single column index
 *     index('idx_name').on(tbl.name),
 *
 *     // Compound index for queries filtering by both columns
 *     index('idx_name_created').on(tbl.name, tbl.createdAt),
 * ])
 * ```
 */
export function index(name: string): IndexBuilder {
    return {
        on(...columns: ColumnRef[]): IndexConstraint {
            if (columns.length === 0) {
                throw new Error('Index must have at least one column')
            }
            return {
                type: 'index',
                name,
                columns: columns.map((c) => c._columnName),
                unique: false,
            }
        },
    }
}

/**
 * Create a unique index on the specified columns.
 *
 * Unique indexes enforce that no two rows can have the same value(s)
 * in the indexed column(s). This also improves query performance.
 *
 * For compound unique indexes, the combination of values must be unique,
 * not each individual column.
 *
 * @param name - The index name (must be unique within the table)
 * @returns An index builder to specify columns
 *
 * @example
 * ```typescript
 * const usersTable = table('users', {
 *     id: t.string().primaryKey(),
 *     email: t.string(),
 *     orgId: t.string(),
 *     username: t.string(),
 * }, (tbl) => [
 *     // Unique email across all users
 *     uniqueIndex('idx_email').on(tbl.email),
 *
 *     // Unique username within each organization
 *     // (same username allowed in different orgs)
 *     uniqueIndex('idx_org_username').on(tbl.orgId, tbl.username),
 * ])
 * ```
 */
export function uniqueIndex(name: string): IndexBuilder {
    return {
        on(...columns: ColumnRef[]): IndexConstraint {
            if (columns.length === 0) {
                throw new Error('Index must have at least one column')
            }
            return {
                type: 'index',
                name,
                columns: columns.map((c) => c._columnName),
                unique: true,
            }
        },
    }
}

// ============= Primary Key Builder =============

/**
 * Options for creating a composite primary key constraint.
 */
export interface PrimaryKeyOptions {
    /**
     * Optional constraint name.
     * If not provided, the database will generate one automatically.
     */
    name?: string
    /**
     * Column references that form the composite primary key.
     * Must contain at least one column.
     */
    columns: ColumnRef[]
}

/**
 * Create a composite primary key constraint.
 *
 * Use this when the table's primary key spans multiple columns.
 * For single-column primary keys, prefer using `.primaryKey()` on the column builder.
 *
 * Composite primary keys are useful for:
 * - Junction/join tables in many-to-many relationships
 * - Tables where rows are uniquely identified by multiple attributes
 * - Partitioned data where partition key + row key form the identity
 *
 * @param options - Primary key configuration
 * @returns The primary key constraint
 * @throws Error if no columns are provided
 *
 * @example
 * ```typescript
 * // Junction table for many-to-many relationship
 * const userRolesTable = table('user_roles', {
 *     userId: t.string(),
 *     roleId: t.string(),
 *     assignedAt: t.date(),
 * }, (tbl) => [
 *     primaryKey({ columns: [tbl.userId, tbl.roleId] }),
 * ])
 *
 * // Session table with composite key
 * const sessionsTable = table('sessions', {
 *     streamId: t.string(),
 *     sessionId: t.string(),
 *     data: t.bytes(),
 * }, (tbl) => [
 *     primaryKey({
 *         name: 'pk_sessions',
 *         columns: [tbl.streamId, tbl.sessionId],
 *     }),
 * ])
 * ```
 */
export function primaryKey(options: PrimaryKeyOptions): PrimaryKeyConstraint {
    if (options.columns.length === 0) {
        throw new Error('Primary key must have at least one column')
    }
    return {
        type: 'primaryKey',
        name: options.name,
        columns: options.columns.map((c) => c._columnName),
    }
}

// ============= Foreign Key Builder =============

/**
 * Options for creating a foreign key constraint.
 */
export interface ForeignKeyOptions {
    /**
     * Optional constraint name.
     * If not provided, the database will generate one automatically.
     */
    name?: string
    /**
     * Column references in this table that will hold the foreign key values.
     */
    columns: ColumnRef[]
    /**
     * Column references in the foreign (parent) table being referenced.
     * Must have the same number of columns as `columns`.
     */
    foreignColumns: ColumnRef[]
    /**
     * Action to take when a referenced row is deleted.
     *
     * | Action | Behavior |
     * |--------|----------|
     * | `cascade` | Delete child rows automatically |
     * | `restrict` | Prevent deletion if child rows exist (immediate check) |
     * | `no action` | Prevent deletion if child rows exist (deferred check, default) |
     * | `set null` | Set the foreign key column(s) to NULL |
     * | `set default` | Set the foreign key column(s) to their default value |
     *
     * @default 'no action' (in most databases)
     */
    onDelete?: ReferentialAction
    /**
     * Action to take when a referenced row's primary key is updated.
     *
     * | Action | Behavior |
     * |--------|----------|
     * | `cascade` | Update child rows' foreign key values automatically |
     * | `restrict` | Prevent update if child rows exist (immediate check) |
     * | `no action` | Prevent update if child rows exist (deferred check, default) |
     * | `set null` | Set the foreign key column(s) to NULL |
     * | `set default` | Set the foreign key column(s) to their default value |
     *
     * @default 'no action' (in most databases)
     */
    onUpdate?: ReferentialAction
}

/**
 * Create a foreign key constraint.
 *
 * Foreign keys enforce referential integrity between tables, ensuring that
 * values in the referencing columns exist in the referenced table.
 *
 * @param options - Foreign key configuration
 * @returns The foreign key constraint
 * @throws Error if no columns are provided
 * @throws Error if no foreign columns are provided
 * @throws Error if column counts don't match
 *
 * @see https://orm.drizzle.team/docs/indexes-constraints#foreign-key
 *
 * @example
 * ```typescript
 * const usersTable = table('users', {
 *     id: t.string().primaryKey(),
 *     name: t.string(),
 * })
 *
 * // Posts belong to a user, cascade delete when user is deleted
 * const postsTable = table('posts', {
 *     id: t.string().primaryKey(),
 *     authorId: t.string(),
 *     content: t.string(),
 * }, (tbl) => [
 *     foreignKey({
 *         name: 'fk_posts_author',
 *         columns: [tbl.authorId],
 *         foreignColumns: [columnRef('users', 'id')],
 *         onDelete: 'cascade',
 *         onUpdate: 'cascade',
 *     }),
 * ])
 *
 * // Composite foreign key example
 * const orderItemsTable = table('order_items', {
 *     orderId: t.string(),
 *     productId: t.string(),
 *     warehouseId: t.string(),
 *     quantity: t.integer(),
 * }, (tbl) => [
 *     foreignKey({
 *         columns: [tbl.productId, tbl.warehouseId],
 *         foreignColumns: [
 *             columnRef('inventory', 'productId'),
 *             columnRef('inventory', 'warehouseId'),
 *         ],
 *         onDelete: 'restrict',
 *     }),
 * ])
 * ```
 */
export function foreignKey(options: ForeignKeyOptions): ForeignKeyConstraint {
    if (options.columns.length === 0) {
        throw new Error('Foreign key must have at least one column')
    }
    if (options.foreignColumns.length === 0) {
        throw new Error('Foreign key must reference at least one foreign column')
    }
    if (options.columns.length !== options.foreignColumns.length) {
        throw new Error('Foreign key column count must match foreign column count')
    }

    // Get the foreign table name from the first foreign column
    const foreignTable = options.foreignColumns[0]._tableName

    return {
        type: 'foreignKey',
        name: options.name,
        columns: options.columns.map((c) => c._columnName),
        foreignTable,
        foreignColumns: options.foreignColumns.map((c) => c._columnName),
        onDelete: options.onDelete,
        onUpdate: options.onUpdate,
    }
}

// ============= Table Proxy Type =============

/**
 * Proxy type for table columns used in constraint callbacks.
 *
 * When you define constraints using the callback API, the callback receives
 * a proxy object where each property is a `ColumnRef` for that column.
 *
 * @example
 * ```typescript
 * table('users', {
 *     id: t.string(),
 *     email: t.string(),
 * }, (tbl) => [
 *     // tbl.id and tbl.email are ColumnRef objects
 *     uniqueIndex('idx_email').on(tbl.email),
 * ])
 * ```
 */
export type TableColumnsProxy<Columns extends Record<string, unknown>> = {
    [K in keyof Columns]: ColumnRef
}

/**
 * Create a proxy object for table columns that returns ColumnRef for each access.
 *
 * This is used internally by the `table()` function when a constraint callback
 * is provided. You typically don't need to call this directly.
 *
 * @param tableName - The name of the table
 * @param columns - The column builders object
 * @returns A proxy where each property access returns a ColumnRef
 *
 * @internal
 */
export function createTableProxy<Columns extends Record<string, unknown>>(
    tableName: string,
    columns: Columns,
): TableColumnsProxy<Columns> {
    const proxy: Record<string, ColumnRef> = {}
    for (const columnName of Object.keys(columns)) {
        proxy[columnName] = columnRef(tableName, columnName)
    }
    return proxy as TableColumnsProxy<Columns>
}
