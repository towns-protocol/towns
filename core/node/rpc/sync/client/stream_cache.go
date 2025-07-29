package client

import (
	"context"

	"github.com/ethereum/go-ethereum/common"

	"github.com/towns-protocol/towns/core/node/events"
	. "github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/shared"
)

// Stream represents the behavior of a stream.
type Stream interface {
	GetRemotesAndIsLocal() ([]common.Address, bool)
	GetStickyPeer() common.Address
	AdvanceStickyPeer(currentPeer common.Address) common.Address
	UpdatesSinceCookie(ctx context.Context, cookie *SyncCookie, callback func(streamAndCookie *StreamAndCookie) error) error
	Sub(ctx context.Context, cookie *SyncCookie, r events.SyncResultReceiver) error
	Unsub(r events.SyncResultReceiver)
	StreamId() StreamId
}

// StreamCache represents a behavior of the stream cache.
type StreamCache interface {
	GetStreamWaitForLocal(ctx context.Context, streamId StreamId) (Stream, error)
	GetStreamNoWait(ctx context.Context, streamId StreamId) (Stream, error)
}

// StreamCacheWrapper is a wrapper around the events.StreamCache that implements the StreamCache interface.
// This is created to be able to unit test the code that uses StreamCache without relying on the actual events.StreamCache implementation.
type StreamCacheWrapper struct {
	cache *events.StreamCache
}

// NewStreamCacheWrapper creates a new StreamCacheWrapper instance from the given events.StreamCache.
func NewStreamCacheWrapper(cache *events.StreamCache) StreamCache {
	return &StreamCacheWrapper{cache: cache}
}

func (scw *StreamCacheWrapper) GetStreamWaitForLocal(ctx context.Context, streamId StreamId) (Stream, error) {
	return scw.cache.GetStreamWaitForLocal(ctx, streamId)
}

func (scw *StreamCacheWrapper) GetStreamNoWait(ctx context.Context, streamId StreamId) (Stream, error) {
	return scw.cache.GetStreamNoWait(ctx, streamId)
}
