package subscription

import (
	"fmt"
	"testing"

	"github.com/stretchr/testify/assert"

	. "github.com/towns-protocol/towns/core/node/shared"
)

func TestRegistry_AddSubscription(t *testing.T) {
	tests := []struct {
		name  string
		setup func(t *testing.T) (*shardedRegistry, *Subscription)
	}{
		{
			name: "successfully add subscription",
			setup: func(t *testing.T) (*shardedRegistry, *Subscription) {
				reg := newShardedRegistry(32)
				sub := createTestSubscription("test-sync-1")
				return reg, sub
			},
		},
		{
			name: "add multiple subscriptions",
			setup: func(t *testing.T) (*shardedRegistry, *Subscription) {
				reg := newShardedRegistry(32)
				reg.AddSubscription(createTestSubscription("test-sync-1"))
				sub := createTestSubscription("test-sync-2")
				return reg, sub
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			reg, sub := tt.setup(t)

			reg.AddSubscription(sub)

			// Verify subscription was added
			retrieved, exists := reg.GetSubscriptionByID(sub.syncID)
			assert.True(t, exists)
			assert.Equal(t, sub, retrieved)
		})
	}
}

func TestRegistry_RemoveSubscription(t *testing.T) {
	tests := []struct {
		name           string
		setup          func(t *testing.T) *shardedRegistry
		syncIDToRemove string
		verifyRemoved  bool
	}{
		{
			name: "successfully remove existing subscription",
			setup: func(t *testing.T) *shardedRegistry {
				reg := newShardedRegistry(32)
				reg.AddSubscription(createTestSubscription("test-sync-1"))
				streamCount, subsCount := reg.GetStats()
				assert.Equal(t, 0, streamCount)
				assert.Equal(t, 1, subsCount)
				return reg
			},
			syncIDToRemove: "test-sync-1",
			verifyRemoved:  true,
		},
		{
			name: "remove non-existent subscription",
			setup: func(t *testing.T) *shardedRegistry {
				reg := newShardedRegistry(32)
				reg.AddSubscription(createTestSubscription("test-sync-1"))
				streamCount, subsCount := reg.GetStats()
				assert.Equal(t, 0, streamCount)
				assert.Equal(t, 1, subsCount)
				return reg
			},
			syncIDToRemove: "non-existent",
			verifyRemoved:  false,
		},
		{
			name: "remove subscription with streams",
			setup: func(t *testing.T) *shardedRegistry {
				reg := newShardedRegistry(32)
				sub := createTestSubscription("test-sync-1")
				reg.AddSubscription(sub)
				reg.AddStreamToSubscription("test-sync-1", StreamId{1, 2, 3, 4})
				streamCount, subsCount := reg.GetStats()
				assert.Equal(t, 1, streamCount)
				assert.Equal(t, 1, subsCount)
				return reg
			},
			syncIDToRemove: "test-sync-1",
			verifyRemoved:  true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			reg := tt.setup(t)

			reg.RemoveSubscription(tt.syncIDToRemove)
			reg.CleanupUnusedStreams(nil)

			if tt.verifyRemoved {
				// Verify subscription was removed
				_, exists := reg.GetSubscriptionByID(tt.syncIDToRemove)
				assert.False(t, exists)

				// Verify no streams remain for this subscription
				streamCount, subsCount := reg.GetStats()
				assert.Equal(t, 0, streamCount)
				assert.Equal(t, 0, subsCount)
			}
		})
	}
}

