package events

import (
	"context"
	"slices"
	"sync"
	"sync/atomic"
	"time"

	mapset "github.com/deckarep/golang-set/v2"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/gammazero/workerpool"
	"github.com/linkdata/deadlock"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/puzpuzpuz/xsync/v3"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/trace"

	"github.com/towns-protocol/towns/core/config"
	"github.com/towns-protocol/towns/core/contracts/river"
	. "github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/crypto"
	"github.com/towns-protocol/towns/core/node/infra"
	"github.com/towns-protocol/towns/core/node/logging"
	. "github.com/towns-protocol/towns/core/node/nodes"
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
	Storage                 storage.StreamStorage
	Wallet                  *crypto.Wallet
	RiverChain              *crypto.Blockchain
	Registry                *registries.RiverRegistryContract
	ChainConfig             crypto.OnChainConfiguration
	Config                  *config.Config
	AppliedBlockNum         crypto.BlockNumber
	ChainMonitor            crypto.ChainMonitor // TODO: delete and use RiverChain.ChainMonitor
	Metrics                 infra.MetricsFactory
	RemoteMiniblockProvider RemoteMiniblockProvider
	Scrubber                Scrubber
	NodeRegistry            NodeRegistry
	Tracer                  trace.Tracer
	disableCallbacks        bool // for test purposes
	streamCache             *StreamCache
}

type StreamCache struct {
	params *StreamCacheParams

	// streamId -> *streamImpl
	// cache is populated by getting all streams that should be on local node from River chain.
	// streamImpl can be in unloaded state, in which case it will be loaded on first GetStream call.
	cache *xsync.MapOf[StreamId, *Stream]

	// appliedBlockNum is the number of the last block logs from which were applied to cache.
	appliedBlockNum atomic.Uint64

	chainConfig crypto.OnChainConfiguration

	streamCacheSizeGauge     prometheus.Gauge
	streamCacheUnloadedGauge prometheus.Gauge
	streamCacheRemoteGauge   prometheus.Gauge
	loadStreamRecordDuration prometheus.Histogram
	loadStreamRecordCounter  *infra.StatusCounterVec

	stoppedMu sync.RWMutex
	stopped   bool

	onlineSyncStreamTasksInProgressMu deadlock.Mutex
	onlineSyncStreamTasksInProgress   mapset.Set[StreamId]

	onlineSyncWorkerPool *workerpool.WorkerPool

	disableCallbacks bool
}

func NewStreamCache(params *StreamCacheParams) *StreamCache {
	s := &StreamCache{
		params: params,
		cache:  xsync.NewMapOf[StreamId, *Stream](),
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
		loadStreamRecordDuration: params.Metrics.NewHistogramEx(
			"stream_cache_load_duration_seconds",
			"Load stream record duration",
			infra.DefaultRpcDurationBucketsSeconds,
		),
		loadStreamRecordCounter: params.Metrics.NewStatusCounterVecEx(
			"stream_cache_load_counter",
			"Number of stream record loads",
		),
		chainConfig:                     params.ChainConfig,
		onlineSyncWorkerPool:            workerpool.New(params.Config.StreamReconciliation.OnlineWorkerPoolSize),
		disableCallbacks:                params.disableCallbacks,
		onlineSyncStreamTasksInProgress: mapset.NewSet[StreamId](),
	}
	s.params.streamCache = s
	return s
}

