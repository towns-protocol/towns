package storage

import (
	"context"
	"sync"
	"time"

	"github.com/gammazero/workerpool"
	"github.com/jackc/pgx/v5"
	"github.com/prometheus/client_golang/prometheus"

	. "github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/crypto"
	"github.com/towns-protocol/towns/core/node/infra"
	"github.com/towns-protocol/towns/core/node/logging"
	. "github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/shared"
)

// trimTask represents a task to trim miniblocks from a stream.
type trimTask struct {
	streamId             StreamId
	streamHistoryMbs     int64
	retentionIntervalMbs int64
}

// streamTrimmer handles periodic trimming of streams.
// It ensures that the number of miniblocks in a stream does not exceed a certain threshold and
// that snapshots are retained according to the configured retention interval.
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

	taskDuration prometheus.Histogram
}

// newStreamTrimmer creates a new stream trimmer
func newStreamTrimmer(
	ctx context.Context,
	store *PostgresStreamStore,
	config crypto.OnChainConfiguration,
	workerPool *workerpool.WorkerPool,
	trimmingBatchSize int64,
	metrics infra.MetricsFactory,
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
		taskDuration: metrics.NewHistogramEx(
			"stream_trimmer_task_duration_seconds",
			"Stream trimmer task duration in seconds",
			[]float64{0.1, 0.5, 1, 2, 4, 6, 8},
		),
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
	streamHistoryMbs := int64(cfg.StreamHistoryMiniblocks.ForType(streamId.Type()))

	var retentionIntervalMbs int64
	if interval := int64(cfg.StreamSnapshotIntervalInMiniblocks); interval > 0 {
		retentionIntervalMbs = max(interval, MinRetentionIntervalMiniblocks)
	}

	if streamHistoryMbs <= 0 && retentionIntervalMbs <= 0 {
		return
	}

	t.scheduleTrimTask(streamId, streamHistoryMbs, retentionIntervalMbs)
}

// scheduleTrimTask schedules a new trim task for the given stream
func (t *streamTrimmer) scheduleTrimTask(streamId StreamId, streamHistoryMbs, retentionIntervalMbs int64) {
	t.pendingTasksLock.Lock()
	if _, exists := t.pendingTasks[streamId]; exists {
		t.pendingTasksLock.Unlock()
		return
	}
	t.pendingTasks[streamId] = struct{}{}
	t.pendingTasksLock.Unlock()

	task := trimTask{
		streamId:             streamId,
		streamHistoryMbs:     streamHistoryMbs,
		retentionIntervalMbs: retentionIntervalMbs,
	}

	t.workerPool.Submit(func() {
		timer := prometheus.NewTimer(t.taskDuration)
		err := t.processTrimTask(task)
		timer.ObserveDuration()

		if err != nil {
			t.log.Errorw("Failed to process stream trimming task",
				"stream", task.streamId,
				"streamHistoryMbs", task.streamHistoryMbs,
				"retentionIntervalMbs", task.retentionIntervalMbs,
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
		"streamHistoryMbs", task.streamHistoryMbs,
		"retentionIntervalMbs", task.retentionIntervalMbs,
	)
}

// processTrimTaskTx processes a single trim task within a transaction
func (t *streamTrimmer) processTrimTaskTx(
	ctx context.Context,
	tx pgx.Tx,
	task trimTask,
) error {
	defer func() {
		t.pendingTasksLock.Lock()
		delete(t.pendingTasks, task.streamId)
		t.pendingTasksLock.Unlock()
	}()

	// Get the last snapshot miniblock number
	lastSnapshotMiniblock, err := t.store.lockStream(ctx, tx, task.streamId, true)
	if err != nil {
		return err
	}

	ranges, err := t.store.getMiniblockNumberRangesTxNoLock(ctx, tx, task.streamId)
	if err != nil {
		return err
	}

	// Stream not found, nothing to trim. This should not happen, but we handle it gracefully.
	if len(ranges) == 0 {
		return nil
	}

	// It is not allowed to trim a stream that has gaps. There is an exception for genesis miniblock mentioned below.
	if len(ranges) > 2 {
		return RiverError(Err_MINIBLOCKS_STORAGE_FAILURE, "Stream has gaps, skip trimming").Tags("ranges", ranges)
	}

	// If there are a gap in ranges, it is only possible to have the following:
	//  1. [0] - genesis miniblock only, no snapshots.
	//  2. [0+N...] - a complete range from Nth miniblock to the latest miniblock.
	if len(ranges) == 2 &&
		ranges[0].StartInclusive != 0 &&
		ranges[0].EndInclusive != 0 &&
		ranges[1].EndInclusive < lastSnapshotMiniblock {
		return RiverError(Err_MINIBLOCKS_STORAGE_FAILURE, "Stream has an unexpected gap, skip trimming").
			Tags("ranges", ranges)
	}

	latestRange := ranges[0]
	if len(ranges) > 0 {
		latestRange = ranges[len(ranges)-1]
	}

	nullifySnapshotMbs := DetermineStreamSnapshotsToNullify(
		latestRange.StartInclusive, lastSnapshotMiniblock-1, latestRange.SnapshotSeqNums,
		task.retentionIntervalMbs, MinKeepMiniblocks,
	)

	lastMbToKeep := lastSnapshotMiniblock - task.streamHistoryMbs
	if lastMbToKeep < 0 {
		lastMbToKeep = 0
	}

	// Deleting all miniblocks below the calculated miniblock with a snapshot which is the closest to the lastMbToKeep.
	localStartMbInclusive := FindClosestSnapshotMiniblock(ranges, lastMbToKeep)
	return t.store.trimStreamTxNoLock(ctx, tx, task.streamId, localStartMbInclusive, nullifySnapshotMbs)
}
