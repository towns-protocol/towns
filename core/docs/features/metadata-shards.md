# Metadata Shards Plan

## Goals and Scope
- Store metadata for new streams on metadata shards (CometBFT app per shard, ~10 replicas per shard) instead of the StreamRegistry smart contract; legacy streams stay on-chain.
- Preserve the StreamRegistry feature set for metadata (create/allocate stream, update last miniblock state in batches, node placement/replication metadata, sealing) with deterministic state transitions.
- Keep per-shard state in Postgres tables that are namespaced by `shardId` and accessed through the storage package, then surfaced through the MetadataShard ABCI app.
- Expose a typed Go API on `MetadataShard` for stream operations and reads, backed by protobuf-encoded CometBFT transactions.

## Assumptions and Non-Goals
- Metadata shards live alongside existing River node Postgres; no cross-shard queries are required inside a single ABCI block execution.
- Stream assignment to shards is driven by node config (e.g., consistent hash over streamId); the plan covers plumbing, not the assignment algorithm.
- No migration of existing on-chain metadata is required; dual-read/write paths will gate by a feature flag or stream provenance.

## Development Plan

### 1) Protocol Definition
- Add `protocol/metadata_shard.proto` with `package river.metadata` (Go package `github.com/towns-protocol/towns/core/node/protocol`) that defines:
  - `MetadataTx` envelope with `oneof op`.
  - `CreateStreamTx` (stream_id bytes32, genesis_miniblock_hash bytes32, genesis_miniblock bytes, nodes []bytes20, flags uint64, replication_factor uint32, sealed bool).
  - `SetStreamLastMiniblockBatchTx` containing repeated `MiniblockUpdate` (stream_id, prev_miniblock_hash, last_miniblock_hash, last_miniblock_num, sealed flag).
  - `UpdateStreamNodesAndReplicationTx`  to mirror contract features (node set changes, replication factor updates).
  - `StreamMetadata` struct used in queries (stream_id, shard_id, genesis_miniblock_hash, last_miniblock_hash, last_miniblock_num, nodes, flags, replication_factor, sealed, created_at_height, updated_at_height).
- Wire proto into buf generation (`buf.gen.yaml` if needed) and ensure `go generate ./core/node/protocol` re-emits Go types.

### 2) Storage Layer (Postgres)
- Create `core/node/storage/pg_metadata_shard_store.go` with a struct that owns a pgx pool reference and shardId; follow existing storage patterns (ctx-aware logging, `pgTxTracker`, traced transactions).
- Table naming per shard: derive short prefixes using the uint64 shardId, e.g., `msh_<shardId>_streams`, `msh_<shardId>_stream_nodes`, `msh_<shardId>_tx_log`, `msh_<shardId>_state`. Use `fmt.Sprintf("msh_%016x_*", shardId)` to keep deterministic names.
- Table schemas:
  - Streams: `stream_id BYTEA PK`, `genesis_miniblock_hash BYTEA`, `genesis_miniblock BYTEA`, `last_miniblock_hash BYTEA`, `last_miniblock_num BIGINT`, `flags BIGINT`, `replication_factor SMALLINT`, `sealed BOOL`, `created_at_height BIGINT`, `updated_at_height BIGINT`.
  - Stream nodes: `stream_id BYTEA`, `node_addr BYTEA`, `PRIMARY KEY(stream_id, node_addr)` for reverse lookups.
  - Tx log/state: per-block app hash inputs, last_height, last_app_hash to support deterministic `Commit`.
- Initialization: expose `EnsureShardStorage(ctx)` that creates tables for a shard if missing inside a transaction; reuse pattern from `PostgresStreamStore` migrations.
- Mutators:
  - `CreateStream(ctx, shardId, CreateStreamTx, height)` validating uniqueness, node list non-empty, and initial state defaults.
  - `ApplyMiniblockBatch(ctx, updates, height)` verifying `prev_miniblock_hash`/`miniblock_num` monotonicity and sealed flag; reject mismatched state with `RiverError`.
  - `UpdateStreamNodes/ReplicationFactor` helpers if included in proto, enforcing invariants (no removal on sealed streams, etc.).
