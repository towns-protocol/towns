package subscription

import (
	"slices"
	"sync"
	"sync/atomic"
	"unsafe"

	. "github.com/towns-protocol/towns/core/node/shared"
)

// Registry defines the contract for managing subscription lifecycle
type Registry interface {
	AddSubscription(sub *Subscription)
	RemoveSubscription(syncID string)
	GetSubscriptionsForStream(streamID StreamId) []*Subscription
	GetSubscriptionByID(syncID string) (*Subscription, bool)
	AddStreamToSubscription(syncID string, streamID StreamId) (shouldAddToRemote bool, shouldBackfill bool)
	RemoveStreamFromSubscription(syncID string, streamID StreamId)
	OnStreamDown(streamID StreamId)
	CleanupUnusedStreams(func(streamIds [][]byte))
	GetStats() (streamCount, subscriptionCount int)
	CancelAll(err error)
}

// shardedRegistry implements Registry interface with sharding for better concurrency
type shardedRegistry struct {
	shards     []*registryShard
	shardCount uint32

	// Global subscription lookup - we use a single map with read-write lock
	// since subscription lookups by ID are less frequent than stream operations
	globalSubsLock      sync.RWMutex
	globalSubscriptions map[string]*Subscription
}

type registryShard struct {
	mu sync.RWMutex
	// subscriptionsByStream is a map of stream IDs to subscriptions
	subscriptionsByStream map[StreamId][]*Subscription
}

// newShardedRegistry creates a new sharded subscription registry
func newShardedRegistry(shardCount uint32) *shardedRegistry {
	if shardCount == 0 {
		shardCount = 32 // Default to 32 shards
	}

	// Ensure shard count is a power of 2 for efficient modulo
	if shardCount&(shardCount-1) != 0 {
		// Round up to next power of 2
		v := shardCount
		v--
		v |= v >> 1
		v |= v >> 2
		v |= v >> 4
		v |= v >> 8
		v |= v >> 16
		v++
		shardCount = v
	}

	shards := make([]*registryShard, shardCount)
	for i := uint32(0); i < shardCount; i++ {
		shards[i] = &registryShard{
			subscriptionsByStream: make(map[StreamId][]*Subscription),
		}
	}

	return &shardedRegistry{
		shards:              shards,
		shardCount:          shardCount,
		globalSubscriptions: make(map[string]*Subscription),
	}
}

// hashStreamID returns a hash of the stream ID for sharding
func hashStreamID(streamID StreamId) uint32 {
	// Cast to uint32 slice for faster access - StreamId is always 32 bytes
	data := (*[8]uint32)(unsafe.Pointer(&streamID[0]))
	return data[0] ^ data[1] ^ data[2] ^ data[3] ^ data[4] ^ data[5] ^ data[6] ^ data[7]
}

// getShard returns the shard for a given stream ID
func (r *shardedRegistry) getShard(streamID StreamId) *registryShard {
	hash := hashStreamID(streamID)
	return r.shards[hash&(r.shardCount-1)] // Fast modulo for power of 2
}

// AddSubscription adds a subscription to the registry
func (r *shardedRegistry) AddSubscription(sub *Subscription) {
	r.globalSubsLock.Lock()
	r.globalSubscriptions[sub.syncID] = sub
	r.globalSubsLock.Unlock()
}

// RemoveSubscription removes a subscription from the registry
func (r *shardedRegistry) RemoveSubscription(syncID string) {
	r.globalSubsLock.Lock()
	delete(r.globalSubscriptions, syncID)
	r.globalSubsLock.Unlock()

	// Remove from all shards in parallel
	var wg sync.WaitGroup
	for _, shard := range r.shards {
		wg.Add(1)
		go func(s *registryShard) {
			defer wg.Done()
			s.mu.Lock()
			for streamID, subs := range s.subscriptionsByStream {
				s.subscriptionsByStream[streamID] = slices.DeleteFunc(subs, func(sub *Subscription) bool {
					return sub.syncID == syncID
				})
			}
			s.mu.Unlock()
		}(shard)
	}
	wg.Wait()
}

// GetSubscriptionsForStream returns all subscriptions for a given stream
func (r *shardedRegistry) GetSubscriptionsForStream(streamID StreamId) []*Subscription {
	shard := r.getShard(streamID)

	shard.mu.RLock()
	subs := slices.Clone(shard.subscriptionsByStream[streamID])
	shard.mu.RUnlock()

	return subs
}

// GetSubscriptionByID returns a subscription by its sync ID
func (r *shardedRegistry) GetSubscriptionByID(syncID string) (*Subscription, bool) {
	r.globalSubsLock.RLock()
	sub, ok := r.globalSubscriptions[syncID]
	r.globalSubsLock.RUnlock()
	return sub, ok
}

