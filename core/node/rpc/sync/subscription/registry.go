package subscription

import (
	"slices"
	"sync"
	"sync/atomic"
	"unsafe"

	"github.com/puzpuzpuz/xsync/v4"

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
	shards     []*xsync.Map[StreamId, []*Subscription]
	shardCount uint32

	// Global subscription lookup
	globalSubscriptions *xsync.Map[string, *Subscription]
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

	shards := make([]*xsync.Map[StreamId, []*Subscription], shardCount)
	for i := uint32(0); i < shardCount; i++ {
		shards[i] = xsync.NewMap[StreamId, []*Subscription]()
	}

	return &shardedRegistry{
		shards:              shards,
		shardCount:          shardCount,
		globalSubscriptions: xsync.NewMap[string, *Subscription](),
	}
}

// hashStreamID returns a hash of the stream ID for sharding
func hashStreamID(streamID StreamId) uint32 {
	// Cast to uint32 slice for faster access - StreamId is always 32 bytes
	data := (*[8]uint32)(unsafe.Pointer(&streamID[0]))
	return data[0] ^ data[1] ^ data[2] ^ data[3] ^ data[4] ^ data[5] ^ data[6] ^ data[7]
}

// getShard returns the shard for a given stream ID
func (r *shardedRegistry) getShard(streamID StreamId) *xsync.Map[StreamId, []*Subscription] {
	hash := hashStreamID(streamID)
	return r.shards[hash&(r.shardCount-1)] // Fast modulo for power of 2
}

// AddSubscription adds a subscription to the registry
func (r *shardedRegistry) AddSubscription(sub *Subscription) {
	r.globalSubscriptions.Store(sub.syncID, sub)
}

// RemoveSubscription removes a subscription from the registry
func (r *shardedRegistry) RemoveSubscription(syncID string) {
	r.globalSubscriptions.Delete(syncID)

	// Remove from all shards in parallel
	var wg sync.WaitGroup
	for _, shard := range r.shards {
		wg.Add(1)
		go func(s *xsync.Map[StreamId, []*Subscription]) {
			defer wg.Done()
			s.Range(func(streamID StreamId, subs []*Subscription) bool {
				// Use Compute to atomically update the subscription list
				s.Compute(
					streamID,
					func(oldValue []*Subscription, loaded bool) (newValue []*Subscription, op xsync.ComputeOp) {
						if !loaded {
							return nil, xsync.CancelOp
						}
						newValue = slices.DeleteFunc(oldValue, func(sub *Subscription) bool {
							return sub.syncID == syncID
						})
						if len(newValue) == len(oldValue) {
							return oldValue, xsync.CancelOp
						}
						return newValue, xsync.UpdateOp
					},
				)
				return true
			})
		}(shard)
	}
	wg.Wait()
}

// GetSubscriptionsForStream returns all subscriptions for a given stream
func (r *shardedRegistry) GetSubscriptionsForStream(streamID StreamId) []*Subscription {
	if subs, ok := r.getShard(streamID).Load(streamID); ok {
		return slices.Clone(subs)
	}
	return nil
}

// GetSubscriptionByID returns a subscription by its sync ID
func (r *shardedRegistry) GetSubscriptionByID(syncID string) (*Subscription, bool) {
	sub, ok := r.globalSubscriptions.Load(syncID)
	return sub, ok
}

// AddStreamToSubscription adds a stream to a subscription
func (r *shardedRegistry) AddStreamToSubscription(syncID string, streamID StreamId) (shouldAddToRemote bool, shouldBackfill bool) {
	sub, exists := r.globalSubscriptions.Load(syncID)

	if !exists {
		return false, false
	}

	shard := r.getShard(streamID)

	shard.Compute(
		streamID,
		func(oldValue []*Subscription, loaded bool) (newValue []*Subscription, op xsync.ComputeOp) {
			if !loaded {
				shouldAddToRemote = true
				return []*Subscription{sub}, xsync.UpdateOp
			}

			// Check if subscription already exists
			if !slices.ContainsFunc(oldValue, func(s *Subscription) bool {
				return s.syncID == syncID
			}) {
				shouldBackfill = true
				sub.initializingStreams.Store(streamID, struct{}{})
				newValue = append(slices.Clone(oldValue), sub)
				return newValue, xsync.UpdateOp
			}

			// Subscription already exists, no change needed
			return oldValue, xsync.CancelOp
		},
	)

	return
}

// RemoveStreamFromSubscription removes a stream from a subscription
func (r *shardedRegistry) RemoveStreamFromSubscription(syncID string, streamID StreamId) {
	r.getShard(streamID).Compute(
		streamID,
		func(oldValue []*Subscription, loaded bool) (newValue []*Subscription, op xsync.ComputeOp) {
			newValue = slices.DeleteFunc(oldValue, func(sub *Subscription) bool {
				return sub.syncID == syncID
			})
			if len(newValue) == len(oldValue) {
				// No change, keep the old value
				return oldValue, xsync.CancelOp
			}
			return newValue, xsync.UpdateOp
		},
	)
}

// OnStreamDown is called when a stream goes down
func (r *shardedRegistry) OnStreamDown(streamID StreamId) {
	r.getShard(streamID).Delete(streamID)
}

// GetStats returns statistics about the registry
func (r *shardedRegistry) GetStats() (streamCount, subscriptionCount int) {
	subscriptionCount = r.globalSubscriptions.Size()

	// Count streams across all shards
	var totalStreams atomic.Int32
	var wg sync.WaitGroup

	for _, shard := range r.shards {
		wg.Add(1)
		go func(s *xsync.Map[StreamId, []*Subscription]) {
			defer wg.Done()
			totalStreams.Add(int32(s.Size()))
		}(shard)
	}
	wg.Wait()

	return int(totalStreams.Load()), subscriptionCount
}

// CancelAll cancels all subscriptions with the given error
func (r *shardedRegistry) CancelAll(err error) {
	// Cancel all subscriptions
	r.globalSubscriptions.Range(func(syncID string, sub *Subscription) bool {
		if !sub.isClosed() {
			sub.cancel(err)
		}
		return true
	})

	// Clear global subscriptions
	r.globalSubscriptions.Clear()

	// Clear all shards in parallel
	var wg sync.WaitGroup
	for _, shard := range r.shards {
		wg.Add(1)
		go func(s *xsync.Map[StreamId, []*Subscription]) {
			defer wg.Done()
			s.Clear()
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
		go func(s *xsync.Map[StreamId, []*Subscription]) {
			defer wg.Done()
			localStreams := make([][]byte, 0)

			// Find empty entries
			s.Range(func(streamID StreamId, subs []*Subscription) bool {
				if len(subs) == 0 {
					localStreams = append(localStreams, streamID[:])
				}
				return true
			})

			// Clean up empty entries
			for _, streamBytes := range localStreams {
				s.Delete(StreamId(streamBytes))
			}

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
		go func(idx int, s *xsync.Map[StreamId, []*Subscription]) {
			defer wg.Done()
			stats[idx].ShardIndex = idx
			stats[idx].StreamCount = s.Size()
		}(i, shard)
	}
	wg.Wait()

	return stats
}
