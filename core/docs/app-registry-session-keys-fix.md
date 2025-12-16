# Fix Duplicate Session Keys on App Registry Service Restart

## Problem Summary

When the app registry service restarts, it re-processes all historical user inbox events and re-inserts session keys into `app_session_keys`. The code at `pg_app_registry_store.go:672` expects a unique constraint to reject duplicates (there's error handling for `UniqueViolation`), but **no such constraint exists on the table**.

This causes:
1. Duplicate rows accumulating in `app_session_keys` on every restart
2. Log spam ("Publishing session keys for bot") on startup - the log at `tracked_stream.go:42-48` fires for every historical event reprocessed, regardless of whether it's a duplicate

## Root Cause Analysis

1. **Missing Unique Constraint**: The `app_session_keys` table (`000001_create_initial_schema.up.sql:19-27`) has no `UNIQUE` constraint on `(device_key, stream_id)`. There's only:
   - A foreign key constraint on `device_key`
   - CHECK constraints for session_ids array
   - Indexes (including `idx_app_session_keys_device_stream` added in migration 000006)

2. **No Sync Cookie Persistence for User Inbox Streams**: The `shouldPersistCookie` method in `tracked_stream.go:176-209` explicitly returns `false` for non-channel streams, meaning user inbox stream positions are never saved, causing full reprocessing on restart.

3. **Code Expects Constraint**: `pg_app_registry_store.go:672` has `isPgError(err, pgerrcode.UniqueViolation)` handling that would return `Err_ALREADY_EXISTS`, but this never triggers because there's no constraint.

4. **Verbose Logging**: The `log.Infow("Publishing session keys for bot", ...)` at `tracked_stream.go:42` logs before attempting to publish, so it fires for every event regardless of whether the publish succeeds or is a duplicate.

## Solution

Implement both fixes:

### Part 1: Add Unique Constraint via Migration

Create migration `000008_add_unique_device_stream_constraint`:

**Up migration:**
1. Delete duplicate rows, keeping the first occurrence (by ctid)
2. Add `UNIQUE` constraint on `(device_key, stream_id)`

**Down migration:**
1. Drop the unique constraint

### Part 2: Persist Sync Cookies for User Inbox Streams

Modify `shouldPersistCookie` in `tracked_stream.go` to also persist cookies for user inbox streams (not just channel streams with bots).

### Part 3: Fix Log Spam by Moving Log Inside PublishSessionKeys

Move the "Publishing session keys for bot" log from `tracked_stream.go:42-48` into `CachedEncryptedMessageQueue.PublishSessionKeys` (`cached_encrypted_message_queue.go`), after we know the result of the publish attempt. This way we can log:
- If keys were newly published (success)
- If keys were skipped because they already exist (after adding the unique constraint)
- Already logs if messages were dequeued (`cached_encrypted_message_queue.go:203-210`)

## Files Modified

1. **New file**: `core/node/storage/app_registry_migrations/000008_add_unique_device_stream_constraint.up.sql`
2. **New file**: `core/node/storage/app_registry_migrations/000008_add_unique_device_stream_constraint.down.sql`
3. **Modify**: `core/node/app_registry/sync/tracked_stream.go` - Update `shouldPersistCookie`, remove the pre-publish log
4. **Modify**: `core/node/app_registry/cached_encrypted_message_queue.go` - Add log after publish with result

## Implementation Details

### Migration 000008 (up.sql)

```sql
-- Delete duplicate rows, keeping the first occurrence
DELETE FROM app_session_keys a
USING app_session_keys b
WHERE a.device_key = b.device_key
  AND a.stream_id = b.stream_id
  AND a.ctid > b.ctid;

-- Add unique constraint on (device_key, stream_id)
ALTER TABLE app_session_keys
ADD CONSTRAINT unique_device_key_stream_id UNIQUE (device_key, stream_id);
```

### Migration 000008 (down.sql)

```sql
ALTER TABLE app_session_keys
DROP CONSTRAINT unique_device_key_stream_id;
```

### tracked_stream.go Change

Update `shouldPersistCookie` to persist cookies for user inbox streams:

```go
func (b *AppRegistryTrackedStreamView) shouldPersistCookie(ctx context.Context, view *StreamView) bool {
    streamId := view.StreamId()

    // Persist cookies for user inbox streams to avoid reprocessing
    // session keys on service restart
    if streamId.Type() == shared.STREAM_USER_INBOX_BIN {
        return true
    }

    // Only persist cookies for channel streams with bot members
    if streamId.Type() != shared.STREAM_CHANNEL_BIN {
        return false
    }
    // ... rest of existing logic for channels
}
```

## Testing

1. Verify migration runs successfully on a database with existing duplicates
2. Verify unique constraint prevents duplicate inserts
3. Verify service restart no longer reprocesses historical user inbox events
4. Verify `Err_ALREADY_EXISTS` is properly returned when attempting duplicate insert (if edge case)
