package syncer

import (
	"context"
	"math"
	"sync/atomic"
	"time"

	mapset "github.com/deckarep/golang-set/v2"
	"github.com/ethereum/go-ethereum/common"

	"github.com/towns-protocol/towns/core/node/events"
	"github.com/towns-protocol/towns/core/node/logging"
	. "github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/utils/dynmsgbuf"
)

const (
	// localStreamUpdateEmitterTimeout is the default timeout to get updates from the local stream.
	localStreamUpdateEmitterTimeout = time.Second * 10
)

type backfillRequest struct {
	cookie  *SyncCookie
	syncIDs []string
}

// localStreamUpdateEmitter is an implementation of the StreamUpdateEmitter interface that emits updates for a local stream.
type localStreamUpdateEmitter struct {
	// ctx is the global node context wrapped into the cancellable context.
	ctx context.Context
	// cancel is the cancel function for the context.
	cancel context.CancelCauseFunc
	// log is the logger for the emitter.
	log *logging.Log
	// localAddr is the address of the current node.
	localAddr common.Address
	// streamID is the ID of the stream that this emitter emits updates for.
	streamID StreamId
	// stream is the currently syncing stream.
	stream *events.Stream
	// subscribers is a set of subscribers for the stream updates.
	subscribers mapset.Set[StreamSubscriber]
	// backfillsQueue is a dynamic buffer that holds backfill requests.
	backfillsQueue *dynmsgbuf.DynamicBuffer[*backfillRequest]
	// version is the version of the current emitter.
	version int32
	// state is the current state of the emitter.
	state atomic.Int32
}

// NewLocalStreamUpdateEmitter creates a new local stream update emitter for the given stream ID.
func NewLocalStreamUpdateEmitter(
	ctx context.Context,
	localAddr common.Address,
	streamCache StreamCache,
	streamID StreamId,
	version int32,
) StreamUpdateEmitter {
	l := &localStreamUpdateEmitter{
		log:            logging.FromCtx(ctx).Named("localStreamUpdateEmitter"),
		localAddr:      localAddr,
		streamID:       streamID,
		subscribers:    mapset.NewSet[StreamSubscriber](),
		backfillsQueue: dynmsgbuf.NewDynamicBuffer[*backfillRequest](),
		version:        version,
	}

	// Set the current state to initializing.
	l.state.Store(streamUpdateEmitterStateInitializing)

	// Start initialization in a separate goroutine to avoid blocking the caller.
	go l.initialize(ctx, streamCache)

	return l
}

// OnUpdate implements events.SyncResultReceiver interface.
func (s *localStreamUpdateEmitter) OnUpdate(r *StreamAndCookie) {
	s.sendUpdateToSubscribers(&SyncStreamsResponse{SyncOp: SyncOp_SYNC_UPDATE, Stream: r})
}

// OnSyncError implements events.SyncResultReceiver interface.
func (s *localStreamUpdateEmitter) OnSyncError(err error) {
	s.log.Error("sync error for local stream", "streamID", s.stream.StreamId(), "error", err)
	s.cancel(err)
}

// OnStreamSyncDown implements events.SyncResultReceiver interface.
func (s *localStreamUpdateEmitter) OnStreamSyncDown(StreamId) {
	s.log.Warnw("local stream sync down", "streamID", s.stream.StreamId())
	s.cancel(nil)
}

// StreamID returns the StreamId of the stream that this emitter emits events for.
func (s *localStreamUpdateEmitter) StreamID() StreamId {
	return s.stream.StreamId()
}

// Node returns the address of the stream node. This is the local node address for local streams.
func (s *localStreamUpdateEmitter) Node() common.Address {
	return s.localAddr
}

// Subscribe adds the given subscriber to the stream updates.
//
// If the emitter is closed, it returns false. This indicates that the subscriber
// will not receive any updates from this emitter so a new one should be created.
func (s *localStreamUpdateEmitter) Subscribe(subscriber StreamSubscriber) bool {
	if s.state.Load() == streamUpdateEmitterStateClosed {
		return false
	}
	s.subscribers.Add(subscriber)
	return true
}

// Unsubscribe removes the given subscriber from the stream updates.
//
// TODO: Do we really need to let registry unsubscribe from the stream?
func (s *localStreamUpdateEmitter) Unsubscribe(subscriber StreamSubscriber) bool {
	s.subscribers.Remove(subscriber)
	return false
}

