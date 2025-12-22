package rpc

import (
	"context"
	"errors"
	"fmt"
	"sync"
	"sync/atomic"
	"time"

	"connectrpc.com/connect"
	"github.com/ethereum/go-ethereum/common"
	"github.com/prometheus/client_golang/prometheus"

	"github.com/towns-protocol/towns/core/config"
	"github.com/towns-protocol/towns/core/contracts/river"
	. "github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/events"
	"github.com/towns-protocol/towns/core/node/infra"
	"github.com/towns-protocol/towns/core/node/logging"
	"github.com/towns-protocol/towns/core/node/nodes"
	. "github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/registries"
	. "github.com/towns-protocol/towns/core/node/rpc/headers"
	"github.com/towns-protocol/towns/core/node/scrub"
	. "github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/storage"
)

type CorruptionReason int

const (
	NotCorrupt CorruptionReason = iota
	FetchFailed
	ScrubFailed
)

// StreamCorruptionTracker tracks events and metadata that determine a stream's corrupted state.
// Strams are considered corrupt if they are reported as corrupt from a miniblcok scrub, or they
// can be considered corrupt if the archiver consistently fails to update the stream to the current
// block. New trackers are best made with the NewStreamCorruptionTracker method, as the default
// value of some field types do not match what the initial values should be upon creation.
// StreamCorruptionTracker method access is thread safe.
type StreamCorruptionTracker struct {
	mu sync.RWMutex

	// All below fields must be updated in tandem under lock.

	corrupt          bool
	corruptionReason CorruptionReason

	firstCorruptBlock int64

	// Scrubbing metadata
	latestScrubbedBlock int64
	corruptionError     error

	// Update failure metadata
	lastUpdatedBlock          int64
	consecutiveUpdateFailures uint32

	// Corresponding archive stream. Read-only, set on creation.
	parent *ArchiveStream

	// maximum failed consecutive updates. Read-only, set on creation.
	maxFailedConsecutiveUpdates uint32
}

func (ct *StreamCorruptionTracker) GetConsecutiveUpdateFailures() uint32 {
	ct.mu.RLock()
	defer ct.mu.RUnlock()

	return ct.consecutiveUpdateFailures
}

func (ct *StreamCorruptionTracker) IsCorrupt() bool {
	ct.mu.RLock()
	defer ct.mu.RUnlock()

	return ct.corrupt
}

// RecordBlockUpdateFailure increments the internal tracker of the number of
// times we have failed to update the stream from it's current number of miniblocks.
// Whenever a stream fully updates up to the current block number as it is stored
// in the contract, or if the block number advances at all, this counter is reset.
// If the stream fails to update `maxFailedConsecutiveUpdates` times, it will be
// considered corrupt. This is because we suspect the stream may be unavailable
// due to a bad block, although it's also quite likely to be an intermittent node
// availability issue.
func (ct *StreamCorruptionTracker) RecordBlockUpdateFailure(ctx context.Context, err error) {
	ct.mu.Lock()
	defer ct.mu.Unlock()

	// If this task run was able to advance the number of blocks, let's reset the update
	// failure counter.
	if ct.parent.numBlocksInDb.Load()-1 > ct.lastUpdatedBlock {
		logging.FromCtx(ctx).Debugw(
			"Update failure still saw progress, resetting",
			"streamId",
			ct.parent.streamId,
			"error",
			err,
		)
		ct.resetLocked()
		return
	}

	ct.consecutiveUpdateFailures = ct.consecutiveUpdateFailures + 1
	if ct.consecutiveUpdateFailures >= ct.maxFailedConsecutiveUpdates && !ct.corrupt {
		ct.corrupt = true
		ct.corruptionReason = FetchFailed
		ct.firstCorruptBlock = max(ct.parent.numBlocksInDb.Load(), 0)
		logging.FromCtx(ctx).Debugw(
			"Incrementing update failures for stream and toggling corrupt=true",
			"streamId", ct.parent.streamId,
			"numBlocksInDb", ct.parent.numBlocksInDb.Load(),
			"lastUpdatedBlock", ct.lastUpdatedBlock,
			"isCorrupt", ct.corrupt,
			"corruptionReason", ct.corruptionReason,
			"consecutiveUpdateFailures", ct.consecutiveUpdateFailures,
			"error", err,
		)
	} else {
		if ct.consecutiveUpdateFailures > 0 && ct.consecutiveUpdateFailures%5 == 0 {
			logging.FromCtx(ctx).Debugw(
				"Incrementing update failures for stream",
				"numBlocksInDb", ct.parent.numBlocksInDb.Load(),
				"lastUpdatedBlock", ct.lastUpdatedBlock,
				"streamId", ct.parent.streamId,
				"isCorrupt", ct.corrupt,
				"corruptionReason", ct.corruptionReason,
				"consecutiveUpdateFailures", ct.consecutiveUpdateFailures,
				"error", err,
			)
		}
	}
}

