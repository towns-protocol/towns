# Stream Tracker Debugging Guide

This document analyzes potential bugs in the stream tracking mechanism and provides strategic logging locations for debugging stream loss issues in production.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                      App Registry Service                           │
│  service.go - starts tracker, provides API endpoints                │
└────────────────────────────┬────────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────────┐
│           AppRegistryStreamsTracker (sync/streams_tracker.go)       │
│  - Embeds StreamsTrackerImpl                                        │
│  - Implements StreamFilter interface                                │
│  - TrackStream(): decides WHICH streams to track                    │
│  - NewTrackedStream(): creates TrackedStreamView for each stream    │
└────────────────────────────┬────────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────────┐
│              StreamsTrackerImpl (track_streams/)                    │
│  - Subscribes to river registry for stream events                   │
│  - On startup: iterates all streams via ForAllStreams()             │
│  - On new streams: OnStreamAllocated, OnStreamAdded callbacks       │
│  - Delegates to MultiSyncRunner for actual syncing                  │
└────────────────────────────┬────────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────────┐
│                    MultiSyncRunner                                  │
│  - Manages sync sessions across multiple remote nodes               │
│  - Creates syncSessionRunner per node                               │
│  - Handles stream relocation on node failures                       │
│  - Uses worker pool for concurrent processing                       │
└────────────────────────────┬────────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────────┐
│                    syncSessionRunner                                │
│  - Runs sync session against a single node                          │
│  - Batches multiple streams per session (default 100)               │
│  - Processes SYNC_UPDATE messages                                   │
│  - Relocates streams on SYNC_DOWN                                   │
└────────────────────────────┬────────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────────┐
│                       remoteSyncer                                  │
│  - gRPC streaming connection to remote node                         │
│  - Calls SyncStreams RPC, receives real-time updates                │
│  - Handles connection keepalive via ping                            │
└─────────────────────────────────────────────────────────────────────┘
```

## Potential Bugs Analysis

### Critical Issues

#### 1. Channel Blocking in `streamsToSync` (multi_sync_runner.go:786)

```go
streamsToSync: make(chan (*streamSyncInitRecord), 2048),
```

The channel has fixed capacity of 2048. Multiple places write to this channel:
- `relocateStream` (line 582) - **blocking write, no timeout**
- `addToSync` re-queue paths (lines 878, 910, 956, 997) - **blocking writes, no timeout**

**Bug scenario**: If worker pool is backed up AND many streams fail simultaneously, the channel fills up. All subsequent `relocateStream` calls block indefinitely, causing:
- `syncSessionRunner.Close()` to hang (line 635 calls `relocateStream` in a loop)
- Cascade of blocked goroutines
- Streams "disappear" from tracking

#### 2. Handle Reset Failure Cancels Entire Session (multi_sync_runner.go:350-358)

```go
if err := ssr.handleReset(streamAndCookie, record); err != nil {
    ssr.cancelSync(...)  // Cancels sync for ALL streams in session
    return
}
```

If `NewTrackedStream` fails for ONE stream (e.g., parsing error), the entire sync session with ~100 streams gets cancelled. The failing stream keeps failing on retry, potentially causing infinite relocation loops.

#### 3. Zero Remotes Edge Case (stream_nodes.go:136-141)

```go
func (s *StreamNodesWithoutLock) GetStickyPeer() common.Address {
    if len(s.remotes) > 0 {
        return s.remotes[s.stickyPeerIndex]
    } else {
        return common.Address{}  // Returns zero address!
    }
}
```

When `remotes` is empty (all nodes invalid/filtered), `GetStickyPeer` returns `common.Address{}`. In `addToSync`:

```go
targetNode := record.remotes.GetStickyPeer()  // Could be zero!
pool := msr.getNodeRequestPool(targetNode)    // Creates pool for zero addr
```

A zero target node causes undefined behavior - the stream may sit in a broken state forever.

#### 4. Stream Already Tracked Check Missing on Relocation (streams_tracker.go:206-216)

```go
func (tracker *StreamsTrackerImpl) forwardStreamEvents(...) bool {
    if _, loaded := tracker.tracked.LoadOrStore(streamWithId.StreamId(), struct{}{}); loaded {
        return false  // Returns false, but stream may not actually be syncing
    }
    ...
}
```

If a stream is marked as tracked but then fails during sync setup, subsequent attempts to add it via `AddStream` are silently rejected because it's "already tracked". The stream is never actually syncing.

#### 5. Double Relocation on SYNC_DOWN

In `remote_syncer.go:156-168`:

```go
} else if res.GetSyncOp() == SyncOp_SYNC_DOWN {
    if streamID, err := StreamIdFromBytes(res.GetStreamId()); err == nil {
        s.unsubStream(streamID)  // Calls relocateStream
        ...
    }
}
```

And in `multi_sync_runner.go:427-438` (processSyncUpdate):

```go
case protocol.SyncOp_SYNC_DOWN:
    ssr.metrics.SyncDown.With(...)
    log.Infow("Received SYNC_DOWN from remote, stream will be relocated"...)
    return  // Just logs, doesn't relocate - but unsubStream already did!
