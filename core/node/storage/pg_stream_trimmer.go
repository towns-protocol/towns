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
	streamId         StreamId
	miniblocksToKeep int64
}

// streamTrimmer handles periodic trimming of streams
type streamTrimmer struct {
	ctx   context.Context
	log   *logging.Log
	store *PostgresStreamStore
	// miniblocksToKeep is the number of miniblocks to keep before the last snapshot.
	// Defined per stream type.
	miniblocksToKeep  crypto.StreamTrimmingMiniblocksToKeepSettings
	trimmingBatchSize int

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
	trimmingBatchSize int,
) (*streamTrimmer, error) {
	st := &streamTrimmer{
		ctx:               ctx,
		log:               logging.FromCtx(ctx),
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
	// Get the last snapshot miniblock number
	lastSnapshotMiniblock, err := t.store.lockStream(ctx, tx, task.streamId, true)
	if err != nil {
		return err
	}

	// Calculate the miniblock number to keep
	miniblockToKeep := lastSnapshotMiniblock - task.miniblocksToKeep
	if miniblockToKeep <= 0 {
		return nil // Nothing to trim
	}

	// Delete miniblocks in a single batch.
	rows, err := tx.Query(
		ctx,
		t.store.sqlForStream(
			`WITH rows_to_delete AS (
				SELECT stream_id, seq_num
				FROM {{miniblocks}}
				WHERE stream_id = $1 AND seq_num < $2
				ORDER BY seq_num ASC
				LIMIT $3
			)
			DELETE FROM {{miniblocks}}
			WHERE (stream_id, seq_num) IN (SELECT stream_id, seq_num FROM rows_to_delete)
			RETURNING *`,
			task.streamId,
		),
		task.streamId,
		miniblockToKeep,
		t.trimmingBatchSize,
	)
	if err != nil {
		return err
	}

	// Check if any rows were deleted
	var deletedCount int
	for rows.Next() {
		deletedCount++
	}
	rows.Close()

	// Delete the pending task mark
	t.pendingTasksLock.Lock()
	delete(t.pendingTasks, task.streamId)
	t.pendingTasksLock.Unlock()

	// If we deleted a full batch, schedule another trim task
	if deletedCount == t.trimmingBatchSize {
		t.scheduleTrimTask(task.streamId, task.miniblocksToKeep)
	}

	return nil
}

// scheduleTrimTask schedules a new trim task for a stream
func (t *streamTrimmer) scheduleTrimTask(streamId StreamId, mbsToKeep int64) {
	t.pendingTasksLock.Lock()
	defer t.pendingTasksLock.Unlock()

	// Check if there's already a pending task for this stream
	if _, exists := t.pendingTasks[streamId]; exists {
		return
	}

	// Mark the stream as having a pending task
	t.pendingTasks[streamId] = struct{}{}

	// Create a new task
	task := trimTask{
		streamId:         streamId,
		miniblocksToKeep: mbsToKeep,
	}

	// Submit the task to the worker pool
	t.workerPool.Submit(func() {
		if err := t.processTrimTask(task); err != nil {
			t.log.Errorw("Failed to process trim task",
				"stream", task.streamId,
				"err", err,
			)
		}
	})
}

// onSnapshotMiniblockWritten is called when a new miniblock with a snapshot is created
func (t *streamTrimmer) onSnapshotMiniblockCreated(streamId StreamId) {
	// Schedule trimming for the given stream if the trimming for this type is enabled.
	mbsToKeep := int64(t.miniblocksToKeep.ForType(streamId.Type()))
	if mbsToKeep > 0 {
		t.scheduleTrimTask(streamId, mbsToKeep)
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
			rows, err := tx.Query(ctx, "SELECT stream_id FROM es WHERE ephemeral = false")
			if err != nil {
				return err
			}

			var stream string
			_, err = pgx.ForEachRow(rows, []any{&stream}, func() error {
				streamId, err := StreamIdFromString(stream)
				if err != nil {
					return err
				}

				// Check if the stream type can be trimmed
				mbsToKeep := int64(t.miniblocksToKeep.ForType(streamId.Type()))
				if mbsToKeep > 0 {
					t.scheduleTrimTask(streamId, mbsToKeep)
				}

				return nil
			})
			return err
		},
		nil,
	)
}
