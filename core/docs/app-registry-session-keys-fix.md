# Fix Duplicate Session Keys on App Registry Service Restart

## Problem Summary

When the app registry service restarts, it re-processes all historical user inbox events and re-inserts session keys into `app_session_keys`. The code at `pg_app_registry_store.go:672` expects a unique constraint to reject duplicates (there's error handling for `UniqueViolation`), but **no such constraint exists on the table**.

This causes:
1. Duplicate rows accumulating in `app_session_keys` on every restart
2. Log spam ("Publishing session keys for bot") on startup - the log at `tracked_stream.go:42-48` fires for every historical event reprocessed, regardless of whether it's a duplicate

## Root Cause Analysis

1. **Missing Unique Constraint**: The `app_session_keys` table (`000001_create_initial_schema.up.sql:19-27`) has no `UNIQUE` constraint. There's only:
   - A foreign key constraint on `device_key`
   - CHECK constraints for session_ids array
   - Indexes (including `idx_app_session_keys_device_stream` added in migration 000006)

2. **Code Expects Constraint**: `pg_app_registry_store.go:672` has `isPgError(err, pgerrcode.UniqueViolation)` handling that would return `Err_ALREADY_EXISTS`, but this never triggers because there's no constraint.

3. **Verbose Logging**: The `log.Infow("Publishing session keys for bot", ...)` at `tracked_stream.go:42` logs before attempting to publish, so it fires for every event regardless of whether the publish succeeds or is a duplicate.

**Note**: Cookie persistence for user inbox streams was already implemented separately.

## Why the Unique Constraint Needs All Three Columns

A simple `UNIQUE(device_key, stream_id)` constraint would be **incorrect** because:

1. **Multiple events can legitimately exist** for the same `(device_key, stream_id)` with different `session_ids` arrays
2. Example: Event1 has `[S1, S2, S3]`, Event2 has `[S3, S4, S5]`
   - Both events are needed: Event1's envelope decrypts S1/S2, Event2's envelope decrypts S4/S5
3. The duplicate problem is when the **exact same event** (same session_ids array) is reprocessed

Additionally, different clients may send the same session_ids in different order (e.g., `[S1, S2, S3]` vs `[S3, S1, S2]`). PostgreSQL compares arrays element-by-element, so `['S1','S2','S3'] != ['S3','S1','S2']`. We solve this by using a **database trigger** to automatically sort arrays before insert.

## Solution

### Part 1: Add Database Trigger and Unique Constraint via Migration

Create migration `000009_add_unique_session_keys_constraint`:

**Up migration:**
1. Create a function to sort session_ids arrays
2. Create a BEFORE INSERT trigger that auto-sorts session_ids
3. Sort existing session_ids arrays (one-time update)
4. Delete duplicate rows, keeping the first occurrence
5. Add `UNIQUE` constraint on `(device_key, stream_id, session_ids)`

**Down migration:**
1. Drop the unique constraint
2. Drop the trigger
3. Drop the function

### Part 2: Fix Log Spam by Moving Log Inside PublishSessionKeys

Move the "Publishing session keys for bot" log from `tracked_stream.go:42-48` into `CachedEncryptedMessageQueue.PublishSessionKeys` (`cached_encrypted_message_queue.go`), after we know the result of the publish attempt.

## Files Modified

1. **New file**: `core/node/storage/app_registry_migrations/000009_add_unique_session_keys_constraint.up.sql`
2. **New file**: `core/node/storage/app_registry_migrations/000009_add_unique_session_keys_constraint.down.sql`
3. **Modify**: `core/node/app_registry/sync/tracked_stream.go` - Remove the pre-publish log at lines 42-48
4. **Modify**: `core/node/app_registry/cached_encrypted_message_queue.go` - Add log after publish with result

**Note**: No changes needed to `pg_app_registry_store.go` - the database trigger handles sorting automatically.

## Implementation Details

### Migration 000009 (up.sql)

```sql
-- Step 1: Create helper function to sort a VARCHAR array
CREATE OR REPLACE FUNCTION sort_varchar_array(arr VARCHAR[]) RETURNS VARCHAR[] AS $$
BEGIN
    -- unnest expands array into rows, ORDER BY sorts them, ARRAY collects back
    -- Example: ['S3','S1','S2'] -> rows S3,S1,S2 -> sorted S1,S2,S3 -> ['S1','S2','S3']
    RETURN ARRAY(SELECT unnest(arr) ORDER BY 1);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Step 2: Create trigger function that uses the helper
CREATE OR REPLACE FUNCTION sort_session_ids_trigger() RETURNS TRIGGER AS $$
BEGIN
    NEW.session_ids := sort_varchar_array(NEW.session_ids);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Create trigger to auto-sort session_ids before insert
CREATE TRIGGER trigger_sort_session_ids
BEFORE INSERT ON app_session_keys
FOR EACH ROW EXECUTE FUNCTION sort_session_ids_trigger();

-- Step 4: Sort existing session_ids arrays (one-time migration)
UPDATE app_session_keys
SET session_ids = sort_varchar_array(session_ids);

-- Step 5: Delete duplicate rows (same device_key, stream_id, session_ids), keeping first by ctid
DELETE FROM app_session_keys a
USING app_session_keys b
WHERE a.device_key = b.device_key
  AND a.stream_id = b.stream_id
  AND a.session_ids = b.session_ids
  AND a.ctid > b.ctid;

-- Step 6: Add unique constraint on (device_key, stream_id, session_ids)
ALTER TABLE app_session_keys
ADD CONSTRAINT unique_device_stream_session_ids UNIQUE (device_key, stream_id, session_ids);
```

### Migration 000009 (down.sql)

```sql
ALTER TABLE app_session_keys
DROP CONSTRAINT IF EXISTS unique_device_stream_session_ids;

DROP TRIGGER IF EXISTS trigger_sort_session_ids ON app_session_keys;

DROP FUNCTION IF EXISTS sort_session_ids_trigger();

DROP FUNCTION IF EXISTS sort_varchar_array(VARCHAR[]);
```

### tracked_stream.go Change

Remove the log at lines 42-48:

```go
// REMOVE this block:
log.Infow(
    "Publishing session keys for bot",
    "streamId", streamId,
    "deviceKey", deviceKey,
    "sessionIdCount", len(sessionIds),
    "sessionIds", sessionIds,
)
```

### cached_encrypted_message_queue.go Change

Add logging after the publish attempt in `PublishSessionKeys`:

```go
func (c *CachedEncryptedMessageQueue) PublishSessionKeys(...) error {
    messages, err := c.store.PublishSessionKeys(ctx, streamId, deviceKey, sessionIds, encryptionEnvelope)
    if err != nil {
        if base.IsRiverErrorCode(err, protocol.Err_ALREADY_EXISTS) {
            log.Debugw("Session keys already exist, skipping",
                "streamId", streamId,
                "deviceKey", deviceKey,
                "sessionIdCount", len(sessionIds),
            )
            return nil  // Not an error - just a duplicate
        }
        return err
    }

    log.Infow("Published session keys for bot",
        "streamId", streamId,
        "deviceKey", deviceKey,
        "sessionIdCount", len(sessionIds),
        "dequeuedMessages", len(messages.MessageEnvelopes),
    )
    // ... rest of function (forward messages if any)
}
```

## Testing

1. Verify migration runs successfully on a database with existing duplicates
2. Verify trigger auto-sorts: insert `[S3, S1, S2]`, verify stored as `[S1, S2, S3]`
3. Verify duplicate detection: insert `[S3, S1, S2]` then `[S1, S2, S3]` - second should fail with UniqueViolation
4. Verify different session_ids arrays are allowed: `[S1, S2]` and `[S2, S3]` should both be stored
5. Verify `Err_ALREADY_EXISTS` is properly returned and handled (log at debug level, not error)
