# Enqueued Messages Retention & Quota Implementation Plan

## Problem
The `enqueued_messages` table grows unbounded when bots stay offline or never publish session keys. There is no TTL or quota mechanism.

## Solution Overview
1. Add `created_at` timestamp to track message age
2. Add per-bot message count tracking
3. Implement "suspended" state for bots exceeding limits
4. Background cleanup job for expired messages
5. Wake-up mechanism when bot calls `RegisterWebhook` (startup)
6. Prometheus metrics for visibility

## Configuration Defaults
- **TTL**: 7 days (messages older than this are deleted)
- **Per-bot limit**: 1000 messages
- **Cleanup interval**: 5 minutes

---

## Implementation Steps

### 1. Database Migration (000008)
**File**: `core/node/storage/app_registry_migrations/000008_add_enqueue_retention.up.sql`

```sql
-- Add created_at to enqueued_messages
ALTER TABLE enqueued_messages ADD COLUMN created_at TIMESTAMP DEFAULT NOW();

-- Add suspended flag to app_registry table
ALTER TABLE app_registry ADD COLUMN suspended BOOLEAN DEFAULT FALSE;

-- Index for efficient cleanup queries
CREATE INDEX enqueued_messages_created_at_idx ON enqueued_messages (created_at);

-- Index for counting messages per device
CREATE INDEX enqueued_messages_device_key_idx ON enqueued_messages (device_key);
```

**Down migration**: `000008_add_enqueue_retention.down.sql`
```sql
DROP INDEX IF EXISTS enqueued_messages_device_key_idx;
DROP INDEX IF EXISTS enqueued_messages_created_at_idx;
ALTER TABLE app_registry DROP COLUMN IF EXISTS suspended;
ALTER TABLE enqueued_messages DROP COLUMN IF EXISTS created_at;
```

### 2. Configuration
**File**: `core/config/config.go`

Add to `AppRegistryConfig`:
```go
// EnqueuedMessageRetention configures retention limits for enqueued messages
EnqueuedMessageRetention EnqueuedMessageRetentionConfig
```

New struct:
```go
type EnqueuedMessageRetentionConfig struct {
    // TTL is how long messages are kept before cleanup (default: 7 days)
    TTL time.Duration
    // MaxMessagesPerBot is the per-bot message limit (default: 1000)
    MaxMessagesPerBot int
    // CleanupInterval is how often the cleanup job runs (default: 5 minutes)
    CleanupInterval time.Duration
}
```

### 3. Storage Interface Updates
**File**: `core/node/storage/pg_app_registry_store.go`

Add to `AppRegistryStore` interface:
```go
// GetEnqueuedMessageCount returns the count of enqueued messages for a device
GetEnqueuedMessageCount(ctx context.Context, deviceKey string) (int, error)

// DeleteExpiredEnqueuedMessages removes messages older than the given threshold
DeleteExpiredEnqueuedMessages(ctx context.Context, olderThan time.Time) (int64, error)

// SetAppSuspended marks an app as suspended (stops new message enqueueing)
SetAppSuspended(ctx context.Context, app common.Address, suspended bool) error

// IsAppSuspended checks if an app is suspended
IsAppSuspended(ctx context.Context, app common.Address) (bool, error)

// GetSuspendedAppsWithCounts returns suspended apps with their message counts
GetSuspendedAppsWithCounts(ctx context.Context) ([]SuspendedAppInfo, error)
```

New type:
```go
type SuspendedAppInfo struct {
    App          common.Address
    DeviceKey    string
    MessageCount int
}
```

### 4. Modify EnqueueUnsendableMessages
**File**: `core/node/storage/pg_app_registry_store.go`

Update `EnqueueUnsendableMessages` to:
1. Check if app is suspended - if so, skip enqueueing and return in `unsendableApps` with a flag
2. Check message count before enqueueing
3. If count >= limit: mark app as suspended, don't enqueue
4. Log warning when suspending

### 5. Background Cleanup Job
**File**: `core/node/app_registry/cleanup.go` (new file)

```go
type EnqueuedMessagesCleaner struct {
    store           storage.AppRegistryStore
    cfg             config.EnqueuedMessageRetentionConfig
    metrics         *cleanupMetrics
    stop            chan struct{}
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
        case <-c.stop:
            return
        }
    }
}

func (c *EnqueuedMessagesCleaner) cleanup(ctx context.Context) {
    threshold := time.Now().Add(-c.cfg.TTL)
    deleted, err := c.store.DeleteExpiredEnqueuedMessages(ctx, threshold)
    if err != nil {
        log.Errorw("failed to cleanup expired messages", "error", err)
        return
    }
    if deleted > 0 {
        log.Infow("cleaned up expired enqueued messages", "count", deleted)
        c.metrics.deletedMessages.Add(float64(deleted))
    }
}
```

### 6. Wake-up Mechanism
**File**: `core/node/app_registry/service.go`

In `RegisterWebhook` (called on bot startup):
```go
// Unsuspend the app if it was suspended
if err := s.store.SetAppSuspended(ctx, app, false); err != nil {
    log.Warnw("failed to unsuspend app", "app", app, "error", err)
}
```

This allows bots to "wake up" by re-registering their webhook.

### 7. Metrics
**File**: `core/node/app_registry/cleanup.go`

```go
type cleanupMetrics struct {
    enqueuedMessagesTotal   prometheus.GaugeFunc  // Current count
    deletedMessages         prometheus.Counter    // Messages deleted by TTL
    suspendedApps          prometheus.GaugeFunc  // Currently suspended apps
    suspensionEvents       prometheus.Counter    // Times apps were suspended
}
```

### 8. Service Integration
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
| `core/node/storage/pg_app_registry_store.go` | Modify | Add interface methods & implementations |
| `core/node/app_registry/cleanup.go` | Create | Background cleanup job |
| `core/node/app_registry/service.go` | Modify | Integrate cleaner, add wake-up in RegisterWebhook |
| `core/node/storage/pg_app_registry_store_test.go` | Modify | Add tests for new storage methods |
| `core/node/app_registry/cleanup_test.go` | Create | Tests for cleanup logic |

---

## Behavior Summary

1. **Normal operation**: Messages enqueued with `created_at` timestamp
2. **Per-bot limit exceeded**: App marked as `suspended=true`, new messages rejected
3. **TTL exceeded**: Background job deletes old messages every 5 min
4. **Bot restart**: `RegisterWebhook` sets `suspended=false`, bot resumes receiving
5. **Metrics**: Track queue size, suspensions, and deletions for alerting

---

## Testing Strategy

1. **Unit tests**: Storage methods (count, delete, suspend)
2. **Integration tests**: Full flow from enqueue to suspension to wake-up
3. **Cleanup tests**: TTL-based deletion, verify correct messages removed