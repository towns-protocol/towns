package client

import (
	"context"
	"errors"
	"fmt"
	"sync"
	"sync/atomic"
	"time"

	"connectrpc.com/connect"
	"github.com/ethereum/go-ethereum/common"
	. "github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/logging"
	. "github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/protocol/protocolconnect"
	. "github.com/towns-protocol/towns/core/node/shared"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/trace"
)

type remoteSyncer struct {
	cancelGlobalSyncOp    context.CancelCauseFunc
	syncStreamCtx         context.Context
	syncStreamCancel      context.CancelFunc
	syncID                string
	forwarderSyncID       string
	remoteAddr            common.Address
	client                protocolconnect.StreamServiceClient
	messages              chan<- *SyncStreamsResponse
	streams               sync.Map
	responseStream        *connect.ServerStreamForClient[SyncStreamsResponse]
	unsubStream           func(streamID StreamId)
	pendingModifySync     *ModifySyncRequest
	pendingModifySyncLock sync.Mutex
	// otelTracer is used to trace individual sync Send operations, tracing is disabled if nil
	otelTracer trace.Tracer
}

func newRemoteSyncer(
	ctx context.Context,
	cancelGlobalSyncOp context.CancelCauseFunc,
	forwarderSyncID string,
	remoteAddr common.Address,
	client protocolconnect.StreamServiceClient,
	cookies []*SyncCookie,
	unsubStream func(streamID StreamId),
	messages chan<- *SyncStreamsResponse,
	otelTracer trace.Tracer,
) (*remoteSyncer, error) {
	syncStreamCtx, syncStreamCancel := context.WithCancel(ctx)
	responseStream, err := client.SyncStreams(syncStreamCtx, connect.NewRequest(&SyncStreamsRequest{SyncPos: cookies}))
	if err != nil {
		go func() {
			defer syncStreamCancel()
			timeout := time.After(15 * time.Second)

			for _, cookie := range cookies {
				select {
				case messages <- &SyncStreamsResponse{
					SyncOp:   SyncOp_SYNC_DOWN,
					StreamId: cookie.GetStreamId(),
				}:
					continue
				case <-timeout:
					return
				case <-ctx.Done():
					return
				}
			}
		}()

		return nil, err
	}

	if !responseStream.Receive() {
		syncStreamCancel()
		return nil, responseStream.Err()
	}

	log := logging.FromCtx(ctx)

	if responseStream.Msg().GetSyncOp() != SyncOp_SYNC_NEW || responseStream.Msg().GetSyncId() == "" {
		log.Errorw("Received unexpected sync stream message",
			"syncOp", responseStream.Msg().SyncOp,
			"syncId", responseStream.Msg().SyncId)
		syncStreamCancel()
		return nil, err
	}

	s := &remoteSyncer{
		forwarderSyncID:    forwarderSyncID,
		cancelGlobalSyncOp: cancelGlobalSyncOp,
		syncStreamCtx:      syncStreamCtx,
		syncStreamCancel:   syncStreamCancel,
		client:             client,
		messages:           messages,
		responseStream:     responseStream,
		remoteAddr:         remoteAddr,
		unsubStream:        unsubStream,
		otelTracer:         otelTracer,
	}

	s.syncID = responseStream.Msg().GetSyncId()

	for _, cookie := range cookies {
		streamID, _ := StreamIdFromBytes(cookie.GetStreamId())
		s.streams.Store(streamID, struct{}{})
	}

	return s, nil
}

