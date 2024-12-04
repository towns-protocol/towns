package sync

import (
	"context"
	"time"

	"github.com/river-build/river/core/node/dlog"

	"connectrpc.com/connect"
	"github.com/ethereum/go-ethereum/common"

	. "github.com/river-build/river/core/node/base"
	"github.com/river-build/river/core/node/events"
	"github.com/river-build/river/core/node/nodes"
	. "github.com/river-build/river/core/node/protocol"
	"github.com/river-build/river/core/node/rpc/sync/client"
	"github.com/river-build/river/core/node/shared"
)

type (
	// StreamSyncOperation represents a stream sync operation that is currently in progress.
	StreamSyncOperation struct {
		// SyncID is the identifier as used with the external client to identify the streams sync operation.
		SyncID string
		// rootCtx is the context as passed in from the client
		rootCtx context.Context
		// ctx is the root context for this subscription, when expires the subscription and all background syncers are
		// cancelled
		ctx context.Context
		// cancel sync operation by expiring ctx
		cancel context.CancelCauseFunc
		// commands holds incoming requests from the client to add/remove/cancel commands
		commands chan *subCommand
		// thisNodeAddress keeps the address of this stream  thisNodeAddress instance
		thisNodeAddress common.Address
		// streamCache gives access to streams managed by this thisNodeAddress
		streamCache events.StreamCache
		// nodeRegistry is used to get the remote remoteNode endpoint from a thisNodeAddress address
		nodeRegistry nodes.NodeRegistry
	}

	// subCommand represents a request to add or remove a stream and ping sync operation
	subCommand struct {
		Ctx             context.Context
		RmStreamReq     *connect.Request[RemoveStreamFromSyncRequest]
		AddStreamReq    *connect.Request[AddStreamToSyncRequest]
		PingReq         *connect.Request[PingSyncRequest]
		CancelReq       *connect.Request[CancelSyncRequest]
		DebugDropStream shared.StreamId
		reply           chan error
	}
)

func (cmd *subCommand) Reply(err error) {
	if err != nil {
		cmd.reply <- err
	}
	close(cmd.reply)
}

// NewStreamsSyncOperation initialises a new sync stream operation. It groups the given syncCookies per stream node
// by its address and subscribes on the internal stream streamCache for local streams.
//
// Use the Run method to start syncing.
func NewStreamsSyncOperation(
	ctx context.Context,
	syncId string,
	node common.Address,
	streamCache events.StreamCache,
	nodeRegistry nodes.NodeRegistry,
) (*StreamSyncOperation, error) {
	// make the sync operation cancellable for CancelSync
	syncOpCtx, cancel := context.WithCancelCause(ctx)

	return &StreamSyncOperation{
		rootCtx:         ctx,
		ctx:             syncOpCtx,
		cancel:          cancel,
		SyncID:          syncId,
		thisNodeAddress: node,
		commands:        make(chan *subCommand, 64),
		streamCache:     streamCache,
		nodeRegistry:    nodeRegistry,
	}, nil
}

// Run the stream sync until either sub.Cancel is called or until sub.ctx expired
func (syncOp *StreamSyncOperation) Run(
	req *connect.Request[SyncStreamsRequest],
	res StreamsResponseSubscriber,
) error {
	log := dlog.FromCtx(syncOp.ctx).With("syncId", syncOp.SyncID)

	cookies, err := client.ValidateAndGroupSyncCookies(req.Msg.GetSyncPos())
	if err != nil {
		return err
	}

	syncers, messages, err := client.NewSyncers(
		syncOp.ctx, syncOp.cancel, syncOp.SyncID, syncOp.streamCache,
		syncOp.nodeRegistry, syncOp.thisNodeAddress, cookies)
	if err != nil {
		return err
	}

	syncers.AddInitialStreams()

	go syncers.Run()

	for {
		select {
		case msg, ok := <-messages:
			if !ok {
				_ = res.Send(&SyncStreamsResponse{
					SyncId: syncOp.SyncID,
					SyncOp: SyncOp_SYNC_CLOSE,
				})
				return nil
			}

			msg.SyncId = syncOp.SyncID
			if err = res.Send(msg); err != nil {
				log.Error("Unable to send sync stream update to client", "err", err)
				return err
			}

		case <-syncOp.ctx.Done():
			// clientErr non-nil indicates client hung up, get the error from the root ctx.
			if clientErr := syncOp.rootCtx.Err(); clientErr != nil {
				return clientErr
			}
			// otherwise syncOp is stopped internally.
			return context.Cause(syncOp.ctx)

		case cmd := <-syncOp.commands:
			if cmd.AddStreamReq != nil {
				nodeAddress := common.BytesToAddress(cmd.AddStreamReq.Msg.GetSyncPos().GetNodeAddress())
				streamID, err := shared.StreamIdFromBytes(cmd.AddStreamReq.Msg.GetSyncPos().GetStreamId())
				if err != nil {
					cmd.Reply(err)
					continue
				}
				cmd.Reply(syncers.AddStream(cmd.Ctx, nodeAddress, streamID, cmd.AddStreamReq.Msg.GetSyncPos()))
			} else if cmd.RmStreamReq != nil {
				streamID, err := shared.StreamIdFromBytes(cmd.RmStreamReq.Msg.GetStreamId())
				if err != nil {
					cmd.Reply(err)
					continue
				}
				cmd.Reply(syncers.RemoveStream(cmd.Ctx, streamID))
			} else if cmd.PingReq != nil {
				err = res.Send(&SyncStreamsResponse{
					SyncId:    syncOp.SyncID,
					SyncOp:    SyncOp_SYNC_PONG,
					PongNonce: cmd.PingReq.Msg.GetNonce(),
				})
				cmd.Reply(err)
			} else if cmd.DebugDropStream != (shared.StreamId{}) {
				cmd.Reply(syncers.DebugDropStream(cmd.Ctx, cmd.DebugDropStream))
			} else if cmd.CancelReq != nil {
				_ = res.Send(&SyncStreamsResponse{
					SyncId: syncOp.SyncID,
					SyncOp: SyncOp_SYNC_CLOSE,
				})

				cmd.Reply(nil)
				return nil
			}
		}
	}
}

