package eventbus

import (
	"context"
	"slices"
	"sync"

	"github.com/towns-protocol/towns/core/node/logging"
	. "github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/rpc/syncv3/syncer"
	. "github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/utils/dynmsgbuf"
)

var (
	_ StreamSubscriptionManager = (*eventBusImpl)(nil)
	_ syncer.StreamSubscriber   = (*eventBusImpl)(nil)
)

type (
	// StreamSubscriber subscribes to stream updates.
	StreamSubscriber interface {
		// OnUpdate is called when there is a stream update available.
		// Each subscriber receives its own copy of the update.
		//
		// Subscribers MUST NOT block when processing the given update.
		//
		// When update.SyncOp is SyncOp_SYNC_DOWN the subscriber is automatically unsubscribed
		// from future updates on the stream. It is expected that this update is sent to the client
		// and that the client will resubscribe with a backoff mechanism.
		OnUpdate(update *SyncStreamsResponse)
	}

	// StreamSubscriptionManager allows subscribers to subscribe and unsubscribe on/from stream updates.
	StreamSubscriptionManager interface {
		// Subscribe on stream events.
		//
		// Implementation must make this a non-blocking operation.
		//
		// This can fail with (Err_NOT_FOUND) when the stream is not found.
		// If the subscriber is already subscribed to the stream, this is a noop.
		//
		// When the subscriber receives a SyncOp_SYNC_DOWN stream update the subscriber is automatically
		// unsubscribed from the stream and won't receive further updates.
		Subscribe(streamID StreamId, subscriber StreamSubscriber) error

		// Unsubscribe from events.
		//
		// Implementation must make this a non-blocking operation.
		//
		// Note that unsubscribing happens automatically when the subscriber
		// receives a SyncOp_SYNC_DOWN update for the stream.
		//
		// If the subscriber is not subscribed to the stream, this is a noop.
		Unsubscribe(streamID StreamId, subscriber StreamSubscriber) error

		// Backfill requests a backfill message.
		//
		// The target syncer will request a stream update message by the given cookie and send it
		// back to the target sync operation through the given chain of sync IDs.
		Backfill(cookie *SyncCookie, syncIDs ...string) error
	}

	eventBusMessageSub struct {
		streamID   StreamId
		subscriber StreamSubscriber
	}

	eventBusMessageUnsub struct {
		streamID   StreamId
		subscriber StreamSubscriber
	}

	eventBusMessageBackfill struct {
		cookie  *SyncCookie
		syncIDs []string
	}

	// eventBusMessage is put on the internal event bus queue for processing in eventBusImpl.run.
	eventBusMessage struct {
		update   *SyncStreamsResponse
		sub      *eventBusMessageSub
		unsub    *eventBusMessageUnsub
		backfill *eventBusMessageBackfill
	}

	// eventBusImpl is a concrete implementation of the StreamUpdateEmitter and StreamSubscriber interfaces.
	// It is responsible for handling stream updates from syncer.StreamUpdateEmitter and distributes updates
	// to subscribers. As such it keeps track of which subscribers are subscribed on updates on which streams.
	eventBusImpl struct {
		// log is the event bus named logger
		log *logging.Log
		// TODO: discuss if we want to have an unbounded queue here?
		// Processing items on the queue should be fast enough to always keep up with the added items.
		queue *dynmsgbuf.DynamicBuffer[*eventBusMessage]
		// registry is the syncer registry.
		registry syncer.Registry
		// subscribers is the list of subscribers grouped by stream ID
		subscribers map[StreamId][]StreamSubscriber
	}
)

// New creates a new instance of the event bus implementation.
//
// It creates an internal queue for stream updates and a background goroutine that reads updates from this queue
// and distributes them to subscribers.
func New(
	ctx context.Context,
	registry syncer.Registry,
) *eventBusImpl {
	e := &eventBusImpl{
		log:         logging.FromCtx(ctx).Named("syncv3.eventbus"),
		queue:       dynmsgbuf.NewDynamicBuffer[*eventBusMessage](),
		registry:    registry,
		subscribers: make(map[StreamId][]StreamSubscriber),
	}
	go e.run(ctx)
	return e
}

// OnStreamEvent adds the update to an internal queue. This queue guarantees ordering of incoming updates
// and doesn't block the caller.
//
// Implements syncer.StreamSubscriber interface.
//
// There is a background goroutine that reads updates from this queue and forwards the update to subscribers
// on the stream. If the update is a SyncOp_SYNC_DOWN update, all subscribers are automatically unsubscribed
// from the stream. A stream down message could be an indicator for a client to re-subscribe on a given stream.
//
// TODO: Add retry mechanism?
func (e *eventBusImpl) OnStreamEvent(update *SyncStreamsResponse) {
	err := e.queue.AddMessage(&eventBusMessage{update: update})
	if err == nil {
		// All good, just return
		return
	}

	streamID, parseErr := StreamIdFromBytes(update.StreamID())
	if parseErr != nil {
		e.log.Errorw("failed to unsubscribe: failed to parse stream id",
			"streamID", update.StreamID(), "error", err, "parseErr", parseErr)
		return
	}

	e.log.Errorw("failed to add stream update message to the queue", "streamID", streamID, "error", err)

	// Unsubscribe event bus from receiving updates of the given stream.
	e.registry.Unsubscribe(streamID, e)

	// TODO: Send sync down message. What if the given message cannot be added to the queue as well? Sending directly to clients?
}

