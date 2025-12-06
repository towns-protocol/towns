# Overview - Towns Protocol Subgraph

## Overview

You are working with the Towns Protocol Subgraph - a blockchain data indexing service that transforms on-chain events from Towns Protocol smart contracts into a queryable database. This package uses Ponder, a modern TypeScript-based indexing framework, to track spaces, swaps, tips, staking, subscriptions, and other protocol activities across Base chain.

## Core Functionality

The subgraph provides:

- Real-time indexing of Towns Protocol smart contract events
- Space creation and metadata tracking (names, descriptions, ownership)
- Swap activity monitoring with fee distribution
- Tipping leaderboards and analytics
- Staking and delegation tracking for spaces and operators
- Bot/app registration and permission tracking
- Review and rating systems for spaces
- Subscription management with renewal tracking
- GraphQL and SQL query APIs for indexed data
- Denormalized analytics events for efficient querying

## Technology Stack

- **Framework**: Ponder ^0.13.14 for blockchain indexing
- **Database**: PostgreSQL via Ponder's built-in Drizzle ORM
- **API**: Hono for HTTP server with GraphQL and SQL endpoints
- **Blockchain**: Viem ^2.29.3 for contract interactions
- **Language**: TypeScript with strict type safety
- **Deployment**: Docker Compose for production environments

## Project Structure

```
packages/subgraph/
├── src/
│   ├── index.ts              # Main event handlers and indexing logic
│   ├── metrics.ts            # Metrics wrapper around Ponder
│   ├── utils.ts              # Utility functions (stake calculations, permissions)
│   └── api/
│       └── index.ts          # API routes (GraphQL, SQL endpoints)
├── ponder.config.ts          # Main config (local/development)
├── ponder.config.alpha.ts    # Alpha environment config
├── ponder.config.beta.ts     # Beta environment config
├── ponder.config.omega.ts    # Omega environment config
├── ponder.schema.ts          # Database schema definitions
├── utils/
│   └── makePonderConfig.ts   # Config factory for environments
├── generated/
│   └── schema.graphql        # Auto-generated GraphQL schema
├── docker-compose.yml        # Production deployment config
├── Dockerfile                # Container image definition
└── scripts/
    └── setup-subgraph.sh     # Development setup script
```

## Key Contracts Indexed

### Core Space Contracts
- `SpaceFactory` - Space creation events
- `SpaceOwner` - Space ownership transfers and metadata updates
- `Space` (Diamond) - Per-space events (swaps, tips, subscriptions)

### Base Registry Contracts
- `BaseRegistry:RewardsDistribution` - Staking deposits, withdrawals, redelegations
- `BaseRegistry:Operator` - Operator registration and status changes
- `BaseRegistry:AppRegistry` - Bot/app registration, permissions, installations

### Router Contracts
- `SwapRouter` - Aggregated swap events and fee distributions

## Development Guidelines

### 1. Event Handler Pattern

All event handlers follow a consistent pattern:

```typescript
ponder.on('ContractName:EventName', async ({ event, context }) => {
    const blockNumber = event.block.number
    const blockTimestamp = event.block.timestamp
    const spaceId = event.log.address // For space-specific events

    try {
        // 1. Validate: Check if related entities exist
        const space = await context.db.sql.query.space.findFirst({
            where: eq(schema.space.id, spaceId)
        })
        if (!space) {
            console.warn(`Space not found for Event`, spaceId)
            return
        }

        // 2. Transform: Process event data
        const processedData = transformEventData(event.args)

        // 3. Store: Insert or update database records
        await context.db.insert(schema.table)
            .values({ ...processedData })
            .onConflictDoUpdate({ /* update logic */ })

    } catch (error) {
        console.error(`Error processing Event at block ${blockNumber}:`, error)
    }
})
```

### 2. Schema Design Patterns

**Primary Keys and Indexes**:
```typescript
export const entity = onchainTable(
    'table_name',
    (t) => ({
        id: t.hex().primaryKey(),           // Simple primary key
        // or composite key:
        // userId: t.hex().notNull(),
        // spaceId: t.hex().notNull(),
        field: t.text().notNull(),
        createdAt: t.bigint().notNull(),
    }),
    (table) => ({
        // Composite primary key (if needed)
        pk: primaryKey({ columns: [table.userId, table.spaceId] }),
        // Indexes for query performance
        fieldIdx: index().on(table.field),
        createdIdx: index().on(table.createdAt),
    })
)
```

