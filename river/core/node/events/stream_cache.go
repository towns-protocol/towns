package events

import (
	"context"
	"sync"
	"time"

	"github.com/prometheus/client_golang/prometheus"

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
	AppliedBlockNum         crypto.BlockNumber
	ChainMonitor            crypto.ChainMonitor // TODO: delete and use RiverChain.ChainMonitor
	Metrics                 infra.MetricsFactory
	RemoteMiniblockProvider RemoteMiniblockProvider
}

type StreamCache interface {
	Params() *StreamCacheParams
	GetStream(ctx context.Context, streamId StreamId) (SyncStream, StreamView, error)
	GetSyncStream(ctx context.Context, streamId StreamId) (SyncStream, error)
	CreateStream(ctx context.Context, streamId StreamId) (SyncStream, StreamView, error)
	ForceFlushAll(ctx context.Context)
	GetLoadedViews(ctx context.Context) []StreamView
	GetMbCandidateStreams(ctx context.Context) []*streamImpl
}

type streamCacheImpl struct {
	params *StreamCacheParams

	// streamId -> *streamImpl
	// cache is populated by getting all streams that should be on local node from River chain.
	// streamImpl can be in unloaded state, in which case it will be loaded on first GetStream call.
	cache sync.Map

	chainConfig crypto.OnChainConfiguration

	streamCacheSizeGauge     prometheus.Gauge
	streamCacheUnloadedGauge prometheus.Gauge
}

var _ StreamCache = (*streamCacheImpl)(nil)

func NewStreamCache(
	ctx context.Context,
	params *StreamCacheParams,
) (*streamCacheImpl, error) {
	s := &streamCacheImpl{
		params: params,
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
		chainConfig: params.ChainConfig,
	}

	streams, err := params.Registry.GetAllStreams(ctx, params.AppliedBlockNum)
	if err != nil {
		return nil, err
	}

	// TODO: read stream state from storage and schedule required reconciliations.

	for _, stream := range streams {
		nodes := NewStreamNodes(stream.Nodes, params.Wallet.Address)
		if nodes.IsLocal() {
			s.cache.Store(stream.StreamId, &streamImpl{
				params:   params,
				streamId: stream.StreamId,
				nodes:    nodes,
			})
		}
	}

	err = params.Registry.OnStreamEvent(
		ctx,
		params.AppliedBlockNum+1,
		s.onStreamAllocated,
		s.onStreamLastMiniblockUpdated,
		s.onStreamPlacementUpdated,
	)
	if err != nil {
		return nil, err
	}

	go s.runCacheCleanup(ctx)

	return s, nil
}

func (s *streamCacheImpl) onStreamAllocated(ctx context.Context, event *river.StreamRegistryV1StreamAllocated) {
}

func (s *streamCacheImpl) onStreamLastMiniblockUpdated(
	ctx context.Context,
	event *river.StreamRegistryV1StreamLastMiniblockUpdated,
) {
	entry, _ := s.cache.Load(StreamId(event.StreamId))
	if entry == nil {
		// Stream is not local, ignore.
		return
	}

	stream := entry.(*streamImpl)

	view, err := stream.getView(ctx)
	if err != nil {
		dlog.FromCtx(ctx).Error("onStreamLastMiniblockUpdated: failed to get stream view", "err", err)
		return
	}

	// Check if current state is beyond candidate. (Local candidates are applied immediately after tx).
	if uint64(view.LastBlock().Num) >= event.LastMiniblockNum {
		return
	}

	err = stream.PromoteCandidate(ctx, event.LastMiniblockHash, int64(event.LastMiniblockNum))
	if err != nil {
		dlog.FromCtx(ctx).Error("onStreamLastMiniblockUpdated: failed to promote candidate", "err", err)
	}
}

func (s *streamCacheImpl) onStreamPlacementUpdated(
	ctx context.Context,
	event *river.StreamRegistryV1StreamPlacementUpdated,
) {
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
			s.cacheCleanup(ctx, expirationEnabled, s.params.ChainConfig.Get().StreamCacheExpiration)
		case <-ctx.Done():
			log.Debug("stream cache cache cleanup shutdown")
			return
		}
	}
}

func (s *streamCacheImpl) cacheCleanup(ctx context.Context, enabled bool, expiration time.Duration) {
	var (
		log                  = dlog.FromCtx(ctx)
		totalStreamsCount    = 0
		unloadedStreamsCount = 0
	)

	// TODO: add data structure that supports to loop over streams that have their view loaded instead of
	// looping over all streams.
	s.cache.Range(func(streamID, streamVal any) bool {
		totalStreamsCount++
		if enabled {
			if stream := streamVal.(*streamImpl); stream.tryCleanup(expiration) {
				unloadedStreamsCount++
				log.Debug("stream view is unloaded from cache", "streamId", stream.streamId)
			}
		}
		return true
	})

	s.streamCacheSizeGauge.Set(float64(totalStreamsCount))
	if enabled {
		s.streamCacheUnloadedGauge.Set(float64(unloadedStreamsCount))
	} else {
		s.streamCacheUnloadedGauge.Set(float64(-1))
	}
}

