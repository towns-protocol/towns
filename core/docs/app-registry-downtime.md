# App Registry Downtime Delivery Problem

When the App Registry service goes offline (planned redeploy or outage) while new
channel events are being produced, those events can be sealed into a miniblock
before the service comes back. Today the tracker starts from a fresh sync on
boot (`ApplyHistoricalContent.Enabled = false`) and treats those sealed events as
"already delivered". Bots that were offline during the downtime therefore miss
any events that were sealed while the App Registry was down.

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

## Additional Reliability Gaps

1. **Webhook failure drop** – When a bot already has the session key, the event is
   sent immediately via `SubmitMessages`. If the HTTPS call to the webhook fails
   (timeout, 5xx, unreachable), we log the error but do not requeue the event.
   Today we assume bots are up whenever they have keys, so a transient webhook
   outage at the wrong time causes permanent loss.

2. **Unbounded backlog for offline bots** – Unsigned events (no session key)
   are persisted in `enqueued_messages` until the bot publishes the missing key.
   There is no TTL or quota, so if a bot stays offline or never repays keys, its
   backlog grows unbounded, limited only by database capacity.

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
