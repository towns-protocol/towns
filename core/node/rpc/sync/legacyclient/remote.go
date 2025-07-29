package legacyclient

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
	"github.com/towns-protocol/towns/core/node/rpc/sync/dynmsgbuf"
	. "github.com/towns-protocol/towns/core/node/shared"
)

type remoteSyncer struct {
	cancelGlobalSyncOp context.CancelCauseFunc
	syncStreamCtx      context.Context
	syncStreamCancel   context.CancelFunc
	syncID             string
	forwarderSyncID    string
	remoteAddr         common.Address
	client             protocolconnect.StreamServiceClient
	messages           *dynmsgbuf.DynamicBuffer[*SyncStreamsResponse]
	streams            *xsync.Map[StreamId, struct{}]
	responseStream     *connect.ServerStreamForClient[SyncStreamsResponse]
	unsubStream        func(streamID StreamId)
	// otelTracer is used to trace individual sync Send operations, tracing is disabled if nil
	otelTracer trace.Tracer
}

func NewRemoteSyncer(
	ctx context.Context,
	cancelGlobalSyncOp context.CancelCauseFunc,
	forwarderSyncID string,
	remoteAddr common.Address,
	client protocolconnect.StreamServiceClient,
	unsubStream func(streamID StreamId),
	messages *dynmsgbuf.DynamicBuffer[*SyncStreamsResponse],
	otelTracer trace.Tracer,
) (*remoteSyncer, error) {
	syncStreamCtx, syncStreamCancel := context.WithCancel(ctx)

	// ensure that the first valid update is received within 15 seconds,
	// if not, cancel the operation and return an unavailable error
	var firstUpdateReceived atomic.Bool
	go func() {
		<-time.After(15 * time.Second)
		if !firstUpdateReceived.Load() {
			syncStreamCancel()
		}
	}()

	responseStream, err := client.SyncStreams(syncStreamCtx, connect.NewRequest(&SyncStreamsRequest{}))
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
		syncID:             responseStream.Msg().GetSyncId(),
		forwarderSyncID:    forwarderSyncID,
		cancelGlobalSyncOp: cancelGlobalSyncOp,
		syncStreamCtx:      syncStreamCtx,
		syncStreamCancel:   syncStreamCancel,
		client:             client,
		messages:           messages,
		streams:            xsync.NewMap[StreamId, struct{}](),
		responseStream:     responseStream,
		remoteAddr:         remoteAddr,
		unsubStream:        unsubStream,
		otelTracer:         otelTracer,
	}, nil
}

func (s *remoteSyncer) GetSyncId() string {
	return s.syncID
}

func (s *remoteSyncer) Run() {
	log := logging.FromCtx(s.syncStreamCtx)

	defer s.responseStream.Close()

	var latestMsgReceived atomic.Value

	latestMsgReceived.Store(time.Now())

	go s.connectionAlive(&latestMsgReceived)

	for s.responseStream.Receive() {
		if s.syncStreamCtx.Err() != nil {
			break
		}

		latestMsgReceived.Store(time.Now())

		res := s.responseStream.Msg()

		if res.GetSyncOp() == SyncOp_SYNC_UPDATE {
			if err := s.sendSyncStreamResponseToClient(res); err != nil {
				if !errors.Is(err, context.Canceled) {
					log.Errorw("Cancel remote sync with client", "remote", s.remoteAddr, "error", err)
					s.cancelGlobalSyncOp(err)
				}
				return
			}
		} else if res.GetSyncOp() == SyncOp_SYNC_DOWN {
			if streamID, err := StreamIdFromBytes(res.GetStreamId()); err == nil {
				s.unsubStream(streamID)
				if err := s.sendSyncStreamResponseToClient(res); err != nil {
					if !errors.Is(err, context.Canceled) {
						log.Errorw("Cancel remote sync with client", "remote", s.remoteAddr, "error", err)
						s.cancelGlobalSyncOp(err)
					}
					return
				}

				s.streams.Delete(streamID)
			}
		}
	}

	// Stream interrupted while client didn't cancel sync -> remote is unavailable
	if s.syncStreamCtx.Err() == nil {
		log.Infow("remote node disconnected", "remote", s.remoteAddr)

		s.streams.Range(func(streamID StreamId, _ struct{}) bool {
			log.Debugw("stream down", "syncId", s.forwarderSyncID, "remote", s.remoteAddr, "stream", streamID)

			msg := &SyncStreamsResponse{SyncOp: SyncOp_SYNC_DOWN, StreamId: streamID[:]}

			// TODO: slow down a bit to give client time to read stream down updates
			if err := s.sendSyncStreamResponseToClient(msg); err != nil {
				log.Errorw("Cancel remote sync with client", "remote", s.remoteAddr, "error", err)
				s.cancelGlobalSyncOp(err)
				return false
			}

			// unsubStream is called to remove the stream from the local cache of the syncer set so
			// the given stream could be re-added.
			s.unsubStream(streamID)

			return true
		})
	}
}