```

The stream gets relocated via `unsubStream` callback. This is correct, but the confusing comment/log suggests it should happen here. If logic changes, there's risk of double-relocation or no relocation.

### Medium Issues

#### 6. Context Cancellation Drops Streams (multi_sync_runner.go:897-898, 943-944)

```go
if errors.Is(err, context.Canceled) {
    return  // Stream record is NOT re-queued
}
```

During shutdown this is correct, but if cancellation is unexpected (e.g., parent context cancelled due to unrelated error), streams are silently dropped.

#### 7. No Retry Limit / Circuit Breaker

Streams that fail repeatedly cycle through all nodes infinitely. If a stream has corrupt data on all nodes, it creates continuous load without ever succeeding.

#### 8. Stream Not Re-evaluated When Bot Joins (app registry specific)

In `sync/streams_tracker.go:88-109`:

```go
func (tracker *AppRegistryStreamsTracker) TrackStream(ctx context.Context, streamId shared.StreamId, _ bool) bool {
    if streamType == shared.STREAM_CHANNEL_BIN {
        return true  // Always track channels
    }
    // User inbox only tracked if IsForwardableApp returns true
}
```

Channels are always tracked, but user inbox streams of newly registered bots may not be picked up until service restart (unless `AddStream` is called explicitly).

---

## Strategic Logging Locations

### 1. Stream Queue Status (multi_sync_runner.go)

Add periodic logging of queue health in `MultiSyncRunner.Run()`:

```go
case <-ticker.C:
    msr.metrics.UnsyncedQueueLength.Set(float64(msr.workerPool.WaitingQueueSize()))
    // ADD: Log queue state when concerning
    queueLen := len(msr.streamsToSync)
    if queueLen > 1500 {  // 75% of capacity
        log.Warnw("streamsToSync channel nearing capacity",
            "queueLength", queueLen,
            "capacity", 2048,
            "workerPoolWaiting", msr.workerPool.WaitingQueueSize(),
        )
    }