func (s *StreamCache) Start(ctx context.Context) error {
	// schedule sync tasks for all streams that are local to this node.
	// these tasks sync up the local db with the latest block in the registry.
	var localStreamResults []*registries.GetStreamResult
	err := s.params.Registry.ForAllStreams(
		ctx,
		s.params.AppliedBlockNum,
		func(stream *registries.GetStreamResult) bool {
			if slices.Contains(stream.Nodes, s.params.Wallet.Address) {
				localStreamResults = append(localStreamResults, stream)
			}
			return true
		},
	)
	if err != nil {
		return err
	}

	// load local streams in-memory cache
	initialSyncWorkerPool := workerpool.New(s.params.Config.StreamReconciliation.InitialWorkerPoolSize)
	for _, streamRecord := range localStreamResults {
		stream := &Stream{
			params:              s.params,
			streamId:            streamRecord.StreamId,
			lastAppliedBlockNum: s.params.AppliedBlockNum,
			local:               &localStreamState{},
		}
		stream.nodesLocked.ResetFromStreamResult(streamRecord, s.params.Wallet.Address)
		s.cache.Store(streamRecord.StreamId, stream)
		if s.params.Config.StreamReconciliation.InitialWorkerPoolSize > 0 {
			s.submitSyncStreamTaskToPool(
				ctx,
				initialSyncWorkerPool,
				stream,
				streamRecord,
			)
		}
	}

	s.appliedBlockNum.Store(uint64(s.params.AppliedBlockNum))

	// Close initial worker pool after all tasks are executed.
	go initialSyncWorkerPool.StopWait()

	// TODO: add buffered channel to avoid blocking ChainMonitor
	if !s.disableCallbacks {
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
		s.onlineSyncWorkerPool.Stop()
		s.stoppedMu.Unlock()
		initialSyncWorkerPool.Stop()
	}()

	return nil
}

func (s *StreamCache) onBlockWithLogs(ctx context.Context, blockNum crypto.BlockNumber, logs []*types.Log) {
	streamEvents, errs := s.params.Registry.FilterStreamEvents(ctx, logs)
	// Process parsed stream events even if some failed to parse
	for _, err := range errs {
		logging.FromCtx(ctx).Errorw("Failed to parse stream event", "err", err)
	}

	wp := workerpool.New(16)

	for streamID, events := range streamEvents {
		wp.Submit(func() {
			switch events[0].Reason() {
			case river.StreamUpdatedEventTypeAllocate:
				streamState := events[0].(*river.StreamState)
				s.onStreamAllocated(ctx, streamState, events[1:], blockNum)
			case river.StreamUpdatedEventTypeCreate:
				streamState := events[0].(*river.StreamState)
				s.onStreamCreated(ctx, streamState, blockNum)
			case river.StreamUpdatedEventTypePlacementUpdated: // linter
				fallthrough
			case river.StreamUpdatedEventTypeLastMiniblockBatchUpdated:
				fallthrough
			default:
				stream, ok := s.cache.Load(streamID)
				if !ok {
					return
				}
				stream.applyStreamEvents(ctx, events, blockNum)
			}
		})
	}

	wp.StopWait()

	s.appliedBlockNum.Store(uint64(blockNum))
}