func TestRegistry_GetSubscriptionsForStream(t *testing.T) {
	tests := []struct {
		name            string
		setup           func(t *testing.T) (*shardedRegistry, StreamId)
		expectedCount   int
		expectedSyncIDs []string
	}{
		{
			name: "get subscriptions for stream with one subscription",
			setup: func(t *testing.T) (*shardedRegistry, StreamId) {
				reg := newShardedRegistry(32)
				streamID := StreamId{1, 2, 3, 4}
				sub := createTestSubscription("test-sync-1")
				reg.AddSubscription(sub)
				reg.AddStreamToSubscription("test-sync-1", streamID)
				return reg, streamID
			},
			expectedCount:   1,
			expectedSyncIDs: []string{"test-sync-1"},
		},
		{
			name: "get subscriptions for stream with multiple subscriptions",
			setup: func(t *testing.T) (*shardedRegistry, StreamId) {
				reg := newShardedRegistry(32)
				streamID := StreamId{1, 2, 3, 4}

				sub1 := createTestSubscription("test-sync-1")
				sub2 := createTestSubscription("test-sync-2")

				reg.AddSubscription(sub1)
				reg.AddSubscription(sub2)
				reg.AddStreamToSubscription("test-sync-1", streamID)
				reg.AddStreamToSubscription("test-sync-2", streamID)

				return reg, streamID
			},
			expectedCount:   2,
			expectedSyncIDs: []string{"test-sync-1", "test-sync-2"},
		},
		{
			name: "get subscriptions for non-existent stream",
			setup: func(t *testing.T) (*shardedRegistry, StreamId) {
				reg := newShardedRegistry(32)
				return reg, StreamId{9, 9, 9, 9}
			},
			expectedCount:   0,
			expectedSyncIDs: []string{},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			reg, streamID := tt.setup(t)

			subscriptions := reg.GetSubscriptionsForStream(streamID)

			assert.Len(t, subscriptions, tt.expectedCount)

			// Verify expected sync IDs
			foundSyncIDs := make([]string, 0, len(subscriptions))
			for _, sub := range subscriptions {
				foundSyncIDs = append(foundSyncIDs, sub.syncID)
			}

			for _, expectedSyncID := range tt.expectedSyncIDs {
				assert.Contains(t, foundSyncIDs, expectedSyncID)
			}
		})
	}
}

func TestRegistry_GetSubscriptionByID(t *testing.T) {
	tests := []struct {
		name           string
		setup          func(t *testing.T) *shardedRegistry
		syncID         string
		expectExists   bool
		expectedSyncID string
	}{
		{
			name: "get existing subscription",
			setup: func(t *testing.T) *shardedRegistry {
				reg := newShardedRegistry(32)
				reg.AddSubscription(createTestSubscription("test-sync-1"))
				return reg
			},
			syncID:         "test-sync-1",
			expectExists:   true,
			expectedSyncID: "test-sync-1",
		},
		{
			name: "get non-existent subscription",
			setup: func(t *testing.T) *shardedRegistry {
				reg := newShardedRegistry(32)
				reg.AddSubscription(createTestSubscription("test-sync-1"))
				return reg
			},
			syncID:         "non-existent",
			expectExists:   false,
			expectedSyncID: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			reg := tt.setup(t)

			sub, exists := reg.GetSubscriptionByID(tt.syncID)

			assert.Equal(t, tt.expectExists, exists)
			if tt.expectExists {
				assert.NotNil(t, sub)
				assert.Equal(t, tt.expectedSyncID, sub.syncID)
			} else {
				assert.Nil(t, sub)
			}
		})
	}
}

func TestRegistry_AddStreamToSubscription(t *testing.T) {
	tests := []struct {
		name              string
		setup             func(t *testing.T) *shardedRegistry
		syncID            string
		streamID          StreamId
		expectAddToRemote bool
		expectBackfill    bool
	}{
		{
			name: "add stream to new subscription - should add to remote",
			setup: func(t *testing.T) *shardedRegistry {
				reg := newShardedRegistry(32)
				reg.AddSubscription(createTestSubscription("test-sync-1"))
				return reg
			},
			syncID:            "test-sync-1",
			streamID:          StreamId{1, 2, 3, 4},
			expectAddToRemote: true,
			expectBackfill:    false,
		},
		{
			name: "add stream to existing subscription - should backfill",
			setup: func(t *testing.T) *shardedRegistry {
				reg := newShardedRegistry(32)
				reg.AddSubscription(createTestSubscription("test-sync-1"))
				reg.AddSubscription(createTestSubscription("test-sync-2"))
				reg.AddStreamToSubscription("test-sync-1", StreamId{1, 2, 3, 4})
				return reg
			},
			syncID:            "test-sync-2",
			streamID:          StreamId{1, 2, 3, 4},
			expectAddToRemote: false,
			expectBackfill:    true,
		},
		{
			name: "add stream to non-existent subscription",
			setup: func(t *testing.T) *shardedRegistry {
				reg := newShardedRegistry(32)
				return reg
			},
			syncID:            "non-existent",
			streamID:          StreamId{1, 2, 3, 4},
			expectAddToRemote: false,
			expectBackfill:    false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			reg := tt.setup(t)

			shouldAddToRemote, shouldBackfill := reg.AddStreamToSubscription(tt.syncID, tt.streamID)

			assert.Equal(t, tt.expectAddToRemote, shouldAddToRemote)
			assert.Equal(t, tt.expectBackfill, shouldBackfill)

			// Verify stream was added to subscription
			subscriptions := reg.GetSubscriptionsForStream(tt.streamID)
			if tt.expectAddToRemote || tt.expectBackfill {
				if tt.expectAddToRemote {
					// When adding to remote, only the new subscription should be present
					assert.Len(t, subscriptions, 1)
					assert.Equal(t, tt.syncID, subscriptions[0].syncID)
				} else {
					// When backfilling, both subscriptions should be present
					assert.Len(t, subscriptions, 2)
					// Check that the new subscription is among them
					found := false
					for _, sub := range subscriptions {
						if sub.syncID == tt.syncID {
							found = true
							break
						}
					}
					assert.True(t, found, "New subscription should be present in stream subscriptions")
				}
			}
		})
	}
}

