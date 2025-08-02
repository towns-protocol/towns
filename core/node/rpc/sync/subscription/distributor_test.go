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
		name     string
		setup    func() (*distributor, Registry)
		streamID StreamId
		msg      *SyncStreamsResponse
		verify   func(t *testing.T, reg Registry, streamID StreamId)
	}{
		{
			name: "distribute message to single subscription",
			setup: func() (*distributor, Registry) {
				reg := newRegistry()
				sub := createTestSubscription("test-sync-1")
				sub.registry = reg // Use shared registry
				reg.AddSubscription(sub)
				reg.AddStreamToSubscription("test-sync-1", StreamId{1, 2, 3, 4})
				dis := newDistributor(reg, nil)
				return dis, reg
			},
			streamID: StreamId{1, 2, 3, 4},
			msg: &SyncStreamsResponse{
				SyncOp:   SyncOp_SYNC_UPDATE,
				StreamId: []byte{1, 2, 3, 4},
			},
			verify: func(t *testing.T, reg Registry, streamID StreamId) {
				subs := reg.GetSubscriptionsForStream(streamID)
				assert.Len(t, subs, 1)
				// Verify message was sent to subscription
				assert.Equal(t, 1, subs[0].Messages.Len())
			},
		},
		{
			name: "distribute message to multiple subscriptions",
			setup: func() (*distributor, Registry) {
				reg := newRegistry()
				sub1 := createTestSubscription("test-sync-1")
				sub1.registry = reg // Use shared registry
				sub2 := createTestSubscription("test-sync-2")
				sub2.registry = reg // Use shared registry
				reg.AddSubscription(sub1)
				reg.AddSubscription(sub2)
				// Add both subscriptions at once to avoid backfill marking
				// We need a fresh registry for each test
				reg.AddStreamToSubscription("test-sync-1", StreamId{1, 2, 3, 4})
				reg.AddStreamToSubscription("test-sync-2", StreamId{1, 2, 3, 4})
				// Clear the initializing flag for sub2 since we're testing regular message distribution
				sub2.initializingStreams.Delete(StreamId{1, 2, 3, 4})
				dis := newDistributor(reg, nil)
				return dis, reg
			},
			streamID: StreamId{1, 2, 3, 4},
			msg: &SyncStreamsResponse{
				SyncOp:   SyncOp_SYNC_UPDATE,
				StreamId: []byte{1, 2, 3, 4},
			},
			verify: func(t *testing.T, reg Registry, streamID StreamId) {
				subs := reg.GetSubscriptionsForStream(streamID)
				assert.Len(t, subs, 2)
				// Verify message was sent to both subscriptions
				sub1, exists1 := reg.GetSubscriptionByID("test-sync-1")
				sub2, exists2 := reg.GetSubscriptionByID("test-sync-2")
				assert.True(t, exists1)
				assert.True(t, exists2)
				t.Logf("Sub1 closed: %v, Sub2 closed: %v", sub1.isClosed(), sub2.isClosed())

				// Check if stream is marked as initializing
				_, initializing1 := sub1.initializingStreams.Load(streamID)
				_, initializing2 := sub2.initializingStreams.Load(streamID)
				t.Logf("Sub1 initializing: %v, Sub2 initializing: %v", initializing1, initializing2)

				t.Logf("Sub1 messages: %d, Sub2 messages: %d", sub1.Messages.Len(), sub2.Messages.Len())
				assert.Equal(t, 1, sub1.Messages.Len())
				assert.Equal(t, 1, sub2.Messages.Len())
			},
		},
		{
			name: "distribute SYNC_DOWN message - should distribute to all subscriptions",
			setup: func() (*distributor, Registry) {
				reg := newRegistry()
				sub1 := createTestSubscription("test-sync-1")
				sub1.registry = reg // Use shared registry
				sub2 := createTestSubscription("test-sync-2")
				sub2.registry = reg // Use shared registry
				reg.AddSubscription(sub1)
				reg.AddSubscription(sub2)
				reg.AddStreamToSubscription("test-sync-1", StreamId{1, 2, 3, 4})
				reg.AddStreamToSubscription("test-sync-2", StreamId{1, 2, 3, 4})
				dis := newDistributor(reg, nil)
				return dis, reg
			},
			streamID: StreamId{1, 2, 3, 4},
			msg: &SyncStreamsResponse{
				SyncOp:   SyncOp_SYNC_DOWN,
				StreamId: []byte{1, 2, 3, 4},
			},
			verify: func(t *testing.T, reg Registry, streamID StreamId) {
				// After SYNC_DOWN, the message should be distributed to all subscriptions
				// The stream removal is now handled by the syncer set's unsubStream callback
				subs := reg.GetSubscriptionsForStream(streamID)
				assert.Len(t, subs, 2) // Subscriptions should still exist

				// Verify both subscriptions received the SYNC_DOWN message
				sub1, exists1 := reg.GetSubscriptionByID("test-sync-1")
				sub2, exists2 := reg.GetSubscriptionByID("test-sync-2")
				assert.True(t, exists1)
				assert.True(t, exists2)

				// Check that SYNC_DOWN messages were sent
				assert.Equal(t, 1, sub1.Messages.Len())
				assert.Equal(t, 1, sub2.Messages.Len())

				msg1 := sub1.Messages.GetBatch(nil)[0]
				msg2 := sub2.Messages.GetBatch(nil)[0]
				assert.Equal(t, SyncOp_SYNC_DOWN, msg1.GetSyncOp())
				assert.Equal(t, SyncOp_SYNC_DOWN, msg2.GetSyncOp())
			},
		},
		{
			name: "no subscriptions for stream",
			setup: func() (*distributor, Registry) {
				reg := newRegistry()
				dis := newDistributor(reg, nil)
				return dis, reg
			},
			streamID: StreamId{1, 2, 3, 4},
			msg: &SyncStreamsResponse{
				SyncOp:   SyncOp_SYNC_UPDATE,
				StreamId: []byte{1, 2, 3, 4},
			},
			verify: func(t *testing.T, reg Registry, streamID StreamId) {
				subs := reg.GetSubscriptionsForStream(streamID)
				assert.Len(t, subs, 0)
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			dis, reg := tt.setup()
			dis.DistributeMessage(tt.streamID, tt.msg)
			// Wait for goroutines to complete
			time.Sleep(50 * time.Millisecond)
			if tt.verify != nil {
				tt.verify(t, reg, tt.streamID)
			}
		})
	}
}

