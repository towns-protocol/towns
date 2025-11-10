# Abuse Detection Rollout Plan

## Goal

Detect wallet accounts that create excessive numbers of new events (regular or media) and surface the most recent abusers via the `/status` endpoint so operators can take action before adding rate limiting or other protections.

## High-Level Tasks

1. **Define Abuse Policy**
   - Enumerate which RPC methods constitute “event creation” (e.g., `CreateEvent`, `AppendEvent`, media uploads).
   - Choose concrete thresholds, such as `> 600` qualifying calls per minute or `> 10_000` calls over the past 24 hours.
   - Add a configuration block (e.g., `config.AbuseDetection`) to make thresholds tunable without code changes.

2. **Build the Tracker**
   - Implement `abuse.Monitor` (new package under `core/node/rpc/abuse/`) that records timestamps keyed by account address.
   - Use sliding windows (ring buffers + per-account counters) to answer both “current per-minute rate” and “rolling 24 h total”.
   - Expose methods:
     - `RecordCall(user common.Address, now time.Time, kind CallType)`
     - `GetRecentAbusers(now time.Time) []AbuserInfo`
   - Ensure internal cleanup drops entries older than 24 h to keep memory bounded.

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
