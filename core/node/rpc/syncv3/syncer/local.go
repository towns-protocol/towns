package syncer

import (
	"context"
	"github.com/towns-protocol/towns/core/node/utils/dynmsgbuf"
	"math"
	"sync/atomic"
	"time"

	mapset "github.com/deckarep/golang-set/v2"
	"github.com/ethereum/go-ethereum/common"

	"github.com/towns-protocol/towns/core/node/events"
	"github.com/towns-protocol/towns/core/node/logging"
	. "github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/shared"
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
	// stream is the currently syncing stream.
	stream *events.Stream
	// subscribers is a set of subscribers for the stream updates.
	subscribers mapset.Set[StreamSubscriber]
	queue       *dynmsgbuf.DynamicBuffer[]
	// state is the current state of the emitter.
	state atomic.Int32
}

// NewLocalStreamUpdateEmitter creates a new local stream update emitter for the given stream ID.
func NewLocalStreamUpdateEmitter(
	ctx context.Context,
	localAddr common.Address,
	streamCache StreamCache,
	streamID StreamId,
) StreamUpdateEmitter {
	l := &localStreamUpdateEmitter{
		log:         logging.FromCtx(ctx).Named("localStreamUpdateEmitter"),
		localAddr:   localAddr,
		streamID:    streamID,
		subscribers: mapset.NewSet[StreamSubscriber](),
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
func (s *localStreamUpdateEmitter) Subscribe(subscriber StreamSubscriber) error {
	s.subscribers.Add(subscriber)
	return nil
}

// Unsubscribe removes the given subscriber from the stream updates.
// The local stream update emitter does not unsubscribe from updates even if there are no subscribers left.
func (s *localStreamUpdateEmitter) Unsubscribe(subscriber StreamSubscriber) bool {
	s.subscribers.Remove(subscriber)
	return false
}

// Backfill requests a backfill message by the given cookie and sends the message through sync IDs.
func (s *localStreamUpdateEmitter) Backfill(cookie *SyncCookie, syncIDs []string) error {
	ctxWithTimeout, cancel := context.WithTimeout(s.ctx, localStreamUpdateEmitterTimeout)
	defer cancel()

	return s.stream.UpdatesSinceCookie(ctxWithTimeout, cookie, func(streamAndCookie *StreamAndCookie) error {
		s.sendUpdateToSubscribers(&SyncStreamsResponse{
			SyncOp:        SyncOp_SYNC_UPDATE,
			Stream:        streamAndCookie,
			TargetSyncIds: syncIDs,
		})
		return nil
	})
}

// sendUpdateToSubscribers sends the given sync streams response to all subscribers of the stream.
func (s *localStreamUpdateEmitter) sendUpdateToSubscribers(msg *SyncStreamsResponse) {
	if s.subscribers.Cardinality() > 0 {
		for subscriber := range s.subscribers.Iter() {
			subscriber.OnStreamEvent(msg)
		}
	}
}

// initialize initializes the local stream update emitter.
func (s *localStreamUpdateEmitter) initialize(
	ctx context.Context,
	streamCache StreamCache,
) {
	ctx, cancel := context.WithCancelCause(ctx)

	defer func() {
		// TODO: Process pending events from the queue
	}()

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

	var msgs []any
	for {
		select {
		case <-ctx.Done():
		// TODO: Break the loop
		case _, open := <-s.queue.Wait():
			msgs = s.queue.GetBatch(msgs)

			// nil msgs indicates the buffer is closed.
			if msgs == nil {
				_ = op.rec.Send(&SyncStreamsResponse{
					SyncId: op.id,
					SyncOp: SyncOp_SYNC_CLOSE,
				})
				op.cancel(nil)
				return
			}

			// Process each message in the batch.
			// Messages must be processed in the order they were received.
			for _, msg := range msgs {
				if op.processMessage(msg) {
					return
				}
			}

			// If the client sent a close message, stop sending messages to client from the buffer.
			// In theory should not happen, but just in case.
			if !open {
				_ = op.rec.Send(&SyncStreamsResponse{
					SyncId: op.id,
					SyncOp: SyncOp_SYNC_CLOSE,
				})
				op.cancel(nil)
				return
			}
		}
	}

	// Waiting for the global context to be done.
	<-s.ctx.Done()

	// Unsubscribe from the stream updates.
	s.stream.Unsub(s)

	// Send a stream down message to all subscribers.
	s.sendUpdateToSubscribers(&SyncStreamsResponse{SyncOp: SyncOp_SYNC_DOWN, StreamId: s.streamID[:]})
}
