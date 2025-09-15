package eventbus

import (
	"context"
	"slices"
	"sync"

	"github.com/ethereum/go-ethereum/common"
	"go.opentelemetry.io/otel/trace"

	"github.com/towns-protocol/towns/core/node/infra"
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

// StreamSubscriber subscribes to stream updates.
type StreamSubscriber interface {
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
type StreamSubscriptionManager interface {
	// EnqueueSubscribe adds the given stream subscriber request to the internal queue for further processing.
	//
	// Implementation must make this a non-blocking operation.
	//
	// The processor executes the stream subscription request for the given cookie and subscriber.
	// When the subscriber receives a SyncOp_SYNC_DOWN stream update the subscriber is automatically
	// unsubscribed from the stream and won't receive further updates.
	EnqueueSubscribe(cookie *SyncCookie, subscriber StreamSubscriber) error

	// EnqueueUnsubscribe adds the given stream unsubscribe request to the internal queue for further processing.
	//
	// Implementation must make this a non-blocking operation.
	//
	// The processor unsubscribes the given subscriber from the given stream.
	// Note that unsubscribing happens automatically when the subscriber
	// receives a SyncOp_SYNC_DOWN update for the stream.
	// If the subscriber is not subscribed to the stream, this is a noop.
	EnqueueUnsubscribe(streamID StreamId, subscriber StreamSubscriber) error

	// EnqueueBackfill adds the given backfill request to the internal queue for further processing.
	//
	// Implementation must make this a non-blocking operation.
	//
	// The target syncer will request a stream update message by the given cookie and send it
	// back to the target sync operation through the given chain of sync IDs.
	EnqueueBackfill(cookie *SyncCookie, syncIDs ...string) error

	// EnqueueRemoveSubscriber removes the given subscriber from all streams it is subscribed to.
	//
	// Implementation must make this a non-blocking operation.
	//
	// If the given subscriber is not subscribed to any stream, this is a noop.
	EnqueueRemoveSubscriber(syncID string) error
}

type eventBusMessageStreamUpdate struct {
	msg     *SyncStreamsResponse
	version int
}

type eventBusMessageSub struct {
	cookie     *SyncCookie
	subscriber StreamSubscriber
}

type eventBusMessageUnsub struct {
	streamID   StreamId
	subscriber StreamSubscriber
}

type eventBusMessageBackfill struct {
	cookie  *SyncCookie
	syncIDs []string
}

type eventBusMessageRemove struct {
	syncID string
}

// eventBusMessage is put on the internal event bus queue for processing in eventBusImpl.run.
type eventBusMessage struct {
	update   *eventBusMessageStreamUpdate
	sub      *eventBusMessageSub
	unsub    *eventBusMessageUnsub
	backfill *eventBusMessageBackfill
	remove   *eventBusMessageRemove
}

// eventBusImpl is a concrete implementation of the StreamUpdateEmitter and StreamSubscriber interfaces.
// It is responsible for handling stream updates from syncer.StreamUpdateEmitter and distributes updates
// to subscribers. As such it keeps track of which subscribers are subscribed on updates on which streams.
//
// TODO: Use worker pool to process updates in parallel
type eventBusImpl struct {
	log *logging.Log
	// TODO: discuss if we want to have an unbounded queue here?
	// Processing items on the queue should be fast enough to always keep up with the added items.
	queue    *dynmsgbuf.DynamicBuffer[*eventBusMessage]
	registry syncer.Registry
	// subscribers is the list of subscribers grouped by stream ID and syncer version.
	subscribers map[StreamId]map[int][]StreamSubscriber
	// subscribersLock protects the subscribers map.
	// The given lock is used to avoid race condition when the queue is full and stream update cannot be added to the queue
	// for further processing. In this case we need to send SyncOp_SYNC_DOWN message directly to subscribers in
	// OnStreamEvent method, and we need to lock the subscribers map for that.
	subscribersLock sync.Mutex
	otelTracer      trace.Tracer
}

// New creates a new instance of the event bus implementation.
//
// It creates an internal queue for stream updates and a background goroutine that reads updates from this queue
// and distributes them to subscribers until the given ctx expires.
func New(
	ctx context.Context,
	localAddr common.Address,
	streamCache syncer.StreamCache,
	nodeRegistry nodes.NodeRegistry,
	metrics infra.MetricsFactory,
	otelTracer trace.Tracer,
) *eventBusImpl {
	e := &eventBusImpl{
		log:         logging.FromCtx(ctx).Named("syncv3.eventbus"),
		queue:       dynmsgbuf.NewDynamicBuffer[*eventBusMessage](),
		subscribers: make(map[StreamId]map[int][]StreamSubscriber),
		otelTracer:  otelTracer,
	}

	e.registry = syncer.NewRegistry(ctx, localAddr, streamCache, nodeRegistry, e, metrics, otelTracer)

	go func() {
		if err := e.run(ctx); err != nil {
			e.log.Errorw("event bus queue processing loop stopped with error", "error", err)
		} else {
			e.log.Info("event bus queue processing loop stopped")
		}
	}()

	e.runMetricsCollector(metrics)

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
func (e *eventBusImpl) OnStreamEvent(msg *SyncStreamsResponse, version int) {
	err := e.queue.AddMessage(&eventBusMessage{update: &eventBusMessageStreamUpdate{msg: msg, version: version}})
	if err == nil {
		// All good, just return
		return
	}

	e.log.Errorw("failed to add stream update message to the queue", "error", err)

	// Send sync down message for the given stream directly to clients.
	// Subscribers do not want to unsubscribe from the given stream here so after receiving the sync down message
	// they most likely will immediately re-subscribe -> we can keep the current syncer for the given stream active.
	if len(msg.GetTargetSyncIds()) > 0 {
		e.processTargetedStreamUpdateCommand(
			&SyncStreamsResponse{
				SyncOp:        SyncOp_SYNC_DOWN,
				StreamId:      msg.StreamID(),
				TargetSyncIds: msg.GetTargetSyncIds(),
			},
			version,
		)
	} else {
		e.processStreamUpdateCommand(
			&SyncStreamsResponse{SyncOp: SyncOp_SYNC_DOWN, StreamId: msg.StreamID()},
			version,
		)
	}
}

func (e *eventBusImpl) EnqueueSubscribe(cookie *SyncCookie, subscriber StreamSubscriber) error {
	return e.queue.AddMessage(&eventBusMessage{
		sub: &eventBusMessageSub{
			cookie:     cookie,
			subscriber: subscriber,
		},
	})
}

func (e *eventBusImpl) EnqueueUnsubscribe(streamID StreamId, subscriber StreamSubscriber) error {
	return e.queue.AddMessage(&eventBusMessage{
		unsub: &eventBusMessageUnsub{
			streamID:   streamID,
			subscriber: subscriber,
		},
	})
}

func (e *eventBusImpl) EnqueueBackfill(cookie *SyncCookie, syncIDs ...string) error {
	return e.queue.AddMessage(&eventBusMessage{
		backfill: &eventBusMessageBackfill{
			cookie:  cookie,
			syncIDs: syncIDs,
		},
	})
}

func (e *eventBusImpl) EnqueueRemoveSubscriber(syncID string) error {
	return e.queue.AddMessage(&eventBusMessage{
		remove: &eventBusMessageRemove{
			syncID: syncID,
		},
	})
}

func (e *eventBusImpl) run(ctx context.Context) error {
	var msgs []*eventBusMessage
	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-e.queue.Wait():
		}

		msgs = e.queue.GetBatch(msgs)

		// nil msgs indicates the buffer is closed.
		if msgs == nil {
			return nil
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
			} else if msg.remove != nil {
				e.processRemoveCommand(msg.remove)
			}
		}
	}
}