func (ct *StreamCorruptionTracker) resetLocked() {
	ct.consecutiveUpdateFailures = 0
	ct.lastUpdatedBlock = max(ct.parent.numBlocksInDb.Load()-1, -1)

	// If the stream was marked corrupt because it was failing to fetch, this may
	// have been temporary unavailability due to an upgrade, operator outage, etc.
	// In this case once fetches to the stream are successful we'd like to mark the
	// stream as not corrupt. However, if a miniblock was detected as corrupt during
	// a stream miniblock scrub, it does not matter if the stream is fetchable on
	// the network, as it's corrupt even if it's available.
	if ct.corrupt && ct.corruptionReason == FetchFailed {
		ct.corrupt = false
		ct.firstCorruptBlock = -1
		ct.corruptionReason = NotCorrupt
	}
}

func (ct *StreamCorruptionTracker) ReportBlockUpdateSuccess(ctx context.Context) {
	ct.mu.Lock()
	defer ct.mu.Unlock()

	logging.FromCtx(ctx).Debugw("BlockUpdateSuccess", "streamId", ct.parent.streamId)
	ct.resetLocked()
}

// MarkBlockCorrupt marks a block corrupt as a result of a failed scrub.
// If the stream was already marked as corrupt, say due to persistent failure to update,
// this method will update the corruption reason and the first corrupt block.
func (ct *StreamCorruptionTracker) MarkBlockCorrupt(blockNum int64, scrubErr error) error {
	ct.mu.Lock()
	defer ct.mu.Unlock()

	if blockNum <= ct.latestScrubbedBlock {
		return AsRiverError(
			fmt.Errorf("corrupt block was already marked well-formed"),
			Err_INTERNAL,
		).Func("CorruptionTracker.MarkBlockCorrupt").
			Tag("latestScrubbedBlock", ct.latestScrubbedBlock).
			Tag("blockNum", blockNum)
	}

	if ct.corrupt && ct.corruptionReason == ScrubFailed && blockNum < ct.firstCorruptBlock {
		return AsRiverError(
			fmt.Errorf("corrupt block was already marked well-formed"),
			Err_INTERNAL,
		).Func("CorruptionTracker.MarkBlockCorrupt").
			Tag("latestScrubbedBlock", ct.latestScrubbedBlock).
			Tag("firstCorruptBlock", ct.firstCorruptBlock).
			Tag("blockNum", blockNum)
	}

	ct.corrupt = true
	// Scrub failure is a "stronger" corruption reason than fetch failure since it is not
	// potentially induced by intermittent availability or networking errors. If we detect
	// a corrupt miniblock from scrubbing, mark the stream as corrupt for this reason and
	// record the earliest detected corrupt miniblock. Since the correctness of later
	// miniblocks depends on previous miniblocks, it doesn't necessarily make sense to consider
	// scrubbing any miniblocks after this one, either.
	if ct.corruptionReason != ScrubFailed {
		ct.corruptionReason = ScrubFailed
		ct.firstCorruptBlock = blockNum
		// We always run the scrubber starting at the lowest block number that has not yet been
		// scrubbed, so if we detect a corrupt block from scrubbing, we are guaranteed that the
		// previous block was well-formed.
		ct.latestScrubbedBlock = blockNum - 1
		ct.corruptionError = scrubErr
	}

	return nil
}

func (ct *StreamCorruptionTracker) ReportScrubSuccess(ctx context.Context, blockNum int64) error {
	ct.mu.Lock()
	defer ct.mu.Unlock()

	if ct.corrupt && ct.corruptionReason == ScrubFailed {
		if blockNum >= ct.firstCorruptBlock {
			// This really should not happen. We should never see a scrub succeed where another
			// scrub failed. The code is (should be) written so that scrubbing fails on the first corrupt
			// miniblock, and we can never skip scrubbing a miniblock in a stream unless it is confirmed
			// that we have already scrubbed that miniblock. Furthermore, miniblock scrubbing is
			// deterministic.
			return AsRiverError(fmt.Errorf("successful scrub occurred after a failed scrub"), Err_INTERNAL).
				Tag("corruptBlock", ct.firstCorruptBlock).
				Tag("scrubUntilBlockInclusive", blockNum).
				Func("ReportScrubSuccess").
				Log(logging.FromCtx(ctx))
		}
	}

	if ct.latestScrubbedBlock < blockNum {
		ct.latestScrubbedBlock = blockNum
	}
	return nil
}

func (ct *StreamCorruptionTracker) GetLatestScrubbedBlock() int64 {
	ct.mu.RLock()
	defer ct.mu.RUnlock()

	return ct.latestScrubbedBlock
}

