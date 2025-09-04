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
				if len(msg.update.msg.GetTargetSyncIds()) == 0 {
					e.processStreamUpdateCommand(msg.update.msg, msg.update.version)
				} else {
					e.processTargetedStreamUpdateCommand(msg.update.msg, msg.update.version)
				}
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
//
// version is the syncer version that the update is sent from. "0" version means that the update is sent
// to all subscribers of the stream regardless of their sync ID.
func (e *eventBusImpl) processStreamUpdateCommand(msg *SyncStreamsResponse, version int32) {
	if msg == nil {
		return
	}

	if len(msg.GetTargetSyncIds()) > 0 {
		e.log.Error("received targeted stream update message in the common stream update processor")
		return
	}

	streamID, err := StreamIdFromBytes(msg.StreamID())
	if err != nil {
		e.log.Errorw("failed to parse stream id from the stream update message",
			"streamID", msg.StreamID(), "error", err)
		return
	}

	groupedSubscribers, ok := e.subscribers[streamID]
	if !ok {
		// No subscribers for the given stream, do nothing
		return
	}

	// 1. If the version is "0", it means that the update is sent to all subscribers of the stream
	//    regardless of their version.
	if version == 0 {
		var wg sync.WaitGroup
		for _, subscribers := range groupedSubscribers {
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

		return
	}

	// 2. If the version is not "0", it means that the update is sent to subscribers of the stream
	//    with the given version. We need to find the subscribers for the given version and send the update to them.
	var wg sync.WaitGroup
	wg.Add(len(groupedSubscribers[version]))
	for _, sub := range groupedSubscribers[version] {
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

// processTargetedStreamUpdateCommand processes the given stream update command that is targeted to a specific sync ID.
//
//   - SyncOp_SYNC_UPDATE message is a backfill one and should move the given subscriber from the "0" version list
//     to the given version list so it can start receiving updates.
//   - SyncOp_SYNC_DOWN message just removes subscribers with the given sync ID from the list of subscribers
//     regardless of their version.
func (e *eventBusImpl) processTargetedStreamUpdateCommand(msg *SyncStreamsResponse, version int32) {
	if msg == nil {
		return
	}

	if len(msg.GetTargetSyncIds()) == 0 {
		e.log.Error("received non-targeted stream update message in the targeted stream update processor")
		return
	}

	streamID, err := StreamIdFromBytes(msg.StreamID())
	if err != nil {
		e.log.Errorw("failed to parse stream id from the stream update message",
			"streamID", msg.StreamID(), "error", err)
		return
	}

	if msg.GetSyncOp() == SyncOp_SYNC_DOWN {
		// The following logic removes the subscriber with the given sync ID from the list of subscribers
		// and sends the given stream down message to it.
		// Noop if the subscriber is not found.
		var target StreamSubscriber
		for version = range e.subscribers[streamID] {
			e.subscribers[streamID][version] = slices.DeleteFunc(
				e.subscribers[streamID][version],
				func(subscriber StreamSubscriber) bool {
					if msg.GetTargetSyncIds()[0] == subscriber.SyncID() {
						target = subscriber
					}
					return target != nil
				},
			)
			if target != nil {
				break
			}
		}

		if target != nil {
			msg.TargetSyncIds = msg.TargetSyncIds[1:]
			target.OnUpdate(msg)
		} else {
			e.log.Debugw("no subscriber found for the given stream down message",
				"streamID", streamID, "syncIDs", msg.GetTargetSyncIds())
		}
	} else if msg.GetSyncOp() == SyncOp_SYNC_UPDATE {
		if _, ok := e.subscribers[streamID]; !ok {
			// No subscribers for the given stream, do nothing
			e.log.Debugw("no subscribers found for the given stream",
				"streamID", streamID, "syncOp", msg.GetSyncOp(), "syncIDs", msg.GetTargetSyncIds())
			return
		}

		// 1. Try to find the given subscriber in the "0" version list. If found, this is the first backfill message,
		//    and we need to move the subscriber to the given version list.
		var found bool
		for i, sub := range e.subscribers[streamID][0] {
			if sub.SyncID() == msg.GetTargetSyncIds()[0] {
				found = true
				// Move the subscriber to the given version list.
				e.subscribers[streamID][version] = append(e.subscribers[streamID][version], sub)
				// Remove the subscriber from the "0" version list.
				e.subscribers[streamID][0] = slices.Delete(e.subscribers[streamID][0], i, i+1)
				// Send the backfill message to the subscriber.
				msg.TargetSyncIds = msg.TargetSyncIds[1:]
				sub.OnUpdate(msg)
				break
			}
		}
		if found {
			return
		}

		// 2. If the subscriber was not found in the "0" version list, it means that it is already subscribed to the stream
		//    with the given sync ID and version. Just send the update to it.
		for _, sub := range e.subscribers[streamID][version] {
			if sub.SyncID() == msg.GetTargetSyncIds()[0] {
				msg.TargetSyncIds = msg.TargetSyncIds[1:]
				sub.OnUpdate(msg)
				break
			}
		}
	} else {
		e.log.Errorw("received unsupported targeted stream update message",
			"streamID", streamID, "syncOp", msg.GetSyncOp())
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

	// Adding the given subscriber to "0" version list of subscribers for the given stream ID which
	// means that the given subscriber is waiting for the backfill message first.
	currentSubscribers, ok := e.subscribers[streamID]
	if !ok {
		e.subscribers[streamID] = map[int32][]StreamSubscriber{0: {msg.subscriber}}
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

	// Send a request to backfill the stream for the given subscriber.
	e.registry.SubscribeAndBackfill(msg.cookie, []string{msg.subscriber.SyncID()})
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

	e.registry.SubscribeAndBackfill(msg.cookie, msg.syncIDs)
}
