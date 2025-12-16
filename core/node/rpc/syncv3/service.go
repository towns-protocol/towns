package syncv3

import (
	"context"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"go.opentelemetry.io/otel/trace"

	. "github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/events"
	"github.com/towns-protocol/towns/core/node/infra"
	"github.com/towns-protocol/towns/core/node/logging"
	"github.com/towns-protocol/towns/core/node/nodes"
	. "github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/rpc/syncv3/eventbus"
	"github.com/towns-protocol/towns/core/node/rpc/syncv3/handler"
	. "github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/utils/timing"
)

// Service defines the behavior of the sync V3 service.
type Service interface {
	// SyncStreams creates and starts a sync operation. Given streams will be added
	// to the sync operation. If the function returns without error, it is gurarnteed that the given recipient
	// will receive >= 1 update for each stream (either backfill or stream down message).
	SyncStreams(ctx context.Context, syncID string, streams []*SyncCookie, rec handler.Receiver) error

	// ModifySync modifies an existing sync operation. It can add or remove streams from the sync.
	// It can also backfill a specific stream by the given cookie which is already syncing.
	ModifySync(ctx context.Context, req *ModifySyncRequest) (*ModifySyncResponse, error)

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
	streamCache *events.StreamCache,
	nodeRegistry nodes.NodeRegistry,
	metrics infra.MetricsFactory,
	otelTracer trace.Tracer,
) Service {
	eventBus := eventbus.New(ctx, localAddr, streamCache, nodeRegistry, metrics, otelTracer)
	registry := handler.NewRegistry(streamCache, eventBus, metrics)
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
	timer := timing.NewTimer("SyncStreams")
	ctx = timer.Start(ctx)
	defer func() {
		report := timer.Report()
		if report.Took > 30*time.Second {
			logging.FromCtx(ctx).Warnw("SyncStreams slow", "timing", report)
		}
	}()

	ctx = timing.StartSpan(ctx, "handlerRegistry.New")
	h, err := s.handlerRegistry.New(ctx, syncID, rec)
	ctx = timing.End(ctx, err)
	if err != nil {
		return err
	}
	defer s.handlerRegistry.Remove(syncID)

	if len(streams) > 0 {
		ctx = timing.StartSpan(ctx, "handler.Modify")
		res, err := h.Modify(ctx, &ModifySyncRequest{SyncId: syncID, AddStreams: streams})
		ctx = timing.End(ctx, err)
		if err != nil {
			return err
		}

		// If there were any errors when adding initial streams, just cancel the sync operation and return error.
		// In theory, there should not be any errors when adding initial streams since the only error that can
		// happen is the event bus queue is closed one which should not happen. Just in case, handle it here.
		if len(res.GetAdds()) > 0 {
			return RiverError(Err_INVALID_ARGUMENT, "failed to add initial streams").
				Tags("failedStreams", res.GetAdds())
		}
	}

	ctx = timing.StartSpan(ctx, "handler.Run")
	err = h.Run()
	timing.End(ctx, err)
	return err
}

func (s *serviceImpl) ModifySync(ctx context.Context, req *ModifySyncRequest) (*ModifySyncResponse, error) {
	timer := timing.NewTimer("ModifySync")
	ctx = timer.Start(ctx)
	defer func() {
		report := timer.Report()
		if report.Took > 30*time.Second {
			logging.FromCtx(ctx).Warnw("ModifySync slow", "timing", report)
		}
	}()

	h, ok := s.handlerRegistry.Get(req.GetSyncId())
	if !ok {
		return nil, RiverError(Err_NOT_FOUND, "sync operation not found")
	}

	ctx = timing.StartSpan(ctx, "handler.Modify")
	res, err := h.Modify(ctx, req)
	timing.End(ctx, err)
	return res, err
}

func (s *serviceImpl) CancelSync(ctx context.Context, syncID string) error {
	timer := timing.NewTimer("CancelSync")
	ctx = timer.Start(ctx)
	defer func() {
		report := timer.Report()
		if report.Took > 30*time.Second {
			logging.FromCtx(ctx).Warnw("CancelSync slow", "timing", report)
		}
	}()

	h, ok := s.handlerRegistry.Get(syncID)
	if !ok {
		return RiverError(Err_NOT_FOUND, "sync operation not found")
	}

	ctx = timing.StartSpan(ctx, "handler.Cancel")
	err := h.Cancel(ctx)
	timing.End(ctx, err)
	return err
}

func (s *serviceImpl) PingSync(ctx context.Context, syncID, nonce string) error {
	timer := timing.NewTimer("PingSync")
	ctx = timer.Start(ctx)
	defer func() {
		report := timer.Report()
		if report.Took > 30*time.Second {
			logging.FromCtx(ctx).Warnw("PingSync slow", "timing", report)
		}
	}()

	h, ok := s.handlerRegistry.Get(syncID)
	if !ok {
		return RiverError(Err_NOT_FOUND, "sync operation not found")
	}

	h.Ping(ctx, nonce)

	return nil
}

func (s *serviceImpl) DebugDropStream(ctx context.Context, syncID string, streamID StreamId) error {
	timer := timing.NewTimer("DebugDropStream")
	ctx = timer.Start(ctx)
	defer func() {
		report := timer.Report()
		if report.Took > 30*time.Second {
			logging.FromCtx(ctx).Warnw("DebugDropStream slow", "timing", report)
		}
	}()

	h, ok := s.handlerRegistry.Get(syncID)
	if !ok {
		return RiverError(Err_NOT_FOUND, "sync operation not found")
	}

	ctx = timing.StartSpan(ctx, "handler.DebugDropStream")
	err := h.DebugDropStream(ctx, streamID)
	timing.End(ctx, err)
	return err
}
