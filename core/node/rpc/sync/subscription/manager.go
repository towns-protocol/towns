package subscription

import (
	"context"
	"sync/atomic"
	"time"

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

const (
	unusedStreamsCleanupInterval = 5 * time.Minute // Interval to check for unused streams
)

// Manager is the subscription manager that manages all subscriptions for stream sync operations.
type Manager struct {
	// log is the logger for this stream sync operation
	log *logging.Log
	// globalCtx is the global context of the node
	globalCtx context.Context
	// distributor is the message distributor that distributes messages to subscriptions
	distributor *distributor
	// syncers is the set of syncers that handle stream synchronization
	syncers SyncerSet
	// Registry is the subscription registry that manages all subscriptions.
	registry Registry
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

	reg := newRegistry()
	dis := newDistributor(reg, log.Named("distributor"))

	syncers := client.NewSyncers(ctx, streamCache, nodeRegistry, localNodeAddr, dis, otelTracer)
	go syncers.Run()

	manager := &Manager{
		log:         log,
		globalCtx:   ctx,
		distributor: dis,
		otelTracer:  otelTracer,
		syncers:     syncers,
		registry:    reg,
	}

	go manager.startUnusedStreamsCleaner()

	return manager
}

// Subscribe creates a new subscription with the given sync ID.
func (m *Manager) Subscribe(
	ctx context.Context,
	cancel context.CancelCauseFunc,
	syncID string,
	messages *dynmsgbuf.DynamicBuffer[*SyncStreamsResponse],
) (*Subscription, error) {
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
		Messages:            messages,
		initializingStreams: xsync.NewMap[StreamId, struct{}](),
		backfillEvents:      xsync.NewMap[StreamId, map[common.Hash]struct{}](),
		syncers:             m.syncers,
		registry:            m.registry,
		otelTracer:          m.otelTracer,
	}

	// Register the subscription with the registry
	m.registry.AddSubscription(sub)

	return sub, nil
}

// startUnusedStreamsCleaner starts a goroutine that periodically checks for streams with no subscriptions.
// If a stream has no subscriptions for a certain period, it is considered unused and can be cleaned up to not
// receive updates.
func (m *Manager) startUnusedStreamsCleaner() {
	ticker := time.NewTicker(unusedStreamsCleanupInterval)
	defer ticker.Stop()

	for {
		select {
		case <-m.globalCtx.Done():
			return
		case <-ticker.C:
			m.registry.CleanupUnusedStreams(func(streamID StreamId) {
				ctx, cancel := context.WithTimeout(m.globalCtx, time.Second*5)
				if err := m.syncers.Modify(ctx, client.ModifyRequest{
					ToRemove: [][]byte{streamID[:]},
					RemovingFailureHandler: func(status *SyncStreamOpStatus) {
						m.log.Errorw("Failed to remove unused stream from syncer set",
							"streamId", streamID,
							"error", status.GetMessage(),
							"code", status.GetCode(),
						)
					},
				}); err != nil {
					m.log.Errorw("Failed to drop unused streams from shared syncer set", "error", err)
				}
				cancel()
			})
		}
	}
}
