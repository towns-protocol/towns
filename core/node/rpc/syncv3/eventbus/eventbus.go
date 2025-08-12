package eventbus

import (
	"context"
	"slices"
	"sync"

	"github.com/ethereum/go-ethereum/common"

	"github.com/towns-protocol/towns/core/node/logging"
	"github.com/towns-protocol/towns/core/node/nodes"
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
		// SyncID returns subscription (sync op basically) identifier.
		SyncID() string

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
		Subscribe(cookie *SyncCookie, subscriber StreamSubscriber) error

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

	eventBusMessageStreamUpdate struct {
		msg     *SyncStreamsResponse
		version int32
	}

	eventBusMessageSub struct {
		cookie     *SyncCookie
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
		update   *eventBusMessageStreamUpdate
		sub      *eventBusMessageSub
		unsub    *eventBusMessageUnsub
		backfill *eventBusMessageBackfill
	}

	// eventBusImpl is a concrete implementation of the StreamUpdateEmitter and StreamSubscriber interfaces.
	// It is responsible for handling stream updates from syncer.StreamUpdateEmitter and distributes updates
	// to subscribers. As such it keeps track of which subscribers are subscribed on updates on which streams.
	//
	// TODO: Periodically unsubscribe from streams that have no subscribers.
	eventBusImpl struct {
		// log is the event bus named logger
		log *logging.Log
		// TODO: discuss if we want to have an unbounded queue here?
		// Processing items on the queue should be fast enough to always keep up with the added items.
		queue *dynmsgbuf.DynamicBuffer[*eventBusMessage]
		// registry is the syncer registry.
		registry syncer.Registry
		// subscribers is the list of subscribers grouped by stream ID and syncer version.
		subscribers map[StreamId]map[int32][]StreamSubscriber
	}
)

