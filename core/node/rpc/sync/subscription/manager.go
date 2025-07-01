package subscription

import (
	"context"
	"slices"
	"sync"
	"sync/atomic"

	"github.com/ethereum/go-ethereum/common"
	"github.com/puzpuzpuz/xsync/v4"
	"go.opentelemetry.io/otel/trace"
	"google.golang.org/protobuf/proto"

	. "github.com/towns-protocol/towns/core/node/base"
	. "github.com/towns-protocol/towns/core/node/events"
	"github.com/towns-protocol/towns/core/node/logging"
	"github.com/towns-protocol/towns/core/node/nodes"
	. "github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/rpc/sync/client"
	"github.com/towns-protocol/towns/core/node/rpc/sync/dynmsgbuf"
	. "github.com/towns-protocol/towns/core/node/shared"
)

// Manager is the subscription manager that manages all subscriptions for stream sync operations.
type Manager struct {
	// log is the logger for this stream sync operation
	log *logging.Log
	// localNodeAddr is the address of the local node
	localNodeAddr common.Address
	// globalCtx is the global context of the node
	globalCtx context.Context
	// streamCache is the global stream cache
	streamCache *StreamCache
	// nodeRegistry is the node registry that provides information about other nodes in the network
	nodeRegistry nodes.NodeRegistry
	// syncers is the set of syncers that handle stream synchronization
	syncers *client.SyncerSet
	// messages is the global channel for messages of all syncing streams
	messages *dynmsgbuf.DynamicBuffer[*SyncStreamsResponse]
	// registry is the subscription registry that manages all subscriptions.
	registry *registry
	// stopped is a flag that indicates whether the manager is stopped (1) or not (0).
	stopped atomic.Bool
	// otelTracer is the OpenTelemetry tracer used for tracing individual sync operations.
	otelTracer trace.Tracer
}

// NewManager creates a new subscription manager for stream sync operations.
func NewManager(
	ctx context.Context,
	localNodeAddr common.Address,
	streamCache *StreamCache,
	nodeRegistry nodes.NodeRegistry,
	otelTracer trace.Tracer,
) *Manager {
	log := logging.FromCtx(ctx).
		Named("shared-syncer").
		With("node", localNodeAddr)

	syncers, messages := client.NewSyncers(ctx, streamCache, nodeRegistry, localNodeAddr, otelTracer)

	go syncers.Run()

	manager := &Manager{
		log:           log,
		localNodeAddr: localNodeAddr,
		globalCtx:     ctx,
		streamCache:   streamCache,
		nodeRegistry:  nodeRegistry,
		otelTracer:    otelTracer,
		syncers:       syncers,
		messages:      messages,
		registry:      newRegistry(),
	}

	go manager.start()

	return manager
}

// Subscribe creates a new subscription with the given sync ID.
func (m *Manager) Subscribe(ctx context.Context, cancel context.CancelCauseFunc, syncID string) (*Subscription, error) {
	if m.stopped.Load() {
		return nil, RiverError(Err_UNAVAILABLE, "subscription manager is stopped").Tag("syncId", syncID)
	}

	sub := &Subscription{
		log:                 m.log.With("syncId", syncID),
		ctx:                 ctx,
		cancel:              cancel,
		syncID:              syncID,
		Messages:            dynmsgbuf.NewDynamicBuffer[*SyncStreamsResponse](),
		initializingStreams: xsync.NewMap[StreamId, struct{}](),
		backfillEvents:      xsync.NewMap[StreamId, []common.Hash](),
		syncers:             m.syncers,
		registry:            m.registry,
		otelTracer:          m.otelTracer,
	}

	// Register the subscription with the registry
	if err := m.registry.AddSubscription(sub); err != nil {
		return nil, err
	}

	return sub, nil
}

// start starts the subscription manager and listens for messages from the syncer set.
func (m *Manager) start() {
	defer func() {
		m.stopped.Store(true)
		m.registry.CancelAll(m.globalCtx.Err())
	}()

	var msgs []*SyncStreamsResponse
	for {
		select {
		case <-m.globalCtx.Done():
			return
		case _, open := <-m.messages.Wait():
			msgs = m.messages.GetBatch(msgs)

			// nil msgs indicates the buffer is closed
			if msgs == nil {
				return
			}

			for _, msg := range msgs {
				// Ignore messages that are not SYNC_UPDATE or SYNC_DOWN
				if msg.GetSyncOp() != SyncOp_SYNC_UPDATE && msg.GetSyncOp() != SyncOp_SYNC_DOWN {
					m.log.Errorw("Received unexpected sync stream message", "op", msg.GetSyncOp())
					continue
				}

				// Get the stream ID from the message.
				streamID, err := StreamIdFromBytes(msg.StreamID())
				if err != nil {
					m.log.Errorw("Failed to get stream ID from the message", "streamId", msg.StreamID(), "error", err)
					continue
				}

				if len(msg.GetTargetSyncIds()) > 0 {
					m.distributeBackfillMessage(streamID, msg)
				} else {
					m.distributeMessage(streamID, msg)
				}

				// In case of the global context (the node itself) is done in the middle of the sending messages
				// from the current batch, just interrupt the sending process and close.
				select {
				case <-m.globalCtx.Done():
					return
				default:
				}
			}

			// If the client sent a close message, stop sending messages to client from the buffer.
			// In theory should not happen, but just in case.
			if !open {
				return
			}
		}
	}
}

