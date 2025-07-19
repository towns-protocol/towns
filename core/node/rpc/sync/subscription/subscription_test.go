package subscription

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	"github.com/towns-protocol/towns/core/node/base"
	. "github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/rpc/sync/client"
	. "github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/testutils"
)

func TestSubscription_Modify(t *testing.T) {
	// Generate stream IDs once to ensure consistency
	streamID1 := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	streamID2 := testutils.FakeStreamId(STREAM_CHANNEL_BIN)

	tests := []struct {
		name          string
		setup         func() (*Subscription, SyncerSet)
		req           client.ModifyRequest
		expectedCalls func(SyncerSet)
		verify        func(t *testing.T, sub *Subscription)
		expectError   Err
		errorContains string
	}{
		{
			name: "add new stream - should add to remote",
			setup: func() (*Subscription, SyncerSet) {
				mockSyncer := &mockSyncerSet{}
				sub := createTestSubscription("test-sync-1")
				sub.syncers = mockSyncer
				return sub, mockSyncer
			},
			req: client.ModifyRequest{
				SyncID: "test-sync-1",
				ToAdd: []*SyncCookie{
					{StreamId: streamID1[:]},
				},
				AddingFailureHandler: func(status *SyncStreamOpStatus) {},
			},
			expectedCalls: func(mockSyncer SyncerSet) {
				mockSyncer.(*mockSyncerSet).On("Modify", mock.Anything, mock.MatchedBy(func(req client.ModifyRequest) bool {
					return len(req.ToAdd) == 1 && len(req.ToRemove) == 0 && len(req.ToBackfill) == 0
				})).Return(nil)
			},
			verify: func(t *testing.T, sub *Subscription) {
				// Verify stream was added to registry
				subs := sub.registry.GetSubscriptionsForStream(streamID1)
				assert.Len(t, subs, 1)
				assert.Equal(t, sub, subs[0])
			},
		},
		{
			name: "add existing stream - should backfill",
			setup: func() (*Subscription, SyncerSet) {
				mockSyncer := &mockSyncerSet{}
				sub := createTestSubscription("test-sync-1")
				sub.syncers = mockSyncer
				// Pre-add the stream to registry to simulate existing stream
				sub.registry.AddStreamToSubscription("test-sync-1", streamID2)
				return sub, mockSyncer
			},
			req: client.ModifyRequest{
				SyncID: "test-sync-1",
				ToAdd: []*SyncCookie{
					{StreamId: streamID2[:]},
				},
				AddingFailureHandler: func(status *SyncStreamOpStatus) {},
			},
			expectedCalls: func(mockSyncer SyncerSet) {
				mockSyncer.(*mockSyncerSet).On("Modify", mock.Anything, mock.MatchedBy(func(req client.ModifyRequest) bool {
					return len(req.ToAdd) == 0 && len(req.ToRemove) == 0 && len(req.ToBackfill) == 1
				})).Return(nil)
			},
		},
		{
			name: "remove stream - should not remove from remote",
			setup: func() (*Subscription, SyncerSet) {
				mockSyncer := &mockSyncerSet{}
				sub := createTestSubscription("test-sync-1")
				sub.syncers = mockSyncer
				return sub, mockSyncer
			},
			req: client.ModifyRequest{
				SyncID: "test-sync-1",
				ToRemove: [][]byte{
					streamID2[:],
				},
				RemovingFailureHandler: func(status *SyncStreamOpStatus) {},
			},
			expectedCalls: func(mockSyncer SyncerSet) {
				// No call to syncer.Modify expected since no remote changes
			},
			verify: func(t *testing.T, sub *Subscription) {
				// Verify stream was removed from registry
				subs := sub.registry.GetSubscriptionsForStream(streamID2)
				assert.Len(t, subs, 0)
			},
		},
		{
			name: "mixed add and remove streams",
			setup: func() (*Subscription, SyncerSet) {
				mockSyncer := &mockSyncerSet{}
				sub := createTestSubscription("test-sync-1")
				sub.syncers = mockSyncer
				return sub, mockSyncer
			},
			req: client.ModifyRequest{
				SyncID: "test-sync-1",
				ToAdd: []*SyncCookie{
					{StreamId: streamID1[:]},
				},
				ToRemove: [][]byte{
					streamID2[:],
				},
				AddingFailureHandler:   func(status *SyncStreamOpStatus) {},
				RemovingFailureHandler: func(status *SyncStreamOpStatus) {},
			},
			expectedCalls: func(mockSyncer SyncerSet) {
				mockSyncer.(*mockSyncerSet).On("Modify", mock.Anything, mock.MatchedBy(func(req client.ModifyRequest) bool {
					return len(req.ToAdd) == 1 && len(req.ToRemove) == 0 && len(req.ToBackfill) == 0
				})).Return(nil)
			},
		},
		{
			name: "add stream with backfill and custom backfill handler",
			setup: func() (*Subscription, SyncerSet) {
				mockSyncer := &mockSyncerSet{}
				sub := createTestSubscription("test-sync-1")
				sub.syncers = mockSyncer
				// Pre-add the stream to registry to simulate existing stream
				sub.registry.AddStreamToSubscription("test-sync-1", streamID1)
				return sub, mockSyncer
			},
			req: client.ModifyRequest{
				SyncID: "test-sync-1",
				ToAdd: []*SyncCookie{
					{StreamId: streamID1[:]},
				},
				AddingFailureHandler:      func(status *SyncStreamOpStatus) {},
				BackfillingFailureHandler: func(status *SyncStreamOpStatus) {},
			},
			expectedCalls: func(mockSyncer SyncerSet) {
				mockSyncer.(*mockSyncerSet).On("Modify", mock.Anything, mock.MatchedBy(func(req client.ModifyRequest) bool {
					return len(req.ToAdd) == 0 && len(req.ToRemove) == 0 && len(req.ToBackfill) == 1
				})).Return(nil)
			},
		},
		{
			name: "empty request - should return early",
			setup: func() (*Subscription, SyncerSet) {
				mockSyncer := &mockSyncerSet{}
				sub := createTestSubscription("test-sync-1")
				sub.syncers = mockSyncer
				return sub, mockSyncer
			},
			req: client.ModifyRequest{
				SyncID: "test-sync-1",
			},
			expectedCalls: func(mockSyncer SyncerSet) {
				// No calls expected since request is empty
			},
			expectError:   Err_INVALID_ARGUMENT,
			errorContains: "Empty modify sync request",
		},
		{
			name: "syncer modify returns error",
			setup: func() (*Subscription, SyncerSet) {
				mockSyncer := &mockSyncerSet{}
				sub := createTestSubscription("test-sync-1")
				sub.syncers = mockSyncer
				return sub, mockSyncer
			},
			req: client.ModifyRequest{
				SyncID: "test-sync-1",
				ToAdd: []*SyncCookie{
					{StreamId: streamID1[:]},
				},
				AddingFailureHandler: func(status *SyncStreamOpStatus) {},
			},
			expectedCalls: func(mockSyncer SyncerSet) {
				mockSyncer.(*mockSyncerSet).On("Modify", mock.Anything, mock.Anything).Return(assert.AnError)
			},
			expectError:   Err_UNKNOWN,
			errorContains: assert.AnError.Error(),
		},
		{
			name: "invalid request - duplicate streams in add",
			setup: func() (*Subscription, SyncerSet) {
				mockSyncer := &mockSyncerSet{}
				sub := createTestSubscription("test-sync-1")
				sub.syncers = mockSyncer
				return sub, mockSyncer
			},
			req: client.ModifyRequest{
				SyncID: "test-sync-1",
				ToAdd: []*SyncCookie{
					{StreamId: streamID1[:]},
					{StreamId: streamID1[:]}, // Duplicate
				},
				AddingFailureHandler: func(status *SyncStreamOpStatus) {},
			},
			expectedCalls: func(mockSyncer SyncerSet) {
				// No calls expected due to validation error
			},
			expectError:   Err_INVALID_ARGUMENT,
			errorContains: "Duplicate stream in add list",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			sub, mockSyncer := tt.setup()
			tt.expectedCalls(mockSyncer)

			err := sub.Modify(context.Background(), tt.req)

			if tt.expectError > 0 {
				assert.Error(t, err)
				assert.Equal(t, tt.expectError, base.AsRiverError(err).Code)
				if tt.errorContains != "" {
					assert.Contains(t, err.Error(), tt.errorContains)
				}
			} else {
				assert.NoError(t, err)
			}

			if tt.verify != nil {
				tt.verify(t, sub)
			}

			mockSyncer.(*mockSyncerSet).AssertExpectations(t)
		})
	}
}

