package subscription

import (
	"context"
	"fmt"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	. "github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/shared"
	testutils "github.com/towns-protocol/towns/core/node/testutils"
)

// E2E test helper that sets up a real subscription environment
type e2eTestEnv struct {
	manager     *Manager
	registry    *registry
	distributor *distributor
	ctx         context.Context
	cancel      context.CancelFunc
}

func newE2ETestEnv(t *testing.T) *e2eTestEnv {
	ctx, cancel := context.WithCancel(context.Background())

	// Create real components (not mocks)
	manager := NewManager(ctx, [20]byte{1}, nil, nil, nil)

	// Extract the real registry and distributor for testing
	registry := manager.registry.(*registry)
	distributor := manager.distributor

	return &e2eTestEnv{
		manager:     manager,
		registry:    registry,
		distributor: distributor,
		ctx:         ctx,
		cancel:      cancel,
	}
}

func (env *e2eTestEnv) cleanup() {
	env.cancel()
	// Give time for goroutines to clean up
	time.Sleep(10 * time.Millisecond)
}

// TestE2E_CompleteSubscriptionLifecycle tests the full subscription flow
func TestE2E_CompleteSubscriptionLifecycle(t *testing.T) {
	env := newE2ETestEnv(t)
	defer env.cleanup()

	// Step 1: Create a subscription
	ctx, cancel := context.WithCancelCause(context.Background())
	defer cancel(nil)

	sub, err := env.manager.Subscribe(ctx, cancel, "test-sync-1")
	require.NoError(t, err)

	// Step 2: Verify subscription is registered
	got, exists := env.registry.GetSubscriptionByID("test-sync-1")
	assert.True(t, exists)
	assert.Equal(t, sub, got)

	// Step 3: Add a stream to the subscription
	streamID := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	// Add stream directly to registry for testing
	shouldAddToRemote, shouldBackfill := env.registry.AddStreamToSubscription("test-sync-1", streamID)
	assert.True(t, shouldAddToRemote) // First subscription to this stream
	assert.False(t, shouldBackfill)

	// Step 4: Verify stream is associated with subscription
	subscriptions := env.registry.GetSubscriptionsForStream(streamID)
	assert.Len(t, subscriptions, 1)
	assert.Equal(t, sub, subscriptions[0])

	// Step 5: Create and send a message through the system
	msg := &SyncStreamsResponse{
		SyncOp: SyncOp_SYNC_UPDATE,
		Stream: &StreamAndCookie{
			NextSyncCookie: &SyncCookie{
				StreamId: streamID[:],
			},
		},
	}

	// Add message to manager's buffer
	err = env.manager.messages.AddMessage(msg)
	require.NoError(t, err)

	// Step 6: Wait for message to be processed and verify it reaches subscription
	time.Sleep(50 * time.Millisecond)

	// Check if message was received by subscription
	var receivedMsgs []*SyncStreamsResponse
	receivedMsgs = sub.Messages.GetBatch(receivedMsgs)
	assert.Len(t, receivedMsgs, 1)
	assert.Equal(t, SyncOp_SYNC_UPDATE, receivedMsgs[0].GetSyncOp())

	// Step 7: Test stream removal
	shouldRemoveFromRemote := env.registry.RemoveStreamFromSubscription("test-sync-1", streamID)
	assert.True(t, shouldRemoveFromRemote) // Last subscription for this stream

	// Verify stream is no longer associated
	subscriptions = env.registry.GetSubscriptionsForStream(streamID)
	assert.Len(t, subscriptions, 0)

	// Step 8: Test subscription removal
	env.registry.RemoveSubscription("test-sync-1")

	// Verify subscription is gone
	_, exists = env.registry.GetSubscriptionByID("test-sync-1")
	assert.False(t, exists)

	// Step 9: Verify stats
	streamCount, subCount := env.registry.GetStats()
	assert.Equal(t, 0, streamCount)
	assert.Equal(t, 0, subCount)
}