func TestDistributor_DistributeBackfillMessage(t *testing.T) {
	tests := []struct {
		name     string
		setup    func() (*distributor, Registry)
		streamID StreamId
		msg      *SyncStreamsResponse
		verify   func(t *testing.T, reg Registry)
	}{
		{
			name: "distribute backfill message to existing subscription",
			setup: func() (*distributor, Registry) {
				reg := newRegistry()
				sub := createTestSubscription("test-sync-1")
				sub.registry = reg // Use shared registry
				reg.AddSubscription(sub)
				dis := newDistributor(reg, nil)
				return dis, reg
			},
			streamID: StreamId{1, 2, 3, 4},
			msg: &SyncStreamsResponse{
				SyncOp:        SyncOp_SYNC_UPDATE,
				StreamId:      []byte{1, 2, 3, 4},
				TargetSyncIds: []string{"test-sync-1"},
			},
			verify: func(t *testing.T, reg Registry) {
				sub, exists := reg.GetSubscriptionByID("test-sync-1")
				assert.True(t, exists)
				assert.Equal(t, 1, sub.Messages.Len())
			},
		},
		{
			name: "distribute backfill message to non-existent subscription",
			setup: func() (*distributor, Registry) {
				reg := newRegistry()
				dis := newDistributor(reg, nil)
				return dis, reg
			},
			streamID: StreamId{1, 2, 3, 4},
			msg: &SyncStreamsResponse{
				SyncOp:        SyncOp_SYNC_UPDATE,
				StreamId:      []byte{1, 2, 3, 4},
				TargetSyncIds: []string{"non-existent"},
			},
			verify: func(t *testing.T, reg Registry) {
				_, exists := reg.GetSubscriptionByID("non-existent")
				assert.False(t, exists)
			},
		},
		{
			name: "distribute backfill message to closed subscription",
			setup: func() (*distributor, Registry) {
				reg := newRegistry()
				sub := createTestSubscription("test-sync-1")
				sub.registry = reg // Use shared registry
				sub.Close()        // Mark as closed
				reg.AddSubscription(sub)
				dis := newDistributor(reg, nil)
				return dis, reg
			},
			streamID: StreamId{1, 2, 3, 4},
			msg: &SyncStreamsResponse{
				SyncOp:        SyncOp_SYNC_UPDATE,
				StreamId:      []byte{1, 2, 3, 4},
				TargetSyncIds: []string{"test-sync-1"},
			},
			verify: func(t *testing.T, reg Registry) {
				sub, exists := reg.GetSubscriptionByID("test-sync-1")
				assert.True(t, exists)
				// Closed subscription should not receive messages
				assert.Equal(t, 0, sub.Messages.Len())
			},
		},
		{
			name: "distribute backfill message with no target sync IDs",
			setup: func() (*distributor, Registry) {
				reg := newRegistry()
				dis := newDistributor(reg, nil)
				return dis, reg
			},
			streamID: StreamId{1, 2, 3, 4},
			msg: &SyncStreamsResponse{
				SyncOp:        SyncOp_SYNC_UPDATE,
				StreamId:      []byte{1, 2, 3, 4},
				TargetSyncIds: []string{},
			},
			verify: func(t *testing.T, reg Registry) {
				// Nothing to verify
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			dis, reg := tt.setup()
			dis.DistributeBackfillMessage(tt.streamID, tt.msg)
			if tt.verify != nil {
				tt.verify(t, reg)
			}
		})
	}
}

