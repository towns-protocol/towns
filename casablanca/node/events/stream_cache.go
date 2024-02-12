package events

import (
	"context"
	"sync"

	. "github.com/river-build/river/base"
	"github.com/river-build/river/config"
	"github.com/river-build/river/crypto"
	"github.com/river-build/river/dlog"
	. "github.com/river-build/river/protocol"
	"github.com/river-build/river/registries"
	"github.com/river-build/river/storage"
)

type StreamCacheParams struct {
	Storage      storage.StreamStorage
	Wallet       *crypto.Wallet
	Riverchain   *crypto.Blockchain
	Registry     *registries.RiverRegistryContract
	StreamConfig *config.StreamConfig
}

type StreamCache interface {
	GetStream(ctx context.Context, streamId string, nodes *StreamNodes) (SyncStream, StreamView, error)
	CreateStream(
		ctx context.Context,
		streamId string,
		nodes *StreamNodes,
		genesisMiniblock *Miniblock,
	) (SyncStream, StreamView, error)
	ForceFlushAll(ctx context.Context)
	GetLoadedViews(ctx context.Context) []StreamView
}

type streamCacheImpl struct {
	params          *StreamCacheParams
	cache           sync.Map
	onNewBlockMutex sync.Mutex
}

var _ StreamCache = (*streamCacheImpl)(nil)

func NewStreamCache(ctx context.Context, params *StreamCacheParams) (*streamCacheImpl, error) {
	c := &streamCacheImpl{
		params: params,
	}
	params.Riverchain.BlockMonitor.AddListener(c.onNewBlock)
	return c, nil
}

func (s *streamCacheImpl) GetStream(ctx context.Context, streamId string, nodes *StreamNodes) (SyncStream, StreamView, error) {
	if !nodes.IsLocal() {
		return nil, nil, RiverError(
			Err_INTERNAL,
			"Cache can only be used for local streams",
			"streamId",
			streamId,
			"nodes",
			nodes.GetNodes(),
			"localNode",
			s.params.Wallet.AddressStr,
		)
	}

	entry, _ := s.cache.Load(streamId)
	if entry == nil {
		entry, _ = s.cache.LoadOrStore(streamId, &streamImpl{
			params:   s.params,
			streamId: streamId,
			nodes:    nodes,
		})
	}
	stream := entry.(*streamImpl)

	streamView, err := stream.GetView(ctx)

	if err == nil {
		return stream, streamView, nil
	} else {
		// Ditching the stream from the cache here will trigger a reload on the next call to GetStream.
		// TODO: it's not cool to drop streams if there are any subs.
		// Flush subs if load fails?
		s.cache.CompareAndDelete(streamId, stream)
		return nil, nil, err
	}
}

func (s *streamCacheImpl) CreateStream(
	ctx context.Context,
	streamId string,
	nodes *StreamNodes,
	genesisMiniblock *Miniblock,
) (SyncStream, StreamView, error) {
	if !nodes.IsLocal() {
		return nil, nil, RiverError(
			Err_INTERNAL,
			"Cache can only be used for local streams",
			"streamId",
			streamId,
			"nodes",
			nodes.GetNodes(),
			"localNode",
			s.params.Wallet.AddressStr,
		)
	}

	if existing, _ := s.cache.Load(streamId); existing != nil {
		return nil, nil, RiverError(Err_ALREADY_EXISTS, "stream already exists", "streamId", streamId)
	}

	stream, view, err := createStream(ctx, s.params, streamId, nodes, genesisMiniblock)
	if err != nil {
		return nil, nil, err
	}

	_, loaded := s.cache.LoadOrStore(streamId, stream)
	if !loaded {
		return stream, view, nil
	} else {
		// Assume that parallel GetStream created cache entry, fallback to it to retrieve winning cache entry.
		return s.GetStream(ctx, streamId, nodes)
	}
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

func (s *streamCacheImpl) onNewBlock(ctx context.Context, blockNum int64, blockHash []byte) {
	log := dlog.FromCtx(ctx)
	log.Debug("onNewBlock: ENTER producing new miniblocks", "blockNum", blockNum, "blockHash", blockHash)

	// Try lock to have only one invocation at a time. Previous onNewBlock may still be running.
	if !s.onNewBlockMutex.TryLock() {
		return
	}
	defer s.onNewBlockMutex.Unlock()

	var total, errors, produced int
	s.cache.Range(func(key, value interface{}) bool {
		stream := value.(*streamImpl)

		if stream.mbCreationEnabled() {
			// TODO: replace with vote
			// For now: only first assigned node produces blocks.
			if stream.nodes.localNodeIndex == 0 {
				total++
				// Nothing to do on error, MakeMiniblock logs on error level if there is an error.
				ok, err := stream.MakeMiniblock(ctx, false)
				if err != nil {
					errors++
				} else if ok {
					produced++
				}
			}
		}
		return true
	})

	log.Debug("onNewBlock: EXIT produced new miniblocks", "blockNum", blockNum, "total", total, "errors", errors, "produced", produced)
}
