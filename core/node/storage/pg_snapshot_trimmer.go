package storage

import (
	"context"
	"sync"
	"time"

	"github.com/gammazero/workerpool"
	"github.com/jackc/pgx/v5"

	"github.com/towns-protocol/towns/core/node/crypto"
	"github.com/towns-protocol/towns/core/node/logging"
	. "github.com/towns-protocol/towns/core/node/shared"
)

const (
	// minRetentionInterval is the min retention interval for snapshots.
	minRetentionInterval = 100 // 100 miniblocks

	// minKeep is the number of most recent miniblocks to protect (no nullification)
	minKeep = 100 // 100 miniblocks
)

type snapshotTrimTask struct {
	streamId          StreamId
	retentionInterval int64
}

// snapshotTrimmer contains a logic that handles the trimming of snapshots in the database.
// It uses a shared worker pool to schedule trimming task.
// When a new miniblock with snapshot is produced, tryScheduleTrimming function must be called to
// schedule the trimming task for the stream.
// It does not load streams into cache and does not keep any state apart from pending tasks.
type snapshotTrimmer struct {
	ctx     context.Context
	log     *logging.Log
	store   *PostgresStreamStore
	config  crypto.OnChainConfiguration
	minKeep int64

	// Worker pool for trimming operations
	workerPool *workerpool.WorkerPool

	// Task tracking
	pendingTasksLock sync.Mutex
	pendingTasks     map[StreamId]struct{}

	stopOnce sync.Once
	stop     chan struct{}
}

// newSnapshotTrimmer creates a new snapshot trimmer.
func newSnapshotTrimmer(
	ctx context.Context,
	store *PostgresStreamStore,
	workerPool *workerpool.WorkerPool,
	config crypto.OnChainConfiguration,
) *snapshotTrimmer {
	st := &snapshotTrimmer{
		ctx:          ctx,
		log:          logging.FromCtx(ctx).Named("snapshot-trimmer"),
		store:        store,
		config:       config,
		minKeep:      minKeep,
		workerPool:   workerPool,
		pendingTasks: make(map[StreamId]struct{}),
		stop:         make(chan struct{}),
	}

	go st.monitorWorkerPool(ctx)

	return st
}

// monitorWorkerPool monitors the worker pool and handles shutdown
func (st *snapshotTrimmer) monitorWorkerPool(ctx context.Context) {
	for {
		select {
		case <-ctx.Done():
			st.log.Info("Worker pool stopped due to context cancellation")
			return
		case <-st.stop:
			st.log.Info("Worker pool stopped due to stop signal")
			return
		}
	}
}

// close stops the snapshot trimmer
func (st *snapshotTrimmer) close() {
	st.stopOnce.Do(func() {
		close(st.stop)
	})
}

// tryScheduleTrimming checks if snapshots of the given stream can be trimmed and schedules the trimming task.
func (st *snapshotTrimmer) tryScheduleTrimming(streamId StreamId) {
	// Retention interval could be changed at any time so the current value must be used
	retentionInterval := int64(st.config.Get().StreamSnapshotIntervalInMiniblocks)
	if retentionInterval == 0 {
		// If retention interval is 0, it means that snapshots trimming is disabled
		return
	}

	if st.workerPool.Stopped() || st.workerPool.WaitingQueueSize() >= maxWorkerPoolPendingTasks {
		// If the worker pool is full, do not schedule any new tasks
		return
	}

	// Schedule snapshot trimming task for the stream
	st.scheduleTrimTask(streamId, max(retentionInterval, minRetentionInterval))
}

// scheduleTrimTask schedules a new trim task for a stream
func (st *snapshotTrimmer) scheduleTrimTask(streamId StreamId, retentionInterval int64) {
	st.pendingTasksLock.Lock()
	if _, exists := st.pendingTasks[streamId]; exists {
		st.pendingTasksLock.Unlock()
		return
	}
	st.pendingTasks[streamId] = struct{}{}
	st.pendingTasksLock.Unlock()

	// Create a new task
	task := snapshotTrimTask{
		streamId:          streamId,
		retentionInterval: retentionInterval,
	}

	// Submit the task to the worker pool
	st.workerPool.Submit(func() {
		if err := st.processTrimTask(task); err != nil {
			st.log.Errorw("Failed to process snapshot trimming task",
				"stream", task.streamId,
				"retentionInterval", task.retentionInterval,
				"err", err,
			)
		}
	})
}

