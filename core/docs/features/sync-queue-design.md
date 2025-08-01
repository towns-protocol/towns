# Stream Sync Implemented on Queues

## Overview

This design doc describes implementation of stream sync engine on top of queues
to prevent blocking and relying on acquiring locks. It's part of the "node" server that is implemented in go.

NOTE: This design results in using a single remote syncer for a stream that is shared between multiple clients.
In this sense it's a "shared syncer" design. However, currently requests to the same remote node are not
multiplexed into a single `SyncStreams` call. If this feature is going to be required,
it will be addressed in a separate document and implemented later.

## API Overview

Node implements `SyncStreams` GRPC streaming RPC to stream updates to the client.

When `SyncStreams` is received, node replies with sync id (`SYNC_NEW` `SyncStreamsResponse`) that can be used in subsequent
calls to `ModifySync` and `CancelSync`. `AddStreamToSync` and `RemoveStreamFromSync` are
legacy APIs superseded by `ModifySync` (do not include them in the new implementation).

`SyncStreams` call carries initial set of `SyncCookie` structs. `SyncCookie` contains 
stream id and sync position as a miniblock number in the given stream.

If sync position is within recent history, node streams updates from the given position.
If sync position is in the past, node sends "reset" consisting of the last snapshot
miniblock for the given stream and subsequent miniblocks and events.

`ModifySync` call can be used to add/remove/request backfill for streams for the given sync id.

`CancelSync` call can be used to cancel the sync operation.

`SyncStreamsResponse` can contain:
- `SYNC_NEW` - new sync operation started. Contains sync id.
- `SYNC_UPDATE` - new miniblock or event is available. First update for the given stream is always "backfill". 
                  `reset` field is true on backfill if stream couldn't be synced from the given position.
                  Contains new `SyncCookie` for next stream position.
                  In case of node-to-node sync, `TargetSyncIds` is set if this update is backfill and contains sync ids of intended recipients.
                  Note: backfills are intermixed with regular updates, this is used in node-to-node sync to support multiple clients for 
                  the single node-to-node update stream.
- `SYNC_DOWN` - stream is down. Contains stream id. Typical cause: remote node is down.
- `SYNC_PONG` - pong response to the client's ping
- `SYNC_CLOSE` - sync operation is closed (last response)

## Stream Overview

Stream consists of a sequence of numbered miniblocks and the recent events in the stream's minipool. 
Each miniblock contains a sequence of events. Some miniblocks contain snapshots.

Each stream is identified by unique stream id.

Nodes host streams. Each node is identified by unique node address. If stream is hosted by the
node, then stream is "local" to the node, otherwise it is "remote".

Streams are replicated to a subset of nodes. If node is down, or there is other problem, sync can fail over to the next node.

## Local and Remote Sync

Node receiving `SyncStreams` from client streams updates for local streams directly to the client.

For remote streams, node uses `SyncStreams` call to the remote nodes to request updates and forwards them to the client.

If remote node becomes unavailable, node sends `SYNC_DOWN` to the client. Client retries with exponential backoff to
add this stream again. Node should attempt to sync this stream from a different remote node if such request is received.

## Implementation

Propose design of the following components that interact with each other through asynchronous message passing (i.e. channels):

- `SyncStreamHandler` and `SyncStreamHandlerRegistry` in package `syncv3/handler`
- `EventBus` in package `syncv3/eventbus`
- `LocalSyncer` in package `syncv3/local`
- `RemoteSyncer` in package `syncv3/remote`
- `SyncerRegistry` in package `syncv3/registry`

All packages are subpackages of core/node/rpc/syncv3

### `SyncStreamHandler` and `SyncStreamHandlerRegistry`

`SyncStreamHandler` is responsible for handling single `SyncStreams` request, related `ModifySync` and `CancelSync` calls,
and streaming updates to the client.

`SyncStreamHandler` is created for each `SyncStreams` request. It is stored in `SyncStreamHandlerRegistry` and is removed
when `SyncStreams` request is closed.

`SyncStreamHandlerRegistry` is used to look up `SyncStreamHandler` by a sync id to dispatch `ModifySync` and `CancelSync` calls.

`SyncStreamHandler` sends messages to `EventBus` to subscribe or to unsubscribe from the streams.

