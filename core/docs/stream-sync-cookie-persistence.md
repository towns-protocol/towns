# Stream Sync Cookie Persistence Plan

This document describes the implementation plan for reliable stream sync resumption in the app registry and notification services, ensuring no events are lost between service restarts.

## Problem Statement

Currently, when the app registry or notification service restarts:
1. It starts syncing streams from scratch (no cookie)
2. The server returns a reset response starting from the **last snapshot**
3. Events between the last processed position and the new snapshot are **lost**

This is problematic for bots that need to receive all messages in channels they're members of.

## Proposed Solution

Persist both the snapshot position and the minipool generation. On restart, detect gaps and fetch missing miniblocks via `GetMiniblocks` RPC.

---

## Data Model

### Persisted Sync State

```go
type PersistedSyncState struct {
    StreamID          StreamId
    SnapshotMiniblock int64   // Miniblock number where last snapshot was created
    MinipoolGen       int64   // Next miniblock number to be created (last processed + 1)
    PrevMiniblockHash []byte  // Hash of the last miniblock (for validation)
    UpdatedAt         time.Time
}
```

This replaces the existing `SyncCookie` persistence - we store everything needed in one structure.

### Database Schema

```sql
CREATE TABLE stream_sync_state (
    stream_id          BYTEA PRIMARY KEY,
    snapshot_miniblock BIGINT NOT NULL,
    minipool_gen       BIGINT NOT NULL,
    prev_miniblock_hash BYTEA,
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## Algorithm

### During Normal Sync

```
ON new miniblock (no snapshot):
    UPDATE stream_sync_state SET
        minipool_gen = NextSyncCookie.MinipoolGen,
        updated_at = NOW()
    WHERE stream_id = ?

ON new miniblock WITH snapshot:
    UPDATE stream_sync_state SET
        snapshot_miniblock = <new snapshot miniblock number>,
        minipool_gen = NextSyncCookie.MinipoolGen,
        updated_at = NOW()
    WHERE stream_id = ?
```

### On Service Restart

```
1. Load persisted state for stream
   - persisted.snapshotMiniblock
   - persisted.minipoolGen

2. Call GetStream(streamId, cookie=nil)
   - Returns: Snapshot, Miniblocks[], Events[], NextSyncCookie
   - Note: First miniblock in response corresponds to snapshot position

3. Determine server's snapshot position:
   serverSnapshotMiniblock = Miniblocks[0].Header.MiniblockNum

4. Compare positions:

   IF persisted.snapshotMiniblock == serverSnapshotMiniblock:
       // CASE A: Same snapshot, just need to catch up on miniblocks
       - Skip miniblocks where MiniblockNum < persisted.minipoolGen
       - Process remaining miniblocks (notify events)
       - Process minipool events
       - Continue normal sync

   ELSE IF persisted.minipoolGen <= serverSnapshotMiniblock:
       // CASE B: Gap exists - we missed miniblocks before new snapshot
       // Member state: built from sync response (snapshot + miniblocks + events) - always current
       // Event notifications: need gap miniblocks so bots don't miss messages
       - Initialize stream view from sync response (members come from snapshot + all subsequent join/leave events)
       - Call GetMiniblocks(streamId, persisted.minipoolGen, serverSnapshotMiniblock)
       - Notify events from fetched gap miniblocks (for bot message forwarding)
       - Notify events from sync response miniblocks (for bot message forwarding)
       - Notify minipool events
       - Continue normal sync

   ELSE:
       // CASE C: Server snapshot is older (shouldn't happen normally)
       // This could occur if server was restored from backup
       - Log warning
       - Process sync response normally from snapshot
       - Accept potential duplicate notifications
