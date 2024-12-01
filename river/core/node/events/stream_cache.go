package events

import (
	"context"
	"slices"
	"sync/atomic"
	"time"

	"github.com/ethereum/go-ethereum/core/types"
	"github.com/gammazero/workerpool"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/puzpuzpuz/xsync/v3"

	"github.com/river-build/river/core/config"
	"github.com/river-build/river/core/contracts/river"
	. "github.com/river-build/river/core/node/base"
	"github.com/river-build/river/core/node/crypto"
	"github.com/river-build/river/core/node/dlog"
	"github.com/river-build/river/core/node/infra"
	. "github.com/river-build/river/core/node/nodes"
	. "github.com/river-build/river/core/node/protocol"
	"github.com/river-build/river/core/node/registries"
	. "github.com/river-build/river/core/node/shared"
	"github.com/river-build/river/core/node/storage"
)

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
}

type StreamCache interface {
	Params() *StreamCacheParams
	GetStream(ctx context.Context, streamId StreamId) (SyncStream, error)
	GetStreamInfo(ctx context.Context, streamId StreamId) (StreamNodes, error) // TODO: to be unified with GetStream
	ForceFlushAll(ctx context.Context)
	GetLoadedViews(ctx context.Context) []StreamView
	GetMbCandidateStreams(ctx context.Context) []*streamImpl
	CacheCleanup(ctx context.Context, enabled bool, expiration time.Duration) CacheCleanupResult
}

type streamCacheImpl struct {
	params *StreamCacheParams

	// streamId -> *streamImpl
	// cache is populated by getting all streams that should be on local node from River chain.
	// streamImpl can be in unloaded state, in which case it will be loaded on first GetStream call.
	cache *xsync.MapOf[StreamId, *streamImpl]

	// appliedBlockNum is the number of the last block logs from which were applied to cache.
	appliedBlockNum atomic.Uint64

	chainConfig crypto.OnChainConfiguration

	streamCacheSizeGauge     prometheus.Gauge
	streamCacheUnloadedGauge prometheus.Gauge
	streamCacheRemoteGauge   prometheus.Gauge

	onlineSyncWorkerPool *workerpool.WorkerPool
}

var _ StreamCache = (*streamCacheImpl)(nil)

func NewStreamCache(
	ctx context.Context,
	params *StreamCacheParams,
) (*streamCacheImpl, error) {
	s := &streamCacheImpl{
		params: params,
		cache:  xsync.NewMapOf[StreamId, *streamImpl](),
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
		chainConfig:          params.ChainConfig,
		onlineSyncWorkerPool: workerpool.New(params.Config.StreamReconciliation.OnlineWorkerPoolSize),
	}

	// schedule sync tasks for all streams that are local to this node.
	// these tasks sync up the local db with the latest block in the registry.
	var localStreamResults []*registries.GetStreamResult
	err := params.Registry.ForAllStreams(ctx, s.params.AppliedBlockNum, func(stream *registries.GetStreamResult) bool {
		if slices.Contains(stream.Nodes, params.Wallet.Address) {
			localStreamResults = append(localStreamResults, stream)
		}
		return true
	})
	if err != nil {
		return nil, err
	}

	// load local streams in-memory cache
	initialSyncWorkerPool := workerpool.New(params.Config.StreamReconciliation.InitialWorkerPoolSize)
	for _, stream := range localStreamResults {
		s.cache.Store(stream.StreamId, &streamImpl{
			params:              params,
			streamId:            stream.StreamId,
			nodes:               NewStreamNodes(stream.Nodes, params.Wallet.Address),
			lastAppliedBlockNum: params.AppliedBlockNum,
			local:               &localStreamState{},
		})
		if params.Config.StreamReconciliation.InitialWorkerPoolSize > 0 {
			s.submitSyncStreamTask(
				ctx,
				initialSyncWorkerPool,
				stream.StreamId,
				&MiniblockRef{
					Hash: stream.LastMiniblockHash,
					Num:  int64(stream.LastMiniblockNum),
				},
			)
		}
	}

	s.appliedBlockNum.Store(uint64(s.params.AppliedBlockNum))

	// Close initial worker pool after all tasks are executed.
	go func() {
		initialSyncWorkerPool.StopWait()
	}()

	// TODO: add buffered channel to avoid blocking ChainMonitor
	params.RiverChain.ChainMonitor.OnBlockWithLogs(
		s.params.AppliedBlockNum+1,
		s.onBlockWithLogs,
	)

	go s.runCacheCleanup(ctx)

	go func() {
		<-ctx.Done()
		s.onlineSyncWorkerPool.Stop()
		initialSyncWorkerPool.Stop()
	}()

	return s, nil
}