func (ct *StreamCorruptionTracker) GetCorruptionReason() CorruptionReason {
	ct.mu.RLock()
	defer ct.mu.RUnlock()

	return ct.corruptionReason
}

func (ct *StreamCorruptionTracker) GetScrubError() error {
	ct.mu.RLock()
	defer ct.mu.RUnlock()

	return ct.corruptionError
}

func (ct *StreamCorruptionTracker) GetFirstCorruptBlock() int64 {
	ct.mu.RLock()
	defer ct.mu.RUnlock()

	return ct.firstCorruptBlock
}

func (ct *StreamCorruptionTracker) GetConsecutiveFailedUpdates() uint32 {
	ct.mu.RLock()
	defer ct.mu.RUnlock()

	return ct.consecutiveUpdateFailures
}

func (ct *StreamCorruptionTracker) SetParent(parent *ArchiveStream) {
	ct.parent = parent
	ct.lastUpdatedBlock = parent.numBlocksInDb.Load() - 1
}

// NewStreamCorruptionTracker returns a new CorruptionTracker. A constructor is needed because
// the default values of some fields are nonzero.
func NewStreamCorruptionTracker(maxFailedConsecutiveUpdates uint32) StreamCorruptionTracker {
	return StreamCorruptionTracker{
		latestScrubbedBlock:         -1,
		firstCorruptBlock:           -1,
		lastUpdatedBlock:            -1,
		maxFailedConsecutiveUpdates: maxFailedConsecutiveUpdates,
	}
}

type ArchiveStream struct {
	streamId StreamId
	nodes    nodes.StreamNodes

	// registryState describes the state of the stream as reported by the stream
	// registry.
	numBlocksInContract atomic.Int64
	numBlocksInDb       atomic.Int64 // -1 means not loaded

	scrubInProgress         atomic.Bool
	mostRecentScrubbedBlock atomic.Int64

	corrupt StreamCorruptionTracker

	// Mutex is used so only one archive operation is performed at a time.
	// It also protects non-atomic fields that track stream corruption state.
	mu sync.Mutex
}

func NewArchiveStream(
	streamId StreamId,
	nn []common.Address,
	lastKnownMiniblock uint64,
	maxConsecutiveFailedUpdates uint32,
) *ArchiveStream {
	stream := &ArchiveStream{
		streamId: streamId,
		nodes:    nodes.NewStreamNodesWithLock(len(nn), nn, common.Address{}),
		corrupt:  NewStreamCorruptionTracker(maxConsecutiveFailedUpdates),
	}
	stream.numBlocksInContract.Store(int64(lastKnownMiniblock + 1))
	stream.numBlocksInDb.Store(-1)
	stream.mostRecentScrubbedBlock.Store(-1)
	// Set circular reference
	stream.corrupt.SetParent(stream)

	return stream
}

type Archiver struct {
	config       *config.ArchiveConfig
	contract     *registries.RiverRegistryContract
	nodeRegistry nodes.NodeRegistry
	storage      storage.StreamStorage

	// Miniblock scrubbing
	scrubber scrub.MiniblockScrubber
	reports  chan *scrub.MiniblockScrubReport

	// Task management
	tasks     chan StreamId
	workersWG sync.WaitGroup

	// tasksWG is used in single run mode: it archives everything there is to archive and exits
	tasksWG *sync.WaitGroup

	streams sync.Map

	// set to done when archiver has started
	startedWG sync.WaitGroup

	// Statistics
	streamsExamined            atomic.Uint64
	streamsCreated             atomic.Uint64
	streamsUpToDate            atomic.Uint64
	successOpsCount            atomic.Uint64
	failedOpsCount             atomic.Uint64
	miniblocksProcessed        atomic.Uint64
	newStreamAllocated         atomic.Uint64
	streamPlacementUpdated     atomic.Uint64
	streamLastMiniblockUpdated atomic.Uint64
	scrubsInProgress           atomic.Int64

	// metrics
	nodeAdvances        *prometheus.CounterVec
	successfulDownloads *prometheus.CounterVec

	cancelFuncs []func()
}

type ArchiverStats struct {
	StreamsExamined            uint64
	StreamsCreated             uint64
	StreamsUpToDate            uint64
	SuccessOpsCount            uint64
	FailedOpsCount             uint64
	MiniblocksProcessed        uint64
	NewStreamAllocated         uint64
	StreamPlacementUpdated     uint64
	StreamLastMiniblockUpdated uint64
	StreamScrubsInProgress     int64
	TasksQueued                int
}

func NewArchiver(
	config *config.ArchiveConfig,
	contract *registries.RiverRegistryContract,
	nodeRegistry nodes.NodeRegistry,
	storage storage.StreamStorage,
) *Archiver {
	reports := make(chan *scrub.MiniblockScrubReport, 50)
	a := &Archiver{
		config:       config,
		contract:     contract,
		nodeRegistry: nodeRegistry,
		storage:      storage,
		tasks:        make(chan StreamId, config.GetTaskQueueSize()),
		reports:      reports,
	}
	a.startedWG.Add(1)
	return a
}

