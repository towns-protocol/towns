package sync

import (
	"context"
	"sync"
	"time"

	"connectrpc.com/connect"
	"github.com/ethereum/go-ethereum/common"
	. "github.com/towns-protocol/towns/core/node/base"
	. "github.com/towns-protocol/towns/core/node/events"
	"github.com/towns-protocol/towns/core/node/nodes"
	. "github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/shared"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/trace"
)

type (
	// Handler defines the external grpc interface that clients can call.
	Handler interface {
		// SyncStreams runs a stream sync operation that subscribes to streams on the local node and remote nodes.
		// It returns syncId, if any and an error.
		SyncStreams(
			ctx context.Context,
			syncId string,
			req *connect.Request[SyncStreamsRequest],
			res *connect.ServerStream[SyncStreamsResponse],
		) error

		AddStreamToSync(
			ctx context.Context,
			req *connect.Request[AddStreamToSyncRequest],
		) (*connect.Response[AddStreamToSyncResponse], error)

		RemoveStreamFromSync(
			ctx context.Context,
			req *connect.Request[RemoveStreamFromSyncRequest],
		) (*connect.Response[RemoveStreamFromSyncResponse], error)

		CancelSync(
			ctx context.Context,
			req *connect.Request[CancelSyncRequest],
		) (*connect.Response[CancelSyncResponse], error)

		PingSync(
			ctx context.Context,
			req *connect.Request[PingSyncRequest],
		) (*connect.Response[PingSyncResponse], error)
	}

	// DebugHandler defines the external grpc interface that clients can call for debugging purposes.
	DebugHandler interface {
		// DebugDropStream drops the stream from the sync session and sends the stream down message to the client.
		DebugDropStream(
			ctx context.Context,
			syncID string,
			streamID shared.StreamId,
		) error
	}

	handlerImpl struct {
		// nodeAddr is used to determine if a stream is local or remote
		nodeAddr common.Address
		// streamCache is used to subscribe on local streams
		streamCache *StreamCache
		// nodeRegistry is used to find a node endpoint to subscribe on remote streams
		nodeRegistry nodes.NodeRegistry
		// otelTracer is used to trace individual sync Send operations, tracing is disabled if nil
		otelTracer trace.Tracer
		// activeSyncOperations keeps a mapping from SyncID -> *StreamSyncOperation
		activeSyncOperations sync.Map
	}
)

var (
	_ Handler      = (*handlerImpl)(nil)
	_ DebugHandler = (*handlerImpl)(nil)
)

// NewHandler returns a structure that implements the Handler interface.
// It keeps internally a map of in progress stream sync operations and forwards add stream, remove sream, cancel sync
// requests to the associated stream sync operation.
func NewHandler(
	nodeAddr common.Address,
	cache *StreamCache,
	nodeRegistry nodes.NodeRegistry,
	otelTracer trace.Tracer,
) *handlerImpl {
	return &handlerImpl{
		nodeAddr:     nodeAddr,
		streamCache:  cache,
		nodeRegistry: nodeRegistry,
		otelTracer:   otelTracer,
	}
}

func (h *handlerImpl) SyncStreams(
	ctx context.Context,
	syncId string,
	req *connect.Request[SyncStreamsRequest],
	res *connect.ServerStream[SyncStreamsResponse],
) error {
	op, err := NewStreamsSyncOperation(ctx, syncId, h.nodeAddr, h.streamCache, h.nodeRegistry, h.otelTracer)
	if err != nil {
		return err
	}

	h.activeSyncOperations.Store(op.SyncID, op)
	defer h.activeSyncOperations.Delete(op.SyncID)

	doneChan := make(chan error, 1)
	defer close(doneChan)

	var sender StreamsResponseSubscriber = res
	if h.otelTracer != nil {
		sender = &otelSender{
			ctx:        ctx,
			otelTracer: h.otelTracer,
			sender:     res,
		}
	}

	go h.runSyncStreams(req, sender, op, doneChan)
	return <-doneChan
}

// StreamsResponseSubscriber is helper interface that allows a custom streams sync subscriber to be given in unit tests.
type StreamsResponseSubscriber interface {
	Send(msg *SyncStreamsResponse) error
}

