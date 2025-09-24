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

// trimTask represents a task to trim miniblocks from a stream
type trimTask struct {
	streamId          StreamId
	miniblocksToKeep  int64
	retentionInterval int64
}

// streamTrimmer handles periodic trimming of streams
type streamTrimmer struct {
	ctx               context.Context
	log               *logging.Log
	store             *PostgresStreamStore
	config            crypto.OnChainConfiguration
	trimmingBatchSize int64

	// Worker pool for trimming operations
	workerPool *workerpool.WorkerPool

	// Task tracking
	pendingTasksLock sync.Mutex
	pendingTasks     map[StreamId]struct{}

	stopOnce sync.Once
	stop     chan struct{}
}

// newStreamTrimmer creates a new stream trimmer
func newStreamTrimmer(
	ctx context.Context,
	store *PostgresStreamStore,
	config crypto.OnChainConfiguration,
	workerPool *workerpool.WorkerPool,
	trimmingBatchSize int64,
) *streamTrimmer {
	st := &streamTrimmer{
		ctx:               ctx,
		log:               logging.FromCtx(ctx).Named("stream-trimmer"),
		store:             store,
		config:            config,
		trimmingBatchSize: trimmingBatchSize,
		workerPool:        workerPool,
		pendingTasks:      make(map[StreamId]struct{}),
		stop:              make(chan struct{}),
	}

	// Start the worker pool
	go st.monitorWorkerPool(ctx)

	return st
}

// monitorWorkerPool monitors the worker pool and handles shutdown
func (t *streamTrimmer) monitorWorkerPool(ctx context.Context) {
	for {
		select {
		case <-ctx.Done():
			t.log.Info("Worker pool stopped due to context cancellation")
			return
		case <-t.stop:
			t.log.Info("Worker pool stopped due to stop signal")
			return
		}
	}
}

// close stops the stream trimmer
func (t *streamTrimmer) close() {
	t.stopOnce.Do(func() {
		close(t.stop)
	})
}

// tryScheduleTrimming checks if the given stream type is trimmable and schedules trimming if it is.
func (t *streamTrimmer) tryScheduleTrimming(streamId StreamId) {
	if t.workerPool.Stopped() || t.workerPool.WaitingQueueSize() >= maxWorkerPoolPendingTasks {
		return
	}

	cfg := t.config.Get()
	mbsToKeep := int64(cfg.StreamTrimmingMiniblocksToKeep.ForType(streamId.Type()))

	var retentionInterval int64
	if interval := int64(cfg.StreamSnapshotIntervalInMiniblocks); interval > 0 {
		retentionInterval = max(interval, minRetentionInterval)
	}

	if mbsToKeep <= 0 && retentionInterval <= 0 {
		return
	}

	t.scheduleTrimTask(streamId, mbsToKeep, retentionInterval)
}

// scheduleTrimTask schedules a new trim task for the given stream
func (t *streamTrimmer) scheduleTrimTask(streamId StreamId, miniblocksToKeep, retentionInterval int64) {
	t.pendingTasksLock.Lock()
	if _, exists := t.pendingTasks[streamId]; exists {
		t.pendingTasksLock.Unlock()
		return
	}
	t.pendingTasks[streamId] = struct{}{}
	t.pendingTasksLock.Unlock()

	task := trimTask{
		streamId:          streamId,
		miniblocksToKeep:  miniblocksToKeep,
		retentionInterval: retentionInterval,
	}

	t.workerPool.Submit(func() {
		if err := t.processTrimTask(task); err != nil {
			t.log.Errorw("Failed to process stream trimming task",
				"stream", task.streamId,
				"miniblocksToKeep", task.miniblocksToKeep,
				"retentionInterval", task.retentionInterval,
				"error", err,
			)
		}
	})
}

