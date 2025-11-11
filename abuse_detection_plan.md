# Abuse Detection Rollout Plan

## Goal

Detect wallet accounts that create excessive numbers of new events (regular or media) and surface the most recent abusers via the `/status` endpoint so operators can take action before adding rate limiting or other protections.

## High-Level Tasks

1. **Define Abuse Policy**
   - Enumerate which RPC methods constitute “event creation” (e.g., `CreateEvent`, `AppendEvent`, media uploads).
   - Choose concrete thresholds, such as `> 600` qualifying calls per minute or `> 10_000` calls over the past 24 hours.
   - Add a configuration block (e.g., `config.AbuseDetection`) to make thresholds tunable without code changes.

### Event-Creation RPC Methods

The following RPCs currently emit new user-visible events and count toward abuse scoring:

- `StreamService/AddEvent` — standard text/JSON events appended to a stream.
- `StreamService/AddMediaEvent` — media uploads (attachments, large payloads) appended to a stream.
- `StreamService/CreateMediaStream` — creates a new media stream and implicitly emits corresponding events.

If additional endpoints start producing events (e.g., future bulk APIs), update this list so the tracker stays aligned with product behavior.

2. **Build the Tracker**
   - Implement `abuse.Monitor` (new package under `core/node/rpc/abuse/`) that records timestamps keyed by account address.
   - Use sliding windows (ring buffers + per-account counters) to answer both “current per-minute rate” and “rolling 24 hours total”.
   - Expose methods:
     - `RecordCall(user common.Address, now time.Time, kind CallType)` — invoked whenever a qualifying RPC succeeds.
     - `Snapshot(now time.Time) []AbuserInfo` — returns current offenders with their per-minute totals, rolling 24 h totals, and `lastSeen`.
     - `Cleanup(now time.Time)` — optional helper to prune idle entries (older than 24 h).
   - Implementation details:
     - `Monitor` holds a `sync.Mutex`, config thresholds (per-minute limit, per-day limit, max results), and a map `map[common.Address]*userStats`.
     - Each `userStats` contains two circular buffers (e.g., 60×1 s slots for the minute window, 24×1 h slots for the daily window) per call type, running sums per call type, and `lastSeen`.
     - `RecordCall` advances both rings to `now`, zeroes skipped slots (adjusting running sums for the relevant call type), increments the current slots for that type, bumps the running sums, and updates `lastSeen`.
     - `Snapshot` iterates the map under lock, filters users exceeding either threshold for any call type, sorts/truncates to `MaxResults`, and returns a copy so callers do not hold the mutex. Entries should indicate which call type triggered the alert so operators know whether it was standard events vs. media streams.
     - `Cleanup` drops map entries whose `lastSeen` is older than 24 h to bound memory; call it periodically (ticker) or opportunistically when the map size crosses a high-water mark.

3. **Instrument Event-Creation Paths**
   - Identify all RPC handlers that create events or media.
   - After authentication (when `authentication.UserFromAuthenticatedContext` is available) and before executing handler logic, call `monitor.RecordCall`.
   - Share a single monitor instance inside `rpc.Service` so every handler reports to it.

4. **Expose Abusers via `/status`**
   - Extend `Service.handleStatus` to include a new field, e.g., `recent_abusers`.
   - For each abuser, return wallet address, current per-minute rate, and rolling 24 h total (and optionally the time of last observed call).

5. **Testing & Documentation**
   - Unit-test the monitor for threshold triggering, window expiration, and cleanup.
   - Add integration-style tests ensuring `/status` outputs the expected data when the monitor flags an account.
   - Document the new status field and abuse policy in `core/AGENTS.md` (and any operator docs) so on-call engineers know how to interpret the data.

## Open Questions / Next Steps

- Finalize threshold numbers for both per-minute and per-24-hour limits.
- Decide whether different call types (regular vs. media events) require separate thresholds.
- Determine retention/visibility requirements (e.g., maximum number of abusers to report, anonymization concerns).