func (s *remoteSyncer) Run() {
	log := logging.FromCtx(s.syncStreamCtx)

	defer s.responseStream.Close()

	var latestMsgReceived atomic.Value

	latestMsgReceived.Store(time.Now())

	go s.connectionAlive(&latestMsgReceived)

	go s.startStreamModifier()

	for s.responseStream.Receive() {
		if s.syncStreamCtx.Err() != nil {
			break
		}

		latestMsgReceived.Store(time.Now())

		res := s.responseStream.Msg()

		if res.GetSyncOp() == SyncOp_SYNC_UPDATE {
			if err := s.sendSyncStreamResponseToClient(res); err != nil {
				if !errors.Is(err, context.Canceled) {
					log.Errorw("Cancel remote sync with client", "remote", s.remoteAddr, "err", err)
					s.cancelGlobalSyncOp(err)
				}
				return
			}
		} else if res.GetSyncOp() == SyncOp_SYNC_DOWN {
			if streamID, err := StreamIdFromBytes(res.GetStreamId()); err == nil {
				s.unsubStream(streamID)
				if err := s.sendSyncStreamResponseToClient(res); err != nil {
					if !errors.Is(err, context.Canceled) {
						log.Errorw("Cancel remote sync with client", "remote", s.remoteAddr, "err", err)
						s.cancelGlobalSyncOp(err)
					}
					return
				}

				s.streams.Delete(streamID)
			}
		}
	}

	// stream interrupted while client didn't cancel sync -> remote is unavailable
	if s.syncStreamCtx.Err() == nil {
		log.Infow("remote node disconnected", "remote", s.remoteAddr)

		s.streams.Range(func(key, value any) bool {
			streamID := key.(StreamId)
			log.Debugw("stream down", "syncId", s.forwarderSyncID, "remote", s.remoteAddr, "stream", streamID)

			msg := &SyncStreamsResponse{SyncOp: SyncOp_SYNC_DOWN, StreamId: streamID[:]}

			// TODO: slow down a bit to give client time to read stream down updates
			if err := s.sendSyncStreamResponseToClient(msg); err != nil {
				log.Errorw("Cancel remote sync with client", "remote", s.remoteAddr, "err", err)
				s.cancelGlobalSyncOp(err)
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
	case s.messages <- msg:
		return nil
	case <-s.syncStreamCtx.Done():
		return s.syncStreamCtx.Err()
	default:
		return RiverError(Err_BUFFER_FULL, "Client sync subscription message channel is full").
			Tag("syncId", s.forwarderSyncID).
			Func("sendSyncStreamResponseToClient")
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

			// send ping to remote to generate activity to check if remote is still alive
			if _, err := s.client.PingSync(s.syncStreamCtx, connect.NewRequest(&PingSyncRequest{
				SyncId: s.syncID,
				Nonce:  fmt.Sprintf("%d", now.Unix()),
			})); err != nil {
				if !errors.Is(err, context.Canceled) {
					log.Errorw("ping sync failed", "remote", s.remoteAddr, "err", err)
				}
				s.syncStreamCancel()
				return
			}
			return

		case <-s.syncStreamCtx.Done():
			return
		}
	}
}

// startStreamModifier starts a goroutine that periodically sends modify sync requests to the remote.
func (s *remoteSyncer) startStreamModifier() {
	var (
		log = logging.FromCtx(s.syncStreamCtx)
		// check every modifySyncTicker if it's time to send a modify sync req to remote
		modifySyncTicker = time.NewTicker(3 * time.Second)
	)
	defer modifySyncTicker.Stop()

	for {
		select {
		case <-modifySyncTicker.C:
			if err := s.modifySync(); err != nil {
				log.Errorw("modify sync failed", "remote", s.remoteAddr, "err", err)
				s.cancelGlobalSyncOp(err)
				return
			}

		case <-s.syncStreamCtx.Done():
			return
		}
	}
}

// modifySync sends a modify sync request to the remote.
func (s *remoteSyncer) modifySync() error {
	s.pendingModifySyncLock.Lock()
	toAdd := s.pendingModifySync.GetAddStreams()[:]
	toRemove := s.pendingModifySync.GetRemoveStreams()[:]
	s.pendingModifySync = &ModifySyncRequest{}
	s.pendingModifySyncLock.Unlock()

	if len(toAdd) == 0 && len(toRemove) == 0 {
		return nil
	}

	ctx := s.syncStreamCtx
	if s.otelTracer != nil {
		var span trace.Span
		ctx, span = s.otelTracer.Start(ctx, "remoteSyncer::modifySync",
			trace.WithAttributes(attribute.Int("toAdd", len(toAdd))),
			trace.WithAttributes(attribute.Int("toRemove", len(toRemove))))
		defer span.End()
	}

	resp, err := s.client.ModifySync(ctx, connect.NewRequest(&ModifySyncRequest{
		SyncId:        s.syncID,
		AddStreams:    toAdd,
		RemoveStreams: toRemove,
	}))
	if err != nil {
		return err
	}

	// Remove failed adds
	for _, failed := range resp.Msg.GetAdds() {
		id1, _ := StreamIdFromBytes(failed.GetStreamId())
		for _, cookie := range toAdd {
			id2, _ := StreamIdFromBytes(cookie.GetStreamId())
			if id1.Compare(id2) != 0 {
				s.streams.Store(id2, struct{}{})
			} else {
				logging.FromCtx(s.syncStreamCtx).Errorw("Failed to add stream", "stream", id1)
			}
		}
	}

	// Remove failed removals
	for _, failed := range resp.Msg.GetRemovals() {
		id1, _ := StreamIdFromBytes(failed.GetStreamId())
		for _, id2 := range toRemove {
			if id1.Compare(StreamId(id2)) != 0 {
				s.streams.Delete(StreamId(id2))
			} else {
				logging.FromCtx(s.syncStreamCtx).Errorw("Failed to remove stream", "stream", id1)
			}
		}
	}

	noMoreStreams := true
	s.streams.Range(func(key, value any) bool {
		noMoreStreams = false
		return false
	})

	if noMoreStreams {
		s.syncStreamCancel()
	}

	return nil
}

func (s *remoteSyncer) Address() common.Address {
	return s.remoteAddr
}

func (s *remoteSyncer) AddStream(ctx context.Context, cookie *SyncCookie) error {
	streamID, _ := StreamIdFromBytes(cookie.GetStreamId())

	if s.otelTracer != nil {
		_, span := s.otelTracer.Start(ctx, "remoteSyncer::AddStream",
			trace.WithAttributes(attribute.String("stream", streamID.String())))
		defer span.End()
	}

	s.pendingModifySyncLock.Lock()
	defer s.pendingModifySyncLock.Unlock()

	if s.pendingModifySync == nil {
		s.pendingModifySync = &ModifySyncRequest{}
	}

	// If the given stream exists in the pending list to remove, remove it from there
	var removed bool
	for i := len(s.pendingModifySync.RemoveStreams) - 1; i >= 0; i-- {
		if StreamId(s.pendingModifySync.RemoveStreams[i]).Compare(streamID) == 0 {
			if i == len(s.pendingModifySync.RemoveStreams)-1 {
				s.pendingModifySync.RemoveStreams = s.pendingModifySync.RemoveStreams[:i]
			} else {
				s.pendingModifySync.RemoveStreams = append(s.pendingModifySync.RemoveStreams[:i], s.pendingModifySync.RemoveStreams[i+1:]...)
			}
			removed = true
			break
		}
	}

	if !removed {
		s.pendingModifySync.AddStreams = append(s.pendingModifySync.AddStreams, cookie)
	}

	return nil
}

func (s *remoteSyncer) RemoveStream(ctx context.Context, streamID StreamId) (bool, error) {
	if s.otelTracer != nil {
		_, span := s.otelTracer.Start(ctx, "remoteSyncer::removeStream",
			trace.WithAttributes(attribute.String("stream", streamID.String())))
		defer span.End()
	}

	s.pendingModifySyncLock.Lock()
	defer s.pendingModifySyncLock.Unlock()

	if s.pendingModifySync == nil {
		s.pendingModifySync = &ModifySyncRequest{}
	}

	// If the given stream exists in the pending list to add, remove the last one from there
	var removed bool
	for i := len(s.pendingModifySync.AddStreams) - 1; i >= 0; i-- {
		addStreamID, _ := StreamIdFromBytes(s.pendingModifySync.AddStreams[i].GetStreamId())
		if streamID.Compare(addStreamID) == 0 {
			if i == len(s.pendingModifySync.AddStreams)-1 {
				s.pendingModifySync.AddStreams = s.pendingModifySync.AddStreams[:i] // Trim the last element safely
			} else {
				s.pendingModifySync.AddStreams = append(s.pendingModifySync.AddStreams[:i], s.pendingModifySync.AddStreams[i+1:]...)
			}
			removed = true
			break
		}
	}

	// If the stream was not in the pending list to add, add it to the list to remove
	if !removed {
		s.pendingModifySync.RemoveStreams = append(s.pendingModifySync.RemoveStreams, streamID[:])
	}

	_, noMoreStreams := s.getStateCandidateNoLock()

	return noMoreStreams, nil
}

func (s *remoteSyncer) DebugDropStream(ctx context.Context, streamID StreamId) (bool, error) {
	if _, err := s.client.Info(ctx, connect.NewRequest(&InfoRequest{Debug: []string{
		"drop_stream",
		s.syncID,
		streamID.String(),
	}})); err != nil {
		return false, AsRiverError(err)
	}

	s.pendingModifySyncLock.Lock()
	_, noMoreStreams := s.getStateCandidateNoLock()
	s.pendingModifySyncLock.Unlock()

	return noMoreStreams, nil
}

func (s *remoteSyncer) getStateCandidateNoLock() (*sync.Map, bool) {
	if s.pendingModifySync == nil {
		s.pendingModifySync = &ModifySyncRequest{}
	}

	// Add current streams
	var streamsCandidate sync.Map
	s.streams.Range(func(key, value any) bool {
		streamsCandidate.Store(key, value)
		return true
	})

	// Update based on the pending state
	for _, cookie := range s.pendingModifySync.GetAddStreams() {
		streamID, _ := StreamIdFromBytes(cookie.GetStreamId())
		streamsCandidate.Store(streamID, struct{}{})
	}
	for _, streamID := range s.pendingModifySync.GetRemoveStreams() {
		streamsCandidate.Delete(StreamId(streamID))
	}

	noMoreStreams := true
	streamsCandidate.Range(func(key, value any) bool {
		noMoreStreams = false
		return false
	})

	return &streamsCandidate, noMoreStreams
}