func (a *Archiver) setupStatisticsMetrics(factory infra.MetricsFactory) {
	factory.NewGaugeFunc(
		prometheus.GaugeOpts{
			Name: "stats_streams_examined",
			Help: "Total streams monitored by the archiver",
		},
		func() float64 { return float64(a.streamsExamined.Load()) },
	)
	factory.NewGaugeFunc(
		prometheus.GaugeOpts{
			Name: "stats_streams_created",
			Help: "Total streams allocated on disk by the archiver since the last boot",
		},
		func() float64 { return float64(a.streamsCreated.Load()) },
	)
	factory.NewGaugeFunc(
		prometheus.GaugeOpts{
			Name: "stats_streams_up_to_date",
			Help: "Total ArchiveStream executions where stream was already up to date",
		},
		func() float64 { return float64(a.streamsUpToDate.Load()) },
	)
	factory.NewGaugeFunc(
		prometheus.GaugeOpts{
			Name: "stats_success_ops_count",
			Help: "Total successful ArchiveStream executions",
		},
		func() float64 { return float64(a.successOpsCount.Load()) },
	)
	factory.NewGaugeFunc(
		prometheus.GaugeOpts{
			Name: "stats_failed_ops_count",
			Help: "Total ArchiveStream executions that produced errors",
		},
		func() float64 { return float64(a.failedOpsCount.Load()) },
	)
	factory.NewGaugeFunc(
		prometheus.GaugeOpts{
			Name: "stats_miniblocks_processed",
			Help: "Total miniblocks downloaded and stored since the last boot",
		},
		func() float64 { return float64(a.miniblocksProcessed.Load()) },
	)
	factory.NewGaugeFunc(
		prometheus.GaugeOpts{
			Name: "stats_new_stream_allocated",
			Help: "Total streams allocated in response to detected stream allocation events",
		},
		func() float64 { return float64(a.newStreamAllocated.Load()) },
	)
	factory.NewGaugeFunc(
		prometheus.GaugeOpts{
			Name: "stats_stream_placement_updated",
			Help: "Total stream placement changes",
		},
		func() float64 { return float64(a.streamPlacementUpdated.Load()) },
	)
	factory.NewGaugeFunc(
		prometheus.GaugeOpts{
			Name: "stats_stream_last_miniblock_updated",
			Help: "Total miniblock update events",
		},
		func() float64 { return float64(a.streamLastMiniblockUpdated.Load()) },
	)
	factory.NewGaugeFunc(
		prometheus.GaugeOpts{
			Name: "stats_scrubber_streams_in_progress",
			Help: "Total number of stream miniblock scrubs in progress",
		},
		func() float64 { return float64(a.scrubsInProgress.Load()) },
	)

	factory.NewGaugeFunc(
		prometheus.GaugeOpts{
			Name: "stats_tasks_queued",
			Help: "Total number of tasks currently queued for the archive service",
		},
		func() float64 { return float64(len(a.tasks)) },
	)

	a.nodeAdvances = factory.NewCounterVecEx(
		"node_advances",
		"Total times a node was advanced, indicating it was behind or returned an error response",
		"node_address",
	)

	a.successfulDownloads = factory.NewCounterVecEx(
		"successful_downloads",
		"Total times a node gave the latest miniblock content to the archival service, according to the contract",
		"node_address",
	)
}

func (a *Archiver) GetCorruptStreams(ctx context.Context) []scrub.CorruptStreamRecord {
	corruptStreams := []scrub.CorruptStreamRecord{}

	a.streams.Range(
		func(key, value any) bool {
			stream, ok := value.(*ArchiveStream)
			if ok {
				// Take a lock on the corruption tracker to get a coherent state from it
				// this will require us to access members directly since the getters use RLocks
				stream.corrupt.mu.Lock()
				defer stream.corrupt.mu.Unlock()

				if stream.corrupt.corrupt {
					corruptionReason := "unable_to_update_stream"
					if stream.corrupt.corruptionReason == ScrubFailed {
						corruptionReason = "scrub_failed"
					}
					record := scrub.CorruptStreamRecord{
						StreamId:             stream.streamId,
						Nodes:                stream.nodes.GetQuorumNodes(),
						MostRecentBlock:      stream.numBlocksInContract.Load(),
						MostRecentLocalBlock: stream.numBlocksInDb.Load(),
						FirstCorruptBlock:    stream.corrupt.firstCorruptBlock,
						CorruptionReason:     corruptionReason,
					}
					corruptStreams = append(corruptStreams, record)
				}
			} else if !ok {
				logging.FromCtx(ctx).
					Errorw("Unexpected value stored in stream cache (not an ArchiveStream)", "value", value)
			}

			return true
		},
	)

	return corruptStreams
}

