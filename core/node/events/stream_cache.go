package events

import (
	"context"
	"slices"
	"sync"
	"sync/atomic"
	"time"

	"github.com/ethereum/go-ethereum/core/types"
	"github.com/gammazero/workerpool"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/puzpuzpuz/xsync/v4"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/trace"

	"github.com/towns-protocol/towns/core/blockchain"
	"github.com/towns-protocol/towns/core/config"
	"github.com/towns-protocol/towns/core/contracts/river"
	. "github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/crypto"
	"github.com/towns-protocol/towns/core/node/infra"
	"github.com/towns-protocol/towns/core/node/logging"
	. "github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/registries"
	. "github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/storage"
)

type Scrubber interface {
	// Scrub schedules a scrub for the given channel.
	// Returns true if the scrub was scheduled, false if it was already pending.
	Scrub(channelId StreamId) bool
}

type StreamCacheParams struct {
	ServerCtx               context.Context
	Storage                 storage.StreamStorage
	Wallet                  *crypto.Wallet
	RiverChain              *crypto.Blockchain
	Registry                *registries.RiverRegistryContract
	ChainConfig             crypto.OnChainConfiguration
	Config                  *config.Config
	AppliedBlockNum         blockchain.BlockNumber
	ChainMonitor            crypto.ChainMonitor // TODO: delete and use RiverChain.ChainMonitor
	Metrics                 infra.MetricsFactory
	RemoteMiniblockProvider RemoteProvider
	Scrubber                Scrubber
	Tracer                  trace.Tracer
	disableCallbacks        bool // for test purposes
	streamCache             *StreamCache
}

type StreamCache struct {
	params *StreamCacheParams

	// streamId -> *streamImpl
	// cache is populated by getting all streams that should be on local node from River chain.
	// streamImpl can be in unloaded state, in which case it will be loaded on first GetStream call.
	cache *xsync.Map[StreamId, *Stream]

	// appliedBlockNum is the number of the last block logs from which were applied to cache.
	appliedBlockNum atomic.Uint64

	chainConfig crypto.OnChainConfiguration

	// prometheusm metrics
	streamCacheSizeGauge              prometheus.Gauge
	streamCacheUnloadedGauge          prometheus.Gauge
	streamCacheRemoteGauge            prometheus.Gauge
	loadStreamRecordDuration          prometheus.Histogram
	loadStreamRecordCounter           *infra.StatusCounterVec
	scheduledGetRecordTasksGauge      prometheus.Gauge
	scheduledReconciliationTasksGauge prometheus.Gauge
	retryableReconciliationTasksGauge prometheus.Gauge

	stoppedMu sync.RWMutex
	stopped   bool

	scheduledGetRecordTasks      *xsync.Map[StreamId, bool]
	scheduledReconciliationTasks *xsync.Map[StreamId, *reconcileTask]

	onlineReconcileWorkerPool *workerpool.WorkerPool

	retryableReconciliationTasks *retryableReconciliationTasks

	mbProducer *miniblockProducer
}

var _ TestMiniblockProducer = (*StreamCache)(nil)

