# Metadata Shards

## Code location

Metadata shard CometBFT code: `core/node/metadata/shard.go`.
Storage code: `core/node/storage/pg_metadata_shard_store.go`.

## Current Shape

- Metadata shards run a CometBFT ABCI app (`MetadataShard`) backed by Postgres via `PostgresMetadataShardStore`.
- Shard data lives in per-shard tables plus a shared `metadata` table that records `shard_id`, `last_height`, and `last_app_hash`.
- Transactions are protobuf-encoded (`protocol/metadata_shard.proto`) and passed straight into the ABCI mempool or FinalizeBlock.
- The implementation optimizes for deterministic state transitions and predictable app hashes; snapshot endpoints are stubbed.

## Protocol and Validation

- `MetadataTx` wraps three ops: `CreateStreamTx`, `SetStreamLastMiniblockBatchTx`, and `UpdateStreamNodesAndReplicationTx`.
- `CreateStreamTx`: requires 32-byte `stream_id` and `genesis_miniblock_hash`; `nodes` must be non-empty 20-byte addresses; `replication_factor` > 0 and ≤ len(nodes); if `last_miniblock_num` is 0, a `genesis_miniblock` is required and `last_miniblock_hash` must match the genesis hash, otherwise `last_miniblock_hash` must be 32 bytes. `sealed` can be set at creation.
- `SetStreamLastMiniblockBatchTx`: a non-empty list of `MiniblockUpdate` items; each enforces 32-byte hashes, `last_miniblock_num` > 0, and uses `prev_miniblock_hash` for optimistic concurrency.
- `UpdateStreamNodesAndReplicationTx`: `stream_id` must be 32 bytes; if `nodes` is supplied it must be a list of 20-byte addresses and replaces the current node set; `replication_factor` defaults to the current value when 0 and must remain > 0 and ≤ number of nodes. This op is allowed even on sealed streams (sealing only freezes miniblock pointers).
- The ABCI layer performs stateless checks in `CheckTx`/`PrepareProposal`/`ProcessProposal`; stateful checks happen inside the Postgres store during FinalizeBlock.

## Storage Layout

- Table names derive from the shard id: `md_%04x_s` (streams) with 4-digit hex shard ids.
- Streams table columns: `stream_id` (PK, 32 bytes), `genesis_miniblock_hash` (32 bytes), `genesis_miniblock` (payload), `last_miniblock_hash` (32 bytes), `last_miniblock_num` (BIGINT), `replication_factor` (INT), `sealed` (BOOL), and `nodes` (INT[] of node permanent indexes). The `nodes` array preserves ordering; a GIN index on `nodes` accelerates node→stream lookups.
- Node addresses in protobuf transactions and query responses are resolved to/from permanent indexes using `NodeRecord.PermanentIndex` from the node registry.
- Shared `metadata` table holds one row per shard with last height/hash; created on first `EnsureShardStorage` call. There is no per-block tx log. **Temporary:** the app hash is currently a placeholder derived only from the block height to unblock development. It does not yet commit to shard state and will be replaced with a fixed-depth sparse Merkle tree.

## Execution Flow

- `NewMetadataShard` derives the chain id (`metadata-shard-<hex>`), writes the genesis doc, configures CometBFT for local-friendly defaults (no RPC listener, tighter consensus timeouts), and ensures shard tables exist.
- `SubmitTx` feeds bytes into the mempool `CheckTx`. `Height` reflects the Comet block store height when the node is running.
- `FinalizeBlock` decodes and validates each tx, applies it via `ApplyMetadataTx` (serially inside a tx runner), computes the (temporary) app hash, and caches `{height, appHash}` for `Commit`.
- `Commit` writes `last_height`/`last_app_hash` into the shared `metadata` table using the cached app hash (or recomputing if missing).
- Query endpoints:
  - `/stream/<hex>` (or `req.Data`): returns a single `StreamMetadata` as protojson.
  - `/streams?offset=&limit=`: returns streams ordered by `stream_id` plus count/offset/limit.
  - `/streams/node/<0xaddr>?offset=&limit=`: streams hosted by a node plus count.
  - `/streams/count` and `/streams/count/<0xaddr>`: aggregate counts.
- Snapshot ABCI methods are stubs; InitChain reuses stored shard state when present.

## Store Semantics

- Create stream: enforces unique `stream_id`, validates replication factor against node count, stores the genesis miniblock (empty when starting above height 0), seeds `last_miniblock_hash` from the genesis hash when `last_miniblock_num` is 0, and treats `genesis_miniblock_hash`/`genesis_miniblock` as immutable after creation.
- Miniblock batch: rejects sealed streams, requires `prev_miniblock_hash` to match the current hash, demands `last_miniblock_num` increment by exactly 1, and ORs the `sealed` flag with existing state.
- Update nodes/replication: defaults to the existing node set when `nodes` is empty, allows node and/or replication-factor changes even when sealed, enforces replication factor bounds, and rewrites the stored `nodes` array to keep the provided order.
- Reads: `GetStream`, paginated `ListStreams`, node-filtered listings, counts, and full snapshots (`GetStreamsStateSnapshot`) resolve stored permanent indexes back into ordered node address lists.

## App Hash (Temporary Placeholder)

- **Current behavior:** the app hash is a fake commitment equal to `SHA256(block_height)` (with the height encoded as a big-endian uint64). This is intentionally minimal and exists only to satisfy ABCI/CometBFT plumbing while metadata shard development proceeds.
- **Important:** this hash does *not* reflect the shard’s actual state. Do not rely on it for consensus safety, proofs, or cross-node validation beyond height monotonicity.
- **Future:** the placeholder will be replaced by a real state commitment using a fixed-depth sparse Merkle tree backed by Postgres. At that point, app hashes will deterministically commit to stream metadata and support efficient proofs.

# TODO

- [x] Update database to use single table for streams data using int array and GIN index for nodes (instead of putting nodes in a separate table).
- [ ] Collect block state in memory and only commit when Commit is called in a single transaction.
- [ ] Replace temporary fake app_hash with fixed depth sparse merkle tree with pg backing.
- [ ] Implement snapshotting/export functionality.
- [ ] Add restart, replica change and replica recovery tests.
- [ ] Include node set (and other non-miniblock metadata) in the app_hash inputs so placement-only changes affect consensus state.
- [ ] Persist created/updated block heights for streams to make audits and retries deterministic.
- [ ] Add typed helpers for encoding/submitting metadata shard transactions instead of hand-building proto bytes at call sites.
- [ ] Do not store genesis miniblock and hash in the database. Always rely on ephemeral stream creation codepath.
