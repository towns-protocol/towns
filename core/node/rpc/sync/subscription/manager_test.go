package subscription

import (
	"context"
	"fmt"
	"testing"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	. "github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/rpc/sync/client"
	. "github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/testutils"
)

func TestManager_Subscribe(t *testing.T) {
	m := NewManager(context.Background(), [20]byte{1}, nil, nil, nil)
	ctx, cancel := context.WithCancelCause(context.Background())
	defer cancel(nil)

	sub, err := m.Subscribe(ctx, cancel, "test-sync-id")
	require.NoError(t, err)
	require.NotNil(t, sub)
	assert.Equal(t, "test-sync-id", sub.syncID)

	// Check that the subscription is in the registry
	got, exists := m.registry.GetSubscriptionByID("test-sync-id")
	assert.True(t, exists)
	assert.Equal(t, sub, got)

	// Test stopped path
	m.stopped.Store(true)
	sub2, err2 := m.Subscribe(ctx, cancel, "should-fail")
	assert.Nil(t, sub2)
	assert.Error(t, err2)
}

func TestManager_CleanupUnusedStreams(t *testing.T) {
	// Test the unused streams cleanup functionality
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Create mock syncer set
	mockSyncerSet := &mockSyncerSet{}

	m := &Manager{
		log:       testutils.DiscardLogger(),
		globalCtx: ctx,
		syncers:   mockSyncerSet,
		registry:  newRegistry(),
	}

	streamID := testutils.FakeStreamId(STREAM_CHANNEL_BIN)

	// Add a subscription without any streams (to simulate unused stream)
	sub := createTestSubscription("test-sync-1")
	m.registry.AddSubscription(sub)

	// Add stream to subscription then remove subscription to make stream unused
	m.registry.AddStreamToSubscription("test-sync-1", streamID)
	m.registry.RemoveSubscription("test-sync-1")

	// Setup expectations
	cleaned := false
	mockSyncerSet.On("Modify", mock.Anything, mock.MatchedBy(func(req client.ModifyRequest) bool {
		if len(req.ToRemove) == 1 &&
			StreamId(req.ToRemove[0]) == streamID &&
			req.RemovingFailureHandler != nil {
			cleaned = true
			return true
		}
		return false
	})).Return(nil).Once()

	// Manually trigger cleanup
	m.registry.CleanupUnusedStreams(func(streamID StreamId) {
		ctx, cancel := context.WithTimeout(m.globalCtx, time.Second*5)
		defer cancel()
		_ = m.syncers.Modify(ctx, client.ModifyRequest{
			ToRemove:               [][]byte{streamID[:]},
			RemovingFailureHandler: func(status *SyncStreamOpStatus) {},
		})
	})

	// Verify cleanup was called
	assert.True(t, cleaned)
	mockSyncerSet.AssertExpectations(t)
}

func TestManager_Subscribe_Concurrent(t *testing.T) {
	// Test concurrent subscription creation
	ctx := context.Background()
	m := NewManager(ctx, common.Address{1}, nil, nil, nil)

	// Create multiple subscriptions concurrently
	n := 10
	done := make(chan bool, n)
	subs := make([]*Subscription, n)

	for i := 0; i < n; i++ {
		go func(idx int) {
			defer func() { done <- true }()
			syncID := fmt.Sprintf("test-sync-%d", idx)
			ctx, cancel := context.WithCancelCause(context.Background())
			defer cancel(nil)

			sub, err := m.Subscribe(ctx, cancel, syncID)
			assert.NoError(t, err)
			assert.NotNil(t, sub)
			subs[idx] = sub
		}(i)
	}

	// Wait for all subscriptions to be created
	for i := 0; i < n; i++ {
		<-done
	}

	// Verify all subscriptions are in the registry
	for i, sub := range subs {
		if sub != nil {
			got, exists := m.registry.GetSubscriptionByID(fmt.Sprintf("test-sync-%d", i))
			assert.True(t, exists)
			assert.Equal(t, sub, got)
		}
	}

	// Verify stats
	_, subCount := m.registry.GetStats()
	assert.Equal(t, n, subCount)
}

func TestManager_GetStats(t *testing.T) {
	// Test the GetStats method
	ctx := context.Background()
	m := NewManager(ctx, common.Address{1}, nil, nil, nil)

	// Initially should have 0 streams and 0 subscriptions
	stats := m.GetStats()
	assert.Equal(t, 0, stats.SyncingStreamsCount)

	// Create some subscriptions with streams
	for i := 0; i < 3; i++ {
		syncID := fmt.Sprintf("test-sync-%d", i)
		ctx, cancel := context.WithCancelCause(context.Background())
		defer cancel(nil)

		sub, err := m.Subscribe(ctx, cancel, syncID)
		require.NoError(t, err)
		require.NotNil(t, sub)

		// Add streams to the subscription
		for j := 0; j < 2; j++ {
			streamID := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
			m.registry.AddStreamToSubscription(syncID, streamID)
		}
	}

	// Check stats after adding subscriptions and streams
	stats = m.GetStats()
	assert.Equal(t, 6, stats.SyncingStreamsCount) // 3 subscriptions * 2 streams each
}
