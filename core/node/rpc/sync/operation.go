package sync

import (
	"context"
	"sync"
	"time"

	"connectrpc.com/connect"
	"github.com/ethereum/go-ethereum/common"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/trace"

	. "github.com/towns-protocol/towns/core/node/base"
	. "github.com/towns-protocol/towns/core/node/events"
	"github.com/towns-protocol/towns/core/node/logging"
	"github.com/towns-protocol/towns/core/node/nodes"
	. "github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/rpc/sync/client"
	"github.com/towns-protocol/towns/core/node/rpc/sync/subscription"
	"github.com/towns-protocol/towns/core/node/shared"
)

type (
	// StreamSyncOperation represents a stream sync operation that is currently in progress.
	StreamSyncOperation struct {
		// log is the logger for this stream sync operation
		log *logging.Log
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
		streamCache *StreamCache
		// nodeRegistry is used to get the remote remoteNode endpoint from a thisNodeAddress address
		nodeRegistry nodes.NodeRegistry
		// subscriptionManager is used to manage subscriptions for the sync operation
		subscriptionManager *subscription.Manager
		// otelTracer is used to trace individual sync Send operations, tracing is disabled if nil
		otelTracer trace.Tracer
	}

	// subCommand represents a request to add or remove a stream and ping sync operation
	subCommand struct {
		Ctx             context.Context
		ModifySyncReq   *client.ModifyRequest
		PingReq         string
		CancelReq       string
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
	streamCache *StreamCache,
	nodeRegistry nodes.NodeRegistry,
	subscriptionManager *subscription.Manager,
	otelTracer trace.Tracer,
) (*StreamSyncOperation, error) {
	// make the sync operation cancellable for CancelSync
	syncOpCtx, cancel := context.WithCancelCause(ctx)
	log := logging.FromCtx(syncOpCtx).With("syncId", syncId, "node", node)

	return &StreamSyncOperation{
		log:                 log,
		rootCtx:             ctx,
		ctx:                 syncOpCtx,
		cancel:              cancel,
		SyncID:              syncId,
		thisNodeAddress:     node,
		commands:            make(chan *subCommand, 64),
		streamCache:         streamCache,
		nodeRegistry:        nodeRegistry,
		subscriptionManager: subscriptionManager,
		otelTracer:          otelTracer,
	}, nil
}

// Run the stream sync until either sub.Cancel is called or until sub.ctx expired
func (syncOp *StreamSyncOperation) Run(
	req *connect.Request[SyncStreamsRequest],
	res StreamsResponseSubscriber,
) error {
	syncOp.log.Debugw("Stream sync operation start")

	sub := syncOp.subscriptionManager.Subscribe(syncOp.ctx, syncOp.cancel, syncOp.SyncID)

	// Adding the initial sync position to the syncer
	if len(req.Msg.GetSyncPos()) > 0 {
		go func() {
			cmd := &subCommand{
				Ctx: syncOp.ctx,
				ModifySyncReq: &client.ModifyRequest{
					ToAdd: req.Msg.GetSyncPos(),
					AddingFailureHandler: func(status *SyncStreamOpStatus) {
						select {
						case <-syncOp.ctx.Done():
							return
						default:
							sub.Send(&SyncStreamsResponse{
								SyncOp:   SyncOp_SYNC_DOWN,
								StreamId: status.GetStreamId(),
							})
						}
					},
				},
				reply: make(chan error, 1),
			}
			if err := syncOp.process(cmd); err != nil {
				syncOp.log.Errorw("Unable to add initial sync position", "err", err)
			}
		}()
	}

	// Start separate goroutine to process sync stream commands
	go syncOp.runCommandsProcessing(sub)

	var messagesSendToClient int
	defer syncOp.log.Debugw("Stream sync operation stopped", "send", messagesSendToClient)

	var msgs []*SyncStreamsResponse
	for {
		select {
		case <-syncOp.ctx.Done():
			// clientErr non-nil indicates client hung up, get the error from the root ctx.
			if clientErr := syncOp.rootCtx.Err(); clientErr != nil {
				return clientErr
			}
			// otherwise syncOp is stopped internally.
			return context.Cause(syncOp.ctx)
		case _, open := <-sub.Messages.Wait():
			msgs = sub.Messages.GetBatch(msgs)

			// nil msgs indicates the buffer is closed
			if msgs == nil {
				_ = res.Send(&SyncStreamsResponse{
					SyncId: syncOp.SyncID,
					SyncOp: SyncOp_SYNC_CLOSE,
				})
				return nil
			}

			for i, msg := range msgs {
				msg.SyncId = syncOp.SyncID
				if err := res.Send(msg); err != nil {
					syncOp.log.Errorw("Unable to send sync stream update to client", "err", err)
					return err
				}

				messagesSendToClient++

				syncOp.log.Debugw("Pending messages in sync operation", "count", sub.Messages.Len()+len(msgs)-i-1)

				if msg.GetSyncOp() == SyncOp_SYNC_CLOSE {
					return nil
				}

				select {
				case <-syncOp.ctx.Done():
					// clientErr non-nil indicates client hung up, get the error from the root ctx.
					if clientErr := syncOp.rootCtx.Err(); clientErr != nil {
						return clientErr
					}
					// otherwise syncOp is stopped internally.
					return context.Cause(syncOp.ctx)
				default:
				}
			}

			// If the client sent a close message, stop sending messages to client from the buffer.
			// In theory should not happen, but just in case.
			if !open {
				_ = res.Send(&SyncStreamsResponse{
					SyncId: syncOp.SyncID,
					SyncOp: SyncOp_SYNC_CLOSE,
				})
				return nil
			}
		}
	}
}

func (syncOp *StreamSyncOperation) runCommandsProcessing(sub *subscription.Subscription) {
	for {
		select {
		case <-syncOp.ctx.Done():
			return
		case cmd := <-syncOp.commands:
			if cmd.ModifySyncReq != nil {
				cmd.Reply(sub.Modify(cmd.Ctx, *cmd.ModifySyncReq))
			} else if cmd.DebugDropStream != (shared.StreamId{}) {
				cmd.Reply(sub.DebugDropStream(cmd.Ctx, cmd.DebugDropStream))
			} else if cmd.CancelReq != "" {
				sub.Send(&SyncStreamsResponse{SyncOp: SyncOp_SYNC_CLOSE})
				cmd.Reply(nil)
				return
			} else if cmd.PingReq != "" {
				sub.Send(&SyncStreamsResponse{
					SyncOp:    SyncOp_SYNC_PONG,
					PongNonce: cmd.PingReq,
				})
				cmd.Reply(nil)
			}
		}
	}
}

func (syncOp *StreamSyncOperation) AddStreamToSync(
	ctx context.Context,
	req *connect.Request[AddStreamToSyncRequest],
) (*connect.Response[AddStreamToSyncResponse], error) {
	if err := SyncCookieValidate(req.Msg.GetSyncPos()); err != nil {
		return nil, err
	}

	if syncOp.otelTracer != nil {
		var span trace.Span
		streamID, _ := shared.StreamIdFromBytes(req.Msg.GetSyncPos().GetStreamId())
		ctx, span = syncOp.otelTracer.Start(ctx, "addStreamToSync",
			trace.WithAttributes(
				attribute.String("stream", streamID.String()),
				attribute.String("syncId", req.Msg.GetSyncId())))
		defer span.End()
	}

	var status *SyncStreamOpStatus
	cmd := &subCommand{
		Ctx: ctx,
		ModifySyncReq: &client.ModifyRequest{
			ToAdd: []*SyncCookie{req.Msg.GetSyncPos()},
			AddingFailureHandler: func(st *SyncStreamOpStatus) {
				status = st
			},
		},
		reply: make(chan error, 1),
	}

	if err := syncOp.process(cmd); err != nil {
		return nil, err
	}

	if status != nil {
		return nil, RiverError(Err(status.GetCode()), status.GetMessage()).
			Tag("streamId", shared.StreamId(status.GetStreamId())).
			Func("AddStreamToSync")
	}

	return connect.NewResponse(&AddStreamToSyncResponse{}), nil
}

func (syncOp *StreamSyncOperation) RemoveStreamFromSync(
	ctx context.Context,
	req *connect.Request[RemoveStreamFromSyncRequest],
) (*connect.Response[RemoveStreamFromSyncResponse], error) {
	if req.Msg.GetSyncId() != syncOp.SyncID {
		return nil, RiverError(Err_INVALID_ARGUMENT, "invalid syncId").
			Tag("syncId", req.Msg.GetSyncId()).
			Func("RemoveStreamFromSync")
	}

	if syncOp.otelTracer != nil {
		var span trace.Span
		streamID, _ := shared.StreamIdFromBytes(req.Msg.GetStreamId())
		ctx, span = syncOp.otelTracer.Start(ctx, "removeStreamFromSync",
			trace.WithAttributes(attribute.String("stream", streamID.String()),
				attribute.String("syncId", req.Msg.GetSyncId())))
		defer span.End()
	}

	var status *SyncStreamOpStatus
	cmd := &subCommand{
		Ctx: ctx,
		ModifySyncReq: &client.ModifyRequest{
			ToRemove: [][]byte{req.Msg.GetStreamId()},
			RemovingFailureHandler: func(st *SyncStreamOpStatus) {
				status = st
			},
		},
		reply: make(chan error, 1),
	}

	if err := syncOp.process(cmd); err != nil {
		return nil, err
	}

	if status != nil {
		return nil, RiverError(Err(status.GetCode()), status.GetMessage()).
			Tag("streamId", shared.StreamId(status.GetStreamId())).
			Func("RemoveStreamFromSync")
	}

	return connect.NewResponse(&RemoveStreamFromSyncResponse{}), nil
}

func (syncOp *StreamSyncOperation) ModifySync(
	ctx context.Context,
	req *connect.Request[ModifySyncRequest],
) (*connect.Response[ModifySyncResponse], error) {
	if req.Msg.GetSyncId() != syncOp.SyncID {
		return nil, RiverError(Err_INVALID_ARGUMENT, "invalid syncId").
			Tag("syncId", req.Msg.GetSyncId()).
			Func("ModifySync")
	}

	if syncOp.otelTracer != nil {
		var span trace.Span
		ctx, span = syncOp.otelTracer.Start(ctx, "modifySync",
			trace.WithAttributes(attribute.String("syncId", req.Msg.GetSyncId())))
		defer span.End()
	}

	resp := connect.NewResponse(&ModifySyncResponse{})
	respLock := sync.Mutex{}
	cmd := &subCommand{
		Ctx: ctx,
		ModifySyncReq: &client.ModifyRequest{
			ToAdd:    req.Msg.GetAddStreams(),
			ToRemove: req.Msg.GetRemoveStreams(),
			AddingFailureHandler: func(status *SyncStreamOpStatus) {
				respLock.Lock()
				resp.Msg.Adds = append(resp.Msg.Adds, status)
				respLock.Unlock()
			},
			RemovingFailureHandler: func(status *SyncStreamOpStatus) {
				respLock.Lock()
				resp.Msg.Removals = append(resp.Msg.Removals, status)
				respLock.Unlock()
			},
		},
		reply: make(chan error, 1),
	}

	if err := syncOp.process(cmd); err != nil {
		return nil, err
	}

	return resp, nil
}

func (syncOp *StreamSyncOperation) CancelSync(
	ctx context.Context,
	req *connect.Request[CancelSyncRequest],
) (*connect.Response[CancelSyncResponse], error) {
	if req.Msg.GetSyncId() != syncOp.SyncID {
		return nil, RiverError(Err_INVALID_ARGUMENT, "invalid syncId").
			Tag("syncId", req.Msg.GetSyncId()).
			Func("CancelSync")
	}

	cmd := &subCommand{
		Ctx:       ctx,
		CancelReq: req.Msg.GetSyncId(),
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
			return nil, RiverError(Err_UNAVAILABLE, "sync operation command queue full").
				Func("CancelSync")
		}
	case <-timeout:
		return nil, RiverError(Err_UNAVAILABLE, "sync operation command queue full").
			Func("CancelSync")
	}
}