func TestRegistry_RemoveStreamFromSubscription(t *testing.T) {
	tests := []struct {
		name                   string
		setup                  func(t *testing.T) *shardedRegistry
		syncID                 string
		streamID               StreamId
		expectRemoveFromRemote bool
	}{
		{
			name: "remove stream from subscription with multiple subscriptions",
			setup: func(t *testing.T) *shardedRegistry {
				reg := newShardedRegistry(32)
				reg.AddSubscription(createTestSubscription("test-sync-1"))
				reg.AddSubscription(createTestSubscription("test-sync-2"))
				reg.AddStreamToSubscription("test-sync-1", StreamId{1, 2, 3, 4})
				reg.AddStreamToSubscription("test-sync-2", StreamId{1, 2, 3, 4})
				return reg
			},
			syncID:                 "test-sync-1",
			streamID:               StreamId{1, 2, 3, 4},
			expectRemoveFromRemote: false, // Other subscription still has this stream
		},
		{
			name: "remove stream from last subscription - should remove from remote",
			setup: func(t *testing.T) *shardedRegistry {
				reg := newShardedRegistry(32)
				reg.AddSubscription(createTestSubscription("test-sync-1"))
				reg.AddStreamToSubscription("test-sync-1", StreamId{1, 2, 3, 4})
				return reg
			},
			syncID:                 "test-sync-1",
			streamID:               StreamId{1, 2, 3, 4},
			expectRemoveFromRemote: true, // No more subscriptions for this stream
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			reg := tt.setup(t)

			reg.RemoveStreamFromSubscription(tt.syncID, tt.streamID)

			// Verify stream was removed from subscription
			subscriptions := reg.GetSubscriptionsForStream(tt.streamID)
			if tt.expectRemoveFromRemote {
				assert.Len(t, subscriptions, 0)
			} else {
				// Should still have other subscriptions
				assert.Greater(t, len(subscriptions), 0)
			}
		})
	}
}

func TestRegistry_GetStats(t *testing.T) {
	tests := []struct {
		name                string
		setup               func(t *testing.T) *shardedRegistry
		expectedStreamCount int
		expectedSubCount    int
	}{
		{
			name: "empty registry",
			setup: func(t *testing.T) *shardedRegistry {
				return newShardedRegistry(32)
			},
			expectedStreamCount: 0,
			expectedSubCount:    0,
		},
		{
			name: "registry with subscriptions but no streams",
			setup: func(t *testing.T) *shardedRegistry {
				reg := newShardedRegistry(32)
				reg.AddSubscription(createTestSubscription("test-sync-1"))
				reg.AddSubscription(createTestSubscription("test-sync-2"))
				return reg
			},
			expectedStreamCount: 0,
			expectedSubCount:    2,
		},
		{
			name: "registry with subscriptions and streams",
			setup: func(t *testing.T) *shardedRegistry {
				reg := newShardedRegistry(32)
				reg.AddSubscription(createTestSubscription("test-sync-1"))
				reg.AddSubscription(createTestSubscription("test-sync-2"))
				reg.AddStreamToSubscription("test-sync-1", StreamId{1, 2, 3, 4})
				reg.AddStreamToSubscription("test-sync-2", StreamId{5, 6, 7, 8})
				return reg
			},
			expectedStreamCount: 2,
			expectedSubCount:    2,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			reg := tt.setup(t)

			streamCount, subCount := reg.GetStats()

			assert.Equal(t, tt.expectedStreamCount, streamCount)
			assert.Equal(t, tt.expectedSubCount, subCount)
		})
	}
}

