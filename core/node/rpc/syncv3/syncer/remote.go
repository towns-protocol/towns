package syncer

import (
	"context"
	"errors"
	"fmt"
	"sync/atomic"
	"time"

	"connectrpc.com/connect"
	mapset "github.com/deckarep/golang-set/v2"
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
	// subscribers is a set of subscribers for the stream updates.
	subscribers mapset.Set[StreamSubscriber]
	// onDown is a callback that is called when the current emitter goes down.
	// Must be NON-BLOCKING operation.
	onDown func()
}

// NewRemoteStreamUpdateEmitter creates a new remote stream update emitter for the given stream ID and remote address.
func NewRemoteStreamUpdateEmitter(
	ctx context.Context,
	remoteAddr common.Address,
	nodeRegistry nodes.NodeRegistry,
	streamID StreamId,
	onDown func(),
) (StreamUpdateEmitter, error) {
	ctx, cancel := context.WithCancelCause(ctx)

	// Get remote node RPC client
	client, err := nodeRegistry.GetStreamServiceClientForAddress(remoteAddr)
	if err != nil {
		cancel(err)
		return nil, RiverErrorWithBase(Err_UNAVAILABLE, "GetStreamServiceClientForAddress failed", err).
			Tags("remote", remoteAddr).
			Func("NewRemoteStreamUpdateEmitter")
	}

	// Ensure that the first valid update is received within 15 seconds,
	// if not, cancel the operation and return an unavailable error
	var firstUpdateReceived atomic.Bool
	go func() {
		select {
		case <-ctx.Done():
		case <-time.After(15 * time.Second):
			if !firstUpdateReceived.Load() {
				cancel(nil)
			}
		}
	}()

	// Create a new sync operation for the given stream only.
	req := connect.NewRequest(&SyncStreamsRequest{})
	responseStream, err := client.SyncStreams(ctx, req)
	if err != nil {
		cancel(err)
		return nil, RiverErrorWithBase(Err_UNAVAILABLE, "SyncStreams failed", err).
			Tags("remote", remoteAddr).
			Func("NewRemoteStreamUpdateEmitter")
	}

	// Store indication if the first update was received.
	firstUpdateReceived.Store(responseStream.Receive())

	// If the sync operation was canceled, return an unavailable error.
	if !firstUpdateReceived.Load() || ctx.Err() != nil {
		cancel(nil)

		return nil, RiverErrorWithBase(Err_UNAVAILABLE, "SyncStreams stream closed without receiving any messages", responseStream.Err()).
			Tags("remote", remoteAddr).
			Func("NewRemoteStreamUpdateEmitter")
	}

	// Test that the first update is a SYNC_NEW message with a valid syncID set.
	if responseStream.Msg().GetSyncOp() != SyncOp_SYNC_NEW || responseStream.Msg().GetSyncId() == "" {
		cancel(nil)

		return nil, RiverError(Err_UNAVAILABLE, "Received unexpected sync stream message").
			Tags("syncOp", responseStream.Msg().SyncOp,
				"syncId", responseStream.Msg().SyncId,
				"remote", remoteAddr).
			Func("NewRemoteSyncer")
	}

	syncID := responseStream.Msg().GetSyncId()

	r := &remoteStreamUpdateEmitter{
		ctx:    ctx,
		cancel: cancel,
		log: logging.FromCtx(ctx).
			Named("syncv3.remoteStreamUpdateEmitter").
			With("addr", remoteAddr.Hex(), "streamID", streamID, "syncID", syncID),
		syncID:         syncID,
		streamID:       streamID,
		remoteAddr:     remoteAddr,
		responseStream: responseStream,
		client:         client,
		subscribers:    mapset.NewSet[StreamSubscriber](),
		onDown:         onDown,
	}

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

func (r *remoteStreamUpdateEmitter) Subscribe(subscriber StreamSubscriber) {
	r.subscribers.Add(subscriber)
}

func (r *remoteStreamUpdateEmitter) Unsubscribe(subscriber StreamSubscriber) {
	r.subscribers.Remove(subscriber)

	// Cancel the sync operation if there are no subscribers left.
	if r.subscribers.Cardinality() == 0 {
		r.cancel(nil)
	}
}

func (r *remoteStreamUpdateEmitter) Backfill(cookie *SyncCookie, syncIDs []string) error {
	ctxWithTimeout, cancel := context.WithTimeout(r.ctx, remoteStreamUpdateEmitterTimeout)
	defer cancel()

	resp, err := r.client.ModifySync(ctxWithTimeout, connect.NewRequest(&ModifySyncRequest{
		SyncId: r.syncID,
		BackfillStreams: &ModifySyncRequest_Backfill{
			SyncId:  syncIDs[0], // TODO: It requires only one sync ID instead of chain
			Streams: []*SyncCookie{cookie},
		},
	}))
	if err != nil {
		return err
	}

	if resp.Msg.GetBackfills() != nil {
		// TODO: Handle failure
	}

	return nil
}

// sendUpdateToSubscribers sends the given sync streams response to all subscribers of the stream.
func (r *remoteStreamUpdateEmitter) sendUpdateToSubscribers(msg *SyncStreamsResponse) {
	if r.subscribers.Cardinality() > 0 {
		for subscriber := range r.subscribers.Iter() {
			subscriber.OnStreamEvent(msg)
		}
	}
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
			r.sendUpdateToSubscribers(res)
		} else if res.GetSyncOp() == SyncOp_SYNC_DOWN {
			r.sendUpdateToSubscribers(res)
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