func (syncOp *StreamSyncOperation) PingSync(
	ctx context.Context,
	req *connect.Request[PingSyncRequest],
) (*connect.Response[PingSyncResponse], error) {
	if req.Msg.GetSyncId() != syncOp.SyncID {
		return nil, RiverError(Err_INVALID_ARGUMENT, "invalid syncId").
			Tag("syncId", req.Msg.GetSyncId()).
			Func("PingSync")
	}

	cmd := &subCommand{
		Ctx:     ctx,
		PingReq: req.Msg.GetNonce(),
		reply:   make(chan error, 1),
	}

	if err := syncOp.process(cmd); err != nil {
		return nil, err
	}

	return connect.NewResponse(&PingSyncResponse{}), nil
}

func (syncOp *StreamSyncOperation) debugDropStream(ctx context.Context, streamID shared.StreamId) error {
	return syncOp.process(&subCommand{
		Ctx:             ctx,
		DebugDropStream: streamID,
		reply:           make(chan error, 1),
	})
}

func (syncOp *StreamSyncOperation) process(cmd *subCommand) error {
	select {
	case syncOp.commands <- cmd:
		select {
		case err := <-cmd.reply:
			return err
		case <-syncOp.ctx.Done():
			return RiverError(Err_CANCELED, "sync operation cancelled").
				Tags("syncId", syncOp.SyncID)
		}
	case <-time.After(10 * time.Second):
		err := RiverError(Err_DEADLINE_EXCEEDED, "sync operation command queue full").
			Tags("syncId", syncOp.SyncID)
		syncOp.log.Errorw("Sync operation command queue full", "err", err)
		return err
	case <-syncOp.ctx.Done():
		return RiverError(Err_CANCELED, "sync operation cancelled").
			Tags("syncId", syncOp.SyncID)
	}
}