// distributeMessage processes the given message and sends it to all relevant subscriptions.
func (m *Manager) distributeMessage(streamID StreamId, msg *SyncStreamsResponse) {
	// Send the message to all subscriptions for this stream.
	subscriptions := m.registry.GetSubscriptionsForStream(streamID)
	if len(subscriptions) == 0 {
		// No subscriptions for this stream, nothing to do. This should not happen in theory.
		return
	}

	if msg.GetSyncOp() == SyncOp_SYNC_DOWN {
		// The given stream is no longer syncing, remove it from the subscriptions.
		for _, sub := range subscriptions {
			m.registry.RemoveStreamFromSubscription(sub.syncID, streamID)
		}
	}

	// Sending the message to all subscriptions for the given stream.
	// It is safe to use waitgroup here becasue subscribers use dynamic buffer channel and can just throw the
	// error if the buffer is full. Meaning, this is not a blocking by client operation.
	var wg sync.WaitGroup
	var toRemove []string
	for _, subscription := range subscriptions {
		if subscription.isClosed() {
			if msg.GetSyncOp() != SyncOp_SYNC_DOWN {
				// Collect the subscription IDs to remove
				toRemove = append(toRemove, subscription.syncID)
			}
			continue
		}

		wg.Add(1)
		go func(msg *SyncStreamsResponse, subscription *Subscription) {
			defer wg.Done()

			// There is a special logic for the SYNC_UPDATE operation:
			// - If the subscription is still initializing, we skip sending the message before the backfill message is sent.
			// - Filter out backfill events if they were sent already by distributeBackfillMessage in the backfill message.
			if msg.GetSyncOp() == SyncOp_SYNC_UPDATE {
				if _, found := subscription.initializingStreams.Load(streamID); found {
					// If the subscription is still initializing, skip sending the message.
					// It will be sent later when the subscription is ready after sending the backfill message.
					return
				}

				// If the message is a sync update, we need to check if there are any backfill events sent already.
				// If there are, we need to remove them from the message.
				backfillEvents, _ := subscription.backfillEvents.LoadAndDelete(StreamId(msg.StreamID()))
				if len(backfillEvents) > 0 {
					msg.Stream.Events = slices.DeleteFunc(msg.Stream.Events, func(e *Envelope) bool {
						return slices.Contains(backfillEvents, common.BytesToHash(e.Hash))
					})
					msg.Stream.Miniblocks = slices.DeleteFunc(msg.Stream.Miniblocks, func(mb *Miniblock) bool {
						return slices.Contains(backfillEvents, common.BytesToHash(mb.Header.Hash))
					})
				}
			}

			subscription.Send(msg)
		}(proto.CloneOf(msg), subscription)
	}
	wg.Wait()

	// Remove collected subscriptions after iteration is complete
	for _, syncID := range toRemove {
		_ = m.registry.RemoveSubscription(syncID)
	}
}

// distributeBackfillMessage handles a backfill messages targeted to specific subscriptions.
func (m *Manager) distributeBackfillMessage(streamID StreamId, msg *SyncStreamsResponse) {
	// Look for the subscription that matches the target sync ID.
	var sub *Subscription
	for _, subscription := range m.registry.GetSubscriptionsForStream(streamID) {
		if subscription.syncID == msg.GetTargetSyncIds()[0] && !subscription.isClosed() {
			sub = subscription
			break
		}
	}

	if sub == nil {
		// No subscription found for the target sync ID, nothing to do.
		// This can happen if the subscription was closed before the backfill message was sent.
		return
	}

	msg.TargetSyncIds = msg.TargetSyncIds[1:]
	sub.Send(msg)

	// The given stream is in initialization state for the given subscription.
	// Backfill of the stream targeted specifically to the given subscription.
	// Remove the stream from the initializing streams map for the given subscription
	// to start sending updates.
	if _, found := sub.initializingStreams.LoadAndDelete(streamID); found {
		hashes := make([]common.Hash, 0, len(msg.GetStream().GetEvents())+len(msg.GetStream().GetMiniblocks()))
		for _, event := range msg.GetStream().GetEvents() {
			hashes = append(hashes, common.BytesToHash(event.Hash))
		}
		for _, miniblock := range msg.GetStream().GetMiniblocks() {
			hashes = append(hashes, common.BytesToHash(miniblock.Header.Hash))
		}
		sub.backfillEvents.Store(streamID, hashes)
	}
}