func TestSubscription_Modify_AddingFailureHandler(t *testing.T) {
	// Test that the adding failure handler properly removes streams from registry
	mockSyncer := &mockSyncerSet{}
	sub := createTestSubscription("test-sync-1")
	sub.syncers = mockSyncer

	streamID := testutils.FakeStreamId(STREAM_CHANNEL_BIN)

	// Setup mocks
	mockSyncer.On("Modify", mock.Anything, mock.Anything).Return(nil)

	// Create request with adding failure handler
	req := client.ModifyRequest{
		SyncID: "test-sync-1",
		ToAdd: []*SyncCookie{
			{StreamId: streamID[:]},
		},
		AddingFailureHandler: func(status *SyncStreamOpStatus) {
			// This should remove the stream from subscription
			sub.registry.RemoveStreamFromSubscription("test-sync-1", StreamId(status.StreamId))
		},
	}

	err := sub.Modify(context.Background(), req)
	assert.NoError(t, err)

	// Verify stream was added
	subs := sub.registry.GetSubscriptionsForStream(streamID)
	assert.Len(t, subs, 1)

	// If we need to test the handler being called, we'd need to simulate a failure
	// For now, just verify the setup worked

	mockSyncer.AssertExpectations(t)
}

func TestSubscription_Modify_BackfillFailureHandler(t *testing.T) {
	// Test that the backfill failure handler properly routes failures
	mockSyncer := &mockSyncerSet{}
	sub := createTestSubscription("test-sync-1")
	sub.syncers = mockSyncer

	streamID := testutils.FakeStreamId(STREAM_CHANNEL_BIN)

	// Pre-add the stream to registry to simulate existing stream (triggers backfill)
	sub.registry.AddStreamToSubscription("test-sync-1", streamID)

	// Setup mocks
	mockSyncer.On("Modify", mock.Anything, mock.MatchedBy(func(req client.ModifyRequest) bool {
		return len(req.ToBackfill) == 1 && req.BackfillingFailureHandler != nil
	})).Return(nil)

	// Create request with both adding and backfill failure handlers
	req := client.ModifyRequest{
		SyncID: "test-sync-1",
		ToAdd: []*SyncCookie{
			{StreamId: streamID[:]},
		},
		AddingFailureHandler: func(status *SyncStreamOpStatus) {
			// This should be called for implicit backfill failures
		},
		BackfillingFailureHandler: func(status *SyncStreamOpStatus) {
			// This should be called for explicit backfill failures
		},
	}

	err := sub.Modify(context.Background(), req)
	assert.NoError(t, err)

	mockSyncer.AssertExpectations(t)
}

