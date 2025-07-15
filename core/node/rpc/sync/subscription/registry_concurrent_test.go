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

func TestRegistry_Concurrent_AddRemoveSubscriptions(t *testing.T) {
	reg := newShardedRegistry(32)
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
	reg := newShardedRegistry(32)
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
	reg := newShardedRegistry(64)
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Operation counters
	var (
		addSubOps     int32
		removeSubOps  int32
		addStreamOps  int32
		getStatsOps   int32
		getSubOps     int32
		cancelAllOps  int32
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

					// Also get shard stats
					stats := reg.GetShardStats()
					assert.NotEmpty(t, stats)
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
	reg := newShardedRegistry(128) // Large shard count
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

func TestRegistry_Concurrent_ShardStats(t *testing.T) {
	reg := newShardedRegistry(16)
	numReaders := 10
	numWriters := 10
	
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	
	var wg sync.WaitGroup
	
	// Writers - continuously add/remove streams
	for i := 0; i < numWriters; i++ {
		wg.Add(1)
		go func(id int) {
			defer wg.Done()
			
			syncID := fmt.Sprintf("sync-%d", id)
			reg.AddSubscription(createTestSubscription(syncID))
			
			for {
				select {
				case <-ctx.Done():
					return
				default:
					streamID := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
					reg.AddStreamToSubscription(syncID, streamID)
					time.Sleep(time.Microsecond * 100)
					reg.RemoveStreamFromSubscription(syncID, streamID)
				}
			}
		}(i)
	}
	
	// Readers - continuously read shard stats
	statsRead := int32(0)
	for i := 0; i < numReaders; i++ {
		wg.Add(1)
		go func(id int) {
			defer wg.Done()
			
			for {
				select {
				case <-ctx.Done():
					return
				default:
					stats := reg.GetShardStats()
					
					// Verify stats are valid
					assert.Len(t, stats, 16, "Should have stats for all shards")
					
					totalStreams := 0
					for idx, stat := range stats {
						assert.Equal(t, idx, stat.ShardIndex)
						assert.GreaterOrEqual(t, stat.StreamCount, 0)
						totalStreams += stat.StreamCount
					}
					
					atomic.AddInt32(&statsRead, 1)
					time.Sleep(time.Microsecond * 50)
				}
			}
		}(i)
	}
	
	wg.Wait()
	
	t.Logf("Shard stats read %d times", atomic.LoadInt32(&statsRead))
	assert.Greater(t, atomic.LoadInt32(&statsRead), int32(1000))
}

func TestRegistry_Concurrent_OnStreamDown(t *testing.T) {
	reg := newShardedRegistry(32)
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
			reg.OnStreamDown(streamID)
		}()
	}
	
	wg.Wait()
	
	// Verify registry is still consistent
	finalStreams, finalSubs := reg.GetStats()
	assert.GreaterOrEqual(t, initialStreams, finalStreams)
	assert.Equal(t, initialSubs, finalSubs)
}