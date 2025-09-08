package syncer

import (
	"context"
	"sync"
	"time"

	"github.com/ethereum/go-ethereum/common"

	"github.com/towns-protocol/towns/core/node/logging"
	"github.com/towns-protocol/towns/core/node/nodes"
	. "github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/shared"
)

// sharedStreamUpdateEmitter is an implementation of the StreamUpdateEmitter interface that
// initializes either a local or remote emitter based on the stream location in a background.
// While the emitter is being initialized, backfill requests are queued in a dynamic buffer so the
// caller can immediately start processing backfills.
type sharedStreamUpdateEmitter struct {
	lock      sync.Mutex
	backfills []*backfillRequest
	emitter   StreamUpdateEmitter
	streamID  StreamId
	version   int
}

func newSharedStreamUpdateEmitter(
	ctx context.Context,
	localAddr common.Address,
	streamCache StreamCache,
	nodeRegistry nodes.NodeRegistry,
	subscriber StreamSubscriber,
	streamID StreamId,
	version int,
) *sharedStreamUpdateEmitter {
	emitter := &sharedStreamUpdateEmitter{
		backfills: make([]*backfillRequest, 0),
		streamID:  streamID,
		version:   version,
	}

	// Initialize emitter in a separate goroutine to avoid blocking caller.
	go emitter.run(ctx, localAddr, streamCache, nodeRegistry, subscriber)

	return emitter
}

func (s *sharedStreamUpdateEmitter) run(
	ctx context.Context,
	localAddr common.Address,
	streamCache StreamCache,
	nodeRegistry nodes.NodeRegistry,
	subscriber StreamSubscriber,
) {
	ctxWithTimeout, ctxWithCancel := context.WithTimeout(ctx, 20*time.Second)
	defer ctxWithCancel()

	var backfills []*backfillRequest

	stream, err := streamCache.GetStreamNoWait(ctxWithTimeout, s.streamID)
	if err != nil {
		logging.FromCtx(ctx).
			Named("newSharedStreamUpdateEmitter").
			With("version", s.version, "streamID", s.streamID, "error", err).
			Error("failed to get stream for further emitter initialization")

		s.lock.Lock()
		backfills = s.backfills
		s.backfills = nil
		s.lock.Unlock()

		for _, br := range backfills {
			subscriber.OnStreamEvent(
				&SyncStreamsResponse{SyncOp: SyncOp_SYNC_DOWN, StreamId: s.streamID[:], TargetSyncIds: br.syncIDs},
				PendingSubscribersVersion,
			)
		}
		return
	}

	var emitter StreamUpdateEmitter
	if stream.IsLocal() {
		emitter, err = NewLocalStreamUpdateEmitter(
			ctx,
			localAddr,
			streamCache,
			s.streamID,
			subscriber,
			s.version,
		)
	} else {
		emitter, err = NewRemoteStreamUpdateEmitter(
			ctx,
			stream,
			nodeRegistry,
			s.streamID,
			subscriber,
			s.version,
		)
	}
	if err != nil {
		logging.FromCtx(ctx).
			Named("newSharedStreamUpdateEmitter").
			With("version", s.version, "streamID", s.streamID, "error", err).
			Error("failed to create stream updates emitter")

		s.lock.Lock()
		backfills = s.backfills
		s.backfills = nil
		s.lock.Unlock()

		for _, br := range backfills {
			subscriber.OnStreamEvent(
				&SyncStreamsResponse{SyncOp: SyncOp_SYNC_DOWN, StreamId: s.streamID[:], TargetSyncIds: br.syncIDs},
				PendingSubscribersVersion,
			)
		}
		return
	}

	s.lock.Lock()
	s.emitter = emitter
	backfills = s.backfills
	s.backfills = nil
	s.lock.Unlock()

	for _, br := range backfills {
		if !s.emitter.EnqueueBackfill(br.cookie, br.syncIDs) {
			subscriber.OnStreamEvent(
				&SyncStreamsResponse{SyncOp: SyncOp_SYNC_DOWN, StreamId: s.streamID[:], TargetSyncIds: br.syncIDs},
				PendingSubscribersVersion,
			)
		}
	}
}

func (s *sharedStreamUpdateEmitter) StreamID() StreamId {
	return s.streamID
}

func (s *sharedStreamUpdateEmitter) Node() common.Address {
	if s.emitter != nil {
		return s.emitter.Node()
	}

	return common.Address{}
}

func (s *sharedStreamUpdateEmitter) Version() int {
	return s.version
}

func (s *sharedStreamUpdateEmitter) EnqueueBackfill(cookie *SyncCookie, syncIDs []string) bool {
	s.lock.Lock()
	defer s.lock.Unlock()

	if s.emitter != nil {
		return s.emitter.EnqueueBackfill(cookie, syncIDs)
	}

	if s.backfills == nil {
		return false
	}

	s.backfills = append(s.backfills, &backfillRequest{
		cookie:  cookie,
		syncIDs: syncIDs,
	})

	return true
}

func (s *sharedStreamUpdateEmitter) Close() {
	if s.emitter != nil {
		s.emitter.Close()
	}
}