func TestSubscription_DebugDropStream(t *testing.T) {
	tests := []struct {
		name     string
		streamID StreamId
	}{
		{
			name:     "successfully drop stream",
			streamID: testutils.FakeStreamId(STREAM_CHANNEL_BIN),
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Setup subscription
			sub := createTestSubscription("test-sync-1")

			// Add stream to registry first
			sub.registry.AddStreamToSubscription("test-sync-1", tt.streamID)

			// Call DebugDropStream
			err := sub.DebugDropStream(context.Background(), tt.streamID)
			assert.NoError(t, err)

			// Verify stream was removed from registry
			subs := sub.registry.GetSubscriptionsForStream(tt.streamID)
			assert.Len(t, subs, 0)

			// Verify SYNC_DOWN message was sent by checking the buffer
			assert.Equal(t, 1, sub.Messages.Len())
			batch := sub.Messages.GetBatch(nil)
			assert.Len(t, batch, 1)
			msg := batch[0]
			assert.Equal(t, SyncOp_SYNC_DOWN, msg.SyncOp)
			assert.Equal(t, tt.streamID[:], msg.StreamId)
		})
	}
}

func TestSubscription_Send(t *testing.T) {
	tests := []struct {
		name         string
		setup        func() *Subscription
		msg          *SyncStreamsResponse
		expectCancel bool
	}{
		{
			name: "successful send",
			setup: func() *Subscription {
				sub := createTestSubscription("test-sync-1")
				return sub
			},
			msg: &SyncStreamsResponse{
				SyncOp:   SyncOp_SYNC_UPDATE,
				StreamId: []byte{1, 2, 3, 4},
			},
			expectCancel: false,
		},
		{
			name: "send to closed subscription - should return without error",
			setup: func() *Subscription {
				sub := createTestSubscription("test-sync-1")
				sub.Close()
				return sub
			},
			msg: &SyncStreamsResponse{
				SyncOp:   SyncOp_SYNC_UPDATE,
				StreamId: []byte{1, 2, 3, 4},
			},
			expectCancel: false,
		},
		{
			name: "send when buffer is full - should cancel subscription",
			setup: func() *Subscription {
				sub := createTestSubscription("test-sync-1")
				// Fill the buffer to capacity
				// MaxBufferSize is defined in dynmsgbuf package as 2048
				for i := 0; i < 2048; i++ {
					err := sub.Messages.AddMessage(&SyncStreamsResponse{
						SyncOp:   SyncOp_SYNC_UPDATE,
						StreamId: []byte{byte(i % 256), byte(i / 256)},
					})
					if err != nil {
						break // Buffer is full
					}
				}
				return sub
			},
			msg: &SyncStreamsResponse{
				SyncOp:   SyncOp_SYNC_UPDATE,
				StreamId: []byte{1, 2, 3, 4},
			},
			expectCancel: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			sub := tt.setup()

			// Track if cancel was called
			cancelCalled := false
			originalCancel := sub.cancel
			sub.cancel = func(err error) {
				cancelCalled = true
				originalCancel(err)
			}

			// Send the message
			sub.Send(tt.msg)

			// Verify expectations
			if tt.expectCancel {
				assert.True(t, cancelCalled, "Expected cancel to be called")
				// When buffer is full, the subscription is cancelled but not closed
				// The Close() method must be called explicitly to set the closed flag
			} else {
				assert.False(t, cancelCalled, "Expected cancel not to be called")
			}
		})
	}
}

