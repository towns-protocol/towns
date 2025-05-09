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

// trimTask represents a task to trim miniblocks from a stream
type trimTask struct {
	streamId          StreamId
	startMiniblockNum int64
	miniblocksToKeep  int64
}

// streamTrimmer handles periodic trimming of streams
type streamTrimmer struct {
	ctx   context.Context
	log   *logging.Log
	store *PostgresStreamStore
	// miniblocksToKeep is the number of miniblocks to keep before the last snapshot.
	// Defined per stream type.
	miniblocksToKeep  crypto.StreamTrimmingMiniblocksToKeepSettings
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
	miniblocksToKeep crypto.StreamTrimmingMiniblocksToKeepSettings,
	trimmingBatchSize int64,
) (*streamTrimmer, error) {
	st := &streamTrimmer{
		ctx:               ctx,
		log:               logging.FromCtx(ctx).Named("streamTrimmer"),
		store:             store,
		miniblocksToKeep:  miniblocksToKeep,
		trimmingBatchSize: trimmingBatchSize,
		workerPool:        workerpool.New(4),
		pendingTasks:      make(map[StreamId]struct{}),
		stop:              make(chan struct{}),
	}

	// Schedule trimming for existing streams
	if err := st.scheduleStreamsTrimming(ctx); err != nil {
		return nil, err
	}

	// Start the worker pool
	go st.monitorWorkerPool(ctx)

	return st, nil
}

// monitorWorkerPool monitors the worker pool and handles shutdown
func (t *streamTrimmer) monitorWorkerPool(ctx context.Context) {
	for {
		select {
		case <-ctx.Done():
			t.log.Info("Worker pool stopped due to context cancellation")
			t.workerPool.StopWait()
			return
		case <-t.stop:
			t.log.Info("Worker pool stopped due to stop signal")
			t.workerPool.StopWait()
			return
		}
	}
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

	// Calculate the highest miniblock number to keep
	lastMiniblockToKeep := lastSnapshotMiniblock - task.miniblocksToKeep
	if lastMiniblockToKeep <= 0 {
		return nil // Nothing to trim
	}

	// Just for safety reasons
	if lastMiniblockToKeep <= task.startMiniblockNum {
		return nil
	}

	// Calculate the end sequence number for deletion.
	// The given miniblock number will not be deleted.
	exclusiveEndSeq := task.startMiniblockNum + t.trimmingBatchSize
	if exclusiveEndSeq >= lastMiniblockToKeep {
		exclusiveEndSeq = lastMiniblockToKeep
	}

	// Delete miniblocks in the calculated range
	rows, err := tx.Query(
		ctx,
		t.store.sqlForStream(
			`DELETE FROM {{miniblocks}}
			WHERE stream_id = $1 AND seq_num >= $2 AND seq_num < $3
			RETURNING seq_num`,
			task.streamId,
		),
		task.streamId,
		task.startMiniblockNum,
		exclusiveEndSeq,
	)
	if err != nil {
		return err
	}

	// Check if any rows were deleted and track the last deleted miniblock
	var lastDeletedMiniblock int64 = -1
	for rows.Next() {
		if err = rows.Scan(&lastDeletedMiniblock); err != nil {
			return err
		}
	}
	rows.Close()

	// Schedule the next trim task if there are more miniblocks to delete
	if lastDeletedMiniblock >= 0 && lastDeletedMiniblock+1 < lastMiniblockToKeep {
		// Delete the pending task mark
		t.pendingTasksLock.Lock()
		delete(t.pendingTasks, task.streamId)
		t.pendingTasksLock.Unlock()
		scheduledNext = true

		// Schedule the next trim task
		t.scheduleTrimTask(task.streamId, lastDeletedMiniblock+1, task.miniblocksToKeep)
	}

	return nil
}

// scheduleTrimTask schedules a new trim task for a stream
func (t *streamTrimmer) scheduleTrimTask(streamId StreamId, startMiniblockNum int64, miniblocksToKeep int64) {
	t.pendingTasksLock.Lock()
	if _, exists := t.pendingTasks[streamId]; exists {
		t.pendingTasksLock.Unlock()
		return
	}
	t.pendingTasks[streamId] = struct{}{}
	t.pendingTasksLock.Unlock()

	// Create a new task
	task := trimTask{
		streamId:          streamId,
		startMiniblockNum: startMiniblockNum,
		miniblocksToKeep:  miniblocksToKeep,
	}

	// Submit the task to the worker pool
	t.workerPool.Submit(func() {
		if err := t.processTrimTask(task); err != nil {
			t.log.Errorw("Failed to process stream trimming task",
				"stream", task.streamId,
				"startMiniblockNum", task.startMiniblockNum,
				"miniblocksToKeep", task.miniblocksToKeep,
				"err", err,
			)
		}
	})
}

// tryScheduleTrimming checks if the given stream type is trimmable and schedules trimming if it is.
func (t *streamTrimmer) tryScheduleTrimming(
	ctx context.Context,
	tx pgx.Tx,
	streamId StreamId,
) {
	// Schedule trimming for the given stream if the trimming for this type is enabled.
	if mbsToKeep := int64(t.miniblocksToKeep.ForType(streamId.Type())); mbsToKeep > 0 {
		// Get the miniblock number to start from
		startMiniblockNum, err := t.getLowestStreamMiniblock(ctx, tx, streamId)
		if err != nil {
			t.log.Errorw("Failed to get lowest stream miniblock to schedule trimming, starting from miniblock 0",
				"stream", streamId, "err", err)
			startMiniblockNum = 0 // Just to explicitly reset if getLowestStreamMiniblock returns non 0 value
		}

		t.scheduleTrimTask(streamId, startMiniblockNum, mbsToKeep)
	}
}

// close stops the stream trimmer
func (t *streamTrimmer) close() {
	t.stopOnce.Do(func() {
		close(t.stop)
	})
	t.workerPool.StopWait()
}

// scheduleStreamsTrimming schedules trimming for all trimmable streams.
func (t *streamTrimmer) scheduleStreamsTrimming(ctx context.Context) error {
	return t.store.txRunner(
		ctx,
		"streamTrimmer.scheduleStreamsTrimming",
		pgx.ReadWrite,
		func(ctx context.Context, tx pgx.Tx) error {
			rows, err := tx.Query(ctx, "SELECT stream_id FROM es WHERE ephemeral = false FOR UPDATE SKIP LOCKED")
			if err != nil {
				return err
			}

			var stream string
			_, err = pgx.ForEachRow(rows, []any{&stream}, func() error {
				streamId, err := StreamIdFromString(stream)
				if err != nil {
					return err
				}

				t.tryScheduleTrimming(ctx, tx, streamId)

				return nil
			})
			return err
		},
		nil,
	)
}

// getLowestStreamMiniblock retrieves the lowest miniblock number for a given stream
func (t *streamTrimmer) getLowestStreamMiniblock(
	ctx context.Context,
	tx pgx.Tx,
	streamId StreamId,
) (int64, error) {
	var lowestMiniblock int64
	err := tx.QueryRow(ctx,
		t.store.sqlForStream(
			`SELECT MIN(seq_num) FROM {{miniblocks}} WHERE stream_id = $1`,
			streamId,
		),
		streamId,
	).Scan(&lowestMiniblock)
	return lowestMiniblock, err
}