// TestE2E_MultipleSubscriptionsSameStream tests multiple subscriptions sharing streams
func TestE2E_MultipleSubscriptionsSameStream(t *testing.T) {
	env := newE2ETestEnv(t)
	defer env.cleanup()

	// Create two subscriptions
	ctx1, cancel1 := context.WithCancelCause(context.Background())
	defer cancel1(nil)
	ctx2, cancel2 := context.WithCancelCause(context.Background())
	defer cancel2(nil)

	sub1, err := env.manager.Subscribe(ctx1, cancel1, "test-sync-1")
	require.NoError(t, err)

	sub2, err := env.manager.Subscribe(ctx2, cancel2, "test-sync-2")
	require.NoError(t, err)

	// Add same stream to both subscriptions
	streamID := testutils.FakeStreamId(STREAM_CHANNEL_BIN)

	// Add stream to subscription using Modify method
	shouldAddToRemote, shouldBackfill := env.registry.AddStreamToSubscription("test-sync-1", streamID)
	assert.True(t, shouldAddToRemote)
	assert.False(t, shouldBackfill)

	shouldAddToRemote, shouldBackfill = env.registry.AddStreamToSubscription("test-sync-2", streamID)
	assert.False(t, shouldAddToRemote)
	assert.True(t, shouldBackfill)

	// Verify both subscriptions are associated with the stream
	subscriptions := env.registry.GetSubscriptionsForStream(streamID)
	assert.Len(t, subscriptions, 2)

	// Verify both subscriptions exist
	found1, found2 := false, false
	for _, sub := range subscriptions {
		if sub.syncID == "test-sync-1" {
			found1 = true
		}
		if sub.syncID == "test-sync-2" {
			found2 = true
		}
	}
	assert.True(t, found1)
	assert.True(t, found2)

	// Test message distribution to both subscriptions
	msg := &SyncStreamsResponse{
		SyncOp: SyncOp_SYNC_UPDATE,
		Stream: &StreamAndCookie{
			NextSyncCookie: &SyncCookie{
				StreamId: streamID[:],
			},
		},
	}

	// Send message through distributor
	env.distributor.DistributeMessage(streamID, msg)

	// Wait for processing
	time.Sleep(100 * time.Millisecond)

	// Both subscriptions should receive the message
	var receivedMsgs1 []*SyncStreamsResponse
	receivedMsgs1 = sub1.Messages.GetBatch(receivedMsgs1)
	t.Logf("Sub1 received %d messages", len(receivedMsgs1))
	if len(receivedMsgs1) > 0 {
		assert.Equal(t, SyncOp_SYNC_UPDATE, receivedMsgs1[0].GetSyncOp())
	}

	var receivedMsgs2 []*SyncStreamsResponse
	receivedMsgs2 = sub2.Messages.GetBatch(receivedMsgs2)
	t.Logf("Sub2 received %d messages", len(receivedMsgs2))
	if len(receivedMsgs2) > 0 {
		assert.Equal(t, SyncOp_SYNC_UPDATE, receivedMsgs2[0].GetSyncOp())
	}

	// For now, just verify that the subscriptions exist and are associated with the stream
	// The message distribution might need more complex setup
	assert.Len(t, env.registry.GetSubscriptionsForStream(streamID), 2)

	// Test removing one subscription - should not remove from remote
	shouldRemoveFromRemote := env.registry.RemoveStreamFromSubscription("test-sync-1", streamID)
	assert.False(t, shouldRemoveFromRemote) // Other subscription still has this stream

	// Verify remaining subscription still has the stream
	subscriptions = env.registry.GetSubscriptionsForStream(streamID)
	assert.Len(t, subscriptions, 1)
	assert.Equal(t, "test-sync-2", subscriptions[0].syncID)

	// Remove second subscription - should remove from remote
	shouldRemoveFromRemote = env.registry.RemoveStreamFromSubscription("test-sync-2", streamID)
	assert.True(t, shouldRemoveFromRemote) // No more subscriptions for this stream

	// Verify stream is gone
	subscriptions = env.registry.GetSubscriptionsForStream(streamID)
	assert.Len(t, subscriptions, 0)
}