// AddStreamToSubscription adds a stream to a subscription
func (r *shardedRegistry) AddStreamToSubscription(syncID string, streamID StreamId) (shouldAddToRemote bool, shouldBackfill bool) {
	r.globalSubsLock.RLock()
	sub, exists := r.globalSubscriptions[syncID]
	r.globalSubsLock.RUnlock()

	if !exists {
		return false, false
	}

	shard := r.getShard(streamID)

	shard.mu.Lock()
	defer shard.mu.Unlock()

	subscriptions, ok := shard.subscriptionsByStream[streamID]
	if !ok {
		shouldAddToRemote = true
		shard.subscriptionsByStream[streamID] = []*Subscription{sub}
	} else if !slices.ContainsFunc(subscriptions, func(s *Subscription) bool {
		return s.syncID == syncID
	}) {
		shouldBackfill = true
		sub.initializingStreams.Store(streamID, struct{}{})
		shard.subscriptionsByStream[streamID] = append(shard.subscriptionsByStream[streamID], sub)
	}
	return
}

// RemoveStreamFromSubscription removes a stream from a subscription
func (r *shardedRegistry) RemoveStreamFromSubscription(syncID string, streamID StreamId) {
	shard := r.getShard(streamID)

	shard.mu.Lock()
	shard.subscriptionsByStream[streamID] = slices.DeleteFunc(
		shard.subscriptionsByStream[streamID],
		func(sub *Subscription) bool {
			return sub.syncID == syncID
		},
	)
	shard.mu.Unlock()
}

// OnStreamDown is called when a stream goes down
func (r *shardedRegistry) OnStreamDown(streamID StreamId) {
	shard := r.getShard(streamID)

	shard.mu.Lock()
	delete(shard.subscriptionsByStream, streamID)
	shard.mu.Unlock()
}

// GetStats returns statistics about the registry
func (r *shardedRegistry) GetStats() (streamCount, subscriptionCount int) {
	r.globalSubsLock.RLock()
	subscriptionCount = len(r.globalSubscriptions)
	r.globalSubsLock.RUnlock()

	// Count streams across all shards
	var totalStreams atomic.Int32
	var wg sync.WaitGroup

	for _, shard := range r.shards {
		wg.Add(1)
		go func(s *registryShard) {
			defer wg.Done()
			s.mu.RLock()
			totalStreams.Add(int32(len(s.subscriptionsByStream)))
			s.mu.RUnlock()
		}(shard)
	}
	wg.Wait()

	return int(totalStreams.Load()), subscriptionCount
}

// CancelAll cancels all subscriptions with the given error
func (r *shardedRegistry) CancelAll(err error) {
	r.globalSubsLock.Lock()
	for _, sub := range r.globalSubscriptions {
		if !sub.isClosed() {
			sub.cancel(err)
		}
	}
	r.globalSubscriptions = make(map[string]*Subscription)
	r.globalSubsLock.Unlock()

	// Clear all shards in parallel
	var wg sync.WaitGroup
	for _, shard := range r.shards {
		wg.Add(1)
		go func(s *registryShard) {
			defer wg.Done()
			s.mu.Lock()
			s.subscriptionsByStream = make(map[StreamId][]*Subscription)
			s.mu.Unlock()
		}(shard)
	}
	wg.Wait()
}

// CleanupUnusedStreams removes unused streams from the syncer set
func (r *shardedRegistry) CleanupUnusedStreams(cb func(streamIds [][]byte)) {
	streamIds := make([][]byte, 0)
	var mu sync.Mutex

	// Check all shards in parallel
	var wg sync.WaitGroup
	for _, shard := range r.shards {
		wg.Add(1)
		go func(s *registryShard) {
			defer wg.Done()
			localStreams := make([][]byte, 0)

			s.mu.Lock()
			for streamID, subs := range s.subscriptionsByStream {
				if len(subs) == 0 {
					localStreams = append(localStreams, streamID[:])
				}
			}

			// Clean up empty entries
			for _, streamBytes := range localStreams {
				delete(s.subscriptionsByStream, StreamId(streamBytes))
			}
			s.mu.Unlock()

			// Add to global list
			if len(localStreams) > 0 {
				mu.Lock()
				streamIds = append(streamIds, localStreams...)
				mu.Unlock()
			}
		}(shard)
	}
	wg.Wait()

	if len(streamIds) > 0 && cb != nil {
		cb(streamIds)
	}
}

// GetShardStats returns statistics for each shard (useful for monitoring)
func (r *shardedRegistry) GetShardStats() []struct {
	ShardIndex  int
	StreamCount int
} {
	stats := make([]struct {
		ShardIndex  int
		StreamCount int
	}, r.shardCount)

	var wg sync.WaitGroup
	for i, shard := range r.shards {
		wg.Add(1)
		go func(idx int, s *registryShard) {
			defer wg.Done()
			s.mu.RLock()
			stats[idx].ShardIndex = idx
			stats[idx].StreamCount = len(s.subscriptionsByStream)
			s.mu.RUnlock()
		}(i, shard)
	}
	wg.Wait()

	return stats
}