func NewStreamCache(params *StreamCacheParams) *StreamCache {
	s := &StreamCache{
		params: params,
		cache:  xsync.NewMap[StreamId, *Stream](),
		streamCacheSizeGauge: params.Metrics.NewGaugeVecEx(
			"stream_cache_size", "Number of streams in stream cache",
			"chain_id", "address",
		).WithLabelValues(
			params.RiverChain.ChainId.String(),
			params.Wallet.Address.String(),
		),
		streamCacheUnloadedGauge: params.Metrics.NewGaugeVecEx(
			"stream_cache_unloaded", "Number of unloaded streams in stream cache",
			"chain_id", "address",
		).WithLabelValues(
			params.RiverChain.ChainId.String(),
			params.Wallet.Address.String(),
		),
		streamCacheRemoteGauge: params.Metrics.NewGaugeVecEx(
			"stream_cache_remote", "Number of remote streams in stream cache",
			"chain_id", "address",
		).WithLabelValues(
			params.RiverChain.ChainId.String(),
			params.Wallet.Address.String(),
		),
		scheduledGetRecordTasksGauge: params.Metrics.NewGaugeEx(
			"stream_cache_recon_scheduled_get_record_tasks",
			"Number of recon tasks scheduled to get stream record",
		),
		scheduledReconciliationTasksGauge: params.Metrics.NewGaugeEx(
			"stream_cache_recon_scheduled_recon_tasks",
			"Number of recon tasks scheduled",
		),
		retryableReconciliationTasksGauge: params.Metrics.NewGaugeEx(
			"stream_cache_recon_scheduled_recon_retryable_tasks",
			"Number of recon tasks scheduled for retry",
		),
		loadStreamRecordDuration: params.Metrics.NewHistogramEx(
			"stream_cache_load_duration_seconds",
			"Load stream record duration",
			infra.DefaultRpcDurationBucketsSeconds,
		),
		loadStreamRecordCounter: params.Metrics.NewStatusCounterVecEx(
			"stream_cache_load_counter",
			"Number of stream record loads",
		),
		chainConfig:                  params.ChainConfig,
		onlineReconcileWorkerPool:    workerpool.New(params.Config.StreamReconciliation.OnlineWorkerPoolSize),
		scheduledGetRecordTasks:      xsync.NewMap[StreamId, bool](),
		scheduledReconciliationTasks: xsync.NewMap[StreamId, *reconcileTask](),
		retryableReconciliationTasks: newRetryableReconciliationTasks(
			params.Config.StreamReconciliation.ReconciliationTaskRetryDuration,
		),
	}
	s.params.streamCache = s
	return s
}

func (s *StreamCache) Start(ctx context.Context, opts *MiniblockProducerOpts) error {
	s.mbProducer = newMiniblockProducer(ctx, s, opts)

	// schedule reconciliation tasks for all streams that are local to this node.
	// these tasks reconcile the local db with the latest block in the registry.
	var localStreamResults []*river.StreamWithId
	err := s.params.Registry.ForAllStreamsOnNode(
		ctx,
		s.params.AppliedBlockNum,
		s.params.Wallet.Address,
		func(stream *river.StreamWithId) bool {
			localStreamResults = append(localStreamResults, stream)
			return true
		},
	)
	if err != nil {
		return err
	}

	// load local streams in-memory cache
	initialReconcileWorkerPool := workerpool.New(s.params.Config.StreamReconciliation.InitialWorkerPoolSize)
	for _, streamRecord := range localStreamResults {
		stream := &Stream{
			params:              s.params,
			streamId:            streamRecord.StreamId(),
			lastAppliedBlockNum: s.params.AppliedBlockNum,
			local:               &localStreamState{},
		}
		stream.nodesLocked.ResetFromStreamWithId(streamRecord, s.params.Wallet.Address)
		s.cache.Store(streamRecord.StreamId(), stream)
		if s.params.Config.StreamReconciliation.InitialWorkerPoolSize > 0 {
			s.submitReconcileStreamTaskToPool(
				initialReconcileWorkerPool,
				stream,
				streamRecord,
			)
		}
	}

	s.appliedBlockNum.Store(uint64(s.params.AppliedBlockNum))

	// Close initial worker pool after all tasks are executed.
	go initialReconcileWorkerPool.StopWait()

	// TODO: add buffered channel to avoid blocking ChainMonitor
	if !s.params.disableCallbacks {
		s.params.RiverChain.ChainMonitor.OnBlockWithLogs(
			s.params.AppliedBlockNum+1,
			s.onBlockWithLogs,
		)
	}

	go s.runCacheCleanup(ctx)

	go func() {
		<-ctx.Done()
		s.stoppedMu.Lock()
		s.stopped = true
		s.stoppedMu.Unlock()
		s.onlineReconcileWorkerPool.Stop()
		initialReconcileWorkerPool.Stop()
	}()

	return nil
}