// Backfill adds the given backfill request to the queue for further processing.
func (s *localStreamUpdateEmitter) Backfill(cookie *SyncCookie, syncIDs []string) bool {
	if s.state.Load() == streamUpdateEmitterStateClosed {
		return false
	}

	err := s.backfillsQueue.AddMessage(&backfillRequest{cookie: cookie, syncIDs: syncIDs})
	if err != nil {
		s.log.Errorw("failed to add backfill request to the queue",
			"streamID", s.streamID, "error", err)
		s.cancel(err)
		s.state.Store(streamUpdateEmitterStateClosed)
		return false
	}

	return true
}

// sendUpdateToSubscribers sends the given sync streams response to all subscribers of the stream.
func (s *localStreamUpdateEmitter) sendUpdateToSubscribers(msg *SyncStreamsResponse) {
	if s.subscribers.Cardinality() > 0 {
		for subscriber := range s.subscribers.Iter() {
			subscriber.OnStreamEvent(msg, s.version)
		}
	}
}

// initialize initializes the local stream update emitter.
func (s *localStreamUpdateEmitter) initialize(
	ctx context.Context,
	streamCache StreamCache,
) {
	ctx, cancel := context.WithCancelCause(ctx)

	ctxWithTimeout, ctxWithCancel := context.WithTimeout(ctx, localStreamUpdateEmitterTimeout)
	defer ctxWithCancel()

	// Get stream from the stream cache by ID.
	stream, err := streamCache.GetStreamWaitForLocal(ctxWithTimeout, s.streamID)
	if err != nil {
		s.log.Errorw("initialization failed: failed to get stream",
			"streamID", s.streamID, "error", err)
		s.state.Store(streamUpdateEmitterStateClosed)
		return
	}

	s.ctx = ctx
	s.cancel = cancel
	s.stream = stream

	ctxWithTimeout, ctxWithCancel = context.WithTimeout(ctx, localStreamUpdateEmitterTimeout)
	defer ctxWithCancel()

	// Subscribe on updates for the stream. Do not receive an initial update.
	if err = stream.Sub(ctxWithTimeout, &SyncCookie{
		StreamId:          s.streamID[:],
		NodeAddress:       s.localAddr.Bytes(),
		MinipoolGen:       math.MaxInt64,
		PrevMiniblockHash: common.Hash{}.Bytes(),
	}, s); err != nil {
		s.log.Errorw("initialization failed: failed to subscribe to stream updates",
			"streamID", s.streamID, "error", err)
		s.state.Store(streamUpdateEmitterStateClosed)
		return
	}

	// Start processing backfill requests
	var msgs []*backfillRequest
	for {
		select {
		case <-ctx.Done():
			s.state.Store(streamUpdateEmitterStateClosed)
			break
		case _, open := <-s.backfillsQueue.Wait():
			msgs = s.backfillsQueue.GetBatch(msgs)

			// nil msgs indicates the buffer is closed.
			if msgs == nil {
				s.cancel(nil)
				s.state.Store(streamUpdateEmitterStateClosed)
				break
			}

			// Process each message in the batch.
			// Messages must be processed in the order they were received.
			for _, msg := range msgs {
				if err = s.processBackfillRequest(msg); err != nil {
					s.log.Errorw("failed to process backfill request",
						"streamID", s.streamID, "cookie", msg.cookie, "error", err)
					s.cancel(err)
					s.state.Store(streamUpdateEmitterStateClosed)
					break
				}
			}

			// The queue is closed, so we can stop the emitter.
			if !open {
				s.cancel(nil)
				s.state.Store(streamUpdateEmitterStateClosed)
				break
			}
		}

		if s.state.Load() == streamUpdateEmitterStateClosed {
			break
		}
	}

	// Unsubscribe from the stream updates.
	s.stream.Unsub(s)

	// Send a stream down message to all subscribers.
	s.sendUpdateToSubscribers(&SyncStreamsResponse{SyncOp: SyncOp_SYNC_DOWN, StreamId: s.streamID[:]})
}

// processBackfillRequest processes the given backfill request by fetching updates since the given cookie
// and sending the message back to the specified sync.
//
// It returns false if the process is failed, which indicates that the emitter should be closed.
func (s *localStreamUpdateEmitter) processBackfillRequest(msg *backfillRequest) error {
	ctxWithTimeout, cancel := context.WithTimeout(s.ctx, localStreamUpdateEmitterTimeout)
	defer cancel()

	return s.stream.UpdatesSinceCookie(ctxWithTimeout, msg.cookie, func(streamAndCookie *StreamAndCookie) error {
		s.sendUpdateToSubscribers(&SyncStreamsResponse{
			SyncOp:        SyncOp_SYNC_UPDATE,
			Stream:        streamAndCookie,
			TargetSyncIds: msg.syncIDs,
		})
		return nil
	})
}
