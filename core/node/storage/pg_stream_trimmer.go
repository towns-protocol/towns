package storage

import (
	"bytes"
	"context"
	"math"
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
	// targetMiniblock is the per-streamId trim target from on-chain config.
	// -1 means no per-streamId target is configured.
	targetMiniblock int64
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
	pendingTasksLock       sync.Mutex
	pendingTasks           map[StreamId]struct{}
	snapshotsPerStreamLock sync.Mutex
	snapshotsPerStream     map[StreamId]uint64

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
		ctx:                ctx,
		log:                logging.FromCtx(ctx).Named("stream-trimmer"),
		store:              store,
		config:             config,
		trimmingBatchSize:  trimmingBatchSize,
		workerPool:         workerPool,
		pendingTasks:       make(map[StreamId]struct{}),
		snapshotsPerStream: make(map[StreamId]uint64),
		stop:               make(chan struct{}),
		taskDuration: metrics.NewHistogramEx(
			"stream_trimmer_task_duration_seconds",
			"Stream trimmer task duration in seconds",
			[]float64{0.1, 0.5, 1, 2, 4, 6, 8},
		),
	}

	// Start the worker pool
	go st.monitorWorkerPool(ctx)

	// schedule a trim task for each stream that needs to be trimmed according to on-chain config.
	for _, streamToTrim := range config.Get().StreamTrimByStreamId {
		st.tryScheduleTrimming(streamToTrim.StreamId)
	}

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

// getTrimTargetForStream returns the configured per-streamId trim target.
// Returns (target, true) if configured, (-1, false) if not.
func (t *streamTrimmer) getTrimTargetForStream(streamId StreamId) (int64, bool) {
	cfg := t.config.Get()
	for _, entry := range cfg.StreamTrimByStreamId {
		if bytes.Equal(entry.StreamId[:], streamId[:]) {
			return int64(entry.MiniblockNum), true
		}
	}
	return -1, false
}

// tryScheduleTrimming checks if the given stream type is trimmable and schedules trimming if it is.
// TODO: Review the logic on when to trim the stream.
func (t *streamTrimmer) tryScheduleTrimming(streamId StreamId) {
	if t.workerPool.Stopped() ||
		t.workerPool.WaitingQueueSize() >= maxWorkerPoolPendingTasks {
		return
	}

	task, ok := t.computeTrimTask(streamId)
	if !ok {
		return
	}

	t.scheduleTrimTask(task)
}

func (t *streamTrimmer) computeTrimTask(streamId StreamId) (trimTask, bool) {
	cfg := t.config.Get()

	var task trimTask

	if cfg.StreamTrimActivationFactor == 0 {
		return task, false
	}

	if cfg.MinSnapshotEvents.ForType(streamId.Type()) == 0 {
		return task, false
	}

	streamHistoryCfg := cfg.StreamHistoryMiniblocks.ForType(streamId.Type())
	var streamHistoryMbs int64
	if streamHistoryCfg >= uint64(math.MaxInt64) {
		streamHistoryMbs = math.MaxInt64
	} else {
		streamHistoryMbs = int64(streamHistoryCfg)
	}

	var retentionIntervalMbs int64
	if interval := int64(cfg.StreamSnapshotIntervalInMiniblocks); interval > 0 {
		retentionIntervalMbs = max(interval, MinRetentionIntervalMiniblocks)
	}

	// Get per-streamId trim target from on-chain config
	targetMiniblock, hasTarget := t.getTrimTargetForStream(streamId)

	// If no per-type trimming is configured and no per-streamId target, skip
	if streamHistoryMbs <= 0 && retentionIntervalMbs <= 0 && !hasTarget {
		return task, false
	}

	var shouldSchedule bool

	// Per-streamId targets should schedule immediately (bypass activation factor).
	// This ensures dormant streams with configured targets are trimmed at startup.
	if hasTarget {
		shouldSchedule = true
	} else {
		t.snapshotsPerStreamLock.Lock()
		count := t.snapshotsPerStream[streamId] + 1
		if count%cfg.StreamTrimActivationFactor != 0 {
			t.snapshotsPerStream[streamId] = count % cfg.StreamTrimActivationFactor
		} else {
			delete(t.snapshotsPerStream, streamId)
			shouldSchedule = true
		}
		t.snapshotsPerStreamLock.Unlock()
	}

	if !shouldSchedule {
		return task, false
	}

	return trimTask{
		streamId:             streamId,
		streamHistoryMbs:     streamHistoryMbs,
		retentionIntervalMbs: retentionIntervalMbs,
		targetMiniblock:      targetMiniblock,
	}, true
}

// scheduleTrimTask schedules a new trim task for the given stream
func (t *streamTrimmer) scheduleTrimTask(task trimTask) {
	t.pendingTasksLock.Lock()
	if _, exists := t.pendingTasks[task.streamId]; exists {
		t.pendingTasksLock.Unlock()
		return
	}
	t.pendingTasks[task.streamId] = struct{}{}
	t.pendingTasksLock.Unlock()

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

		t.pendingTasksLock.Lock()
		delete(t.pendingTasks, task.streamId)
		t.pendingTasksLock.Unlock()
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
	// Get the last snapshot miniblock number
	lockStream, err := t.store.lockStream(ctx, tx, task.streamId, true)
	if err != nil {
		return err
	}

	lastSnapshotMiniblock := lockStream.LastSnapshotMiniblock

	ranges, err := t.store.getMiniblockNumberRangesTxNoLock(ctx, tx, task.streamId, lockStream)
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
	if lastMbToKeep < 0 || task.streamHistoryMbs <= 0 {
		lastMbToKeep = 0
	}

	// Apply per-streamId target if configured.
	// The per-streamId target specifies the miniblock number to trim to (delete everything before it).
	// We take the maximum of per-type and per-streamId targets to ensure we don't trim more than either allows.
	if task.targetMiniblock > 0 && task.targetMiniblock > lastMbToKeep {
		lastMbToKeep = task.targetMiniblock
	}

	// Deleting all miniblocks below the calculated miniblock with a snapshot which is the closest to the lastMbToKeep.
	localStartMbInclusive := FindClosestSnapshotMiniblock(ranges, lastMbToKeep)
	return t.store.trimStreamTxNoLock(ctx, tx, task.streamId, localStartMbInclusive, nullifySnapshotMbs)
}
