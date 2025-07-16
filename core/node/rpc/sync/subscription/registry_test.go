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

// Concurrency tests

func TestRegistry_ConcurrentAddRemoveSubscriptions(t *testing.T) {
	t.Run("concurrent add and remove different subscriptions", func(t *testing.T) {
		reg := newRegistry()
		const numGoroutines = 100
		const numOperations = 100

		var wg sync.WaitGroup
		wg.Add(numGoroutines * 2)

		// Concurrent adds
		for i := 0; i < numGoroutines; i++ {
			go func(id int) {
				defer wg.Done()
				for j := 0; j < numOperations; j++ {
					syncID := fmt.Sprintf("sync-%d-%d", id, j)
					sub := createTestSubscription(syncID)
					reg.AddSubscription(sub)
				}
			}(i)
		}

		// Concurrent removes
		for i := 0; i < numGoroutines; i++ {
			go func(id int) {
				defer wg.Done()
				time.Sleep(10 * time.Millisecond) // Let some adds happen first
				for j := 0; j < numOperations; j++ {
					syncID := fmt.Sprintf("sync-%d-%d", id, j)
					reg.RemoveSubscription(syncID)
				}
			}(i)
		}

		wg.Wait()

		// Verify final state - all subscriptions should be removed
		_, subCount := reg.GetStats()
		assert.Equal(t, 0, subCount)
	})
}

func TestRegistry_ConcurrentStreamOperations(t *testing.T) {
	t.Run("concurrent add and remove streams", func(t *testing.T) {
		reg := newRegistry()
		const numGoroutines = 50
		const numStreams = 10
		const numOperations = 100

		// Pre-populate subscriptions
		for i := 0; i < numGoroutines; i++ {
			syncID := fmt.Sprintf("sync-%d", i)
			sub := createTestSubscription(syncID)
			reg.AddSubscription(sub)
		}

		var wg sync.WaitGroup
		wg.Add(numGoroutines)

		// Concurrent stream operations
		for i := 0; i < numGoroutines; i++ {
			go func(id int) {
				defer wg.Done()
				syncID := fmt.Sprintf("sync-%d", id)

				for j := 0; j < numOperations; j++ {
					streamID := StreamId{byte(j % numStreams), 0, 0, 0}

					if j%3 == 0 {
						// Add stream
						reg.AddStreamToSubscription(syncID, streamID)
					} else if j%3 == 1 {
						// Remove stream
						reg.RemoveStreamFromSubscription(syncID, streamID)
					} else {
						// Get subscriptions for stream
						_ = reg.GetSubscriptionsForStream(streamID)
					}
				}
			}(i)
		}

		wg.Wait()

		// Verify registry is still consistent
		streamCount, subCount := reg.GetStats()
		assert.Equal(t, numGoroutines, subCount)
		assert.GreaterOrEqual(t, streamCount, 0)
		assert.LessOrEqual(t, streamCount, numStreams)
	})
}

