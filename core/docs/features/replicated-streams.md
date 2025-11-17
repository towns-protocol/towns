# Replicated Streams: Concise Workflows

## Concepts

- Streams replicate across a quorum of nodes (replication factor N).
- Events are appended to an in‑memory minipool and persisted as they arrive.
- Miniblocks seal ordered events; registry tracks `lastMiniblockHash/Num` on River Chain.
- Nodes outside quorum can reconcile (read + backfill) without voting.

## Stream Creation

- Client sends `CreateStreamRequest` with genesis events and metadata.
- Node validates rules (ids, memberships, entitlements, derived events).
- Build a genesis miniblock from provided events.
- Choose stream nodes; call registry `AllocateStream(streamId, nodes, genesis)`.
- Each node persists genesis, initializes cache, returns a sync cookie to client.

## Add Event

- Client envelopes a `StreamEvent` referencing the last known miniblock (hash, num).
- Node verifies permissions and optional on‑chain proofs; may emit derived side‑effects.
- Ensure local view is caught up (reconcile/backoff if event targets newer miniblock).
- Persist event, add to minipool, notify subscribers; ephemeral events skip persistence.
- Replicate: local write + `NewEventReceived` to quorum peers for fast convergence.

## Miniblock Creation

- On River Chain blocks, a rotating leader attempts miniblock production per stream.
- For replicated streams, gather peer proposals (event hashes + snapshot intent).
- Combine proposals with total quorum: intersect events by quorum; snapshot by vote.
- Create a miniblock candidate; save locally, to quorum peers, and reconcile nodes.
- Batch‑update registry with `SetStreamLastMiniblockBatch` when due.
- On success, apply miniblock (update view + storage + notify). On mismatch, reconcile
  and promote the committed candidate based on registry state.

