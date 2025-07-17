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

## Already Implemented Features

- [PR #3550](https://github.com/towns-protocol/towns/pull/3550): **feat: implement ReinitializeStreamStorage for PostgreSQL storage**
  - Adds `ReinitializeStreamStorage` method to create or update stream storage with miniblocks
  - Enables storage layer to handle non-contiguous miniblock sequences
  - Foundation for backward reconciliation support

- [PR #3568](https://github.com/towns-protocol/towns/pull/3568): **feat: add WritePrecedingMiniblocks for backfilling gaps in storage**
  - Implements `WritePrecedingMiniblocks` to backfill miniblock gaps during reconciliation
  - Allows insertion of historical miniblocks before existing ones
  - Essential for backward reconciliation gap filling

- [PR #3571](https://github.com/towns-protocol/towns/pull/3571): **feat: extend GetStream RPC for backward stream reconciliation**
  - Extends `GetStream` RPC with `GetResetStreamAndCookieWithPrecedingMiniblocks`
  - Returns current stream state with configurable number of preceding miniblocks
  - Enables streams to become operational quickly during backward reconciliation

- [PR #3584](https://github.com/towns-protocol/towns/pull/3584): **refactor: simplify snapshot handling in miniblocks**
  - Refactors snapshot handling logic in the miniblocks system
  - Improves code clarity and maintainability for snapshot-related operations
  - Prepares codebase for backward reconciliation implementation

## TODO

- [ ] Extend storage layer to report gaps in the stream miniblocks, so gaps can be filled
- [ ] Modify GetMiniblocks API to fallback to remote replica if miniblocks are not available locally
- [ ] Implement backward reconciliation logic in @core/node/events
- [ ] Trigger backwards or forward reconciliation based on on-chain settings





