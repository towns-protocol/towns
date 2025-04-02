package events

import (
	"context"
	"fmt"
	"slices"
	"sync"
	"sync/atomic"
	"time"

	mapset "github.com/deckarep/golang-set/v2"
	"github.com/ethereum/go-ethereum/common"
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
	return &StreamCache{
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
			for len(events) > 0 {
				switch events[0].Reason() {
				case river.StreamUpdatedEventTypeAllocate:
					streamState := events[0].(*river.StreamState)
					s.onStreamAllocated(ctx, streamState, events[1:], blockNum)
					events = nil
				case river.StreamUpdatedEventTypeCreate:
					streamState := events[0].(*river.StreamState)
					s.onStreamCreated(ctx, streamState, blockNum)
					events = events[1:]
				case river.StreamUpdatedEventTypePlacementUpdated:
					streamState := events[0].(*river.StreamState)
					s.onStreamReplacementUpdated(ctx, streamState, blockNum)
					events = events[1:]
				case river.StreamUpdatedEventTypeLastMiniblockBatchUpdated:
					i := 1
					for i < len(events) && events[i].Reason() == river.StreamUpdatedEventTypeLastMiniblockBatchUpdated {
						i++
					}
					eventsToApply := events[:i]
					events = events[i:]

					stream, ok := s.cache.Load(streamID)
					if !ok {
						return
					}

					if stream.nodesLocked.IsLocalInQuorum() {
						for _, event := range eventsToApply {
							e := event.(*river.StreamMiniblockUpdate)
							fmt.Printf(
								"BVK DBG event stream: %s blocknum: %d node: %s\n",
								event.GetStreamId(),
								e.SetMiniblock.LastMiniblockNum,
								s.params.Wallet.Address,
							)
						}
					}
					// COMMENT: Move logic from here to applyStreamEvents - mutex should be taken
					stream.applyStreamEvents(ctx, eventsToApply, blockNum)
				}
			}
		})
	}

	wp.StopWait()

	s.appliedBlockNum.Store(uint64(blockNum))
}

func (s *StreamCache) onStreamReplacementUpdated(
	ctx context.Context,
	event *river.StreamState,
	blockNum crypto.BlockNumber,
) {
	if !slices.Contains(event.Nodes, s.params.Wallet.Address) {
		// TODO: if stream is removed from this node cleanup stream storage/cache.
		return
	}

	fmt.Printf("BVK DBG onStreamReplacementUpdated: %s on node %s\n", event.GetStreamId(), s.params.Wallet.Address)

	stream := &Stream{
		streamId:            event.GetStreamId(),
		lastAppliedBlockNum: blockNum,
		params:              s.params,
		local:               &localStreamState{},
	}

	stream, _ = s.cache.LoadOrStore(event.GetStreamId(), stream)
	stream.mu.Lock()
	stream.nodesLocked.ResetFromStreamState(event, s.params.Wallet.Address)
	if stream.local == nil {
		stream.local = &localStreamState{}
	}
	stream.mu.Unlock()

	fmt.Printf(
		"BVK DBG onStreamReplacementUpdated: submit sync task for stream %s on node %s [quorum nodes: %v]\n",
		event.GetStreamId(),
		s.params.Wallet.Address,
		stream.nodesLocked.GetQuorumNodes(),
	)

	s.SubmitSyncStreamTask(ctx, stream)
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

	_, genesisHash, genesisMB, genesisMbNum, err := s.params.Registry.GetStreamWithGenesis(ctx, event.StreamID)
	if err != nil {
		logging.FromCtx(ctx).Errorw("Failed to get genesis block for allocated stream", "err", err)
		return
	}

	if event.LastMiniblockHash != genesisHash {
		logging.FromCtx(ctx).Errorw("Unexpected genesis miniblock hash on allocated stream")
		return
	}

	stream := &Stream{
		params:              s.params,
		streamId:            event.GetStreamId(),
		lastAppliedBlockNum: blockNum,
		lastAccessedTime:    time.Now(),
		local:               &localStreamState{},
	}
	stream.nodesLocked.ResetFromStreamState(event, s.params.Wallet.Address)
	stream, created, err := s.createStreamStorage(ctx, stream, genesisMB, genesisMbNum, genesisHash)
	if err != nil {
		logging.FromCtx(ctx).Errorw("Failed to allocate stream", "err", err, "streamId", event.GetStreamId())
	}
	if created && len(otherEvents) > 0 {
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

func (s *StreamCache) tryLoadStreamRecord(
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

	// For GetStream the fact that record is not in cache means that there is race to get it during creation:
	// Blockchain record is already created, but this fact is not reflected yet in local storage.
	// This may happen if somebody observes record allocation on blockchain and tries to get stream
	// while local storage is being initialized.
	record, hash, mb, blockNum, err := s.params.Registry.GetStreamWithGenesis(ctx, streamId)
	if err != nil {
		if !waitForLocal {
			s.loadStreamRecordCounter.IncFail()
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
				s.loadStreamRecordCounter.IncFail()
				return nil, AsRiverError(ctx.Err(), Err_INTERNAL).Message("Timeout waiting for cache record to be created")
			case <-time.After(delay):
				stream, _ := s.cache.Load(streamId)
				if stream != nil {
					s.loadStreamRecordCounter.IncPass()
					return stream, nil
				}
				record, hash, mb, blockNum, err = s.params.Registry.GetStreamWithGenesis(ctx, streamId)
				if err == nil {
					break forLoop
				}
				delay *= 2
			}
		}
	}

	stream := &Stream{
		params:              s.params,
		streamId:            streamId,
		lastAppliedBlockNum: blockNum,
		lastAccessedTime:    time.Now(),
	}
	stream.nodesLocked.ResetFromStreamResult(record, s.params.Wallet.Address)

	if !stream.nodesLocked.IsLocal() {
		stream, _ = s.cache.LoadOrStore(streamId, stream)
		s.loadStreamRecordCounter.IncPass()
		return stream, nil
	}

	stream.local = &localStreamState{}

	if record.LastMiniblockNum > 0 {
		s.loadStreamRecordCounter.IncFail()
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

	stream, _, err = s.createStreamStorage(ctx, stream, mb, blockNum, hash)
	if err != nil {
		s.loadStreamRecordCounter.IncFail()
		return nil, err
	}

	s.loadStreamRecordCounter.IncPass()
	return stream, nil
}

func (s *StreamCache) createStreamStorage(
	ctx context.Context,
	stream *Stream,
	data []byte,
	num crypto.BlockNumber,
	hash common.Hash,
) (*Stream, bool, error) {
	// Lock stream, so parallel creators have to wait for the stream to be intialized.
	stream.mu.Lock()
	defer stream.mu.Unlock()
	entry, loaded := s.cache.LoadOrStore(stream.streamId, stream)
	if !loaded {
		// TODO: delete entry on failures below?

		// Our stream won the race, put into storage.
		err := s.params.Storage.CreateStreamStorage(ctx, stream.streamId, data)
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
			&storage.ReadStreamFromLastSnapshotResult{
				Miniblocks: []*storage.MiniblockDescriptor{{
					Data:   data,
					Number: num.AsBigInt().Int64(),
					Hash:   hash,
				}},
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
		return s.tryLoadStreamRecord(ctx, streamId, waitForLocal)
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
