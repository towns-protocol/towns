# Stream Sync Implemented on Queues

## Overview

This design doc describes implmentation of stream sync engine on top of queues
to prevent blocking and relying on acquiring locks. It's part of the "node" server that is implmented in go.

## API Overview

Node implements `StreamSync` GRPC streaming RPC to stream updates to the client.

When `StreamSync` is received, node replies with sync id (`SYNC_NEW` `SyncStreamsResponse`) that can be used in subsequent
calls to `ModifySync` and `CancelSync`. `AddStreamToSync` and `RemoveStreamFromSync` are
legacy APIs superseeded by `ModifySync` (do not include them in the new implementation).

`StreamSync` call carries initial set of `StreamCookies`. `StreamCookie` contains 
stream id and sync position as a miniblock number in the given stream.

If sync position is within recent history, node streams updates from the given position.
If sync position is in the past, node starts sends "reset" consisting of the last snapshot
miniblock for the given stream and subsequent miniblocks and events.

`ModifySync` call can be used to add/remove/request backfill for streams for the given sync id.

`CancelSync` call can be used to cancel the sync operation.

`SyncStreamsResponse` can contain:
- `SYNC_NEW` - new sync operation started. Contains sync id.
- `SYNC_UPDATE` - new miniblock or event is available. First update for the given stream is always "backfill". 
                  `reset` field is true on backfill if stream couldn't be synced from the given position.
                  Contains new `SyncCookie` for next stream position.
                  In case of node-to-node sync, `TargetSyncIds` is set if this update is backfill and contains sync ids of intended recepients.
                  Note: backfills are intermixed with regular updates, this is used in node-to-node sync to add support multiple clients for 
                  the single node-to-node update stream.
- `SYNC_DOWN` - stream is down. Contains stream id. Typical cause: remote node is down.
- `SYNC_PONG` - pong response to the client's ping
- `SYNC_CLOSE` - sync operation is closed (last response)

## Stream Overview

Stream consists of a sequence of numbered miniblocks and of the recent events in the stream's minipool. 
Each miniblock contains a sequence of events. Some miniblocks contain snapshots.

Each stream is identified by unique stream id.

Nodes host streams. Each node is identified by unique node address. If stream is hosted by the
node, then stream is "local" to the node, otherwise it is "remote".

Stream are replicated to the subset of nodes. If node is down, or there is other problem, sync can be failover to the next node.

## Local and Remote Sync

Node receiving `StreamSync` from client streams updates for local streams directly to the client.

For remote streams, node uses `StreamSync` call to the remote nodes to request updates and forwards them to the client.

If remote becomes unavailable, node sends `SYNC_DOWN` to the client. Client retries with exponential backoff to
add this stream again. Node should attempt to sync this stream from the different remote node if such request is received.

## Implementation

Propose design of next components that interact with each other through asynchronous message passing (i.e. channels):

- `SyncStreamHandler` and `SyncStreamHandlerRegistry` in package `syncv2/handler`
- `EventBus` in package `syncv2/eventbus`
- `LocalSyncer` in package `syncv2/local`
- `RemoteSyncer` in package `syncv2/remote`
- `SyncerRegistry` in package `syncv2/registry`

All packages are subpackages of @core/node/rpc/syncv2

### `SyncStreamHandler` and `SyncStreamHandlerRegistry`

`SyncStreamHandler` is responsible for handling single `StreamSync` request, related `ModifySync` and `CancelSync` calls,
and streaming updates to the client.

`SyncStreamHandler` is created for each `StreamSync` request. It is stored in `SyncStreamHandlerRegistry` and is removed
when `StreamSync` request is closed.

`SyncStreamHandlerRegistry` is used to look up `SyncStreamHandler` by a sync id to dispatch `ModifySync` and `CancelSync` calls.

`SyncStreamHandler` sends messages to `EventBus` to subscribe or to unsubscribe from the streams.

`EventBus` streams all potential updates for the requested streams to the `SyncStreamHandler` queue. When `Subscribe` message is received,
`EventBus` requests backfill for the given stream from the `LocalSyncer` or `RemoteSyncer`. `SyncStreamHandler` can receive updates
before relevant backfill is complete and should filter such updates out and not send them to the client.

