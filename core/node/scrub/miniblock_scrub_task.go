package scrub

import (
	"context"
	"fmt"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/gammazero/workerpool"
	"github.com/prometheus/client_golang/prometheus"

	"github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/events"
	"github.com/towns-protocol/towns/core/node/infra"
	"github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/storage"
)

type CorruptStreamRecord struct {
	StreamId             shared.StreamId
	Nodes                []common.Address
	MostRecentBlock      int64
	MostRecentLocalBlock int64
	FirstCorruptBlock    int64
	CorruptionReason     string
}

type CorruptStreamTrackingService interface {
	GetCorruptStreams(ctx context.Context) []CorruptStreamRecord
}

type MiniblockScrubber interface {
	ScheduleStreamMiniblocksScrub(
		ctx context.Context,
		streamId shared.StreamId,
		fromBlockNum int64,
	) error
	Close()
}

type miniblockScrubTaskProcessorImpl struct {
	store      storage.StreamStorage
	workerPool workerpool.WorkerPool
	reports    chan *MiniblockScrubReport

	// Metrics
	scrubQueueLength    prometheus.GaugeFunc
	scrubTasksCompleted *prometheus.CounterVec
	scrubScheduleCalls  *prometheus.CounterVec
}

var _ MiniblockScrubber = (*miniblockScrubTaskProcessorImpl)(nil)

type MiniblockScrubReport struct {
	StreamId            shared.StreamId
	LatestBlockScrubbed int64 // -1 if no blocks scrubbed
	FirstCorruptBlock   int64 // -1 if no blocks corrupt
	ScrubError          error
}

func newErrorReport(streamId shared.StreamId, scrubErr error, errorBlock int64) *MiniblockScrubReport {
	return &MiniblockScrubReport{
		StreamId:            streamId,
		LatestBlockScrubbed: errorBlock - 1,
		FirstCorruptBlock:   -1,
		ScrubError:          scrubErr,
	}
}

func newCorruptStreamReport(streamId shared.StreamId, scrubErr error, errorBlock int64) *MiniblockScrubReport {
	return &MiniblockScrubReport{
		StreamId:            streamId,
		LatestBlockScrubbed: errorBlock - 1,
		FirstCorruptBlock:   errorBlock,
		ScrubError:          scrubErr,
	}
}

func newSuccessReport(streamId shared.StreamId, latestBlockScrubbed int64) *MiniblockScrubReport {
	return &MiniblockScrubReport{
		StreamId:            streamId,
		LatestBlockScrubbed: latestBlockScrubbed,
		FirstCorruptBlock:   -1,
	}
}

func NewMiniblockScrubber(
	store storage.StreamStorage,
	numWorkers int,
	reports chan *MiniblockScrubReport,
	metrics infra.MetricsFactory,
) MiniblockScrubber {
	if numWorkers <= 0 {
		numWorkers = 100
	}

	proc := &miniblockScrubTaskProcessorImpl{
		store:      store,
		reports:    reports,
		workerPool: *workerpool.New(numWorkers),
	}

	if metrics != nil {
		proc.scrubQueueLength = metrics.NewGaugeFunc(
			prometheus.GaugeOpts{
				Name: "miniblock_scrubber_queue_length",
				Help: "Total outstanding scheduled tasks for the miniblock scrubber",
			},
			func() float64 { return float64(proc.workerPool.WaitingQueueSize()) },
		)
		proc.scrubTasksCompleted = metrics.NewCounterVecEx(
			"miniblock_scrubber_tasks_completed",
			"Total number of scrubs executed by the miniblock scrubber",
			"status",
		)
		proc.scrubScheduleCalls = metrics.NewCounterVecEx(
			"miniblock_scrubber_scrubs_scheduled",
			"Total number of times a stream was scheduled for a miniblock scrub",
			"status",
		)
	}

	return proc
}

