# @towns-protocol/storage

Modular storage adapter system for Towns Protocol. Provides a unified interface for different storage backends with full TypeScript type inference.

Inspired by [better-auth adapters](https://github.com/better-auth/better-auth/tree/main/packages/better-auth/src/adapters).

## Installation

```bash
yarn add @towns-protocol/storage
```

## Quick Start

```typescript
import { t, table, schema, primaryKey, index } from '@towns-protocol/storage'

// Define a table with type-safe columns
const usersTable = table('users', {
  id: t.string().primaryKey(),
  email: t.string(),
  age: t.integer().nullable(),
  metadata: t.json<{ role: string }>(),
})

// Define a table with composite primary key and indexes
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

// Compose into a schema
const mySchema = schema('myapp', {
  tables: [usersTable, sessionsTable] as const,
  version: 1,
})
```

## Schema Builders

Use the `t` builder to define column types:

| Builder | TypeScript Type | Description |
|---------|-----------------|-------------|
| `t.string()` | `string` | Text values |
| `t.integer()` | `number` | Integer numbers |
| `t.boolean()` | `boolean` | True/false |
| `t.bytes()` | `Uint8Array` | Binary data |
| `t.bigint()` | `bigint` | Large integers |
| `t.json<T>()` | `T` | JSON objects |
| `t.date()` | `Date` | Timestamps |

### Column Modifiers

- `.primaryKey()` - Mark as primary key
- `.nullable()` - Allow null values
- `.type<T>()` - Specify TypeScript type for JSON columns

## Constraints

Define table constraints in the third parameter of `table()`:

```typescript
import { primaryKey, index, uniqueIndex, foreignKey, columnRef } from '@towns-protocol/storage'

const postsTable = table(
  'posts',
  {
    id: t.string(),
    authorId: t.string(),
    slug: t.string(),
  },
  (tbl) => [
    primaryKey({ columns: [tbl.id] }),
    uniqueIndex('idx_slug').on(tbl.slug),
    index('idx_author').on(tbl.authorId),
    foreignKey({
      columns: [tbl.authorId],
      foreignColumns: [columnRef('users', 'id')],
      onDelete: 'cascade',
    }),
  ],
)
```

## Adapters

### Memory Adapter

In-memory storage with O(1) indexed lookups. Good for testing and non-browser environments.

```typescript
import { inmemory } from '@towns-protocol/storage/adapters/memory'

const adapter = inmemory({ schema: mySchema })

// With LRU eviction
const adapter = inmemory({
  schema: mySchema,
  maxEntries: 5000,
  eviction: 'lru',
})
```

### Dexie Adapter (IndexedDB)

Browser persistence via IndexedDB using Dexie.

```typescript
import Dexie from 'dexie'
import { dexieAdapter, generateDexieStores } from '@towns-protocol/storage/adapters/dexie'

// Create Dexie database with schema
const db = new Dexie('myapp')
db.version(mySchema.version).stores(generateDexieStores(mySchema))

const adapter = dexieAdapter(db)
```

### Drizzle Adapter (SQLite)

SQLite persistence via Drizzle ORM.

```typescript
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { drizzleSqliteAdapter, toSqliteSchema } from '@towns-protocol/storage/adapters/drizzle'

// Generate Drizzle schema from typed schema
const drizzleSchema = toSqliteSchema(mySchema)

// Create database and adapter
const sqlite = new Database('myapp.db')
const db = drizzle(sqlite, { schema: drizzleSchema })
const adapter = drizzleSqliteAdapter(db)
```

## Typed Adapter

Wrap any adapter with `typedAdapter()` for full type inference:

```typescript
import { typedAdapter } from '@towns-protocol/storage'

const typed = typedAdapter(mySchema, adapter)

// Full type inference on all operations
const user = await typed.findOne('users', {
  where: [{ field: 'id', value: '123' }],
})
// user is typed as { id: string; email: string; age: number | null; metadata: { role: string } } | null
```

## Testing

Use the test utilities to verify adapter compliance:

```typescript
import { runAdapterTests } from '@towns-protocol/storage/testing'

runAdapterTests('MyAdapter', () => myAdapter)
```
