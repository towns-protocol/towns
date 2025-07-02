package subscription

import (
	"context"
	"sync/atomic"

	"github.com/ethereum/go-ethereum/common"
	"github.com/puzpuzpuz/xsync/v4"
	"go.opentelemetry.io/otel/trace"

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
	syncers SyncerSet
	// messages is the global channel for messages of all syncing streams
	messages *dynmsgbuf.DynamicBuffer[*SyncStreamsResponse]
	// Registry is the subscription registry that manages all subscriptions.
	registry Registry
	// distributor is the message distributor that distributes messages to subscriptions.
	distributor *distributor
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

	reg := newRegistry()
	dis := newDistributor(reg, log.Named("distributor"))

	manager := &Manager{
		log:           log,
		localNodeAddr: localNodeAddr,
		globalCtx:     ctx,
		streamCache:   streamCache,
		nodeRegistry:  nodeRegistry,
		otelTracer:    otelTracer,
		syncers:       syncers,
		messages:      messages,
		registry:      reg,
		distributor:   dis,
	}

	go manager.start()

	return manager
}

// Subscribe creates a new subscription with the given sync ID.
func (m *Manager) Subscribe(ctx context.Context, cancel context.CancelCauseFunc, syncID string) (*Subscription, error) {
	if m.stopped.Load() {
		return nil, RiverError(Err_UNAVAILABLE, "subscription manager is stopped").Tag("syncId", syncID)
	}

	// Create a logger for the subscription
	subLogger := m.log.With("syncId", syncID)

	sub := &Subscription{
		log:                 subLogger,
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
	m.registry.AddSubscription(sub)

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
				if err := m.processMessage(msg); err != nil {
					m.log.Errorw("Failed to process message", "error", err, "op", msg.GetSyncOp())
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

// processMessage processes a single message
func (m *Manager) processMessage(msg *SyncStreamsResponse) error {
	// Validate message type
	if msg.GetSyncOp() != SyncOp_SYNC_UPDATE && msg.GetSyncOp() != SyncOp_SYNC_DOWN {
		m.log.Errorw("Received unexpected sync stream message", "op", msg.GetSyncOp())
		return nil
	}

	// Extract stream ID
	streamID, err := StreamIdFromBytes(msg.StreamID())
	if err != nil {
		m.log.Errorw("Failed to get stream ID from message", "streamId", msg.StreamID(), "error", err)
		return err
	}

	// Route message based on type
	if len(msg.GetTargetSyncIds()) > 0 {
		m.distributor.DistributeBackfillMessage(streamID, msg)
	} else {
		m.distributor.DistributeMessage(streamID, msg)
	}

	return nil
}
