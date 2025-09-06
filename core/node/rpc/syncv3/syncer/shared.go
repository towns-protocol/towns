package syncer

import (
	"context"
	"time"

	"github.com/ethereum/go-ethereum/common"

	"github.com/towns-protocol/towns/core/node/logging"
	"github.com/towns-protocol/towns/core/node/nodes"
	. "github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/utils/dynmsgbuf"
)

// sharedStreamUpdateEmitter is an implementation of the StreamUpdateEmitter interface that
// initializes either a local or remote emitter based on the stream location in a background.
// While the emitter is being initialized, backfill requests are queued in a dynamic buffer so the
// caller can immediately start processing backfills.
type sharedStreamUpdateEmitter struct {
	// backfillsQueue is a dynamic buffer that holds backfill requests until the emitter is initialized.
	backfillsQueue *dynmsgbuf.DynamicBuffer[*backfillRequest]
	streamID       StreamId
	version        int32
	// emitter is the actual emitter that is initialized in the background.
	emitter StreamUpdateEmitter
}

func newSharedStreamUpdateEmitter(
	ctx context.Context,
	localAddr common.Address,
	streamCache StreamCache,
	nodeRegistry nodes.NodeRegistry,
	subscriber StreamSubscriber,
	streamID StreamId,
	version int32,
) *sharedStreamUpdateEmitter {
	emitter := &sharedStreamUpdateEmitter{
		backfillsQueue: dynmsgbuf.NewDynamicBuffer[*backfillRequest](),
		streamID:       streamID,
		version:        version,
	}

	// Initialize emitter in a separate goroutine to avoid blocking caller.
	go func() {
		ctxWithTimeout, ctxWithCancel := context.WithTimeout(ctx, 20*time.Second)
		defer ctxWithCancel()

		stream, err := streamCache.GetStreamNoWait(ctxWithTimeout, streamID)
		if err != nil {
			logging.FromCtx(ctx).
				Named("newSharedStreamUpdateEmitter").
				With("version", version, "streamID", streamID, "error", err).
				Error("failed to get stream for further emitter initialization")

			pendingBackfills := emitter.backfillsQueue.Close()
			for _, br := range pendingBackfills {
				subscriber.OnStreamEvent(
					&SyncStreamsResponse{SyncOp: SyncOp_SYNC_DOWN, StreamId: streamID[:], TargetSyncIds: br.syncIDs},
					0,
				)
			}
			return
		}

		if stream.IsLocal() {
			emitter.emitter = NewLocalStreamUpdateEmitter(
				ctx,
				localAddr,
				streamCache,
				streamID,
				subscriber,
				version,
			)
		} else {
			emitter.emitter = NewRemoteStreamUpdateEmitter(
				ctx,
				stream,
				nodeRegistry,
				streamID,
				subscriber,
				version,
			)
		}

		// Pending backfill requests have to be processed after successful emitter creation.
		pendingBackfills := emitter.backfillsQueue.Close()
		for _, br := range pendingBackfills {
			if !emitter.emitter.Backfill(br.cookie, br.syncIDs) {
				subscriber.OnStreamEvent(
					&SyncStreamsResponse{SyncOp: SyncOp_SYNC_DOWN, StreamId: streamID[:], TargetSyncIds: br.syncIDs},
					0,
				)
			}
		}
	}()

	return emitter
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

func (s *sharedStreamUpdateEmitter) Version() int32 {
	return s.version
}

func (s *sharedStreamUpdateEmitter) Backfill(cookie *SyncCookie, syncIDs []string) bool {
	if s.emitter != nil {
		return s.emitter.Backfill(cookie, syncIDs)
	}

	err := s.backfillsQueue.AddMessage(&backfillRequest{cookie: cookie, syncIDs: syncIDs})
	if err != nil {
		// Cannot add a message to the queue: buffer is full or closed due to emitter initialization error.
		// TODO: implement a proper behavior when a message buffer gets full before the emitter is initialized.
		return false
	}

	return true
}

func (s *sharedStreamUpdateEmitter) Close() {
	if s.emitter != nil {
		s.emitter.Close()
	}
}