func (a *Archiver) addNewStream(
	ctx context.Context,
	streamId StreamId,
	nn []common.Address,
	lastKnownMiniblock uint64,
) {
	_, loaded := a.streams.LoadOrStore(
		streamId,
		NewArchiveStream(streamId, nn, lastKnownMiniblock, a.config.GetMaxConsecutiveFailedUpdates()),
	)
	if loaded {
		// TODO: Double notification, shouldn't happen.
		logging.FromCtx(ctx).
			Errorw("Stream already exists in archiver map", "streamId", streamId, "lastKnownMiniblock", lastKnownMiniblock)
		return
	}

	a.tasks <- streamId

	a.streamsExamined.Add(1)
}

func (a *Archiver) advanceNodeAndRetryWithDelay(stream *ArchiveStream, delay time.Duration) {
	nodeAddr := stream.nodes.GetStickyPeer()
	if a.nodeAdvances != nil {
		a.nodeAdvances.With(prometheus.Labels{"node_address": nodeAddr.String()}).Inc()
	}
	stream.nodes.AdvanceStickyPeer(nodeAddr)

	// Continue to retry with a much lower frequency if the stream has failed to update
	// past the threshold at which we consider it unavailable.
	if stream.corrupt.GetConsecutiveFailedUpdates() >= a.config.GetMaxConsecutiveFailedUpdates() {
		delay = max(delay, time.Minute)
	}

	time.AfterFunc(delay, func() {
		a.tasks <- stream.streamId
	})
}

// ArchiveStream attempts to add all new miniblocks seen, according to the registry contract,
// since the last time the stream was archived into storage.  It creates a new stream for
// streams that have not yet been seen.
func (a *Archiver) ArchiveStream(ctx context.Context, stream *ArchiveStream) (err error) {
	defer func() {
		if err != nil {
			stream.corrupt.RecordBlockUpdateFailure(ctx, err)
		}
	}()
	log := logging.FromCtx(ctx)

	if !stream.mu.TryLock() {
		// Reschedule with delay.
		streamId := stream.streamId
		time.AfterFunc(time.Second, func() {
			a.tasks <- streamId
		})
		return nil
	}
	defer stream.mu.Unlock()

	mbsInDb := stream.numBlocksInDb.Load()

	// Check if stream info was loaded from db.
	if mbsInDb <= -1 {
		maxBlockNum, err := a.storage.GetMaxArchivedMiniblockNumber(ctx, stream.streamId)
		if err != nil && IsRiverErrorCode(err, Err_NOT_FOUND) {
			err = a.storage.CreateStreamArchiveStorage(ctx, stream.streamId)
			if err != nil {
				return err
			}
			a.streamsCreated.Add(1)

			mbsInDb = 0
			stream.numBlocksInDb.Store(mbsInDb)
		} else if err != nil {
			return err
		} else {
			mbsInDb = maxBlockNum + 1
			stream.numBlocksInDb.Store(mbsInDb)
		}
	}

	mbsInContract := stream.numBlocksInContract.Load()
	if mbsInDb >= mbsInContract {
		a.streamsUpToDate.Add(1)
		stream.corrupt.ReportBlockUpdateSuccess(ctx)
		return nil
	}

	log.Debugw(
		"Archiving stream",
		"streamId",
		stream.streamId,
		"numBlocksInDb",
		mbsInDb,
		"numBlocksInContract",
		mbsInContract,
	)

	nodeAddr := stream.nodes.GetStickyPeer()

	stub, err := a.nodeRegistry.GetStreamServiceClientForAddress(nodeAddr)
	if err != nil {
		a.advanceNodeAndRetryWithDelay(stream, time.Second)
		return err
	}

	for mbsInDb < mbsInContract {
		toBlock := min(mbsInDb+int64(a.config.GetReadMiniblocksSize()), mbsInContract)

		req := connect.NewRequest(&GetMiniblocksRequest{
			StreamId:      stream.streamId[:],
			FromInclusive: mbsInDb,
			ToExclusive:   toBlock,
		})
		req.Header().Set(RiverNoForwardHeader, RiverHeaderTrueValue)
		resp, err := stub.GetMiniblocks(ctx, req)
		// Map connect errors back to river errors.
		if err != nil {
			err = AsRiverError(err)
		}
		// TODO: FIX: There is a bit of crazy error remapping going on which need to be fixed.
		// When forwarding is disabled, Err_UNAVAILABLE is returned as a code.
		// Same code for connect errors indicates that network request failed and is re-mapped to
		// Err_DOWNSTREAM_NETWORK_ERROR
		// in AsRiverError.
		// New error code for forwarding disabled is needed.
		notFoundError := err != nil &&
			(IsRiverErrorCode(err, Err_NOT_FOUND) ||
				IsRiverErrorCode(err, Err_MINIBLOCKS_NOT_FOUND) ||
				IsRiverErrorCode(err, Err_UNAVAILABLE) ||
				IsRiverErrorCode(err, Err_DOWNSTREAM_NETWORK_ERROR))
		if err != nil && !notFoundError {
			log.Warnw(
				"Error when calling GetMiniblocks on server",
				"error",
				err,
				"streamId",
				stream.streamId,
				"node",
				nodeAddr.Hex(),
			)

			a.advanceNodeAndRetryWithDelay(stream, 5*time.Second)
			return err
		}

		if notFoundError ||
			resp.Msg == nil ||
			len(resp.Msg.Miniblocks) == 0 {
			// If the stream is unable to fully update, consider this attempt to archive the stream as
			// a failure, even though we do not return an error.
			stream.corrupt.RecordBlockUpdateFailure(
				ctx,
				fmt.Errorf(
					"failed to update block to latest in contract (fromblock %d, toblock %d): %w",
					mbsInDb,
					toBlock,
					err,
				),
			)

			log.Debugw(
				"ArchiveStream: GetMiniblocks did not return data, remote storage is not up-to-date with contract yet",
				"streamId",
				stream.streamId,
				"fromInclusive",
				mbsInDb,
				"toExclusive",
				toBlock,
			)

			// Advance node
			a.advanceNodeAndRetryWithDelay(stream, 10*time.Second)
			return nil
		}

		// Validate miniblocks are sequential.
		// TODO: validate miniblock signatures.
		var serialized []*storage.MiniblockDescriptor
		for i, mb := range resp.Msg.Miniblocks {
			// Parse header
			info, err := events.NewMiniblockInfoFromProto(
				mb, resp.Msg.GetMiniblockSnapshot(int64(i)+mbsInDb),
				events.NewParsedMiniblockInfoOpts().
					WithExpectedBlockNumber(int64(i)+mbsInDb).
					WithDoNotParseEvents(true),
			)
			if err != nil {
				return err
			}
			storageMb, err := info.AsStorageMb()
			if err != nil {
				return err
			}
			serialized = append(serialized, storageMb)
		}

		log.Debugw("Writing miniblocks to storage", "streamId", stream.streamId, "numBlocks", len(serialized))

		err = a.storage.WriteArchiveMiniblocks(ctx, stream.streamId, mbsInDb, serialized)
		if err != nil {
			return err
		}
		mbsInDb += int64(len(serialized))
		stream.numBlocksInDb.Store(mbsInDb)

		a.miniblocksProcessed.Add(uint64(len(serialized)))
	}

	// Update the consecutive updates counter to reflect that the miniblocks were available
	// on the network.
	stream.corrupt.ReportBlockUpdateSuccess(ctx)
	if a.successfulDownloads != nil {
		a.successfulDownloads.With(prometheus.Labels{"node_address": nodeAddr.String()}).Inc()
	}

	return nil
}

