package client

import (
	"context"
	"sync"

	"github.com/ethereum/go-ethereum/common"
	"github.com/puzpuzpuz/xsync/v4"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/trace"

	. "github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/logging"
	. "github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/shared"
)

type localSyncer struct {
	globalCtx context.Context

	streamCache        StreamCache
	messageDistributor MessageDistributor
	localAddr          common.Address
	unsubStream        func(streamID StreamId)
	activeStreams      *xsync.Map[StreamId, Stream]

	// otelTracer is used to trace individual sync Send operations, tracing is disabled if nil
	otelTracer trace.Tracer
}

func newLocalSyncer(
	globalCtx context.Context,
	localAddr common.Address,
	streamCache StreamCache,
	messageDistributor MessageDistributor,
	unsubStream func(streamID StreamId),
	otelTracer trace.Tracer,
) *localSyncer {
	return &localSyncer{
		globalCtx:          globalCtx,
		streamCache:        streamCache,
		localAddr:          localAddr,
		messageDistributor: messageDistributor,
		unsubStream:        unsubStream,
		activeStreams:      xsync.NewMap[StreamId, Stream](),
		otelTracer:         otelTracer,
	}
}

func (s *localSyncer) Run() {
	<-s.globalCtx.Done()

	s.activeStreams.Range(func(streamID StreamId, _ Stream) bool {
		s.streamUnsub(streamID)
		return true
	})
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
	var wg sync.WaitGroup

	if toBackfill := request.GetBackfillStreams().GetStreams(); len(toBackfill) > 0 {
		var backfillsLock sync.Mutex
		wg.Add(len(toBackfill))
		for _, cookie := range toBackfill {
			go func(cookie *SyncCookie) {
				defer wg.Done()

				if err := s.backfillStream(ctx, cookie, request.TargetSyncIDs()); err != nil {
					rvrErr := AsRiverError(err)
					backfillsLock.Lock()
					resp.Backfills = append(resp.Backfills, &SyncStreamOpStatus{
						StreamId:    cookie.GetStreamId(),
						Code:        int32(rvrErr.Code),
						Message:     rvrErr.GetMessage(),
						NodeAddress: s.localAddr.Bytes(),
					})
					backfillsLock.Unlock()
				}
			}(cookie)
		}
	}

	if adds := request.GetAddStreams(); len(adds) > 0 {
		var addsLock sync.Mutex
		wg.Add(len(adds))
		for _, cookie := range adds {
			go func(cookie *SyncCookie) {
				defer wg.Done()

				if err := s.addStream(ctx, cookie); err != nil {
					rvrErr := AsRiverError(err)
					addsLock.Lock()
					resp.Adds = append(resp.Adds, &SyncStreamOpStatus{
						StreamId:    cookie.GetStreamId(),
						Code:        int32(rvrErr.Code),
						Message:     rvrErr.GetMessage(),
						NodeAddress: s.localAddr.Bytes(),
					})
					addsLock.Unlock()
				}
			}(cookie)
		}
	}

	for _, streamID := range request.GetRemoveStreams() {
		s.streamUnsub(StreamId(streamID))
	}

	wg.Wait()

	// TODO: Remove the second argument after the legacy client is removed
	return &resp, false, nil
}

// DebugDropStream is called to drop a stream from the syncer.
func (s *localSyncer) DebugDropStream(_ context.Context, streamID StreamId) (bool, error) {
	if s.streamUnsub(streamID) {
		return false, s.sendResponse(streamID, &SyncStreamsResponse{SyncOp: SyncOp_SYNC_DOWN, StreamId: streamID[:]})
	}

	return false, RiverError(Err_NOT_FOUND, "stream not found").Tag("stream", streamID)
}

// OnUpdate is called each time a new cookie is available for a stream
func (s *localSyncer) OnUpdate(r *StreamAndCookie) {
	streamID, err := StreamIdFromBytes(r.GetNextSyncCookie().GetStreamId())
	if err != nil {
		logging.FromCtx(s.globalCtx).Errorw("failed to get stream id", "stream", r.GetNextSyncCookie().GetStreamId(), "error", err)
		return
	}

	if err = s.sendResponse(streamID, &SyncStreamsResponse{SyncOp: SyncOp_SYNC_UPDATE, Stream: r}); err != nil {
		s.streamUnsub(streamID)
	}
}

// OnSyncError is called when a sync subscription failed unrecoverable
func (s *localSyncer) OnSyncError(error) {
	s.activeStreams.Range(func(streamID StreamId, syncStream Stream) bool {
		s.OnStreamSyncDown(streamID)
		return true
	})
	s.activeStreams.Clear()
}

// OnStreamSyncDown is called when updates for a stream could not be given.
func (s *localSyncer) OnStreamSyncDown(streamID StreamId) {
	if err := s.sendResponse(streamID, &SyncStreamsResponse{SyncOp: SyncOp_SYNC_DOWN, StreamId: streamID[:]}); err != nil {
		s.streamUnsub(streamID)
	}
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

	stream, err := s.streamCache.GetStreamWaitForLocal(ctx, streamID)
	if err != nil {
		return err
	}

	return stream.UpdatesSinceCookie(ctx, cookie, func(streamAndCookie *StreamAndCookie) error {
		return s.sendResponse(streamID, &SyncStreamsResponse{
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

	var err error
	s.activeStreams.LoadOrCompute(
		streamID,
		func() (Stream, bool) {
			var syncStream Stream
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

// OnUpdate is called each time a new cookie is available for a stream
func (s *localSyncer) sendResponse(streamID StreamId, msg *SyncStreamsResponse) error {
	select {
	case <-s.globalCtx.Done():
		if err := s.globalCtx.Err(); err != nil {
			rvrErr := AsRiverError(err, Err_CANCELED).
				Func("localSyncer.sendResponse")
			_ = rvrErr.LogError(logging.FromCtx(s.globalCtx))
			return rvrErr
		}
		return nil
	default:
	}

	if len(msg.GetTargetSyncIds()) > 0 {
		s.messageDistributor.DistributeBackfillMessage(streamID, msg)
	} else {
		s.messageDistributor.DistributeMessage(streamID, msg)
	}

	return nil
}

// streamUnsub is called to unsubscribe from a stream.
func (s *localSyncer) streamUnsub(streamID StreamId) bool {
	syncStream, found := s.activeStreams.LoadAndDelete(streamID)
	if found {
		go syncStream.Unsub(s)
		s.unsubStream(syncStream.StreamId())
	}
	return found
}
