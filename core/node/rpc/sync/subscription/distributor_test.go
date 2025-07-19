package subscription

import (
	"testing"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	. "github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/shared"
)

func TestDistributor_DistributeMessage(t *testing.T) {
	tests := []struct {
		name          string
		setup         func() (*distributor, *mockRegistry)
		streamID      StreamId
		msg           *SyncStreamsResponse
		expectedCalls func(*mockRegistry)
	}{
		{
			name: "distribute message to single subscription",
			setup: func() (*distributor, *mockRegistry) {
				mockReg := &mockRegistry{}
				dis := newDistributor(mockReg, nil)
				return dis, mockReg
			},
			streamID: StreamId{1, 2, 3, 4},
			msg: &SyncStreamsResponse{
				SyncOp:   SyncOp_SYNC_UPDATE,
				StreamId: []byte{1, 2, 3, 4},
			},
			expectedCalls: func(mockReg *mockRegistry) {
				sub := createTestSubscription("test-sync-1")
				mockReg.On("GetSubscriptionsForStream", StreamId{1, 2, 3, 4}).Return([]*Subscription{sub})
			},
		},
		{
			name: "distribute message to multiple subscriptions",
			setup: func() (*distributor, *mockRegistry) {
				mockReg := &mockRegistry{}
				dis := newDistributor(mockReg, nil)
				return dis, mockReg
			},
			streamID: StreamId{1, 2, 3, 4},
			msg: &SyncStreamsResponse{
				SyncOp:   SyncOp_SYNC_UPDATE,
				StreamId: []byte{1, 2, 3, 4},
			},
			expectedCalls: func(mockReg *mockRegistry) {
				sub1 := createTestSubscription("test-sync-1")
				sub2 := createTestSubscription("test-sync-2")
				mockReg.On("GetSubscriptionsForStream", StreamId{1, 2, 3, 4}).Return([]*Subscription{sub1, sub2})
			},
		},
		{
			name: "distribute SYNC_DOWN message - should remove streams",
			setup: func() (*distributor, *mockRegistry) {
				mockReg := &mockRegistry{}
				dis := newDistributor(mockReg, nil)
				return dis, mockReg
			},
			streamID: StreamId{1, 2, 3, 4},
			msg: &SyncStreamsResponse{
				SyncOp:   SyncOp_SYNC_DOWN,
				StreamId: []byte{1, 2, 3, 4},
			},
			expectedCalls: func(mockReg *mockRegistry) {
				sub1 := createTestSubscription("test-sync-1")
				sub2 := createTestSubscription("test-sync-2")
				mockReg.On("GetSubscriptionsForStream", StreamId{1, 2, 3, 4}).Return([]*Subscription{sub1, sub2})
				mockReg.On("OnStreamDown", StreamId{1, 2, 3, 4})
			},
		},
		{
			name: "no subscriptions for stream",
			setup: func() (*distributor, *mockRegistry) {
				mockReg := &mockRegistry{}
				dis := newDistributor(mockReg, nil)
				return dis, mockReg
			},
			streamID: StreamId{1, 2, 3, 4},
			msg: &SyncStreamsResponse{
				SyncOp:   SyncOp_SYNC_UPDATE,
				StreamId: []byte{1, 2, 3, 4},
			},
			expectedCalls: func(mockReg *mockRegistry) {
				mockReg.On("GetSubscriptionsForStream", StreamId{1, 2, 3, 4}).Return([]*Subscription{})
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			dis, mockReg := tt.setup()
			tt.expectedCalls(mockReg)
			dis.DistributeMessage(tt.streamID, tt.msg)
			// Wait for goroutines to complete
			time.Sleep(10 * time.Millisecond)
			mockReg.AssertExpectations(t)
		})
	}
}

