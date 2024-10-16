package client

import (
	"context"
	"sync"

	"github.com/ethereum/go-ethereum/common"

	. "github.com/river-build/river/core/node/base"
	"github.com/river-build/river/core/node/dlog"
	"github.com/river-build/river/core/node/events"
	. "github.com/river-build/river/core/node/protocol"
	. "github.com/river-build/river/core/node/shared"
)

type localSyncer struct {
	globalSyncOpID string

	syncStreamCtx      context.Context
	cancelGlobalSyncOp context.CancelCauseFunc

	streamCache events.StreamCache
	cookies     []*SyncCookie
	messages    chan<- *SyncStreamsResponse
	localAddr   common.Address

	activeStreamsMu sync.Mutex
	activeStreams   map[StreamId]events.SyncStream
}

func newLocalSyncer(
	ctx context.Context,
	globalSyncOpID string,
	cancelGlobalSyncOp context.CancelCauseFunc,
	localAddr common.Address,
	streamCache events.StreamCache,
	cookies []*SyncCookie,
	messages chan<- *SyncStreamsResponse,
) (*localSyncer, error) {
	return &localSyncer{
		globalSyncOpID:     globalSyncOpID,
		syncStreamCtx:      ctx,
		cancelGlobalSyncOp: cancelGlobalSyncOp,
		streamCache:        streamCache,
		localAddr:          localAddr,
		cookies:            cookies,
		messages:           messages,
		activeStreams:      make(map[StreamId]events.SyncStream),
	}, nil
}

func (s *localSyncer) Run() {
	for _, cookie := range s.cookies {
		streamID, _ := StreamIdFromBytes(cookie.GetStreamId())
		_ = s.addStream(s.syncStreamCtx, streamID, cookie)
	}

	<-s.syncStreamCtx.Done()

	s.activeStreamsMu.Lock()
	defer s.activeStreamsMu.Unlock()

	for streamID, syncStream := range s.activeStreams {
		syncStream.Unsub(s)
		delete(s.activeStreams, streamID)
	}
}

func (s *localSyncer) Address() common.Address {
	return s.localAddr
}

func (s *localSyncer) AddStream(ctx context.Context, cookie *SyncCookie) error {
	streamID, err := StreamIdFromBytes(cookie.GetStreamId())
	if err != nil {
		return err
	}
	return s.addStream(ctx, streamID, cookie)
}

func (s *localSyncer) RemoveStream(_ context.Context, streamID StreamId) (bool, error) {
	s.activeStreamsMu.Lock()
	defer s.activeStreamsMu.Unlock()

	syncStream, found := s.activeStreams[streamID]
	if found {
		syncStream.Unsub(s)
		delete(s.activeStreams, streamID)
	}

	return len(s.activeStreams) == 0, nil
}

// OnUpdate is called each time a new cookie is available for a stream
func (s *localSyncer) OnUpdate(r *StreamAndCookie) {
	select {
	case s.messages <- &SyncStreamsResponse{SyncOp: SyncOp_SYNC_UPDATE, Stream: r}:
		return
	case <-s.syncStreamCtx.Done():
		return
	default:
		err := RiverError(Err_BUFFER_FULL, "Client sync subscription message channel is full").
			Tag("syncId", s.globalSyncOpID).
			Func("OnUpdate")

		_ = err.LogError(dlog.FromCtx(s.syncStreamCtx))

		s.cancelGlobalSyncOp(err)
	}
}

// OnSyncError is called when a sync subscription failed unrecoverable
func (s *localSyncer) OnSyncError(error) {
	s.activeStreamsMu.Lock()
	defer s.activeStreamsMu.Unlock()

	for streamID, syncStream := range s.activeStreams {
		syncStream.Unsub(s)
		delete(s.activeStreams, streamID)
		s.OnStreamSyncDown(streamID)
	}
}

// OnStreamSyncDown is called when updates for a stream could not be given.
func (s *localSyncer) OnStreamSyncDown(streamID StreamId) {
	select {
	case s.messages <- &SyncStreamsResponse{SyncOp: SyncOp_SYNC_DOWN, StreamId: streamID[:]}:
		return
	case <-s.syncStreamCtx.Done():
		return
	default:
		err := RiverError(Err_BUFFER_FULL, "Client sync subscription message channel is full").
			Tag("syncId", s.globalSyncOpID).
			Func("sendSyncStreamResponseToClient")

		_ = err.LogError(dlog.FromCtx(s.syncStreamCtx))

		s.cancelGlobalSyncOp(err)
	}
}

func (s *localSyncer) addStream(ctx context.Context, streamID StreamId, cookie *SyncCookie) error {
	s.activeStreamsMu.Lock()
	defer s.activeStreamsMu.Unlock()

	// prevent subscribing multiple times on the same stream
	if _, found := s.activeStreams[streamID]; found {
		return nil
	}

	syncStream, err := s.streamCache.GetStream(ctx, streamID)
	if err != nil {
		return err
	}

	if err := syncStream.Sub(ctx, cookie, s); err != nil {
		return err
	}

	s.activeStreams[streamID] = syncStream

	return nil
}

func (s *localSyncer) DebugDropStream(_ context.Context, streamID StreamId) (bool, error) {
	s.activeStreamsMu.Lock()
	defer s.activeStreamsMu.Unlock()

	syncStream, found := s.activeStreams[streamID]
	if found {
		syncStream.Unsub(s)
		delete(s.activeStreams, streamID)
		s.OnStreamSyncDown(streamID)
		return false, nil
	}

	return false, RiverError(Err_NOT_FOUND, "stream not found").Tag("stream", streamID)
}
