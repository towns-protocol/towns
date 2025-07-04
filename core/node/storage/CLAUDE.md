# CLAUDE.md - Towns Storage Layer

This file provides guidance to Claude Code when working with the Towns (formerly River) storage implementation.

## Overview

The Towns storage layer implements a distributed, stream-based messaging system using PostgreSQL as the primary datastore. All data is organized into streams (spaces, channels, DMs, user streams) with events batched into miniblocks for efficient replication.

## Architecture

### Core Concepts

- **Streams**: The fundamental unit of organization (spaces, channels, DMs, user metadata)
- **Miniblocks**: Immutable batches of events that form the stream's history
- **Minipool**: Temporary staging area for events before they're committed to miniblocks
- **Snapshots**: Periodic state snapshots for efficient synchronization
- **Partitions**: Tables are partitioned by stream ID hash (256 partitions by default)

### Key Interfaces

The central interface is `StreamStorage` in `storage.go`, which defines all stream operations. The PostgreSQL implementation is in `pg_storage.go` and related files.

### Enforced Stream Constraints

The storage layer enforces critical invariants to maintain data consistency:

1. **Miniblock Requirement**: If a stream exists in the `es` (event streams) table, it MUST have at least one miniblock. Empty streams are not allowed.

2. **Minipool Generation Sequencing**: The minipool generation number MUST always be set to the last miniblock number + 1. This ensures:
   - Proper event ordering
   - Consistent stream state during replication

3. **Miniblock Sequence Gaps**: Gaps in the miniblock sequence ARE allowed:
   - Miniblocks do not necessarily start from 0
   - Gaps can exist due to reconciliation processes
   - The reconciliation logic works to fill these gaps over time

4. **Last Snapshot Consistency**: The `last_snapshot_miniblock_num` in the `es` table MUST always point to one of the miniblocks within the last continuous miniblock sequence:
   - This ensures read operations serve a consistent view of the stream
   - All read operations for serving streams work only with the last continuous sequence (up to the first gap)
   - The last snapshot pointer only grows forward (never updates backwards)

These constraints are enforced at the database level and validated throughout the codebase to prevent data corruption.

## Transaction Handling

### Transaction Runner Pattern

All database operations use the `txRunner` function which provides:
- Automatic retry for serialization failures and deadlocks
- Exponential backoff with jitter
- Transaction tracking and debugging
- Comprehensive metrics and logging

```go
// Example usage
err := s.txRunner(ctx, "WriteMiniblocks", pgx.ReadWrite, func(ctx context.Context, tx pgx.Tx) error {
    // Transaction logic here
}, nil)
```

### Consistency Guarantees

- **Stream Locking**: PostgreSQL advisory locks ensure single-writer per stream
- **Row Locking**: `FOR UPDATE`/`FOR SHARE` for concurrent access control
- **Atomic Batches**: Miniblock writes are atomic using `COPY FROM`
- **Consistency Checks**: Extensive validation throughout write paths

### Transaction Best Practices

1. Always use `txRunner` for database operations
2. Keep transactions short-lived
3. Use appropriate access modes (ReadOnly vs ReadWrite)
4. Handle context cancellation properly (disabled for writes)
5. Add transaction tags for debugging

## Testing Approach

### Test Setup

Use `setupStreamStorageTest` for integration tests:
```go
params := setupStreamStorageTest(t)
defer params.closer()
```

This provides:
- Isolated PostgreSQL schema per test
- Automatic cleanup
- Mock blockchain configuration
- Test-specific connection pools

### Test Patterns

1. **Isolation**: Each test runs in its own schema
2. **Concurrency**: Test lock behavior with multiple connections
3. **Data Integrity**: Validate consistency constraints
4. **Performance**: Measure operation timing for regressions

### Test Utilities

- `TestStreamStore`: Simplified harness for basic operations
- `debugPrintMiniblocks`: Debug helper for miniblock inspection
- Mock implementations for on-chain configuration

## Performance Considerations

### Batch Operations

Always batch when possible:
```go
// Good: Batch insert
_, err := tx.CopyFrom(ctx, pgx.Identifier{"miniblocks"}, columns, pgx.CopyFromRows(rows))

// Avoid: Individual inserts in loops
for _, block := range blocks {
    _, err := tx.Exec(ctx, "INSERT INTO miniblocks...", ...)
}
```

### Query Optimization

1. **Use Partitioned Queries**: Always include stream ID to leverage partitioning
2. **Index-Only Scans**: Design queries to use covering indexes
3. **Limit Result Sets**: Use pagination for large results
4. **Stream Results**: Use `QueryRow` vs `Query` for single results

### Background Workers

- **Ephemeral Monitor**: Cleans up expired ephemeral streams
- **Stream Trimmer**: Removes old miniblocks based on retention
- **Snapshot Trimmer**: Manages snapshot retention
- Configure worker pools appropriately for load

## Common Operations

### Creating a Stream

```go
err := storage.CreateStreamStorage(ctx, streamId, registryAddr)
```

### Writing Events

```go
// Single event
err := storage.WriteEvent(ctx, streamId, event)

// Batch miniblock
err := storage.WriteMiniblocks(ctx, streamId, miniblocks)
```

### Reading Data

```go
// Read from last snapshot
result, err := storage.ReadStreamFromLastSnapshot(ctx, streamId, fromInclusive, toExclusive)

// Read specific miniblocks
blocks, err := storage.ReadMiniblocks(ctx, streamId, fromInclusive, toExclusive)
```

## Debugging

### Transaction Debugging

Enable transaction tracking:
```go
storage.EnableTxTracker(ctx)
defer storage.DisableTxTracker()
```

### Query Debugging

Use explain analyze for slow queries:
```sql
EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM miniblocks_r00 WHERE stream_id = $1;
```

### Common Issues

1. **Deadlocks**: Check lock ordering, use consistent access patterns
2. **Serialization Failures**: Normal under load, handled by retry logic
3. **Connection Exhaustion**: Check pool configuration and connection leaks
4. **Slow Queries**: Missing indexes or not leveraging partitioning

## Migration Guidelines

1. Migrations use golang-migrate with embedded SQL files
2. Always test migrations on a copy of production data
3. Consider partition count impacts on migration time
4. Use pre-migration hooks for complex setup

## Security Considerations

1. Never log sensitive data (encryption keys, user data)
2. Use parameterized queries exclusively
3. Validate all inputs before database operations
4. Apply principle of least privilege for database users

## Development Workflow

1. Make changes to storage interfaces first
2. Implement PostgreSQL-specific logic
3. Write comprehensive tests including concurrency cases
4. Benchmark critical paths for performance regressions
5. Update migrations if schema changes are needed