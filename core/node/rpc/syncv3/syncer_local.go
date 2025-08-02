package syncv3

import (
	"context"
	"sync"

	"github.com/ethereum/go-ethereum/common"
	"github.com/puzpuzpuz/xsync/v4"
	"go.opentelemetry.io/otel/trace"

	. "github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/logging"
	. "github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/shared"
)

// localSyncer implements the Syncer interface for local sync operations.
// Used to sync local streams.
type localSyncer struct {
	// ctx is the context for the local syncer, used to cancel operations when the syncer is stopped
	ctx context.Context
	// log is the logger for the local syncer.
	log *logging.Log
	// localAddr is the address of the local node, used to identify the syncer in operations
	localAddr common.Address
	// eventBus is the event bus that processes messages.
	eventBus EventBus[EventBusMessage]
	// streamCache is the cache for retrieving streams
	streamCache StreamCache
	// activeStreams is a map of currently active streams, used to track which streams are being synced
	activeStreams *xsync.Map[StreamId, Stream]
	// otelTracer is used to trace individual sync Send operations, tracing is disabled if nil
	otelTracer trace.Tracer
}

// NewLocalSyncer creates a new local syncer instance.
func NewLocalSyncer(
	ctx context.Context,
	localAddr common.Address,
	eventBus EventBus[EventBusMessage],
	streamCache StreamCache,
	otelTracer trace.Tracer,
) Syncer {
	return &localSyncer{
		ctx:           ctx,
		log:           logging.FromCtx(ctx).Named("syncv3-syncer-local").With("addr", localAddr.Hex()),
		localAddr:     localAddr,
		eventBus:      eventBus,
		streamCache:   streamCache,
		activeStreams: xsync.NewMap[StreamId, Stream](),
		otelTracer:    otelTracer,
	}
}

// Run starts the local syncer, it should handle the local sync logic.
func (s *localSyncer) Run() {
	<-s.ctx.Done()

	s.activeStreams.Range(func(streamID StreamId, _ Stream) bool {
		s.streamUnsub(streamID)
		return true
	})
}

// ID returns the unique identifier of the local syncer.
func (s *localSyncer) ID() string {
	return "local"
}

// Address returns the address of the local syncer.
func (s *localSyncer) Address() common.Address {
	return s.localAddr
}

// Modify handles modification requests for the local syncer.
func (s *localSyncer) Modify(ctx context.Context, request *ModifySyncRequest) (*ModifySyncResponse, error) {
	var resp ModifySyncResponse
	var wg sync.WaitGroup

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

	wg.Wait()

	return &resp, nil
}

// OnUpdate is called each time by StreamView when a new cookie is available for a stream
func (s *localSyncer) OnUpdate(r *StreamAndCookie) {
	streamID, err := StreamIdFromBytes(r.GetNextSyncCookie().GetStreamId())
	if err != nil {
		s.log.Errorw("failed to parse stream id", "streamId", r.GetNextSyncCookie().GetStreamId(), "error", err)
		return
	}

	err = s.sendResponse(streamID, &SyncStreamsResponse{SyncOp: SyncOp_SYNC_UPDATE, Stream: r})
	if err != nil {
		s.streamUnsub(streamID)
	}
}

// OnSyncError is called when a sync subscription failed unrecoverable
// TODO: Specify error in the down message.
func (s *localSyncer) OnSyncError(err error) {
	s.log.Errorw("sync failed with error", "error", err)
	var errMsg string
	if err != nil {
		errMsg = err.Error()
	}

	s.activeStreams.Range(func(streamID StreamId, syncStream Stream) bool {
		err = s.sendResponse(streamID, &SyncStreamsResponse{SyncOp: SyncOp_SYNC_DOWN, StreamId: streamID[:], Message: errMsg})
		if err != nil {
			s.log.Errorw("failed to send sync down response", "streamId", streamID, "error", err)
			s.streamUnsub(streamID)
		}
		return true
	})
	s.activeStreams.Clear()
}

// OnStreamSyncDown is called when updates for a stream could not be given.
func (s *localSyncer) OnStreamSyncDown(streamID StreamId) {
	err := s.sendResponse(streamID, &SyncStreamsResponse{SyncOp: SyncOp_SYNC_DOWN, StreamId: streamID[:], Message: "stream is down"})
	if err != nil {
		s.log.Errorw("failed to send sync down response", "streamId", streamID, "error", err)
		s.streamUnsub(streamID)
	}
}

// addStream adds a stream to the local syncer, subscribing to updates from the given cookie.
// Do nothing if the stream is already syncing.
func (s *localSyncer) addStream(ctx context.Context, cookie *SyncCookie) error {
	streamID := StreamId(cookie.GetStreamId())

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

// backfillStream backfills the stream with updates since the given cookie.
// Sends the update to the appropriate client using target sync IDs.
func (s *localSyncer) backfillStream(ctx context.Context, cookie *SyncCookie, targetSyncIds []string) error {
	streamID := StreamId(cookie.GetStreamId())

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

// OnUpdate is called each time a new cookie is available for a stream
// TODO: Retry sending the message if the channel is full, or implement a backoff strategy.
func (s *localSyncer) sendResponse(streamID StreamId, msg *SyncStreamsResponse) error {
	var err error
	select {
	case <-s.ctx.Done():
		if err = s.ctx.Err(); err != nil {
			err = AsRiverError(err, Err_CANCELED)
		}
	default:
		err = s.eventBus.AddMessage(*NewEventBusMessageUpdateStream(msg))
	}
	if err != nil {
		rvrErr := AsRiverError(err).Tag("streamId", streamID).Func("localSyncer.sendResponse")
		s.log.Errorw("failed to send stream update", "streamId", streamID, "error", rvrErr)
		return rvrErr
	}
	return nil
}

// streamUnsub is called to unsubscribe from a stream.
func (s *localSyncer) streamUnsub(streamID StreamId) bool {
	syncStream, found := s.activeStreams.LoadAndDelete(streamID)
	if found {
		go syncStream.Unsub(s)
	}
	return found
}
