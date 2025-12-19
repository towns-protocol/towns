package events

import (
	"container/list"
	"context"
	"time"

	"github.com/gammazero/workerpool"
	"github.com/linkdata/deadlock"
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

func (s *StreamCache) SubmitReconcileStreamTask(
	stream *Stream,
	streamRecord *river.StreamWithId,
) {
	s.submitReconcileStreamTaskToPool(s.onlineReconcileWorkerPool, stream, streamRecord)
}

func (s *StreamCache) submitReconcileStreamTaskToPool(
	pool *workerpool.WorkerPool,
	stream *Stream,
	streamRecord *river.StreamWithId,
) {
	if streamRecord == nil {
		s.submitGetRecordTask(pool, stream)
	} else {
		s.submitReconciliationTask(pool, stream, streamRecord)
	}
}

func (s *StreamCache) submitToPool(
	pool *workerpool.WorkerPool,
	task func(),
) {
	if s.params.Config.StreamReconciliation.OnlineWorkerPoolSize == 0 {
		return
	}

	s.stoppedMu.RLock()
	defer s.stoppedMu.RUnlock()
	if !s.stopped {
		pool.Submit(task)
	}
}

func (s *StreamCache) submitGetRecordTask(
	pool *workerpool.WorkerPool,
	stream *Stream,
) {
	_, loaded := s.scheduledGetRecordTasks.LoadOrStore(stream.streamId, true)
	if loaded {
		return
	}

	s.submitToPool(pool, func() {
		s.getRecordTask(stream)
	})
}

func (s *StreamCache) getRecordTask(
	stream *Stream,
) {
	s.scheduledGetRecordTasks.Delete(stream.streamId)

	ctx, cancel := context.WithTimeout(s.params.ServerCtx, 5*time.Second)
	defer cancel()

	streamRecord, err := s.params.Registry.StreamRegistry.GetStreamOnLatestBlock(ctx, stream.streamId)
	if err != nil {
		logging.FromCtx(ctx).
			Errorw("getRecordTask: Unable to get stream record", "stream", stream.streamId, "error", err)
		return
	}

	s.submitReconciliationTask(
		s.onlineReconcileWorkerPool,
		stream,
		river.NewStreamWithId(stream.streamId, streamRecord),
	)
}

func (s *StreamCache) submitReconciliationTask(
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
		s.submitToPool(pool, func() {
			s.reconciliationTask(stream.StreamId())
		})
	}
}

func (s *StreamCache) reconciliationTask(streamId StreamId) {
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
		logging.FromCtx(s.params.ServerCtx).Errorw("reconciliationTask: Corrupt task (double submission?)",
			"stream", streamId,
			"record", streamRecord,
			"taskPresent", ok,
		)
		return
	}

	err := newStreamReconciler(s, stream, streamRecord).reconcileAndTrim()
	if err != nil {
		logging.FromCtx(s.params.ServerCtx).
			Errorw("reconcileStreamFromPeers: Unable to reconcile stream from peers",
				"stream", stream.streamId,
				"error", err,
				"streamRecord", streamRecord)

		if IsRiverErrorCode(err, Err_DOWNSTREAM_NETWORK_ERROR) ||
			IsRiverErrorCode(err, Err_UNAVAILABLE) {
			s.scheduledReconciliationTasks.Compute(
				streamId,
				func(existingValue *reconcileTask, loaded bool) (newValue *reconcileTask, op xsync.ComputeOp) {
					if loaded && existingValue.next != nil &&
						existingValue.next.LastMbNum() > streamRecord.LastMbNum() {
						streamRecord = existingValue.next
					} else if loaded && existingValue.inProgress != nil && existingValue.inProgress.LastMbNum() > streamRecord.LastMbNum() {
						streamRecord = existingValue.inProgress
					}

					s.retryableReconciliationTasks.Add(streamId, stream, streamRecord)

					return nil, xsync.DeleteOp
				})
			return
		}
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
		logging.FromCtx(s.params.ServerCtx).
			Errorw("reconciliationTask: Corrupt task 2", "stream", streamId, "record", streamRecord)
		return
	}

	if schedule {
		s.submitToPool(s.onlineReconcileWorkerPool, func() {
			s.reconciliationTask(streamId)
		})
	}
}

