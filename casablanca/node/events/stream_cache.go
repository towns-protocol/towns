package events

import (
	. "casablanca/node/base"
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
	GetStream(ctx context.Context, streamId string) (*Stream, StreamView, error)
	CreateStream(ctx context.Context, streamId string, events []*ParsedEvent) (*Stream, StreamView, error)
	ForceFlushAll(ctx context.Context)
}

type streamCacheImpl struct {
	params *StreamCacheParams
	cache  sync.Map
}

func NewStreamCache(params *StreamCacheParams) *streamCacheImpl {
	return &streamCacheImpl{
		params: params,
	}
}

func (s *streamCacheImpl) GetStream(ctx context.Context, streamId string) (*Stream, StreamView, error) {
	entry, _ := s.cache.Load(streamId)
	if entry == nil {
		entry, _ = s.cache.LoadOrStore(streamId, &Stream{
			params:   s.params,
			streamId: streamId,
		})
	}
	stream := entry.(*Stream)

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

func (s *streamCacheImpl) CreateStream(ctx context.Context, streamId string, genesisMiniblockEvents []*ParsedEvent) (*Stream, StreamView, error) {
	if existing, _ := s.cache.Load(streamId); existing != nil {
		return nil, nil, RiverErrorf(Err_STREAM_ALREADY_EXISTS, "stream already exists, %s", streamId)
	}

	stream, view, err := createStream(ctx, s.params, streamId, genesisMiniblockEvents)
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
		stream := value.(*Stream)
		stream.ForceFlush(ctx)
		return true
	})
}
