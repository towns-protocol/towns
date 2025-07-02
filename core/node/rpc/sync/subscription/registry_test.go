package subscription

import (
	"testing"

	"github.com/stretchr/testify/assert"
	. "github.com/towns-protocol/towns/core/node/shared"
)

func TestRegistry_AddSubscription(t *testing.T) {
	tests := []struct {
		name  string
		setup func(t *testing.T) (*registry, *Subscription)
	}{
		{
			name: "successfully add subscription",
			setup: func(t *testing.T) (*registry, *Subscription) {
				reg := newRegistry()
				sub := createTestSubscription("test-sync-1")
				return reg, sub
			},
		},
		{
			name: "add multiple subscriptions",
			setup: func(t *testing.T) (*registry, *Subscription) {
				reg := newRegistry()
				reg.AddSubscription(createTestSubscription("test-sync-1"))
				sub := createTestSubscription("test-sync-2")
				return reg, sub
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			reg, sub := tt.setup(t)

			reg.AddSubscription(sub)

			// Verify subscription was added
			retrieved, exists := reg.GetSubscriptionByID(sub.syncID)
			assert.True(t, exists)
			assert.Equal(t, sub, retrieved)
		})
	}
}

func TestRegistry_RemoveSubscription(t *testing.T) {
	tests := []struct {
		name           string
		setup          func(t *testing.T) *registry
		syncIDToRemove string
		verifyRemoved  bool
	}{
		{
			name: "successfully remove existing subscription",
			setup: func(t *testing.T) *registry {
				reg := newRegistry()
				reg.AddSubscription(createTestSubscription("test-sync-1"))
				return reg
			},
			syncIDToRemove: "test-sync-1",
			verifyRemoved:  true,
		},
		{
			name: "remove non-existent subscription",
			setup: func(t *testing.T) *registry {
				reg := newRegistry()
				reg.AddSubscription(createTestSubscription("test-sync-1"))
				return reg
			},
			syncIDToRemove: "non-existent",
			verifyRemoved:  false,
		},
		{
			name: "remove subscription with streams",
			setup: func(t *testing.T) *registry {
				reg := newRegistry()
				sub := createTestSubscription("test-sync-1")
				reg.AddSubscription(sub)
				reg.AddStreamToSubscription("test-sync-1", StreamId{1, 2, 3, 4})
				return reg
			},
			syncIDToRemove: "test-sync-1",
			verifyRemoved:  true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			reg := tt.setup(t)

			reg.RemoveSubscription(tt.syncIDToRemove)

			if tt.verifyRemoved {
				// Verify subscription was removed
				_, exists := reg.GetSubscriptionByID(tt.syncIDToRemove)
				assert.False(t, exists)

				// Verify no streams remain for this subscription
				streamCount, _ := reg.GetStats()
				assert.Equal(t, 0, streamCount)
			}
		})
	}
}

func TestRegistry_GetSubscriptionsForStream(t *testing.T) {
	tests := []struct {
		name            string
		setup           func(t *testing.T) (*registry, StreamId)
		expectedCount   int
		expectedSyncIDs []string
	}{
		{
			name: "get subscriptions for stream with one subscription",
			setup: func(t *testing.T) (*registry, StreamId) {
				reg := newRegistry()
				streamID := StreamId{1, 2, 3, 4}
				sub := createTestSubscription("test-sync-1")
				reg.AddSubscription(sub)
				reg.AddStreamToSubscription("test-sync-1", streamID)
				return reg, streamID
			},
			expectedCount:   1,
			expectedSyncIDs: []string{"test-sync-1"},
		},
		{
			name: "get subscriptions for stream with multiple subscriptions",
			setup: func(t *testing.T) (*registry, StreamId) {
				reg := newRegistry()
				streamID := StreamId{1, 2, 3, 4}

				sub1 := createTestSubscription("test-sync-1")
				sub2 := createTestSubscription("test-sync-2")

				reg.AddSubscription(sub1)
				reg.AddSubscription(sub2)
				reg.AddStreamToSubscription("test-sync-1", streamID)
				reg.AddStreamToSubscription("test-sync-2", streamID)

				return reg, streamID
			},
			expectedCount:   2,
			expectedSyncIDs: []string{"test-sync-1", "test-sync-2"},
		},
		{
			name: "get subscriptions for non-existent stream",
			setup: func(t *testing.T) (*registry, StreamId) {
				reg := newRegistry()
				return reg, StreamId{9, 9, 9, 9}
			},
			expectedCount:   0,
			expectedSyncIDs: []string{},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			reg, streamID := tt.setup(t)

			subscriptions := reg.GetSubscriptionsForStream(streamID)

			assert.Len(t, subscriptions, tt.expectedCount)

			// Verify expected sync IDs
			foundSyncIDs := make([]string, 0, len(subscriptions))
			for _, sub := range subscriptions {
				foundSyncIDs = append(foundSyncIDs, sub.syncID)
			}

			for _, expectedSyncID := range tt.expectedSyncIDs {
				assert.Contains(t, foundSyncIDs, expectedSyncID)
			}
		})
	}
}

