package syncer

import (
	"context"
	"errors"
	"fmt"
	"sync/atomic"
	"time"

	"github.com/towns-protocol/towns/core/node/utils/dynmsgbuf"

	"connectrpc.com/connect"
	"github.com/ethereum/go-ethereum/common"

	. "github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/logging"
	"github.com/towns-protocol/towns/core/node/nodes"
	. "github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/protocol/protocolconnect"
	. "github.com/towns-protocol/towns/core/node/shared"
)

const (
	// remoteStreamUpdateEmitterTimeout is the default timeout to get updates from the remote stream.
	remoteStreamUpdateEmitterTimeout = time.Second * 20
)

// remoteStreamUpdateEmitter is an implementation of the StreamUpdateEmitter interface that emits updates for a remote stream.
// TODO: Advance sticky peer on failure.
type remoteStreamUpdateEmitter struct {
	// ctx is the global node context wrapped into the cancellable context.
	ctx context.Context
	// cancel is the cancel function for the context.
	cancel context.CancelCauseFunc
	// log is the logger for the emitter.
	log *logging.Log
	// syncID is the ID of the current sync operation.
	syncID string
	// streamID is the ID of the stream that this emitter emits events for.
	streamID StreamId
	// remoteAddr is the address of the remote node.
	remoteAddr common.Address
	// client is the RPC client for the remote node.
	client protocolconnect.StreamServiceClient
	// responseStream is the response stream for the sync operation.
	responseStream *connect.ServerStreamForClient[SyncStreamsResponse]
	// subscriber is the subscriber that receives updates from the stream.
	subscriber StreamSubscriber
	// backfillsQueue is a dynamic buffer that holds backfill requests.
	backfillsQueue *dynmsgbuf.DynamicBuffer[*backfillRequest]
	// version is the version of the current emitter.
	// It is used to indicate which version of the syncer the update is sent from to avoid sending
	// sync down message for sync operations from another version of syncer.
	version int32
	// state is the current state of the emitter.
	state atomic.Int32
}