```

---

## Implementation Steps (One at a Time)

### Step 1: Add `snapshot_miniblock` Column to Existing Store

**File: `core/node/track_streams/pg_stream_cookie_store.go`**

Add `snapshot_miniblock` column to the existing implementation without changing the interface yet.

Changes:
- Update `GetSyncCookie` to also return `snapshotMiniblock`
- Update `PersistSyncCookie` to accept and store `snapshotMiniblock`
- Update SQL queries to include the new column

```sql
-- Migration: Add column to existing table
ALTER TABLE stream_sync_cookies
ADD COLUMN IF NOT EXISTS snapshot_miniblock BIGINT NOT NULL DEFAULT 0;
```

---

### Step 2: Add Helper to Extract Snapshot Miniblock Number

**File: `core/node/track_streams/sync_helpers.go`** (new file)

```go
func GetSnapshotMiniblockNum(miniblocks []*Miniblock) (int64, error) {
    if len(miniblocks) == 0 {
        return 0, errors.New("no miniblocks in response")
    }
    mbInfo, err := NewMiniblockInfoFromProto(miniblocks[0], nil, nil)
    if err != nil {
        return 0, err
    }
    return mbInfo.Ref.Num, nil
}
```

---

### Step 3: Update `streamSyncInitRecord` to Hold Persisted State

**File: `core/node/track_streams/multi_sync_runner.go`**

Add field to store the persisted snapshot miniblock for gap detection:

```go
type streamSyncInitRecord struct {
    // ... existing fields ...
    persistedSnapshotMiniblock int64  // For gap detection on restart
}
```

---

### Step 4: Update `AddStream` to Load and Store Persisted State

**File: `core/node/track_streams/multi_sync_runner.go`**

When adding a stream:
1. Load persisted state (including `snapshotMiniblock`)
2. Store `persistedSnapshotMiniblock` in the record
3. Always start sync with `cookie=nil` (fresh sync, not resume)

---

### Step 5: Track Persisted State in Memory to Avoid Redundant DB Writes

**File: `core/node/track_streams/multi_sync_runner.go`**

Add fields to track what we've already persisted:

```go
type streamSyncInitRecord struct {
    // ... existing fields ...
    persistedSnapshotMiniblock int64  // Last persisted snapshot (for gap detection on restart)
    persistedMinipoolGen       int64  // Last persisted minipoolGen (to avoid redundant writes)
}
```

Persistence logic:
- On each update, check if `NextSyncCookie.MinipoolGen != persistedMinipoolGen`
- If same, skip persistence (no new miniblock was created)
- If different (new miniblock):
  - If update has snapshot: persist both `snapshotMiniblock` (from miniblock header) and `minipoolGen`
  - If no snapshot: persist `minipoolGen` only, keep `snapshotMiniblock` unchanged
  - Update `persistedMinipoolGen` (and `persistedSnapshotMiniblock` if changed) after successful persist

---

### Step 6: Add Gap Detection in `applyUpdateToStream`

**File: `core/node/track_streams/multi_sync_runner.go`**

On first reset response (when `record.trackedView == nil`):

```go
if record.persistedSnapshotMiniblock > 0 {
    serverSnapshotMb := GetSnapshotMiniblockNum(streamAndCookie.Miniblocks)

    if record.persistedSnapshotMiniblock == serverSnapshotMb {
        // CASE A: Same snapshot - skip already-processed miniblocks
    } else if record.minipoolGen <= serverSnapshotMb {
        // CASE B: Gap detected - need to fetch missing miniblocks
    } else {
        // CASE C: Server snapshot older - log warning, continue normally
    }
}
```

---

### Step 7: Add Miniblock Fetcher

**File: `core/node/track_streams/miniblock_fetcher.go`** (new file)

```go
func FetchMiniblocks(
    ctx context.Context,
    client StreamServiceClient,
    streamID StreamId,
    fromInclusive int64,
    toExclusive int64,
) ([]*Miniblock, error)
```

Use existing `GetMiniblocks` RPC to fetch the gap.

---

### Step 8: Add Method to Notify Events from Gap Miniblocks

**File: `core/node/track_streams/multi_sync_runner.go`**

Add helper method in `syncSessionRunner` or as a standalone function:

```go
func (ssr *syncSessionRunner) notifyEventsFromMiniblocks(
    ctx context.Context,
    trackedView TrackedStreamView,
    miniblocks []*Miniblock,
) error
```

Called from `applyUpdateToStream` when gap is detected. Parse each miniblock, extract events, call `SendEventNotification` for each.

---

### Step 9: Wire Up Gap Recovery in `applyUpdateToStream`

**File: `core/node/track_streams/multi_sync_runner.go`**

When gap is detected:
1. Initialize stream view from sync response (for current member state)
2. Fetch gap miniblocks
3. Notify events from gap miniblocks
4. Notify events from sync response miniblocks
5. Continue normal processing

---

### Step 10: Add Tests

1. Unit test for `GetSnapshotMiniblockNum`
2. Unit test for gap detection logic
3. Integration test for restart with same snapshot (CASE A)
4. Integration test for restart with gap (CASE B)

---

## Flow Diagrams

### Normal Sync Update (No Restart)

```
Event arrives
     │
     ▼
