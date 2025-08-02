package syncv3

import (
	"context"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"go.opentelemetry.io/otel/trace"

	. "github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/nodes"
	. "github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/utils/dynmsgbuf"
)

type (
	// Receiver is an interface that defines the method to send sync stream responses.
	// It is not thread safe so the race detector will throw an error if multiple goroutines
	// try to call Send at the same time.
	Receiver interface {
		Send(*SyncStreamsResponse) error
	}

	// Service defines the behavior of the sync V3 service.
	Service interface {
		// SyncStreams creates and starts a sync operation. Given streams are immediately going to be added
		// to the sync operation, and the receiver will receive updates for these streams.
		SyncStreams(ctx context.Context, id string, streams []*SyncCookie, rec Receiver) error
		// ModifySync modifies an existing sync operation. It can add or remove streams from the sync.
		// It can also backfill a specific stream by the given cookie which is already in the sync.
		ModifySync(ctx context.Context, req *ModifySyncRequest) (*ModifySyncResponse, error)
		// CancelSync cancels an existing sync operation by its ID.
		CancelSync(ctx context.Context, id string) error
		// PingSync pings an existing sync operation by its ID to keep it alive.
		PingSync(ctx context.Context, id, nonce string) error
		// DebugDropStream is a debug method to drop a specific stream from the sync operation.
		DebugDropStream(ctx context.Context, id string, streamId StreamId) error
	}
)

// serviceImpl implements the Service interface with the default business logic.
type serviceImpl struct {
	// localAddr is the address of the local node.
	localAddr common.Address
	// eventBus is the event bus that handles events and messages.
	eventBus EventBus[EventBusMessage]
	// operationRegistry is the registry of sync operations and their state.
	operationRegistry OperationRegistry
	// otelTracer is used to trace individual sync operations, tracing is disabled if nil
	otelTracer trace.Tracer
}

// NewService creates a new instance of the sync V3 service.
func NewService(
	ctx context.Context,
	localAddr common.Address,
	nodeRegistry nodes.NodeRegistry,
	streamCache StreamCache,
	otelTracer trace.Tracer,
) Service {
	// Create a dynamic message buffer for the event bus queue.
	// There is a cyclic dependency between the event bus and the syncer registry,
	// so we need to create the event bus queue first and pass it to these components.
	// TODO: Come up with a better way to handle cyclic dependencies here.
	eventBusQueue := dynmsgbuf.NewDynamicBufferWithSize[EventBusMessage](eventBusBufferSize)

	opReg := NewRegistry()
	syncerReg := NewSyncerRegistry(
		ctx,
		localAddr,
		eventBusQueue,
		nodeRegistry,
		streamCache,
		otelTracer,
	)
	return &serviceImpl{
		localAddr:         localAddr,
		eventBus:          NewEventBus(ctx, eventBusQueue, syncerReg, opReg),
		operationRegistry: opReg,
		otelTracer:        otelTracer,
	}
}

func (s *serviceImpl) SyncStreams(ctx context.Context, id string, streams []*SyncCookie, rec Receiver) error {
	// Wrap the receiver with an OpenTelemetry sender if the tracer is set.
	if s.otelTracer != nil {
		rec = &otelSender{
			ctx:        ctx,
			otelTracer: s.otelTracer,
			sender:     rec,
		}
	}

	// Send initial sync streams response to the receiver.
	if err := rec.Send(&SyncStreamsResponse{
		SyncId: id,
		SyncOp: SyncOp_SYNC_NEW,
	}); err != nil {
		return err
	}

	// Create a new sync operation with the given ID and receiver.
	op := NewOperation(
		ctx,
		id,
		rec,
		s.eventBus,
		s.operationRegistry,
		s.otelTracer,
	)

	// Add the given operation to the registry.
	remove, err := s.operationRegistry.AddOp(op)
	if err != nil {
		return AsRiverError(err).
			Tag("syncId", id).
			Func("SyncStreams")
	}
	defer remove()

	// If initial list of streams is not empty, we need to add them to the sync operation.
	if len(streams) > 0 {
		ctx, cancel := context.WithTimeout(ctx, time.Second*30)
		defer cancel()

		resp, err := op.Modify(ctx, &ModifySyncRequest{
			SyncId:     id,
			AddStreams: streams,
		})
		if err != nil {
			return AsRiverError(err).
				Tag("syncId", id).
				Tag("streams", len(streams)).
				Func("SyncStreams")
		}

		if len(resp.GetAdds()) > 0 {
			for _, add := range resp.GetAdds() {
				op.OnStreamUpdate(&SyncStreamsResponse{
					SyncOp:   SyncOp_SYNC_DOWN,
					StreamId: add.GetStreamId(),
				})
			}
		}
	}

	// Wait for the operation to finish.
	<-ctx.Done()

	return context.Cause(ctx)
}

func (s *serviceImpl) ModifySync(ctx context.Context, req *ModifySyncRequest) (*ModifySyncResponse, error) {
	op, ok := s.operationRegistry.GetOp(req.GetSyncId())
	if !ok {
		return nil, RiverError(Err_NOT_FOUND, "Sync operation not found").Func("ModifySync")
	}

	resp, err := op.Modify(ctx, req)
	if err != nil {
		return nil, AsRiverError(err).
			Tag("syncId", req.GetSyncId()).
			Func("ModifySync")
	}

	return resp, nil
}

func (s *serviceImpl) CancelSync(ctx context.Context, id string) error {
	op, ok := s.operationRegistry.GetOp(id)
	if !ok {
		return RiverError(Err_NOT_FOUND, "Sync operation not found").
			Tag("syncId", id).
			Func("CancelSync")
	}

	return op.Cancel(ctx)
}

func (s *serviceImpl) PingSync(ctx context.Context, id, nonce string) error {
	op, ok := s.operationRegistry.GetOp(id)
	if !ok {
		return RiverError(Err_NOT_FOUND, "Sync operation not found").
			Tag("syncId", id).
			Func("PingSync")
	}

	op.Ping(ctx, nonce)

	return nil
}

func (s *serviceImpl) DebugDropStream(ctx context.Context, id string, streamId StreamId) error {
	op, ok := s.operationRegistry.GetOp(id)
	if !ok {
		return RiverError(Err_NOT_FOUND, "Sync operation not found").
			Func("DebugDropStream")
	}

	op.DebugDropStream(ctx, streamId)

	return nil
}
