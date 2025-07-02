package subscription

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	"github.com/towns-protocol/towns/core/node/base"
	. "github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/rpc/sync/client"
	. "github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/testutils"
)

// MockSyncerSet for testing
type MockSyncerSet struct {
	mock.Mock
}

func (m *MockSyncerSet) Modify(ctx context.Context, req client.ModifyRequest) error {
	args := m.Called(ctx, req)
	return args.Error(0)
}

func TestSubscription_Modify(t *testing.T) {
	// Generate stream IDs once to ensure consistency
	streamID1 := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	streamID2 := testutils.FakeStreamId(STREAM_CHANNEL_BIN)

	tests := []struct {
		name          string
		setup         func() (*Subscription, SyncerSet, *mockRegistry)
		req           client.ModifyRequest
		expectedCalls func(SyncerSet, *mockRegistry)
		expectError   Err
		errorContains string
	}{
		{
			name: "add new stream - should add to remote",
			setup: func() (*Subscription, SyncerSet, *mockRegistry) {
				mockSyncer := &MockSyncerSet{}
				mockReg := &mockRegistry{}
				sub := createTestSubscription("test-sync-1")
				sub.syncers = mockSyncer
				sub.registry = mockReg
				return sub, mockSyncer, mockReg
			},
			req: client.ModifyRequest{
				SyncID: "test-sync-1",
				ToAdd: []*SyncCookie{
					{StreamId: streamID1[:]},
				},
				AddingFailureHandler: func(status *SyncStreamOpStatus) {},
			},
			expectedCalls: func(mockSyncer SyncerSet, mockReg *mockRegistry) {
				mockReg.On("AddStreamToSubscription", "test-sync-1", streamID1).Return(true, false)
				mockSyncer.(*MockSyncerSet).On("Modify", mock.Anything, mock.MatchedBy(func(req client.ModifyRequest) bool {
					return len(req.ToAdd) == 1 && len(req.ToRemove) == 0 && len(req.ToBackfill) == 0
				})).Return(nil)
			},
		},
		{
			name: "add existing stream - should backfill",
			setup: func() (*Subscription, SyncerSet, *mockRegistry) {
				mockSyncer := &MockSyncerSet{}
				mockReg := &mockRegistry{}
				sub := createTestSubscription("test-sync-1")
				sub.syncers = mockSyncer
				sub.registry = mockReg
				return sub, mockSyncer, mockReg
			},
			req: client.ModifyRequest{
				SyncID: "test-sync-1",
				ToAdd: []*SyncCookie{
					{StreamId: streamID2[:]},
				},
				AddingFailureHandler: func(status *SyncStreamOpStatus) {},
			},
			expectedCalls: func(mockSyncer SyncerSet, mockReg *mockRegistry) {
				mockReg.On("AddStreamToSubscription", "test-sync-1", streamID2).Return(false, true)
				mockSyncer.(*MockSyncerSet).On("Modify", mock.Anything, mock.MatchedBy(func(req client.ModifyRequest) bool {
					return len(req.ToAdd) == 0 && len(req.ToRemove) == 0 && len(req.ToBackfill) == 1
				})).Return(nil)
			},
		},
		{
			name: "remove stream - should remove from remote",
			setup: func() (*Subscription, SyncerSet, *mockRegistry) {
				mockSyncer := &MockSyncerSet{}
				mockReg := &mockRegistry{}
				sub := createTestSubscription("test-sync-1")
				sub.syncers = mockSyncer
				sub.registry = mockReg
				return sub, mockSyncer, mockReg
			},
			req: client.ModifyRequest{
				SyncID: "test-sync-1",
				ToRemove: [][]byte{
					streamID1[:],
				},
				RemovingFailureHandler: func(status *SyncStreamOpStatus) {},
			},
			expectedCalls: func(mockSyncer SyncerSet, mockReg *mockRegistry) {
				mockReg.On("RemoveStreamFromSubscription", "test-sync-1", streamID1).Return(true)
				mockSyncer.(*MockSyncerSet).On("Modify", mock.Anything, mock.MatchedBy(func(req client.ModifyRequest) bool {
					return len(req.ToAdd) == 0 && len(req.ToRemove) == 1 && len(req.ToBackfill) == 0
				})).Return(nil)
			},
		},
		{
			name: "remove stream - should not remove from remote",
			setup: func() (*Subscription, SyncerSet, *mockRegistry) {
				mockSyncer := &MockSyncerSet{}
				mockReg := &mockRegistry{}
				sub := createTestSubscription("test-sync-1")
				sub.syncers = mockSyncer
				sub.registry = mockReg
				return sub, mockSyncer, mockReg
			},
			req: client.ModifyRequest{
				SyncID: "test-sync-1",
				ToRemove: [][]byte{
					streamID2[:],
				},
				RemovingFailureHandler: func(status *SyncStreamOpStatus) {},
			},
			expectedCalls: func(mockSyncer SyncerSet, mockReg *mockRegistry) {
				mockReg.On("RemoveStreamFromSubscription", "test-sync-1", streamID2).Return(false)
				// No call to syncer.Modify expected since no remote changes
			},
		},
		{
			name: "mixed add and remove streams",
			setup: func() (*Subscription, SyncerSet, *mockRegistry) {
				mockSyncer := &MockSyncerSet{}
				mockReg := &mockRegistry{}
				sub := createTestSubscription("test-sync-1")
				sub.syncers = mockSyncer
				sub.registry = mockReg
				return sub, mockSyncer, mockReg
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
			expectedCalls: func(mockSyncer SyncerSet, mockReg *mockRegistry) {
				mockReg.On("AddStreamToSubscription", "test-sync-1", streamID1).Return(true, false)
				mockReg.On("RemoveStreamFromSubscription", "test-sync-1", streamID2).Return(true)
				mockSyncer.(*MockSyncerSet).On("Modify", mock.Anything, mock.MatchedBy(func(req client.ModifyRequest) bool {
					return len(req.ToAdd) == 1 && len(req.ToRemove) == 1 && len(req.ToBackfill) == 0
				})).Return(nil)
			},
		},
		{
			name: "add stream with backfill and custom backfill handler",
			setup: func() (*Subscription, SyncerSet, *mockRegistry) {
				mockSyncer := &MockSyncerSet{}
				mockReg := &mockRegistry{}
				sub := createTestSubscription("test-sync-1")
				sub.syncers = mockSyncer
				sub.registry = mockReg
				return sub, mockSyncer, mockReg
			},
			req: client.ModifyRequest{
				SyncID: "test-sync-1",
				ToAdd: []*SyncCookie{
					{StreamId: streamID1[:]},
				},
				AddingFailureHandler:      func(status *SyncStreamOpStatus) {},
				BackfillingFailureHandler: func(status *SyncStreamOpStatus) {},
			},
			expectedCalls: func(mockSyncer SyncerSet, mockReg *mockRegistry) {
				mockReg.On("AddStreamToSubscription", "test-sync-1", streamID1).Return(false, true)
				mockSyncer.(*MockSyncerSet).On("Modify", mock.Anything, mock.MatchedBy(func(req client.ModifyRequest) bool {
					return len(req.ToAdd) == 0 && len(req.ToRemove) == 0 && len(req.ToBackfill) == 1
				})).Return(nil)
			},
		},
		{
			name: "empty request - should return early",
			setup: func() (*Subscription, SyncerSet, *mockRegistry) {
				mockSyncer := &MockSyncerSet{}
				mockReg := &mockRegistry{}
				sub := createTestSubscription("test-sync-1")
				sub.syncers = mockSyncer
				sub.registry = mockReg
				return sub, mockSyncer, mockReg
			},
			req: client.ModifyRequest{
				SyncID: "test-sync-1",
			},
			expectedCalls: func(mockSyncer SyncerSet, mockReg *mockRegistry) {
				// No calls expected since request is empty
			},
			expectError:   Err_INVALID_ARGUMENT,
			errorContains: "Empty modify sync request",
		},
		{
			name: "syncer modify returns error",
			setup: func() (*Subscription, SyncerSet, *mockRegistry) {
				mockSyncer := &MockSyncerSet{}
				mockReg := &mockRegistry{}
				sub := createTestSubscription("test-sync-1")
				sub.syncers = mockSyncer
				sub.registry = mockReg
				return sub, mockSyncer, mockReg
			},
			req: client.ModifyRequest{
				SyncID: "test-sync-1",
				ToAdd: []*SyncCookie{
					{StreamId: streamID1[:]},
				},
				AddingFailureHandler: func(status *SyncStreamOpStatus) {},
			},
			expectedCalls: func(mockSyncer SyncerSet, mockReg *mockRegistry) {
				mockReg.On("AddStreamToSubscription", "test-sync-1", streamID1).Return(true, false)
				mockSyncer.(*MockSyncerSet).On("Modify", mock.Anything, mock.Anything).Return(assert.AnError)
			},
			expectError:   Err_UNKNOWN,
			errorContains: assert.AnError.Error(),
		},
		{
			name: "invalid request - duplicate streams in add",
			setup: func() (*Subscription, SyncerSet, *mockRegistry) {
				mockSyncer := &MockSyncerSet{}
				mockReg := &mockRegistry{}
				sub := createTestSubscription("test-sync-1")
				sub.syncers = mockSyncer
				sub.registry = mockReg
				return sub, mockSyncer, mockReg
			},
			req: client.ModifyRequest{
				SyncID: "test-sync-1",
				ToAdd: []*SyncCookie{
					{StreamId: streamID1[:]},
					{StreamId: streamID1[:]}, // Duplicate
				},
				AddingFailureHandler: func(status *SyncStreamOpStatus) {},
			},
			expectedCalls: func(mockSyncer SyncerSet, mockReg *mockRegistry) {
				// No calls expected due to validation error
			},
			expectError:   Err_INVALID_ARGUMENT,
			errorContains: "Duplicate stream in add list",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			sub, mockSyncer, mockReg := tt.setup()
			tt.expectedCalls(mockSyncer, mockReg)

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

			mockSyncer.(*MockSyncerSet).AssertExpectations(t)
			mockReg.AssertExpectations(t)
		})
	}
}