`EventBus` streams all potential updates for the requested streams to the `SyncStreamHandler` queue. When `Subscribe` message is received,
`EventBus` requests backfill for the given stream from the `LocalSyncer` or `RemoteSyncer`. `SyncStreamHandler` can receive updates
before relevant backfill is complete and should filter such updates out and not send them to the client.

`SyncStreamHandler` and `EventBus` communicate only through message passing. `SyncStreamHandler` provides `OnHandlerUpdate` interface which
provides relevant update methods, implementations of these methods save updates to the `SyncStreamHandler` internal queue.

### `EventBus`

`EventBus` is responsible for dispatching updates to the `SyncStreamHandler` queues.

`LocalSyncer` and `RemoteSyncer` post updates to the `EventBus` queue through the `OnEventBusUpdate` interface.

`EventBus` tracks which `SyncStreamHandler` is interested in which streams and dispatches updates to the relevant queues.

When `Subscribe` message is received, `EventBus` calls `SyncerRegistry` to request backfill and start (or continue)
update streaming. It is guaranteed that after this call either backfill or SYNC_DOWN will be posted to the `EventBus` queue
and propagated to the `SyncStreamHandler` queues.

On `Unsubscribe`, if there are no more subscribers, `EventBus` notifies `SyncerRegistry` to stop tracking this stream.

### `LocalSyncer`

`LocalSyncer` is responsible for streaming updates from a single local stream into the `EventBus` queue.

Backfills can be requested while stream is still being loaded from the local storage. In such case `LocalSyncer`
should save backfill requests and satisfy them once stream is loaded.

### `RemoteSyncer`

`RemoteSyncer` is responsible for streaming updates from a single remote stream into the `EventBus` queue.

`RemoteSyncer` uses `SyncStreams` call to the remote node to request updates. It creates a new `SyncStreams` call for
each requested stream. I.e., `RemoteSyncer` tracks a single stream and uses a single `SyncStreams` exclusively for this stream.

Backfills can be requested while connection to the remote node is being established. In such case `RemoteSyncer`
should save backfill requests and send them to the remote node once `SyncStreams` is ready and sync id is received.

Lifecycle of a single `RemoteSyncer` is INIT->STREAM->SHUTDOWN. On shutdown, `SYNC_DOWN` is sent to the `EventBus`
and it's guaranteed that this syncer will not send any subsequent updates to the `EventBus`.

### `SyncerRegistry`

`SyncerRegistry` is responsible for tracking `LocalSyncer` and `RemoteSyncer` by stream id.

`SyncerRegistry` receives `BackfillAndStreamUpdates` requests from `EventBus`. If there is no existing syncer for the stream,
it creates a new one and requests backfill. If there is an existing syncer, it requests new backfill.
It is guaranteed that after this call either backfill or SYNC_DOWN will be posted to the `EventBus` queue.

### Event Ordering

Both `LocalSyncer` and `RemoteSyncer` guarantee event ordering. I.e., they call `OnEventBusUpdate` in the same order as
events are received from the stream. Backfill position is guaranteed: after specific backfill is posted through `OnEventBusUpdate`,
subsequent events are "after" this backfill without any gaps.

`EventBus` guarantees that all `SyncStreamHandlers` will receive events in the same order as they are received from the `LocalSyncer` and `RemoteSyncer`.

### SYNC_DOWN and automatic unsubscribe

Once SYNC_DOWN is received, components automatically unsubscribe. There is no need to issue `Unsubscribe` call.
This design helps to avoid races between `Unsubscribe` and `Subscribe` calls and races between `SYNC_DOWN` and `Subscribe` calls.
If new `Subscribe` comes in at the same time, it will create new syncer and issue backfill request.
If `SYNC_DOWN` is observed, `SyncStreamHandler` should send it to the client, remove stream from internal tracking, 
and then call `Subscribe` again after client requests new backfill through `ModifySync`.

## Design Questions

### EventBus and SyncerRegistry appear to be tightly coupled

Both components need to react to `SYNC_DOWN` consistently. Given this should they be merged into a single component?

Alternatively, is there a need to introduce syncer generations to simplify failover, and resolve races?

Alternatively, should SyncerRegistry calls be synchronous (i.e. not message passing), and use very scoped locks to update state?
No network or other blocking calls should be performed while `SyncerRegistry` holds internal locks.

## Instructions

Think very hard and propose design for APIs for each described component in Go.
Do not provide implementation.
Comment each API call and describe in detail how it works.
Describe in detail how questions from "Design Questions" section are addressed.