/*
// reconcileStreamFromPeers reconciles the database for the given streamResult by fetching missing blocks from peers
// participating in the stream.
func (s *StreamCache) reconcileStreamFromPeers(
	stream *Stream,
	streamRecord *river.StreamWithId,
) error {
	ctx := s.params.ServerCtx

	// TODO: double check if this is correct to normalize here
	// Try to normalize the given stream if needed.
	if streamRecord.IsSealed() {
		err := s.normalizeEphemeralStream(ctx, stream, streamRecord.LastMbNum(), streamRecord.IsSealed())
		if err != nil {
			return err
		}
	}

	lastMiniblockNum, err := stream.getLastMiniblockNumSkipLoad(ctx)
	if err != nil {
		if IsRiverErrorCode(err, Err_NOT_FOUND) {
			lastMiniblockNum = -1
		} else {
			return err
		}
	}

	if streamRecord.LastMbNum() < lastMiniblockNum {
		if streamRecord.ReplicationFactor() > 1 && streamRecord.Nodes()[0] == s.params.Wallet.Address {
			// Before replicated streams nodes would only register miniblocks every N miniblocks.
			// Therefore, it is possible that registry stream record for streams that haven't seen new miniblocks
			// after the stream was migrated to a replicated stream is lagging behind. For those streams register
			// the latest miniblock to bring the record up to date.
			go s.writeLatestMbToBlockchain(ctx, stream)
		}
		return nil
	}

	if streamRecord.LastMbNum() <= lastMiniblockNum {
		return nil
	}

	// Several streams are in a state where the genesis miniblock is still stored on-chain, but
	// the node that has the genesis block left the network and other nodes can't reconcile this
	// stream anymore.
	// This was the result of a bug when a node left the network, and the logic that checked if
	// the leaving node didn't have any streams assigned didn't handle streamRecord.MbRef.Num == 0
	// correct.
	// If the stream record is still at miniblock 0, try to reconcile the stream from the genesis
	// block in the stream registry instead of a peer.
	if streamRecord.LastMbNum() == 0 {
		if err := s.reconcileStreamFromStreamRegistryGenesisBlock(stream); err == nil {
			return nil
		}
	}

	stream.mu.Lock()
	nonReplicatedStream := len(stream.nodesLocked.GetQuorumNodes()) == 1
	stream.mu.Unlock()

	fromInclusive := lastMiniblockNum + 1
	toExclusive := streamRecord.LastMbNum() + 1

	remotes, _ := stream.GetRemotesAndIsLocal()
	if len(remotes) == 0 {
		return RiverError(Err_UNAVAILABLE, "Stream has no remotes", "stream", stream.streamId)
	}

	remote := stream.GetStickyPeer()
	var nextFromInclusive int64
	for range remotes {
		// if stream is not replicated the stream registry may not have the latest miniblock
		// because nodes only register periodically new miniblocks to reduce transaction costs
		// for non-replicated streams. In that case fetch the latest block number from the remote.
		if nonReplicatedStream {
			mbRef, err := s.params.RemoteMiniblockProvider.GetLastMiniblockHash(ctx, remote, stream.streamId)
			if err != nil {
				continue
			}
			toExclusive = max(toExclusive, mbRef.Num+1)
		}

		nextFromInclusive, err = s.reconcileStreamFromSinglePeer(stream, remote, fromInclusive, toExclusive)
		if err == nil && nextFromInclusive >= toExclusive {
			return nil
		}

		remote = stream.AdvanceStickyPeer(remote)
	}

	if err != nil {
		return RiverErrorWithBase(
			Err_UNAVAILABLE,
			"No peer could provide miniblocks for stream reconciliation",
			err,
		).
			Tags("stream", stream.streamId, "missingFromInclusive", nextFromInclusive, "missingToExclusive", toExclusive)
	}

	return RiverError(
		Err_UNAVAILABLE,
		"No peer could provide miniblocks for stream reconciliation",
	).
		Tags("stream", stream.streamId, "missingFromInclusive", nextFromInclusive, "missingToExclusive", toExclusive)
}

// reconcileStreamFromStreamRegistryGenesisBlock reconciles the database for the given stream from the stream registry.
// If the stream record has advanced beyond the genesis miniblock, this function returns an error and the caller is
// expected to reconcile from peers.
func (s *StreamCache) reconcileStreamFromStreamRegistryGenesisBlock(stream *Stream) error {
	ctx, cancel := context.WithTimeout(s.params.ServerCtx, time.Minute)
	defer cancel()

	streamID := stream.StreamId()
	_, _, mb, err := s.params.Registry.GetStreamWithGenesis(ctx, streamID, 0)
	if err != nil {
		return err
	}

	if len(mb) == 0 {
		return RiverError(Err_UNAVAILABLE, "Unable to read genesis mb from registry").
			Tags("streamId", streamID).
			Func("reconcileStreamFromStreamRegistryGenesisBlock")
	}

	genesisBlock, err := NewMiniblockInfoFromDescriptor(&storage.MiniblockDescriptor{Data: mb, HasLegacySnapshot: true})
	if err != nil {
		return err
	}

	return stream.importMiniblocks(ctx, []*MiniblockInfo{genesisBlock})
}

// reconcileStreamFromSinglePeer reconciles the database for the given streamResult by fetching missing blocks from a
// single peer.
// It returns the block number of the last block successfully reconciled + 1.
func (s *StreamCache) reconcileStreamFromSinglePeer(
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

		ctx, cancel := context.WithTimeout(s.params.ServerCtx, time.Minute)

		currentToExclusive := min(currentFromInclusive+pageSize, toExclusive)

		mbs, err := s.params.RemoteMiniblockProvider.GetMbs(
			ctx,
			remote,
			stream.streamId,
			currentFromInclusive,
			currentToExclusive,
		)
		if err != nil {
			cancel()
			return currentFromInclusive, err
		}

		if len(mbs) == 0 {
			cancel()
			return currentFromInclusive, nil
		}

		err = stream.importMiniblocks(ctx, mbs)
		cancel()
		if err != nil {
			return currentFromInclusive, err
		}

		currentFromInclusive += int64(len(mbs))
	}
}
*/