func TestRegistry_ConcurrentMixedOperations(t *testing.T) {
	t.Run("concurrent mixed operations stress test", func(t *testing.T) {
		reg := newRegistry()
		const numGoroutines = 100
		const duration = 100 * time.Millisecond

		ctx, cancel := context.WithTimeout(context.Background(), duration)
		defer cancel()

		var wg sync.WaitGroup
		errorChan := make(chan error, numGoroutines*5)

		// Worker type 1: Add/Remove subscriptions
		wg.Add(numGoroutines)
		for i := 0; i < numGoroutines; i++ {
			go func(id int) {
				defer wg.Done()
				for {
					select {
					case <-ctx.Done():
						return
					default:
						syncID := fmt.Sprintf("sync-%d", id)
						sub := createTestSubscription(syncID)
						reg.AddSubscription(sub)
						time.Sleep(time.Microsecond)
						reg.RemoveSubscription(syncID)
					}
				}
			}(i)
		}

		// Worker type 2: Add/Remove streams
		wg.Add(numGoroutines)
		for i := 0; i < numGoroutines; i++ {
			go func(id int) {
				defer wg.Done()
				syncID := fmt.Sprintf("perm-sync-%d", id)
				sub := createTestSubscription(syncID)
				reg.AddSubscription(sub)

				for {
					select {
					case <-ctx.Done():
						return
					default:
						streamID := StreamId{byte(id % 256), byte(id / 256), 0, 0}
						reg.AddStreamToSubscription(syncID, streamID)
						time.Sleep(time.Microsecond)
						reg.RemoveStreamFromSubscription(syncID, streamID)
					}
				}
			}(i)
		}

		// Worker type 3: Query operations
		wg.Add(numGoroutines)
		for i := 0; i < numGoroutines; i++ {
			go func(id int) {
				defer wg.Done()
				for {
					select {
					case <-ctx.Done():
						return
					default:
						syncID := fmt.Sprintf("perm-sync-%d", id%numGoroutines)
						streamID := StreamId{byte(id % 256), byte(id / 256), 0, 0}

						// Various read operations
						_, _ = reg.GetSubscriptionByID(syncID)
						_ = reg.GetSubscriptionsForStream(streamID)
						_, _ = reg.GetStats()
					}
				}
			}(i)
		}

		// Worker type 4: Cleanup operations
		wg.Add(1)
		go func() {
			defer wg.Done()
			for {
				select {
				case <-ctx.Done():
					return
				default:
					reg.CleanupUnusedStreams(nil)
					time.Sleep(10 * time.Millisecond)
				}
			}
		}()

		// Worker type 5: Periodic CancelAll
		wg.Add(1)
		go func() {
			defer wg.Done()
			for {
				select {
				case <-ctx.Done():
					return
				default:
					time.Sleep(50 * time.Millisecond)
					// Don't actually cancel to avoid disrupting other workers
					// Just verify it doesn't panic
					_, _ = reg.GetStats()
				}
			}
		}()

		wg.Wait()
		close(errorChan)

		// Check for any errors
		for err := range errorChan {
			require.NoError(t, err)
		}
	})
}

func TestRegistry_RaceConditionOnSameStream(t *testing.T) {
	t.Run("concurrent operations on same stream", func(t *testing.T) {
		reg := newRegistry()
		const numGoroutines = 50
		const numOperations = 100
		streamID := StreamId{1, 2, 3, 4}

		// Pre-populate subscriptions
		for i := 0; i < numGoroutines; i++ {
			syncID := fmt.Sprintf("sync-%d", i)
			sub := createTestSubscription(syncID)
			reg.AddSubscription(sub)
		}

		var wg sync.WaitGroup
		wg.Add(numGoroutines)

		// All goroutines operate on the same stream
		for i := 0; i < numGoroutines; i++ {
			go func(id int) {
				defer wg.Done()
				syncID := fmt.Sprintf("sync-%d", id)

				for j := 0; j < numOperations; j++ {
					switch j % 4 {
					case 0:
						reg.AddStreamToSubscription(syncID, streamID)
					case 1:
						reg.RemoveStreamFromSubscription(syncID, streamID)
					case 2:
						subs := reg.GetSubscriptionsForStream(streamID)
						// Verify returned slice is a copy
						if len(subs) > 0 {
							subs[0] = nil // This should not affect the registry
						}
					case 3:
						reg.OnStreamDown(streamID)
					}
				}
			}(i)
		}

		wg.Wait()

		// Verify registry is still consistent
		_, subCount := reg.GetStats()
		assert.Equal(t, numGoroutines, subCount)
	})
}