// processStreamUpdateCommand processes the given stream update command.
//
// version is the syncer version that the update is sent from. "0" version means that the update is sent
// to all subscribers of the stream regardless of their sync ID.
func (e *eventBusImpl) processStreamUpdateCommand(msg *SyncStreamsResponse, version int) {
	if msg == nil {
		return
	}

	if len(msg.GetTargetSyncIds()) > 0 {
		e.log.Error("received targeted stream update message in the common stream update processor")
		return
	}

	// TODO: Consider adding ParsedStreamCookie
	streamID, err := StreamIdFromBytes(msg.StreamID())
	if err != nil {
		e.log.Errorw("failed to parse stream id from the stream update message",
			"streamID", msg.StreamID(), "error", err)
		return
	}

	e.subscribersLock.Lock()
	defer e.subscribersLock.Unlock()

	groupedSubscribers, ok := e.subscribers[streamID]
	if !ok {
		// No subscribers for the given stream, do nothing
		return
	}

	// 1. If the version is AllSubscribersVersion, it means that the update is sent to all subscribers of the stream
	//    regardless of their version.
	if version == syncer.AllSubscribersVersion {
		for _, subscribers := range groupedSubscribers {
			for _, sub := range subscribers {
				// Create a copy of the update and unset syncID because each subscriber has its own unique syncID.
				// All other fields can be set by reference/pointer to prevent needless copying.
				sub.OnUpdate(&SyncStreamsResponse{
					SyncOp:   msg.GetSyncOp(),
					Stream:   msg.GetStream(),
					StreamId: msg.GetStreamId(),
				})
			}
		}

		if msg.GetSyncOp() == SyncOp_SYNC_DOWN {
			delete(e.subscribers, streamID)
		}

		return
	}

	// 2. If the version is not PendingSubscribersVersion, it means that the update is sent to subscribers of the stream
	//    with the given version. We need to find the subscribers for the given version and send the update to them.
	for _, sub := range groupedSubscribers[version] {
		// Create a copy of the update and unset syncID because each subscriber has its own unique syncID.
		// All other fields can be set by reference/pointer to prevent needless copying.
		sub.OnUpdate(&SyncStreamsResponse{
			SyncOp:   msg.GetSyncOp(),
			Stream:   msg.GetStream(),
			StreamId: msg.GetStreamId(),
		})
	}

	if msg.GetSyncOp() == SyncOp_SYNC_DOWN {
		delete(e.subscribers[streamID], version)
		if len(e.subscribers[streamID]) == 0 {
			delete(e.subscribers, streamID)
		}
	}
}