func TestSubscription_Modify_AddingFailureHandler(t *testing.T) {
	// Test that the adding failure handler properly removes streams from registry
	mockSyncer := &MockSyncerSet{}
	mockReg := &mockRegistry{}
	sub := createTestSubscription("test-sync-1")
	sub.syncers = mockSyncer
	sub.registry = mockReg

	streamID := testutils.FakeStreamId(STREAM_CHANNEL_BIN)

	// Setup mocks
	mockReg.On("AddStreamToSubscription", "test-sync-1", streamID).Return(true, false)
	mockSyncer.On("Modify", mock.Anything, mock.Anything).Return(nil)

	// Create request with adding failure handler
	req := client.ModifyRequest{
		SyncID: "test-sync-1",
		ToAdd: []*SyncCookie{
			{StreamId: streamID[:]},
		},
		AddingFailureHandler: func(status *SyncStreamOpStatus) {
			// This should call RemoveStreamFromSubscription
			mockReg.On("RemoveStreamFromSubscription", "test-sync-1", streamID).Return(false)
		},
	}

	err := sub.Modify(context.Background(), req)
	assert.NoError(t, err)

	mockSyncer.AssertExpectations(t)
	mockReg.AssertExpectations(t)
}

func TestSubscription_Modify_BackfillFailureHandler(t *testing.T) {
	// Test that the backfill failure handler properly routes failures
	mockSyncer := &MockSyncerSet{}
	mockReg := &mockRegistry{}
	sub := createTestSubscription("test-sync-1")
	sub.syncers = mockSyncer
	sub.registry = mockReg

	streamID := testutils.FakeStreamId(STREAM_CHANNEL_BIN)

	// Setup mocks
	mockReg.On("AddStreamToSubscription", "test-sync-1", streamID).Return(false, true)
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
	mockReg.AssertExpectations(t)
}