func (a *Archiver) Start(ctx context.Context, once bool, metrics infra.MetricsFactory, exitSignal chan<- error) {
	a.scrubber = scrub.NewMiniblockScrubber(a.storage, 0, a.reports, metrics)

	defer a.startedWG.Done()

	child, cancel := context.WithCancel(ctx)
	a.cancelFuncs = append(a.cancelFuncs, cancel)
	go a.processScrubReports(child)

	child, cancel = context.WithCancel(ctx)
	go a.processMiniblockScrubs(child)
	a.cancelFuncs = append(a.cancelFuncs, cancel)

	err := a.startImpl(ctx, once, metrics)
	if err != nil {
		exitSignal <- err
	}
}

func (a *Archiver) Close() {
	a.startedWG.Wait()

	for _, cancel := range a.cancelFuncs {
		cancel()
	}

	if a.scrubber != nil {
		a.scrubber.Close()
	}
}

// processScrubReports continuously reads scrub reports and updates the archive stream's state until
// the context expires or is cancelled.
func (a *Archiver) processScrubReports(ctx context.Context) {
	log := logging.FromCtx(ctx).With("func", "processScrubReports")
	for {
		select {
		case report := <-a.reports:
			a.scrubsInProgress.Add(-1)
			value, ok := a.streams.Load(report.StreamId)
			if !ok {
				log.Errorw("No stream found in cache for scrubbed stream report", "streamId", report.StreamId)
				continue
			}
			as, ok := value.(*ArchiveStream)
			if !ok {
				log.Errorw("Cached object for stream id is not an ArchiveStream", "streamId", report.StreamId)
				continue
			}

			// Corrupt block detected
			if report.ScrubError != nil && report.FirstCorruptBlock != -1 {
				if err := as.corrupt.MarkBlockCorrupt(report.FirstCorruptBlock, report.ScrubError); err != nil {
					logging.FromCtx(ctx).Errorw(
						"Error marking block as corrupt from failed scrub",
						"streamId", as.streamId,
						"corruptBlock", report.FirstCorruptBlock,
						"error", report.ScrubError,
						"lastBlockScrubbed", report.LatestBlockScrubbed,
					)
					continue
				}
				as.mostRecentScrubbedBlock.Store(report.LatestBlockScrubbed)
				as.scrubInProgress.Store(false)

				log.Errorw("Corrupt stream detected",
					"streamId", as.streamId,
					"streamType", StreamTypeToString(as.streamId.Type()),
					"corruptBlock", report.FirstCorruptBlock,
					"error", report.ScrubError,
					"lastBlockScrubbed", report.LatestBlockScrubbed,
				)
				continue
			}

			// Scrub encountered error, but block was not deemed corrupt.
			if report.ScrubError != nil {
				log.Errorw("Error encountered during miniblock scrub",
					"streamId", as.streamId,
					"error", report.ScrubError,
					"lastBlockScrubbed", report.LatestBlockScrubbed,
				)
			}

			as.mostRecentScrubbedBlock.Store(report.LatestBlockScrubbed)
			as.scrubInProgress.Store(false)

		case <-ctx.Done():
			return
		}
	}
}

