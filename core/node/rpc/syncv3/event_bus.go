package syncv3

import (
	"context"
	"fmt"
	"sync"

	"github.com/towns-protocol/towns/core/node/logging"
	. "github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/utils/dynmsgbuf"
)

type MessageType uint8

const (
	// MessageUpdateStream is sent when a stream is updated.
	MessageUpdateStream MessageType = iota
	// MessageSubscribe is sent when a new sync operation is created and a stream is added to it.
	MessageSubscribe
	// MessageUnsubscribe is sent when a stream is removed from a sync operation.
	MessageUnsubscribe
	// MessageBackfill is sent when a stream is backfilled.
	MessageBackfill
)

func NewEventBusMessageUpdateStream(resp *SyncStreamsResponse) *EventBusMessage {
	return &EventBusMessage{
		Type:         MessageUpdateStream,
		StreamUpdate: resp,
	}
}

type EventBusMessageSubscribe struct {
	Op     Operation
	Cookie *SyncCookie
}

func NewEventBusMessageSubscribe(op Operation, cookie *SyncCookie) *EventBusMessage {
	return &EventBusMessage{
		Type:      MessageSubscribe,
		Subscribe: &EventBusMessageSubscribe{Op: op, Cookie: cookie},
	}
}

type EventBusMessageUnsubscribe struct {
	Op       Operation
	StreamID StreamId
}

func NewEventBusMessageUnsubscribe(op Operation, streamID StreamId) *EventBusMessage {
	return &EventBusMessage{
		Type:        MessageUnsubscribe,
		Unsubscribe: &EventBusMessageUnsubscribe{Op: op, StreamID: streamID},
	}
}

type EventBusMessageBackfill struct {
	Op           Operation
	TargetSyncID string
	Cookie       *SyncCookie
}

func NewEventBusMessageBackfill(op Operation, targetSyncID string, cookie *SyncCookie) *EventBusMessage {
	return &EventBusMessage{
		Type:     MessageBackfill,
		Backfill: &EventBusMessageBackfill{Op: op, TargetSyncID: targetSyncID, Cookie: cookie},
	}
}

type EventBusMessage struct {
	Type         MessageType          // Type of the message, used to route the message to the right handler
	StreamUpdate *SyncStreamsResponse // stream ID
	Subscribe    *EventBusMessageSubscribe
	Unsubscribe  *EventBusMessageUnsubscribe
	Backfill     *EventBusMessageBackfill
}

type EventBus interface {
	// OnUpdate is called with the given message on every received update for further routing to the right subscribers.
	OnUpdate(msg EventBusMessage) error
}

type eventBus struct {
	ctx               context.Context
	queue             *dynmsgbuf.DynamicBuffer[*EventBusMessage]
	syncerRegistry    SyncerRegistry
	operationRegistry OperationRegistry
}

func NewEventBus(
	ctx context.Context,
	queue *dynmsgbuf.DynamicBuffer[*EventBusMessage],
	syncerRegistry SyncerRegistry,
	operationRegistry OperationRegistry,
) EventBus {
	eb := &eventBus{
		ctx:               ctx,
		queue:             queue,
		syncerRegistry:    syncerRegistry,
		operationRegistry: operationRegistry,
	}
	go eb.startCommandsProcessor()
	return eb
}

func (eb *eventBus) OnUpdate(msg EventBusMessage) error {
	return eb.queue.AddMessage(&msg)
}

// onStreamUpdate distributes the given message to the appropriate operations in the registry.
// If the message has target sync IDs, it sends the message to the first operation associated with the first target sync ID.
// If no target sync IDs are present, it sends the message to all operations associated with the specified stream ID.
func (eb *eventBus) onStreamUpdate(msg *SyncStreamsResponse) {
	if len(msg.GetTargetSyncIds()) > 0 {
		op, exists := eb.operationRegistry.GetOp(msg.GetTargetSyncIds()[0])
		if exists {
			op.OnStreamUpdate(msg)
		}
		return
	}

	streamID, err := StreamIdFromBytes(msg.StreamID())
	if err != nil {
		logging.FromCtx(eb.ctx).Error("Failed to parse stream ID from SyncStreamsResponse", "error", err)
		return
	}

	ops := eb.operationRegistry.GetStreamOps(streamID)
	if len(ops) == 0 {
		return
	}

	var wg sync.WaitGroup
	wg.Add(len(ops))
	for _, op := range ops {
		go func(op Operation) {
			op.OnStreamUpdate(&SyncStreamsResponse{
				SyncId:   msg.GetSyncId(),
				SyncOp:   msg.GetSyncOp(),
				Stream:   msg.GetStream(),
				StreamId: msg.GetStreamId(),
			})
			wg.Done()
		}(op)
	}
	wg.Wait()

	// Remove the stream from the operation registry if the sync down message is received.
	if msg.GetSyncOp() == SyncOp_SYNC_DOWN {
		eb.operationRegistry.RemoveStream(streamID)
	}
}

