package client

import (
	"context"
	"errors"
	"fmt"
	"slices"
	"sync"
	"sync/atomic"
	"time"

	"connectrpc.com/connect"
	"github.com/ethereum/go-ethereum/common"
	"go.opentelemetry.io/otel/trace"

	. "github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/logging"
	. "github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/protocol/protocolconnect"
	"github.com/towns-protocol/towns/core/node/rpc/sync/dynmsgbuf"
	. "github.com/towns-protocol/towns/core/node/shared"
)

type remoteSyncer struct {
	ctx            context.Context
	ctxCancel      context.CancelFunc
	syncID         string
	remoteAddr     common.Address
	client         protocolconnect.StreamServiceClient
	messages       *dynmsgbuf.DynamicBuffer[*SyncStreamsResponse]
	streams        sync.Map
	responseStream *connect.ServerStreamForClient[SyncStreamsResponse]
	unsubStream    func(streamID StreamId)
	// otelTracer is used to trace individual sync Send operations, tracing is disabled if nil
	otelTracer trace.Tracer
}

func newRemoteSyncer(
	ctx context.Context,
	remoteAddr common.Address,
	client protocolconnect.StreamServiceClient,
	unsubStream func(streamID StreamId),
	messages *dynmsgbuf.DynamicBuffer[*SyncStreamsResponse],
	otelTracer trace.Tracer,
) (*remoteSyncer, error) {
	syncStreamCtx, syncStreamCancel := context.WithCancel(ctx)
	responseStream, err := client.SyncStreams(syncStreamCtx, connect.NewRequest(&SyncStreamsRequest{}))
	if err != nil {
		syncStreamCancel()
		return nil, err
	}

	if !responseStream.Receive() {
		syncStreamCancel()
		return nil, responseStream.Err()
	}

	if responseStream.Msg().GetSyncOp() != SyncOp_SYNC_NEW || responseStream.Msg().GetSyncId() == "" {
		logging.FromCtx(ctx).Errorw("Received unexpected sync stream message",
			"syncOp", responseStream.Msg().SyncOp,
			"syncId", responseStream.Msg().SyncId)
		syncStreamCancel()
		return nil, err
	}

	return &remoteSyncer{
		syncID:         responseStream.Msg().GetSyncId(),
		ctx:            syncStreamCtx,
		ctxCancel:      syncStreamCancel,
		client:         client,
		messages:       messages,
		responseStream: responseStream,
		remoteAddr:     remoteAddr,
		unsubStream:    unsubStream,
		otelTracer:     otelTracer,
	}, nil
}

func (s *remoteSyncer) Run() {
	log := logging.FromCtx(s.ctx)

	defer s.responseStream.Close()

	var latestMsgReceived atomic.Value

	latestMsgReceived.Store(time.Now())

	go s.connectionAlive(&latestMsgReceived)

	for s.responseStream.Receive() {
		if s.ctx.Err() != nil {
			break
		}

		latestMsgReceived.Store(time.Now())

		res := s.responseStream.Msg()

		if res.GetSyncOp() == SyncOp_SYNC_UPDATE {
			if err := s.sendSyncStreamResponseToClient(res); err != nil {
				if !errors.Is(err, context.Canceled) {
					log.Errorw("Cancel remote sync with client", "remote", s.remoteAddr, "err", err)
				}
				return
			}
		} else if res.GetSyncOp() == SyncOp_SYNC_DOWN {
			if streamID, err := StreamIdFromBytes(res.GetStreamId()); err == nil {
				s.unsubStream(streamID)
				if err := s.sendSyncStreamResponseToClient(res); err != nil {
					if !errors.Is(err, context.Canceled) {
						log.Errorw("Cancel remote sync with client", "remote", s.remoteAddr, "err", err)
					}
					return
				}

				s.streams.Delete(streamID)
			}
		}
	}

	// stream interrupted while client didn't cancel sync -> remote is unavailable
	if s.ctx.Err() == nil {
		log.Infow("remote node disconnected", "remote", s.remoteAddr)

		s.streams.Range(func(key, value any) bool {
			streamID := key.(StreamId)
			log.Debugw("stream down", "remote", s.remoteAddr, "stream", streamID)

			msg := &SyncStreamsResponse{SyncOp: SyncOp_SYNC_DOWN, StreamId: streamID[:]}

			// TODO: slow down a bit to give client time to read stream down updates
			if err := s.sendSyncStreamResponseToClient(msg); err != nil {
				log.Errorw("Cancel remote sync with client", "remote", s.remoteAddr, "err", err)
				return false
			}

			return true
		})
	}
}

// sendSyncStreamResponseToClient tries to write msg to the client send message channel.
// If the channel is full or the sync operation is cancelled, the function returns an error.
func (s *remoteSyncer) sendSyncStreamResponseToClient(msg *SyncStreamsResponse) error {
	select {
	case <-s.ctx.Done():
		return s.ctx.Err()
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
				s.ctxCancel()
				return
			}

			if lastMsgRecv.Add(recentActivityInterval).After(now) { // seen recent activity
				continue
			}

			// send ping to remote to generate activity to check if remote is still alive
			if _, err := s.client.PingSync(s.ctx, connect.NewRequest(&PingSyncRequest{
				SyncId: s.syncID,
				Nonce:  fmt.Sprintf("%d", now.Unix()),
			})); err != nil {
				if !errors.Is(err, context.Canceled) {
					log.Errorw("ping sync failed", "remote", s.remoteAddr, "err", err)
				}
				s.ctxCancel()
				return
			}
			return

		case <-s.ctx.Done():
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

	noMoreStreams := true
	s.streams.Range(func(key, value any) bool {
		noMoreStreams = false
		return false
	})

	if noMoreStreams {
		s.ctxCancel()
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

	noMoreStreams := true
	s.streams.Range(func(key, value any) bool {
		noMoreStreams = false
		return false
	})

	if noMoreStreams {
		s.ctxCancel()
	}

	return noMoreStreams, nil
}
