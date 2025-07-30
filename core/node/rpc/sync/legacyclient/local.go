package legacyclient

import (
	"context"

	"github.com/ethereum/go-ethereum/common"
	"github.com/puzpuzpuz/xsync/v4"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/trace"

	. "github.com/towns-protocol/towns/core/node/base"
	. "github.com/towns-protocol/towns/core/node/events"
	"github.com/towns-protocol/towns/core/node/logging"
	. "github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/utils/dynmsgbuf"
)

type localSyncer struct {
	globalSyncOpID string

	syncStreamCtx      context.Context
	cancelGlobalSyncOp context.CancelCauseFunc

	streamCache   *StreamCache
	messages      *dynmsgbuf.DynamicBuffer[*SyncStreamsResponse]
	localAddr     common.Address
	activeStreams *xsync.Map[StreamId, *Stream]

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
		activeStreams:      xsync.NewMap[StreamId, *Stream](),
		otelTracer:         otelTracer,
	}
}

func (s *localSyncer) Run() {
	<-s.syncStreamCtx.Done()

	s.activeStreams.Range(func(streamID StreamId, syncStream *Stream) bool {
		syncStream.Unsub(s)
		return true
	})
}

func (s *localSyncer) Address() common.Address {
	return s.localAddr
}

func (s *localSyncer) Modify(ctx context.Context, request *ModifySyncRequest) (*ModifySyncResponse, bool, error) {
	if s.otelTracer != nil {
		var span trace.Span
		ctx, span = s.otelTracer.Start(ctx, "legacyLocalSyncer::modify",
			trace.WithAttributes(
				attribute.Int("toBackfill", len(request.GetBackfillStreams().GetStreams())),
				attribute.Int("toAdd", len(request.GetAddStreams())),
				attribute.Int("toRemove", len(request.GetRemoveStreams()))))
		defer span.End()
	}

	var resp ModifySyncResponse

	for _, cookie := range request.GetAddStreams() {
		if err := s.addStream(ctx, cookie); err != nil {
			rvrErr := AsRiverError(err)
			resp.Adds = append(resp.Adds, &SyncStreamOpStatus{
				StreamId: cookie.GetStreamId(),
				Code:     int32(rvrErr.Code),
				Message:  rvrErr.GetMessage(),
			})
		}
	}

	for _, streamID := range request.GetRemoveStreams() {
		syncStream, found := s.activeStreams.LoadAndDelete(StreamId(streamID))
		if found {
			syncStream.Unsub(s)
		}
	}

	return &resp, s.activeStreams.Size() == 0, nil
}

// OnUpdate is called each time a new cookie is available for a stream
func (s *localSyncer) OnUpdate(r *StreamAndCookie) {
	s.sendResponse(&SyncStreamsResponse{SyncOp: SyncOp_SYNC_UPDATE, Stream: r})
}

// OnSyncError is called when a sync subscription failed unrecoverable
func (s *localSyncer) OnSyncError(error) {
	s.activeStreams.Range(func(streamID StreamId, syncStream *Stream) bool {
		syncStream.Unsub(s)
		s.OnStreamSyncDown(streamID)
		return true
	})
	s.activeStreams.Clear()
}

// OnStreamSyncDown is called when updates for a stream could not be given.
func (s *localSyncer) OnStreamSyncDown(streamID StreamId) {
	s.sendResponse(&SyncStreamsResponse{SyncOp: SyncOp_SYNC_DOWN, StreamId: streamID[:]})
}

func (s *localSyncer) addStream(ctx context.Context, cookie *SyncCookie) error {
	streamID := StreamId(cookie.GetStreamId())

	if s.otelTracer != nil {
		var span trace.Span
		ctx, span = s.otelTracer.Start(ctx, "legacyLocalSyncer::addStream",
			trace.WithAttributes(attribute.String("streamID", streamID.String())))
		defer span.End()
	}

	var err error
	s.activeStreams.LoadOrCompute(
		streamID,
		func() (*Stream, bool) {
			var syncStream *Stream
			if syncStream, err = s.streamCache.GetStreamWaitForLocal(ctx, streamID); err != nil {
				return nil, true
			}

			if err = syncStream.Sub(ctx, cookie, s); err != nil {
				return nil, true
			}

			return syncStream, false
		},
	)
	return err
}

func (s *localSyncer) DebugDropStream(_ context.Context, streamID StreamId) (bool, error) {
	syncStream, found := s.activeStreams.LoadAndDelete(streamID)
	if found {
		syncStream.Unsub(s)
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
				Func("legacyLocalSyncer.sendResponse")

			_ = err.LogError(logging.FromCtx(s.syncStreamCtx))

			s.cancelGlobalSyncOp(err)
		}
	}
}
