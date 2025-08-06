package syncer

import (
	"context"
	"math"
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
// TODO: Advance sticky peer on failure.
type localStreamUpdateEmitter struct {
	// ctx is the global node context wrapped into the cancellable context.
	ctx context.Context
	// cancel is the cancel function for the context.
	cancel context.CancelCauseFunc
	// log is the logger for the emitter.
	log *logging.Log
	// localAddr is the address of the current node.
	localAddr common.Address
	// stream is the currently syncing stream.
	stream *events.Stream
	// subscribers is a set of subscribers for the stream updates.
	subscribers mapset.Set[StreamSubscriber]
	// onDown is a callback that is called when the current emitter goes down.
	// Must be NON-BLOCKING operation.
	onDown func()
}

// NewLocalStreamUpdateEmitter creates a new local stream update emitter for the given stream ID.
func NewLocalStreamUpdateEmitter(
	ctx context.Context,
	localAddr common.Address,
	streamCache StreamCache,
	streamID StreamId,
	onDown func(),
) (StreamUpdateEmitter, error) {
	ctx, cancel := context.WithCancelCause(ctx)

	ctxWithTimeout, ctxWithCancel := context.WithTimeout(ctx, localStreamUpdateEmitterTimeout)
	defer ctxWithCancel()

	// Get stream from the stream cache by ID.
	stream, err := streamCache.GetStreamWaitForLocal(ctxWithTimeout, streamID)
	if err != nil {
		return nil, err
	}

	l := &localStreamUpdateEmitter{
		ctx:         ctx,
		cancel:      cancel,
		log:         logging.FromCtx(ctx).Named("syncv3.localStreamUpdateEmitter"),
		localAddr:   localAddr,
		stream:      stream,
		subscribers: mapset.NewSet[StreamSubscriber](),
		onDown:      onDown,
	}

	ctxWithTimeout, ctxWithCancel = context.WithTimeout(ctx, localStreamUpdateEmitterTimeout)
	defer ctxWithCancel()

	// Subscribe on updates for the stream. Do not receive an initial update.
	if err = stream.Sub(ctxWithTimeout, &SyncCookie{
		StreamId:          streamID[:],
		NodeAddress:       localAddr.Bytes(),
		MinipoolGen:       math.MaxInt64,
		PrevMiniblockHash: common.Hash{}.Bytes(),
	}, l); err != nil {
		return nil, err
	}

	go l.run()

	return l, nil
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
func (s *localStreamUpdateEmitter) Subscribe(subscriber StreamSubscriber) {
	s.subscribers.Add(subscriber)
}

// Unsubscribe removes the given subscriber from the stream updates.
// The local stream update emitter does not unsubscribe from updates even if there are no subscribers left.
func (s *localStreamUpdateEmitter) Unsubscribe(subscriber StreamSubscriber) {
	s.subscribers.Remove(subscriber)
}

// Backfill requests a backfill message by the given cookie and sends the message to targetSyncID.
func (s *localStreamUpdateEmitter) Backfill(cookie *SyncCookie, targetSyncID string) error {
	ctxWithTimeout, cancel := context.WithTimeout(s.ctx, localStreamUpdateEmitterTimeout)
	defer cancel()

	return s.stream.UpdatesSinceCookie(ctxWithTimeout, cookie, func(streamAndCookie *StreamAndCookie) error {
		s.sendUpdateToSubscribers(&SyncStreamsResponse{
			SyncOp:        SyncOp_SYNC_UPDATE,
			Stream:        streamAndCookie,
			TargetSyncIds: []string{targetSyncID},
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

// run waits for the global node context to be done to close the emitter:
// 1. Wait for the context to be done.
// 2. Call the onDown callback if it is set. Basically, removing the emitter from the registry.
// 3. Unsubscribe from the stream updates.
// 4. Send the sync down message to all subscribers of the stream.
func (s *localStreamUpdateEmitter) run() {
	<-s.ctx.Done()

	if s.onDown != nil {
		s.onDown()
	}

	s.stream.Unsub(s)

	streamID := s.stream.StreamId()
	s.sendUpdateToSubscribers(&SyncStreamsResponse{SyncOp: SyncOp_SYNC_DOWN, StreamId: streamID[:]})
}