┌─────────────────────────────────────┐
│ Is this a new miniblock?            │
└─────────────────────────────────────┘
     │                    │
    Yes                   No (just event)
     │                    │
     ▼                    ▼
┌─────────────┐    ┌─────────────────┐
│ Has snapshot?│    │ Process event   │
└─────────────┘    │ (no persistence)│
     │      │      └─────────────────┘
    Yes     No
     │      │
     ▼      ▼
┌─────────────────────────────────────┐
│ Persist:                            │
│ - snapshotMiniblock (if new)        │
│ - minipoolGen                       │
└─────────────────────────────────────┘
```

### Service Restart Flow

```
Load persisted state
         │
         ▼
GetStream(cookie=nil)
         │
         ▼
┌─────────────────────────────────────────────────┐
│ server.snapshotMiniblock == persisted?          │
└─────────────────────────────────────────────────┘
         │                          │
        Yes                         No
         │                          │
         ▼                          ▼
┌─────────────────┐    ┌─────────────────────────┐
│ Skip miniblocks │    │ Gap detected!           │
│ < minipoolGen   │    │                         │
│ Process rest    │    │ GetMiniblocks(          │
└─────────────────┘    │   persisted.minipoolGen,│
                       │   server.snapshotMb)    │
                       │                         │
                       │ Process gap miniblocks  │
                       │ Then process sync resp  │
                       └─────────────────────────┘
                                    │
                                    ▼
                       ┌─────────────────────────┐
                       │ Continue normal sync    │
                       └─────────────────────────┘
```

---

## Edge Cases

### 1. First Time Syncing a Stream
- No persisted state exists
- Process entire sync response normally
- Persist initial state after first miniblock

### 2. Stream Was Deleted and Recreated
- Persisted minipoolGen might be higher than any existing miniblock
- Detect this case (GetMiniblocks returns error or empty)
- Reset persisted state and start fresh

### 3. Very Large Gap
- Gap could span thousands of miniblocks
- Implement pagination in `GetMiniblocks` calls
- Consider rate limiting to avoid overwhelming the node

### 4. Node Returns Different Snapshot Than Expected
- Multiple snapshots could have been created since last sync
- Gap detection still works: fetch from persisted.minipoolGen to server.snapshotMiniblock

### 5. Service Crashes During Gap Recovery
- Gap recovery should be idempotent
- If we crash while processing gap miniblocks, restart will detect same gap
- Events might be re-notified (bots should handle duplicates)

---

## Testing Strategy

### Unit Tests

1. **Gap detection logic**
   - Same snapshot position
   - Gap exists (minipoolGen < serverSnapshot)
   - Edge cases (first sync, very old state)

2. **Persistence layer**
   - Save and load sync state
   - Update snapshot vs minipool separately

### Integration Tests

1. **Restart with no gap**
   - Sync stream, persist state
   - Restart, verify no GetMiniblocks call
   - Verify events processed correctly

2. **Restart with gap**
   - Sync stream, persist state
   - Add many events to trigger new snapshot
   - Restart, verify GetMiniblocks called
   - Verify gap events notified

3. **Large gap handling**
   - Create gap spanning many miniblocks
   - Verify pagination works
   - Verify all events notified

---

## Migration Plan

No backward compatibility required. Simply:

1. Replace `SyncCookieStore` with `SyncStateStore`
2. Update all callers in `multi_sync_runner.go`
3. Update notification service if needed (should be minimal since it uses the same `track_streams` package)
4. Deploy - existing persisted cookies will be ignored, streams will start fresh sync on first restart

---

## Open Questions

1. **Should we store the full snapshot or just the miniblock number?**
   - Current plan: just miniblock number (simpler, less storage)
   - Alternative: store snapshot hash for validation

2. **How to handle GetMiniblocks failures?**
   - Retry with backoff?
   - Fall back to fresh sync (accept event loss)?

3. **Should bots be notified that events are "historical" vs "real-time"?**
   - Could add flag to distinguish catch-up events
   - Bots might want to handle differently (e.g., no push notifications)

---

## Related Files

- `core/node/track_streams/multi_sync_runner.go` - Main sync orchestration
- `core/node/track_streams/pg_stream_cookie_store.go` - Cookie persistence
- `core/node/events/tracked_stream_view.go` - Event processing
- `core/node/events/stream_view.go` - GetStreamSince, GetMiniblocks logic
- `core/node/rpc/get_stream.go` - GetStream RPC handler