func TestDistributor_DistributeBackfillMessage(t *testing.T) {
	tests := []struct {
		name          string
		setup         func() (*distributor, *mockRegistry)
		streamID      StreamId
		msg           *SyncStreamsResponse
		expectedCalls func(*mockRegistry)
	}{
		{
			name: "distribute backfill message to existing subscription",
			setup: func() (*distributor, *mockRegistry) {
				mockReg := &mockRegistry{}
				dis := newDistributor(mockReg, nil)
				return dis, mockReg
			},
			streamID: StreamId{1, 2, 3, 4},
			msg: &SyncStreamsResponse{
				SyncOp:        SyncOp_SYNC_UPDATE,
				StreamId:      []byte{1, 2, 3, 4},
				TargetSyncIds: []string{"test-sync-1"},
			},
			expectedCalls: func(mockReg *mockRegistry) {
				sub := createTestSubscription("test-sync-1")
				mockReg.On("GetSubscriptionByID", "test-sync-1").Return(sub, true)
			},
		},
		{
			name: "distribute backfill message to non-existent subscription",
			setup: func() (*distributor, *mockRegistry) {
				mockReg := &mockRegistry{}
				dis := newDistributor(mockReg, nil)
				return dis, mockReg
			},
			streamID: StreamId{1, 2, 3, 4},
			msg: &SyncStreamsResponse{
				SyncOp:        SyncOp_SYNC_UPDATE,
				StreamId:      []byte{1, 2, 3, 4},
				TargetSyncIds: []string{"non-existent"},
			},
			expectedCalls: func(mockReg *mockRegistry) {
				mockReg.On("GetSubscriptionByID", "non-existent").Return((*Subscription)(nil), false)
			},
		},
		{
			name: "distribute backfill message to closed subscription",
			setup: func() (*distributor, *mockRegistry) {
				mockReg := &mockRegistry{}
				dis := newDistributor(mockReg, nil)
				return dis, mockReg
			},
			streamID: StreamId{1, 2, 3, 4},
			msg: &SyncStreamsResponse{
				SyncOp:        SyncOp_SYNC_UPDATE,
				StreamId:      []byte{1, 2, 3, 4},
				TargetSyncIds: []string{"test-sync-1"},
			},
			expectedCalls: func(mockReg *mockRegistry) {
				sub := createTestSubscription("test-sync-1")
				sub.Close() // Mark as closed
				mockReg.On("GetSubscriptionByID", "test-sync-1").Return(sub, true)
			},
		},
		{
			name: "distribute backfill message with no target sync IDs",
			setup: func() (*distributor, *mockRegistry) {
				mockReg := &mockRegistry{}
				dis := newDistributor(mockReg, nil)
				return dis, mockReg
			},
			streamID: StreamId{1, 2, 3, 4},
			msg: &SyncStreamsResponse{
				SyncOp:        SyncOp_SYNC_UPDATE,
				StreamId:      []byte{1, 2, 3, 4},
				TargetSyncIds: []string{},
			},
			expectedCalls: func(mockReg *mockRegistry) {
				// No calls expected
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			dis, mockReg := tt.setup()
			tt.expectedCalls(mockReg)
			dis.DistributeBackfillMessage(tt.streamID, tt.msg)
			mockReg.AssertExpectations(t)
		})
	}
}