// retryableReconciliationTasks holds a set of reconciliation tasks that failed and need
// to be retried periodically until success.
//
// For example a reconciliation tasks that failed because it could not connect to nodes
// due to a temporary network issue or remote outage.
type retryableReconciliationTasks struct {
	mu                deadlock.Mutex
	pendingTasks      map[StreamId]*list.Element
	pendingTasksFifo  *list.List
	nextRetryDuration time.Duration
}

// retryableReconciliationTaskItem keeps a collection of reconciliation tasks that failed but need to be retried at a
// later time. It uses a FIFO list to keep track of the order of tasks to ensure that the oldest task is retried first.
// If a reconciliation task is added for a stream that already has a pending task the existing task is updated with the
// new streamRecord and kept in the same place in the FIFO list.
type retryableReconciliationTaskItem struct {
	// retryAfter indicates after which interval the task in item should be retried
	retryAfter time.Time
	// item keeps the stream record for the task
	item *river.StreamWithId
}

// newRetryableReconciliationTasks create a new retryableReconciliationTasks instance with the given nextRetry duration.
// if nextRetry is less than or equal to 0 it will default to 2 minutes.
func newRetryableReconciliationTasks(nextRetry time.Duration) *retryableReconciliationTasks {
	if nextRetry <= 0 {
		nextRetry = 2 * time.Minute
	}

	return &retryableReconciliationTasks{
		pendingTasks:      make(map[StreamId]*list.Element),
		pendingTasksFifo:  list.New(),
		nextRetryDuration: nextRetry,
	}
}

func (r *retryableReconciliationTasks) Len() int {
	r.mu.Lock()
	defer r.mu.Unlock()
	return r.pendingTasksFifo.Len()
}

// Add adds or updates a retryable reconciliation task for the given streamId.
// If a task already exists for the given stream  and the given streamRecord is newer the existing task is updated.
func (r *retryableReconciliationTasks) Add(streamId StreamId, stream *Stream, streamRecord *river.StreamWithId) {
	r.mu.Lock()
	defer r.mu.Unlock()

	if elem, ok := r.pendingTasks[streamId]; ok {
		existing := elem.Value.(*retryableReconciliationTaskItem)
		if existing.item.LastMbNum() < streamRecord.LastMbNum() {
			elem.Value = &retryableReconciliationTaskItem{
				retryAfter: time.Now().Add(r.nextRetryDuration),
				item:       streamRecord,
			}
		}
		return
	}

	elem := r.pendingTasksFifo.PushBack(&retryableReconciliationTaskItem{
		retryAfter: time.Now().Add(r.nextRetryDuration),
		item:       streamRecord,
	})

	r.pendingTasks[streamId] = elem
}

// Remove removes a task if the given task is the same or older than the pending task.
// If there is not pending task for the given task this is a no-op.
func (r *retryableReconciliationTasks) Remove(task *retryableReconciliationTaskItem) {
	r.mu.Lock()
	defer r.mu.Unlock()

	if elem, ok := r.pendingTasks[task.item.StreamId()]; ok {
		pendingTask := elem.Value.(*retryableReconciliationTaskItem)

		// only remove if the given task is older than the pending task
		if pendingTask.item.LastMbNum() <= task.item.LastMbNum() {
			r.pendingTasksFifo.Remove(elem)
			delete(r.pendingTasks, task.item.StreamId())
		}
	}
}

// Peek returns the oldest *retryableReconciliationTaskItem, or nil if empty.
func (r *retryableReconciliationTasks) Peek() *retryableReconciliationTaskItem {
	r.mu.Lock()
	defer r.mu.Unlock()
	elem := r.pendingTasksFifo.Front()
	if elem == nil {
		return nil
	}
	return elem.Value.(*retryableReconciliationTaskItem)
}

// Pop removes and returns the oldest *retryableReconciliationTaskItem, or nil if empty.
func (r *retryableReconciliationTasks) Pop() *retryableReconciliationTaskItem {
	r.mu.Lock()
	defer r.mu.Unlock()

	elem := r.pendingTasksFifo.Front()
	if elem == nil {
		return nil
	}

	streamRecord := elem.Value.(*retryableReconciliationTaskItem)

	delete(r.pendingTasks, streamRecord.item.StreamId())
	r.pendingTasksFifo.Remove(elem)

	return streamRecord
}
