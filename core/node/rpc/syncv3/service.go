package syncv3

import (
	"context"

	"github.com/ethereum/go-ethereum/common"
	"go.opentelemetry.io/otel/trace"

	. "github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/events"
	"github.com/towns-protocol/towns/core/node/infra"
	"github.com/towns-protocol/towns/core/node/nodes"
	. "github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/rpc/syncv3/eventbus"
	"github.com/towns-protocol/towns/core/node/rpc/syncv3/handler"
	. "github.com/towns-protocol/towns/core/node/shared"
)

// Service defines the behavior of the sync V3 service.
type Service interface {
	// SyncStreams creates and starts a sync operation. Given streams will be added
	// to the sync operation. If the function returns without error, it is gurarnteed that the given recipient
	// will receive >= 1 update for each stream (either backfill or stream down message).
	SyncStreams(ctx context.Context, syncID string, streams []*SyncCookie, rec handler.Receiver) error

	// ModifySync modifies an existing sync operation. It can add or remove streams from the sync.
	// It can also backfill a specific stream by the given cookie which is already syncing.
	ModifySync(req *ModifySyncRequest) (*ModifySyncResponse, error)

	// CancelSync cancels an existing sync operation by its ID.
	CancelSync(ctx context.Context, syncID string) error

	// PingSync pings an existing sync operation by its ID to keep it alive.
	PingSync(ctx context.Context, syncID, nonce string) error

	// DebugDropStream is a debug method to drop a specific stream from the sync operation.
	DebugDropStream(ctx context.Context, syncID string, streamID StreamId) error
}

// serviceImpl implements the Service interface with the default business logic.
type serviceImpl struct {
	handlerRegistry handler.Registry
	otelTracer      trace.Tracer
}

// NewService creates a new instance of the sync V3 service.
func NewService(
	ctx context.Context,
	localAddr common.Address,
	cache *events.StreamCache,
	nodeRegistry nodes.NodeRegistry,
	metrics infra.MetricsFactory,
	otelTracer trace.Tracer,
) Service {
	eventBus := eventbus.New(ctx, localAddr, cache, nodeRegistry, metrics, otelTracer)
	registry := handler.NewRegistry(eventBus, metrics)
	return &serviceImpl{
		handlerRegistry: registry,
		otelTracer:      otelTracer,
	}
}

func (s *serviceImpl) SyncStreams(
	ctx context.Context,
	syncID string,
	streams []*SyncCookie,
	rec handler.Receiver,
) error {
	h, err := s.handlerRegistry.New(ctx, syncID, rec)
	if err != nil {
		return err
	}
	defer s.handlerRegistry.Remove(syncID)

	if len(streams) > 0 {
		res, err := h.Modify(&ModifySyncRequest{SyncId: syncID, AddStreams: streams})
		if err != nil {
			_ = h.Cancel(ctx)
			return err
		}

		if len(res.GetAdds()) > 0 {
			return h.Cancel(ctx)
		}
	}

	return h.Run()
}

func (s *serviceImpl) ModifySync(req *ModifySyncRequest) (*ModifySyncResponse, error) {
	h, ok := s.handlerRegistry.Get(req.GetSyncId())
	if !ok {
		return nil, RiverError(Err_NOT_FOUND, "sync operation not found")
	}

	return h.Modify(req)
}

func (s *serviceImpl) CancelSync(ctx context.Context, syncID string) error {
	h, ok := s.handlerRegistry.Get(syncID)
	if !ok {
		return RiverError(Err_NOT_FOUND, "sync operation not found")
	}

	return h.Cancel(ctx)
}

func (s *serviceImpl) PingSync(ctx context.Context, syncID, nonce string) error {
	h, ok := s.handlerRegistry.Get(syncID)
	if !ok {
		return RiverError(Err_NOT_FOUND, "sync operation not found")
	}

	h.Ping(ctx, nonce)

	return nil
}

func (s *serviceImpl) DebugDropStream(ctx context.Context, syncID string, streamID StreamId) error {
	h, ok := s.handlerRegistry.Get(syncID)
	if !ok {
		return RiverError(Err_NOT_FOUND, "sync operation not found")
	}

	return h.DebugDropStream(ctx, streamID)
}