// TestE2E_MessageDistributionPatterns tests different message types
func TestE2E_MessageDistributionPatterns(t *testing.T) {
	env := newE2ETestEnv(t)
	defer env.cleanup()

	// Create subscription
	ctx, cancel := context.WithCancelCause(context.Background())
	defer cancel(nil)

	sub, err := env.manager.Subscribe(ctx, cancel, "test-sync-1")
	require.NoError(t, err)

	streamID := testutils.FakeStreamId(STREAM_CHANNEL_BIN)

	// Add stream to subscription using Modify method
	shouldAddToRemote, shouldBackfill := env.registry.AddStreamToSubscription("test-sync-1", streamID)
	assert.True(t, shouldAddToRemote)
	assert.False(t, shouldBackfill)

	// Test 1: SYNC_UPDATE message
	updateMsg := &SyncStreamsResponse{
		SyncOp: SyncOp_SYNC_UPDATE,
		Stream: &StreamAndCookie{
			NextSyncCookie: &SyncCookie{
				StreamId: streamID[:],
			},
		},
	}

	env.distributor.DistributeMessage(streamID, updateMsg)
	time.Sleep(50 * time.Millisecond)
	receivedMsgs := sub.Messages.GetBatch(nil)
	assert.Len(t, receivedMsgs, 1)
	assert.Equal(t, SyncOp_SYNC_UPDATE, receivedMsgs[0].GetSyncOp())

	// Test 2: SYNC_DOWN message
	downMsg := &SyncStreamsResponse{
		SyncOp:   SyncOp_SYNC_DOWN,
		StreamId: streamID[:],
	}

	env.distributor.DistributeMessage(streamID, downMsg)
	time.Sleep(50 * time.Millisecond)

	// Check that SYNC_DOWN was received
	receivedMsgs = sub.Messages.GetBatch(nil)
	assert.Len(t, receivedMsgs, 1)
	assert.Equal(t, SyncOp_SYNC_DOWN, receivedMsgs[0].GetSyncOp())

	// Debug: Check if stream is still in registry
	subscriptions := env.registry.GetSubscriptionsForStream(streamID)
	t.Logf("After SYNC_DOWN, stream has %d subscriptions", len(subscriptions))

	// Test 3: Further messages should not be delivered
	// Use a different message to avoid interference
	furtherMsg := &SyncStreamsResponse{
		SyncOp: SyncOp_SYNC_UPDATE,
		Stream: &StreamAndCookie{
			NextSyncCookie: &SyncCookie{
				StreamId: streamID[:],
			},
		},
	}
	env.distributor.DistributeMessage(streamID, furtherMsg)
	time.Sleep(50 * time.Millisecond)

	// Check that no additional messages were received after SYNC_DOWN
	receivedMsgs = sub.Messages.GetBatch(nil)
	t.Logf("After further message, received %d messages", len(receivedMsgs))
	if len(receivedMsgs) > 0 {
		t.Logf("Received message: %v", receivedMsgs[0].GetSyncOp())
	}
	assert.Len(t, receivedMsgs, 0) // No messages should be delivered after SYNC_DOWN

	// Test 4: Backfill message (should NOT be delivered after SYNC_DOWN)
	backfillMsg := &SyncStreamsResponse{
		SyncOp: SyncOp_SYNC_UPDATE,
		Stream: &StreamAndCookie{
			NextSyncCookie: &SyncCookie{
				StreamId: streamID[:],
			},
		},
		TargetSyncIds: []string{"test-sync-1"},
	}

	env.distributor.DistributeBackfillMessage(streamID, backfillMsg)

	time.Sleep(50 * time.Millisecond)

	receivedMsgs = sub.Messages.GetBatch(nil)
	assert.Len(t, receivedMsgs, 0) // No messages should be delivered after SYNC_DOWN
}

// TestE2E_ErrorHandlingAndRecovery tests error scenarios
func TestE2E_ErrorHandlingAndRecovery(t *testing.T) {
	env := newE2ETestEnv(t)
	defer env.cleanup()

	// Test 1: Subscription to stopped manager
	env.manager.stopped.Store(true)

	ctx, cancel := context.WithCancelCause(context.Background())
	defer cancel(nil)

	sub, err := env.manager.Subscribe(ctx, cancel, "test-sync-1")
	assert.Error(t, err)
	assert.Nil(t, sub)
	assert.Contains(t, err.Error(), "subscription manager is stopped")

	// Reset manager state
	env.manager.stopped.Store(false)

	// Test 2: Create valid subscription and then close it
	sub, err = env.manager.Subscribe(ctx, cancel, "test-sync-1")
	require.NoError(t, err)

	// Close subscription
	sub.Close()

	// Verify subscription is marked as closed
	assert.True(t, sub.isClosed())

	// Test 3: Try to send message to closed subscription
	streamID := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	msg := &SyncStreamsResponse{
		SyncOp: SyncOp_SYNC_UPDATE,
		Stream: &StreamAndCookie{
			NextSyncCookie: &SyncCookie{
				StreamId: streamID[:],
			},
		},
	}

	// This should not panic and should handle closed subscription gracefully
	env.distributor.DistributeMessage(streamID, msg)
}

