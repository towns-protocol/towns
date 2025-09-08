package syncv3

import (
	"context"

	"go.opentelemetry.io/otel/trace"

	. "github.com/towns-protocol/towns/core/node/base"
	. "github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/rpc/syncv3/handler"
	. "github.com/towns-protocol/towns/core/node/shared"
)

// Service defines the behavior of the sync V3 service.
type Service interface {
	// SyncStreams creates and starts a sync operation. Given streams are immediately going to be added
	// to the sync operation, and the receiver will receive updates for these streams.
	SyncStreams(ctx context.Context, id string, streams []*SyncCookie, rec handler.Receiver) error
	// ModifySync modifies an existing sync operation. It can add or remove streams from the sync.
	// It can also backfill a specific stream by the given cookie which is already in the sync.
	ModifySync(req *ModifySyncRequest) (*ModifySyncResponse, error)
	// CancelSync cancels an existing sync operation by its ID.
	CancelSync(ctx context.Context, id string) error
	// PingSync pings an existing sync operation by its ID to keep it alive.
	PingSync(ctx context.Context, id, nonce string) error
	// DebugDropStream is a debug method to drop a specific stream from the sync operation.
	DebugDropStream(ctx context.Context, id string, streamId StreamId) error
}

// serviceImpl implements the Service interface with the default business logic.
type serviceImpl struct {
	handlerRegistry handler.Registry
	otelTracer      trace.Tracer
}

// NewService creates a new instance of the sync V3 service.
func NewService(
	handlerRegistry handler.Registry,
	otelTracer trace.Tracer,
) Service {
	return &serviceImpl{
		handlerRegistry: handlerRegistry,
		otelTracer:      otelTracer,
	}
}

func (s *serviceImpl) SyncStreams(ctx context.Context, id string, streams []*SyncCookie, rec handler.Receiver) error {
	h, err := s.handlerRegistry.New(ctx, id, rec)
	if err != nil {
		return err
	}

	if len(streams) > 0 {
		res, err := h.Modify(&ModifySyncRequest{SyncId: id, AddStreams: streams})
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

func (s *serviceImpl) CancelSync(ctx context.Context, id string) error {
	h, ok := s.handlerRegistry.Get(id)
	if !ok {
		return RiverError(Err_NOT_FOUND, "sync operation not found")
	}

	return h.Cancel(ctx)
}

func (s *serviceImpl) PingSync(ctx context.Context, id, nonce string) error {
	h, ok := s.handlerRegistry.Get(id)
	if !ok {
		return RiverError(Err_NOT_FOUND, "sync operation not found")
	}

	h.Ping(ctx, nonce)

	return nil
}

func (s *serviceImpl) DebugDropStream(ctx context.Context, id string, streamId StreamId) error {
	h, ok := s.handlerRegistry.Get(id)
	if !ok {
		return RiverError(Err_NOT_FOUND, "sync operation not found")
	}

	return h.DebugDropStream(ctx, streamId)
}
