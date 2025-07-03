package subscription

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
	. "github.com/towns-protocol/towns/core/node/protocol"
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

func TestManager_processMessage(t *testing.T) {
	mockReg := &mockRegistry{}
	m := NewManager(context.Background(), [20]byte{1}, nil, nil, nil)
	m.registry = mockReg
	m.distributor = newDistributor(mockReg, nil)

	streamID := testutils.FakeStreamId(STREAM_CHANNEL_BIN)

	// Test SYNC_UPDATE message - needs Stream field with NextSyncCookie
	msg := &SyncStreamsResponse{
		SyncOp: SyncOp_SYNC_UPDATE,
		Stream: &StreamAndCookie{
			NextSyncCookie: &SyncCookie{
				StreamId: streamID[:],
			},
		},
	}
	mockReg.On("GetSubscriptionsForStream", mock.Anything).Return([]*Subscription{}).Maybe()
	err := m.processMessage(msg)
	assert.NoError(t, err)
	mockReg.AssertExpectations(t)

	// Test SYNC_DOWN message - uses direct StreamId field
	msg2 := &SyncStreamsResponse{
		SyncOp:   SyncOp_SYNC_DOWN,
		StreamId: streamID[:],
	}
	mockReg.On("GetSubscriptionsForStream", mock.Anything).Return([]*Subscription{}).Maybe()
	err = m.processMessage(msg2)
	assert.NoError(t, err)
	mockReg.AssertExpectations(t)

	// Backfill path - SYNC_UPDATE with target sync IDs
	sub := createTestSubscription("test-sync-id")
	msg3 := &SyncStreamsResponse{
		SyncOp: SyncOp_SYNC_UPDATE,
		Stream: &StreamAndCookie{
			NextSyncCookie: &SyncCookie{
				StreamId: streamID[:],
			},
		},
		TargetSyncIds: []string{"test-sync-id"},
	}
	mockReg.On("GetSubscriptionByID", "test-sync-id").Return(sub, true).Once()
	err = m.processMessage(msg3)
	assert.NoError(t, err)
	mockReg.AssertExpectations(t)
}

func TestManager_start(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	mockReg := &mockRegistry{}
	m := NewManager(ctx, [20]byte{1}, nil, nil, nil)
	m.registry = mockReg
	m.distributor = newDistributor(mockReg, nil)

	// Create a test message
	streamID := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	msg := &SyncStreamsResponse{
		SyncOp: SyncOp_SYNC_UPDATE,
		Stream: &StreamAndCookie{
			NextSyncCookie: &SyncCookie{
				StreamId: streamID[:],
			},
		},
	}

	// Mock the registry to expect the message processing
	mockReg.On("GetSubscriptionsForStream", mock.Anything).Return([]*Subscription{}).Maybe()

	// Add message to the buffer
	err := m.messages.AddMessage(msg)
	require.NoError(t, err)

	// Give the start goroutine time to process the message
	time.Sleep(50 * time.Millisecond)

	// Verify the message processing mock was called
	mockReg.AssertExpectations(t)

	// Now mock the CancelAll call and cancel the context
	mockReg.On("CancelAll", mock.Anything).Return().Once()
	cancel()

	// Give time for the cancel to be processed
	time.Sleep(10 * time.Millisecond)

	// Verify all mocks were called
	mockReg.AssertExpectations(t)
}
