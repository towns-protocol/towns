package events

import (
	"casablanca/node/storage"
	"context"
	"fmt"
	"sync"

	"golang.org/x/sync/singleflight"
)

type StreamCache interface {
	GetStream(ctx context.Context, streamId string) (*Stream, error)
	CreateStream(ctx context.Context, streamId string, events []*ParsedEvent) (*Stream, string, error)
}

type streamCacheImpl struct {
	storage storage.Storage
	cache   sync.Map
	group   singleflight.Group
}

func NewStreamCache(storage storage.Storage) *streamCacheImpl {
	return &streamCacheImpl{
		storage: storage,
	}
}

func (s *streamCacheImpl) GetStream(ctx context.Context, streamId string) (*Stream, error) {
	if stream, ok := s.cache.Load(streamId); ok {
		return stream.(*Stream), nil
	}

	result, err, _ := s.group.Do(streamId, func() (interface{}, error) {
		if stream, ok := s.cache.Load(streamId); ok {
			return stream, nil
		}
		stream, err := loadStream(ctx, s.storage, streamId)
		if err == nil {
			s.cache.Store(streamId, stream)
			return stream, nil
		} else {
			return nil, err
		}
	})
	if err != nil {
		return nil, err
	}
	return result.(*Stream), nil
}

func (s *streamCacheImpl) CreateStream(ctx context.Context, streamId string, events []*ParsedEvent) (*Stream, string, error) {
	if _, ok := s.cache.Load(streamId); ok {
		return nil, "", fmt.Errorf("stream already exists, %s", streamId)
	}

	stream, cookie, err := createStream(ctx, s.storage, streamId, events)
	if err != nil {
		return nil, "", err
	}
	_, loaded := s.cache.LoadOrStore(streamId, stream)
	if loaded {
		return nil, "", fmt.Errorf("another stream create in parallel, %s", streamId)
	}
	return stream, cookie, nil
}