**Relations**:
```typescript
// One-to-many relation
export const spaceToSwaps = relations(space, ({ many }) => ({
    swaps: many(swap)
}))

export const swapToSpace = relations(swap, ({ one }) => ({
    space: one(space, { fields: [swap.spaceId], references: [space.id] })
}))
```

### 3. Critical Performance Patterns

**Setup Hook for Indexes**:
Critical indexes needed during historic sync must be created in setup hooks:

```typescript
ponder.on('ContractName:setup', async ({ context }) => {
    try {
        console.info('Creating critical indexes...')

        await context.db.sql.execute(sql`
            CREATE INDEX IF NOT EXISTS table_field_idx
            ON table_name (field)
        `)

        console.info('✅ Critical indexes created successfully')
    } catch (error) {
        console.warn('⚠️ Failed to create indexes (may already exist):', error)
    }
})
```

**Parallel Contract Reads**:
Use `Promise.all` to parallelize RPC calls:

```typescript
const [paused, spaceInfo] = await Promise.all([
    context.client.readContract({
        abi: SpaceFactory.abi,
        address: event.args.space,
        functionName: 'paused',
        blockNumber
    }),
    context.client.readContract({
        abi: SpaceOwner.abi,
        address: SpaceOwner.address,
        functionName: 'getSpaceInfo',
        args: [event.args.space],
        blockNumber
    })
])
```

**Upsert Pattern**:
Handle both inserts and updates gracefully:

```typescript
// Try update first, insert if no rows affected
const result = await context.db.sql
    .update(schema.table)
    .set({ field: value })
    .where(eq(schema.table.id, id))

if (result.changes === 0) {
    await context.db.insert(schema.table)
        .values({ id, field: value })
}

// Or use onConflictDoUpdate for true upsert
await context.db.insert(schema.table)
    .values({ id, field: value })
    .onConflictDoUpdate({
        target: [schema.table.id],
        set: { field: value }
    })
```

### 4. Common Patterns from Production

**Event Ordering Considerations**:
Some events arrive out of order (e.g., Transfer before SpaceCreated):

```typescript
// Note: Transfer events are emitted during space creation,
// often BEFORE the SpaceCreated event is processed.
// Direct update without checking existence - if the space doesn't exist yet,
// the UPDATE will affect 0 rows (harmless). The space will be created when
// SpaceCreated is processed, with the correct owner already set.
await context.db.sql
    .update(schema.space)
    .set({ owner: event.args.to })
    .where(eq(schema.space.tokenId, event.args.tokenId))
```

**Environment-Aware Contract Reads**:
Handle contract upgrades across environments:

```typescript
/**
 * Returns a block number suitable for reading upgraded contracts.
 * The contract was upgraded at different blocks on different environments.
 * Using consistent block numbers helps maximize Ponder's RPC cache efficiency.
 */
async function getReadBlockNumber(blockNumber: bigint): Promise<bigint> {
    const environment = process.env.PONDER_ENVIRONMENT || 'local_dev'

    if (environment === 'local_dev') {
        return await publicClient.getBlockNumber()
    }

    const minBlockByEnvironment: Record<string, bigint> = {
        alpha: 30861709n,
        beta: 30861709n,
        omega: 35350928n
    }

    const minBlock = minBlockByEnvironment[environment] ?? 0n
    return blockNumber > minBlock ? blockNumber : minBlock
}
```

**Denormalized Analytics Events**:
For efficient cross-entity queries, maintain a unified analytics table:

```typescript
export const analyticsEvent = onchainTable(
    'analytics_events',
    (t) => ({
        txHash: t.hex().notNull(),
        logIndex: t.integer().notNull(),
        spaceId: t.hex().notNull(),
        eventType: analyticsEventType().notNull(),  // enum: swap, tip, join, review
        blockTimestamp: t.bigint().notNull(),
        ethAmount: t.bigint().default(0n),  // Normalized for sorting
        eventData: t.json().$type<AnalyticsEventData>().notNull(),  // Type-safe JSON
    }),
    (table) => ({
        pk: primaryKey({ columns: [table.txHash, table.logIndex] }),
        // Composite indexes for efficient queries
        spaceEventTypeTimestampIdx: index().on(
            table.spaceId,
            table.eventType,
            table.blockTimestamp
        )
    })
)
```

### 5. Error Handling

Always wrap event handlers in try-catch and log context:

```typescript
ponder.on('Contract:Event', async ({ event, context }) => {
    const blockNumber = event.block.number
    try {
        // handler logic
    } catch (error) {
        console.error(
            `Error processing Contract:Event at blockNumber ${blockNumber}:`,
            error
        )
    }
})
```

