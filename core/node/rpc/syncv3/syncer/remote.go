package syncer

import (
	"context"
	"errors"
	"fmt"
	"sync/atomic"
	"time"

	"connectrpc.com/connect"
	"github.com/ethereum/go-ethereum/common"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/trace"

	. "github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/events"
	"github.com/towns-protocol/towns/core/node/logging"
	"github.com/towns-protocol/towns/core/node/nodes"
	. "github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/protocol/protocolconnect"
	"github.com/towns-protocol/towns/core/node/rpc/headers"
	. "github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/utils/dynmsgbuf"
)

const (
	// remoteStreamUpdateEmitterTimeout is the default timeout for operations in remote stream update emitter.
	remoteStreamUpdateEmitterTimeout = time.Second * 20
)

// remoteStreamUpdateEmitter is an implementation of the StreamUpdateEmitter interface that emits updates for a remote
// stream.
// TODO: Advance sticky peer on failure.
type remoteStreamUpdateEmitter struct {
	cancel         context.CancelCauseFunc
	log            *logging.Log
	syncID         string
	streamID       StreamId
	remoteAddr     common.Address
	client         protocolconnect.StreamServiceClient
	subscriber     StreamSubscriber
	backfillsQueue *dynmsgbuf.DynamicBuffer[*backfillRequest]
	// version is the version of the current emitter.
	// It is used to indicate which version of the syncer the update is sent from to avoid sending
	// sync down message for sync operations from another version of syncer.
	version    int
	otelTracer trace.Tracer
}

// NewRemoteStreamUpdateEmitter creates a new remote stream update emitter for the given stream ID and remote address.
// Context is used to control the lifetime (stopping emitter when context is done) of the emitter.
func NewRemoteStreamUpdateEmitter(
	ctx context.Context,
	stream *events.Stream,
	nodeRegistry nodes.NodeRegistry,
	subscriber StreamSubscriber,
	version int,
	otelTracer trace.Tracer,
) (StreamUpdateEmitter, error) {
	remoteAddr := stream.GetStickyPeer()
	streamID := stream.StreamId()

	if otelTracer != nil {
		var span trace.Span
		ctx, span = otelTracer.Start(ctx, "syncv3.syncer.NewRemoteStreamUpdateEmitter",
			trace.WithAttributes(
				attribute.String("streamID", streamID.String()),
				attribute.String("remoteAddr", remoteAddr.String()),
				attribute.Int("version", version)))
		defer span.End()
	}

	ctx, cancel := context.WithCancelCause(ctx)

	client, err := nodeRegistry.GetStreamServiceClientForAddress(remoteAddr)
	if err != nil {
		cancel(nil)
		stream.AdvanceStickyPeer(remoteAddr)
		return nil, err
	}

	// Ensure that the first valid update is received within remoteStreamUpdateEmitterTimeout,
	// if not, cancel the operation and return an unavailable error
	var firstUpdateReceived atomic.Bool
	go func() {
		select {
		case <-ctx.Done():
		case <-time.After(remoteStreamUpdateEmitterTimeout):
			if !firstUpdateReceived.Load() {
				cancel(
					RiverError(Err_UNAVAILABLE, "remote stream update emitter timed out when waiting for first update",
						"addr", remoteAddr, "version", version, "streamID", streamID),
				)
			}
		}
	}()

	req := connect.NewRequest(&SyncStreamsRequest{SyncPos: []*SyncCookie{{
		StreamId:    streamID[:],
		NodeAddress: remoteAddr[:],
	}}})
	req.Header().Set(headers.RiverUseSharedSyncHeaderName, headers.RiverHeaderTrueValue)
	responseStream, err := client.SyncStreams(ctx, req)
	if err != nil {
		cancel(err)
		stream.AdvanceStickyPeer(remoteAddr)
		return nil, RiverErrorWithBase(Err_UNAVAILABLE, "SyncStreams failed", err).
			Tags("remote", remoteAddr).
			Func("NewRemoteStreamUpdateEmitter")
	}

	firstUpdateReceived.Store(responseStream.Receive())

	if !firstUpdateReceived.Load() || ctx.Err() != nil {
		cancel(nil)
		stream.AdvanceStickyPeer(remoteAddr)
		return nil, RiverErrorWithBase(
			Err_UNAVAILABLE,
			"SyncStreams stream closed without receiving any messages",
			responseStream.Err(),
		).
			Tags("remote", remoteAddr).
			Tags("streamID", streamID).
			Func("NewRemoteStreamUpdateEmitter")
	}

	if responseStream.Msg().GetSyncOp() != SyncOp_SYNC_NEW || responseStream.Msg().GetSyncId() == "" {
		cancel(nil)
		stream.AdvanceStickyPeer(remoteAddr)
		return nil, RiverError(Err_UNAVAILABLE, "Received unexpected sync stream message").
			Tags("syncOp", responseStream.Msg().SyncOp, "syncId", responseStream.Msg().SyncId, "remote", remoteAddr).
			Func("NewRemoteStreamUpdateEmitter")
	}

	syncID := responseStream.Msg().GetSyncId()

	r := &remoteStreamUpdateEmitter{
		cancel: cancel,
		log: logging.FromCtx(ctx).
			Named("syncv3.remoteStreamUpdateEmitter").
			With("version", version, "addr", remoteAddr.Hex(), "streamID", streamID, "syncID", syncID),
		syncID:         syncID,
		client:         client,
		streamID:       streamID,
		remoteAddr:     remoteAddr,
		subscriber:     subscriber,
		backfillsQueue: dynmsgbuf.NewDynamicBuffer[*backfillRequest](),
		version:        version,
		otelTracer:     otelTracer,
	}

	go r.run(ctx, stream, responseStream)

	return r, nil
}

