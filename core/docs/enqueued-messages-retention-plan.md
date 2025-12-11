# Enqueued Messages Retention Implementation Plan

## Problem
The `enqueued_messages` table grows unbounded when bots stay offline or never publish session keys. There is no TTL or limit mechanism.

## Solution Overview
1. Add `created_at` timestamp to track message age
2. Background cleanup job that:
   - Deletes messages older than TTL (7 days)
   - Trims per-bot queues to max limit (1000 messages), keeping newest
3. Prometheus metrics for visibility

**Note**: We trim oldest messages rather than suspending bots. This ensures bots continue
working in all channels while capping storage per bot.

## Configuration Defaults
- **TTL**: 7 days (messages older than this are deleted)
- **Max messages per bot**: 1000 (oldest messages trimmed when exceeded)
- **Cleanup interval**: 5 minutes

---

## Implementation Steps

### 1. Database Migration (000008)
**File**: `core/node/storage/app_registry_migrations/000008_add_enqueue_retention.up.sql`

```sql
-- Add created_at to enqueued_messages
ALTER TABLE enqueued_messages ADD COLUMN created_at TIMESTAMP DEFAULT NOW();

-- Index for efficient cleanup queries (by time and by device)
CREATE INDEX enqueued_messages_created_at_idx ON enqueued_messages (created_at);
CREATE INDEX enqueued_messages_device_key_created_at_idx ON enqueued_messages (device_key, created_at);
```

**Down migration**: `000008_add_enqueue_retention.down.sql`
```sql
DROP INDEX IF EXISTS enqueued_messages_device_key_created_at_idx;
DROP INDEX IF EXISTS enqueued_messages_created_at_idx;
ALTER TABLE enqueued_messages DROP COLUMN IF EXISTS created_at;
```

### 2. Configuration
**File**: `core/config/config.go`

Add to `AppRegistryConfig`:
```go
// EnqueuedMessageRetention configures retention for enqueued messages
EnqueuedMessageRetention EnqueuedMessageRetentionConfig
```

New struct:
```go
type EnqueuedMessageRetentionConfig struct {
    // TTL is how long messages are kept before cleanup (default: 7 days)
    TTL time.Duration
    // MaxMessagesPerBot is the max messages kept per bot (default: 1000)
    // Oldest messages are deleted when this limit is exceeded
    MaxMessagesPerBot int
    // CleanupInterval is how often the cleanup job runs (default: 5 minutes)
    CleanupInterval time.Duration
}
```

### 3. Storage Interface Updates
**File**: `core/node/storage/pg_app_registry_store.go`

Add to `AppRegistryStore` interface:
```go
// DeleteExpiredEnqueuedMessages removes messages older than the given threshold
// Returns the number of deleted rows
DeleteExpiredEnqueuedMessages(ctx context.Context, olderThan time.Time) (int64, error)

// TrimEnqueuedMessagesPerBot deletes oldest messages for bots exceeding maxMessages
// Returns the number of deleted rows
TrimEnqueuedMessagesPerBot(ctx context.Context, maxMessages int) (int64, error)

// GetEnqueuedMessagesCount returns the total count of enqueued messages (for metrics)
GetEnqueuedMessagesCount(ctx context.Context) (int64, error)
```

### 4. Storage Implementation
**File**: `core/node/storage/pg_app_registry_store.go`

```go
func (s *PostgresAppRegistryStore) DeleteExpiredEnqueuedMessages(
    ctx context.Context,
    olderThan time.Time,
) (int64, error) {
    result, err := s.pool.Exec(ctx,
        `DELETE FROM enqueued_messages WHERE created_at < $1`,
        olderThan,
    )
    if err != nil {
        return 0, err
    }
    return result.RowsAffected(), nil
}

func (s *PostgresAppRegistryStore) TrimEnqueuedMessagesPerBot(
    ctx context.Context,
    maxMessages int,
) (int64, error) {
    // Delete oldest messages for each device_key that exceeds the limit
    result, err := s.pool.Exec(ctx, `
        DELETE FROM enqueued_messages
        WHERE ctid IN (
            SELECT ctid FROM (
                SELECT ctid,
                       ROW_NUMBER() OVER (PARTITION BY device_key ORDER BY created_at DESC) as rn
                FROM enqueued_messages
            ) ranked
            WHERE rn > $1
        )
    `, maxMessages)
    if err != nil {
        return 0, err
    }
    return result.RowsAffected(), nil
}

func (s *PostgresAppRegistryStore) GetEnqueuedMessagesCount(
    ctx context.Context,
) (int64, error) {
    var count int64
    err := s.pool.QueryRow(ctx, `SELECT COUNT(*) FROM enqueued_messages`).Scan(&count)
    return count, err
}
```

### 5. Background Cleanup Job
**File**: `core/node/app_registry/cleanup.go` (new file)