// processTargetedStreamUpdateCommand processes the given stream update command that is targeted to a specific sync ID.
//
//   - SyncOp_SYNC_UPDATE message is a backfill one and should move the given subscriber from the PendingSubscribersVersion list
//     to the given version list so it can start receiving updates.
//   - SyncOp_SYNC_DOWN message just removes subscribers with the given sync ID from the list of subscribers
//     regardless of their version.
func (e *eventBusImpl) processTargetedStreamUpdateCommand(msg *SyncStreamsResponse, version int) {
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

	e.subscribersLock.Lock()
	defer e.subscribersLock.Unlock()

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
			return
		}

		// 1. Try to find the given subscriber in PendingSubscribersVersion list. If found, this is the first backfill message,
		//    and we need to move the subscriber to the given version list.
		var found bool
		for i, sub := range e.subscribers[streamID][syncer.PendingSubscribersVersion] {
			if sub.SyncID() == msg.GetTargetSyncIds()[syncer.PendingSubscribersVersion] {
				found = true
				// Move the subscriber to the given version list.
				e.subscribers[streamID][version] = append(e.subscribers[streamID][version], sub)
				// Remove the subscriber from the PendingSubscribersVersion list.
				e.subscribers[streamID][syncer.PendingSubscribersVersion] = slices.Delete(
					e.subscribers[streamID][syncer.PendingSubscribersVersion], i, i+1)
				// Send the backfill message to the subscriber.
				msg.TargetSyncIds = msg.TargetSyncIds[1:]
				sub.OnUpdate(msg)
				break
			}
		}
		if found {
			return
		}

		// 2. If the subscriber was not found in the PendingSubscribersVersion list, it means that it is already subscribed to the stream
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

	e.subscribersLock.Lock()
	defer e.subscribersLock.Unlock()

	// Adding the given subscriber to "0" version list of subscribers for the given stream ID which
	// means that the given subscriber is waiting for the backfill message first.
	currentSubscribers, ok := e.subscribers[streamID]
	if !ok {
		e.subscribers[streamID] = map[int][]StreamSubscriber{syncer.PendingSubscribersVersion: {msg.subscriber}}
	} else {
		var found bool
		for _, subscribers := range currentSubscribers {
			if slices.Contains(subscribers, msg.subscriber) {
				found = true
				break
			}
		}

		if !found {
			if _, ok = e.subscribers[streamID][syncer.PendingSubscribersVersion]; !ok {
				e.subscribers[streamID][syncer.PendingSubscribersVersion] = []StreamSubscriber{}
			}
			e.subscribers[streamID][syncer.PendingSubscribersVersion] = append(
				e.subscribers[streamID][syncer.PendingSubscribersVersion],
				msg.subscriber,
			)
		}
	}

	e.registry.EnqueueSubscribeAndBackfill(msg.cookie, []string{msg.subscriber.SyncID()})
}

func (e *eventBusImpl) processUnsubscribeCommand(msg *eventBusMessageUnsub) {
	if msg == nil {
		return
	}

	e.subscribersLock.Lock()
	defer e.subscribersLock.Unlock()

	for version := range e.subscribers[msg.streamID] {
		e.subscribers[msg.streamID][version] = slices.DeleteFunc(
			e.subscribers[msg.streamID][version],
			func(subscriber StreamSubscriber) bool {
				return subscriber == msg.subscriber
			},
		)
		if len(e.subscribers[msg.streamID][version]) == 0 {
			delete(e.subscribers[msg.streamID], version)
		}
	}

	if len(e.subscribers[msg.streamID]) == 0 {
		delete(e.subscribers, msg.streamID)
		e.registry.EnqueueUnsubscribe(msg.streamID)
	}
}

func (e *eventBusImpl) processBackfillCommand(msg *eventBusMessageBackfill) {
	if msg == nil {
		return
	}

	e.registry.EnqueueSubscribeAndBackfill(msg.cookie, msg.syncIDs)
}

func (e *eventBusImpl) processRemoveCommand(msg *eventBusMessageRemove) {
	if msg == nil {
		return
	}

	e.subscribersLock.Lock()
	defer e.subscribersLock.Unlock()

	for streamID, groupedSubscribers := range e.subscribers {
		for version := range groupedSubscribers {
			e.subscribers[streamID][version] = slices.DeleteFunc(
				e.subscribers[streamID][version],
				func(subscriber StreamSubscriber) bool {
					return subscriber.SyncID() == msg.syncID
				},
			)
			if len(e.subscribers[streamID][version]) == 0 {
				delete(e.subscribers[streamID], version)
			}
		}

		if len(e.subscribers[streamID]) == 0 {
			delete(e.subscribers, streamID)
			e.registry.EnqueueUnsubscribe(streamID)
		}
	}
}