// processTrimTask processes a single trim task
func (t *streamTrimmer) processTrimTask(task trimTask) error {
	ctx, cancel := context.WithTimeout(t.ctx, time.Minute)
	defer cancel()

	return t.store.txRunner(
		ctx,
		"streamTrimmer.processTrimTask",
		pgx.ReadWrite,
		func(ctx context.Context, tx pgx.Tx) error {
			return t.processTrimTaskTx(ctx, tx, task)
		},
		nil,
		"streamId", task.streamId,
		"miniblocksToKeep", task.miniblocksToKeep,
		"retentionInterval", task.retentionInterval,
	)
}

// processTrimTaskTx processes a single trim task within a transaction
func (t *streamTrimmer) processTrimTaskTx(
	ctx context.Context,
	tx pgx.Tx,
	task trimTask,
) error {
	var scheduledNext bool
	defer func() {
		if scheduledNext {
			return
		}

		// Delete the pending task mark
		t.pendingTasksLock.Lock()
		delete(t.pendingTasks, task.streamId)
		t.pendingTasksLock.Unlock()
	}()

	// Get the last snapshot miniblock number
	lastSnapshotMiniblock, err := t.store.lockStream(ctx, tx, task.streamId, true)
	if err != nil {
		return err
	}

	// Get the miniblock number to start from
	startMiniblockNum, err := t.store.getLowestStreamMiniblockTx(ctx, tx, task.streamId)
	if err != nil {
		return err
	}

	needSnapshotTrim := task.retentionInterval > 0

	if task.miniblocksToKeep > 0 {
		// Miniblock deletion is enabled only when the keep threshold is positive.
		// Streams that rely solely on snapshot retention skip this branch.
		// Calculate the highest miniblock number to keep
		lastMiniblockToKeep := lastSnapshotMiniblock - task.miniblocksToKeep
		if lastMiniblockToKeep > 0 && lastMiniblockToKeep > startMiniblockNum {
			// Calculate the end sequence number for deletion.
			// The given miniblock number will not be deleted.
			exclusiveEndSeq := startMiniblockNum + t.trimmingBatchSize
			if exclusiveEndSeq >= lastMiniblockToKeep {
				exclusiveEndSeq = lastMiniblockToKeep
			}

			rows, err := tx.Query(
				ctx,
				t.store.sqlForStream(
					`DELETE FROM {{miniblocks}}
				WHERE stream_id = $1 AND seq_num >= $2 AND seq_num < $3
				RETURNING seq_num`,
					task.streamId,
				),
				task.streamId,
				startMiniblockNum,
				exclusiveEndSeq,
			)
			if err != nil {
				return err
			}

			var lastDeletedMiniblock int64 = -1
			for rows.Next() {
				if err = rows.Scan(&lastDeletedMiniblock); err != nil {
					rows.Close()
					return err
				}
			}
			rows.Close()

			if lastDeletedMiniblock >= 0 && lastDeletedMiniblock+1 < lastMiniblockToKeep {
				// Schedule the next trim task if there are more miniblocks to delete.

				t.pendingTasksLock.Lock()
				delete(t.pendingTasks, task.streamId)
				t.pendingTasksLock.Unlock()
				scheduledNext = true

				t.scheduleTrimTask(task.streamId, task.miniblocksToKeep, task.retentionInterval)
				return nil
			}
		}
	} else if !needSnapshotTrim {
		return nil // Nothing to trim
	}

	if needSnapshotTrim {
		// Perform snapshot trimming if there are no more miniblocks to delete and trimming is enabled.

		snapshotRows, err := tx.Query(
			ctx,
			t.store.sqlForStream(
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
		defer snapshotRows.Close()

		var mbs []int64
		var mbNum int64
		if _, err = pgx.ForEachRow(snapshotRows, []any{&mbNum}, func() error {
			mbs = append(mbs, mbNum)
			return nil
		}); err != nil {
			return err
		}

		toNullify := determineSnapshotsToNullify(mbs, task.retentionInterval, minKeep)
		if len(toNullify) > 0 {
			if _, err = tx.Exec(
				ctx,
				t.store.sqlForStream(
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
	if retentionInterval <= 0 {
		return nil
	}

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
