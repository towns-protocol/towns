package syncv3

import (
	"context"
	"sync"

	"github.com/towns-protocol/towns/core/node/logging"
	. "github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/utils/dynmsgbuf"
)

const (
	eventBusBufferSize = 10000
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

type EventBusMessage struct {
	Type         MessageType
	StreamUpdate *SyncStreamsResponse
	Op           Operation
	Cookie       *SyncCookie
	TargetSyncID string
	StreamID     StreamId
}

func NewEventBusMessageUpdateStream(resp *SyncStreamsResponse) *EventBusMessage {
	return &EventBusMessage{
		Type:         MessageUpdateStream,
		StreamUpdate: resp,
	}
}

func NewEventBusMessageSubscribe(op Operation, cookie *SyncCookie) *EventBusMessage {
	return &EventBusMessage{
		Type:   MessageSubscribe,
		Op:     op,
		Cookie: cookie,
	}
}

func NewEventBusMessageUnsubscribe(op Operation, streamID StreamId) *EventBusMessage {
	return &EventBusMessage{
		Type:     MessageUnsubscribe,
		Op:       op,
		StreamID: streamID,
	}
}

func NewEventBusMessageBackfill(op Operation, targetSyncID string, cookie *SyncCookie) *EventBusMessage {
	return &EventBusMessage{
		Type:         MessageBackfill,
		Op:           op,
		TargetSyncID: targetSyncID,
		Cookie:       cookie,
	}
}

type EventBus[T any] interface {
	// AddMessage adds a new message to the event bus.
	AddMessage(msg T) error
}

// eventBus implements the EventBus interface and handles the distribution of messages to operations.
type eventBus struct {
	// ctx is the global node context.
	ctx context.Context
	// log is the logger for the event bus.
	log *logging.Log
	// queue is a dynamic message buffer that holds messages to be processed.
	// This queue contains both stream updates and sync operations.
	// An appropriate message handler is applied depending on the message type.
	queue *dynmsgbuf.DynamicBuffer[EventBusMessage]
	// syncerRegistry is the registry of syncers that handle stream synchronization.
	syncerRegistry SyncerRegistry
	// operationRegistry is the registry of operations that handle stream updates and subscriptions.
	operationRegistry OperationRegistry
}

// NewEventBus creates a new instance of the event bus.
func NewEventBus(
	ctx context.Context,
	queue *dynmsgbuf.DynamicBuffer[EventBusMessage],
	syncerRegistry SyncerRegistry,
	operationRegistry OperationRegistry,
) EventBus[EventBusMessage] {
	eb := &eventBus{
		ctx:               ctx,
		log:               logging.FromCtx(ctx).Named("syncv3-event-bus"),
		queue:             queue,
		syncerRegistry:    syncerRegistry,
		operationRegistry: operationRegistry,
	}
	go eb.startCommandsProcessor()
	return eb
}

// AddMessage adds a new message to the event bus queue for processing.
// Note that both dynamic message buffer and event bus implements the EventBus interface.
func (eb *eventBus) AddMessage(msg EventBusMessage) error {
	return eb.queue.AddMessage(msg)
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
		eb.log.Error("Failed to parse stream ID from SyncStreamsResponse", "error", err)
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

	// Remove the stream from registries if the sync down message is received.
	if msg.GetSyncOp() == SyncOp_SYNC_DOWN {
		eb.operationRegistry.RemoveStream(streamID)
		eb.syncerRegistry.RemoveStream(streamID)
	}
}

// onSubscribe handles the stream subscribe message of a specific operation.
func (eb *eventBus) onSubscribe(op Operation, cookie *SyncCookie) {
	streamID, err := StreamIdFromBytes(cookie.GetStreamId())
	if err != nil {
		eb.log.Error("Failed to parse stream ID from SyncCookie", "error", err)
		return
	}

	// Adding stream to the sync op. Scenarios:
	// 1. If the stream is already syncing for the given op, just skip.
	// 2. If the stream is already syncing for another op, add it to the current op and backfill it - no syncer call.
	// 3. If the stream is not syncing, add it to sync and ONLY after successful syncer call, add it to the registry.
	streamExists, added := eb.operationRegistry.AddOpToExistingStream(streamID, op)

	// Early return if the given stream is already syncing for the given op.
	// This condition means that the stream is already syncing but the given op is not added since it is already there.
	if streamExists && !added {
		return
	}

	// Start syncing stream if not syncing yet.
	if !streamExists {
		// Creating a new context with x2 timeout for the modify sync request just to have an overhead.
		// It is one request (cookie) to the syncer so it could be just doubled.
		ctx, cancel := context.WithTimeout(eb.ctx, modifySyncTimeout*2)
		defer cancel()

		resp, err := eb.syncerRegistry.Modify(ctx, &ModifySyncRequest{AddStreams: []*SyncCookie{cookie}})
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

	// Add stream to the registry after start syncing.
	if !added {
		eb.operationRegistry.AddOpToStream(streamID, op)
	}

	// Creating a new context with x2 timeout for the modify sync request just to have an overhead.
	// It is one request (cookie) to the syncer so it could be just doubled.
	ctx, cancel := context.WithTimeout(eb.ctx, modifySyncTimeout*2)
	defer cancel()

	// Backfill the given stream for the given operation.
	resp, err := eb.syncerRegistry.Modify(ctx, &ModifySyncRequest{
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

// onUnsubscribe handles the stream unsubscribe message of a specific operation.
func (eb *eventBus) onUnsubscribe(op Operation, streamID StreamId) {
	eb.operationRegistry.RemoveOpFromStream(streamID, op.ID())
}

// onBackfill handles the backfill request for a specific operation and target sync ID.
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
	var messages []EventBusMessage
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
				eb.processCommand(msg)
			}

			if !open {
				// TODO: Log error and skip the rest of commands
				// If the queue is closed, we stop processing commands.
				return
			}
		}
	}
}

func (eb *eventBus) processCommand(msg EventBusMessage) {
	switch msg.Type {
	case MessageUpdateStream:
		if msg.StreamUpdate == nil {
			eb.log.Error("Received MessageUpdateStream with nil SyncStreamsResponse")
			return
		}
		eb.onStreamUpdate(msg.StreamUpdate)
	case MessageSubscribe:
		if msg.Cookie == nil {
			eb.log.Error("Received MessageSubscribe with nil EventBusMessageSubscribe")
			return
		}
		eb.onSubscribe(msg.Op, msg.Cookie)
	case MessageUnsubscribe:
		if msg.StreamID == (StreamId{}) {
			eb.log.Error("Received MessageUnsubscribe with nil EventBusMessageUnsubscribe")
			return
		}
		eb.onUnsubscribe(msg.Op, msg.StreamID)
	case MessageBackfill:
		if msg.Cookie == nil {
			eb.log.Error("Received MessageBackfill with nil EventBusMessageBackfill")
			return
		}
		eb.onBackfill(msg.Op, msg.TargetSyncID, msg.Cookie)
	default:
		eb.log.Error("Unknown message type received on event bus", "type", msg.Type)
	}
}