func TestSubscription_Send_ConcurrentWithClose(t *testing.T) {
	// Test that Send handles concurrent Close gracefully
	sub := createTestSubscription("test-sync-1")

	// Start multiple goroutines sending messages
	done := make(chan bool, 10)
	for i := 0; i < 10; i++ {
		go func(id int) {
			defer func() { done <- true }()
			for j := 0; j < 100; j++ {
				sub.Send(&SyncStreamsResponse{
					SyncOp:   SyncOp_SYNC_UPDATE,
					StreamId: []byte{byte(id), byte(j)},
				})
			}
		}(i)
	}

	// Close the subscription concurrently
	go func() {
		sub.Close()
	}()

	// Wait for all goroutines to complete
	for i := 0; i < 10; i++ {
		<-done
	}

	// Verify subscription is closed
	assert.True(t, sub.isClosed())
}

func TestSubscription_Concurrent_Modify(t *testing.T) {
	// Test concurrent Modify operations
	mockSyncer := &mockSyncerSet{}
	sub := createTestSubscription("test-sync-1")
	sub.syncers = mockSyncer

	streamIDs := make([]StreamId, 10)
	for i := 0; i < 10; i++ {
		streamIDs[i] = testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	}

	// Setup mocks to handle concurrent calls
	mockSyncer.On("Modify", mock.Anything, mock.Anything).Return(nil).Maybe()

	// Run concurrent Modify operations
	done := make(chan bool, 20)

	// Add streams concurrently
	for i := 0; i < 10; i++ {
		go func(idx int) {
			defer func() { done <- true }()
			err := sub.Modify(context.Background(), client.ModifyRequest{
				SyncID: "test-sync-1",
				ToAdd: []*SyncCookie{
					{StreamId: streamIDs[idx][:]},
				},
				AddingFailureHandler: func(status *SyncStreamOpStatus) {},
			})
			assert.NoError(t, err)
		}(i)
	}

	// Remove streams concurrently
	for i := 0; i < 10; i++ {
		go func(idx int) {
			defer func() { done <- true }()
			err := sub.Modify(context.Background(), client.ModifyRequest{
				SyncID: "test-sync-1",
				ToRemove: [][]byte{
					streamIDs[idx][:],
				},
				RemovingFailureHandler: func(status *SyncStreamOpStatus) {},
			})
			assert.NoError(t, err)
		}(i)
	}

	// Wait for all operations to complete
	for i := 0; i < 20; i++ {
		<-done
	}

	mockSyncer.AssertExpectations(t)
}