func TestDistributor_SendMessageToSubscription(t *testing.T) {
	tests := []struct {
		name          string
		setup         func() (*distributor, *Subscription)
		streamID      StreamId
		msg           *SyncStreamsResponse
		verify        func(t *testing.T, sub *Subscription)
	}{
		{
			name: "send SYNC_UPDATE message to subscription",
			setup: func() (*distributor, *Subscription) {
				dis := newDistributor(nil, nil)
				return dis, createTestSubscription("test-sync-1")
			},
			streamID: StreamId{1, 2, 3, 4},
			msg: &SyncStreamsResponse{
				SyncOp:   SyncOp_SYNC_UPDATE,
				StreamId: []byte{1, 2, 3, 4},
				Stream: &StreamAndCookie{
					Events: []*Envelope{{Hash: []byte{1, 2, 3}}},
				},
			},
			verify: func(t *testing.T, sub *Subscription) {
				// Verify message was sent to subscription
				assert.Equal(t, 1, sub.Messages.Len())
				batch := sub.Messages.GetBatch(nil)
				assert.Len(t, batch, 1)
				assert.Equal(t, SyncOp_SYNC_UPDATE, batch[0].SyncOp)
			},
		},
		{
			name: "send SYNC_DOWN message to subscription",
			setup: func() (*distributor, *Subscription) {
				dis := newDistributor(nil, nil)
				return dis, createTestSubscription("test-sync-1")
			},
			streamID: StreamId{1, 2, 3, 4},
			msg: &SyncStreamsResponse{
				SyncOp:   SyncOp_SYNC_DOWN,
				StreamId: []byte{1, 2, 3, 4},
			},
			verify: func(t *testing.T, sub *Subscription) {
				// Verify message was sent to subscription
				assert.Equal(t, 1, sub.Messages.Len())
				batch := sub.Messages.GetBatch(nil)
				assert.Len(t, batch, 1)
				assert.Equal(t, SyncOp_SYNC_DOWN, batch[0].SyncOp)
			},
		},
		{
			name: "skip SYNC_UPDATE for initializing stream",
			setup: func() (*distributor, *Subscription) {
				dis := newDistributor(nil, nil)
				sub := createTestSubscription("test-sync-1")
				// Mark stream as initializing
				sub.initializingStreams.Store(StreamId{1, 2, 3, 4}, struct{}{})
				return dis, sub
			},
			streamID: StreamId{1, 2, 3, 4},
			msg: &SyncStreamsResponse{
				SyncOp:   SyncOp_SYNC_UPDATE,
				StreamId: []byte{1, 2, 3, 4},
				Stream: &StreamAndCookie{
					Events: []*Envelope{{Hash: []byte{1, 2, 3}}},
				},
			},
			verify: func(t *testing.T, sub *Subscription) {
				// Verify message was NOT sent (initializing stream)
				assert.Equal(t, 0, sub.Messages.Len())
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			dis, sub := tt.setup()
			dis.sendMessageToSubscription(tt.streamID, tt.msg, sub)
			if tt.verify != nil {
				tt.verify(t, sub)
			}
		})
	}
}

