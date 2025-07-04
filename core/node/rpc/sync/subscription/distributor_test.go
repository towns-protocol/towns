package subscription

import (
	"testing"

	"github.com/ethereum/go-ethereum/common"
	"github.com/stretchr/testify/assert"
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
			name: "distribute message to closed subscription - should remove it",
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
				sub.Close() // Mark as closed
				mockReg.On("GetSubscriptionsForStream", StreamId{1, 2, 3, 4}).Return([]*Subscription{sub}).Maybe()
				mockReg.On("RemoveSubscription", "test-sync-1")
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
				mockReg.On("RemoveStreamFromSubscription", "test-sync-1", StreamId{1, 2, 3, 4}).Return(false)
				mockReg.On("RemoveStreamFromSubscription", "test-sync-2", StreamId{1, 2, 3, 4}).Return(false)
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
				mockReg.On("GetSubscriptionsForStream", StreamId{1, 2, 3, 4}).Return([]*Subscription{sub})
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
				mockReg.On("GetSubscriptionsForStream", StreamId{1, 2, 3, 4}).Return([]*Subscription{}).Maybe()
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
				mockReg.On("GetSubscriptionsForStream", StreamId{1, 2, 3, 4}).Return([]*Subscription{}).Maybe()
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
		name     string
		setup    func() (*distributor, *Subscription)
		streamID StreamId
		msg      *SyncStreamsResponse
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
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			dis, sub := tt.setup()

			// This is a simple test to ensure the method doesn't panic
			// In a real test, we'd mock the subscription's Send method
			dis.sendMessageToSubscription(tt.streamID, tt.msg, sub)
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