// NewRemoteStreamUpdateEmitter creates a new remote stream update emitter for the given stream ID and remote address.
func NewRemoteStreamUpdateEmitter(
	ctx context.Context,
	remoteAddr common.Address,
	nodeRegistry nodes.NodeRegistry,
	streamID StreamId,
	subscriber StreamSubscriber,
	version int32,
) StreamUpdateEmitter {
	ctx, cancel := context.WithCancelCause(ctx)

	r := &remoteStreamUpdateEmitter{
		ctx:    ctx,
		cancel: cancel,
		log: logging.FromCtx(ctx).
			Named("syncv3.remoteStreamUpdateEmitter").
			With("addr", remoteAddr.Hex(), "streamID", streamID),
		streamID:       streamID,
		remoteAddr:     remoteAddr,
		subscriber:     subscriber,
		backfillsQueue: dynmsgbuf.NewDynamicBuffer[*backfillRequest](),
		version:        version,
	}

	// Set the current state to initializing.
	r.state.Store(streamUpdateEmitterStateInitializing)

	// Initialize the emitter in a separate goroutine to avoid blocking the caller.
	go r.initialize(nodeRegistry)

	return r
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

func (r *remoteStreamUpdateEmitter) Backfill(cookie *SyncCookie, syncIDs []string) bool {
	if r.state.Load() == streamUpdateEmitterStateClosed {
		return false
	}

	err := r.backfillsQueue.AddMessage(&backfillRequest{cookie: cookie, syncIDs: syncIDs})
	if err != nil {
		r.log.Errorw("failed to add backfill request to the queue", "error", err)
		r.cancel(err)
		r.state.Store(streamUpdateEmitterStateClosed)
		return false
	}

	return true
}

func (r *remoteStreamUpdateEmitter) initialize(nodeRegistry nodes.NodeRegistry) {
	// Get remote node RPC client
	client, err := nodeRegistry.GetStreamServiceClientForAddress(r.remoteAddr)
	if err != nil {
		r.log.Errorw("initialization failed: failed to get stream service client by address", "error", err)
		r.state.Store(streamUpdateEmitterStateClosed)
		return
	}

	// Ensure that the first valid update is received within 15 seconds,
	// if not, cancel the operation and return an unavailable error
	var firstUpdateReceived atomic.Bool
	go func() {
		select {
		case <-r.ctx.Done():
		case <-time.After(20 * time.Second):
			if !firstUpdateReceived.Load() {
				r.cancel(nil)
			}
		}
	}()

	// Create a new sync operation for the given stream only.
	req := connect.NewRequest(&SyncStreamsRequest{})
	responseStream, err := client.SyncStreams(r.ctx, req)
	if err != nil {
		r.log.Errorw("initialization failed: failed to create sync operation", "error", err)
		r.state.Store(streamUpdateEmitterStateClosed)
		return
	}

	// Store indication if the first update was received.
	firstUpdateReceived.Store(responseStream.Receive())

	// If the sync operation was canceled, return an unavailable error.
	if !firstUpdateReceived.Load() || r.ctx.Err() != nil {
		r.cancel(nil)
		r.log.Errorw("initialization failed: SyncStreams stream closed without receiving any messages", "error", responseStream.Err())
		r.state.Store(streamUpdateEmitterStateClosed)
		return
	}

	// Test that the first update is a SYNC_NEW message with a valid syncID set.
	if responseStream.Msg().GetSyncOp() != SyncOp_SYNC_NEW || responseStream.Msg().GetSyncId() == "" {
		r.cancel(nil)
		r.log.Errorw("initialization failed: received unexpected sync stream message",
			"syncOp", responseStream.Msg().SyncOp, "syncId", responseStream.Msg().SyncId)
		r.state.Store(streamUpdateEmitterStateClosed)
		return
	}

	r.syncID = responseStream.Msg().GetSyncId()
	r.responseStream = responseStream
	r.client = client
	r.log = r.log.With("syncId", r.syncID)
}

func (r *remoteStreamUpdateEmitter) run() {
	defer func() {
		_ = r.responseStream.Close()
	}()

	var latestMsgReceived atomic.Value
	latestMsgReceived.Store(time.Now())

	go r.connectionAlive(&latestMsgReceived)

	// Receive messages from the sync stream.
	for r.responseStream.Receive() {
		res := r.responseStream.Msg()
		if res == nil {
			break
		}

		latestMsgReceived.Store(time.Now())

		if res.GetSyncOp() == SyncOp_SYNC_UPDATE {
			r.subscriber.OnStreamEvent(res, r.version)
		} else if res.GetSyncOp() == SyncOp_SYNC_DOWN {
			r.subscriber.OnStreamEvent(res, r.version)
			break
		} else {
			r.log.Errorw("Received unexpected sync stream message", "syncOp", res.GetSyncOp(), "syncId", res.GetSyncId())
		}
	}

	// Stream is closed here.
	r.log.Infow("remote node disconnected", "error", r.responseStream.Err())
	r.cancel(nil)
	if r.onDown != nil {
		r.onDown()
	}
}

// connectionAlive periodically pings remote to check if the connection is still alive.
// If the remote can't be reach the sync stream is canceled.
func (r *remoteStreamUpdateEmitter) connectionAlive(latestMsgReceived *atomic.Value) {
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
		case <-r.ctx.Done():
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
			ctxWithTimeout, cancel := context.WithTimeout(r.ctx, remoteStreamUpdateEmitterTimeout)
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

// processBackfillRequest processes a backfill request by sending it to the remote node.
func (r *remoteStreamUpdateEmitter) processBackfillRequest(msg *backfillRequest) error {
	ctxWithTimeout, cancel := context.WithTimeout(r.ctx, remoteStreamUpdateEmitterTimeout)
	defer cancel()

	resp, err := r.client.ModifySync(ctxWithTimeout, connect.NewRequest(&ModifySyncRequest{
		SyncId: r.syncID,
		BackfillStreams: &ModifySyncRequest_Backfill{
			SyncId:  msg.syncIDs[0],
			Streams: []*SyncCookie{msg.cookie},
		},
	}))
	if err != nil {
		return err
	}

	if resp.Msg.GetBackfills() != nil {
		// SyncStreamOpStatus implements error interface so we can use it directly.
		// Just wrap it into a RiverError with additional context.
		errData := resp.Msg.GetBackfills()[0]
		return AsRiverError(errData, Err(errData.GetCode())).
			Func("remoteStreamUpdateEmitter.Backfill")
	}

	return nil
}