// Close releases all miniblockScrubTaskProcessorImpl resources. It blocks until
// all go routines are stopped.
func (m *miniblockScrubTaskProcessorImpl) Close() {
	done := make(chan bool)

	go func() {
		m.workerPool.Stop()
		close(done)
	}()

	// Drain the reports queue so that the workerpool close is unblocked. (After
	// the task processor is closed, we do not expect the remaining reports
	// to be valuable to the consumer.)
	for {
		select {
		case <-m.reports:
			continue
		case <-done:
			return
		}
	}
}

var maxBlocksPerScan = 100

func optsFromPrevMiniblock(streamID shared.StreamId, prevMb *events.MiniblockInfo) *events.ParsedMiniblockInfoOpts {
	expectedPrevSnapshotNum := prevMb.Header().PrevSnapshotMiniblockNum
	if prevMb.Snapshot != nil {
		expectedPrevSnapshotNum = prevMb.Header().MiniblockNum
	}

	opts := events.NewParsedMiniblockInfoOpts().
		WithExpectedBlockNumber(prevMb.Header().MiniblockNum + 1).
		WithExpectedPrevMiniblockHash(prevMb.Ref.Hash).
		WithExpectedMinimumTimestampExclusive(prevMb.Header().Timestamp.AsTime()).
		WithExpectedPrevSnapshotMiniblockNum(expectedPrevSnapshotNum)

	// due to a bug (2025[Feb...April]), some media streams have an event offset of 0,
	// skip checking event offset in this time window for media streams if the previous block
	// has an event offset of 0. The time window is chosen wide because it's unclear when all
	// operators installed the release with the bug fix.
	doEventNumOffsetCheck := true
	if streamID.Type() == shared.STREAM_MEDIA_BIN {
		blockCreated := prevMb.Header().Timestamp.AsTime()
		startBugTimeWindow := time.Unix(1735686000, 0)
		endBugTimeWindow := time.Unix(1746050400, 0)
		if blockCreated.After(startBugTimeWindow) &&
			blockCreated.Before(endBugTimeWindow) &&
			prevMb.Header().EventNumOffset == 0 {
			doEventNumOffsetCheck = false
		}
	}

	if doEventNumOffsetCheck {
		opts = opts.WithExpectedEventNumOffset(prevMb.Header().EventNumOffset + int64(len(prevMb.Events())+1))
	}

	return opts
}

