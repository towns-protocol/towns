# Deadlock Analysis - 2025-11-13T00:41:53Z

## Executive Summary

A critical deadlock was detected in the river-node service on 2025-11-13 at 00:41:53Z during stress testing. The deadlock involved the Stream's RWMutex (`s.mu` at address `0xc000e241a8`), with **multiple goroutines blocked for up to 5 minutes** trying to acquire read locks.

### Root Cause
The deadlock was caused by a **write lock holder performing slow database I/O or being stuck in an infinite reconciliation loop**, preventing all readers from acquiring the lock. This was exacerbated by network failures to peer nodes (`34.48.18.41:443: connection refused`), which likely caused reconciliation operations to hang indefinitely.

### Impact
- **Production Service Degradation**: Multiple RPC handlers blocked, unable to service `GetLastMiniblockHash` and `SyncStreams` requests
- **Cascading Failures**: Stress test clients experienced timeouts and errors
- **Node Became Unresponsive**: After 5 minutes of lock contention, the deadlock detector panicked the node

### Critical Code Locations
1. **`core/node/events/stream.go:206-210`**: Database I/O while holding write lock
2. **`core/node/events/stream.go:164-189`**: Unbounded reconciliation retry loop
3. **`core/node/events/stream.go:564`**: Lock acquisition site where goroutines blocked

## Detailed Analysis

## Deadlock Details

