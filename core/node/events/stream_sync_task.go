package events

import (
	"context"

	"github.com/ethereum/go-ethereum/common"
	"github.com/gammazero/workerpool"

	. "github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/logging"
	. "github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/registries"
)

type reconcileTask struct {
	inProgress   *registries.GetStreamResult
	next         *registries.GetStreamResult
	getNewRecord bool
	stream       *Stream
}

func (s *StreamCache) SubmitSyncStreamTask(
	ctx context.Context,
	stream *Stream,
	streamRecord *registries.GetStreamResult,
) {
	// TODO: REPLICATION: remove context from params and refactor to use default server context
	ctx = context.WithoutCancel(ctx)

	s.stoppedMu.RLock()
	defer s.stoppedMu.RUnlock()

	if !s.stopped {
		s.submitSyncStreamTaskToPool(ctx, s.onlineSyncWorkerPool, stream, streamRecord)
	}
}

func (s *StreamCache) submitSyncStreamTaskToPool(
	ctx context.Context,
	pool *workerpool.WorkerPool,
	stream *Stream,
	streamRecord *registries.GetStreamResult,
) {
	task, loaded := s.scheduledReconciliationTasks.Compute(stream.streamId, func(oldValue *reconcileTask, loaded bool) (*reconcileTask, bool) {
		if loaded {
			return oldValue, false
		}

		return &reconcileTask{
			inProgress:   streamRecord,
			getNewRecord: streamRecord == nil,
			stream:       stream,
		}
	})
	task, exists := s.scheduledReconciliationTasks.Load(stream.streamId)
	if s.onlineSyncStreamTasksInProgress.Add(stream.StreamId()) {
		pool.Submit(func() {
			s.syncStreamFromPeers(ctx, stream, streamRecord)
			s.onlineSyncStreamTasksInProgressMu.Lock()
			s.onlineSyncStreamTasksInProgress.Remove(stream.StreamId())
			s.onlineSyncStreamTasksInProgressMu.Unlock()
		})
	}
}

func (s *StreamCache) syncStreamFromPeers(
	ctx context.Context,
	stream *Stream,
	streamRecord *registries.GetStreamResult,
) {
	var err error
	if streamRecord == nil {
		streamRecord, err = s.params.Registry.GetStreamOnLatestBlock(ctx, stream.streamId)
		if err != nil {
			logging.FromCtx(ctx).
				Errorw("syncStreamFromPeers:Unable to get stream record",
					"stream", stream.streamId,
					"error", err)
			return
		}
	}

	err = s.syncStreamFromPeersImpl(ctx, stream, streamRecord)
	if err != nil {
		logging.FromCtx(ctx).
			Errorw("syncStreamFromPeers: Unable to sync stream from peers",
				"stream", stream.streamId,
				"error", err,
				"streamRecord", streamRecord)
	}
}

// syncStreamFromPeersImpl syncs the database for the given streamResult by fetching missing blocks from peers
// participating in the stream.
// TODO: change. It is assumed that stream is already in the local DB and only miniblocks maybe in the need of syncing.
func (s *StreamCache) syncStreamFromPeersImpl(
	ctx context.Context,
	stream *Stream,
	streamRecord *registries.GetStreamResult,
) error {
	// TODO: double check if this is correct to normalize here
	// Try to normalize the given stream if needed.
	err := s.normalizeEphemeralStream(ctx, stream, int64(streamRecord.LastMiniblockNum), streamRecord.IsSealed)
	if err != nil {
		return err
	}

	lastMiniblockNum, err := stream.getLastMiniblockNumSkipLoad(ctx)
	if err != nil {
		if IsRiverErrorCode(err, Err_NOT_FOUND) {
			lastMiniblockNum = -1
		} else {
			return err
		}
	}

	if int64(streamRecord.LastMiniblockNum) <= lastMiniblockNum {
		return nil
	}

	fromInclusive := lastMiniblockNum + 1
	toExclusive := int64(streamRecord.LastMiniblockNum) + 1

	remotes, _ := stream.GetRemotesAndIsLocal()
	if len(remotes) == 0 {
		return RiverError(Err_UNAVAILABLE, "Stream has no remotes", "stream", stream.streamId)
	}

	remote := stream.GetStickyPeer()
	var nextFromInclusive int64
	for range remotes {
		nextFromInclusive, err = s.syncStreamFromSinglePeer(ctx, stream, remote, fromInclusive, toExclusive)
		if err == nil && nextFromInclusive >= toExclusive {
			return nil
		}
		remote = stream.AdvanceStickyPeer(remote)
	}

	return AsRiverError(err, Err_UNAVAILABLE).
		Tags("stream", stream.streamId, "missingFromInclusive", nextFromInclusive, "missingToExlusive", toExclusive).
		Message("No peer could provide miniblocks for stream reconciliation")
}

// syncStreamFromSinglePeer syncs the database for the given streamResult by fetching missing blocks from a single peer.
// It returns block number of last block successfully synced + 1.
func (s *StreamCache) syncStreamFromSinglePeer(
	ctx context.Context,
	stream *Stream,
	remote common.Address,
	fromInclusive int64,
	toExclusive int64,
) (int64, error) {
	pageSize := s.params.Config.StreamReconciliation.GetMiniblocksPageSize
	if pageSize <= 0 {
		pageSize = 128
	}

	currentFromInclusive := fromInclusive
	for {
		if currentFromInclusive >= toExclusive {
			return currentFromInclusive, nil
		}

		currentToExclusive := min(currentFromInclusive+pageSize, toExclusive)

		mbs, err := s.params.RemoteMiniblockProvider.GetMbs(
			ctx,
			remote,
			stream.streamId,
			currentFromInclusive,
			currentToExclusive,
		)
		if err != nil {
			return currentFromInclusive, err
		}

		if len(mbs) == 0 {
			return currentFromInclusive, nil
		}

		err = stream.importMiniblocks(ctx, mbs)
		if err != nil {
			return currentFromInclusive, err
		}

		currentFromInclusive += int64(len(mbs))
	}
}
