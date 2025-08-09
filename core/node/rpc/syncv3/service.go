package syncv3

import (
	"context"

	"go.opentelemetry.io/otel/trace"

	. "github.com/towns-protocol/towns/core/node/base"
	. "github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/rpc/syncv3/handler"
	. "github.com/towns-protocol/towns/core/node/shared"
)

type (
	// Service defines the behavior of the sync V3 service.
	Service interface {
		// SyncStreams creates and starts a sync operation. Given streams are immediately going to be added
		// to the sync operation, and the receiver will receive updates for these streams.
		SyncStreams(ctx context.Context, id string, streams []*SyncCookie, rec handler.Receiver) error
		// ModifySync modifies an existing sync operation. It can add or remove streams from the sync.
		// It can also backfill a specific stream by the given cookie which is already in the sync.
		ModifySync(ctx context.Context, req *ModifySyncRequest) (*ModifySyncResponse, error)
		// CancelSync cancels an existing sync operation by its ID.
		CancelSync(ctx context.Context, id string) error
		// PingSync pings an existing sync operation by its ID to keep it alive.
		PingSync(ctx context.Context, id string)
		// DebugDropStream is a debug method to drop a specific stream from the sync operation.
		DebugDropStream(ctx context.Context, id string, streamId StreamId) error
	}
)

// serviceImpl implements the Service interface with the default business logic.
type serviceImpl struct {
	// otelTracer is used to trace individual sync operations, tracing is disabled if nil
	otelTracer trace.Tracer
	// handlerRegistry is used to manage sync stream handlers.
	handlerRegistry handler.SyncStreamHandlerRegistry
}

// NewService creates a new instance of the sync V3 service.
func NewService(
	otelTracer trace.Tracer,
) Service {
	return &serviceImpl{
		otelTracer: otelTracer,
	}
}

func (s *serviceImpl) SyncStreams(ctx context.Context, id string, streams []*SyncCookie, rec handler.Receiver) error {
	return RiverError(Err_UNIMPLEMENTED, "SyncStreams is not implemented yet in V3")
}

func (s *serviceImpl) ModifySync(ctx context.Context, req *ModifySyncRequest) (*ModifySyncResponse, error) {
	return nil, RiverError(Err_UNIMPLEMENTED, "ModifySync is not implemented yet in V3")
}

func (s *serviceImpl) CancelSync(ctx context.Context, id string) error {
	return RiverError(Err_UNIMPLEMENTED, "CancelSync is not implemented yet in V3")
}

func (s *serviceImpl) PingSync(ctx context.Context, id string) {

}

func (s *serviceImpl) DebugDropStream(ctx context.Context, id string, streamId StreamId) error {
	return RiverError(Err_UNIMPLEMENTED, "DebugDropStream is not implemented yet in V3")
}