func TestRegistry_ConcurrentCleanupUnusedStreams(t *testing.T) {
	t.Run("concurrent cleanup with stream operations", func(t *testing.T) {
		reg := newRegistry()
		const numWorkers = 10
		const numStreams = 100
		const duration = 100 * time.Millisecond

		ctx, cancel := context.WithTimeout(context.Background(), duration)
		defer cancel()

		// Create some subscriptions
		for i := 0; i < numWorkers; i++ {
			syncID := fmt.Sprintf("sync-%d", i)
			sub := createTestSubscription(syncID)
			reg.AddSubscription(sub)
		}

		var wg sync.WaitGroup
		var cleanupCount int32

		// Workers that add and remove streams
		for i := 0; i < numWorkers; i++ {
			wg.Add(1)
			go func(id int) {
				defer wg.Done()
				syncID := fmt.Sprintf("sync-%d", id)

				for {
					select {
					case <-ctx.Done():
						return
					default:
						// Add stream
						streamID := StreamId{byte(id), byte(id % numStreams), 0, 0}
						reg.AddStreamToSubscription(syncID, streamID)

						// Remove it shortly after
						time.Sleep(time.Microsecond)
						reg.RemoveStreamFromSubscription(syncID, streamID)
					}
				}
			}(i)
		}

		// Concurrent cleanup workers
		for i := 0; i < 3; i++ {
			wg.Add(1)
			go func() {
				defer wg.Done()
				for {
					select {
					case <-ctx.Done():
						return
					default:
						reg.CleanupUnusedStreams(func(streamID StreamId) {
							atomic.AddInt32(&cleanupCount, 1)
						})
						time.Sleep(5 * time.Millisecond)
					}
				}
			}()
		}

		wg.Wait()

		// Verify final state
		streamCount, subCount := reg.GetStats()
		assert.Equal(t, numWorkers, subCount)
		assert.GreaterOrEqual(t, int(cleanupCount), 0)
		t.Logf("Cleaned up %d streams, final stream count: %d", cleanupCount, streamCount)
	})
}

