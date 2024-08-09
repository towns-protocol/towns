package sync

import (
	"context"
	"sync"

	"connectrpc.com/connect"
	"github.com/ethereum/go-ethereum/common"

	. "github.com/river-build/river/core/node/base"
	"github.com/river-build/river/core/node/events"
	"github.com/river-build/river/core/node/nodes"
	. "github.com/river-build/river/core/node/protocol"
	"github.com/river-build/river/core/node/shared"
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
		streamCache events.StreamCache
		// nodeRegistry is used to find a node endpoint to subscribe on remote streams
		nodeRegistry nodes.NodeRegistry
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
	cache events.StreamCache,
	nodeRegistry nodes.NodeRegistry,
) *handlerImpl {
	return &handlerImpl{
		nodeAddr:     nodeAddr,
		streamCache:  cache,
		nodeRegistry: nodeRegistry,
	}
}

func (h *handlerImpl) SyncStreams(
	ctx context.Context,
	syncId string,
	req *connect.Request[SyncStreamsRequest],
	res *connect.ServerStream[SyncStreamsResponse],
) error {
	op, err := NewStreamsSyncOperation(ctx, syncId, h.nodeAddr, h.streamCache, h.nodeRegistry)
	if err != nil {
		return err
	}

	h.activeSyncOperations.Store(op.SyncID, op)
	defer h.activeSyncOperations.Delete(op.SyncID)

	doneChan := make(chan error, 1)
	defer close(doneChan)

	go h.runSyncStreams(req, res, op, doneChan)
	return <-doneChan
}

func (h *handlerImpl) runSyncStreams(
	req *connect.Request[SyncStreamsRequest],
	res *connect.ServerStream[SyncStreamsResponse],
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
	if op, ok := h.activeSyncOperations.Load(req.Msg.GetSyncId()); ok {
		return op.(*StreamSyncOperation).AddStreamToSync(ctx, req)
	}
	return nil, RiverError(Err_NOT_FOUND, "unknown sync operation").Tag("syncId", req.Msg.GetSyncId())
}

func (h *handlerImpl) RemoveStreamFromSync(
	ctx context.Context,
	req *connect.Request[RemoveStreamFromSyncRequest],
) (*connect.Response[RemoveStreamFromSyncResponse], error) {
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