`SyncStreamHandler` and `EventBus` communicate only through message passing. `SyncStreamHandler` provides `OnHandlerUpdate` interface which
provides relevant update methods, implementation of these methods save update to the `SyncStreamHandler` internal queue.

### `EventBus`

`EventBus` is responsible for dispatching updates to the `SyncStreamHandler` queues.

`LocalSyncer` and `RemoteSyncer` post updates to the `EventBus` queue through `OnEventBusUpdate` interface.

`EventBus` tracks which `SyncStreamHandler` is interested in which streams and dispatches updates to the relevant queues.

When `Subscribe` message is received for the stream that is not synced yet, `EventBus` calls `SyncerRegistry` to 
initiate update streaming.
If stream is already tracked by the `EventBus`, on `Subscribe` `EventBus` requests new backfill to be generated.
If `Subscribe` or request fails, appropriate error should be sent to the `SyncStreamHandler`.

On `Unsubscribe`, if there are no more subscribers, `EventBus` notifies `SyncerRegistry` to stop tracking this stream.

### `LocalSyncer`

`LocalSyncer` is responsible for streaming updates from the single local stream into the `EventBus` queue.

Backfills can be requested while stream is still being loaded from the local storage. In such case `LocalSyncer`
should save backfill requests and satisfy then once stream is loaded.

### `RemoteSyncer`

`RemoteSyncer` is responsible for streaming updates from the single remote stream into the `EventBus` queue.

`RemoteSyncer` uses `StreamSync` call to the remote node to request updates. It creates new `StreamSync` for
each requested stream. I.e. `RemoteSyncer` tracks single stream and uses singe `StreamSync` exclusively for this stream.

Backfills can be requested while connection to the remote node is still established. In such case `RemoteSyncer`
should save backfill requests and send them to the remote node once `SyncStream` is ready and sync id is received.

### `SyncerRegistry`

`SyncerRegistry` is responsible for tracking `LocalSyncer` and `RemoteSyncer` by stream id.

### Event Ordering

Both `LocalSyncer` and `RemoteSyncer` guarantee event ordering. I.e. they call `OnEventBusUpdate` in the same order as
events are received from the stream. Backfill position is guaranteed: after specific backfill is posted through `OnEventBusUpdate`,
subsequent events are "after" this backfill without any gaps.

`EventBus` guarantees that all `SyncStreamHandlers` will receive events in the same order as they are received from the `LocalSyncer` and `RemoteSyncer`.

## Design Questions

### To be designed: From which componenent backfill is requested?

Potential choices: 
- A. `LocalSyncer` and `RemoteSyncer`
- B. `SyncerRegistry`

In case of A it is implied that `EventBus` should track used `LocalSyncers` and `RemoteSyncers`, which is perhaps undesirable.

In case of B there is a problem of getting wrong backfills/loosing backfills if `RemoteSyncer` is down
and needs to be replaced with the new one or if there is last unsubsribe/new subscribe race (see below).

### To be designed: How to handle last unsubsribe/new subscribe race?

When there are no more subscribers for the stream, `EventBus` should notify `SyncerRegistry` to stop tracking this stream
and in case of `RemoteSyncer` to close `StreamSync` call and stop streaming updates to free resources.

However, if new `Subscribe` comes in at the same time, system needs to be designed in such a way that it will not
incorrectly use syncer being shut down. In other words, new backfill should be correctly requested from the new syncer.

Question: should it be handled on the `SyncerRegistry` level on the individual syncer level? In other words, should 
syncer state machine only move forward INIT->STREAM->SHUTDOWN or should it be possible to move back to INIT? Which
approach makes it easier to correctly free up and re-initialize syncers?

### To be designed: How to handle `RemoteSyncer` failover?

Similar problem arises when `RemoteSyncer` is down and needs to be replaced with the new one. 
In such case, `STREAM_DOWN` is propagated through `EventBus` to the `SyncStreamHandlers`.
However, new `Subscribe` calls should be handled, or at least rejected correctly.

## Instructions

Think very hard and propose design for APIs for each described component in Go.
Do not provide implementation.
Comment each API call and describe in detail how it works.
Describe in detail how questions from "Design Questions" section are addressed.