// sendSyncStreamResponseToClient tries to write msg to the client send message channel.
// If the channel is full or the sync operation is cancelled, the function returns an error.
func (s *remoteSyncer) sendSyncStreamResponseToClient(msg *SyncStreamsResponse) error {
	select {
	case <-s.syncStreamCtx.Done():
		return s.syncStreamCtx.Err()
	default:
		if err := s.messages.AddMessage(msg); err != nil {
			return AsRiverError(err).
				Tag("syncId", s.syncID).
				Tag("op", msg.GetSyncOp()).
				Func("sendSyncStreamResponseToClient")
		}

		return nil
	}
}

// connectionAlive periodically pings remote to check if the connection is still alive.
// if the remote can't be reach the sync stream is canceled.
func (s *remoteSyncer) connectionAlive(latestMsgReceived *atomic.Value) {
	var (
		log = logging.FromCtx(s.syncStreamCtx)
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
				s.syncStreamCancel()
				return
			}

			if lastMsgRecv.Add(recentActivityInterval).After(now) { // seen recent activity
				continue
			}

			// Send ping to remote to generate activity to check if remote is still alive
			if _, err := s.client.PingSync(s.syncStreamCtx, connect.NewRequest(&PingSyncRequest{
				SyncId: s.syncID,
				Nonce:  fmt.Sprintf("%d", now.Unix()),
			})); err != nil {
				if !errors.Is(err, context.Canceled) {
					log.Errorw("ping sync failed", "remote", s.remoteAddr, "error", err)
				}
				s.syncStreamCancel()
				return
			}
		case <-s.syncStreamCtx.Done():
			return
		}
	}
}

func (s *remoteSyncer) Address() common.Address {
	return s.remoteAddr
}

func (s *remoteSyncer) Modify(ctx context.Context, request *ModifySyncRequest) (*ModifySyncResponse, bool, error) {
	if s.otelTracer != nil {
		var span trace.Span
		ctx, span = s.otelTracer.Start(ctx, "remoteSyncer::modify")
		defer span.End()
	}

	// Force set the syncID to the current syncID
	request.SyncId = s.syncID

	resp, err := s.client.ModifySync(ctx, connect.NewRequest(request))
	if err != nil {
		return nil, false, err
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

	noMoreStreams := s.streams.Size() == 0
	if noMoreStreams {
		s.syncStreamCancel()
	}
	return resp.Msg, noMoreStreams, nil
}

func (s *remoteSyncer) DebugDropStream(ctx context.Context, streamID StreamId) (bool, error) {
	if _, err := s.client.Info(ctx, connect.NewRequest(&InfoRequest{Debug: []string{
		"drop_stream",
		s.syncID,
		streamID.String(),
	}})); err != nil {
		return false, AsRiverError(err)
	}

	noMoreStreams := s.streams.Size() == 0
	if noMoreStreams {
		s.syncStreamCancel()
	}
	return noMoreStreams, nil
}