func (eb *eventBus) onSubscribe(op Operation, cookie *SyncCookie) {
	streamID, err := StreamIdFromBytes(cookie.GetStreamId())
	if err != nil {
		logging.FromCtx(eb.ctx).Error("Failed to parse stream ID from SyncCookie", "error", err)
		return
	}

	// Adding stream to the sync op. Scenarios:
	// 1. If the stream is already syncing for the given op, just backfill it(or skip?) - no syncer call.
	// 2. If the stream is already syncing for another op, add it to the current op and backfill it - no syncer call.
	// 3. If the stream is not syncing, add it to sync and ONLY after successful syncer call, add it to the registry.
	streamExists, added := eb.operationRegistry.AddOpToExistingStream(streamID, op)

	// Early return if the given stream is already syncing for the given op.
	// This condition means that the stream is already syncing but the given op is not added since it is already there.
	if streamExists && !added {
		return
	}

	fmt.Println("onSubscribe", streamID, "exists:", streamExists, "added:", added)

	// 1. Start syncing stream if not syncing yet.
	if !streamExists {
		// TODO: Add timeout to context
		resp, err := eb.syncerRegistry.Modify(eb.ctx, &ModifySyncRequest{SyncId: op.ID(), AddStreams: []*SyncCookie{cookie}})
		if err != nil {
			// Send sync down message with the given error. TODO: Add message to sync down resp.
			op.OnStreamUpdate(&SyncStreamsResponse{StreamId: streamID[:], SyncOp: SyncOp_SYNC_DOWN})
			return
		} else if len(resp.GetAdds()) > 0 {
			// Send sync down message with the given error. TODO: Add message to sync down resp
			op.OnStreamUpdate(&SyncStreamsResponse{StreamId: streamID[:], SyncOp: SyncOp_SYNC_DOWN})
			return
		}
	}

	// 2. Add stream to the registry after start syncing.
	if !added {
		eb.operationRegistry.AddOpToStream(streamID, op)
	}

	// 3. Backfill the given stream for the given operation.
	resp, err := eb.syncerRegistry.Modify(eb.ctx, &ModifySyncRequest{
		SyncId: op.ID(),
		BackfillStreams: &ModifySyncRequest_Backfill{
			SyncId:  op.ID(),
			Streams: []*SyncCookie{cookie},
		},
	})
	if err != nil {
		// rvrErr := AsRiverError(err)
		eb.operationRegistry.RemoveOpFromStream(streamID, op.ID())
		//  Send sync down message with the given error. TODO: Add message to sync down resp
		op.OnStreamUpdate(&SyncStreamsResponse{StreamId: streamID[:], SyncOp: SyncOp_SYNC_DOWN})
		return
	} else if len(resp.GetBackfills()) > 0 {
		eb.operationRegistry.RemoveOpFromStream(streamID, op.ID())
		// Send sync down message with the given error. TODO: Add message to sync down resp
		op.OnStreamUpdate(&SyncStreamsResponse{StreamId: streamID[:], SyncOp: SyncOp_SYNC_DOWN})
		return
	}
}

// TODO: Let syncer registry know to stop syncing if no subscribers are left
func (eb *eventBus) onUnsubscribe(op Operation, streamID StreamId) {
	eb.operationRegistry.RemoveOpFromStream(streamID, op.ID())
}

func (eb *eventBus) onBackfill(op Operation, targetSyncID string, cookie *SyncCookie) {
	resp, err := eb.syncerRegistry.Modify(eb.ctx, &ModifySyncRequest{
		SyncId: op.ID(),
		BackfillStreams: &ModifySyncRequest_Backfill{
			SyncId:  targetSyncID,
			Streams: []*SyncCookie{cookie},
		},
	})
	if err != nil {
		// rvrErr := AsRiverError(err)
		// TODO: Log error? Or send sync down message?
		return
	} else if len(resp.GetBackfills()) > 0 {
		// rvrErr := AsRiverError(err)
		// TODO: Log error? Or send sync down message?
		return
	}
}

func (eb *eventBus) startCommandsProcessor() {
	var messages []*EventBusMessage
	for {
		select {
		case <-eb.ctx.Done():
			return
		case _, open := <-eb.queue.Wait():
			messages = eb.queue.GetBatch(messages)

			// nil msgs indicates the buffer is closed.
			if messages == nil {
				// TODO: Log error and skip the rest of commands
				return
			}

			// Process messages from the current batch one by one.
			for _, msg := range messages {
				switch msg.Type {
				case MessageUpdateStream:
					if msg.StreamUpdate == nil {
						logging.FromCtx(eb.ctx).Error("Received MessageUpdateStream with nil SyncStreamsResponse")
						return
					}
					eb.onStreamUpdate(msg.StreamUpdate)
				case MessageSubscribe:
					if msg.Subscribe == nil {
						logging.FromCtx(eb.ctx).Error("Received MessageSubscribe with nil EventBusMessageSubscribe")
						return
					}
					eb.onSubscribe(msg.Subscribe.Op, msg.Subscribe.Cookie)
				case MessageUnsubscribe:
					if msg.Unsubscribe == nil {
						logging.FromCtx(eb.ctx).Error("Received MessageUnsubscribe with nil EventBusMessageUnsubscribe")
						return
					}
					eb.onUnsubscribe(msg.Unsubscribe.Op, msg.Unsubscribe.StreamID)
				case MessageBackfill:
					if msg.Backfill == nil {
						logging.FromCtx(eb.ctx).Error("Received MessageBackfill with nil EventBusMessageBackfill")
						return
					}
					eb.onBackfill(msg.Backfill.Op, msg.Backfill.TargetSyncID, msg.Backfill.Cookie)
				default:
					logging.FromCtx(eb.ctx).Error("Unknown message type received on event bus", "type", msg.Type)
				}
			}

			if !open {
				// TODO: Log error and skip the rest of commands
				// If the queue is closed, we stop processing commands.
				return
			}
		}
	}
}