// New creates a new instance of the event bus implementation.
//
// It creates an internal queue for stream updates and a background goroutine that reads updates from this queue
// and distributes them to subscribers.
func New(
	ctx context.Context,
	localAddr common.Address,
	streamCache syncer.StreamCache,
	nodeRegistry nodes.NodeRegistry,
) *eventBusImpl {
	e := &eventBusImpl{
		log:         logging.FromCtx(ctx).Named("syncv3.eventbus"),
		queue:       dynmsgbuf.NewDynamicBuffer[*eventBusMessage](),
		subscribers: make(map[StreamId]map[int32][]StreamSubscriber),
	}

	e.registry = syncer.NewRegistry(ctx, localAddr, streamCache, nodeRegistry, e)

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
func (e *eventBusImpl) OnStreamEvent(update *SyncStreamsResponse, version int32) {
	err := e.queue.AddMessage(&eventBusMessage{update: &eventBusMessageStreamUpdate{msg: update, version: version}})
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
	e.registry.Unsubscribe(streamID)

	// Send sync down message directly to clients to avoid common queue
	var wg sync.WaitGroup
	for _, subscribers := range e.subscribers[streamID] {
		for _, sub := range subscribers {
			wg.Add(1)
			go func(sub StreamSubscriber) {
				sub.OnUpdate(&SyncStreamsResponse{SyncOp: SyncOp_SYNC_DOWN, StreamId: streamID[:]})
				wg.Done()
			}(sub)
		}
	}
	wg.Wait()

	// Remove the given stream from the list
	delete(e.subscribers, streamID)
}

// Subscribe adds the given subscriber to the stream updates.
func (e *eventBusImpl) Subscribe(cookie *SyncCookie, subscriber StreamSubscriber) error {
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
			cookie:     cookie,
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
				e.processStreamUpdateCommand(msg.update.msg, msg.update.version)
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

// processStreamUpdateCommand processes the given stream update command.
func (e *eventBusImpl) processStreamUpdateCommand(msg *SyncStreamsResponse, version int32) {
	if msg == nil {
		return
	}

	streamID, err := StreamIdFromBytes(msg.StreamID())
	if err != nil {
		e.log.Errorw("failed to parse stream id from the stream update message",
			"streamID", msg.StreamID(), "error", err)
		return
	}

	// If the given message has target sync IDs, it means that this is a backfill message and should be forwarded
	// to the target subscriber only.
	if len(msg.GetTargetSyncIds()) > 0 {
		var target StreamSubscriber
		var targetVersion int32
		if version == 0 {
			for version, subscribers := range e.subscribers[streamID] {
				for _, sub := range subscribers {
					if sub.SyncID() == msg.GetTargetSyncIds()[0] {
						target = sub
						targetVersion = version
						break
					}
				}
				if target != nil {
					break
				}
			}
		} else if _, ok := e.subscribers[streamID]; ok {
			targetVersion = version
			for _, sub := range e.subscribers[streamID][version] {
				if sub.SyncID() == msg.GetTargetSyncIds()[0] {
					target = sub
					break
				}
			}
		}

		if target == nil {
			e.log.Debugw("no subscriber found for the given backfill message",
				"streamID", streamID, "syncIDs", msg.GetTargetSyncIds())
			return
		}

		target.OnUpdate(msg)

		if msg.GetSyncOp() == SyncOp_SYNC_DOWN {
			e.subscribers[streamID][targetVersion] = slices.DeleteFunc(
				e.subscribers[streamID][targetVersion],
				func(subscriber StreamSubscriber) bool {
					return subscriber == target
				},
			)

			if len(e.subscribers[streamID][targetVersion]) == 0 {
				delete(e.subscribers[streamID], targetVersion)
				if len(e.subscribers[streamID]) == 0 {
					delete(e.subscribers, streamID)
				}
			}
		}

		return
	}

	if version == 0 {
		var wg sync.WaitGroup
		for _, subscribers := range e.subscribers[streamID] {
			for _, sub := range subscribers {
				wg.Add(1)
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
		}
		wg.Wait()

		if msg.GetSyncOp() == SyncOp_SYNC_DOWN {
			delete(e.subscribers, streamID)
		}
	} else {
		subscribers, ok := e.subscribers[streamID]
		if !ok {
			// No subscribers for the given stream, do nothing
			return
		}

		var wg sync.WaitGroup
		wg.Add(len(subscribers[version]))
		for _, sub := range subscribers[version] {
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

		if msg.GetSyncOp() == SyncOp_SYNC_DOWN {
			delete(e.subscribers[streamID], version)
			if len(e.subscribers[streamID]) == 0 {
				delete(e.subscribers, streamID)
			}
		}
	}
}

// processSubscribeCommand processes the given subscribe command.
func (e *eventBusImpl) processSubscribeCommand(msg *eventBusMessageSub) {
	if msg == nil {
		return
	}

	streamID, err := StreamIdFromBytes(msg.cookie.GetStreamId())
	if err != nil {
		e.log.Errorw("failed to parse stream ID from cookie in subscribe message",
			"streamID", msg.cookie.GetStreamId(), "error", err)
		return
	}

	currentSubscribers, ok := e.subscribers[streamID]
	if !ok {
		// Event bus is not subscribed on updates of the given stream. Subscribe first.
		e.subscribers[streamID] = map[int32][]StreamSubscriber{0: {msg.subscriber}}
		e.registry.Subscribe(streamID)
	} else {
		var found bool
		for _, subscribers := range currentSubscribers {
			if slices.Contains(subscribers, msg.subscriber) {
				found = true
				break
			}
		}

		if !found {
			if _, ok = e.subscribers[streamID][0]; !ok {
				e.subscribers[streamID][0] = []StreamSubscriber{}
			}
			e.subscribers[streamID][0] = append(e.subscribers[streamID][0], msg.subscriber)
		}
	}

	e.processBackfillCommand(&eventBusMessageBackfill{
		cookie:  msg.cookie,
		syncIDs: []string{msg.subscriber.SyncID()},
	})
}

// processUnsubscribeCommand processes the given unsubscribe command.
func (e *eventBusImpl) processUnsubscribeCommand(msg *eventBusMessageUnsub) {
	if msg == nil {
		return
	}

	for version := range e.subscribers[msg.streamID] {
		e.subscribers[msg.streamID][version] = slices.DeleteFunc(
			e.subscribers[msg.streamID][version],
			func(subscriber StreamSubscriber) bool {
				return subscriber == msg.subscriber
			},
		)
	}
}

// processBackfillCommand processes the given backfill command.
func (e *eventBusImpl) processBackfillCommand(msg *eventBusMessageBackfill) {
	if msg == nil {
		return
	}

	e.registry.Backfill(msg.cookie, msg.syncIDs)
}
