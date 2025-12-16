# App Registry Delivery Problems

We currently have multiple issues in the App Registry:
1. **Events not sent** - when the App Registry service goes offline (planned redeploy or outage) while new
channel events are being produced, those events can be sealed into a miniblock
before the service comes back. Today the tracker starts from a fresh sync on
boot (`ApplyHistoricalContent.Enabled = false`) and treats those sealed events as
"already delivered". Any events that were added after the downtime started and sealed
before it ended will not be sent to bots.
2. **Events sent multiple times** - events that were in the minipool before the restart happened (and were sent to bots).
will be sent again if they are still in the minipool when the service resumes (no dedup on the bot side)
3. **Webhook failure drop** – When a bot already has the session key, the event is
sent immediately via `SubmitMessages`. If the HTTPS call to the webhook fails
(timeout, 5xx, unreachable), we log the error but do not requeue the event.
Today we assume bots are up whenever they have keys, so a transient webhook
outage at the wrong time causes permanent loss.
4. **Unbounded backlog for offline bots** – Unsigned events (no session key)
are persisted in `enqueued_messages` until the bot publishes the missing key.
There is no TTL or quota, so if a bot stays offline or never repays keys, its
backlog grows unbounded, limited only by database capacity.

## Candidate Solutions

### 1. Persist cookies, deduplicate on bot side
- Store per-stream `SyncCookie` (minipool generation + prev hash) in Postgres.
- After downtime, request historical data from River nodes using the stored
  cookie and forward *all* events from that point onward.
- Bots (SDK/webhook) must detect duplicate `eventId`s and drop them.
- **Pros:** no delivery-related schema beyond the cookie table; minimal replay
  logic.
- **Cons:** higher webhook traffic after restart, every bot implementation must
  implement deduplication; breaks "exactly once" semantics unless all bots
  upgrade.

### 2. Persist delivery watermark in the App Registry
- Store, per stream/device, the last event hash or miniblock/event number that
  was successfully forwarded.
- After downtime, resume from that watermark and forward only events with a
  higher position (skip historical ones already delivered).
- Requires writing the watermark to Postgres whenever an event is sent and
  updating the replay logic to honor it.
- **Pros:** maintains existing guarantees (bots see each event exactly once even
  across restarts); no bot changes.
- **Cons:** more state to manage; needs schema changes and careful replay logic.

### Decision
Only two options are available in networked delivery systems:
1. all events are guaranteed to be delivered, but there could be some duplicates
2. There is guarantee there are no duplicates, but then not all events are guaranteed to be delivered

For bots we need to guarantee at least once delivery, so we choose option 1.
Since the server might be sending duplicate events anyway, we need to implement
dededuplication on the bot side, so there is no point in storing watermarks in
the App Registry, and we can simply store the cookie (candidate 1).

## Tracking Scope Problem
- The App Registry currently subscribes to *all* channel streams across the
  network (mirroring the notification service). For each stream it maintains a
  `TrackedStreamViewImpl` even if no bot is a member.
- This wastes memory and CPU—most channels never forward anything to bots. It
  also elongates startup time because MultiSyncRunner must resync every stream
  on restart.
- We need a way to subscribe only to streams where bots are actually installed.
  One approach is to consume AppAccount events from the subgraph  
  so we can Add/Remove streams dynamically when bots join or leave channels.

## Bot-side deduplication gap
- The @towns-protocol/bot SDK does not maintain a “seen event” cache. Every
  webhook payload is treated as new work.
- If the App Registry replays minipool events (after a restart) or a bot’s
  webhook recovers from downtime, the framework will process the same event
  multiple times because there is no built-in deduplication.
- If we pursue the “persist cookies / replay and dedup on bots” solution, we must
  first add dedup logic (e.g., recent `eventId` cache) to the bot framework so
  developers don’t have to reinvent it in each webhook.