func (r *remoteStreamUpdateEmitter) SyncID() string {
	return r.syncID
}

func (r *remoteStreamUpdateEmitter) StreamID() StreamId {
	return r.streamID
}

func (r *remoteStreamUpdateEmitter) Node() common.Address {
	return r.remoteAddr
}

func (r *remoteStreamUpdateEmitter) Version() int {
	return r.version
}

func (r *remoteStreamUpdateEmitter) EnqueueBackfill(cookie *SyncCookie, syncIDs []string) bool {
	err := r.backfillsQueue.AddMessage(&backfillRequest{cookie: cookie, syncIDs: syncIDs})
	if err != nil {
		r.cancel(err)
		r.log.Errorw("failed to add backfill request to the queue", "error", err)
		return false
	}
	return true
}

// Close closes the emitter and stops receiving updates for the stream.
func (r *remoteStreamUpdateEmitter) Close() {
	r.cancel(nil)
}

func (r *remoteStreamUpdateEmitter) run(
	ctx context.Context,
	stream *events.Stream,
	responseStream *connect.ServerStreamForClient[SyncStreamsResponse],
) {
	defer r.cleanup()

	go r.processStreamUpdates(ctx, stream, responseStream)

	var msgs []*backfillRequest
	for {
		select {
		case <-ctx.Done():
			return
		case <-r.backfillsQueue.Wait():
			msgs = r.backfillsQueue.GetBatch(msgs)

			// nil msgs indicates the buffer is closed.
			if msgs == nil {
				r.cancel(nil)
				return
			}

			// Messages must be processed in the order they were received.
			for i, msg := range msgs {
				// Context could be canceled while processing backfill requests so one more check here.
				if err := ctx.Err(); err != nil {
					r.reAddUnprocessedBackfills(msgs[i:])
					return
				}

				if err := r.processBackfillRequest(ctx, msg); err != nil {
					r.cancel(err)
					r.log.Errorw("failed to process backfill request", "cookie", msg.cookie, "error", err)
					r.reAddUnprocessedBackfills(msgs[i:])
					return
				}
			}
		}
	}
}

// reAddUnprocessedBackfills re-adds the given backfill requests back to the queue for further processing
// by the deferred cleanup function. Basically, in case of the emitter failure, given requests must be addressed
// by sending sync down message to the sync operations that requested them.
func (r *remoteStreamUpdateEmitter) reAddUnprocessedBackfills(msgs []*backfillRequest) {
	for _, m := range msgs {
		if err := r.backfillsQueue.AddMessage(m); err != nil {
			r.log.Errorw(
				"failed to re-add unprocessed backfill request to the queue",
				"cookie",
				m.cookie,
				"error",
				err,
			)
		}
	}
}

func (r *remoteStreamUpdateEmitter) cleanup() {
	remainingMsgs := r.backfillsQueue.CloseAndGetBatch()

	r.log.Infow(
		"Remote emitter cleanup, sending SYNC_DOWN to subscribers",
		"pendingBackfills", len(remainingMsgs),
	)

	// Send a stream down message to all active syncs of the current syncer version via event bus.
	r.subscriber.OnStreamEvent(
		r.streamID,
		&SyncStreamsResponse{SyncOp: SyncOp_SYNC_DOWN, StreamId: r.streamID.Bytes()},
		r.version,
	)

	// Send a stream down message to all pending syncs, i.e. those that are waiting for backfill.
	for _, msg := range remainingMsgs {
		r.subscriber.OnStreamEvent(r.streamID, &SyncStreamsResponse{
			SyncOp:        SyncOp_SYNC_DOWN,
			StreamId:      r.streamID.Bytes(),
			TargetSyncIds: msg.syncIDs,
		}, r.version)
	}
}

