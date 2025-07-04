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

## Storage Testing Patterns

This section documents the patterns and conventions for writing tests in the storage package.

### Test Setup Pattern

All storage tests follow a consistent setup pattern using helper functions:

```go
func TestYourFeature(t *testing.T) {
    params := setupAppRegistryStorageTest(t)  // or setupStorageTest for general storage
    t.Cleanup(params.closer)
    
    require := require.New(t)
    store := params.pgAppRegistryStore
    
    // Your test logic here
}
```

### Key Test Helpers

#### `setupAppRegistryStorageTest(t *testing.T)`
- Creates a test database with prefix "b_" for app registry tests
- Returns `testAppRegistryStoreParams` containing:
  - `ctx`: Test context
  - `pgAppRegistryStore`: The store instance
  - `schema`: Database schema name
  - `config`: Database configuration
  - `closer`: Cleanup function (must be called with `t.Cleanup`)
  - `exitSignal`: Channel for signaling exit

#### `safeAddress(t *testing.T)`
- Generates a random Ethereum address for testing
- Ensures no address collisions in tests

#### `testAppMetadataWithName(name string)`
- Creates test metadata with a given name and default values for other fields
- Useful for tests that need consistent metadata

### Common Test Patterns

#### 1. Testing Create Operations
```go
// Create test data
owner := safeAddress(t)
app := safeAddress(t)
metadata := testAppMetadataWithName("TestApp")

// Create the entity
err := store.CreateApp(params.ctx, owner, app, settings, metadata, secret)
require.NoError(err)

// Verify creation
info, err := store.GetAppInfo(params.ctx, app)
require.NoError(err)
require.Equal(expected, info)
```

#### 2. Testing Not Found Errors
```go
nonExistentApp := safeAddress(t)
_, err := store.GetAppInfo(params.ctx, nonExistentApp)
require.Error(err)
require.True(base.IsRiverErrorCode(err, Err_NOT_FOUND))
require.ErrorContains(err, "expected error message")
```

#### 3. Testing Duplicate/Conflict Errors
```go
// Try to create duplicate
err = store.CreateApp(params.ctx, owner, app2, settings, duplicateMetadata, secret)
require.Error(err)
require.True(base.IsRiverErrorCode(err, Err_ALREADY_EXISTS))
```

#### 4. Testing Update Operations
```go
// Update the entity
updatedMetadata := types.AppMetadata{...}
err = store.SetAppMetadata(params.ctx, app, updatedMetadata)
require.NoError(err)

// Verify update
info, err := store.GetAppInfo(params.ctx, app)
require.NoError(err)
require.Equal(updatedMetadata, info.Metadata)
```

### Testing Edge Cases

Always test:
1. Empty/nil values where applicable
2. Non-existent entities (NOT_FOUND errors)
3. Duplicate entries (ALREADY_EXISTS errors)
4. Concurrent operations (if applicable)
5. Transaction rollbacks (if applicable)

### Database Schema Considerations

- Tests use isolated schemas with prefixes (e.g., "b_" for app registry)
- Each test gets its own database schema to prevent interference
- Cleanup is automatic via `t.Cleanup(params.closer)`

### Test Patterns

1. **Isolation**: Each test runs in its own schema
2. **Concurrency**: Test lock behavior with multiple connections
3. **Data Integrity**: Validate consistency constraints
4. **Performance**: Measure operation timing for regressions

### Test Utilities

- `TestStreamStore`: Simplified harness for basic operations
- `debugPrintMiniblocks`: Debug helper for miniblock inspection
- Mock implementations for on-chain configuration

### Common Test Imports

Standard imports for storage tests:
```go
import (
    "context"
    "testing"
    
    "github.com/ethereum/go-ethereum/common"
    "github.com/stretchr/testify/require"
    
    "github.com/towns-protocol/towns/core/node/app_registry/types"
    "github.com/towns-protocol/towns/core/node/base"
    "github.com/towns-protocol/towns/core/node/base/test"
    "github.com/towns-protocol/towns/core/node/protocol"
    "github.com/towns-protocol/towns/core/node/storage"
    "github.com/towns-protocol/towns/core/node/testutils/dbtestutils"
)
```

### Important Design Principles

#### Separation of Concerns
- **Storage layer**: Only handles database operations and data integrity
- **Service layer**: Handles business logic, validation rules, and orchestration
- Example: `IsDisplayNameAvailable` in storage only checks if a name exists in DB, while `ValidateBotName` in service adds business rules like rejecting empty names

#### Error Handling Patterns
- Use `base.IsRiverErrorCode(err, code)` to check specific error types
- Use `require.ErrorContains(err, message)` to verify error messages
- Always return appropriate River error codes (e.g., `Err_NOT_FOUND`, `Err_ALREADY_EXISTS`)

#### Test Data Generation
- Use helper functions to generate test data consistently
- Generate unique addresses/IDs using `safeAddress(t)` to avoid collisions
- Create realistic test data that matches production patterns

#### Table-Driven Tests
When testing multiple scenarios, use table-driven tests:
```go
tests := []struct {
    name        string
    input       string
    expected    bool
    wantErr     bool
}{
    {"valid name", "BotName", true, false},
    {"empty name", "", false, false},
    {"existing name", existingName, false, false},
}

for _, tt := range tests {
    t.Run(tt.name, func(t *testing.T) {
        result, err := store.IsDisplayNameAvailable(ctx, tt.input)
        if tt.wantErr {
            require.Error(t, err)
        } else {
            require.NoError(t, err)
            require.Equal(t, tt.expected, result)
        }
    })
}
```

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