// Subscribe adds the given subscriber to the stream updates.
func (e *eventBusImpl) Subscribe(streamID StreamId, subscriber StreamSubscriber) error {
	// 1. Check if the stream exists, if not return Err_NOT_FOUND
	// (TODO: determine how to determine if a stream exists to prevent locking subscribe too long, or pushing a command

	// 2. Add command to e.queue that adds the subscriber to the stream's subscriber list in eventBusImpl.run.
	//
	// An error might indicate that either the queue is full and the error must be returned to the caller to indicate
	// that subscribing failed. Or the message is added to the queue, and the subscriber is guaranteed to
	// receive stream updates. It will receive SyncOp_SYNC_DOWN when something bad happens and the subscriber
	// is automatically unsubscribed.
	return e.queue.AddMessage(&eventBusMessage{
		sub: &eventBusMessageSub{
			streamID:   streamID,
			subscriber: subscriber,
		},
	})
}

// Unsubscribe removes the given subscriber from the stream updates.
func (e *eventBusImpl) Unsubscribe(streamID StreamId, subscriber StreamSubscriber) error {
	return e.queue.AddMessage(&eventBusMessage{
		unsub: &eventBusMessageUnsub{
			streamID:   streamID,
			subscriber: subscriber,
		},
	})
}

// Backfill requests a backfill message for the given cookie and sync IDs.
func (e *eventBusImpl) Backfill(cookie *SyncCookie, syncIDs ...string) error {
	return e.queue.AddMessage(&eventBusMessage{
		backfill: &eventBusMessageBackfill{
			cookie:  cookie,
			syncIDs: syncIDs,
		},
	})
}

// run starts processing commands from the queue.
func (e *eventBusImpl) run(ctx context.Context) {
	var msgs []*eventBusMessage
	for {
		var open bool
		select {
		case <-ctx.Done():
			if err := ctx.Err(); err != nil {
				e.log.Errorw("failed to process commands from the queue, context cancelled", "error", err)
			} else {
				e.log.Infow("closing commands processor")
			}
			return
		case _, open = <-e.queue.Wait():
		}

		msgs = e.queue.GetBatch(msgs)

		// nil msgs indicates the buffer is closed.
		if msgs == nil {
			// TODO: Log error and skip the rest of commands
			return
		}

		// Process messages from the current batch one by one.
		for _, msg := range msgs {
			if msg.update != nil {
				e.processStreamUpdateCommand(msg.update)
			} else if msg.sub != nil {
				e.processSubscribeCommand(msg.sub)
			} else if msg.unsub != nil {
				e.processUnsubscribeCommand(msg.unsub)
			} else if msg.backfill != nil {
				e.processBackfillCommand(msg.backfill)
			}
		}

		if !open {
			// TODO: Log error and skip the rest of commands
			// If the queue is closed, we stop processing commands.
			return
		}
	}
}

func (e *eventBusImpl) processStreamUpdateCommand(msg *SyncStreamsResponse) {
	if msg == nil {
		return
	}

	if len(msg.GetTargetSyncIds()) > 0 {
		// TODO: Send update to msg.GetTargetSyncIds()[0]
		return
	}

	streamID, err := StreamIdFromBytes(msg.StreamID())
	if err != nil {
		e.log.Errorw("failed to parse stream id from the stream update message",
			"streamID", msg.StreamID(), "error", err)
		return
	}

	subscribers, ok := e.subscribers[streamID]
	if !ok {
		// No subscribers for the given stream, do nothing
		return
	}

	var wg sync.WaitGroup
	wg.Add(len(subscribers))
	for _, sub := range subscribers {
		go func(sub StreamSubscriber) {
			// Create a copy of the update and unset syncID because each subscriber has its own unique syncID.
			// All other fields can be set by reference/pointer to prevent needless copying.
			sub.OnUpdate(&SyncStreamsResponse{
				SyncOp:   msg.GetSyncOp(),
				Stream:   msg.GetStream(),
				StreamId: msg.GetStreamId(),
			})
			wg.Done()
		}(sub)
	}
	wg.Wait()

	// Remove the stream from registries if the sync down message is received.
	if msg.GetSyncOp() == SyncOp_SYNC_DOWN {
		delete(e.subscribers, streamID)
	}
}

func (e *eventBusImpl) processSubscribeCommand(msg *eventBusMessageSub) {
	if msg == nil {
		return
	}

	currentSubscribers, ok := e.subscribers[msg.streamID]
	if !ok {
		// Event bus is not subscribed on updates of the given stream. Subscribe first.
		e.subscribers[msg.streamID] = []StreamSubscriber{msg.subscriber}
		e.registry.Subscribe(msg.streamID, e)
	} else {
		if !slices.Contains(currentSubscribers, msg.subscriber) {
			e.subscribers[msg.streamID] = append(currentSubscribers, msg.subscriber)
		}
	}
}

func (e *eventBusImpl) processUnsubscribeCommand(msg *eventBusMessageUnsub) {
	if msg == nil {
		return
	}

	e.subscribers[msg.streamID] = slices.DeleteFunc(
		e.subscribers[msg.streamID],
		func(subscriber StreamSubscriber) bool {
			return subscriber == msg.subscriber
		},
	)
}

func (e *eventBusImpl) processBackfillCommand(msg *eventBusMessageBackfill) {
	if msg == nil {
		return
	}

	if err := e.registry.Backfill(msg.cookie, msg.syncIDs); err != nil {
		// TODO: Send sync down message
		e.log.Errorw("failed to process backfill request", "error", err)
	}
}