func TestRegistry_GetSubscriptionByID(t *testing.T) {
	tests := []struct {
		name           string
		setup          func(t *testing.T) *registry
		syncID         string
		expectExists   bool
		expectedSyncID string
	}{
		{
			name: "get existing subscription",
			setup: func(t *testing.T) *registry {
				reg := newRegistry()
				reg.AddSubscription(createTestSubscription("test-sync-1"))
				return reg
			},
			syncID:         "test-sync-1",
			expectExists:   true,
			expectedSyncID: "test-sync-1",
		},
		{
			name: "get non-existent subscription",
			setup: func(t *testing.T) *registry {
				reg := newRegistry()
				reg.AddSubscription(createTestSubscription("test-sync-1"))
				return reg
			},
			syncID:         "non-existent",
			expectExists:   false,
			expectedSyncID: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			reg := tt.setup(t)

			sub, exists := reg.GetSubscriptionByID(tt.syncID)

			assert.Equal(t, tt.expectExists, exists)
			if tt.expectExists {
				assert.NotNil(t, sub)
				assert.Equal(t, tt.expectedSyncID, sub.syncID)
			} else {
				assert.Nil(t, sub)
			}
		})
	}
}

func TestRegistry_AddStreamToSubscription(t *testing.T) {
	tests := []struct {
		name              string
		setup             func(t *testing.T) *registry
		syncID            string
		streamID          StreamId
		expectAddToRemote bool
		expectBackfill    bool
	}{
		{
			name: "add stream to new subscription - should add to remote",
			setup: func(t *testing.T) *registry {
				reg := newRegistry()
				reg.AddSubscription(createTestSubscription("test-sync-1"))
				return reg
			},
			syncID:            "test-sync-1",
			streamID:          StreamId{1, 2, 3, 4},
			expectAddToRemote: true,
			expectBackfill:    false,
		},
		{
			name: "add stream to existing subscription - should backfill",
			setup: func(t *testing.T) *registry {
				reg := newRegistry()
				reg.AddSubscription(createTestSubscription("test-sync-1"))
				reg.AddSubscription(createTestSubscription("test-sync-2"))
				reg.AddStreamToSubscription("test-sync-1", StreamId{1, 2, 3, 4})
				return reg
			},
			syncID:            "test-sync-2",
			streamID:          StreamId{1, 2, 3, 4},
			expectAddToRemote: false,
			expectBackfill:    true,
		},
		{
			name: "add stream to non-existent subscription",
			setup: func(t *testing.T) *registry {
				reg := newRegistry()
				return reg
			},
			syncID:            "non-existent",
			streamID:          StreamId{1, 2, 3, 4},
			expectAddToRemote: false,
			expectBackfill:    false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			reg := tt.setup(t)

			shouldAddToRemote, shouldBackfill := reg.AddStreamToSubscription(tt.syncID, tt.streamID)

			assert.Equal(t, tt.expectAddToRemote, shouldAddToRemote)
			assert.Equal(t, tt.expectBackfill, shouldBackfill)

			// Verify stream was added to subscription
			subscriptions := reg.GetSubscriptionsForStream(tt.streamID)
			if tt.expectAddToRemote || tt.expectBackfill {
				if tt.expectAddToRemote {
					// When adding to remote, only the new subscription should be present
					assert.Len(t, subscriptions, 1)
					assert.Equal(t, tt.syncID, subscriptions[0].syncID)
				} else {
					// When backfilling, both subscriptions should be present
					assert.Len(t, subscriptions, 2)
					// Check that the new subscription is among them
					found := false
					for _, sub := range subscriptions {
						if sub.syncID == tt.syncID {
							found = true
							break
						}
					}
					assert.True(t, found, "New subscription should be present in stream subscriptions")
				}
			}
		})
	}
}