func TestDistributor_SendMessageToSubscription(t *testing.T) {
	tests := []struct {
		name     string
		setup    func() (*distributor, *Subscription)
		streamID StreamId
		msg      *SyncStreamsResponse
		verify   func(t *testing.T, sub *Subscription)
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
		name                   string
		setup                  func() (*distributor, Registry, *Subscription)
		streamID               StreamId
		backfillMsg            *SyncStreamsResponse
		regularMsg             *SyncStreamsResponse
		expectedEventCount     int
		expectedMiniblockCount int
	}{
		{
			name: "filter duplicate events from backfill",
			setup: func() (*distributor, Registry, *Subscription) {
				reg := newRegistry()
				dis := newDistributor(reg, nil)
				sub := createTestSubscription("test-sync-1")
				sub.registry = reg // Use shared registry
				// Mark stream as initializing for backfill
				sub.initializingStreams.Store(StreamId{1, 2, 3, 4}, struct{}{})
				reg.AddSubscription(sub)
				reg.AddStreamToSubscription("test-sync-1", StreamId{1, 2, 3, 4})
				return dis, reg, sub
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
		{
			name: "filter duplicate events and miniblocks from backfill",
			setup: func() (*distributor, Registry, *Subscription) {
				reg := newRegistry()
				dis := newDistributor(reg, nil)
				sub := createTestSubscription("test-sync-2")
				// Mark stream as initializing for backfill
				sub.initializingStreams.Store(StreamId{5, 6, 7, 8}, struct{}{})
				reg.AddSubscription(sub)
				reg.AddStreamToSubscription("test-sync-2", StreamId{5, 6, 7, 8})
				return dis, reg, sub
			},
			streamID: StreamId{5, 6, 7, 8},
			backfillMsg: &SyncStreamsResponse{
				SyncOp:        SyncOp_SYNC_UPDATE,
				StreamId:      []byte{5, 6, 7, 8},
				TargetSyncIds: []string{"test-sync-2"},
				Stream: &StreamAndCookie{
					Events: []*Envelope{
						{Hash: common.Hash{10}.Bytes()},
						{Hash: common.Hash{11}.Bytes()},
					},
					Miniblocks: []*Miniblock{
						{Header: &Envelope{Hash: common.Hash{20}.Bytes()}},
						{Header: &Envelope{Hash: common.Hash{21}.Bytes()}},
					},
				},
			},
			regularMsg: &SyncStreamsResponse{
				SyncOp:   SyncOp_SYNC_UPDATE,
				StreamId: []byte{5, 6, 7, 8},
				Stream: &StreamAndCookie{
					Events: []*Envelope{
						{Hash: common.Hash{10}.Bytes()}, // Duplicate from backfill
						{Hash: common.Hash{12}.Bytes()}, // New event
					},
					Miniblocks: []*Miniblock{
						{Header: &Envelope{Hash: common.Hash{20}.Bytes()}}, // Duplicate from backfill
						{Header: &Envelope{Hash: common.Hash{22}.Bytes()}}, // New miniblock
					},
				},
			},
			expectedEventCount:     1, // Only the new event
			expectedMiniblockCount: 1, // Only the new miniblock
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			dis, reg, sub := tt.setup()

			// Send backfill message
			dis.DistributeBackfillMessage(tt.streamID, tt.backfillMsg)

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
				// For test case 1: Verify it's the new event (hash{3})
				// For test case 2: Verify it's the new event (hash{12})
				if tt.streamID == (StreamId{1, 2, 3, 4}) {
					assert.Equal(t, common.Hash{3}.Bytes(), regularMsgReceived.Stream.Events[0].Hash)
				} else if tt.streamID == (StreamId{5, 6, 7, 8}) {
					assert.Equal(t, common.Hash{12}.Bytes(), regularMsgReceived.Stream.Events[0].Hash)
				}
			}

			// Check miniblocks if expected
			if tt.expectedMiniblockCount > 0 {
				assert.Equal(t, tt.expectedMiniblockCount, len(regularMsgReceived.Stream.Miniblocks))
				// Verify it's the new miniblock (hash{22})
				assert.Equal(t, common.Hash{22}.Bytes(), regularMsgReceived.Stream.Miniblocks[0].Header.Hash)
			}

			// Verify registry state
			subs := reg.GetSubscriptionsForStream(tt.streamID)
			assert.Len(t, subs, 1)
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
			for _, expectedHash := range tt.expectedHashes {
				_, exists := hashes[expectedHash]
				assert.True(t, exists, "Expected hash %v not found in map", expectedHash)
			}
		})
	}
}