func (m *miniblockScrubTaskProcessorImpl) scrubMiniblocks(
	ctx context.Context,
	streamId shared.StreamId,
	fromBlockNumInclusive int64,
) *MiniblockScrubReport {
	blockNum := fromBlockNumInclusive
	latest, err := m.store.GetMaxArchivedMiniblockNumber(ctx, streamId)
	if err != nil {
		return newErrorReport(
			streamId,
			base.AsRiverError(err, protocol.Err_DB_OPERATION_FAILURE).
				Message("Unable to get last miniblock number for stream").
				Tag("streamId", streamId).
				Tag("fromBlockNum", fromBlockNumInclusive),
			blockNum,
		)
	}

	// Initialize miniblock options based on previous miniblock state
	// If the miniblock is block 0, an empty options is fine.
	opts := events.NewParsedMiniblockInfoOpts()
	if blockNum > 0 {
		prevBlock, _, err := m.store.ReadMiniblocks(ctx, streamId, blockNum-1, blockNum, false)
		if err != nil || len(prevBlock) < 1 {
			if len(prevBlock) < 1 {
				err = fmt.Errorf("previous miniblock was not available")
			}

			return newErrorReport(
				streamId,
				base.AsRiverError(err, protocol.Err_DB_OPERATION_FAILURE).
					Message("Unable to read previous miniblock for stream").
					Tag("streamId", streamId).
					Tag("fromBlockNum", fromBlockNumInclusive).
					Tag("prevBlock", blockNum-1),
				blockNum,
			)
		}

		prevMb, err := events.NewMiniblockInfoFromDescriptor(prevBlock[0])
		if err != nil {
			// Don't return a corruption error here because the previous block is outside
			// of the range we were given to check.
			return newErrorReport(
				streamId,
				base.AsRiverError(err, protocol.Err_BAD_BLOCK).
					Message("Unable to parse previous miniblock for stream").
					Tag("streamId", streamId).
					Tag("fromBlockNum", fromBlockNumInclusive).
					Tag("prevBlock", blockNum-1),
				blockNum,
			)
		}

		opts = optsFromPrevMiniblock(streamId, prevMb)
	} else {
		opts = opts.
			WithExpectedBlockNumber(0).
			WithExpectedEventNumOffset(0).
			WithExpectedPrevMiniblockHash(common.Hash{}).
			WithExpectedPrevSnapshotMiniblockNum(0)
	}

	for blockNum <= latest {
		toExclusive := min(blockNum+int64(maxBlocksPerScan), latest+1)
		blocks, _, err := m.store.ReadMiniblocks(ctx, streamId, blockNum, toExclusive, false)
		if err != nil {
			return newErrorReport(
				streamId,
				base.AsRiverError(err, protocol.Err_DB_OPERATION_FAILURE).
					Message("Unable to read miniblocks for stream").
					Tag("streamId", streamId).
					Tag("fromInclusive", blockNum).
					Tag("toExclusive", blockNum+int64(maxBlocksPerScan)),
				blockNum,
			)
		}

		if len(blocks) == 0 {
			return newErrorReport(
				streamId,
				base.RiverError(
					protocol.Err_DB_OPERATION_FAILURE,
					"Unable to read latest miniblocks for stream").
					Tag("streamId", streamId).
					Tag("lastAvailableBlockNum", blockNum-1).
					Tag("latestBlockNum", latest),
				blockNum,
			)
		}

		for offset, block := range blocks {
			mbInfo, err := events.NewMiniblockInfoFromDescriptorWithOpts(block, opts)
			if err != nil {
				err = base.AsRiverError(err, protocol.Err_DB_OPERATION_FAILURE).
					Message("Failed to validate miniblock").
					Tag("streamId", streamId).
					Tag("miniblockNum", blockNum+int64(offset))
				return newCorruptStreamReport(streamId, err, blockNum+int64(offset))
			}
			opts = optsFromPrevMiniblock(streamId, mbInfo)
		}
		blockNum = blockNum + int64(len(blocks))
	}

	return newSuccessReport(streamId, latest)
}

func (m *miniblockScrubTaskProcessorImpl) ScheduleStreamMiniblocksScrub(
	ctx context.Context,
	streamId shared.StreamId,
	fromBlockNum int64,
) (err error) {
	if m.scrubScheduleCalls != nil {
		defer func() {
			if err == nil {
				m.scrubScheduleCalls.WithLabelValues("submitted").Inc()
			} else {
				m.scrubScheduleCalls.WithLabelValues("error").Inc()
			}
		}()
	}

	latest, err := m.store.GetMaxArchivedMiniblockNumber(ctx, streamId)
	if err != nil {
		return base.AsRiverError(err, protocol.Err_DB_OPERATION_FAILURE).
			Func("ScheduleStreamMiniblockScrub").
			Message("Unable to fetch latest miniblock number of stream").
			Tag("streamId", streamId).
			Tag("fromBlockNum", fromBlockNum)
	}

	if latest < fromBlockNum {
		return base.RiverError(protocol.Err_MINIBLOCK_TOO_NEW, "Miniblock has not caught up to fromBlockNum").
			Func("ScheduleStreamMiniblockScrub").
			Tag("streamId", streamId).
			Tag("fromBlockNum", fromBlockNum).
			Tag("latest", latest)
	}

	m.workerPool.Submit(
		func() {
			report := m.scrubMiniblocks(ctx, streamId, fromBlockNum)
			m.reports <- report
			if m.scrubTasksCompleted != nil {
				status := "ok"
				if report.ScrubError != nil {
					if report.FirstCorruptBlock != -1 {
						status = "corrupt"
					} else {
						status = "error"
					}
				}
				m.scrubTasksCompleted.WithLabelValues(status).Inc()
			}
		},
	)

	return nil
}
