package events

import (
	. "casablanca/node/base"
	"casablanca/node/config"
	"casablanca/node/crypto"
	. "casablanca/node/protocol"
	"casablanca/node/storage"
	"context"
	"sync"
)

type StreamCacheParams struct {
	Storage    storage.StreamStorage
	Wallet     *crypto.Wallet
	DefaultCtx context.Context
}

type StreamCache interface {
	GetStream(ctx context.Context, streamId string) (SyncStream, StreamView, error)
	CreateStream(ctx context.Context, streamId string, genesisMiniblock *Miniblock) (SyncStream, StreamView, error)
	ForceFlushAll(ctx context.Context)
	ListStreams(ctx context.Context) []string
}

type streamCacheImpl struct {
	params *StreamCacheParams
	config *config.StreamConfig
	cache  sync.Map
}

var _ StreamCache = (*streamCacheImpl)(nil)

func NewStreamCache(params *StreamCacheParams, config *config.StreamConfig) *streamCacheImpl {
	return &streamCacheImpl{
		params: params,
		config: config,
	}
}

func (s *streamCacheImpl) GetStream(ctx context.Context, streamId string) (SyncStream, StreamView, error) {
	entry, _ := s.cache.Load(streamId)
	if entry == nil {
		entry, _ = s.cache.LoadOrStore(streamId, &streamImpl{
			params:   s.params,
			streamId: streamId,
			config:   s.config,
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

func (s *streamCacheImpl) CreateStream(ctx context.Context, streamId string, genesisMiniblock *Miniblock) (SyncStream, StreamView, error) {
	if existing, _ := s.cache.Load(streamId); existing != nil {
		return nil, nil, RiverError(Err_ALREADY_EXISTS, "stream already exists", "streamId", streamId)
	}

	stream, view, err := createStream(ctx, s.params, s.config, streamId, genesisMiniblock)
	if err != nil {
		return nil, nil, err
	}

	_, loaded := s.cache.LoadOrStore(streamId, stream)
	if !loaded {
		stream.startTicker(view.InceptionPayload().GetSettings().GetMiniblockTimeMs())
		return stream, view, nil
	} else {
		// Assume that parallel GetStream created cache entry, fallback to it to retrieve winning cache entry.
		return s.GetStream(ctx, streamId)
	}
}

func (s *streamCacheImpl) ForceFlushAll(ctx context.Context) {
	s.cache.Range(func(key, value interface{}) bool {
		stream := value.(*streamImpl)
		stream.ForceFlush(ctx)
		return true
	})
}

func (s *streamCacheImpl) ListStreams(ctx context.Context) []string {
	var result []string
	s.cache.Range(func(key, value interface{}) bool {
		result = append(result, key.(string))
		return true
	})
	return result
}
