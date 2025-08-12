package eventbus

import (
	"context"
	"slices"

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

	// eventBusMessage is put on the internal event bus queue for processing in eventBusImpl.run.
	eventBusMessage struct {
		// a stream update
		update *SyncStreamsResponse
		// a stream subscribe command
		sub *struct {
			streamID   StreamId
			subscriber StreamSubscriber
		}
		// stream update
		unsub *struct {
			streamID   StreamId
			subscriber StreamSubscriber
		}
		// stream backfill
		backfill *struct {
			cookie  *SyncCookie
			syncIDs []string
		}
	}

	// eventBusImpl is a concrete implementation of the StreamUpdateEmitter and StreamSubscriber interfaces.
	// It is responsible for handling stream updates from syncer.StreamUpdateEmitter and distributes updates
	// to subscribers. As such it keeps track of which subscribers are subscribed on updates on which streams.
	eventBusImpl struct {
		// TODO: discuss if we want to have an unbounded queue here?
		// Processing items on the queue should be fast enough to always keep up with the added items.
		queue *dynmsgbuf.DynamicBuffer[*eventBusMessage]
		// registry is the syncer registry.
		registry syncer.Registry
	}
)

// New creates a new instance of the event bus implementation.
//
// It creates an internal queue for stream updates and a background goroutine that reads updates from this queue
// and distributes them to subscribers.
func New(ctx context.Context, registry syncer.Registry) *eventBusImpl {
	e := &eventBusImpl{
		queue:    dynmsgbuf.NewDynamicBuffer[*eventBusMessage](),
		registry: registry,
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
// from the stream.
func (e *eventBusImpl) OnStreamEvent(update *SyncStreamsResponse, version int32) {
	// TODO: if the queue is full, we should retry few times, if it still fails, we unsubscribe from the given stream
	//  updates and send the stream down message to all subscribers.
	_ = e.queue.AddMessage(&eventBusMessage{update: update})
}

// Subscribe adds the given subscriber to the stream updates.
func (e *eventBusImpl) Subscribe(streamID StreamId, subscriber StreamSubscriber) error {
	// TODO implement me
	// 1. Check if the stream exists, if not return Err_NOT_FOUND
	// (TODO: determine how to determine if a stream exists to prevent locking subscribe too long, or pushing a command

	// 2. add command to e.queue that adds the subscriber to the stream's subscriber list in eventBusImpl.run
	err := e.queue.AddMessage(&eventBusMessage{
		sub: &struct {
			streamID   StreamId
			subscriber StreamSubscriber
		}{
			streamID:   streamID,
			subscriber: subscriber,
		},
	})

	// Either the queue is full and the error must be returned to the caller to indicate that subscribing failed.
	// Or the message is added to the queue, and the subscriber is guaranteed to receive stream updates.
	// It will receive SyncOp_SYNC_DOWN when something bad happens and the subscriber is automatically unsubscribed.
	return err
}

// Unsubscribe removes the given subscriber from the stream updates.
func (e *eventBusImpl) Unsubscribe(streamID StreamId, subscriber StreamSubscriber) error {
	return e.queue.AddMessage(&eventBusMessage{
		unsub: &struct {
			streamID   StreamId
			subscriber StreamSubscriber
		}{
			streamID:   streamID,
			subscriber: subscriber,
		},
	})
}

// Backfill requests a backfill message for the given cookie and sync IDs.
func (e *eventBusImpl) Backfill(cookie *SyncCookie, syncIDs ...string) error {
	return e.queue.AddMessage(&eventBusMessage{
		backfill: &struct {
			cookie  *SyncCookie
			syncIDs []string
		}{
			cookie:  cookie,
			syncIDs: syncIDs,
		},
	})
}

func (e *eventBusImpl) run(ctx context.Context) {
	var (
		msgs        []*eventBusMessage
		subscribers = make(map[StreamId][]StreamSubscriber)
	)
	for {
		<-e.queue.Wait()
		msgs = e.queue.GetBatch(msgs)

		for _, msg := range msgs {
			if msg.update != nil {
				// TODO: implement me
				// if msg is stream update:
				// 1. loop over all subscribers for update.StreamId
				// 2. create a copy of the update and unset syncID because each subscriber has its own unique syncID
				//    (all other fields can be set by reference/pointer to prevent needless copying)
				// 3. if update.SyncOp is SyncOp_SYNC_DOWN, unsubscribe the subscriber from the stream
				// 4. call subscriber.OnUpdate with the copied stream update
			} else if msg.sub != nil {
				currentSubscribers := subscribers[msg.sub.streamID]
				if !slices.Contains(currentSubscribers, msg.sub.subscriber) {
					subscribers[msg.sub.streamID] = append(currentSubscribers, msg.sub.subscriber)
				}
			} else if msg.unsub != nil {
				for i, subscriber := range subscribers[msg.unsub.streamID] {
					if subscriber == msg.unsub.subscriber {
						slices.Delete(subscribers[msg.unsub.streamID], i, i+1)
						break
					}
				}
			} else if msg.backfill != nil {
				// TODO: Implement me
			}
		}
	}
}