func (s *StreamCache) onBlockWithLogs(ctx context.Context, blockNum blockchain.BlockNumber, logs []*types.Log) {
	s.scheduledGetRecordTasksGauge.Set(float64(s.scheduledGetRecordTasks.Size()))
	s.scheduledReconciliationTasksGauge.Set(float64(s.scheduledReconciliationTasks.Size()))
	s.retryableReconciliationTasksGauge.Set(float64(s.retryableReconciliationTasks.Len()))

	streamEvents, errs := s.params.Registry.FilterStreamUpdatedEvents(ctx, logs)
	// Process parsed stream events even if some failed to parse
	for _, err := range errs {
		logging.FromCtx(ctx).Errorw("Failed to parse stream event", "error", err)
	}

	wp := workerpool.New(16)

	wp.Submit(func() {
		now := time.Now()
		for {
			reconTask := s.retryableReconciliationTasks.Peek()
			if reconTask != nil && reconTask.retryAfter.Before(now) {
				if stream, _ := s.GetStreamNoWait(ctx, reconTask.item.StreamId()); stream != nil {
					s.SubmitReconcileStreamTask(stream, reconTask.item)
				}
				s.retryableReconciliationTasks.Remove(reconTask)
				continue
			}
			break
		}
	})

	for streamID, events := range streamEvents {
		wp.Submit(func() {
			for len(events) > 0 {
				switch events[0].Reason() {
				case river.StreamUpdatedEventTypeAllocate:
					streamState := events[0].(*river.StreamState)
					s.onStreamAllocated(ctx, streamState, blockNum)
					events = events[1:]
				case river.StreamUpdatedEventTypeCreate:
					streamState := events[0].(*river.StreamState)
					s.onStreamCreated(ctx, streamState, blockNum)
					events = events[1:]
				case river.StreamUpdatedEventTypePlacementUpdated:
					streamState := events[0].(*river.StreamState)
					s.onStreamPlacementUpdated(ctx, streamState, blockNum)
					events = events[1:]
				case river.StreamUpdatedEventTypeLastMiniblockBatchUpdated:
					i := 1
					for i < len(events) && events[i].Reason() == river.StreamUpdatedEventTypeLastMiniblockBatchUpdated {
						i++
					}
					eventsToApply := events[:i]
					events = events[i:]

					if stream, ok := s.cache.Load(streamID); ok {
						stream.applyStreamMiniblockUpdates(ctx, eventsToApply, blockNum)
					}
				}
			}
		})
	}

	wp.StopWait()

	s.appliedBlockNum.Store(uint64(blockNum))
}

func (s *StreamCache) onStreamAllocated(
	ctx context.Context,
	event *river.StreamState,
	blockNum blockchain.BlockNumber,
) {
	if !slices.Contains(event.Stream.Nodes(), s.params.Wallet.Address) {
		return
	}

	_, err := s.readGenesisAndCreateLocalStream(ctx, event.Stream.StreamId(), blockNum)
	if err != nil {
		logging.FromCtx(ctx).Errorw("onStreamAllocated: Failed to create stream", "error", err)
	}
}

func (s *StreamCache) Params() *StreamCacheParams {
	return s.params
}

func (s *StreamCache) runCacheCleanup(ctx context.Context) {
	log := logging.FromCtx(ctx)

	for {
		pollInterval := s.params.ChainConfig.Get().StreamCachePollIntterval
		expirationEnabled := false
		if pollInterval > 0 {
			expirationEnabled = true
		}
		select {
		case <-time.After(pollInterval):
			s.CacheCleanup(ctx, expirationEnabled, s.params.ChainConfig.Get().StreamCacheExpiration)
		case <-ctx.Done():
			log.Debugw("stream cache cache cleanup shutdown")
			return
		}
	}
}

type CacheCleanupResult struct {
	TotalStreams    int
	UnloadedStreams int
	RemoteStreams   int
}

func (s *StreamCache) CacheCleanup(ctx context.Context, enabled bool, expiration time.Duration) CacheCleanupResult {
	var (
		log    = logging.FromCtx(ctx)
		result CacheCleanupResult
	)

	// TODO: add data structure that supports to loop over streams that have their view loaded instead of
	// looping over all streams.
	s.cache.Range(func(streamID StreamId, stream *Stream) bool {
		if !stream.IsLocal() {
			result.RemoteStreams++
			return true
		}
		result.TotalStreams++
		if enabled {
			// TODO: add purge from cache for non-local streams.
			if stream.tryCleanup(expiration) {
				result.UnloadedStreams++
				log.Debugw("stream view is unloaded from cache", "streamId", stream.streamId)
			}
		}
		return true
	})

	s.streamCacheSizeGauge.Set(float64(result.TotalStreams))
	if enabled {
		s.streamCacheUnloadedGauge.Set(float64(result.UnloadedStreams))
	} else {
		s.streamCacheUnloadedGauge.Set(float64(-1))
	}
	s.streamCacheRemoteGauge.Set(float64(result.RemoteStreams))
	return result
}