func (s *streamCacheImpl) tryLoadStreamRecord(
	ctx context.Context,
	streamId StreamId,
	loadView bool,
) (SyncStream, StreamView, error) {
	// Same code is called for GetStream, GetSyncStream and CreateStream.
	// For GetStream the fact that record is not in cache means that there is race to get it during creation:
	// Blockchain record is already created, but this fact is not reflected yet in local storage.
	// This may happen if somebody observes record allocation on blockchain and tries to get stream
	// while local storage is being initialized.
	record, _, mb, err := s.params.Registry.GetStreamWithGenesis(ctx, streamId)
	if err != nil {
		return nil, nil, err
	}

	nodes := NewStreamNodes(record.Nodes, s.params.Wallet.Address)
	if !nodes.IsLocal() {
		return nil, nil, RiverError(
			Err_INTERNAL,
			"tryLoadStreamRecord: Stream is not local",
			"streamId", streamId,
			"nodes", record.Nodes,
			"localNode", s.params.Wallet,
		)
	}

	if record.LastMiniblockNum > 0 {
		// TODO: reconcile from other nodes.
		return nil, nil, RiverError(
			Err_INTERNAL,
			"tryLoadStreamRecord: Stream is past genesis",
			"streamId",
			streamId,
			"record",
			record,
		)
	}

	stream := &streamImpl{
		params:           s.params,
		streamId:         streamId,
		nodes:            nodes,
		lastAccessedTime: time.Now(),
	}

	// Lock stream, so parallel creators have to wait for the stream to be intialized.
	stream.mu.Lock()
	defer stream.mu.Unlock()

	entry, loaded := s.cache.LoadOrStore(streamId, stream)
	if !loaded {
		// Our stream won the race, put into storage.
		err := s.params.Storage.CreateStreamStorage(ctx, streamId, mb)
		if err != nil {
			if AsRiverError(err).Code == Err_ALREADY_EXISTS {
				if loadView {
					// Attempt to load stream from storage. Might as well do it while under lock.
					if err = stream.loadInternal(ctx); err == nil {
						return stream, stream.view, nil
					}
					return nil, nil, err
				}
				return stream, nil, err
			}
			return nil, nil, err
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
			return nil, nil, err
		}
		stream.view = view
		return stream, view, nil
	} else {
		// There was another record in the cache, use it.
		if entry == nil {
			return nil, nil, RiverError(Err_INTERNAL, "tryLoadStreamRecord: Cache corruption", "streamId", streamId)
		}
		stream = entry.(*streamImpl)
		if !loadView {
			return stream, nil, err
		}

		view, err := stream.GetView(ctx)
		if err != nil {
			return nil, nil, err
		}
		return stream, view, nil
	}
}

func (s *streamCacheImpl) GetStream(ctx context.Context, streamId StreamId) (SyncStream, StreamView, error) {
	entry, _ := s.cache.Load(streamId)
	if entry == nil {
		return s.tryLoadStreamRecord(ctx, streamId, true)
	}
	stream := entry.(*streamImpl)

	streamView, err := stream.GetView(ctx)

	if err == nil {
		return stream, streamView, nil
	} else {
		// TODO: if stream is not present in local storage, schedule reconciliation.
		return nil, nil, err
	}
}

func (s *streamCacheImpl) getStreamImpl(ctx context.Context, streamId StreamId) (*streamImpl, error) {
	entry, _ := s.cache.Load(streamId)
	if entry == nil {
		syncStream, _, err := s.tryLoadStreamRecord(ctx, streamId, false)
		return syncStream.(*streamImpl), err
	}
	return entry.(*streamImpl), nil
}

func (s *streamCacheImpl) GetSyncStream(ctx context.Context, streamId StreamId) (SyncStream, error) {
	entry, _ := s.cache.Load(streamId)
	if entry == nil {
		syncStream, _, err := s.tryLoadStreamRecord(ctx, streamId, false)
		return syncStream, err
	}
	return entry.(*streamImpl), nil
}

func (s *streamCacheImpl) CreateStream(
	ctx context.Context,
	streamId StreamId,
) (SyncStream, StreamView, error) {
	// Same logic as in GetStream: read from blockchain, create if present.
	return s.GetStream(ctx, streamId)
}

func (s *streamCacheImpl) ForceFlushAll(ctx context.Context) {
	s.cache.Range(func(key, value interface{}) bool {
		stream := value.(*streamImpl)
		stream.ForceFlush(ctx)
		return true
	})
}

func (s *streamCacheImpl) GetLoadedViews(ctx context.Context) []StreamView {
	var result []StreamView
	s.cache.Range(func(key, value interface{}) bool {
		stream := value.(*streamImpl)
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
	s.cache.Range(func(key, value interface{}) bool {
		stream := value.(*streamImpl)
		if stream.canCreateMiniblock() {
			candidates = append(candidates, stream)
		}
		return true
	})

	return candidates
}
