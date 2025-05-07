package storage

import (
	"context"
	"sync"

	"github.com/gammazero/workerpool"
	"github.com/jackc/pgx/v5"

	"github.com/towns-protocol/towns/core/node/logging"
	. "github.com/towns-protocol/towns/core/node/shared"
)

// trimTask represents a task to trim miniblocks from a stream
type trimTask struct {
	streamId StreamId
}

// streamTrimmer handles periodic trimming of space streams
type streamTrimmer struct {
	store *PostgresStreamStore
	// miniblocksToKeep is the number of miniblocks to keep before the last snapshot
	miniblocksToKeep int64
	log              *logging.Log

	// Worker pool for trimming operations
	workerPool *workerpool.WorkerPool

	// Stream management
	streamsLock sync.Mutex
	streams     []StreamId

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
	miniblocksToKeep int64,
) (*streamTrimmer, error) {
	st := &streamTrimmer{
		store:            store,
		miniblocksToKeep: miniblocksToKeep,
		log:              logging.FromCtx(ctx),
		workerPool:       workerpool.New(4),
		pendingTasks:     make(map[StreamId]struct{}),
		stop:             make(chan struct{}),
	}

	// Schedule trimming for existing space streams
	if err := st.scheduleSpaceStreamsTrimming(ctx); err != nil {
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
func (t *streamTrimmer) processTrimTask(ctx context.Context, task trimTask) error {
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
	miniblockToKeep := lastSnapshotMiniblock - t.miniblocksToKeep
	if miniblockToKeep <= 0 {
		return nil // Nothing to trim
	}

	// Delete miniblocks in a single batch
	const batchSize = 1000
	rows, err := tx.Query(
		ctx,
		t.store.sqlForStream(
			`WITH rows_to_delete AS (
				SELECT ctid
				FROM {{miniblocks}}
				WHERE stream_id = $1 AND seq_num < $2
				LIMIT $3
			)
			DELETE FROM {{miniblocks}}
			WHERE ctid IN (SELECT ctid FROM rows_to_delete)
			RETURNING *`,
			task.streamId,
		),
		task.streamId,
		miniblockToKeep,
		batchSize,
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

	// If we deleted a full batch, schedule another task
	if deletedCount == batchSize {
		t.scheduleTrimTask(task.streamId)
	}

	return nil
}

// scheduleTrimTask schedules a new trim task for a stream
func (t *streamTrimmer) scheduleTrimTask(streamId StreamId) {
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
		streamId: streamId,
	}

	// Submit the task to the worker pool
	t.workerPool.Submit(func() {
		// Create a new context for the task
		ctx := context.Background()
		if err := t.processTrimTask(ctx, task); err != nil {
			t.log.Errorw("Failed to process trim task",
				"stream", task.streamId,
				"err", err,
			)
		}

		// Remove the pending task mark
		t.pendingTasksLock.Lock()
		delete(t.pendingTasks, streamId)
		t.pendingTasksLock.Unlock()
	})
}

// onSnapshotMiniblockWritten is called when a new miniblock with a snapshot is created
func (t *streamTrimmer) onSnapshotMiniblockCreated(streamId StreamId) {
	if !ValidSpaceStreamId(&streamId) {
		return
	}

	t.scheduleTrimTask(streamId)
}

// close stops the stream trimmer
func (t *streamTrimmer) close() {
	t.stopOnce.Do(func() {
		close(t.stop)
	})
	t.workerPool.StopWait()
}

// scheduleSpaceStreamsTrimming schedules trimming for all space streams.
func (t *streamTrimmer) scheduleSpaceStreamsTrimming(ctx context.Context) error {
	return t.store.txRunner(
		ctx,
		"streamTrimmer.loadSpaceStreams",
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

				if ValidSpaceStreamId(&streamId) {
					t.scheduleTrimTask(streamId)
				}

				return nil
			})
			return err
		},
		nil,
	)
}
