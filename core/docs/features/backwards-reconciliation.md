# Backwards Reconciliation

## Overview

Backwards reconciliation is a feature that allows the node to reconcile streams with remote replicas
from the current state backwards to the trim limit.

This feature is being implemented in addition to the already existing forward reconciliation.

## Stream Trimming

Stream trimming is the process of deleting historical miniblocks from a stream.

This is done to save space on the node.

Miniblocks are trimmed according to on-chain settings. Trim limit differs by stream type.
Streams can be trimmed only to the snapshot miniblock.

## Snapshot Trimming

Snapshot trimming is the process of deleting historical snapshots from a stream.

This is done to save space on the node.

Snapshots are trimmed according to on-chain settings.

Since Stream Trimming requires snapshot to be present, not all historical snapshots
are deleted, some are kept so stream trimming can be performed.

## Forward Reconciliation

Forward reconciliation is the process of reconciling a stream with a remote replica starting from the
genesis block and going forward to the current state.

As a result of forward reconciliation, stream miniblocks start from 0 and are contiguous.

This conflicts with stream trimming (deleting of historical miniblocks).

## Backwards Reconciliation

Backwards reconciliation is currently being implemented.

Backwards reconciliation is the process of reconciling a stream with a remote replica starting from the
current state and going backwards to the trim limit.

As a result of backwards reconciliation, there can be gaps in the stream miniblocks.

I.e. if replica fell behind, and started to perform backwards reconciliation, there will
be a gap from the historical miniblocks to the recently reconciled miniblocks.

Backwards reconciliation requests current state of the stream through GetStream API.
As such, stream becomes operational (i.e. local GetStream API can work, events can be added),
but local GetMiniblocks API for historical miniblocks will fail and needs to fallback to the
remote replica.

## Selecting Between Forward and Backwards Reconciliation

Streams that are slightly behind should be reconciled with forward reconciliation. In all other cases
backwards reconciliation should be used. There should be on-chain settings to control which stream
should be reconciled with which method.

## Implementation References

- **Reconciler orchestration**: `core/node/events/stream_reconciler.go:103` switches between forward and backward modes using the on-chain threshold, then invokes backwards reinitialization (`core/node/events/stream_reconciler.go:192`) and the gap backfill pass (`core/node/events/stream_reconciler.go:273`).
- **Remote reinitialization and backfill**: `core/node/events/stream_reconciler.go:241` pulls the latest stream state from a peer via `RemoteMiniblockProvider.GetStream`, while page-wise backfill uses `backfillPageFromSinglePeer` to stream miniblocks and persist them locally (`core/node/events/stream_reconciler.go:380`). Stream reinitialization ultimately calls `Stream.reinitialize` to reset cache state (`core/node/events/stream.go:1203`) and `PostgresStreamStore.ReinitializeStreamStorage` / `reinitializeStreamStorageTx` to replace persisted history (`core/node/storage/pg_stream_store.go:2680`, `core/node/storage/pg_stream_store.go:2721`).
- **Gap detection helper**: `core/node/events/range_utils.go:14` computes missing miniblock ranges that backwards reconciliation needs to request from remotes.
- **Storage support**: `core/node/storage/pg_stream_store.go:1048` defines `WritePrecedingMiniblocks`, validating continuity before bulk inserting older miniblocks uncovered during backfill.
- **Configuration knobs**: The backwards reconciliation threshold is exposed through `StreamBackwardsReconciliationThreshold` (`core/node/crypto/config.go:103`) with a default of 50 miniblocks (`core/node/crypto/config.go:339`); the effective history window used for backfills comes from `StreamHistoryMiniblocks.ForType` (`core/node/crypto/config.go:311`).
- **RPC fallback for trimmed history**: `core/node/rpc/forwarder.go:300` retries `GetMiniblocks` on remote replicas when local storage reports `MINIBLOCKS_STORAGE_FAILURE`, enabling clients to read gaps that were trimmed or not yet backfilled (`core/node/rpc/get_miniblocks_test.go:613`).
- **Test coverage**: Behavioural tests in `core/node/events/stream_reconciler_test.go:20` exercise forward vs backward selection and gap backfill flows, while storage edge cases for backfilling are covered in `core/node/storage/pg_stream_store_preceding_test.go:15`.