// processTrimTask processes a single trim task
func (st *snapshotTrimmer) processTrimTask(task snapshotTrimTask) error {
	ctx, cancel := context.WithTimeout(st.ctx, time.Minute)
	defer cancel()

	return st.store.txRunner(
		ctx,
		"snapshotTrimmer.processTrimTask",
		pgx.ReadWrite,
		func(ctx context.Context, tx pgx.Tx) error {
			return st.processTrimTaskTx(ctx, tx, task)
		},
		nil,
		"streamId", task.streamId,
		"retentionInterval", task.retentionInterval,
	)
}

// processTrimTaskTx processes a single trim task within a transaction
func (st *snapshotTrimmer) processTrimTaskTx(
	ctx context.Context,
	tx pgx.Tx,
	task snapshotTrimTask,
) error {
	defer func() {
		// Delete the pending task mark
		st.pendingTasksLock.Lock()
		delete(st.pendingTasks, task.streamId)
		st.pendingTasksLock.Unlock()
	}()

	// Get the last snapshot miniblock number
	lastSnapshotMiniblock, err := st.store.lockStream(ctx, tx, task.streamId, true)
	if err != nil {
		return err
	}

	// Collect all miniblocks with a snapshot for the given stream starting from the last snapshot miniblock
	snapshotMiniblockRows, err := tx.Query(
		ctx,
		st.store.sqlForStream(
			`SELECT seq_num 
				FROM {{miniblocks}} 
				WHERE stream_id = $1 AND seq_num < $2 AND snapshot IS NOT NULL`,
			task.streamId,
		),
		task.streamId, lastSnapshotMiniblock,
	)
	if err != nil {
		return err
	}

	var mbs []int64
	var mbNum int64
	if _, err = pgx.ForEachRow(snapshotMiniblockRows, []any{&mbNum}, func() error {
		mbs = append(mbs, mbNum)
		return nil
	}); err != nil {
		return err
	}

	// Determine which miniblocks should be nullified
	toNullify := determineSnapshotsToNullify(mbs, task.retentionInterval, st.minKeep)
	if len(toNullify) > 0 {
		// Reset snapshot field for the given miniblocks
		if _, err = tx.Exec(
			ctx,
			st.store.sqlForStream(
				`UPDATE {{miniblocks}}
				SET snapshot = NULL
				WHERE stream_id = $1 AND seq_num = ANY($2)`,
				task.streamId,
			),
			task.streamId, toNullify,
		); err != nil {
			return err
		}
	}

	return nil
}

// determineSnapshotsToNullify returns the seq_nums whose snapshot field should be set to NULL.
// It scans snapshotSeqs (ascending), groups by bucket = seq_num/retentionInterval,
// keeps the very first seq in each bucket, and nullifies the rest—except anything
// newer than maxSeq-minKeep, which stays protected.
//
//	snapshotSeqs:      sorted ascending slice of seq_nums where snapshot != NULL
//	retentionInterval: onchain setting, e.g. 1000 miniblocks
//	minKeep:           number of most recent miniblocks to protect
func determineSnapshotsToNullify(
	snapshotSeqs []int64,
	retentionInterval int64,
	minKeep int64,
) []int64 {
	n := len(snapshotSeqs)
	if n == 0 {
		return nil
	}

	maxSeq := snapshotSeqs[n-1]
	cutoff := maxSeq - minKeep

	var toNullify []int64
	var lastBucket int64 = -1

	for _, seq := range snapshotSeqs {
		// skip anything in the protected tail
		if seq > cutoff {
			break
		}
		bucket := seq / retentionInterval
		if bucket != lastBucket {
			// first snapshot in this bucket → keep it, advance bucket marker
			lastBucket = bucket
		} else {
			// subsequent snapshot in same bucket → nullify
			toNullify = append(toNullify, seq)
		}
	}
	return toNullify
}
