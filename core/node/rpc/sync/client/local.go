package client

import (
	"context"
	"sync"

	"github.com/ethereum/go-ethereum/common"
	"github.com/linkdata/deadlock"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/trace"

	. "github.com/towns-protocol/towns/core/node/base"
	. "github.com/towns-protocol/towns/core/node/events"
	"github.com/towns-protocol/towns/core/node/logging"
	. "github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/rpc/sync/dynmsgbuf"
	. "github.com/towns-protocol/towns/core/node/shared"
)

type localSyncer struct {
	globalCtx context.Context

	streamCache *StreamCache
	messages    *dynmsgbuf.DynamicBuffer[*SyncStreamsResponse]
	localAddr   common.Address

	activeStreamsMu deadlock.Mutex
	activeStreams   map[StreamId]*Stream

	// otelTracer is used to trace individual sync Send operations, tracing is disabled if nil
	otelTracer trace.Tracer
}

func newLocalSyncer(
	globalCtx context.Context,
	localAddr common.Address,
	streamCache *StreamCache,
	messages *dynmsgbuf.DynamicBuffer[*SyncStreamsResponse],
	otelTracer trace.Tracer,
) *localSyncer {
	return &localSyncer{
		globalCtx:     globalCtx,
		streamCache:   streamCache,
		localAddr:     localAddr,
		messages:      messages,
		activeStreams: make(map[StreamId]*Stream),
		otelTracer:    otelTracer,
	}
}

func (s *localSyncer) Run() {
	<-s.globalCtx.Done()

	s.activeStreamsMu.Lock()
	for streamID, syncStream := range s.activeStreams {
		syncStream.Unsub(s)
		delete(s.activeStreams, streamID)
	}
	s.activeStreamsMu.Unlock()
}

func (s *localSyncer) Address() common.Address {
	return s.localAddr
}

func (s *localSyncer) Modify(ctx context.Context, request *ModifySyncRequest) (*ModifySyncResponse, bool, error) {
	if s.otelTracer != nil {
		var span trace.Span
		ctx, span = s.otelTracer.Start(ctx, "localSyncer::modify",
			trace.WithAttributes(
				attribute.Int("toBackfill", len(request.GetBackfillStreams().GetStreams())),
				attribute.Int("toAdd", len(request.GetAddStreams())),
				attribute.Int("toRemove", len(request.GetRemoveStreams()))))
		defer span.End()
	}

	var resp ModifySyncResponse
	var backfillsLock sync.Mutex
	var addsLock sync.Mutex
	var wg sync.WaitGroup

	for _, cookie := range request.GetBackfillStreams().GetStreams() {
		wg.Add(1)
		go func(cookie *SyncCookie) {
			defer wg.Done()

			if err := s.backfillStream(ctx, cookie, request.TargetSyncIDs()); err != nil {
				rvrErr := AsRiverError(err)
				backfillsLock.Lock()
				resp.Backfills = append(resp.Backfills, &SyncStreamOpStatus{
					StreamId: cookie.GetStreamId(),
					Code:     int32(rvrErr.Code),
					Message:  rvrErr.GetMessage(),
				})
				backfillsLock.Unlock()
			}
		}(cookie)
	}

	for _, cookie := range request.GetAddStreams() {
		if err := s.addStream(ctx, cookie); err != nil {
			rvrErr := AsRiverError(err)
			addsLock.Lock()
			resp.Adds = append(resp.Adds, &SyncStreamOpStatus{
				StreamId: cookie.GetStreamId(),
				Code:     int32(rvrErr.Code),
				Message:  rvrErr.GetMessage(),
			})
			addsLock.Unlock()
		}
	}

	if len(request.GetRemoveStreams()) > 0 {
		s.activeStreamsMu.Lock()
		for _, streamID := range request.GetRemoveStreams() {
			syncStream, found := s.activeStreams[StreamId(streamID)]
			if found {
				go syncStream.Unsub(s)
				delete(s.activeStreams, StreamId(streamID))
			}
		}
		s.activeStreamsMu.Unlock()
	}

	wg.Wait()

	// TODO: Remove the second argument after the legacy client is removed
	return &resp, false, nil
}

// OnUpdate is called each time a new cookie is available for a stream
func (s *localSyncer) OnUpdate(r *StreamAndCookie) {
	s.sendResponse(&SyncStreamsResponse{SyncOp: SyncOp_SYNC_UPDATE, Stream: r})
}

// OnSyncError is called when a sync subscription failed unrecoverable
func (s *localSyncer) OnSyncError(error) {
	s.activeStreamsMu.Lock()
	for streamID, syncStream := range s.activeStreams {
		go syncStream.Unsub(s)
		delete(s.activeStreams, streamID)
		s.OnStreamSyncDown(streamID)
	}
	s.activeStreamsMu.Unlock()
}

// OnStreamSyncDown is called when updates for a stream could not be given.
func (s *localSyncer) OnStreamSyncDown(streamID StreamId) {
	s.sendResponse(&SyncStreamsResponse{SyncOp: SyncOp_SYNC_DOWN, StreamId: streamID[:]})
}

func (s *localSyncer) backfillStream(ctx context.Context, cookie *SyncCookie, targetSyncIds []string) error {
	streamID := StreamId(cookie.GetStreamId())

	if s.otelTracer != nil {
		var span trace.Span
		ctx, span = s.otelTracer.Start(ctx, "localSyncer::backfillStream",
			trace.WithAttributes(attribute.String("streamID", streamID.String())),
			trace.WithAttributes(attribute.StringSlice("targetSyncIds", targetSyncIds)))
		defer span.End()
	}

	stream, err := s.streamCache.GetStreamNoWait(ctx, streamID)
	if err != nil {
		return err
	}

	return stream.UpdatesSinceCookie(ctx, cookie, func(streamAndCookie *StreamAndCookie) {
		s.sendResponse(&SyncStreamsResponse{
			SyncOp:        SyncOp_SYNC_UPDATE,
			Stream:        streamAndCookie,
			TargetSyncIds: targetSyncIds,
		})
	})
}

func (s *localSyncer) addStream(ctx context.Context, cookie *SyncCookie) error {
	streamID := StreamId(cookie.GetStreamId())

	if s.otelTracer != nil {
		var span trace.Span
		ctx, span = s.otelTracer.Start(ctx, "localSyncer::addStream",
			trace.WithAttributes(attribute.String("streamID", streamID.String())))
		defer span.End()
	}

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

	if err = syncStream.Sub(ctx, cookie, s); err != nil {
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
	case <-s.globalCtx.Done():
		return
	default:
		if err := s.messages.AddMessage(msg); err != nil {
			rvrErr := AsRiverError(err).
				Tag("op", msg.GetSyncOp()).
				Func("localSyncer.sendResponse")
			_ = rvrErr.LogError(logging.FromCtx(s.globalCtx))
			s.OnSyncError(err)
		}
	}
}
