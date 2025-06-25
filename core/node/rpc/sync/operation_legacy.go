package sync

import (
	"context"

	"connectrpc.com/connect"

	. "github.com/towns-protocol/towns/core/node/base"
	. "github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/rpc/sync/client"
	"github.com/towns-protocol/towns/core/node/rpc/sync/dynmsgbuf"
	"github.com/towns-protocol/towns/core/node/rpc/sync/legacyclient"
	"github.com/towns-protocol/towns/core/node/shared"
)

// RunLegacy the stream sync until either sub.Cancel is called or until sub.ctx expired
func (syncOp *StreamSyncOperation) RunLegacy(
	req *connect.Request[SyncStreamsRequest],
	res StreamsResponseSubscriber,
) error {
	syncOp.log.Debugw("Stream sync operation start")

	syncers, messages := legacyclient.NewSyncers(
		syncOp.ctx, syncOp.cancel, syncOp.SyncID, syncOp.streamCache,
		syncOp.nodeRegistry, syncOp.thisNodeAddress, syncOp.otelTracer)

	go syncers.Run()

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
							_ = messages.AddMessage(&SyncStreamsResponse{
								SyncOp:   SyncOp_SYNC_DOWN,
								StreamId: status.GetStreamId(),
							})
						}
					},
				},
				reply: make(chan error, 1),
			}
			if err := syncOp.process(cmd); err != nil {
				if IsRiverErrorCode(err, Err_INVALID_ARGUMENT) {
					syncOp.log.Errorw("Unable to add initial sync position", "error", err)
				}
				syncOp.cancel(err)
			}
		}()
	}

	// Start separate goroutine to process sync stream commands
	go syncOp.runCommandsProcessingLegacy(syncers, messages)

	var messagesSendToClient int
	defer func() {
		syncOp.log.Debugw("Stream sync operation stopped", "send", messagesSendToClient)
		if syncOp.metrics != nil {
			syncOp.metrics.sentMessagesHistogram.WithLabelValues("false").Observe(float64(messagesSendToClient))
		}
	}()

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
		case _, open := <-messages.Wait():
			msgs = messages.GetBatch(msgs)

			// nil msgs indicates the buffer is closed
			if msgs == nil {
				_ = res.Send(&SyncStreamsResponse{
					SyncId: syncOp.SyncID,
					SyncOp: SyncOp_SYNC_CLOSE,
				})
				return nil
			}

			for i, msg := range msgs {
				select {
				case <-syncOp.ctx.Done():
					// clientErr non-nil indicates client hung up, get the error from the root ctx.
					if clientErr := syncOp.rootCtx.Err(); clientErr != nil {
						return clientErr
					}
					// otherwise syncOp is stopped internally.
					return context.Cause(syncOp.ctx)
				default:
					msg.SyncId = syncOp.SyncID
					if err := res.Send(msg); err != nil {
						syncOp.log.Errorw("Unable to send sync stream update to client", "error", err)
						return err
					}

					messagesSendToClient++
					syncOp.log.Debugw("Pending messages in sync operation", "count", messages.Len()+len(msgs)-i-1)

					if msg.GetSyncOp() == SyncOp_SYNC_CLOSE {
						return nil
					}
				}
			}

			if syncOp.metrics != nil {
				syncOp.metrics.messageBufferSizePerOpHistogram.WithLabelValues("false").Observe(float64(messages.Len()))
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

func (syncOp *StreamSyncOperation) runCommandsProcessingLegacy(
	syncers *legacyclient.SyncerSet,
	messages *dynmsgbuf.DynamicBuffer[*SyncStreamsResponse],
) {
	for {
		select {
		case <-syncOp.ctx.Done():
			return
		case cmd := <-syncOp.commands:
			if cmd.ModifySyncReq != nil {
				cmd.Reply(syncers.Modify(cmd.Ctx, *cmd.ModifySyncReq))
			} else if cmd.DebugDropStream != (shared.StreamId{}) {
				cmd.Reply(syncers.DebugDropStream(cmd.Ctx, cmd.DebugDropStream))
			} else if cmd.CancelReq != "" {
				_ = messages.AddMessage(&SyncStreamsResponse{SyncOp: SyncOp_SYNC_CLOSE})
				messages.Close()
				cmd.Reply(nil)
				return
			} else if cmd.PingReq != "" {
				_ = messages.AddMessage(&SyncStreamsResponse{
					SyncOp:    SyncOp_SYNC_PONG,
					PongNonce: cmd.PingReq,
				})
				cmd.Reply(nil)
			}
		}
	}
}