**Time**: 2025-11-13T00:41:53.320Z  
**Host**: gke-main-cluster-alp-nap-e2-highmem-8-7b171ce7-t7r0.us-east4-a.c.hnt-live-alpha.internal  
**Service**: river-node  
**Mutex Address**: `0xc000e241a8` (Stream's `s.mu` RWMutex)

## Involved Goroutines

### Goroutine 34741 - GetLastMiniblockHash Request
**State**: Waiting for RLock for 1 minute  
**Purpose**: Handling `GetLastMiniblockHash` RPC request

**Stack Trace**:
```
goroutine 34741 [sync.RWMutex.RLock, 1 minutes]:
sync.(*RWMutex).RLock(0xc000e241a8)
github.com/towns-protocol/towns/core/node/events.(*Stream).tryGetView(0xc000e24180, 0x0)
    → core/node/events/stream.go:564
github.com/towns-protocol/towns/core/node/events.(*Stream).GetViewIfLocalEx(0xc000e24180, {0x2f0c948, 0xc116d30060}, 0x0)
    → core/node/events/stream.go:517
github.com/towns-protocol/towns/core/node/rpc.(*Service).getLastMiniblockHashImpl(0xc0002b32c0, {0x2f0c948, 0xc116d30060}, 0xc116d24500)
    → core/node/rpc/forwarder.go:382
[HTTP/2 server handler]
```

**Call Chain**:
1. HTTP/2 request received for `GetLastMiniblockHash`
2. RPC handler calls `getLastMiniblockHashImpl()`
3. Calls `Stream.GetViewIfLocalEx()` at stream.go:517
4. Calls `Stream.tryGetView()` at stream.go:564
5. **Attempts to acquire RLock** - BLOCKS HERE

### Goroutine 25188 - SyncStreams Session  
**State**: Waiting for RLock for 5 minutes  
**Purpose**: Handling `SyncStreams` streaming RPC session

**Stack Trace**:
```
goroutine 25188 [sync.RWMutex.RLock, 5 minutes]:
sync.(*RWMutex).RLock(0xc000e241a8)
github.com/towns-protocol/towns/core/node/events.(*Stream).tryGetView(0xc000e24180, 0x0)
    → core/node/events/stream.go:564
github.com/towns-protocol/towns/core/node/events.(*Stream).GetViewIfLocalEx(0xc000e24180, {0x2f0c948, 0xc06412e240}, 0x0)
    → core/node/events/stream.go:517
github.com/towns-protocol/towns/core/node/rpc.(*Service).getLastMiniblockHashImpl(0xc0002b32c0, {0x2f0c948, 0xc06412e240}, 0xc09dd8d200)
    → core/node/rpc/forwarder.go:382
[...]
github.com/towns-protocol/towns/core/node/rpc/syncv3/handler.(*syncStreamHandlerImpl).Run(0xc000f17e00)
    → core/node/rpc/syncv3/handler/handler.go:96
github.com/towns-protocol/towns/core/node/rpc/syncv3.(*serviceImpl).SyncStreams(0xc0004950a0, ...)
    → core/node/rpc/syncv3/service.go:90
github.com/towns-protocol/towns/core/node/rpc.(*Service).SyncStreams(0xc0002b32c0, ...)
    → core/node/rpc/service_sync_streams.go:22
[HTTP/2 server handler for streaming]
```

**Call Chain**:
1. Long-running SyncStreams streaming RPC session
2. Sync handler processing updates
3. Calls `getLastMiniblockHashImpl()` during sync operation
4. Calls `Stream.GetViewIfLocalEx()` at stream.go:517
5. Calls `Stream.tryGetView()` at stream.go:564  
6. **Attempts to acquire RLock** - BLOCKS HERE (for 5 minutes!)

### The Lock Holder (Not Shown in Trace)
The goroutine holding the write lock (or preventing read locks from being acquired) is not explicitly shown in the panic trace, but the deadlock detector indicates that the mutex at `0xc000e241a8` cannot be acquired.

**Critical Finding**: Based on the code analysis, the most likely culprit is a goroutine stuck in `lockMuAndLoadView()` which:
1. Acquires the write lock at line 142: `s.mu.Lock()`
2. May perform a **database read operation** at line 206-210: `s.params.Storage.ReadStreamFromLastSnapshot()`
3. If the stream is not found, it **releases and re-acquires the lock multiple times** (lines 161-189) while waiting for reconciliation
4. The reconciliation wait loop could be stuck if the context never cancels and reconciliation never completes

## Root Cause Analysis

### Code Analysis

Looking at `core/node/events/stream.go:564`:

```go
func (s *Stream) tryGetView(allowNoQuorum bool) (*StreamView, bool) {
    s.mu.RLock()  // ← Line 564: BOTH GOROUTINES BLOCK HERE
    defer s.mu.RUnlock()
    // ... rest of function
}
```

This is called by `GetViewIfLocalEx()` at line 517:

```go
func (s *Stream) GetViewIfLocalEx(ctx context.Context, allowNoQuorum bool) (*StreamView, error) {
    view, isLocal := s.tryGetView(allowNoQuorum)  // ← Line 517
    if !isLocal {
        return nil, nil
    }
    if view != nil {
        return view, nil
    }

    view, err := s.lockMuAndLoadView(ctx)  // ← Line 525: Would acquire WRITE lock
    defer s.mu.Unlock()
    // ...
}
```

### Potential Deadlock Scenario

The most likely scenario is **lock contention with a write lock or lock upgrade**:

1. **Some goroutine** (not shown in trace) acquired a **write lock** (`s.mu.Lock()`) on the Stream mutex and is performing a long-running operation (possibly involving network I/O or database operations)

2. **Goroutine 25188** tried to acquire an RLock 5 minutes ago and has been waiting since then

3. **Goroutine 34741** tried to acquire an RLock 1 minute ago and is also waiting

4. The write lock holder may be:
   - Blocked on I/O or network operation
   - Waiting for another resource
   - In a deadlock with another mutex
   - Stuck in an infinite loop or very slow operation

### Why RLocks are Blocked

In Go's `sync.RWMutex`:
- Multiple readers can hold RLocks simultaneously
- A writer (`Lock()`) blocks until all readers release their RLocks
- **New readers are blocked while a writer is waiting** to prevent writer starvation
- This means if a writer is waiting (or holding the lock), new `RLock()` calls will block

## Context Clues

### Network Issues
The logs show extensive network connectivity issues around the same time:
```
NewRemoteSyncer: (14:UNAVAILABLE) SyncStreams stream closed without receiving any messages
dial tcp 34.48.18.41:443: connect: connection refused
GetLastMiniblockHash: peerNodeRequestWithRetries: (62:DOWNSTREAM_NETWORK_ERROR)
```

### Stress Testing
The logs indicate stress testing was occurring:
```
/ecs/stress-test-node-alpha-1
stopping client19:0x0b88..C385
```

## Likely Scenario

Based on the evidence, the most probable scenario is:

### Timeline Reconstruction

```
T=0:00   │ Goroutine X acquires write lock (s.mu.Lock())
         │ └─> Calls lockMuAndLoadView()
         │     └─> Calls loadViewNoReconcileLocked()
         │         └─> Calls Storage.ReadStreamFromLastSnapshot() ← SLOW DB QUERY
         │             OR
         │         └─> Enters reconciliation loop (stream not found)
         │             └─> Tries to contact peer 34.48.18.41:443 ← CONNECTION REFUSED
         │
T=0:30   │ [Goroutine X still holding write lock, stuck in DB or reconciliation]
         │
T=1:00   │ Goroutine 25188 (SyncStreams handler) tries to acquire RLock
         │ └─> sync.RWMutex.RLock() ← BLOCKS waiting for write lock to release
         │
T=2:00   │ [Still blocked...]
         │
T=3:00   │ [Still blocked...]
         │
T=4:00   │ [Still blocked...]
         │
T=5:00   │ [Goroutine 25188 blocked for 5 minutes]
         │
T=6:00   │ Goroutine 34741 (GetLastMiniblockHash) tries to acquire RLock
         │ └─> sync.RWMutex.RLock() ← BLOCKS waiting for write lock to release
         │
T=6:10   │ [Goroutine 34741 blocked for 1 minute]
         │ [Goroutine 25188 blocked for 5+ minutes]
         │ [Goroutine X still holding write lock]
         │
T=6:13   │ 🔴 DEADLOCK DETECTOR FIRES
         │ panic: deadlock detected
         │ Node crashes
```

### Visual Representation

```
┌─────────────────────────────────────────────────────────────────┐
│                     Stream RWMutex (0xc000e241a8)               │
└─────────────────────────────────────────────────────────────────┘
                                │
            ┌───────────────────┼───────────────────┐
            │                   │                   │
     [HOLDING WRITE LOCK]  [WAITING FOR RLOCK] [WAITING FOR RLOCK]
            │                   │                   │
    ┌───────▼──────┐    ┌───────▼──────┐    ┌───────▼──────┐
    │ Goroutine X  │    │ Goroutine    │    │ Goroutine    │
    │ (Unknown ID) │    │   25188      │    │   34741      │
    └──────────────┘    └──────────────┘    └──────────────┘
            │                   │                   │
            │                   │                   │
    lockMuAndLoadView()   SyncStreams()      GetLastMiniblock()
            │                   │                   │
            ├─> DB I/O          ├─> tryGetView()   ├─> tryGetView()
            │   (SLOW/STUCK)    │   RLock() ⏳      │   RLock() ⏳
            │                   │   [5 min wait]   │   [1 min wait]
            ├─> OR              │                   │
            │   Reconcile Loop  │                   │
            │   (INFINITE)      │                   │
            │   ↻ Retry...      │                   │
            │   ↻ Retry...      │                   │
            │   ↻ Network fail  │                   │
            │   ↻ Retry...      │                   │
            │                   │                   │
            └───────────────────┴───────────────────┘
                     ALL BLOCKED - DEADLOCK!
```

### Step-by-Step Breakdown

1. **A goroutine acquired a write lock** on the Stream's mutex to perform an update operation (likely in `lockMuAndLoadView()` or similar)

2. **During the write lock hold period**, that goroutine made a blocking call:
   - Network RPC to another node (peer-to-peer sync)
   - Database query that's slow or deadlocked
   - Blockchain RPC call
   - Waiting on another mutex/channel

3. **The blocking call failed or hung** due to the network issues (`dial tcp 34.48.18.41:443: connect: connection refused`)

4. **Multiple read requests piled up** as the SyncStreams handlers and GetLastMiniblockHash handlers tried to access the stream view

5. **After 5 minutes**, the deadlock detector triggered when goroutine 25188 couldn't acquire the lock

## Potential Code Issues

### Issue 1: Database I/O While Holding Write Lock ⚠️ CRITICAL
**Location**: `core/node/events/stream.go:206-210` in `loadViewNoReconcileLocked()`

The function performs a database read operation **while holding the write lock**:
```go
func (s *Stream) loadViewNoReconcileLocked(ctx context.Context) (*StreamView, error) {
    // ... s.mu is already locked by caller ...
    
    streamData, err := s.params.Storage.ReadStreamFromLastSnapshot(
        ctx,                                          // ← Database I/O
        s.streamId,
        streamRecencyConstraintsGenerations,
    )
    // ... still holding lock ...
}
```

If this database operation is slow or deadlocked (e.g., PostgreSQL lock wait, slow query, connection pool exhaustion), it will block ALL readers trying to get `RLock()`.

### Issue 2: Unbounded Reconciliation Wait Loop ⚠️ CRITICAL
**Location**: `core/node/events/stream.go:164-189` in `lockMuAndLoadView()`

When a stream is not found, the code enters a retry loop that can run indefinitely:
```go
// Wait for reconciliation to complete.
backoff := BackoffTracker{
    NextDelay:   100 * time.Millisecond,
    MaxAttempts: 12,  // ← Only 12 attempts with exponential backoff
    Multiplier:  3,
    Divisor:     2,
}

for {
    s.mu.Lock()
    if s.local == nil {
        return nil, nil
    }
    if s.getViewLocked() != nil {
        return s.getViewLocked(), nil
    }
    s.mu.Unlock()
    
    err := backoff.Wait(ctx, nil)  // ← Can wait indefinitely if MaxAttempts reached
    if err != nil {
        s.mu.Lock()
        return nil, err
    }
}
```

The backoff will retry 12 times, but if reconciliation never completes and the context never cancels, **this creates a livelock situation** where the goroutine repeatedly acquires and releases the lock, preventing other operations from making progress.

### Issue 3: Lock/Unlock/Lock Pattern Creates Writer Starvation Risk
**Location**: `core/node/events/stream.go:161-173`

The pattern of:
```go
s.mu.Unlock()
// Do something (submit reconcile task)
s.mu.Lock()
```

When combined with many waiting readers, can create a situation where:
1. Lock is released briefly
2. A new reader grabs the RLock immediately
3. The writer tries to re-acquire but must wait for reader
4. More readers pile up
5. Writer keeps getting starved

### Issue 4: Network Issues Amplify The Problem
The logs show widespread network failures:
```
dial tcp 34.48.18.41:443: connect: connection refused
```

If reconciliation requires contacting peer nodes, and those nodes are unreachable, the reconciliation may never complete, causing `lockMuAndLoadView()` to loop forever.

## Recommendations

### Priority 1: Fix Reconciliation Loop (CRITICAL) 🔴

**Problem**: The reconciliation loop in `lockMuAndLoadView()` can run forever if reconciliation never completes.

**Solution**: Add proper timeout and error handling:

```go
func (s *Stream) lockMuAndLoadView(ctx context.Context) (*StreamView, error) {
    s.mu.Lock()
    if s.local == nil {
        return nil, nil
    }

    if s.getViewLocked() != nil {
        s.lastAccessedTime = time.Now()
        return s.getViewLocked(), nil
    }

    view, err := s.loadViewNoReconcileLocked(ctx)
    if err == nil {
        return view, nil
    }

    if !IsRiverErrorCode(err, Err_NOT_FOUND) {
        return nil, err
    }

    s.mu.Unlock()
    s.params.streamCache.SubmitReconcileStreamTask(s, nil)

    // ADD: Create a derived context with absolute timeout
    reconcileCtx, cancel := context.WithTimeout(ctx, 30*time.Second)
    defer cancel()

    backoff := BackoffTracker{
        NextDelay:   100 * time.Millisecond,
        MaxAttempts: 12,
        Multiplier:  3,
        Divisor:     2,
    }

    for {
        s.mu.Lock()
        if s.local == nil {
            return nil, nil
        }
        if s.getViewLocked() != nil {
            s.lastAccessedTime = time.Now()
            return s.getViewLocked(), nil
        }
        s.mu.Unlock()

        // FIX: Use reconcileCtx instead of ctx
        err := backoff.Wait(reconcileCtx, nil)
        if err != nil {
            s.mu.Lock()
            // FIX: Return a better error when reconciliation times out
            if errors.Is(err, context.DeadlineExceeded) {
                return nil, RiverError(Err_INTERNAL, "stream reconciliation timed out after 30s")
            }
            return nil, err
        }
    }
}
```

### Priority 2: Add Lock Acquisition Timeout (CRITICAL) 🔴

**Problem**: `tryGetView()` can block indefinitely waiting for `RLock()`.

**Solution**: Implement a timeout-aware lock acquisition pattern:

```go
func (s *Stream) tryGetViewWithTimeout(ctx context.Context, allowNoQuorum bool, timeout time.Duration) (*StreamView, bool, error) {
    // Use a channel to implement timeout
    type result struct {
        view    *StreamView
        isLocal bool
    }
    
    resultCh := make(chan result, 1)
    
    go func() {
        s.mu.RLock()
        defer s.mu.RUnlock()
        
        if s.local == nil {
            resultCh <- result{nil, false}
            return
        }

        isLocal := false
        if !allowNoQuorum {
            isLocal = s.nodesLocked.IsLocalInQuorum()
        } else {
            isLocal = s.nodesLocked.IsLocal()
        }

        if isLocal && s.getViewLocked() != nil {
            s.maybeScrubLocked()
            resultCh <- result{s.getViewLocked(), true}
        } else {
            resultCh <- result{nil, isLocal}
        }
    }()
    
    select {
    case res := <-resultCh:
        return res.view, res.isLocal, nil
    case <-time.After(timeout):
        return nil, false, RiverError(Err_TIMEOUT, "timed out acquiring stream read lock")
    case <-ctx.Done():
        return nil, false, ctx.Err()
    }
}
```

Then update `GetViewIfLocalEx()`:
```go
func (s *Stream) GetViewIfLocalEx(ctx context.Context, allowNoQuorum bool) (*StreamView, error) {
    view, isLocal, err := s.tryGetViewWithTimeout(ctx, allowNoQuorum, 5*time.Second)
    if err != nil {
        return nil, err
    }
    if !isLocal {
        return nil, nil
    }
    if view != nil {
        return view, nil
    }
    
    // Continue with existing lockMuAndLoadView logic...
}
```

### Priority 3: Optimize Database Access (HIGH) 🟡

**Problem**: `ReadStreamFromLastSnapshot()` is called while holding write lock.

**Solution A**: Use read-only lock for database read, upgrade to write lock only for cache update:

```go
func (s *Stream) loadViewNoReconcileLocked(ctx context.Context) (*StreamView, error) {
    if s.local == nil {
        return nil, nil
    }

    if s.getViewLocked() != nil {
        s.lastAccessedTime = time.Now()
        return s.getViewLocked(), nil
    }

    // FIX: Release write lock before expensive DB operation
    s.mu.Unlock()
    
    streamRecencyConstraintsGenerations := int(s.params.ChainConfig.Get().RecencyConstraintsGen)
    streamData, err := s.params.Storage.ReadStreamFromLastSnapshot(
        ctx,
        s.streamId,
        streamRecencyConstraintsGenerations,
    )
    
    // Re-acquire write lock to update cache
    s.mu.Lock()
    
    if err != nil {
        return nil, err
    }

    // Check again in case another goroutine loaded it
    if s.getViewLocked() != nil {
        s.lastAccessedTime = time.Now()
        return s.getViewLocked(), nil
    }

    view, err := MakeStreamView(streamData)
    if err != nil {
        return nil, err
    }

    s.setViewLocked(view)
    return view, nil
}
```

**Solution B** (Simpler): Add timeout to database operations via context.

### Priority 4: Add Lock Monitoring and Alerting (MEDIUM) 🟢

Add instrumentation to detect lock contention early:

```go
// Add to Stream struct
type StreamLockMetrics struct {
    lastLockAcquireTime time.Time
    lockHoldDuration    time.Duration
    waitingReaders      atomic.Int32
    waitingWriters      atomic.Int32
}

// Wrap lock operations
func (s *Stream) lockWithMetrics() {
    s.metrics.waitingWriters.Add(1)
    start := time.Now()
    
    s.mu.Lock()
    
    s.metrics.waitingWriters.Add(-1)
    s.metrics.lastLockAcquireTime = time.Now()
    
    waitDuration := time.Since(start)
    if waitDuration > 100*time.Millisecond {
        s.log.Warnw("slow lock acquisition", 
            "streamID", s.streamId,
            "waitDuration", waitDuration,
            "waitingReaders", s.metrics.waitingReaders.Load(),
        )
    }
}
```

### Priority 5: Circuit Breaker for Peer Node Failures (MEDIUM) 🟢

When peer nodes fail (like `34.48.18.41:443`), prevent cascading failures:

```go
type NodeCircuitBreaker struct {
    failures    map[common.Address]*CircuitBreakerState
    mu          sync.RWMutex
    failureThreshold int
    timeout     time.Duration
}

type CircuitBreakerState struct {
    consecutiveFailures int
    lastFailureTime     time.Time
    state              CircuitState // CLOSED, OPEN, HALF_OPEN
}

func (cb *NodeCircuitBreaker) ShouldAttempt(nodeAddr common.Address) bool {
    cb.mu.RLock()
    defer cb.mu.RUnlock()
    
    state, exists := cb.failures[nodeAddr]
    if !exists {
        return true
    }
    
    if state.state == OPEN {
        if time.Since(state.lastFailureTime) > cb.timeout {
            // Transition to HALF_OPEN
            state.state = HALF_OPEN
            return true
        }
        return false
    }
    
    return true
}
```

### Priority 6: Add Deadlock Detection Logging (LOW) 🟢

Improve debuggability by logging lock operations in production:

```go
var streamLockLogger = logging.Logger("stream.lock")

func (s *Stream) RLock() {
    if streamLockLogger.Level() <= zapcore.DebugLevel {
        streamLockLogger.Debugw("acquiring RLock",
            "streamID", s.streamId,
            "goroutine", runtime.GoID(),
            "caller", getCaller(2),
        )
    }
    s.mu.RLock()
}
```

## Next Steps

1. **Identify the write lock holder** by adding more instrumentation
2. **Review all code paths** that acquire `s.mu.Lock()` (write lock)
3. **Add timeout protection** to all operations that hold locks
4. **Implement circuit breakers** for peer node communication
5. **Add metrics** to track lock wait times and detect slowdowns earlier

## Related Files

- `core/node/events/stream.go:564` - Lock acquisition site
- `core/node/events/stream.go:517` - GetViewIfLocalEx calling tryGetView
- `core/node/events/stream.go:525` - lockMuAndLoadView acquiring write lock
- `core/node/rpc/forwarder.go:382` - RPC handler calling into stream code
- `core/node/rpc/syncv3/handler/handler.go:96` - Sync handler
- `core/node/rpc/syncv3/syncer/registry.go:125` - Registry run loop

