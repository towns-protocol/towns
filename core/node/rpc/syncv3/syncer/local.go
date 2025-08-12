package syncer

import (
	"context"
	"sync/atomic"
	"time"

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
	// stream is the current stream.
	stream *events.Stream
	// subscriber is the subscriber that receives updates from the stream.
	subscriber StreamSubscriber
	// backfillsQueue is a dynamic buffer that holds backfill requests.
	backfillsQueue *dynmsgbuf.DynamicBuffer[*backfillRequest]
	// version is the version of the current emitter.
	// It is used to indicate which version of the syncer the update is sent from to avoid sending
	// sync down message for sync operations from another version of syncer.
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
	subscriber StreamSubscriber,
	version int32,
) StreamUpdateEmitter {
	ctx, cancel := context.WithCancelCause(ctx)

	l := &localStreamUpdateEmitter{
		ctx:    ctx,
		cancel: cancel,
		log: logging.FromCtx(ctx).
			Named("syncv3.localStreamUpdateEmitter").
			With("addr", localAddr, "streamID", streamID, "version", version),
		localAddr:      localAddr,
		streamID:       streamID,
		subscriber:     subscriber,
		backfillsQueue: dynmsgbuf.NewDynamicBuffer[*backfillRequest](),
		version:        version,
	}

	// Set the current state to initializing.
	l.state.Store(streamUpdateEmitterStateInitializing)

	// Start initialization in a separate goroutine to avoid blocking the caller.
	go l.initialize(streamCache)

	return l
}

// OnUpdate implements events.SyncResultReceiver interface.
func (s *localStreamUpdateEmitter) OnUpdate(r *StreamAndCookie) {
	// The first received update should be ignored since all sync ops are starting from their own cookie.
	// After receiving the first update, the emitter is considered to be running.
	if s.state.CompareAndSwap(streamUpdateEmitterStateInitializing, streamUpdateEmitterStateRunning) {
		return
	}

	s.subscriber.OnStreamEvent(&SyncStreamsResponse{SyncOp: SyncOp_SYNC_UPDATE, Stream: r}, s.version)
}

// OnSyncError implements events.SyncResultReceiver interface.
func (s *localStreamUpdateEmitter) OnSyncError(err error) {
	s.log.Error("sync error for local stream", "error", err)
	s.cancel(err)
}

// OnStreamSyncDown implements events.SyncResultReceiver interface.
func (s *localStreamUpdateEmitter) OnStreamSyncDown(StreamId) {
	s.log.Warn("local stream sync down")
	s.cancel(nil)
}

// StreamID returns the StreamId of the stream that this emitter emits events for.
func (s *localStreamUpdateEmitter) StreamID() StreamId {
	return s.streamID
}

// Node returns the address of the stream node. This is the local node address for local streams.
func (s *localStreamUpdateEmitter) Node() common.Address {
	return s.localAddr
}

// Backfill adds the given backfill request to the queue for further processing.
func (s *localStreamUpdateEmitter) Backfill(cookie *SyncCookie, syncIDs []string) bool {
	if s.state.Load() == streamUpdateEmitterStateClosed {
		return false
	}

	err := s.backfillsQueue.AddMessage(&backfillRequest{cookie: cookie, syncIDs: syncIDs})
	if err != nil {
		s.log.Errorw("failed to add backfill request to the queue", "error", err)
		s.cancel(err)
		s.state.Store(streamUpdateEmitterStateClosed)
		return false
	}

	return true
}

// Close closes the emitter and stops receiving updates for the stream.
func (s *localStreamUpdateEmitter) Close() {
	if s.state.CompareAndSwap(streamUpdateEmitterStateRunning, streamUpdateEmitterStateClosed) {
		s.cancel(nil)
	}
}