type otelSender struct {
	ctx        context.Context
	otelTracer trace.Tracer
	sender     StreamsResponseSubscriber
}

func (s *otelSender) Send(msg *SyncStreamsResponse) error {
	_, span := s.otelTracer.Start(s.ctx, "SyncStreamsResponse")
	defer span.End()

	streamIdBytes := msg.GetStreamId()
	if streamIdBytes == nil {
		streamIdBytes = msg.Stream.GetNextSyncCookie().GetStreamId()
	}
	if streamIdBytes != nil {
		id, err := shared.StreamIdFromBytes(streamIdBytes)
		if err == nil {
			span.SetAttributes(attribute.String("streamId", id.String()))
		}
	}
	span.SetAttributes(
		attribute.String("syncOp", msg.GetSyncOp().String()),
		attribute.String("syncId", msg.GetSyncId()),
	)

	err := s.sender.Send(msg)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
	}
	return err
}

func (h *handlerImpl) runSyncStreams(
	req *connect.Request[SyncStreamsRequest],
	res StreamsResponseSubscriber,
	op *StreamSyncOperation,
	doneChan chan error,
) {
	// send SyncID to client
	if err := res.Send(&SyncStreamsResponse{
		SyncId: op.SyncID,
		SyncOp: SyncOp_SYNC_NEW,
	}); err != nil {
		doneChan <- AsRiverError(err).Func("SyncStreams")
		return
	}

	// run until sub.ctx expires or until the client calls CancelSync
	doneChan <- op.Run(req, res)
}

func (h *handlerImpl) AddStreamToSync(
	ctx context.Context,
	req *connect.Request[AddStreamToSyncRequest],
) (*connect.Response[AddStreamToSyncResponse], error) {
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	if op, ok := h.activeSyncOperations.Load(req.Msg.GetSyncId()); ok {
		return op.(*StreamSyncOperation).AddStreamToSync(ctx, req)
	}
	return nil, RiverError(Err_NOT_FOUND, "unknown sync operation").Tag("syncId", req.Msg.GetSyncId())
}

func (h *handlerImpl) RemoveStreamFromSync(
	ctx context.Context,
	req *connect.Request[RemoveStreamFromSyncRequest],
) (*connect.Response[RemoveStreamFromSyncResponse], error) {
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	if op, ok := h.activeSyncOperations.Load(req.Msg.GetSyncId()); ok {
		return op.(*StreamSyncOperation).RemoveStreamFromSync(ctx, req)
	}
	return nil, RiverError(Err_NOT_FOUND, "unknown sync operation").Tag("syncId", req.Msg.GetSyncId())
}

func (h *handlerImpl) CancelSync(
	ctx context.Context,
	req *connect.Request[CancelSyncRequest],
) (*connect.Response[CancelSyncResponse], error) {
	if op, ok := h.activeSyncOperations.Load(req.Msg.GetSyncId()); ok {
		// sync op is dropped from h.activeSyncOps when SyncStreams returns
		return op.(*StreamSyncOperation).CancelSync(ctx, req)
	}
	return nil, RiverError(Err_NOT_FOUND, "unknown sync operation").Tag("syncId", req.Msg.GetSyncId())
}

func (h *handlerImpl) PingSync(
	ctx context.Context,
	req *connect.Request[PingSyncRequest],
) (*connect.Response[PingSyncResponse], error) {
	if op, ok := h.activeSyncOperations.Load(req.Msg.GetSyncId()); ok {
		return op.(*StreamSyncOperation).PingSync(ctx, req)
	}
	return nil, RiverError(Err_NOT_FOUND, "unknown sync operation").Tag("syncId", req.Msg.GetSyncId())
}

func (h *handlerImpl) DebugDropStream(
	ctx context.Context,
	syncID string,
	streamID shared.StreamId,
) error {
	if op, ok := h.activeSyncOperations.Load(syncID); ok {
		return op.(*StreamSyncOperation).debugDropStream(ctx, streamID)
	}
	return RiverError(Err_NOT_FOUND, "unknown sync operation").Tag("syncId", syncID)
}
