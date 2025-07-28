package subscription

import (
	"context"
	"fmt"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	. "github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/testutils"
)

func TestRegistry_AddSubscription(t *testing.T) {
	tests := []struct {
		name  string
		setup func(t *testing.T) (*registry, *Subscription)
	}{
		{
			name: "successfully add subscription",
			setup: func(t *testing.T) (*registry, *Subscription) {
				reg := newRegistry()
				sub := createTestSubscription("test-sync-1")
				return reg, sub
			},
		},
		{
			name: "add multiple subscriptions",
			setup: func(t *testing.T) (*registry, *Subscription) {
				reg := newRegistry()
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
		setup          func(t *testing.T) *registry
		syncIDToRemove string
		verifyRemoved  bool
	}{
		{
			name: "successfully remove existing subscription",
			setup: func(t *testing.T) *registry {
				reg := newRegistry()
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
			setup: func(t *testing.T) *registry {
				reg := newRegistry()
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
			setup: func(t *testing.T) *registry {
				reg := newRegistry()
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
		setup           func(t *testing.T) (*registry, StreamId)
		expectedCount   int
		expectedSyncIDs []string
	}{
		{
			name: "get subscriptions for stream with one subscription",
			setup: func(t *testing.T) (*registry, StreamId) {
				reg := newRegistry()
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
			setup: func(t *testing.T) (*registry, StreamId) {
				reg := newRegistry()
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
			setup: func(t *testing.T) (*registry, StreamId) {
				reg := newRegistry()
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
		setup          func(t *testing.T) *registry
		syncID         string
		expectExists   bool
		expectedSyncID string
	}{
		{
			name: "get existing subscription",
			setup: func(t *testing.T) *registry {
				reg := newRegistry()
				reg.AddSubscription(createTestSubscription("test-sync-1"))
				return reg
			},
			syncID:         "test-sync-1",
			expectExists:   true,
			expectedSyncID: "test-sync-1",
		},
		{
			name: "get non-existent subscription",
			setup: func(t *testing.T) *registry {
				reg := newRegistry()
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
		setup             func(t *testing.T) *registry
		syncID            string
		streamID          StreamId
		expectAddToRemote bool
		expectBackfill    bool
	}{
		{
			name: "add stream to new subscription - should add to remote",
			setup: func(t *testing.T) *registry {
				reg := newRegistry()
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
			setup: func(t *testing.T) *registry {
				reg := newRegistry()
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
			setup: func(t *testing.T) *registry {
				reg := newRegistry()
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
		setup                  func(t *testing.T) *registry
		syncID                 string
		streamID               StreamId
		expectRemoveFromRemote bool
	}{
		{
			name: "remove stream from subscription with multiple subscriptions",
			setup: func(t *testing.T) *registry {
				reg := newRegistry()
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
			setup: func(t *testing.T) *registry {
				reg := newRegistry()
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
		setup               func(t *testing.T) *registry
		expectedStreamCount int
		expectedSubCount    int
	}{
		{
			name: "empty registry",
			setup: func(t *testing.T) *registry {
				return newRegistry()
			},
			expectedStreamCount: 0,
			expectedSubCount:    0,
		},
		{
			name: "registry with subscriptions but no streams",
			setup: func(t *testing.T) *registry {
				reg := newRegistry()
				reg.AddSubscription(createTestSubscription("test-sync-1"))
				reg.AddSubscription(createTestSubscription("test-sync-2"))
				return reg
			},
			expectedStreamCount: 0,
			expectedSubCount:    2,
		},
		{
			name: "registry with subscriptions and streams",
			setup: func(t *testing.T) *registry {
				reg := newRegistry()
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
		reg := newRegistry()

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

func TestRegistry_Concurrent_AddRemoveSubscriptions(t *testing.T) {
	reg := newRegistry()
	numGoroutines := 50
	opsPerGoroutine := 100

	var wg sync.WaitGroup
	wg.Add(numGoroutines)

	// Track operations
	var addedCount int32
	var removedCount int32

	for i := 0; i < numGoroutines; i++ {
		go func(id int) {
			defer wg.Done()

			for j := 0; j < opsPerGoroutine; j++ {
				syncID := fmt.Sprintf("sync-%d-%d", id, j)
				sub := createTestSubscription(syncID)

				// Add subscription
				reg.AddSubscription(sub)
				atomic.AddInt32(&addedCount, 1)

				// Verify it exists
				retrieved, exists := reg.GetSubscriptionByID(syncID)
				assert.True(t, exists)
				assert.Equal(t, syncID, retrieved.syncID)

				// Remove subscription
				reg.RemoveSubscription(syncID)
				atomic.AddInt32(&removedCount, 1)

				// Verify it's gone
				_, exists = reg.GetSubscriptionByID(syncID)
				assert.False(t, exists)
			}
		}(i)
	}

	wg.Wait()

	// Verify all operations completed
	assert.Equal(t, int32(numGoroutines*opsPerGoroutine), addedCount)
	assert.Equal(t, int32(numGoroutines*opsPerGoroutine), removedCount)

	// Registry should be empty
	streamCount, subCount := reg.GetStats()
	assert.Equal(t, 0, streamCount)
	assert.Equal(t, 0, subCount)
}

func TestRegistry_Concurrent_StreamOperations(t *testing.T) {
	reg := newRegistry()
	numGoroutines := 20
	numStreams := 50

	// Pre-create subscriptions
	subscriptions := make([]string, numGoroutines)
	for i := 0; i < numGoroutines; i++ {
		subscriptions[i] = fmt.Sprintf("sync-%d", i)
		reg.AddSubscription(createTestSubscription(subscriptions[i]))
	}

	// Generate stream IDs
	streams := make([]StreamId, numStreams)
	for i := 0; i < numStreams; i++ {
		streams[i] = testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	}

	var wg sync.WaitGroup
	wg.Add(numGoroutines)

	// Track operations
	var opsCompleted int32

	for i := 0; i < numGoroutines; i++ {
		go func(id int) {
			defer wg.Done()
			syncID := subscriptions[id]

			// Add streams
			for _, streamID := range streams {
				reg.AddStreamToSubscription(syncID, streamID)
				atomic.AddInt32(&opsCompleted, 1)

				// Verify subscription is in the stream
				subs := reg.GetSubscriptionsForStream(streamID)
				found := false
				for _, sub := range subs {
					if sub.syncID == syncID {
						found = true
						break
					}
				}
				assert.True(t, found, "Subscription should be found in stream")
			}

			// Remove streams
			for _, streamID := range streams {
				reg.RemoveStreamFromSubscription(syncID, streamID)
				atomic.AddInt32(&opsCompleted, 1)
			}
		}(i)
	}

	wg.Wait()

	// Verify all operations completed
	expectedOps := int32(numGoroutines * numStreams * 2) // Add + Remove
	assert.Equal(t, expectedOps, opsCompleted)

	// All streams should be empty now
	for _, streamID := range streams {
		subs := reg.GetSubscriptionsForStream(streamID)
		assert.Empty(t, subs, "Stream should have no subscriptions")
	}
}

func TestRegistry_Concurrent_MixedOperations(t *testing.T) {
	reg := newRegistry()
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Operation counters
	var (
		addSubOps    int32
		removeSubOps int32
		addStreamOps int32
		getStatsOps  int32
		getSubOps    int32
		cancelAllOps int32
	)

	// Start multiple worker types
	var wg sync.WaitGroup

	// Subscription adders
	for i := 0; i < 10; i++ {
		wg.Add(1)
		go func(id int) {
			defer wg.Done()
			for {
				select {
				case <-ctx.Done():
					return
				default:
					syncID := fmt.Sprintf("sync-add-%d-%d", id, atomic.LoadInt32(&addSubOps))
					reg.AddSubscription(createTestSubscription(syncID))
					atomic.AddInt32(&addSubOps, 1)
					time.Sleep(time.Microsecond * 10)
				}
			}
		}(i)
	}

	// Stream adders
	for i := 0; i < 10; i++ {
		wg.Add(1)
		go func(id int) {
			defer wg.Done()
			for {
				select {
				case <-ctx.Done():
					return
				default:
					syncID := fmt.Sprintf("sync-add-%d-0", id%5) // Use existing subscriptions
					streamID := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
					reg.AddStreamToSubscription(syncID, streamID)
					atomic.AddInt32(&addStreamOps, 1)
					time.Sleep(time.Microsecond * 10)
				}
			}
		}(i)
	}

	// Stats readers
	for i := 0; i < 5; i++ {
		wg.Add(1)
		go func(id int) {
			defer wg.Done()
			for {
				select {
				case <-ctx.Done():
					return
				default:
					streamCount, subCount := reg.GetStats()
					assert.GreaterOrEqual(t, streamCount, 0)
					assert.GreaterOrEqual(t, subCount, 0)
					atomic.AddInt32(&getStatsOps, 1)
					time.Sleep(time.Microsecond * 5)
				}
			}
		}(i)
	}

	// Subscription getters
	for i := 0; i < 5; i++ {
		wg.Add(1)
		go func(id int) {
			defer wg.Done()
			for {
				select {
				case <-ctx.Done():
					return
				default:
					syncID := fmt.Sprintf("sync-add-%d-0", id%5)
					sub, _ := reg.GetSubscriptionByID(syncID)
					if sub != nil {
						assert.Equal(t, syncID, sub.syncID)
					}
					atomic.AddInt32(&getSubOps, 1)
					time.Sleep(time.Microsecond * 5)
				}
			}
		}(i)
	}

	// Subscription removers
	for i := 0; i < 5; i++ {
		wg.Add(1)
		go func(id int) {
			defer wg.Done()
			for {
				select {
				case <-ctx.Done():
					return
				default:
					// Remove some subscriptions
					syncID := fmt.Sprintf("sync-add-%d-%d", id, atomic.LoadInt32(&removeSubOps))
					reg.RemoveSubscription(syncID)
					atomic.AddInt32(&removeSubOps, 1)
					time.Sleep(time.Millisecond * 1)
				}
			}
		}(i)
	}

	// Cleanup worker
	wg.Add(1)
	go func() {
		defer wg.Done()
		ticker := time.NewTicker(100 * time.Millisecond)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				reg.CleanupUnusedStreams(nil)
			}
		}
	}()

	// CancelAll worker (occasional)
	wg.Add(1)
	go func() {
		defer wg.Done()
		ticker := time.NewTicker(500 * time.Millisecond)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				reg.CancelAll(nil)
				atomic.AddInt32(&cancelAllOps, 1)
			}
		}
	}()

	// Let it run for a short time
	time.Sleep(2 * time.Second)
	cancel()
	wg.Wait()

	// Verify operations occurred
	t.Logf("Operations completed: addSub=%d, removeSub=%d, addStream=%d, getStats=%d, getSub=%d, cancelAll=%d",
		atomic.LoadInt32(&addSubOps),
		atomic.LoadInt32(&removeSubOps),
		atomic.LoadInt32(&addStreamOps),
		atomic.LoadInt32(&getStatsOps),
		atomic.LoadInt32(&getSubOps),
		atomic.LoadInt32(&cancelAllOps))

	assert.Greater(t, atomic.LoadInt32(&addSubOps), int32(0))
	assert.Greater(t, atomic.LoadInt32(&addStreamOps), int32(0))
	assert.Greater(t, atomic.LoadInt32(&getStatsOps), int32(0))
	assert.Greater(t, atomic.LoadInt32(&getSubOps), int32(0))
}

func TestRegistry_Concurrent_StressTest(t *testing.T) {
	reg := newRegistry()
	numGoroutines := 100
	opsPerGoroutine := 1000

	// Pre-create some subscriptions
	for i := 0; i < 10; i++ {
		reg.AddSubscription(createTestSubscription(fmt.Sprintf("base-sync-%d", i)))
	}

	var wg sync.WaitGroup
	wg.Add(numGoroutines)

	startTime := time.Now()

	for i := 0; i < numGoroutines; i++ {
		go func(id int) {
			defer wg.Done()

			// Mix of operations
			for j := 0; j < opsPerGoroutine; j++ {
				op := j % 6

				switch op {
				case 0: // Add subscription
					syncID := fmt.Sprintf("stress-sync-%d-%d", id, j)
					reg.AddSubscription(createTestSubscription(syncID))

				case 1: // Add stream to subscription
					syncID := fmt.Sprintf("base-sync-%d", j%10)
					streamID := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
					reg.AddStreamToSubscription(syncID, streamID)

				case 2: // Get subscriptions for stream
					streamID := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
					subs := reg.GetSubscriptionsForStream(streamID)
					_ = subs // Just access it

				case 3: // Get subscription by ID
					syncID := fmt.Sprintf("base-sync-%d", j%10)
					sub, _ := reg.GetSubscriptionByID(syncID)
					_ = sub

				case 4: // Get stats
					streamCount, subCount := reg.GetStats()
					assert.GreaterOrEqual(t, streamCount, 0)
					assert.GreaterOrEqual(t, subCount, 0)

				case 5: // Remove stream from subscription
					syncID := fmt.Sprintf("base-sync-%d", j%10)
					streamID := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
					reg.RemoveStreamFromSubscription(syncID, streamID)
				}
			}
		}(i)
	}

	wg.Wait()
	duration := time.Since(startTime)

	totalOps := numGoroutines * opsPerGoroutine
	opsPerSecond := float64(totalOps) / duration.Seconds()

	t.Logf("Stress test completed: %d operations in %v (%.2f ops/sec)",
		totalOps, duration, opsPerSecond)

	// Verify registry is still functional
	streamCount, subCount := reg.GetStats()
	t.Logf("Final state: %d streams, %d subscriptions", streamCount, subCount)

	// Should have at least the base subscriptions
	assert.GreaterOrEqual(t, subCount, 10)
}

func TestRegistry_Concurrent_OnStreamDown(t *testing.T) {
	reg := newRegistry()
	numGoroutines := 20

	// Create subscriptions with streams
	for i := 0; i < numGoroutines; i++ {
		syncID := fmt.Sprintf("sync-%d", i)
		sub := createTestSubscription(syncID)
		reg.AddSubscription(sub)

		// Add streams to each subscription
		for j := 0; j < 10; j++ {
			streamID := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
			reg.AddStreamToSubscription(syncID, streamID)
		}
	}

	// Get initial stats
	initialStreams, initialSubs := reg.GetStats()
	require.Greater(t, initialStreams, 0)
	require.Equal(t, numGoroutines, initialSubs)

	// Concurrently call OnStreamDown for various streams
	var wg sync.WaitGroup
	wg.Add(50)

	for i := 0; i < 50; i++ {
		go func() {
			defer wg.Done()
			streamID := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
			reg.DeleteStreamSubscriptions(streamID)
		}()
	}

	wg.Wait()

	// Verify registry is still consistent
	finalStreams, finalSubs := reg.GetStats()
	assert.GreaterOrEqual(t, initialStreams, finalStreams)
	assert.Equal(t, initialSubs, finalSubs)
}
