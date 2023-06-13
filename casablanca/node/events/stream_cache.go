package events

import (
	"casablanca/node/storage"
	"context"
	"fmt"
	"sync"
)

type StreamCache interface {
	GetStream(ctx context.Context, streamId string) (*Stream, StreamView, error)
	CreateStream(ctx context.Context, streamId string, events []*ParsedEvent) (*Stream, StreamView, error)
}

type streamCacheImpl struct {
	storage storage.Storage
	cache   sync.Map
}

func NewStreamCache(storage storage.Storage) *streamCacheImpl {
	return &streamCacheImpl{
		storage: storage,
	}
}

func (s *streamCacheImpl) GetStream(ctx context.Context, streamId string) (*Stream, StreamView, error) {
	entry, _ := s.cache.Load(streamId)
	if entry == nil {
		entry, _ = s.cache.LoadOrStore(streamId, &Stream{
			storage:  s.storage,
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

func (s *streamCacheImpl) CreateStream(ctx context.Context, streamId string, events []*ParsedEvent) (*Stream, StreamView, error) {
	if existing, _ := s.cache.Load(streamId); existing != nil {
		return nil, nil, fmt.Errorf("stream already exists, %s", streamId)
	}

	stream, view, err := createStream(ctx, s.storage, streamId, events)
	if err != nil {
		return nil, nil, err
	}

	_, loaded := s.cache.LoadOrStore(streamId, stream)
	if !loaded {
		return stream, view, nil
	} else {
		// Assume that parallel GetStream created cache entry, fallback to it to retrieve winning cache entry.
		return s.GetStream(ctx, streamId)
	}
}