```go
type EnqueuedMessagesCleaner struct {
    store   storage.AppRegistryStore
    cfg     config.EnqueuedMessageRetentionConfig
    metrics *cleanupMetrics
}

func (c *EnqueuedMessagesCleaner) Run(ctx context.Context) {
    ticker := time.NewTicker(c.cfg.CleanupInterval)
    defer ticker.Stop()

    for {
        select {
        case <-ticker.C:
            c.cleanup(ctx)
        case <-ctx.Done():
            return
        }
    }
}

func (c *EnqueuedMessagesCleaner) cleanup(ctx context.Context) {
    log := logging.FromCtx(ctx)

    // 1. Delete messages older than TTL
    threshold := time.Now().Add(-c.cfg.TTL)
    expiredDeleted, err := c.store.DeleteExpiredEnqueuedMessages(ctx, threshold)
    if err != nil {
        log.Errorw("failed to cleanup expired messages", "error", err)
    } else if expiredDeleted > 0 {
        log.Infow("cleaned up expired enqueued messages", "count", expiredDeleted)
        c.metrics.deletedByTTL.Add(float64(expiredDeleted))
    }

    // 2. Trim per-bot queues exceeding the limit
    trimmed, err := c.store.TrimEnqueuedMessagesPerBot(ctx, c.cfg.MaxMessagesPerBot)
    if err != nil {
        log.Errorw("failed to trim per-bot message queues", "error", err)
    } else if trimmed > 0 {
        log.Infow("trimmed per-bot message queues", "count", trimmed)
        c.metrics.deletedByLimit.Add(float64(trimmed))
    }
}
```

### 6. Metrics
**File**: `core/node/app_registry/cleanup.go`

```go
type cleanupMetrics struct {
    enqueuedMessagesTotal prometheus.GaugeFunc  // Current count in queue
    deletedByTTL          prometheus.Counter    // Messages deleted by TTL
    deletedByLimit        prometheus.Counter    // Messages deleted by per-bot limit
}

func newCleanupMetrics(factory infra.MetricsFactory, store storage.AppRegistryStore) *cleanupMetrics {
    return &cleanupMetrics{
        enqueuedMessagesTotal: factory.NewGaugeFunc(
            prometheus.GaugeOpts{
                Name: "app_registry_enqueued_messages_total",
                Help: "Total number of messages in the enqueued_messages table",
            },
            func() float64 {
                count, _ := store.GetEnqueuedMessagesCount(context.Background())
                return float64(count)
            },
        ),
        deletedByTTL: factory.NewCounterEx(
            "app_registry_enqueued_messages_deleted_by_ttl_total",
            "Total enqueued messages deleted due to TTL expiration",
        ),
        deletedByLimit: factory.NewCounterEx(
            "app_registry_enqueued_messages_deleted_by_limit_total",
            "Total enqueued messages deleted due to per-bot limit",
        ),
    }
}
```

### 7. Service Integration
**File**: `core/node/app_registry/service.go`

Add cleaner to Service struct and start in `Start()`:
```go
type Service struct {
    // ... existing fields
    cleaner *EnqueuedMessagesCleaner
}

func (s *Service) Start(ctx context.Context) {
    // ... existing code

    // Start cleanup job
    go s.cleaner.Run(ctx)
}
```

---

## Files to Modify/Create

| File | Action | Description |
|------|--------|-------------|
| `core/node/storage/app_registry_migrations/000008_add_enqueue_retention.up.sql` | Create | Schema migration |
| `core/node/storage/app_registry_migrations/000008_add_enqueue_retention.down.sql` | Create | Down migration |
| `core/config/config.go` | Modify | Add retention config |
| `core/node/storage/pg_app_registry_store.go` | Modify | Add cleanup methods |
| `core/node/app_registry/cleanup.go` | Create | Background cleanup job + metrics |
| `core/node/app_registry/service.go` | Modify | Integrate cleaner into service startup |
| `core/node/storage/pg_app_registry_store_test.go` | Modify | Add tests for storage methods |
| `core/node/app_registry/cleanup_test.go` | Create | Tests for cleanup logic |

---

## Behavior Summary

1. **Normal operation**: Messages enqueued with `created_at` timestamp
2. **TTL cleanup**: Delete messages older than 7 days
3. **Per-bot trim**: For each bot with > 1000 messages, delete oldest until at 1000
4. **Metrics**: Track queue size and deletion counts (by TTL vs by limit)

---

## Testing Strategy

1. **Unit tests**: Storage methods (delete expired, trim per-bot, count)
2. **Cleanup tests**:
   - TTL-based deletion removes correct messages
   - Per-bot trim keeps newest 1000 per device_key
   - Both cleanups run in sequence
3. **Metrics tests**: Verify gauges and counters work correctly