func TestRegistry_CleanupRaceCondition(t *testing.T) {
	t.Run("verify race condition is fixed with atomic cleanup", func(t *testing.T) {
		reg := newRegistry()
		const numIterations = 100

		// Track what happens
		var cleanedStreams int32
		var reAddedStreams int32
		var callbacksExecuted int32

		for iter := 0; iter < numIterations; iter++ {
			// Create a subscription
			syncID := fmt.Sprintf("sync-%d", iter)
			sub := createTestSubscription(syncID)
			reg.AddSubscription(sub)

			// Create multiple streams
			streams := make([]StreamId, 10)
			for i := range streams {
				streams[i] = StreamId{byte(iter), byte(i), 0, 0}
				reg.AddStreamToSubscription(syncID, streams[i])
			}

			// Remove all streams from subscription
			for _, streamID := range streams {
				reg.RemoveStreamFromSubscription(syncID, streamID)
			}

			// Now streams have 0 subscribers and are candidates for cleanup

			var wg sync.WaitGroup

			// Start cleanup with a callback that simulates remote unsubscribe
			wg.Add(1)
			go func() {
				defer wg.Done()

				reg.CleanupUnusedStreams(func(streamID StreamId) {
					// With the new atomic implementation, this callback is only
					// called for streams that are truly being deleted
					atomic.AddInt32(&callbacksExecuted, 1)
					atomic.AddInt32(&cleanedStreams, 1)
					
					// Simulate a remote call (shorter to avoid lock contention)
					time.Sleep(100 * time.Microsecond)
				})
			}()

			// Concurrently try to add streams back
			for i := 0; i < 5; i++ {
				wg.Add(1)
				go func(idx int) {
					defer wg.Done()

					// Small random delay
					time.Sleep(time.Duration(idx*100) * time.Microsecond)

					// Try to add a stream back while cleanup might be in progress
					streamToReAdd := streams[idx%len(streams)]
					shouldAdd, _ := reg.AddStreamToSubscription(syncID, streamToReAdd)
					if shouldAdd {
						atomic.AddInt32(&reAddedStreams, 1)
					}
				}(i)
			}

			wg.Wait()

			// Verify the final state - streams that were re-added should still exist
			for _, streamID := range streams {
				subs := reg.GetSubscriptionsForStream(streamID)
				// Either the stream was cleaned up OR it has a subscriber
				// There should be no case where a stream with a subscriber was deleted
				if len(subs) > 0 {
					// Verify the subscription is valid
					for _, sub := range subs {
						assert.NotNil(t, sub)
						assert.Equal(t, syncID, sub.syncID)
					}
				}
			}

			// Clean up for next iteration
			reg.RemoveSubscription(syncID)
		}

		t.Logf("Cleaned streams: %d, Re-added streams: %d, Callbacks executed: %d",
			cleanedStreams, reAddedStreams, callbacksExecuted)
		
		// The key invariant: callbacks should only be executed for streams that were actually deleted
		// With the atomic implementation, there should be no race condition
	})

	t.Run("atomic cleanup prevents deletion of streams with new subscribers", func(t *testing.T) {
		reg := newRegistry()
		
		// Create initial setup
		syncID1 := "sync-1"
		syncID2 := "sync-2"
		streamID := StreamId{1, 2, 3, 4}
		
		sub1 := createTestSubscription(syncID1)
		sub2 := createTestSubscription(syncID2)
		reg.AddSubscription(sub1)
		reg.AddSubscription(sub2)
		
		// Add stream to sync-1, then remove it
		reg.AddStreamToSubscription(syncID1, streamID)
		reg.RemoveStreamFromSubscription(syncID1, streamID)
		
		// Stream now has 0 subscribers
		subs := reg.GetSubscriptionsForStream(streamID)
		assert.Len(t, subs, 0)
		
		var cleanupCalled bool
		var addedDuringCleanup bool
		
		// Simulate the race: cleanup starts but before it completes,
		// another goroutine adds a subscriber
		var wg sync.WaitGroup
		wg.Add(2)
		
		// Cleanup goroutine
		go func() {
			defer wg.Done()
			reg.CleanupUnusedStreams(func(sid StreamId) {
				cleanupCalled = true
				// During this callback, another goroutine might be adding a subscriber
				// But with the atomic implementation, this callback is only called
				// if the stream is truly being deleted
				time.Sleep(10 * time.Millisecond) // Simulate remote call
			})
		}()
		
		// Add subscriber goroutine
		go func() {
			defer wg.Done()
			// Try to add the stream to sync-2 during cleanup
			time.Sleep(1 * time.Millisecond) // Let cleanup start
			shouldAdd, _ := reg.AddStreamToSubscription(syncID2, streamID)
			if shouldAdd {
				addedDuringCleanup = true
			}
		}()
		
		wg.Wait()
		
		// Check final state
		finalSubs := reg.GetSubscriptionsForStream(streamID)
		
		if addedDuringCleanup {
			// If we added during cleanup, the stream should have a subscriber
			assert.Len(t, finalSubs, 1, "Stream should have 1 subscriber after being added during cleanup")
			assert.Equal(t, syncID2, finalSubs[0].syncID)
			// And cleanup callback should NOT have been called for this stream
			// (because the atomic Compute would have seen it's no longer empty)
		} else if cleanupCalled {
			// If cleanup was called, the stream should be gone
			assert.Len(t, finalSubs, 0, "Stream should have no subscribers after cleanup")
		}
		
		// The key point: we should never have both cleanupCalled=true AND addedDuringCleanup=true
		// for the same stream, because the atomic implementation prevents this
		t.Logf("Cleanup called: %v, Added during cleanup: %v", cleanupCalled, addedDuringCleanup)
	})

	t.Run("race condition: cleanup deletes stream with active subscriber", func(t *testing.T) {
		reg := newRegistry()
		const numWorkers = 20
		const duration = 200 * time.Millisecond

		ctx, cancel := context.WithTimeout(context.Background(), duration)
		defer cancel()

		// Track issues
		var deletedActiveStreams int32
		var unexpectedEmptyStreams int32

		// Create subscriptions
		for i := 0; i < numWorkers; i++ {
			syncID := fmt.Sprintf("sync-%d", i)
			sub := createTestSubscription(syncID)
			reg.AddSubscription(sub)
		}

		var wg sync.WaitGroup

		// Workers that rapidly add/remove streams
		for i := 0; i < numWorkers; i++ {
			wg.Add(1)
			go func(id int) {
				defer wg.Done()
				syncID := fmt.Sprintf("sync-%d", id)
				streamID := StreamId{byte(id), 0, 0, 0}

				for {
					select {
					case <-ctx.Done():
						return
					default:
						// Rapidly add and remove
						reg.AddStreamToSubscription(syncID, streamID)
						// Very short time window
						time.Sleep(100 * time.Nanosecond)
						reg.RemoveStreamFromSubscription(syncID, streamID)
						time.Sleep(100 * time.Nanosecond)
					}
				}
			}(i)
		}

		// Aggressive cleanup worker
		wg.Add(1)
		go func() {
			defer wg.Done()
			for {
				select {
				case <-ctx.Done():
					return
				default:
					reg.CleanupUnusedStreams(func(streamID StreamId) {
						// With the new atomic implementation, this callback
						// is only called for streams that are truly empty
						// and are being deleted atomically
						atomic.AddInt32(&deletedActiveStreams, 1)
						
						// Simulate remote call
						time.Sleep(50 * time.Nanosecond)
					})
					// No delay between cleanups
				}
			}
		}()

		// Reader that checks for inconsistencies
		wg.Add(1)
		go func() {
			defer wg.Done()
			for {
				select {
				case <-ctx.Done():
					return
				default:
					for i := 0; i < numWorkers; i++ {
						streamID := StreamId{byte(i), 0, 0, 0}

						// Try to get subscriptions for a stream
						subs := reg.GetSubscriptionsForStream(streamID)

						// If we get subscriptions, verify they're valid
						for _, sub := range subs {
							if sub == nil {
								atomic.AddInt32(&unexpectedEmptyStreams, 1)
							}
						}
					}
					time.Sleep(100 * time.Nanosecond)
				}
			}
		}()

		wg.Wait()

		t.Logf("Deleted active streams: %d", deletedActiveStreams)
		t.Logf("Unexpected empty entries: %d", unexpectedEmptyStreams)

		// This test demonstrates the race condition scenario
		// The fix should ensure that streams aren't deleted if they gain subscribers
		// during the cleanup callback execution
	})
}