func (s *StreamCache) onStreamAllocated(
	ctx context.Context,
	event *river.StreamState,
	otherEvents []river.StreamUpdatedEvent,
	blockNum crypto.BlockNumber,
) {
	if !slices.Contains(event.Nodes, s.params.Wallet.Address) {
		return
	}

	// Bug out early if stream is created through race with GetStream to avoid doing RPC call.
	_, exists := s.cache.Load(event.GetStreamId())
	if exists {
		return
	}

	_, genesisHash, genesisMB, err := s.params.Registry.GetStreamWithGenesis(ctx, event.StreamID, blockNum)
	if err != nil {
		logging.FromCtx(ctx).Errorw("onStreamAllocated: Failed to get genesis block for allocated stream", "err", err)
		return
	}

	if event.LastMiniblockHash != genesisHash {
		logging.FromCtx(ctx).Errorw("onStreamAllocated: Unexpected genesis miniblock hash on allocated stream")
		return
	}

	// Bug out if stream is created through race with GetStream to avoid needlessly trying to create storage.
	_, exists = s.cache.Load(event.GetStreamId())
	if exists {
		return
	}

	err = s.params.Storage.CreateStreamStorage(
		ctx,
		event.GetStreamId(),
		&storage.WriteMiniblockData{Data: genesisMB},
	)
	if err != nil {
		if IsRiverErrorCode(err, Err_ALREADY_EXISTS) {
			logging.FromCtx(ctx).Warnw("onStreamAllocated: stream already exists in storage (race with GetStream?)", "err", err)
		} else {
			logging.FromCtx(ctx).Errorw("onStreamAllocated: Failed to create stream storage", "err", err)
			return
		}
	}

	stream, _ := s.cache.LoadOrCompute(
		event.GetStreamId(),
		func() *Stream {
			ret := &Stream{
				params:              s.params,
				streamId:            event.GetStreamId(),
				lastAppliedBlockNum: blockNum,
				lastAccessedTime:    time.Now(),
				local:               &localStreamState{},
			}
			ret.nodesLocked.ResetFromStreamState(event, s.params.Wallet.Address)
			return ret
		},
	)

	if len(otherEvents) > 0 {
		stream.applyStreamEvents(ctx, otherEvents, blockNum)
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

	var blockNum crypto.BlockNumber
	var record *registries.GetStreamResult
	for {
		blockNum, err := s.params.RiverChain.GetBlockNumber(ctx)
		if err == nil {
			record, err = s.params.Registry.GetStream(ctx, streamId, blockNum)
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
			func() *Stream {
				ret := &Stream{
					params:              s.params,
					streamId:            streamId,
					lastAppliedBlockNum: blockNum,
					lastAccessedTime:    time.Now(),
				}
				ret.nodesLocked.ResetFromStreamResult(record, s.params.Wallet.Address)
				return ret
			},
		)
		return stream, nil
	}

	// If record is beyond genesis, return stream with empty local state and schedule reconciliation.
	if record.LastMiniblockNum > 0 {
		stream, _ := s.cache.LoadOrCompute(
			streamId,
			func() *Stream {
				ret := &Stream{
					params:              s.params,
					streamId:            streamId,
					lastAppliedBlockNum: blockNum,
					lastAccessedTime:    time.Now(),
					local:               &localStreamState{},
				}
				ret.nodesLocked.ResetFromStreamResult(record, s.params.Wallet.Address)
				return ret
			},
		)
		s.SubmitSyncStreamTask(ctx, stream)
		return stream, nil
	}

	// Bug out if stream was created meanwhile.
	stream, exists := s.cache.Load(streamId)
	if exists {
		return stream, nil
	}

	record, _, mb, err := s.params.Registry.GetStreamWithGenesis(ctx, streamId, blockNum)
	if err != nil {
		return nil, err
	}

	// Bug out if stream was created meanwhile.
	stream, exists = s.cache.Load(streamId)
	if exists {
		return stream, nil
	}

	err = s.params.Storage.CreateStreamStorage(
		ctx,
		streamId,
		&storage.WriteMiniblockData{Data: mb},
	)
	if err != nil {
		if IsRiverErrorCode(err, Err_ALREADY_EXISTS) {
			logging.FromCtx(ctx).Warnw("loadStreamRecordImpl: stream already exists in storage (creation race?)", "err", err)
		} else {
			logging.FromCtx(ctx).Errorw("onStreamAllocated: Failed to create stream storage", "err", err)
			return nil, err
		}
	}

	stream, _ = s.cache.LoadOrCompute(
		streamId,
		func() *Stream {
			ret := &Stream{
				params:              s.params,
				streamId:            streamId,
				lastAppliedBlockNum: blockNum,
				lastAccessedTime:    time.Now(),
				local:               &localStreamState{},
			}
			ret.nodesLocked.ResetFromStreamResult(record, s.params.Wallet.Address)
			return ret
		},
	)

	return stream, nil
}

// GetStreamWaitForLocal is a transitional method to support existing GetStream API before block number are wired through APIs.
func (s *StreamCache) GetStreamWaitForLocal(ctx context.Context, streamId StreamId) (*Stream, error) {
	return s.getStreamImpl(ctx, streamId, true)
}

// GetStreamNoWait is a transitional method to support existing GetStream API before block number are wired through APIs.
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
		view, _ := stream.tryGetView()
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