func (s *StreamCache) loadStreamRecord(
	ctx context.Context,
	streamId StreamId,
	waitForLocal bool,
) (*Stream, error) {
	if s.params.Tracer != nil {
		var span trace.Span
		ctx, span = s.params.Tracer.Start(ctx, "tryLoadStreamRecord")
		span.SetAttributes(
			attribute.String("stream", streamId.String()),
			attribute.Bool("waitForLocal", waitForLocal))
		defer span.End()
	}

	defer prometheus.NewTimer(s.loadStreamRecordDuration).ObserveDuration()

	stream, err := s.loadStreamRecordImpl(ctx, streamId, waitForLocal)
	if err != nil {
		s.loadStreamRecordCounter.IncFail()
	} else {
		s.loadStreamRecordCounter.IncPass()
	}
	return stream, err
}

func (s *StreamCache) insertEmptyLocalStream(
	record *river.StreamWithId,
	blockNum blockchain.BlockNumber,
	reconcile bool,
) *Stream {
	stream, loaded := s.cache.LoadOrCompute(
		record.StreamId(),
		func() (newValue *Stream, cancel bool) {
			ret := &Stream{
				params:              s.params,
				streamId:            record.StreamId(),
				lastAppliedBlockNum: blockNum,
				lastAccessedTime:    time.Now(),
				local:               &localStreamState{},
			}
			ret.nodesLocked.ResetFromStreamWithId(record, s.params.Wallet.Address)
			return ret, false
		},
	)
	if reconcile && !loaded {
		s.SubmitReconcileStreamTask(stream, record)
	}
	return stream
}

// loadStreamRecordImpl is called when stream is not in the cache.
// On start, all local streams from the registry contract are loaded into the cache.
// onStreamAllocated initializes local streams proactively.
//
// Thus in most cases this function is called for streams that are not local.
//
// However, it's possible that this function is called while local stream is still being initialized.
func (s *StreamCache) loadStreamRecordImpl(
	ctx context.Context,
	streamId StreamId,
	waitForLocal bool,
) (*Stream, error) {
	// For GetStream the fact that record is not in cache means that there is race to get it during creation:
	// Blockchain record is already created, but this fact is not reflected yet in local storage.
	// Moveover, blockchain record might not be available yet through this particular RPC endpoint.
	// if waitForLocal is true, wait for record to be created.
	// if waitForLocal is false, return error immediately.
	backoff := BackoffTracker{
		NextDelay:   100 * time.Millisecond,
		MaxAttempts: 8,
		Multiplier:  3,
		Divisor:     2,
	}

	var blockNum blockchain.BlockNumber
	var record *river.Stream
	for {
		blockNum, err := s.params.RiverChain.GetBlockNumber(ctx)
		if err == nil {
			record, err = s.params.Registry.StreamRegistry.GetStreamOnBlock(ctx, streamId, blockNum)
			if err == nil {
				break
			}
		}
		if !waitForLocal {
			return nil, err
		}
		err = backoff.Wait(ctx, err)
		if err != nil {
			return nil, err
		}
	}

	local := slices.Contains(record.Nodes, s.params.Wallet.Address)
	if !local {
		stream, _ := s.cache.LoadOrCompute(
			streamId,
			func() (newValue *Stream, cancel bool) {
				ret := &Stream{
					params:              s.params,
					streamId:            streamId,
					lastAppliedBlockNum: blockNum,
					lastAccessedTime:    time.Now(),
				}
				ret.nodesLocked.ResetFromStream(record, s.params.Wallet.Address)
				return ret, false
			},
		)
		return stream, nil
	}

	// If record is beyond genesis, return stream with empty local state and schedule reconciliation.
	if record.LastMbNum() > 0 {
		return s.insertEmptyLocalStream(river.NewStreamWithId(streamId, record), blockNum, true), nil
	}

	return s.readGenesisAndCreateLocalStream(ctx, streamId, blockNum)
}