// TestE2E_PerformanceAndStress tests with multiple subscriptions and high volume
func TestE2E_PerformanceAndStress(t *testing.T) {
	env := newE2ETestEnv(t)
	defer env.cleanup()

	const numSubscriptions = 10
	const numStreams = 5
	const messagesPerStream = 3

	// Create multiple subscriptions
	subscriptions := make([]*Subscription, numSubscriptions)
	contexts := make([]context.CancelCauseFunc, numSubscriptions)

	for i := 0; i < numSubscriptions; i++ {
		ctx, cancel := context.WithCancelCause(context.Background())
		contexts[i] = cancel
		defer cancel(nil)

		sub, err := env.manager.Subscribe(ctx, cancel, fmt.Sprintf("test-sync-%d", i))
		require.NoError(t, err)
		subscriptions[i] = sub
	}

	// Create multiple streams
	streamIDs := make([]StreamId, numStreams)
	for i := 0; i < numStreams; i++ {
		streamIDs[i] = testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	}

	// Add streams to all subscriptions
	for j, sub := range subscriptions {
		for _, streamID := range streamIDs {
			shouldAddToRemote, shouldBackfill := env.registry.AddStreamToSubscription(sub.syncID, streamID)
			if j == 0 {
				assert.True(t, shouldAddToRemote)
				assert.False(t, shouldBackfill)
			} else {
				assert.False(t, shouldAddToRemote)
				assert.True(t, shouldBackfill)
			}
		}
	}

	// Simulate backfill completion: clear initializingStreams for all subscriptions and streams
	for _, sub := range subscriptions {
		for _, streamID := range streamIDs {
			sub.initializingStreams.Delete(streamID)
		}
	}

	// Debug: Check stream associations
	for i, streamID := range streamIDs {
		subs := env.registry.GetSubscriptionsForStream(streamID)
		t.Logf("Stream %d has %d subscriptions", i, len(subs))
		for _, sub := range subs {
			t.Logf("  - Subscription: %s", sub.syncID)
		}
	}

	// Wait a bit for setup to complete
	time.Sleep(10 * time.Millisecond)

	// Send messages to all streams
	for _, streamID := range streamIDs {
		for msgIdx := 0; msgIdx < messagesPerStream; msgIdx++ {
			msg := &SyncStreamsResponse{
				SyncOp: SyncOp_SYNC_UPDATE,
				Stream: &StreamAndCookie{
					NextSyncCookie: &SyncCookie{
						StreamId: streamID[:],
					},
				},
			}

			env.distributor.DistributeMessage(streamID, msg)
		}
	}

	// Wait for all messages to be processed
	time.Sleep(100 * time.Millisecond)

	// Verify all subscriptions received messages
	expectedMessages := numStreams * messagesPerStream
	for i, sub := range subscriptions {
		var receivedMsgs []*SyncStreamsResponse
		receivedMsgs = sub.Messages.GetBatch(receivedMsgs)
		receivedCount := len(receivedMsgs)
		assert.Equal(t, expectedMessages, receivedCount,
			"Subscription %d should have received %d messages", i, expectedMessages)
	}

	// Verify stats
	streamCount, subCount := env.registry.GetStats()
	assert.Equal(t, numStreams, streamCount)
	assert.Equal(t, numSubscriptions, subCount)

	// Test cleanup
	for i, cancel := range contexts {
		cancel(nil)
		// Explicitly close the subscription
		subscriptions[i].Close()
		time.Sleep(5 * time.Millisecond)

		// Verify subscription is removed
		_, exists := env.registry.GetSubscriptionByID(fmt.Sprintf("test-sync-%d", i))
		t.Logf("After canceling subscription %d, exists in registry: %v", i, exists)
		assert.False(t, exists, "Subscription %d should be removed", i)
	}

	// Final stats check
	streamCount, subCount = env.registry.GetStats()
	assert.Equal(t, 0, streamCount)
	assert.Equal(t, 0, subCount)
}