For critical data validation, warn and return early:

```typescript
const space = await context.db.sql.query.space.findFirst({
    where: eq(schema.space.id, spaceId)
})
if (!space) {
    console.warn(`Space not found for Contract:Event`, spaceId)
    return
}
```

## Build and Development Commands

```bash
# Development
bun run dev                    # Start Ponder dev server with UI
bun run dev:no-ui             # Start dev server without UI (for schema.graphql generation)
bun run dev:fork              # Run setup script for forked development

# Type checking and validation
bun run typings               # Generate contract typings from @towns-protocol/contracts
bun run test:unit             # Type check without emitting files (tsc --noEmit)

# Code generation
bun run codegen               # Generate Ponder types and GraphQL schema

# Code quality
bun run format                # Format code with Prettier
bun run lint                  # Run ESLint

# Production
bun run start                 # Start indexing from configured start block
bun run serve                 # Start API server only (requires existing database)

# Database
bun run db                    # Ponder database management commands
```

## Configuration

### Environment Variables

Required environment variables in `.env.*` files:

```bash
# RPC endpoint for blockchain data
PONDER_RPC_URL_1=https://base-mainnet.g.alchemy.com/v2/YOUR_KEY

# Starting block for indexing (default: 22890725)
PONDER_START_BLOCK=22890725

# Environment name (local_dev, alpha, beta, omega)
PONDER_ENVIRONMENT=local_dev

# Database connection (auto-configured in Docker)
DATABASE_URL=postgresql://ponder:ponder@localhost:5432/ponder
```

### Multi-Environment Setup

The subgraph supports multiple deployment environments:

```typescript
// ponder.config.alpha.ts, ponder.config.beta.ts, etc.
export default createConfig(
    makePonderConfig({
        environment: 'alpha',  // or 'beta', 'omega'
        baseChain: {
            id: 8453,  // Base mainnet
            rpc: http(process.env.PONDER_RPC_URL_1),
            disableCache: false
        },
        baseChainStartBlock: 22890725
    })
)
```

### Docker Deployment

Production deployment uses separate indexer and API server containers:

```bash
# Start services for specific environment
docker compose --env-file .env.alpha up -d

# View logs
docker compose --env-file .env.alpha logs -f subgraph-indexer
docker compose --env-file .env.alpha logs -f subgraph-server

# Stop and clean up (including volumes to avoid schema conflicts)
docker compose --env-file .env.alpha down -v
```

## API Endpoints

The subgraph exposes multiple query interfaces on port 42069:

- **GraphQL Playground**: http://localhost:42069/graphql
- **GraphQL API**: http://localhost:42069/ (POST queries)
- **SQL over HTTP**: http://localhost:42069/sql/* (Ponder SQL API)
- **Health Checks**:
  - `/status` - Service status information
  - `/ready` - Readiness check
  - `/health` - Health check endpoint
  - `/metrics` - Prometheus metrics

## Common Workflows

### 1. Adding a New Event Handler

When new contract events need to be indexed:

1. **Update Ponder Config** (`utils/makePonderConfig.ts`):
```typescript
contracts: {
    NewContract: {
        abi: newContractAbi,
        address: addresses.NewContract,
        network: 'base',
        startBlock: START_BLOCK
    }
}
```

2. **Update Schema** (`ponder.schema.ts`):
```typescript
export const newEntity = onchainTable(
    'new_entities',
    (t) => ({
        id: t.hex().primaryKey(),
        field: t.text().notNull(),
        createdAt: t.bigint().notNull()
    }),
    (table) => ({
        fieldIdx: index().on(table.field)
    })
)
```

3. **Add Event Handler** (`src/index.ts`):
```typescript
ponder.on('NewContract:EventName', async ({ event, context }) => {
    try {
        await context.db.insert(schema.newEntity)
            .values({
                id: event.args.id,
                field: event.args.field,
                createdAt: event.block.number
            })
    } catch (error) {
        console.error(`Error processing NewContract:EventName:`, error)
    }
})
```

4. **Regenerate GraphQL Schema**:
```bash
bun run dev:no-ui  # Generates updated schema.graphql
```

5. **Test**: Query via GraphQL playground at http://localhost:42069/graphql

### 2. Adding Aggregated Analytics

When adding new aggregate metrics to spaces:

1. **Add Field to Space Schema**:
```typescript
export const space = onchainTable(
    'spaces',
    (t) => ({
        // ... existing fields
        newMetric: t.bigint().default(0n),
        newMetricCount: t.bigint().default(0n)
    })
)
```