func (s *streamCacheImpl) onBlockWithLogs(ctx context.Context, blockNum crypto.BlockNumber, logs []*types.Log) {
	streamEvents, errs := s.params.Registry.FilterStreamEvents(ctx, logs)
	// Process parsed stream events even if some failed to parse
	for _, err := range errs {
		dlog.FromCtx(ctx).Error("Failed to parse stream event", "err", err)
	}

	// TODO: parallel processing?
	for streamId, events := range streamEvents {
		allocatedEvent, ok := events[0].(*river.StreamAllocated)
		if ok {
			s.onStreamAllocated(ctx, allocatedEvent, events[1:], blockNum)
			continue
		}

		stream, ok := s.cache.Load(streamId)
		if !ok {
			continue
		}
		stream.applyStreamEvents(ctx, events, blockNum)
	}

	s.appliedBlockNum.Store(uint64(blockNum))
}

func (s *streamCacheImpl) onStreamAllocated(
	ctx context.Context,
	event *river.StreamAllocated,
	otherEvents []river.EventWithStreamId,
	blockNum crypto.BlockNumber,
) {
	if slices.Contains(event.Nodes, s.params.Wallet.Address) {
		stream := &streamImpl{
			params:              s.params,
			streamId:            StreamId(event.StreamId),
			nodes:               NewStreamNodes(event.Nodes, s.params.Wallet.Address),
			lastAppliedBlockNum: blockNum,
			lastAccessedTime:    time.Now(),
			local:               &localStreamState{},
		}
		stream, created, err := s.createStreamStorage(ctx, stream, event.GenesisMiniblock)
		if err != nil {
			dlog.FromCtx(ctx).Error("Failed to allocate stream", "err", err, "streamId", stream.streamId)
		}
		if created && len(otherEvents) > 0 {
			stream.applyStreamEvents(ctx, otherEvents, blockNum)
		}
	}
}

func (s *streamCacheImpl) Params() *StreamCacheParams {
	return s.params
}

func (s *streamCacheImpl) runCacheCleanup(ctx context.Context) {
	log := dlog.FromCtx(ctx)

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
			log.Debug("stream cache cache cleanup shutdown")
			return
		}
	}
}

type CacheCleanupResult struct {
	TotalStreams    int
	UnloadedStreams int
	RemoteStreams   int
}