// initialize initializes the local stream update emitter.
func (s *localStreamUpdateEmitter) initialize(streamCache StreamCache) {
	var msgs []*backfillRequest

	defer func() {
		// Updating the state to closed to indicate that the emitter is no longer active.
		s.state.Store(streamUpdateEmitterStateClosed)

		// Unsubscribe from the stream updates.
		if s.stream != nil {
			s.stream.Unsub(s)
		}

		// Send a stream down message to all active syncs of the current syncer version via event bus.
		s.subscriber.OnStreamEvent(&SyncStreamsResponse{SyncOp: SyncOp_SYNC_DOWN, StreamId: s.streamID[:]}, s.version)

		// Send a stream down message to all pending syncs, i.e. those that are waiting for backfill.
		msgs = s.backfillsQueue.GetBatch(msgs)
		for _, msg := range msgs {
			s.subscriber.OnStreamEvent(&SyncStreamsResponse{
				SyncOp:        SyncOp_SYNC_DOWN,
				StreamId:      s.streamID[:],
				TargetSyncIds: msg.syncIDs,
			}, s.version)
		}
	}()

	// Get stream from the stream cache by ID.
	ctxWithTimeout, ctxWithCancel := context.WithTimeout(s.ctx, localStreamUpdateEmitterTimeout)
	stream, err := streamCache.GetStreamWaitForLocal(ctxWithTimeout, s.streamID)
	ctxWithCancel()
	if err != nil {
		s.log.Errorw("initialization failed: failed to get stream", "error", err)
		return
	}
	s.stream = stream

	// Subscribe on updates for the stream. Do not receive an initial update.
	ctxWithTimeout, ctxWithCancel = context.WithTimeout(s.ctx, localStreamUpdateEmitterTimeout)
	err = stream.Sub(ctxWithTimeout, &SyncCookie{
		StreamId:    s.streamID[:],
		NodeAddress: s.localAddr.Bytes(),
	}, s)
	ctxWithCancel()
	if err != nil {
		s.log.Errorw("initialization failed: failed to subscribe to stream updates", "error", err)
		return
	}

	// Start processing backfill requests
	for {
		select {
		case <-s.ctx.Done():
			return
		case _, open := <-s.backfillsQueue.Wait():
			msgs = s.backfillsQueue.GetBatch(msgs)

			// nil msgs indicates the buffer is closed.
			if msgs == nil {
				s.cancel(nil)
				return
			}

			// Messages must be processed in the order they were received.
			for i, msg := range msgs {
				// Context could be cancelled while processing messages so adding one more check here.
				select {
				case <-s.ctx.Done():
					// Send unprocessed messages back to the queue for further processing by sending the down message back.
					for _, m := range msgs[i:] {
						if err = s.backfillsQueue.AddMessage(m); err != nil {
							s.log.Errorw("failed to re-add unprocessed backfill request to the queue", "cookie", m.cookie, "error", err)
						}
					}

					return
				default:
				}

				if err = s.processBackfillRequest(msg, stream); err != nil {
					s.log.Errorw("failed to process backfill request", "cookie", msg.cookie, "error", err)
					s.cancel(err)

					// Send unprocessed messages back to the queue for further processing by sending the down message back.
					for _, m := range msgs[i:] {
						if err = s.backfillsQueue.AddMessage(m); err != nil {
							s.log.Errorw("failed to re-add unprocessed backfill request to the queue", "cookie", m.cookie, "error", err)
						}
					}

					return
				}
			}

			// The queue is closed, so we can stop the emitter.
			if !open {
				s.cancel(nil)
				return
			}
		}
	}
}

// processBackfillRequest processes the given backfill request by fetching updates since the given cookie
// and sending the message back to the event bus for further forwarding to the specified sync operation.
func (s *localStreamUpdateEmitter) processBackfillRequest(msg *backfillRequest, stream *events.Stream) error {
	ctxWithTimeout, cancel := context.WithTimeout(s.ctx, localStreamUpdateEmitterTimeout)
	defer cancel()

	return stream.UpdatesSinceCookie(ctxWithTimeout, msg.cookie, func(streamAndCookie *StreamAndCookie) error {
		s.subscriber.OnStreamEvent(&SyncStreamsResponse{
			SyncOp:        SyncOp_SYNC_UPDATE,
			Stream:        streamAndCookie,
			TargetSyncIds: msg.syncIDs,
		}, s.version)
		return nil
	})
}
