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

## Tracking Scope Problem
- The App Registry currently subscribes to *all* channel streams across the
  network (mirroring the notification service). For each stream it maintains a
  `TrackedStreamViewImpl` even if no bot is a member.
- This wastes memory and CPU—most channels never forward anything to bots. It
  also elongates startup time because MultiSyncRunner must resync every stream
  on restart.
- We need a way to subscribe only to streams where bots are actually installed.
  A practical approach is to consume AppAccount events from the subgraph  
  so we can Add/Remove streams dynamically when bots join or leave channels.

## Bot-side deduplication gap
- The @towns-protocol/bot SDK does not maintain a “seen event” cache. Every
  webhook payload is treated as new work.
- If the App Registry replays minipool events (e.g., after a restart) or a bot’s
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
1. **App Registry persistence**
   - Add a table (e.g., `stream_cookies`) keyed by `stream_id` storing the
     last `SyncCookie` we successfully applied.
   - After every `applyUpdateToStream`, write the returned `NextSyncCookie` to
     that table in the same transaction as any queue mutations.
   - On restart, load cookies for every stream before calling
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

### Webhook failure drops
- Enhance `SubmitMessages` to persist in-flight deliveries so transient webhook
  failures don’t drop messages. Two possible approaches:
  1. Only delete `enqueued_messages` rows after the webhook responds 200; if the
     HTTP call fails, leave the row so the message will be retried automatically.
  2. Or, add a separate “in-flight” table keyed by event hash/device. Insert
     before sending and delete on success; on failure, requeue into
     `enqueued_messages`.
- Either approach ensures webhook timeouts or 5xx responses don’t cause loss.
  (We can combine this with the cookie persistence work since both involve more
  durable bookkeeping around delivery.)

### Unbounded backlog for offline bots
- Introduce retention/quotas for `enqueued_messages`:
  - Track `created_at` per row and add a cleanup job that deletes rows older than
    N days (configurable) to avoid infinite growth.
  - Optionally add per-bot item limits; once a bot exceeds `M` pending messages,
    stop enqueueing and surface an alarm so operators know the backlog needs
    intervention.
- Pair this with better visibility (metrics/alerts) so we know when bots are
  falling behind.

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