2. **Update Event Handler to Increment**:
```typescript
ponder.on('Space:NewEvent', async ({ event, context }) => {
    const space = await context.db.sql.query.space.findFirst({
        where: eq(schema.space.id, spaceId)
    })
    if (space) {
        await context.db.sql
            .update(schema.space)
            .set({
                newMetric: (space.newMetric ?? 0n) + event.args.amount,
                newMetricCount: (space.newMetricCount ?? 0n) + 1n
            })
            .where(eq(schema.space.id, spaceId))
    }
})
```

3. **Add to Analytics Events** (if needed):
```typescript
await context.db.insert(schema.analyticsEvent)
    .values({
        txHash: event.transaction.hash,
        logIndex: event.log.logIndex,
        spaceId: spaceId,
        eventType: 'new_metric',
        blockTimestamp: event.block.timestamp,
        ethAmount: calculateEthAmount(event.args),
        eventData: {
            type: 'new_metric',
            // ... type-safe event-specific data
        }
    })
```

### 3. Debugging Indexing Issues

**Check Indexer Status**:
```bash
# View real-time logs
docker compose --env-file .env.alpha logs -f subgraph-indexer

# Check API status endpoint
curl http://localhost:42069/status
```

**Common Issues**:

- **Indexer not processing blocks**: Check RPC rate limits, verify `PONDER_RPC_URL_1`
- **Missing data**: Verify event handler logs for warnings about missing entities
- **Schema conflicts on restart**: Always use `docker compose down -v` to remove volumes
- **Slow historic sync**: Add setup hooks with critical indexes for tables queried during sync
- **Stale data**: Check if indexer is caught up (`/status` endpoint shows current vs latest block)

**Local Development Debugging**:
```bash
# Run with detailed logs
bun run dev

# Type check without running
bun run test:unit

# Verify contract ABIs are up to date
bun run typings
```

### 4. Optimizing Query Performance

**Add Composite Indexes** for common query patterns:
```typescript
(table) => ({
    // Single field index
    spaceIdx: index().on(table.spaceId),

    // Composite index for multi-field queries
    spaceTimestampIdx: index().on(table.spaceId, table.timestamp),

    // Index for sorting/filtering
    amountIdx: index().on(table.amount)
})
```

**Use Relations** for efficient joins:
```typescript
// Define relations in schema
export const spaceToEvents = relations(space, ({ many }) => ({
    events: many(analyticsEvent)
}))

// Query with relations in GraphQL
query {
  space(id: "0x...") {
    id
    name
    events {
      eventType
      blockTimestamp
    }
  }
}
```

## Important Notes

- **Never modify `/river` directly** - subgraph is part of the river repo but follows its own versioning
- **Schema changes require restart** - Stop containers with `docker compose down -v` to clear database
- **Historic sync performance** - Use setup hooks for indexes needed during initial sync
- **RPC caching** - Ponder caches RPC requests; use consistent block numbers for same data reads
- **Event ordering** - Some events arrive before their parent entities are created (handle gracefully)
- **Contract upgrades** - Use environment-aware block numbers for reading upgraded contracts
- **Denormalize for performance** - Aggregate common queries into dedicated tables/fields
- **Type safety** - Use Drizzle's type-safe queries and typed JSON fields for complex data
- **Docker architecture** - Production uses separate indexer and server containers (2025 architecture)
- **GraphQL schema generation** - Run `bun run dev:no-ui` to regenerate `generated/schema.graphql`

## Testing Strategy

### Development Testing

1. **Type checking**: `bun run test:unit` (runs `tsc --noEmit`)
2. **Local indexing**: `bun run dev` with a local blockchain or fork
3. **GraphQL queries**: Use http://localhost:42069/graphql playground

### Integration Testing Patterns

When testing new event handlers:

```typescript
// 1. Deploy or upgrade contracts on local blockchain
// 2. Trigger events via contract interactions
// 3. Query GraphQL API to verify indexed data
// 4. Check logs for any warnings/errors
```

### Production Validation

After deployment:

1. Check `/status` endpoint for sync progress
2. Verify `/health` returns 200 OK
3. Query GraphQL for recently indexed entities
4. Monitor `/metrics` for indexing performance
5. Review container logs for errors

## Resources

- [Ponder Documentation](https://ponder.sh/docs)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [Viem Documentation](https://viem.sh/)
- [Hono Documentation](https://hono.dev/)
- Towns Protocol Contracts: `/packages/contracts/`