```

### 2. Stream Entry/Exit Tracking (multi_sync_runner.go:1007-1051)

```go
func (msr *MultiSyncRunner) AddStream(...) {
    // ADD at start:
    log.Infow("MultiSyncRunner.AddStream called",
        "streamId", streamId,
        "streamType", shared.StreamTypeToString(stream.StreamId().Type()),
        "numNodes", len(stream.Nodes()),
        "hasCookie", cookie != nil,
    )

    // ADD before channel send:
    log.Debugw("Enqueueing stream to streamsToSync",
        "streamId", streamId,
        "channelLen", len(msr.streamsToSync),
    )
    msr.streamsToSync <- &streamSyncInitRecord{...}
}
```

### 3. Relocation Tracking (multi_sync_runner.go:550-583)

```go
func (ssr *syncSessionRunner) relocateStream(streamID shared.StreamId) {
    // ADD detailed tracking:
    log.Infow("relocateStream called",
        "streamId", streamID,
        "syncId", ssr.GetSyncId(),
        "targetNode", ssr.node,
        "remainingInSession", ssr.streamRecords.Size(),
    )

    record, ok := ssr.streamRecords.LoadAndDelete(streamID)
    if !ok {
        // ADD: This is a bug indicator!
        log.Errorw("STREAM_LOST: Expected stream to exist in stream records",
            "streamId", streamID,
            "syncId", ssr.GetSyncId(),
            "wasAlreadyRelocated", true,  // Indicates double-relocation
        )
        return
    }

    // ADD before channel send:
    log.Infow("Stream being sent to relocate channel",
        "streamId", streamID,
        "newTargetNode", newTarget,
        "previousNodes", record.remotes.GetQuorumNodes(),
    )
    ssr.relocateStreams <- record
}
```

### 4. Session Close Tracking (multi_sync_runner.go:594-638)

```go
func (ssr *syncSessionRunner) Close(err error) {
    // ADD at start:
    streamCount := ssr.streamRecords.Size()
    log.Warnw("syncSessionRunner.Close called",
        "error", err,
        "syncId", ssr.GetSyncId(),
        "node", ssr.node,
        "streamsToRelocate", streamCount,
    )

    // ... existing code ...

    // ADD after relocation loop:
    log.Infow("syncSessionRunner.Close completed relocation",
        "syncId", ssr.GetSyncId(),
        "streamsRelocated", streamCount,
    )
}
```

### 5. Add Stream Failure Path (multi_sync_runner.go:836-1001)

```go
func (msr *MultiSyncRunner) addToSync(...) {
    // ADD at entry:
    log.Debugw("addToSync called",
        "streamId", record.streamId,
        "targetNode", targetNode,
        "stickyPeer", record.remotes.GetStickyPeer(),
    )

    // ADD when zero target node:
    if targetNode == (common.Address{}) {
        log.Errorw("STREAM_STUCK: targetNode is zero address",
            "streamId", record.streamId,
            "remotes", record.remotes.GetQuorumNodes(),
        )
        // Consider: don't re-queue, mark as failed
    }

    // ADD in error paths before re-queue:
    if err := runner.AddStream(rootCtx, *record); err != nil {
        log.Warnw("AddStream failed, will re-queue",
            "streamId", record.streamId,
            "error", err,
            "errorCode", base.AsRiverError(err).GetCode(),
            "targetNode", targetNode,
            "syncId", runner.GetSyncId(),
        )
        // ...
        msr.streamsToSync <- record
    }
}
```

### 6. Tracked Map Consistency Check (streams_tracker.go:206-216)

```go
func (tracker *StreamsTrackerImpl) forwardStreamEvents(...) bool {
    if _, loaded := tracker.tracked.LoadOrStore(streamWithId.StreamId(), struct{}{}); loaded {
        // ADD: This should be rare - investigate if frequent
        log.Warnw("Stream already in tracked map",
            "streamId", streamWithId.StreamId(),
        )
        return false
    }
    // ADD success log:
    log.Infow("Stream added to tracking",
        "streamId", streamWithId.StreamId(),
        "nodes", streamWithId.Nodes(),
    )
    tracker.multiSyncRunner.AddStream(ctx, streamWithId, applyHistoricalContent)
    return true
}
```

### 7. Periodic Health Check (NEW - suggested addition)

Add a periodic reconciliation check to `MultiSyncRunner`:

```go
func (msr *MultiSyncRunner) logHealthStatus(ctx context.Context) {
    ticker := time.NewTicker(5 * time.Minute)
    defer ticker.Stop()

    for {
        select {
        case <-ctx.Done():
            return
        case <-ticker.C:
            var totalStreams, sessionCount int
            msr.unfilledSyncs.Range(func(_ common.Address, runner *syncSessionRunner) bool {
                totalStreams += runner.streamRecords.Size()
                sessionCount++
                return true
            })

            log.Infow("StreamTracker health status",
                "activeSyncSessions", sessionCount,
                "totalTrackedStreams", totalStreams,
                "queueLength", len(msr.streamsToSync),
                "workerPoolWaiting", msr.workerPool.WaitingQueueSize(),
            )
        }
    }
}
```

---

## Summary of Most Likely Causes

| Priority | Issue | Location | Symptom |
|----------|-------|----------|---------|
| 1 | Channel saturation | `streamsToSync` fills up | Relocations block, streams disappear |
| 2 | Zero target node | `GetStickyPeer()` returns empty | Stream stuck in retry loop |
| 3 | HandleReset cascade | One bad stream kills session | Mass relocation, repeated failures |
| 4 | Already tracked but not syncing | `tracked` map inconsistency | Stream marked tracked but never syncing |

## Recommended Next Steps

1. **Add the logging** from sections above to get visibility into production behavior
2. **Add retry counter** to `streamSyncInitRecord` to detect infinite retry loops
3. **Add circuit breaker** for streams that fail N times consecutively
4. **Consider non-blocking channel writes** with timeout for relocation paths
5. **Add health endpoint** that exposes tracked stream count vs. actually syncing count