func (r *remoteStreamUpdateEmitter) processStreamUpdates(
	ctx context.Context,
	stream *events.Stream,
	responseStream *connect.ServerStreamForClient[SyncStreamsResponse],
) {
	defer func() {
		if err := responseStream.Close(); err != nil {
			r.log.Errorw("failed to close sync stream", "error", err)
		}
	}()

	var latestMsgReceived atomic.Value
	latestMsgReceived.Store(time.Now())

	go r.connectionAlive(ctx, &latestMsgReceived)

	// Receive messages from the sync stream.
	for responseStream.Receive() {
		res := responseStream.Msg()
		if res == nil {
			break
		}

		latestMsgReceived.Store(time.Now())

		if res.GetSyncOp() == SyncOp_SYNC_UPDATE {
			r.subscriber.OnStreamEvent(r.streamID, res, r.version)
		} else if res.GetSyncOp() == SyncOp_SYNC_DOWN {
			r.subscriber.OnStreamEvent(r.streamID, res, r.version)
			break
		}
	}

	err := responseStream.Err()
	if err == nil || errors.Is(err, context.Canceled) {
		r.log.Info("remote node disconnected")
	} else {
		r.log.Errorw("remote node disconnected with error", "error", err)
		stream.AdvanceStickyPeer(r.remoteAddr)
	}

	r.cancel(err)
}

// connectionAlive periodically pings remote to check if the connection is still alive.
// If the remote can't be reach the sync stream is canceled.
func (r *remoteStreamUpdateEmitter) connectionAlive(
	ctx context.Context,
	latestMsgReceived *atomic.Value,
) {
	var (
		// check every pingTicker if it's time to send a ping req to remote
		pingTicker = time.NewTicker(3 * time.Second)
		// don't send a ping req if there was activity within recentActivityInterval
		recentActivityInterval = 15 * time.Second
		// if no message was receiving within recentActivityDeadline assume stream is dead
		recentActivityDeadline = 30 * time.Second
	)
	defer pingTicker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-pingTicker.C:
			now := time.Now()
			lastMsgRecv := latestMsgReceived.Load().(time.Time)

			if lastMsgRecv.Add(recentActivityDeadline).Before(now) {
				// No recent activity -> conn dead.
				r.log.Warnw("remote sync node time out")
				r.cancel(nil)
				return
			}

			if lastMsgRecv.Add(recentActivityInterval).After(now) {
				// Seen recent activity.
				continue
			}

			// Send ping to remote to generate activity to check if remote is still alive.
			ctxWithTimeout, cancel := context.WithTimeout(ctx, remoteStreamUpdateEmitterTimeout)
			_, err := r.client.PingSync(ctxWithTimeout, connect.NewRequest(&PingSyncRequest{
				SyncId: r.syncID,
				Nonce:  fmt.Sprintf("%d", now.Unix()),
			}))
			cancel()
			if err != nil {
				if !errors.Is(err, context.Canceled) {
					r.log.Errorw("ping sync failed", "error", err)
				}
				r.cancel(err)
				return
			}
		}
	}
}

// processBackfillRequest processes the given backfill request by sending it to the remote node.
func (r *remoteStreamUpdateEmitter) processBackfillRequest(ctx context.Context, msg *backfillRequest) error {
	if r.otelTracer != nil {
		var span trace.Span
		ctx, span = r.otelTracer.Start(ctx, "syncv3.syncer.remoteStreamUpdateEmitter.processBackfillRequest",
			trace.WithAttributes(
				attribute.String("streamID", r.streamID.String()),
				attribute.String("remoteAddr", r.remoteAddr.String()),
				attribute.Int("version", r.version)))
		defer span.End()
	}

	ctxWithTimeout, cancel := context.WithTimeout(ctx, remoteStreamUpdateEmitterTimeout)
	defer cancel()

	resp, err := r.client.ModifySync(ctxWithTimeout, connect.NewRequest(&ModifySyncRequest{
		SyncId: r.syncID,
		BackfillStreams: &ModifySyncRequest_Backfill{
			SyncId:  msg.syncIDs[0],
			Streams: []*SyncCookie{msg.cookie},
		},
	}))
	if err != nil {
		return AsRiverError(err).Func("remoteStreamUpdateEmitter.processBackfillRequest")
	}

	if resp.Msg.GetBackfills() != nil {
		errData := resp.Msg.GetBackfills()[0]
		if errData.GetMessage() == "" {
			errData.Message = "failed to backfill stream in remote node"
		}
		return RiverError(
			Err(errData.GetCode()),
			errData.Message,
			"nodeAddress",
			common.BytesToAddress(errData.GetNodeAddress()),
		).
			Func("remoteStreamUpdateEmitter.processBackfillRequest")
	}

	return nil
}