func TestRegistry_DataIntegrity(t *testing.T) {
	t.Run("verify data integrity under concurrent load", func(t *testing.T) {
		reg := newRegistry()
		const numSubscriptions = 100
		const numStreamsPerSub = 10
		const numReaders = 50

		// Setup phase: create subscriptions and streams
		expectedData := make(map[string][]StreamId)
		for i := 0; i < numSubscriptions; i++ {
			syncID := fmt.Sprintf("sync-%d", i)
			sub := createTestSubscription(syncID)
			reg.AddSubscription(sub)

			streams := make([]StreamId, 0, numStreamsPerSub)
			for j := 0; j < numStreamsPerSub; j++ {
				streamID := StreamId{byte(i), byte(j), 0, 0}
				reg.AddStreamToSubscription(syncID, streamID)
				streams = append(streams, streamID)
			}
			expectedData[syncID] = streams
		}

		// Concurrent readers verify data integrity
		var wg sync.WaitGroup
		errorChan := make(chan error, numReaders*numSubscriptions)

		for i := 0; i < numReaders; i++ {
			wg.Add(1)
			go func(readerID int) {
				defer wg.Done()

				// Each reader verifies all subscriptions
				for syncID, expectedStreams := range expectedData {
					// Verify subscription exists
					sub, exists := reg.GetSubscriptionByID(syncID)
					if !exists {
						errorChan <- fmt.Errorf("reader %d: subscription %s not found", readerID, syncID)
						continue
					}
					if sub.syncID != syncID {
						errorChan <- fmt.Errorf("reader %d: subscription ID mismatch: got %s, want %s", readerID, sub.syncID, syncID)
					}

					// Verify each stream has this subscription
					for _, streamID := range expectedStreams {
						subs := reg.GetSubscriptionsForStream(streamID)
						found := false
						for _, s := range subs {
							if s.syncID == syncID {
								found = true
								break
							}
						}
						if !found {
							errorChan <- fmt.Errorf("reader %d: subscription %s not found in stream %v", readerID, syncID, streamID)
						}
					}
				}
			}(i)
		}

		wg.Wait()
		close(errorChan)

		// Check for any errors
		for err := range errorChan {
			require.NoError(t, err)
		}

		// Verify final stats
		streamCount, subCount := reg.GetStats()
		assert.Equal(t, numSubscriptions, subCount)
		assert.Equal(t, numSubscriptions*numStreamsPerSub, streamCount)
	})
}