- Readers:
  - `GetStream(ctx, streamID)`, `ListStreams(ctx, start, limit)`, `ListStreamsByNode(ctx, nodeAddr, start, limit)`, `Counts`.
  - `GetAppState(ctx)` returning deterministic hash inputs (e.g., sorted stream ids + last_miniblock_hash/num + sealed flag + replication_factor) for `Commit`.

### 3) ABCI Implementation in `core/node/metadata/shard.go`
- Extend `MetadataShard` to hold a storage handle (pg store) and shardId; inject DB connection in constructor.
- `InitChain`: ensure shard tables exist, load last committed height/app hash from storage, and set consensus params (no empty blocks remains fine).
- `CheckTx`: decode `MetadataTx`, run stateless validation (field lengths, required fields, node list sizes), and optionally soft-check current state via storage with a read-only connection.
- `PrepareProposal/FinalizeBlock`: iterate txs in order, apply to storage in a single transaction scoped to the Comet block height; collect per-tx events/codes in `FinalizeBlockResponse`.
- `Commit`: compute deterministic app hash from storage snapshot (e.g., xxhash over sorted `stream_id|last_hash|last_num|sealed|replication_factor`) and persist `last_height/app_hash` to the shard state table.
- `Query`: support basic queries for node internals (get stream by id, paginate streams, count streams, shard health) using the storage readers.
- Snapshot methods: keep stubbed but gated with TODO to implement pg-based snapshot export/import later.

### 4) MetadataShard Go API
- Add typed helpers on `MetadataShard` to wrap proto encoding and mempool submission:
  - `CreateStream(ctx, params)` -> encode `CreateStreamTx`, submit via `SubmitTx`, optionally wait for height commit (poll block store).
  - `SetStreamLastMiniblockBatch(ctx, updates)` -> encode `SetStreamLastMiniblockBatchTx`.
  - `UpdateStreamNodes/ReplicationFactor` methods if implemented.
  - Read helpers that hit `Query`/storage for internal callers (`GetStream`, `StreamsOnNode`, `StreamCount`).
- Update `shard_test.go` into integration tests that create streams, push miniblock batches, and assert replicated state across nodes via queries and app hash consistency.

### 5) Node Integration and Routing
- Introduce a metadata shard directory in config (list of shardIds + peer addresses + Postgres DSN) and a shard selection helper (hashing streamId or configured mapping).
- When creating new streams, route metadata writes to the chosen shard via `MetadataShard.CreateStream` instead of the River StreamRegistry contract.
- When producing miniblocks, switch the metadata write path: if stream is marked as shard-backed, call `SetStreamLastMiniblockBatch` on that shard; otherwise keep the contract call for legacy.
- Update read paths (`StreamCache`/reconciler) to fetch metadata from the shard when the stream is shard-backed, with fallback to the contract for legacy streams; include a flag on stream metadata to indicate storage backend.
- Ensure observability/metrics: per-shard tx latency, app hash, height, failed tx counts.

### 6) Testing and Rollout
- Unit tests for storage validation (duplicate stream creation, bad prev hash, sealing rules, node set updates) using pgx test harness.
- ABCI integration tests: multi-node shard spinning in memory verifying height sync, deterministic app hash, and block rollback safety.
- Routing tests: create a shard-backed stream, produce miniblocks, ensure `StreamCache` and RPC responses read from shard data.
- Add feature flag/defaults: start with disabled shard writes, enable per-environment, and include migration scripts to provision shard tables.

### 7) Follow-Ups / Risks
- Define the deterministic app hash function carefully to avoid hash drift across nodes; prefer ordered materialization from SQL.
- Plan for snapshotting/export if shard catch-up is needed (could reuse Postgres logical backups in the interim).
- Clarify replication factor semantics in shards vs. contract; if duplicated, keep a single source of truth and reconcile conflicts.