func TestRegistry_CancelAll(t *testing.T) {
	t.Run("cancel all subscriptions", func(t *testing.T) {
		reg := newShardedRegistry(32)

		// Add some subscriptions
		sub1 := createTestSubscription("test-sync-1")
		sub2 := createTestSubscription("test-sync-2")

		reg.AddSubscription(sub1)
		reg.AddSubscription(sub2)
		reg.AddStreamToSubscription("test-sync-1", StreamId{1, 2, 3, 4})
		reg.AddStreamToSubscription("test-sync-2", StreamId{5, 6, 7, 8})

		// Verify initial state
		streamCount, subCount := reg.GetStats()
		assert.Equal(t, 2, streamCount)
		assert.Equal(t, 2, subCount)

		// Cancel all
		reg.CancelAll(nil)

		// Verify all subscriptions were removed
		streamCount, subCount = reg.GetStats()
		assert.Equal(t, 0, streamCount)
		assert.Equal(t, 0, subCount)

		// Verify subscriptions are no longer accessible
		_, exists := reg.GetSubscriptionByID("test-sync-1")
		assert.False(t, exists)

		_, exists = reg.GetSubscriptionByID("test-sync-2")
		assert.False(t, exists)
	})
}

func TestRegistry_GetShardStats(t *testing.T) {
	tests := []struct {
		name     string
		setup    func(t *testing.T) *shardedRegistry
		validate func(t *testing.T, stats []struct {
			ShardIndex  int
			StreamCount int
		})
	}{
		{
			name: "empty registry should have zero stream counts",
			setup: func(t *testing.T) *shardedRegistry {
				return newShardedRegistry(4) // Small shard count for easier testing
			},
			validate: func(t *testing.T, stats []struct {
				ShardIndex  int
				StreamCount int
			}) {
				assert.Len(t, stats, 4)
				for i, stat := range stats {
					assert.Equal(t, i, stat.ShardIndex)
					assert.Equal(t, 0, stat.StreamCount)
				}
			},
		},
		{
			name: "registry with streams distributed across shards",
			setup: func(t *testing.T) *shardedRegistry {
				reg := newShardedRegistry(4)
				
				// Add subscriptions
				for i := 0; i < 3; i++ {
					reg.AddSubscription(createTestSubscription(fmt.Sprintf("test-sync-%d", i)))
				}
				
				// Add streams - these should distribute across shards
				// Using different stream IDs to ensure distribution
				streams := []StreamId{
					{0x10, 0x00, 0x00, 0x00}, // Should go to one shard
					{0x20, 0x00, 0x00, 0x00}, // Should go to another shard
					{0x30, 0x00, 0x00, 0x00}, // Should go to another shard
					{0x40, 0x00, 0x00, 0x00}, // Should go to another shard
				}
				
				for _, streamID := range streams {
					reg.AddStreamToSubscription("test-sync-0", streamID)
				}
				
				return reg
			},
			validate: func(t *testing.T, stats []struct {
				ShardIndex  int
				StreamCount int
			}) {
				assert.Len(t, stats, 4)
				
				totalStreams := 0
				for _, stat := range stats {
					totalStreams += stat.StreamCount
				}
				
				// Should have 4 streams total distributed across shards
				assert.Equal(t, 4, totalStreams)
				
				// Verify shard indices are correct
				for i, stat := range stats {
					assert.Equal(t, i, stat.ShardIndex)
				}
			},
		},
		{
			name: "registry with many shards",
			setup: func(t *testing.T) *shardedRegistry {
				reg := newShardedRegistry(32)
				
				// Add some subscriptions and streams
				reg.AddSubscription(createTestSubscription("test-sync-1"))
				reg.AddStreamToSubscription("test-sync-1", StreamId{1, 2, 3, 4})
				reg.AddStreamToSubscription("test-sync-1", StreamId{5, 6, 7, 8})
				
				return reg
			},
			validate: func(t *testing.T, stats []struct {
				ShardIndex  int
				StreamCount int
			}) {
				assert.Len(t, stats, 32)
				
				// Verify all shard indices are present and in order
				for i, stat := range stats {
					assert.Equal(t, i, stat.ShardIndex)
				}
				
				// Should have exactly 2 streams across all shards
				totalStreams := 0
				for _, stat := range stats {
					totalStreams += stat.StreamCount
				}
				assert.Equal(t, 2, totalStreams)
			},
		},
	}
	
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			reg := tt.setup(t)
			
			stats := reg.GetShardStats()
			
			tt.validate(t, stats)
		})
	}
}