// debugGetUnscrubbedStreamCount is used for tests. It is useful to call after all streams have already
// finished updating and, once this is the case, should be safe to use as an indicator that the
// scrubber has caught up to the current stream state in storage.
func (a *Archiver) debugGetUnscrubbedMiniblocksCount() uint64 {
	count := uint64(0)
	a.streams.Range(func(key, value any) bool {
		as := value.(*ArchiveStream)
		count += uint64(as.numBlocksInDb.Load()) - uint64(as.mostRecentScrubbedBlock.Load()+1)
		if as.mostRecentScrubbedBlock.Load()+1 < as.numBlocksInDb.Load() {
			count++
		}
		return true
	})
	return count
}

func (a *Archiver) processMiniblockScrubs(ctx context.Context) {
	for {
		// Terminate the go process if the context has expired
		if errors.Is(ctx.Err(), context.Canceled) || errors.Is(ctx.Err(), context.DeadlineExceeded) {
			return
		}

		a.streams.Range(func(key, value interface{}) bool {
			// Bail early if the context has expired
			if errors.Is(ctx.Err(), context.Canceled) || errors.Is(ctx.Err(), context.DeadlineExceeded) {
				return false
			}

			as, ok := value.(*ArchiveStream)
			if !ok {
				logging.FromCtx(ctx).Errorw("Expected archive stream in stream cache", "key", key)
				return true
			}

			alreadyInProgress := as.scrubInProgress.Swap(true)
			if alreadyInProgress {
				return true
			}

			firstUnscrubbedBlock := as.mostRecentScrubbedBlock.Load() + 1
			numBlocksInDb := as.numBlocksInDb.Load()
			// Don't bother scrubbing if we've run out of (non-corrupted) blocks to scrub
			if (as.corrupt.IsCorrupt() && as.corrupt.GetFirstCorruptBlock() == firstUnscrubbedBlock) ||
				(firstUnscrubbedBlock >= numBlocksInDb) {
				as.scrubInProgress.Store(false)
				return true
			}

			err := a.scrubber.ScheduleStreamMiniblocksScrub(ctx, as.streamId, firstUnscrubbedBlock)
			if err != nil {
				as.scrubInProgress.Store(false)
				logging.FromCtx(ctx).
					Errorw("Failed to schedule scrub", "error", err, "streamId", as.streamId.String(), "firstUnscrubbedBlock", firstUnscrubbedBlock)
				return true
			} else {
				a.scrubsInProgress.Add(1)
			}

			return true
		})
	}
}

func (a *Archiver) startImpl(ctx context.Context, once bool, metrics infra.MetricsFactory) error {
	if once {
		a.tasksWG = &sync.WaitGroup{}
	} else if metrics != nil {
		logging.FromCtx(ctx).Infow("Setting up metrics")
		a.setupStatisticsMetrics(metrics)
	}

	numWorkers := a.config.GetWorkerPoolSize()
	for i := 0; i < numWorkers; i++ {
		a.workersWG.Add(1)
		go a.worker(ctx)
	}

	blockNum := a.contract.Blockchain.InitialBlockNum
	totalCount, err := a.contract.StreamRegistry.GetStreamCount(ctx, blockNum)
	if err != nil {
		return err
	}

	log := logging.FromCtx(ctx)
	log.Infow(
		"Reading stream registry for contract state of streams",
		"blockNum",
		blockNum,
		"totalCount",
		totalCount,
	)

	// Copy page size to the river registry contract for implicit use with ForAllStreams
	a.contract.Settings.PageSize = int(a.config.GetStreamsContractCallPageSize())

	if err := a.contract.ForAllStreams(
		ctx,
		blockNum,
		func(stream *river.StreamWithId) bool {
			if stream.Id == registries.ZeroBytes32 {
				return true
			}
			if a.tasksWG != nil {
				a.tasksWG.Add(1)
			}

			a.addNewStream(ctx, stream.Id, stream.Nodes(), uint64(stream.LastMbNum()))
			return true
		},
	); err != nil {
		return err
	}

	if !once {
		log.Infow("Listening to stream events", "blockNum", blockNum+1)
		err := a.contract.OnStreamEvent(
			ctx,
			blockNum+1,
			a.onStreamAllocated,
			a.onStreamAdded,
			a.onStreamLastMiniblockUpdated,
			a.onStreamPlacementUpdated,
		)
		if err != nil {
			return err
		}
	}

	return nil
}

