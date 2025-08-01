package syncv3

import (
	"context"
	"errors"
	"fmt"
	"slices"
	"sync/atomic"
	"time"

	"connectrpc.com/connect"
	"github.com/ethereum/go-ethereum/common"
	"github.com/puzpuzpuz/xsync/v4"
	"go.opentelemetry.io/otel/trace"

	. "github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/logging"
	. "github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/protocol/protocolconnect"
	. "github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/utils/dynmsgbuf"
)

// remoteSyncer implements the Syncer interface for remote sync operations.
// It handles the synchronization of streams with a remote node using a streaming RPC connection.
type remoteSyncer struct {
	// ctx is the context for the sync operation.
	ctx context.Context
	// cancel is the function to cancel the sync operation.
	cancel context.CancelFunc
	// syncID is the unique identifier for the sync operation.
	syncID string
	// remoteAddr is the address of the remote node.
	remoteAddr common.Address
	// client is the RPC client used to communicate with the remote node.
	client protocolconnect.StreamServiceClient
	// eventBusQueue ...
	eventBusQueue *dynmsgbuf.DynamicBuffer[*EventBusMessage]
	// streams is a thread-safe map that keeps track of active streams.
	streams *xsync.Map[StreamId, struct{}]
	// responseStream is the stream for receiving sync messages from the remote node.
	responseStream *connect.ServerStreamForClient[SyncStreamsResponse]
	// unsubStream is called when a stream goes down.
	unsubStream func(streamID StreamId)
	// otelTracer is used to trace individual sync Send operations, tracing is disabled if nil
	otelTracer trace.Tracer
}

// NewRemoteSyncer creates a new remote syncer instance.
func NewRemoteSyncer(
	ctx context.Context,
	remoteAddr common.Address,
	client protocolconnect.StreamServiceClient,
	eventBusQueue *dynmsgbuf.DynamicBuffer[*EventBusMessage],
	unsubStream func(streamID StreamId),
	otelTracer trace.Tracer,
) (Syncer, error) {
	syncStreamCtx, syncStreamCancel := context.WithCancel(ctx)

	// ensure that the first valid update is received within 15 seconds,
	// if not, cancel the operation and return an unavailable error
	var firstUpdateReceived atomic.Bool
	go func() {
		select {
		case <-syncStreamCtx.Done():
		case <-time.After(15 * time.Second):
			if !firstUpdateReceived.Load() {
				syncStreamCancel()
			}
		}
	}()

	// TODO: Remove after removing the legacy syncer
	req := connect.NewRequest(&SyncStreamsRequest{})
	req.Header().Set(UseSharedSyncHeaderName, "true")

	responseStream, err := client.SyncStreams(syncStreamCtx, req)
	if err != nil {
		syncStreamCancel()

		return nil, RiverErrorWithBase(
			Err_UNAVAILABLE,
			"SyncStreams failed",
			err).
			Tags("remote", remoteAddr).
			Func("NewRemoteSyncer")
	}

	// store indication if the first update was received
	firstUpdateReceived.Store(responseStream.Receive())

	// if the sync operation was canceled, return an unavailable error
	if !firstUpdateReceived.Load() || syncStreamCtx.Err() != nil {
		syncStreamCancel()

		return nil, RiverErrorWithBase(
			Err_UNAVAILABLE,
			"SyncStreams stream closed without receiving any messages",
			responseStream.Err()).
			Tags("remote", remoteAddr).
			Func("NewRemoteSyncer")
	}

	// test that the first update is a SYNC_NEW message with a valid syncID set
	if responseStream.Msg().GetSyncOp() != SyncOp_SYNC_NEW || responseStream.Msg().GetSyncId() == "" {
		syncStreamCancel()

		logging.FromCtx(ctx).Errorw("Received unexpected sync stream message",
			"syncOp", responseStream.Msg().SyncOp,
			"syncId", responseStream.Msg().SyncId)

		return nil, RiverError(Err_UNAVAILABLE, "Received unexpected sync stream message").
			Tags("syncOp", responseStream.Msg().SyncOp,
				"syncId", responseStream.Msg().SyncId,
				"remote", remoteAddr).
			Func("NewRemoteSyncer")
	}

	return &remoteSyncer{
		ctx:            syncStreamCtx,
		cancel:         syncStreamCancel,
		syncID:         responseStream.Msg().GetSyncId(),
		client:         client,
		eventBusQueue:  eventBusQueue,
		streams:        xsync.NewMap[StreamId, struct{}](),
		responseStream: responseStream,
		remoteAddr:     remoteAddr,
		unsubStream:    unsubStream,
		otelTracer:     otelTracer,
	}, nil
}