func (s *StreamCache) readGenesisAndCreateLocalStream(
	ctx context.Context,
	streamId StreamId,
	blockNum blockchain.BlockNumber,
) (*Stream, error) {
	// Bug out if stream was created meanwhile.
	stream, exists := s.cache.Load(streamId)
	if exists {
		return stream, nil
	}

	recordNoId, _, mb, err := s.params.Registry.StreamRegistry.GetStreamWithGenesis(ctx, streamId, blockNum)
	if err != nil {
		return nil, err
	}
	record := river.NewStreamWithId(streamId, recordNoId)

	if !slices.Contains(record.Nodes(), s.params.Wallet.Address) {
		return nil, RiverError(Err_INTERNAL, "unexpected genesis record",
			"streamId", streamId, "blockNum", blockNum, "record", record).Func("readGenesisAndCreateStream")
	}

	// If genesis record is not consistent, return stream with empty local state and schedule reconciliation.
	if record.LastMbNum() > 0 || len(mb) == 0 {
		logging.FromCtx(ctx).Warnw("readGenesisAndCreateStream: Inconsistent genesis record",
			"streamId", streamId, "blockNum", blockNum, "record", record, "len_mb", len(mb))
		return s.insertEmptyLocalStream(record, blockNum, true), nil
	}

	// Bug out if stream was created meanwhile.
	stream, exists = s.cache.Load(streamId)
	if exists {
		return stream, nil
	}

	err = s.params.Storage.CreateStreamStorage(
		ctx,
		streamId,
		&storage.MiniblockDescriptor{Data: mb, HasLegacySnapshot: true},
	)
	if err != nil {
		if IsRiverErrorCode(err, Err_ALREADY_EXISTS) {
			logging.FromCtx(ctx).
				Warnw("loadStreamRecordImpl: stream already exists in storage (creation race?)", "error", err)
		} else {
			return nil, err
		}
	}

	return s.insertEmptyLocalStream(record, blockNum, false), nil
}

// GetStreamWaitForLocal is a transitional method to support existing GetStream API before block number are wired
// through APIs.
func (s *StreamCache) GetStreamWaitForLocal(ctx context.Context, streamId StreamId) (*Stream, error) {
	return s.getStreamImpl(ctx, streamId, true)
}

// GetStreamNoWait is a transitional method to support existing GetStream API before block number are wired through
// APIs.
func (s *StreamCache) GetStreamNoWait(ctx context.Context, streamId StreamId) (*Stream, error) {
	return s.getStreamImpl(ctx, streamId, false)
}

func (s *StreamCache) getStreamImpl(
	ctx context.Context,
	streamId StreamId,
	waitForLocal bool,
) (*Stream, error) {
	stream, _ := s.cache.Load(streamId)
	if stream == nil {
		return s.loadStreamRecord(ctx, streamId, waitForLocal)
	}
	return stream, nil
}

func (s *StreamCache) ForceFlushAll(ctx context.Context) {
	s.cache.Range(func(streamID StreamId, stream *Stream) bool {
		stream.ForceFlush(ctx)
		return true
	})
}

func (s *StreamCache) GetLoadedViews(ctx context.Context) []*StreamView {
	var result []*StreamView
	s.cache.Range(func(streamID StreamId, stream *Stream) bool {
		view, _ := stream.tryGetView(true)
		if view != nil {
			result = append(result, view)
		}
		return true
	})
	return result
}

func (s *StreamCache) GetMbCandidateStreams(ctx context.Context) []*Stream {
	var candidates []*Stream
	s.cache.Range(func(streamID StreamId, stream *Stream) bool {
		if stream.canCreateMiniblock() {
			candidates = append(candidates, stream)
		}
		return true
	})

	return candidates
}

func (s *StreamCache) TestMakeMiniblock(
	ctx context.Context,
	streamId StreamId,
	forceSnapshot bool,
) (*MiniblockRef, error) {
	return s.mbProducer.TestMakeMiniblock(ctx, streamId, forceSnapshot)
}

func (s *StreamCache) writeLatestMbToBlockchain(ctx context.Context, stream *Stream) {
	view, err := stream.GetViewIfLocal(ctx)
	if err != nil {
		logging.FromCtx(ctx).
			Errorw("writeLatestMbToBlockchain: failed to get stream view", "error", err, "streamId", stream.streamId)
		return
	}

	s.mbProducer.writeLatestKnownMiniblock(ctx, stream, view.LastBlock())
}