## Interim mitigation: cold streams for App Registry
- Even with a subgraph-driven approach, implementing “track only streams with bots” is non-trivial.
- As a stopgap we can reuse the notification service’s cold-streams mechanism: start with no channel streams tracked, and only call `AddStream` when a channel emits events. We still track channels regardless of bot presence, but only once they become active.
- This doesn’t eliminate unnecessary tracking, but it dramatically reduces memory usage and restart cost because we no longer keep `StreamView`s for dormant channels.

## Implementation notes

### Persist cookies + bot-side dedup

#### High-level approach
1. **App Registry persistence**
   - Add a table (`stream_sync_cookies`) keyed by `stream_id` storing the
     last `SyncCookie` we successfully applied.
   - After every event processing, write the returned `NextSyncCookie` to
     that table (NOT in transaction with queue mutations - see design notes below).
   - Only persist cookies for streams that have bot members (dramatically reduces storage).
   - On restart, load cookies for streams with bots before calling
     `StreamsTracker.AddStream`. Pass the cookie as `ApplyHistoricalContent`
     (i.e., set `FromMiniblockHash` from the stored hash) so we replay exactly
     from where we left off.
2. **Replay behavior**
   - When replaying with cookies, we intentionally forward all events after the
     stored checkpoint (even if they were delivered before the crash). That
     creates duplicates, which bots must drop using their new dedup cache.
3. **Bot framework changes**
   - Enhance `@towns-protocol/bot` (and the SDK behind it) with a small
     deduplication cache keyed by `eventId`/hash, bounded by either time or
     memory. Only new events reach handlers; duplicates from replays are dropped.
   - Document the behavior so bot developers understand retries are possible.

#### Design decisions
- **No transactional coupling**: Cookie persistence is independent of message queue operations.
  If a crash occurs after processing events but before persisting the cookie, the service will
  replay some events on restart. This is acceptable with bot-side deduplication and simplifies
  the implementation significantly.

- **Selective persistence**: Only persist cookies for streams with bot members. This is determined by:
  - For channel streams: whether `forwardableApps` was non-empty during event processing
  - For user inbox streams: whether the stream belongs to a registered bot

  This reduces the number of persisted cookies from potentially millions (all channels) to
  hundreds/thousands (only channels with bots), dramatically reducing storage and I/O overhead.

#### Detailed implementation plan

##### 1. Database schema (Migration 000007)
Create `stream_sync_cookies` table:
```sql
CREATE TABLE IF NOT EXISTS stream_sync_cookies (
    stream_id            CHAR(64) PRIMARY KEY NOT NULL,
    minipool_gen         BIGINT NOT NULL,
    prev_miniblock_hash  BYTEA NOT NULL,
    updated_at           TIMESTAMP DEFAULT NOW()
);
```

The `updated_at` timestamp enables future cleanup of stale cookies if needed.

##### 2. Storage interface extension
**File:** `core/node/storage/pg_app_registry_store.go`

Add to `AppRegistryStore` interface:
```go
// WriteSyncCookie stores or updates the sync cookie for a stream
WriteSyncCookie(ctx context.Context, streamID shared.StreamId,
    minipoolGen int64, prevMiniblockHash []byte) error

// GetStreamSyncCookies loads all stored cookies on startup
GetStreamSyncCookies(ctx context.Context) (map[shared.StreamId]*protocol.SyncCookie, error)

// DeleteStreamSyncCookie removes a cookie (for cleanup)
DeleteStreamSyncCookie(ctx context.Context, streamID shared.StreamId) error
```

Implementation details:
- Use **READ COMMITTED** isolation (simple upsert, no need for SERIALIZABLE)
- Use UPSERT pattern: `INSERT ... ON CONFLICT (stream_id) DO UPDATE SET ...`
- No transaction parameter - each operation is independent

##### 3. Selective persistence logic
**File:** `core/node/app_registry/sync/tracked_stream.go`

Modify `AppRegistryTrackedStreamView.onNewEvent()`:

1. Track whether stream has bot members during event processing:
   - For channel streams: set flag when `forwardableApps` is non-empty
   - For user inbox streams: check if stream belongs to registered bot