func (a *Archiver) onStreamAllocated(ctx context.Context, event *river.StreamState) {
	a.newStreamAllocated.Add(1)
	id := event.GetStreamId()
	a.addNewStream(ctx, id, event.Stream.Nodes(), 0)
	a.tasks <- id
}

func (a *Archiver) onStreamAdded(ctx context.Context, event *river.StreamState) {
	a.newStreamAllocated.Add(1)
	id := event.GetStreamId()
	a.addNewStream(ctx, id, event.Stream.Nodes(), 0)
	a.tasks <- id
}

func (a *Archiver) onStreamPlacementUpdated(
	ctx context.Context,
	event *river.StreamState,
) {
	a.streamPlacementUpdated.Add(1)

	id := event.GetStreamId()
	record, loaded := a.streams.Load(id)
	if !loaded {
		logging.FromCtx(ctx).Errorw("onStreamPlacementUpdated: Stream not found in map", "streamId", id)
		return
	}
	stream := record.(*ArchiveStream)
	stream.nodes.ResetFromStreamWithId(event.Stream, common.Address{})
}

func (a *Archiver) onStreamLastMiniblockUpdated(
	ctx context.Context,
	event *river.StreamMiniblockUpdate,
) {
	a.streamLastMiniblockUpdated.Add(1)

	id := event.GetStreamId()
	record, loaded := a.streams.Load(id)
	if !loaded {
		logging.FromCtx(ctx).Errorw("onStreamLastMiniblockUpdated: Stream not found in map", "streamId", id)
		return
	}
	stream := record.(*ArchiveStream)
	stream.numBlocksInContract.Store(int64(event.LastMiniblockNum + 1))
	a.tasks <- id
}

func (a *Archiver) WaitForWorkers() {
	a.workersWG.Wait()
}

// Waiting for tasks is only possible if archiver is started in "once" mode.
func (a *Archiver) WaitForTasks() {
	a.tasksWG.Wait()
}

func (a *Archiver) WaitForStart() {
	a.startedWG.Wait()
}

func (a *Archiver) GetStats() *ArchiverStats {
	return &ArchiverStats{
		StreamsExamined:            a.streamsExamined.Load(),
		StreamsCreated:             a.streamsCreated.Load(),
		StreamsUpToDate:            a.streamsUpToDate.Load(),
		SuccessOpsCount:            a.successOpsCount.Load(),
		FailedOpsCount:             a.failedOpsCount.Load(),
		MiniblocksProcessed:        a.miniblocksProcessed.Load(),
		NewStreamAllocated:         a.newStreamAllocated.Load(),
		StreamPlacementUpdated:     a.streamPlacementUpdated.Load(),
		StreamLastMiniblockUpdated: a.streamLastMiniblockUpdated.Load(),
		StreamScrubsInProgress:     a.scrubsInProgress.Load(),
		TasksQueued:                len(a.tasks),
	}
}

func (a *Archiver) worker(ctx context.Context) {
	log := logging.FromCtx(ctx)

	defer a.workersWG.Done()

	for {
		select {
		case <-ctx.Done():
			return
		case streamId := <-a.tasks:
			record, loaded := a.streams.Load(streamId)
			if !loaded {
				log.Errorw("archiver.worker: Stream not found in map", "streamId", streamId)
				continue
			}
			err := a.ArchiveStream(ctx, record.(*ArchiveStream))
			if err != nil {
				// Do not log for the known set of streams that were registered under an operator address.
				// These errors are not worth tracking.
				if !IsRiverErrorCode(err, Err_UNKNOWN_NODE) {
					log.Errorw("archiver.worker: Failed to archive stream", "error", err, "streamId", streamId)
				}
				a.failedOpsCount.Add(1)
			} else {
				a.successOpsCount.Add(1)
			}
			if a.tasksWG != nil {
				a.tasksWG.Done()
			}
		}
	}
}