func TestDistributor_BackfillEventFiltering(t *testing.T) {
	tests := []struct {
		name                 string
		setup                func() (*distributor, *mockRegistry, *Subscription)
		streamID             StreamId
		backfillMsg          *SyncStreamsResponse
		regularMsg           *SyncStreamsResponse
		expectedEventCount   int
	}{
		{
			name: "filter duplicate events from backfill",
			setup: func() (*distributor, *mockRegistry, *Subscription) {
				mockReg := &mockRegistry{}
				dis := newDistributor(mockReg, nil)
				sub := createTestSubscription("test-sync-1")
				// Mark stream as initializing for backfill
				sub.initializingStreams.Store(StreamId{1, 2, 3, 4}, struct{}{})
				return dis, mockReg, sub
			},
			streamID: StreamId{1, 2, 3, 4},
			backfillMsg: &SyncStreamsResponse{
				SyncOp:        SyncOp_SYNC_UPDATE,
				StreamId:      []byte{1, 2, 3, 4},
				TargetSyncIds: []string{"test-sync-1"},
				Stream: &StreamAndCookie{
					Events: []*Envelope{
						{Hash: common.Hash{1}.Bytes()},
						{Hash: common.Hash{2}.Bytes()},
					},
				},
			},
			regularMsg: &SyncStreamsResponse{
				SyncOp:   SyncOp_SYNC_UPDATE,
				StreamId: []byte{1, 2, 3, 4},
				Stream: &StreamAndCookie{
					Events: []*Envelope{
						{Hash: common.Hash{1}.Bytes()}, // Duplicate from backfill
						{Hash: common.Hash{2}.Bytes()}, // Duplicate from backfill
						{Hash: common.Hash{3}.Bytes()}, // New event
					},
				},
			},
			expectedEventCount: 1, // Only the new event should be included
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			dis, mockReg, sub := tt.setup()

			// Setup mock for backfill
			mockReg.On("GetSubscriptionByID", "test-sync-1").Return(sub, true)

			// Send backfill message
			dis.DistributeBackfillMessage(tt.streamID, tt.backfillMsg)

			// Setup mock for regular message distribution
			mockReg.On("GetSubscriptionsForStream", tt.streamID).Return([]*Subscription{sub})

			// Send regular message (should filter out backfill events)
			dis.DistributeMessage(tt.streamID, tt.regularMsg)

			// Wait for async operations
			time.Sleep(20 * time.Millisecond)

			// Verify the messages in subscription buffer
			assert.Equal(t, 2, sub.Messages.Len()) // One backfill + one regular
			batch := sub.Messages.GetBatch(nil)
			require.Len(t, batch, 2)

			// Check the regular message has filtered events
			regularMsgReceived := batch[1]
			assert.Equal(t, tt.expectedEventCount, len(regularMsgReceived.Stream.Events))
			if tt.expectedEventCount > 0 {
				// Verify it's the new event (hash{3})
				assert.Equal(t, common.Hash{3}.Bytes(), regularMsgReceived.Stream.Events[0].Hash)
			}

			mockReg.AssertExpectations(t)
		})
	}
}

func TestDistributor_ExtractBackfillHashes(t *testing.T) {
	tests := []struct {
		name           string
		msg            *SyncStreamsResponse
		expectedHashes []common.Hash
	}{
		{
			name: "extract hashes from events and miniblocks",
			msg: &SyncStreamsResponse{
				Stream: &StreamAndCookie{
					Events: []*Envelope{
						{Hash: common.Hash{1, 2, 3, 4}.Bytes()},
						{Hash: common.Hash{5, 6, 7, 8}.Bytes()},
					},
					Miniblocks: []*Miniblock{
						{Header: &Envelope{Hash: common.Hash{9, 10, 11, 12}.Bytes()}},
						{Header: &Envelope{Hash: common.Hash{13, 14, 15, 16}.Bytes()}},
					},
				},
			},
			expectedHashes: []common.Hash{
				{1, 2, 3, 4},
				{5, 6, 7, 8},
				{9, 10, 11, 12},
				{13, 14, 15, 16},
			},
		},
		{
			name: "extract hashes from events only",
			msg: &SyncStreamsResponse{
				Stream: &StreamAndCookie{
					Events: []*Envelope{
						{Hash: common.Hash{1, 2, 3, 4}.Bytes()},
					},
				},
			},
			expectedHashes: []common.Hash{
				{1, 2, 3, 4},
			},
		},
		{
			name: "extract hashes from miniblocks only",
			msg: &SyncStreamsResponse{
				Stream: &StreamAndCookie{
					Miniblocks: []*Miniblock{
						{Header: &Envelope{Hash: common.Hash{1, 2, 3, 4}.Bytes()}},
					},
				},
			},
			expectedHashes: []common.Hash{
				{1, 2, 3, 4},
			},
		},
		{
			name: "no events or miniblocks",
			msg: &SyncStreamsResponse{
				Stream: &StreamAndCookie{},
			},
			expectedHashes: []common.Hash{},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			dis := newDistributor(nil, nil)

			hashes := dis.extractBackfillHashes(tt.msg)

			assert.Len(t, hashes, len(tt.expectedHashes))
			for i, expectedHash := range tt.expectedHashes {
				assert.Equal(t, expectedHash, hashes[i])
			}
		})
	}
}