func (s *streamCacheImpl) CacheCleanup(ctx context.Context, enabled bool, expiration time.Duration) CacheCleanupResult {
	var (
		log    = dlog.FromCtx(ctx)
		result CacheCleanupResult
	)

	// TODO: add data structure that supports to loop over streams that have their view loaded instead of
	// looping over all streams.
	s.cache.Range(func(streamID StreamId, stream *streamImpl) bool {
		if !stream.isLocal() {
			result.RemoteStreams++
			return true
		}
		result.TotalStreams++
		if enabled {
			// TODO: add purge from cache for non-local streams.
			if stream.tryCleanup(expiration) {
				result.UnloadedStreams++
				log.Debug("stream view is unloaded from cache", "streamId", stream.streamId)
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

func (s *streamCacheImpl) tryLoadStreamRecord(
	ctx context.Context,
	streamId StreamId,
	waitForLocal bool,
) (*streamImpl, error) {
	// For GetStream the fact that record is not in cache means that there is race to get it during creation:
	// Blockchain record is already created, but this fact is not reflected yet in local storage.
	// This may happen if somebody observes record allocation on blockchain and tries to get stream
	// while local storage is being initialized.
	record, _, mb, blockNum, err := s.params.Registry.GetStreamWithGenesis(ctx, streamId)
	if err != nil {
		if !waitForLocal {
			return nil, err
		}

		// Loop here waiting for record to be created.
		// This is less optimal than implementing pub/sub, but given that this is rare codepath,
		// it is not worth over-engineering.
		ctx, cancel := context.WithTimeout(ctx, time.Second*10)
		defer cancel()
		delay := time.Millisecond * 20
	forLoop:
		for {
			select {
			case <-ctx.Done():
				return nil, ctx.Err()
			case <-time.After(delay):
				stream, _ := s.cache.Load(streamId)
				if stream != nil {
					return stream, nil
				}
				record, _, mb, blockNum, err = s.params.Registry.GetStreamWithGenesis(ctx, streamId)
				if err == nil {
					break forLoop
				}
				delay *= 2
			}
		}
	}

	nodes := NewStreamNodes(record.Nodes, s.params.Wallet.Address)

	stream := &streamImpl{
		params:              s.params,
		streamId:            streamId,
		nodes:               nodes,
		lastAppliedBlockNum: blockNum,
		lastAccessedTime:    time.Now(),
	}

	if !nodes.IsLocal() {
		stream, _ = s.cache.LoadOrStore(streamId, stream)
		return stream, nil
	}

	stream.local = &localStreamState{}

	if record.LastMiniblockNum > 0 {
		// TODO: reconcile from other nodes.
		return nil, RiverError(
			Err_INTERNAL,
			"tryLoadStreamRecord: Stream is past genesis",
			"streamId",
			streamId,
			"record",
			record,
		)
	}

	stream, _, err = s.createStreamStorage(ctx, stream, mb)
	return stream, err
}

func (s *streamCacheImpl) createStreamStorage(
	ctx context.Context,
	stream *streamImpl,
	mb []byte,
) (*streamImpl, bool, error) {
	// Lock stream, so parallel creators have to wait for the stream to be intialized.
	stream.mu.Lock()
	defer stream.mu.Unlock()
	entry, loaded := s.cache.LoadOrStore(stream.streamId, stream)
	if !loaded {
		// TODO: delete entry on failures below?

		// Our stream won the race, put into storage.
		err := s.params.Storage.CreateStreamStorage(ctx, stream.streamId, mb)
		if err != nil {
			if AsRiverError(err).Code == Err_ALREADY_EXISTS {
				// Attempt to load stream from storage. Might as well do it while under lock.
				err = stream.loadInternal(ctx)
				if err != nil {
					return nil, false, err
				}
				return stream, true, nil
			}
			return nil, false, err
		}

		// Successfully put data into storage, init stream view.
		view, err := MakeStreamView(
			ctx,
			&storage.ReadStreamFromLastSnapshotResult{
				StartMiniblockNumber: 0,
				Miniblocks:           [][]byte{mb},
			},
		)
		if err != nil {
			return nil, false, err
		}
		stream.setView(view)

		return stream, true, nil
	} else {
		// There was another record in the cache, use it.
		if entry == nil {
			return nil, false, RiverError(Err_INTERNAL, "tryLoadStreamRecord: Cache corruption", "streamId", stream.streamId)
		}
		return entry, false, nil
	}
}

func (s *streamCacheImpl) GetStream(ctx context.Context, streamId StreamId) (SyncStream, error) {
	stream, err := s.getStreamImpl(ctx, streamId)
	if err != nil {
		return nil, err
	}
	stream.mu.RLock()
	defer stream.mu.RUnlock()
	if stream.local == nil {
		return nil, RiverError(Err_INTERNAL, "GetStream: Stream is not local", "streamId", streamId)
	}
	return stream, nil
}

func (s *streamCacheImpl) getStreamImpl(ctx context.Context, streamId StreamId) (*streamImpl, error) {
	stream, _ := s.cache.Load(streamId)
	if stream == nil {
		return s.tryLoadStreamRecord(ctx, streamId, true)
	}
	return stream, nil
}

func (s *streamCacheImpl) GetStreamInfo(ctx context.Context, streamId StreamId) (StreamNodes, error) {
	stream, _ := s.cache.Load(streamId)
	if stream == nil {
		var err error
		stream, err = s.tryLoadStreamRecord(ctx, streamId, false)
		if err != nil {
			return nil, err
		}
	}
	return stream.nodes, nil
}

func (s *streamCacheImpl) ForceFlushAll(ctx context.Context) {
	s.cache.Range(func(streamID StreamId, stream *streamImpl) bool {
		stream.ForceFlush(ctx)
		return true
	})
}

func (s *streamCacheImpl) GetLoadedViews(ctx context.Context) []StreamView {
	var result []StreamView
	s.cache.Range(func(streamID StreamId, stream *streamImpl) bool {
		view := stream.tryGetView()
		if view != nil {
			result = append(result, view)
		}
		return true
	})
	return result
}

func (s *streamCacheImpl) GetMbCandidateStreams(ctx context.Context) []*streamImpl {
	var candidates []*streamImpl
	s.cache.Range(func(streamID StreamId, stream *streamImpl) bool {
		if stream.canCreateMiniblock() {
			candidates = append(candidates, stream)
		}
		return true
	})

	return candidates
}
