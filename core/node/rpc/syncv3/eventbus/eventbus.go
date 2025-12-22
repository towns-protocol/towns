package eventbus

import (
	"context"

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
	// It's guaranteed that there will be matching backfill or SyncOp_SYNC_DOWN dispatched.
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
	// It's guaranteed that there will be matching backfill or SyncOp_SYNC_DOWN dispatched.
	EnqueueBackfill(cookie *SyncCookie, syncIDs ...string) error

	// EnqueueRemoveSubscriber removes the given subscriber from all streams it is subscribed to.
	//
	// Implementation must make this a non-blocking operation.
	//
	// If the given subscriber is not subscribed to any stream, this is a noop.
	EnqueueRemoveSubscriber(syncID string) error
}

// streamSubscribers is defined in stream_subscribers.go

// getOrCreateStreamSubscribers returns the subscribers for a stream, creating if needed
func (e *eventBusImpl) getOrCreateStreamSubscribers(streamID StreamId) streamSubscribers {
	subs, ok := e.subscribers[streamID]
	if !ok {
		subs = make(streamSubscribers)
		e.subscribers[streamID] = subs
	}
	return subs
}

type eventBusMessageStreamUpdate struct {
	streamID StreamId
	msg      *SyncStreamsResponse
	version  int
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
	// queue is the internal unbounded queue for stream updates and subscription requests.
	// Processing items on the queue should be fast enough to always keep up with the added items.
	// Monitoring tools should be used to alert if the queue size grows too large.
	queue    *dynmsgbuf.DynamicBuffer[*eventBusMessage]
	registry syncer.Registry
	// subscribers is the list of subscribers grouped by stream ID and syncer version.
	subscribers map[StreamId]streamSubscribers
	otelTracer  trace.Tracer
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
		queue:       dynmsgbuf.NewUnboundedDynamicBuffer[*eventBusMessage](),
		subscribers: make(map[StreamId]streamSubscribers),
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

	if metrics != nil {
		e.runMetricsCollector(metrics)
	}

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
func (e *eventBusImpl) OnStreamEvent(streamID StreamId, msg *SyncStreamsResponse, version int) {
	err := e.queue.AddMessage(&eventBusMessage{update: &eventBusMessageStreamUpdate{
		streamID: streamID,
		msg:      msg,
		version:  version,
	}})
	if err != nil {
		// The failure could happen only if the queue is closed which is theoretically impossible here.
		e.log.Errorw("failed to add stream update message to the unbounded queue", "error", err)
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
					e.processStreamUpdateCommand(msg.update.streamID, msg.update.msg, msg.update.version)
				} else {
					e.processTargetedStreamUpdateCommand(msg.update.streamID, msg.update.msg, msg.update.version)
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
func (e *eventBusImpl) processStreamUpdateCommand(streamID StreamId, msg *SyncStreamsResponse, version int) {
	if msg == nil {
		return
	}

	if len(msg.GetTargetSyncIds()) > 0 {
		e.log.Error("received targeted stream update message in the common stream update processor")
		return
	}

	subscribers, ok := e.subscribers[streamID]
	if !ok {
		return
	}

	if version == syncer.AllSubscribersVersion {
		// If the version is AllSubscribersVersion, it means that the update is sent to all subscribers of the stream
		// regardless of their version.

		subscribers.sendUpdateToAll(msg)

		if msg.GetSyncOp() == SyncOp_SYNC_DOWN {
			delete(e.subscribers, streamID)
		}
	} else {
		// If the version is not PendingSubscribersVersion, it means that the update is sent to subscribers of the
		// stream
		// with the given version. We need to find the subscribers for the given version and send the update to them.

		subscribers.sendUpdateToVersion(version, msg)

		if msg.GetSyncOp() == SyncOp_SYNC_DOWN {
			subscribers.clearVersion(version)
			if subscribers.isEmpty() {
				delete(e.subscribers, streamID)
			}
		}
	}
}

// processTargetedStreamUpdateCommand processes the given stream update command that is targeted to a specific sync ID.
//
// - SyncOp_SYNC_UPDATE message is a backfill one and should move the given subscriber from the
// PendingSubscribersVersion list
//
//	  to the given version list so it can start receiving updates.
//	- SyncOp_SYNC_DOWN message just removes subscribers with the given sync ID from the list of subscribers
//	  regardless of their version.
func (e *eventBusImpl) processTargetedStreamUpdateCommand(streamID StreamId, msg *SyncStreamsResponse, version int) {
	if msg == nil {
		return
	}

	if len(msg.GetTargetSyncIds()) == 0 {
		e.log.Error("received non-targeted stream update message in the targeted stream update processor")
		return
	}

	subscribers, ok := e.subscribers[streamID]
	if !ok {
		return
	}

	targetSyncID := msg.GetTargetSyncIds()[0]
	msg.TargetSyncIds = msg.TargetSyncIds[1:]

	if msg.GetSyncOp() == SyncOp_SYNC_DOWN {
		// The following logic removes the subscriber with the given sync ID from the list of subscribers
		// and sends the given stream down message to it.

		subscriber := subscribers.removeBySyncID(targetSyncID)
		if subscriber != nil {
			if subscribers.isEmpty() {
				delete(e.subscribers, streamID)
			}

			subscriber.OnUpdate(msg)
		}
	} else if msg.GetSyncOp() == SyncOp_SYNC_UPDATE {
		// The following logic moves the given subscriber from the pending subscribers list into a list with the given
		// version and sends an update the subscriber with an updated target sync IDs.

		subscriber, ver := subscribers.findBySyncID(targetSyncID)
		if subscriber != nil {
			if ver == syncer.PendingSubscribersVersion {
				subscribers.movePendingToVersion(targetSyncID, version)
			}
			subscriber.OnUpdate(msg)
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

	// Adding the given subscriber to "0" version list of subscribers for the given stream ID which
	// means that the given subscriber is waiting for the backfill message first.
	currentSubscribers := e.getOrCreateStreamSubscribers(streamID)
	currentSubscribers.addPendingUnique(msg.subscriber)

	e.registry.EnqueueSubscribeAndBackfill(msg.cookie, []string{msg.subscriber.SyncID()})
}

func (e *eventBusImpl) processUnsubscribeCommand(msg *eventBusMessageUnsub) {
	if msg == nil {
		return
	}

	subscribers, ok := e.subscribers[msg.streamID]
	if !ok {
		return
	}

	subscribers.removeBySyncID(msg.subscriber.SyncID())

	if subscribers.isEmpty() {
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

// processRemoveCommand walks the entire e.subscribers map and scans each version list to drop the departing sync ID.
// On busy nodes this runs on the single event-bus goroutine and can dominate queue processing whenever
// a sync shuts down (e.g., on client disconnects or node restarts).
// TODO: Maintaining a reverse index (sync ID → streams) or at least tracking the streams a handler is subscribed
//
//	to would turn removals into near-O(1) operations and keep the event bus responsive under load.
func (e *eventBusImpl) processRemoveCommand(msg *eventBusMessageRemove) {
	if msg == nil {
		return
	}

	for streamID, subscribers := range e.subscribers {
		subscribers.removeBySyncID(msg.syncID)

		if subscribers.isEmpty() {
			delete(e.subscribers, streamID)
			e.registry.EnqueueUnsubscribe(streamID)
		}
	}
}
