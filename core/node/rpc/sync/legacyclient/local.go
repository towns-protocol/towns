package legacyclient

import (
	"context"

	"github.com/ethereum/go-ethereum/common"
	"github.com/linkdata/deadlock"
	"go.opentelemetry.io/otel/trace"

	. "github.com/towns-protocol/towns/core/node/base"
	. "github.com/towns-protocol/towns/core/node/events"
	"github.com/towns-protocol/towns/core/node/logging"
	. "github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/rpc/sync/dynmsgbuf"
	. "github.com/towns-protocol/towns/core/node/shared"
)

type localSyncer struct {
	globalSyncOpID string

	syncStreamCtx      context.Context
	cancelGlobalSyncOp context.CancelCauseFunc

	streamCache *StreamCache
	messages    *dynmsgbuf.DynamicBuffer[*SyncStreamsResponse]
	localAddr   common.Address

	activeStreamsMu deadlock.Mutex
	activeStreams   map[StreamId]*Stream

	// otelTracer is used to trace individual sync Send operations, tracing is disabled if nil
	otelTracer trace.Tracer
}

func newLocalSyncer(
	ctx context.Context,
	globalSyncOpID string,
	cancelGlobalSyncOp context.CancelCauseFunc,
	localAddr common.Address,
	streamCache *StreamCache,
	messages *dynmsgbuf.DynamicBuffer[*SyncStreamsResponse],
	otelTracer trace.Tracer,
) *localSyncer {
	return &localSyncer{
		globalSyncOpID:     globalSyncOpID,
		syncStreamCtx:      ctx,
		cancelGlobalSyncOp: cancelGlobalSyncOp,
		streamCache:        streamCache,
		localAddr:          localAddr,
		messages:           messages,
		activeStreams:      make(map[StreamId]*Stream),
		otelTracer:         otelTracer,
	}
}

func (s *localSyncer) Run() {
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

func (s *localSyncer) Modify(ctx context.Context, request *ModifySyncRequest) (*ModifySyncResponse, bool, error) {
	var resp ModifySyncResponse

	for _, cookie := range request.GetAddStreams() {
		if err := s.addStream(ctx, StreamId(cookie.GetStreamId()), cookie); err != nil {
			rvrErr := AsRiverError(err)
			resp.Adds = append(resp.Adds, &SyncStreamOpStatus{
				StreamId: cookie.GetStreamId(),
				Code:     int32(rvrErr.Code),
				Message:  rvrErr.GetMessage(),
			})
		}
	}

	s.activeStreamsMu.Lock()
	defer s.activeStreamsMu.Unlock()

	for _, streamID := range request.GetRemoveStreams() {
		syncStream, found := s.activeStreams[StreamId(streamID)]
		if found {
			syncStream.Unsub(s)
			delete(s.activeStreams, StreamId(streamID))
		}
	}

	return &resp, len(s.activeStreams) == 0, nil
}

// OnUpdate is called each time a new cookie is available for a stream
func (s *localSyncer) OnUpdate(r *StreamAndCookie) {
	s.sendResponse(&SyncStreamsResponse{SyncOp: SyncOp_SYNC_UPDATE, Stream: r})
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
	s.sendResponse(&SyncStreamsResponse{SyncOp: SyncOp_SYNC_DOWN, StreamId: streamID[:]})
}

func (s *localSyncer) addStream(ctx context.Context, streamID StreamId, cookie *SyncCookie) error {
	s.activeStreamsMu.Lock()
	defer s.activeStreamsMu.Unlock()

	// prevent subscribing multiple times on the same stream
	if _, found := s.activeStreams[streamID]; found {
		return nil
	}

	syncStream, err := s.streamCache.GetStreamWaitForLocal(ctx, streamID)
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

// OnUpdate is called each time a new cookie is available for a stream
func (s *localSyncer) sendResponse(msg *SyncStreamsResponse) {
	select {
	case <-s.syncStreamCtx.Done():
		return
	default:
		if err := s.messages.AddMessage(msg); err != nil {
			err := AsRiverError(err).
				Tag("syncId", s.globalSyncOpID).
				Tag("op", msg.GetSyncOp()).
				Func("localSyncer.sendResponse")

			_ = err.LogError(logging.FromCtx(s.syncStreamCtx))

			s.cancelGlobalSyncOp(err)
		}
	}
}