2. After processing events, conditionally persist cookie:
```go
if shouldPersistCookie(streamID, hadBotMembers) {
    cookie := track_streams.SyncCookieFromContext(ctx)
    if cookie != nil {
        // Fire-and-forget style persistence
        go func() {
            if err := s.store.WriteSyncCookie(context.Background(),
                streamID, cookie.MinipoolGen, cookie.PrevMiniblockHash); err != nil {
                log.Warnw("failed to persist sync cookie",
                    "stream_id", streamID, "error", err)
            }
        }()
    }
}
```

3. Add helper method:
```go
func (view *AppRegistryTrackedStreamView) shouldPersistCookie(
    streamID shared.StreamId,
    hadBotMembers bool,
) bool {
    streamType := streamID.Type()

    // Always persist for bot inbox streams
    if streamType == shared.STREAM_USER_INBOX_BIN {
        return view.isBotInboxStream(streamID)
    }

    // For channels, only persist if bots are members
    if streamType == shared.STREAM_CHANNEL_BIN {
        return hadBotMembers
    }

    return false
}
```

##### 4. Service layer integration
**File:** `core/node/app_registry/service.go`

Pass store reference to streams tracker during initialization:
```go
tracker, err := sync.NewAppRegistryStreamsTracker(
    ctx, cfg, onChainConfig, riverRegistry,
    streamTrackerNodeRegistries, metrics,
    listener, cache, store, // Add store parameter
    otelTracer,
)
```

**File:** `core/node/app_registry/sync/streams_tracker.go`

Update `AppRegistryStreamsTracker`:
```go
type AppRegistryStreamsTracker struct {
    track_streams.StreamsTrackerImpl
    queue         EncryptedMessageQueue
    store         storage.AppRegistryStore  // Add store
    streamCookies map[shared.StreamId]*protocol.SyncCookie  // Loaded on startup
}
```

Modify `NewAppRegistryStreamsTracker()` to:
1. Accept store parameter
2. Load cookies on initialization: `store.GetStreamSyncCookies(ctx)`
3. Store in `streamCookies` map

Update `NewTrackedStream()` to pass store to tracked stream views.

##### 5. Startup cookie loading and application
**File:** `core/node/track_streams/streams_tracker.go`

Modify `StreamsTrackerImpl.Run()` in the `ForAllStreams` callback (around line 178):

```go
// Before: Always used Enabled: false
tracker.multiSyncRunner.AddStream(stream, ApplyHistoricalContent{Enabled: false})

// After: Check for stored cookie
var applyHistorical ApplyHistoricalContent
if cookie, hasCookie := tracker.filter.GetStreamCookie(stream.StreamId()); hasCookie {
    applyHistorical = ApplyHistoricalContent{
        Enabled:           true,
        FromMiniblockHash: cookie.PrevMiniblockHash,
    }
} else {
    applyHistorical = ApplyHistoricalContent{Enabled: false}
}
tracker.multiSyncRunner.AddStream(stream, applyHistorical)
```

Add method to streams tracker filter interface:
```go
type StreamsTrackerFilter interface {
    TrackStream(ctx context.Context, streamID shared.StreamId, isInit bool) bool
    GetStreamCookie(streamID shared.StreamId) (*protocol.SyncCookie, bool)
}
```

Implement in `AppRegistryStreamsTracker`:
```go
func (tracker *AppRegistryStreamsTracker) GetStreamCookie(
    streamID shared.StreamId,
) (*protocol.SyncCookie, bool) {
    cookie, ok := tracker.streamCookies[streamID]
    return cookie, ok
}
```

##### 6. Testing strategy

**Unit tests** (`core/node/storage/pg_app_registry_store_test.go`):
- Test `WriteSyncCookie()` - insert and update cases
- Test `GetStreamSyncCookies()` - load multiple cookies
- Test `DeleteStreamSyncCookie()` - removal
- Test upsert behavior (same stream_id multiple times)

