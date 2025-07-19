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
	mockSyncerSet := &MockSyncerSet{}
	mockReg := &mockRegistry{}

	m := &Manager{
		log:           testutils.DiscardLogger(),
		localNodeAddr: common.Address{1},
		globalCtx:     ctx,
		syncers:       mockSyncerSet,
		registry:      mockReg,
	}

	streamID := testutils.FakeStreamId(STREAM_CHANNEL_BIN)

	// Setup expectations
	cleaned := false
	mockReg.On("CleanupUnusedStreams", mock.Anything).Run(func(args mock.Arguments) {
		cb := args.Get(0).(func(StreamId))
		// Simulate cleanup of unused stream
		cb(streamID)
		cleaned = true
	}).Once()

	mockSyncerSet.On("Modify", mock.Anything, mock.MatchedBy(func(req client.ModifyRequest) bool {
		return len(req.ToRemove) == 1 && 
			StreamId(req.ToRemove[0]) == streamID &&
			req.RemovingFailureHandler != nil
	})).Return(nil).Once()

	// Manually trigger cleanup
	m.registry.CleanupUnusedStreams(func(streamID StreamId) {
		ctx, cancel := context.WithTimeout(m.globalCtx, time.Second*5)
		defer cancel()
		_ = m.syncers.Modify(ctx, client.ModifyRequest{
			ToRemove: [][]byte{streamID[:]},
			RemovingFailureHandler: func(status *SyncStreamOpStatus) {},
		})
	})

	// Verify cleanup was called
	assert.True(t, cleaned)
	mockReg.AssertExpectations(t)
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
