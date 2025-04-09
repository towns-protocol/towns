package events

import (
	"context"

	"github.com/ethereum/go-ethereum/common"
	"github.com/gammazero/workerpool"
	"github.com/puzpuzpuz/xsync/v4"

	"github.com/towns-protocol/towns/core/contracts/river"
	. "github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/logging"
	. "github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/shared"
)

type reconcileTask struct {
	inProgress *river.StreamWithId
	next       *river.StreamWithId
	stream     *Stream
}

func (s *StreamCache) SubmitSyncStreamTask(
	ctx context.Context,
	stream *Stream,
	streamRecord *river.StreamWithId,
) {
	s.submitSyncStreamTaskToPool(ctx, s.onlineSyncWorkerPool, stream, streamRecord)
}

func (s *StreamCache) submitSyncStreamTaskToPool(
	ctx context.Context,
	pool *workerpool.WorkerPool,
	stream *Stream,
	streamRecord *river.StreamWithId,
) {
	s.stoppedMu.RLock()
	stopped := s.stopped
	s.stoppedMu.RUnlock()
	if stopped {
		return
	}

	// TODO: REPLICATION: remove context from params and refactor to use default server context
	ctx = context.WithoutCancel(ctx)

	if streamRecord == nil {
		s.submitGetRecordTask(ctx, pool, stream)
	} else {
		s.submitReconciliationTask(ctx, pool, stream, streamRecord)
	}

}

func (s *StreamCache) submitGetRecordTask(
	ctx context.Context,
	pool *workerpool.WorkerPool,
	stream *Stream,
) {
	_, loaded := s.scheduledGetRecordTasks.LoadOrStore(stream.streamId, true)
	if loaded {
		return
	}

	pool.Submit(func() {
		s.getRecordTask(ctx, pool, stream)
	})
}

func (s *StreamCache) getRecordTask(
	ctx context.Context,
	pool *workerpool.WorkerPool,
	stream *Stream,
) {
	s.scheduledGetRecordTasks.Delete(stream.streamId)

	streamRecord, err := s.params.Registry.GetStreamOnLatestBlock(ctx, stream.streamId)
	if err != nil {
		logging.FromCtx(ctx).Errorw("getRecordTask: Unable to get stream record", "stream", stream.streamId, "error", err)
		return
	}

	s.submitReconciliationTask(ctx, pool, stream, streamRecord)
}

func (s *StreamCache) submitReconciliationTask(
	ctx context.Context,
	pool *workerpool.WorkerPool,
	stream *Stream,
	streamRecord *river.StreamWithId,
) {
	schedule := false
	_, _ = s.scheduledReconciliationTasks.Compute(
		stream.streamId,
		func(v *reconcileTask, loaded bool) (*reconcileTask, xsync.ComputeOp) {
			if !loaded {
				schedule = true
				return &reconcileTask{
					next:   streamRecord,
					stream: stream,
				}, xsync.UpdateOp
			}
			if v.inProgress != nil && v.inProgress.LastMbNum() >= streamRecord.LastMbNum() {
				return v, xsync.CancelOp
			}
			if v.next != nil && v.next.LastMbNum() >= streamRecord.LastMbNum() {
				return v, xsync.CancelOp
			}
			v.next = streamRecord
			return v, xsync.CancelOp
		})

	if schedule {
		pool.Submit(func() {
			s.reconciliationTask(ctx, pool, stream.StreamId())
		})
	}

}

func (s *StreamCache) reconciliationTask(
	ctx context.Context,
	pool *workerpool.WorkerPool,
	streamId StreamId,
) {
	corrupt := false
	var streamRecord *river.StreamWithId
	var stream *Stream
	_, ok := s.scheduledReconciliationTasks.Compute(
		streamId,
		func(v *reconcileTask, loaded bool) (*reconcileTask, xsync.ComputeOp) {
			if !loaded || v.inProgress != nil || v.next == nil {
				corrupt = true
				streamRecord = v.inProgress
				return nil, xsync.CancelOp
			}
			stream = v.stream
			streamRecord = v.next
			v.inProgress = v.next
			v.next = nil
			return v, xsync.CancelOp
		},
	)
	if corrupt {
		logging.FromCtx(ctx).Errorw("reconciliationTask: Corrupt task (double submission?)",
			"stream", streamId,
			"record", streamRecord,
			"taskPresent", ok,
		)
		return
	}

	err := s.syncStreamFromPeers(ctx, stream, streamRecord)
	if err != nil {
		logging.FromCtx(ctx).
			Errorw("syncStreamFromPeers: Unable to sync stream from peers",
				"stream", stream.streamId,
				"error", err,
				"streamRecord", streamRecord)
	}

	schedule := false
	_, _ = s.scheduledReconciliationTasks.Compute(
		streamId,
		func(v *reconcileTask, loaded bool) (*reconcileTask, xsync.ComputeOp) {
			if !loaded || v.inProgress != streamRecord {
				corrupt = true
				return nil, xsync.DeleteOp
			}
			v.inProgress = nil
			if v.next != nil {
				schedule = true
				return v, xsync.CancelOp
			} else {
				return nil, xsync.DeleteOp
			}
		},
	)
	if corrupt {
		logging.FromCtx(ctx).Errorw("reconciliationTask: Corrupt task 2", "stream", streamId, "record", streamRecord)
		return
	}

	if schedule {
		pool.Submit(func() {
			s.reconciliationTask(ctx, pool, streamId)
		})
	}
}

// syncStreamFromPeers syncs the database for the given streamResult by fetching missing blocks from peers
// participating in the stream.
func (s *StreamCache) syncStreamFromPeers(
	ctx context.Context,
	stream *Stream,
	streamRecord *river.StreamWithId,
) error {
	// TODO: double check if this is correct to normalize here
	// Try to normalize the given stream if needed.
	err := s.normalizeEphemeralStream(ctx, stream, streamRecord.LastMbNum(), streamRecord.IsSealed())
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

	if streamRecord.LastMbNum() <= lastMiniblockNum {
		return nil
	}

	fromInclusive := lastMiniblockNum + 1
	toExclusive := streamRecord.LastMbNum() + 1

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