**Integration tests** (`core/node/app_registry/sync/tracked_stream_test.go`):
- Test selective persistence (streams with/without bots)
- Test cookie persistence after event processing
- Mock store to verify persistence is called correctly

**Service restart tests**:
1. Start App Registry with bot in channel
2. Process events, verify cookie persisted
3. Shutdown service
4. Restart service
5. Verify events replayed from cookie position
6. Verify streams without bots start fresh

**Manual testing scenario**:
1. Register bot and add to channel
2. Send messages, check `stream_sync_cookies` table
3. Send messages to channel without bots
4. Verify no cookie for bot-less channel
5. Kill service mid-processing
6. Restart and verify replay behavior

### Webhook failure drops
- Enhance `SubmitMessages` to persist in-flight deliveries so transient webhook
  failures don't drop messages. Two possible approaches:
  1. Only delete `enqueued_messages` rows after the webhook responds 200; if the
     HTTP call fails, leave the row so the message will be retried automatically.
  2. Or, add a separate "in-flight" table keyed by event hash/device. Insert
     before sending and delete on success; on failure, requeue into
     `enqueued_messages`.
- Either approach ensures webhook timeouts or 5xx responses don't cause loss.
  (We can combine this with the cookie persistence work since both involve more
  durable bookkeeping around delivery.)
- We will limit the number of events in the queue, and the time they remain in
  the queue, to avoid unbounded growth.

### Enqueued messages race condition
- When sending messages that are enqueued in `enqueued_messages` (via `PublishSessionKeys`),
  we first delete the messages from the database, then send them to the webhook.
- **Race condition**: If the service crashes after deleting but before sending, those
  messages are lost forever. Similarly, if the webhook is temporarily unavailable
  (timeout, 5xx), the messages are already deleted and won't be retried.
- This is the same class of problem as "Webhook failure drops" above - the fix is
  to only delete after successful webhook delivery, or use an "in-flight" table.

### Unbounded backlog for offline bots
- Introduce TTL-based retention for `enqueued_messages`:
  - Track `created_at` per row and add a cleanup job that deletes rows older than
    N days (configurable, default 7 days) to avoid infinite growth.
  - **Note**: We intentionally avoid per-bot quotas or suspension mechanisms because a single
    bot can be installed in multiple channels. One channel failing key solicitation shouldn't
    penalize the bot's operation in other channels where it's working correctly.
- Pair this with better visibility (metrics/alerts) so we know when bots are
  falling behind.

### Webhook failure tracking
- Currently, webhook failures are only logged (`app_dispatcher.go:166` has a `// TODO: retry logic?` comment).
  A bot can register a webhook, go offline forever, and never respond to key solicitations.
  Messages accumulate in `enqueued_messages` indefinitely.
- The TTL/quota solution above mitigates unbounded growth, but doesn't address bots that
  have session keys and receive immediate delivery attempts that consistently fail.
- Potential enhancement: track consecutive webhook failures per bot. After N failures
  (e.g., 10), mark the bot as `suspended`. This prevents wasting resources on bots that
  are permanently offline while still allowing transient failures.
- Alternative: implement retry with exponential backoff before giving up on a message.
  This handles transient outages but doesn't help with permanently dead bots.

### Cold streams for App Registry
- Add `ColdStreamsEnabled` to `AppRegistryConfig` (mirroring notifications).
- When enabled, `TrackStream` should only accept bots’ inbox streams during the
  initial `ForAllStreams` pass; channel streams are deferred.
- Modify `StreamsTrackerImpl` to allow channels to be added lazily from
  River events (i.e., when we observe activity via `OnStreamAllocated` or
  `SyncStreams` for a channel, call `AddStream` on demand with
  `ApplyHistoricalContent.Enabled = true`).
- Optionally store a small “recently active streams” cache so we can tear down
  `TrackedStreamView`s after a channel goes idle for N hours. This keeps memory
  usage proportional to active channels while retaining the ability to rejoin
  quickly when they become active again.