func TestRegistry_NewShardedRegistry(t *testing.T) {
	tests := []struct {
		name               string
		inputShardCount    uint32
		expectedShardCount uint32
	}{
		{
			name:               "zero shard count should default to 32",
			inputShardCount:    0,
			expectedShardCount: 32,
		},
		{
			name:               "power of 2 shard count should remain unchanged",
			inputShardCount:    16,
			expectedShardCount: 16,
		},
		{
			name:               "non-power of 2 should round up to next power of 2",
			inputShardCount:    10,
			expectedShardCount: 16,
		},
		{
			name:               "3 should round up to 4",
			inputShardCount:    3,
			expectedShardCount: 4,
		},
		{
			name:               "17 should round up to 32",
			inputShardCount:    17,
			expectedShardCount: 32,
		},
		{
			name:               "large non-power of 2",
			inputShardCount:    100,
			expectedShardCount: 128,
		},
		{
			name:               "exact power of 2 - 64",
			inputShardCount:    64,
			expectedShardCount: 64,
		},
	}
	
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			reg := newShardedRegistry(tt.inputShardCount)
			
			assert.Equal(t, tt.expectedShardCount, reg.shardCount)
			assert.Len(t, reg.shards, int(tt.expectedShardCount))
			
			// Verify all shards are initialized
			for i, shard := range reg.shards {
				assert.NotNil(t, shard, "shard %d should not be nil", i)
			}
			
			// Verify global subscriptions map is initialized
			assert.NotNil(t, reg.globalSubscriptions)
		})
	}
}

func TestRegistry_CleanupUnusedStreams(t *testing.T) {
	t.Run("cleanup removes empty stream entries", func(t *testing.T) {
		reg := newShardedRegistry(4)
		
		// Track cleaned up streams
		var cleanedStreams [][]byte
		
		// Add subscriptions
		sub1 := createTestSubscription("test-sync-1")
		sub2 := createTestSubscription("test-sync-2")
		reg.AddSubscription(sub1)
		reg.AddSubscription(sub2)
		
		// Add streams to subscriptions
		stream1 := StreamId{1, 2, 3, 4}
		stream2 := StreamId{5, 6, 7, 8}
		reg.AddStreamToSubscription("test-sync-1", stream1)
		reg.AddStreamToSubscription("test-sync-2", stream2)
		
		// Remove subscription 1 - this should leave stream1 with empty subscription list
		reg.RemoveSubscription("test-sync-1")
		
		// Run cleanup
		reg.CleanupUnusedStreams(func(streamIds [][]byte) {
			cleanedStreams = streamIds
		})
		
		// Verify stream1 was cleaned up
		assert.Len(t, cleanedStreams, 1)
		assert.Equal(t, stream1[:], cleanedStreams[0])
		
		// Verify stream2 is still there
		subs := reg.GetSubscriptionsForStream(stream2)
		assert.Len(t, subs, 1)
	})
	
	t.Run("cleanup with no callback", func(t *testing.T) {
		reg := newShardedRegistry(4)
		
		// This should not panic
		reg.CleanupUnusedStreams(nil)
	})
	
	t.Run("cleanup with no unused streams", func(t *testing.T) {
		reg := newShardedRegistry(4)
		called := false
		
		// Add active subscription
		reg.AddSubscription(createTestSubscription("test-sync-1"))
		reg.AddStreamToSubscription("test-sync-1", StreamId{1, 2, 3, 4})
		
		// Run cleanup
		reg.CleanupUnusedStreams(func(streamIds [][]byte) {
			called = true
		})
		
		// Callback should not be called when no streams are cleaned
		assert.False(t, called)
	})
}