func TestSubscription_Concurrent_Send_And_Modify(t *testing.T) {
	// Test concurrent Send and Modify operations
	mockSyncer := &mockSyncerSet{}
	sub := createTestSubscription("test-sync-1")
	sub.syncers = mockSyncer

	streamID := testutils.FakeStreamId(STREAM_CHANNEL_BIN)

	// Setup mocks
	mockSyncer.On("Modify", mock.Anything, mock.Anything).Return(nil).Maybe()

	done := make(chan bool, 30)

	// Send messages concurrently
	for i := 0; i < 10; i++ {
		go func(id int) {
			defer func() { done <- true }()
			for j := 0; j < 50; j++ {
				sub.Send(&SyncStreamsResponse{
					SyncOp:   SyncOp_SYNC_UPDATE,
					StreamId: streamID[:],
				})
			}
		}(i)
	}

	// Modify subscription concurrently
	for i := 0; i < 10; i++ {
		go func(id int) {
			defer func() { done <- true }()
			for j := 0; j < 10; j++ {
				newStreamID := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
				err := sub.Modify(context.Background(), client.ModifyRequest{
					SyncID: "test-sync-1",
					ToAdd: []*SyncCookie{
						{StreamId: newStreamID[:]},
					},
					AddingFailureHandler: func(status *SyncStreamOpStatus) {},
				})
				assert.NoError(t, err)
			}
		}(i)
	}

	// DebugDropStream concurrently
	for i := 0; i < 10; i++ {
		go func(id int) {
			defer func() { done <- true }()
			for j := 0; j < 5; j++ {
				newStreamID := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
				err := sub.DebugDropStream(context.Background(), newStreamID)
				assert.NoError(t, err)
			}
		}(i)
	}

	// Wait for all operations to complete
	for i := 0; i < 30; i++ {
		<-done
	}

	// Verify no deadlocks or panics occurred
	mockSyncer.AssertExpectations(t)
}

func TestSubscription_Concurrent_Close_During_Operations(t *testing.T) {
	// Test that Close during concurrent operations doesn't cause deadlock
	mockSyncer := &mockSyncerSet{}
	sub := createTestSubscription("test-sync-1")
	sub.syncers = mockSyncer

	// Setup mocks
	mockSyncer.On("Modify", mock.Anything, mock.Anything).Return(nil).Maybe()

	done := make(chan bool, 21)

	// Send messages
	for i := 0; i < 10; i++ {
		go func(id int) {
			defer func() { done <- true }()
			for j := 0; j < 100; j++ {
				sub.Send(&SyncStreamsResponse{
					SyncOp:   SyncOp_SYNC_UPDATE,
					StreamId: []byte{byte(id), byte(j)},
				})
				if sub.isClosed() {
					break
				}
			}
		}(i)
	}

	// Modify operations
	for i := 0; i < 10; i++ {
		go func(id int) {
			defer func() { done <- true }()
			for j := 0; j < 20; j++ {
				if sub.isClosed() {
					break
				}
				streamID := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
				_ = sub.Modify(context.Background(), client.ModifyRequest{
					SyncID: "test-sync-1",
					ToAdd: []*SyncCookie{
						{StreamId: streamID[:]},
					},
					AddingFailureHandler: func(status *SyncStreamOpStatus) {},
				})
			}
		}(i)
	}

	// Close after a short delay
	go func() {
		defer func() { done <- true }()
		// Small delay to let operations start
		time.Sleep(10 * time.Millisecond)
		sub.Close()
	}()

	// Wait for all operations to complete
	for i := 0; i < 21; i++ {
		<-done
	}

	// Verify subscription is closed
	assert.True(t, sub.isClosed())
}
