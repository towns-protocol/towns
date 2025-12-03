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

## Implementation Steps

### Phase 1: Storage Layer Changes

**File: `core/node/track_streams/pg_stream_cookie_store.go`**

Replace the existing `SyncCookieStore` interface with a new `SyncStateStore`:

```go
type SyncStateStore interface {
    GetSyncState(ctx context.Context, streamID StreamId) (*PersistedSyncState, error)
    PersistSyncState(ctx context.Context, state *PersistedSyncState) error
    DeleteSyncState(ctx context.Context, streamID StreamId) error
    GetAllSyncStates(ctx context.Context) (map[StreamId]*PersistedSyncState, error)
}
```

1. Create new database migration to add `snapshot_miniblock` column to existing table (or create new table)
2. Implement the new interface in `PostgresSyncStateStore`
3. Remove old `SyncCookieStore` interface and implementation

### Phase 2: Multi-Sync Runner Changes

**File: `core/node/track_streams/multi_sync_runner.go`**

1. Modify `AddStream` to:
   - Load persisted sync state (not just cookie)
   - Always start with `cookie=nil` (fresh sync)
   - Pass persisted state to the stream record for gap detection

2. Modify `applyUpdateToStream` to:
   - On first reset response, detect gaps using persisted state
   - Fetch missing miniblocks if needed via `GetMiniblocks` RPC
   - Process missing miniblocks before processing sync response

3. Modify cookie persistence logic to:
   - Track snapshot position from `StreamAndCookie.Snapshot`
   - Update `snapshotMiniblock` when new snapshot is received
   - Update `minipoolGen` on every miniblock

### Phase 3: Gap Detection and Recovery

**New file: `core/node/track_streams/sync_gap_recovery.go`**

```go
type SyncGapRecovery struct {
    nodeRegistry nodes.NodeRegistry
    // ...
}

// DetectGap compares persisted state with sync response
func (r *SyncGapRecovery) DetectGap(
    persisted *PersistedSyncState,
    syncResponse *StreamAndCookie,
) (hasGap bool, gapStart int64, gapEnd int64)

// FetchMissingMiniblocks retrieves miniblocks to fill the gap
func (r *SyncGapRecovery) FetchMissingMiniblocks(
    ctx context.Context,
    streamID StreamId,
    fromInclusive int64,
    toExclusive int64,
) ([]*Miniblock, error)
```

### Phase 4: TrackedStreamView Changes

**File: `core/node/events/tracked_stream_view.go`**

1. Add method to process historical miniblocks with notifications:

```go
// ProcessHistoricalMiniblocks processes miniblocks fetched to fill a gap
// Unlike ApplyBlock, this DOES send notifications for events
func (ts *TrackedStreamViewImpl) ProcessHistoricalMiniblocks(
    ctx context.Context,
    miniblocks []*Miniblock,
) error
```

2. Ensure proper deduplication to avoid double-notifying events

### Phase 5: Snapshot Position Tracking

**Changes needed to extract snapshot miniblock number:**

The snapshot miniblock number is in the first miniblock's header. The `Miniblock.Header` field is an `Envelope` that needs to be parsed to extract the `MiniblockHeader`:

```go
func GetSnapshotMiniblockNum(syncResponse *StreamAndCookie) (int64, error) {
    if len(syncResponse.Miniblocks) == 0 {
        return 0, errors.New("no miniblocks in response")
    }

    // Parse the header envelope to get MiniblockHeader
    headerEnvelope := syncResponse.Miniblocks[0].Header
    parsedEvent, err := ParseEvent(headerEnvelope)
    if err != nil {
        return 0, err
    }

    miniblockHeader := parsedEvent.Event.GetMiniblockHeader()
    if miniblockHeader == nil {
        return 0, errors.New("header is not a MiniblockHeader")
    }

    return miniblockHeader.MiniblockNum, nil
}
```

Alternatively, if using `MiniblockInfo` (which already parses this):
```go
mbInfo, err := NewMiniblockInfoFromProto(syncResponse.Miniblocks[0], syncResponse.Snapshot, nil)
snapshotMiniblockNum := mbInfo.Ref.Num
```

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