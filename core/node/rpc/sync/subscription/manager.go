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
	// sLock is the mutex that protects the subscriptions map
	sLock sync.Mutex
	// subscriptions is a map of stream IDs to subscriptions.
	subscriptions map[StreamId][]*Subscription
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
	log := logging.FromCtx(ctx).With("node", localNodeAddr)

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
		subscriptions: make(map[StreamId][]*Subscription),
	}

	go manager.start()

	return manager
}

// Subscribe creates a new subscription with the given sync ID.
func (m *Manager) Subscribe(ctx context.Context, cancel context.CancelCauseFunc, syncID string) (*Subscription, error) {
	if m.stopped.Load() {
		return nil, RiverError(Err_UNAVAILABLE, "subscription manager is stopped").Tag("syncId", syncID)
	}

	return &Subscription{
		log:                 m.log.With("syncId", syncID),
		ctx:                 ctx,
		cancel:              cancel,
		syncID:              syncID,
		Messages:            dynmsgbuf.NewDynamicBuffer[*SyncStreamsResponse](),
		manager:             m,
		initializingStreams: xsync.NewMap[StreamId, struct{}](),
		backfillEvents:      xsync.NewMap[StreamId, []common.Hash](),
	}, nil
}

// start starts the subscription manager and listens for messages from the syncer set.
func (m *Manager) start() {
	defer func() {
		m.stopped.Store(true)
		m.cancelAllSubscriptions(m.globalCtx.Err())
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
				// Distribute the messages to all relevant subscriptions.
				m.distributeMessage(msg)

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
func (m *Manager) distributeMessage(msg *SyncStreamsResponse) {
	// Ignore messages that are not SYNC_UPDATE or SYNC_DOWN
	if msg.GetSyncOp() != SyncOp_SYNC_UPDATE && msg.GetSyncOp() != SyncOp_SYNC_DOWN {
		m.log.Errorw("Received unexpected sync stream message", "op", msg.GetSyncOp())
		return
	}

	// Get the stream ID from the message. Depending on the operation type, it can be either from the message itself
	// or from the next sync cookie of the stream.
	var streamIDRaw []byte
	if msg.GetSyncOp() == SyncOp_SYNC_DOWN {
		streamIDRaw = msg.GetStreamId()
	} else {
		streamIDRaw = msg.GetStream().GetNextSyncCookie().GetStreamId()
	}

	streamID, err := StreamIdFromBytes(streamIDRaw)
	if err != nil || streamID == (StreamId{}) {
		m.log.Errorw("Failed to get stream ID from the message", "op", streamID, "err", err)
		return
	}

	// Send the message to all subscriptions for this stream.
	m.sLock.Lock()
	subscriptions, ok := m.subscriptions[streamID]
	if !ok || len(subscriptions) == 0 {
		// No subscriptions for this stream, nothing to do.
		go m.dropStream(streamID)
		m.sLock.Unlock()
		return
	}

	if msg.GetSyncOp() == SyncOp_SYNC_DOWN {
		// The given stream is no longer syncing, remove it from the subscriptions.
		delete(m.subscriptions, streamID)
	}
	m.sLock.Unlock()

	// If the given message has a specific target subscription, just fetch the subscription by the sync ID
	if len(msg.GetTargetSyncIds()) > 0 {
		// Applicable only for backfill operation
		var sub *Subscription
		for _, subscription := range subscriptions {
			if subscription.syncID == msg.GetTargetSyncIds()[0] && !subscription.isClosed() {
				sub = subscription
				break
			}
		}

		// If the subscription is closed, just skip sending the message.
		// This can happen if a client immediately closes the subscription before receiving the backfill message.
		if sub != nil {
			msg.TargetSyncIds = msg.TargetSyncIds[1:]
			sub.Send(msg)

			if _, found := sub.initializingStreams.Load(streamID); found {
				// The given stream is in initialization state for the given subscription.
				// Backfill of the stream targeted specifically to the given subscription.
				// Remove the stream from the initializing streams map for the given subscription
				// to start sending updates.
				sub.initializingStreams.Delete(streamID)

				// Store backfill events and miniblocks hashes for the given stream in the subscription.
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
		return
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

		if _, found := subscription.initializingStreams.Load(streamID); found {
			// If the subscription is still initializing, skip sending the message.
			// It will be sent later when the subscription is ready.
			continue
		}

		wg.Add(1)
		go func(subscription *Subscription) {
			msg := proto.Clone(msg).(*SyncStreamsResponse)

			// Prevent sending duplicates that have already been sent to the client in the backfill message.
			backfillEvents, loaded := subscription.backfillEvents.LoadAndDelete(streamID)
			if loaded && len(backfillEvents) > 0 {
				msg.Stream.Events = slices.DeleteFunc(msg.Stream.Events, func(e *Envelope) bool {
					return slices.Contains(backfillEvents, common.BytesToHash(e.Hash))
				})
				msg.Stream.Miniblocks = slices.DeleteFunc(msg.Stream.Miniblocks, func(mb *Miniblock) bool {
					return slices.Contains(backfillEvents, common.BytesToHash(mb.Header.Hash))
				})
			}

			subscription.Send(msg)
			wg.Done()
		}(subscription)
	}
	wg.Wait()

	// Remove collected subscriptions after iteration is complete
	if len(toRemove) > 0 {
		m.sLock.Lock()
		m.subscriptions[streamID] = slices.DeleteFunc(m.subscriptions[streamID], func(s *Subscription) bool {
			return slices.Contains(toRemove, s.syncID)
		})
		m.sLock.Unlock()
	}
}

// dropStream removes the given stream from the syncers set and all subscriptions.
func (m *Manager) dropStream(streamID StreamId) {
	if err := m.syncers.Modify(m.globalCtx, client.ModifyRequest{
		ToRemove: [][]byte{streamID[:]},
		RemovingFailureHandler: func(status *SyncStreamOpStatus) {
			m.log.Errorw("Failed to remove stream from syncer set", "streamId", streamID, "status", status)
		},
	}); err != nil {
		m.log.Errorw("Failed to drop stream from syncer set", "streamId", streamID, "err", err)
	}
}

// cancelAllSubscriptions cancels all subscriptions with the given error.
func (m *Manager) cancelAllSubscriptions(err error) {
	m.sLock.Lock()
	for _, subscriptions := range m.subscriptions {
		for _, sub := range subscriptions {
			if !sub.isClosed() {
				sub.cancel(err)
			}
		}
	}
	m.subscriptions = make(map[StreamId][]*Subscription)
	m.sLock.Unlock()
}