func (syncOp *StreamSyncOperation) AddStreamToSync(
	ctx context.Context,
	req *connect.Request[AddStreamToSyncRequest],
) (*connect.Response[AddStreamToSyncResponse], error) {
	if err := events.SyncCookieValidate(req.Msg.GetSyncPos()); err != nil {
		return nil, err
	}

	cmd := &subCommand{
		Ctx:          ctx,
		AddStreamReq: req,
		reply:        make(chan error, 1),
	}

	if err := syncOp.process(cmd); err != nil {
		return nil, err
	}

	return connect.NewResponse(&AddStreamToSyncResponse{}), nil
}

func (syncOp *StreamSyncOperation) RemoveStreamFromSync(
	ctx context.Context,
	req *connect.Request[RemoveStreamFromSyncRequest],
) (*connect.Response[RemoveStreamFromSyncResponse], error) {
	if req.Msg.GetSyncId() != syncOp.SyncID {
		return nil, RiverError(Err_INVALID_ARGUMENT, "invalid syncId").Tag("syncId", req.Msg.GetSyncId())
	}

	cmd := &subCommand{
		Ctx:         ctx,
		RmStreamReq: req,
		reply:       make(chan error, 1),
	}

	if err := syncOp.process(cmd); err != nil {
		return nil, err
	}

	return connect.NewResponse(&RemoveStreamFromSyncResponse{}), nil
}

func (syncOp *StreamSyncOperation) CancelSync(
	ctx context.Context,
	req *connect.Request[CancelSyncRequest],
) (*connect.Response[CancelSyncResponse], error) {
	if req.Msg.GetSyncId() != syncOp.SyncID {
		return nil, RiverError(Err_INVALID_ARGUMENT, "invalid syncId").
			Tag("syncId", req.Msg.GetSyncId())
	}

	cmd := &subCommand{
		Ctx:       ctx,
		CancelReq: req,
		reply:     make(chan error, 1),
	}

	timeout := time.After(15 * time.Second)

	select {
	case syncOp.commands <- cmd:
		select {
		case err := <-cmd.reply:
			if err == nil {
				return connect.NewResponse(&CancelSyncResponse{}), nil
			}
			return nil, err
		case <-timeout:
			return nil, RiverError(Err_UNAVAILABLE, "sync operation command queue full")
		}
	case <-timeout:
		return nil, RiverError(Err_UNAVAILABLE, "sync operation command queue full")
	}
}

func (syncOp *StreamSyncOperation) PingSync(
	ctx context.Context,
	req *connect.Request[PingSyncRequest],
) (*connect.Response[PingSyncResponse], error) {
	if req.Msg.GetSyncId() != syncOp.SyncID {
		return nil, RiverError(Err_INVALID_ARGUMENT, "invalid syncId").Tag("syncId", req.Msg.GetSyncId())
	}

	cmd := &subCommand{
		Ctx:     ctx,
		PingReq: req,
		reply:   make(chan error, 1),
	}

	if err := syncOp.process(cmd); err != nil {
		return nil, err
	}

	return connect.NewResponse(&PingSyncResponse{}), nil
}

func (syncOp *StreamSyncOperation) debugDropStream(ctx context.Context, streamID shared.StreamId) error {
	cmd := &subCommand{
		Ctx:             ctx,
		DebugDropStream: streamID,
		reply:           make(chan error, 1),
	}

	return syncOp.process(cmd)
}

func (syncOp *StreamSyncOperation) process(cmd *subCommand) error {
	select {
	case syncOp.commands <- cmd:
		select {
		case err := <-cmd.reply:
			return err
		case <-syncOp.ctx.Done():
			return RiverError(Err_CANCELED, "sync operation cancelled").Tags("syncId", syncOp.SyncID)
		}
	case <-time.After(10 * time.Second):
		err := RiverError(Err_DEADLINE_EXCEEDED, "sync operation command queue full").Tags("syncId", syncOp.SyncID)
		dlog.FromCtx(syncOp.ctx).Error("Sync operation command queue full", "err", err)
		return err
	case <-syncOp.ctx.Done():
		return RiverError(Err_CANCELED, "sync operation cancelled").Tags("syncId", syncOp.SyncID)
	}
}