// Run starts the remote syncer, it should handle the remote sync logic.
func (s *remoteSyncer) Run() {
	log := logging.FromCtx(s.ctx)

	var latestMsgReceived atomic.Value
	latestMsgReceived.Store(time.Now())

	defer func() {
		if err := s.responseStream.Close(); err != nil {
			log.Errorw("Failed to close response stream", "remote", s.remoteAddr, "error", err)
		}
	}()

	go s.connectionAlive(&latestMsgReceived)

	for s.responseStream.Receive() {
		if s.ctx.Err() != nil {
			break
		}

		latestMsgReceived.Store(time.Now())

		res := s.responseStream.Msg()

		if res.GetSyncOp() == SyncOp_SYNC_UPDATE {
			streamID, err := StreamIdFromBytes(res.GetStream().GetNextSyncCookie().GetStreamId())
			if err != nil {
				log.Errorw("Received invalid stream ID in sync update", "remote", s.remoteAddr, "error", err)
				continue
			}

			if err = s.sendResponse(streamID, res); err != nil {
				if !errors.Is(err, context.Canceled) {
					log.Errorw("Cancel remote sync with client", "remote", s.remoteAddr, "error", err)
				}
				return
			}
		} else if res.GetSyncOp() == SyncOp_SYNC_DOWN {
			streamID, err := StreamIdFromBytes(res.GetStreamId())
			if err != nil {
				log.Errorw("Received invalid stream ID in sync down", "remote", s.remoteAddr, "error", err)
				continue
			}

			if err = s.sendResponse(streamID, res); err != nil {
				if !errors.Is(err, context.Canceled) {
					log.Errorw("Cancel remote sync with client", "remote", s.remoteAddr, "error", err)
				}
				return
			}

			// This must happen only after sending the message to the client.
			s.unsubStream(streamID)
			s.streams.Delete(streamID)
		}
	}

	// Stream interrupted while client didn't cancel sync -> remote is unavailable
	if s.ctx.Err() == nil {
		log.Infow("remote node disconnected", "remote", s.remoteAddr)

		s.streams.Range(func(streamID StreamId, _ struct{}) bool {
			log.Debugw("stream down", "remote", s.remoteAddr, "stream", streamID)
			msg := &SyncStreamsResponse{SyncOp: SyncOp_SYNC_DOWN, StreamId: streamID[:]}
			if err := s.sendResponse(streamID, msg); err != nil {
				log.Errorw("Cancel remote sync with client", "remote", s.remoteAddr, "error", err)
				return false
			}
			// This must happen only after sending the message to the client.
			s.unsubStream(streamID)
			return true
		})

		s.streams.Clear()
	}
}

// ID returns the unique identifier of the remote syncer.
func (s *remoteSyncer) ID() string {
	return s.syncID
}

// Address returns the address of the remote syncer.
func (s *remoteSyncer) Address() common.Address {
	return s.remoteAddr
}

// Modify handles modification requests for the remote syncer.
func (s *remoteSyncer) Modify(ctx context.Context, request *ModifySyncRequest) (*ModifySyncResponse, error) {
	// Force set the syncID to the current syncID
	request.SyncId = s.syncID

	resp, err := s.client.ModifySync(ctx, connect.NewRequest(request))
	if err != nil {
		return nil, err
	}

	for _, cookie := range request.GetAddStreams() {
		if !slices.ContainsFunc(resp.Msg.GetAdds(), func(status *SyncStreamOpStatus) bool {
			return StreamId(status.StreamId) == StreamId(cookie.GetStreamId())
		}) {
			s.streams.Store(StreamId(cookie.GetStreamId()), struct{}{})
		}
	}

	for _, streamIdRaw := range request.GetRemoveStreams() {
		if !slices.ContainsFunc(resp.Msg.GetRemovals(), func(status *SyncStreamOpStatus) bool {
			return StreamId(status.StreamId) == StreamId(streamIdRaw)
		}) {
			s.streams.Delete(StreamId(streamIdRaw))
		}
	}

	return resp.Msg, nil
}

// sendResponse tries to write msg to the client send message channel.
// If the channel is full or the sync operation is cancelled, the function returns an error.
func (s *remoteSyncer) sendResponse(streamID StreamId, msg *SyncStreamsResponse) error {
	var err error
	select {
	case <-s.ctx.Done():
		if err = s.ctx.Err(); err != nil {
			err = AsRiverError(err, Err_CANCELED)
		}
	default:
		err = s.eventBusQueue.AddMessage(NewEventBusMessageUpdateStream(msg))
	}
	if err != nil {
		rvrErr := AsRiverError(err).Func("remoteSyncer.sendResponse")
		_ = rvrErr.LogError(logging.FromCtx(s.ctx))
		return rvrErr
	}
	return nil
}

// connectionAlive periodically pings remote to check if the connection is still alive.
// if the remote can't be reach the sync stream is canceled.
func (s *remoteSyncer) connectionAlive(latestMsgReceived *atomic.Value) {
	var (
		log = logging.FromCtx(s.ctx)
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
		case <-pingTicker.C:
			now := time.Now()
			lastMsgRecv := latestMsgReceived.Load().(time.Time)
			if lastMsgRecv.Add(recentActivityDeadline).Before(now) { // no recent activity -> conn dead
				log.Warnw("remote sync node time out", "remote", s.remoteAddr)
				s.cancel()
				return
			}

			if lastMsgRecv.Add(recentActivityInterval).After(now) { // seen recent activity
				continue
			}

			// Send ping to remote to generate activity to check if remote is still alive
			if _, err := s.client.PingSync(s.ctx, connect.NewRequest(&PingSyncRequest{
				SyncId: s.syncID,
				Nonce:  fmt.Sprintf("%d", now.Unix()),
			})); err != nil {
				if !errors.Is(err, context.Canceled) {
					log.Errorw("ping sync failed", "remote", s.remoteAddr, "error", err)
				}
				s.cancel()
				return
			}
		case <-s.ctx.Done():
			return
		}
	}
}