func TestRegistry_RemoveStreamFromSubscription(t *testing.T) {
	tests := []struct {
		name                   string
		setup                  func(t *testing.T) *registry
		syncID                 string
		streamID               StreamId
		expectRemoveFromRemote bool
	}{
		{
			name: "remove stream from subscription with multiple subscriptions",
			setup: func(t *testing.T) *registry {
				reg := newRegistry()
				reg.AddSubscription(createTestSubscription("test-sync-1"))
				reg.AddSubscription(createTestSubscription("test-sync-2"))
				reg.AddStreamToSubscription("test-sync-1", StreamId{1, 2, 3, 4})
				reg.AddStreamToSubscription("test-sync-2", StreamId{1, 2, 3, 4})
				return reg
			},
			syncID:                 "test-sync-1",
			streamID:               StreamId{1, 2, 3, 4},
			expectRemoveFromRemote: false, // Other subscription still has this stream
		},
		{
			name: "remove stream from last subscription - should remove from remote",
			setup: func(t *testing.T) *registry {
				reg := newRegistry()
				reg.AddSubscription(createTestSubscription("test-sync-1"))
				reg.AddStreamToSubscription("test-sync-1", StreamId{1, 2, 3, 4})
				return reg
			},
			syncID:                 "test-sync-1",
			streamID:               StreamId{1, 2, 3, 4},
			expectRemoveFromRemote: true, // No more subscriptions for this stream
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			reg := tt.setup(t)

			shouldRemoveFromRemote := reg.RemoveStreamFromSubscription(tt.syncID, tt.streamID)

			assert.Equal(t, tt.expectRemoveFromRemote, shouldRemoveFromRemote)

			// Verify stream was removed from subscription
			subscriptions := reg.GetSubscriptionsForStream(tt.streamID)
			if tt.expectRemoveFromRemote {
				assert.Len(t, subscriptions, 0)
			} else {
				// Should still have other subscriptions
				assert.Greater(t, len(subscriptions), 0)
			}
		})
	}
}

func TestRegistry_GetStats(t *testing.T) {
	tests := []struct {
		name                string
		setup               func(t *testing.T) *registry
		expectedStreamCount int
		expectedSubCount    int
	}{
		{
			name: "empty registry",
			setup: func(t *testing.T) *registry {
				return newRegistry()
			},
			expectedStreamCount: 0,
			expectedSubCount:    0,
		},
		{
			name: "registry with subscriptions but no streams",
			setup: func(t *testing.T) *registry {
				reg := newRegistry()
				reg.AddSubscription(createTestSubscription("test-sync-1"))
				reg.AddSubscription(createTestSubscription("test-sync-2"))
				return reg
			},
			expectedStreamCount: 0,
			expectedSubCount:    2,
		},
		{
			name: "registry with subscriptions and streams",
			setup: func(t *testing.T) *registry {
				reg := newRegistry()
				reg.AddSubscription(createTestSubscription("test-sync-1"))
				reg.AddSubscription(createTestSubscription("test-sync-2"))
				reg.AddStreamToSubscription("test-sync-1", StreamId{1, 2, 3, 4})
				reg.AddStreamToSubscription("test-sync-2", StreamId{5, 6, 7, 8})
				return reg
			},
			expectedStreamCount: 2,
			expectedSubCount:    2,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			reg := tt.setup(t)

			streamCount, subCount := reg.GetStats()

			assert.Equal(t, tt.expectedStreamCount, streamCount)
			assert.Equal(t, tt.expectedSubCount, subCount)
		})
	}
}

func TestRegistry_CancelAll(t *testing.T) {
	t.Run("cancel all subscriptions", func(t *testing.T) {
		reg := newRegistry()

		// Add some subscriptions
		sub1 := createTestSubscription("test-sync-1")
		sub2 := createTestSubscription("test-sync-2")

		reg.AddSubscription(sub1)
		reg.AddSubscription(sub2)
		reg.AddStreamToSubscription("test-sync-1", StreamId{1, 2, 3, 4})
		reg.AddStreamToSubscription("test-sync-2", StreamId{5, 6, 7, 8})

		// Verify initial state
		streamCount, subCount := reg.GetStats()
		assert.Equal(t, 2, streamCount)
		assert.Equal(t, 2, subCount)

		// Cancel all
		reg.CancelAll(nil)

		// Verify all subscriptions were removed
		streamCount, subCount = reg.GetStats()
		assert.Equal(t, 0, streamCount)
		assert.Equal(t, 0, subCount)

		// Verify subscriptions are no longer accessible
		_, exists := reg.GetSubscriptionByID("test-sync-1")
		assert.False(t, exists)

		_, exists = reg.GetSubscriptionByID("test-sync-2")
		assert.False(t, exists)
	})
}
