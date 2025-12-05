# Stream Sync Cookie Persistence

This document describes how stream sync resumption works in the app registry and notification services, ensuring no events are lost between service restarts.

## Problem Statement

When the app registry or notification service restarts:
1. It starts syncing streams from scratch (requesting a reset)
2. The server returns a reset response starting from the **last snapshot**
3. The service starts handling events from the minipool, skipping all miniblocks (assuming they are already processed)
3. Events between the last processed miniblock and the current last miniblock are **not handled**

This is problematic for bots that need to receive all messages in channels they're members of.

## Solution

Persist the last `minipoolGen` (last processed miniblock + 1). On restart, always request a fresh sync (which triggers a reset), then detect gaps by comparing the persisted position with the server's snapshot position. If there's a gap, fetch missing miniblocks via `GetMiniblocks` RPC.
Send notifications for all events from the persisted minipoolGen to the last miniblock + all events in the minipool.

---

## Data Model

### Persisted State

We persist only the `SyncCookie` which contains:
- `MinipoolGen` - Next miniblock number (last processed + 1)
- `PrevMiniblockHash` - Hash of the last miniblock
- `StreamId` - Stream identifier

### Database Schema

```sql
CREATE TABLE stream_sync_cookies (
    stream_id           BYTEA PRIMARY KEY,
    minipool_gen        BIGINT NOT NULL,
    prev_miniblock_hash BYTEA,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## Algorithm

### Gap Detection (Key Insight)

On restart, we always request a fresh sync (minipoolGen=MaxInt64) which forces a reset response. The reset response includes miniblocks starting from the server's current snapshot.

**Gap detection is simple:**
- If `persistedMinipoolGen <= serverSnapshotMb`: Gap exists, fetch missing miniblocks
- If `persistedMinipoolGen > serverSnapshotMb`: No gap, our position is after the snapshot

### During Normal Sync

```
ON each sync update with new miniblock (minipoolGen changed):
    IF trackedView.ShouldPersistCookie():
        PersistSyncCookie(streamId, NextSyncCookie)
```

Cookie persistence only happens when:
1. A cookie store is configured
2. The tracked view says we should persist for this stream (in case of the registry service, only streams with bots intalled in them are persisted)
3. The minipoolGen has changed (new miniblock was created)

### On Service Restart

```
1. Load persisted cookie for stream
   - persistedMinipoolGen = cookie.MinipoolGen

2. Add stream to sync with minipoolGen=MaxInt64 (forces reset)

3. On first reset response:
   - serverSnapshotMb = first miniblock number in response

4. Gap detection:

   IF persistedMinipoolGen <= serverSnapshotMb:
       // Gap exists - we missed miniblocks before new snapshot
       - Call GetMiniblocks(streamId, persistedMinipoolGen, serverSnapshotMb)
       - Notify events from fetched gap miniblocks
       - Then notify events from sync response miniblocks
       - Continue normal sync

   ELSE:
       // No gap - our position is after the snapshot
       - Skip miniblocks < persistedMinipoolGen
       - Notify events from remaining miniblocks
       - Continue normal sync
```

---

## Implementation

### Key Files

- `track_streams/stream_cookie_store.go` - Interface definition
- `track_streams/pg_stream_cookie_store.go` - PostgreSQL implementation
- `track_streams/multi_sync_runner.go` - Gap recovery logic
- `track_streams/sync_helpers.go` - Helper functions

### Key Functions

**`handleReset`** - Processes sync reset responses:
- Creates the tracked view
- Detects gaps and triggers gap recovery
- Notifies historical events if enabled

**`handleGapOnReset`** - Gap recovery:
- Compares `persistedMinipoolGen` with server's snapshot position
- Fetches missing miniblocks via `GetMiniblocks` RPC
- Sends event notifications for gap events

**`maybePersistCookie`** - Cookie persistence:
- Checks if persistence is needed (minipoolGen changed)
- Persists synchronously to database
- Updates in-memory state to avoid redundant writes

**`notifyEventsFromMiniblocks`** - Event notification:
- Parses events from miniblocks
- Calls `SendEventNotification` for each event

---

## Flow Diagram

### Service Restart Flow

```
Load persisted cookie
         │
         ▼
Add stream (minipoolGen=MaxInt64)
         │
         ▼
Receive reset response
         │
         ▼
┌─────────────────────────────────────────────────┐
│ persistedMinipoolGen <= serverSnapshotMb?       │
└─────────────────────────────────────────────────┘
         │                          │
        Yes (gap)                   No (no gap)
         │                          │
         ▼                          ▼
┌─────────────────────┐    ┌─────────────────────┐
│ GetMiniblocks(      │    │ Skip miniblocks     │
│   persisted,        │    │ < persisted         │
│   serverSnapshot)   │    │ Notify rest         │
│                     │    └─────────────────────┘
│ Notify gap events   │
│ Notify sync events  │
└─────────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Continue normal sync    │
└─────────────────────────┘
```

---

## Edge Cases

### First Time Syncing a Stream
- No persisted state exists (`persistedMinipoolGen = 0`)
- No gap detection needed, process sync response normally
- Start persisting after first miniblock

### GetMiniblocks Failures
- Log error and continue
- Events in gap will be lost, but sync continues

### Service Crashes During Gap Recovery
- Gap recovery is idempotent
- Restart will detect same gap and retry
- Events might be re-notified (handlers should dedup or be idempotent)

---

## Testing

Unit tests in `track_streams/gap_recovery_test.go`:
- `TestHandleGapOnReset_NoGap` - No gap when persisted > server snapshot
- `TestHandleGapOnReset_GapDetected` - Gap triggers miniblock fetch
- `TestApplyUpdateToStream_*` - Full flow tests

Cookie store tests in `track_streams/pg_stream_cookie_store_test.go`:
- CRUD operations
- Multiple streams
- Default table name

---

## Related Files

- `core/node/track_streams/multi_sync_runner.go` - Main sync orchestration
- `core/node/track_streams/pg_stream_cookie_store.go` - Cookie persistence
- `core/node/track_streams/sync_helpers.go` - Helper functions
- `core/node/events/tracked_stream_view.go` - Event processing
