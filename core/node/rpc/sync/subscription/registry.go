package subscription

import (
	"slices"

	"github.com/puzpuzpuz/xsync/v4"
	. "github.com/towns-protocol/towns/core/node/shared"
)

// Registry defines the contract for managing subscription lifecycle
type Registry interface {
	AddSubscription(sub *Subscription)
	RemoveSubscription(syncID string)
	GetSubscriptionsForStream(streamID StreamId) []*Subscription
	GetSubscriptionByID(syncID string) (*Subscription, bool)
	AddStreamToSubscription(syncID string, streamID StreamId) (shouldAddToRemote bool, shouldBackfill bool)
	RemoveStreamFromSubscription(syncID string, streamID StreamId)
	OnStreamDown(streamID StreamId)
	CleanupUnusedStreams(func(streamIds [][]byte))
	GetStats() (streamCount, subscriptionCount int)
	CancelAll(err error)
}

// registry implements SubscriptionRegistry for managing subscription lifecycle
type registry struct {
	// subscriptionsByStream is a map of stream IDs to subscriptions
	subscriptionsByStream *xsync.Map[StreamId, []*Subscription]
	// subscriptionsByID is a map of sync IDs to subscriptions for fast lookup
	subscriptionsByID *xsync.Map[string, *Subscription]
}

// newRegistry creates a new subscription registry
func newRegistry() *registry {
	return &registry{
		subscriptionsByStream: xsync.NewMap[StreamId, []*Subscription](),
		subscriptionsByID:     xsync.NewMap[string, *Subscription](),
	}
}

// AddSubscription adds a subscription to the registry
func (r *registry) AddSubscription(sub *Subscription) {
	r.subscriptionsByID.Store(sub.syncID, sub)
}

// RemoveSubscription removes a subscription from the registry
func (r *registry) RemoveSubscription(syncID string) {
	r.subscriptionsByID.Delete(syncID)

	// Remove from all stream mappings
	r.subscriptionsByStream.Range(func(streamID StreamId, subs []*Subscription) bool {
		r.subscriptionsByStream.Compute(
			streamID,
			func(oldValue []*Subscription, loaded bool) (newValue []*Subscription, op xsync.ComputeOp) {
				if !loaded {
					return nil, xsync.CancelOp
				}
				// Create a copy of the slice before modifying to prevent race conditions
				copied := slices.Clone(oldValue)
				newValue = slices.DeleteFunc(copied, func(sub *Subscription) bool {
					return sub.syncID == syncID
				})
				if len(newValue) == len(oldValue) {
					return oldValue, xsync.CancelOp
				}
				return newValue, xsync.UpdateOp
			},
		)
		return true
	})
}

// GetSubscriptionsForStream returns all subscriptions for a given stream
func (r *registry) GetSubscriptionsForStream(streamID StreamId) []*Subscription {
	if subs, ok := r.subscriptionsByStream.Load(streamID); ok {
		return slices.Clone(subs)
	}
	return nil
}

// GetSubscriptionByID returns a subscription by its sync ID
func (r *registry) GetSubscriptionByID(syncID string) (*Subscription, bool) {
	return r.subscriptionsByID.Load(syncID)
}

// AddStreamToSubscription adds a stream to a subscription
// Returns true if the given stream must be added to the main syncer set
func (r *registry) AddStreamToSubscription(syncID string, streamID StreamId) (shouldAddToRemote bool, shouldBackfill bool) {
	sub, exists := r.subscriptionsByID.Load(syncID)
	if !exists {
		return false, false
	}

	r.subscriptionsByStream.Compute(
		streamID,
		func(oldValue []*Subscription, loaded bool) (newValue []*Subscription, op xsync.ComputeOp) {
			if !loaded {
				shouldAddToRemote = true
				return []*Subscription{sub}, xsync.UpdateOp
			}

			// Check if subscription already exists
			if !slices.ContainsFunc(oldValue, func(s *Subscription) bool {
				return s.syncID == syncID
			}) {
				shouldBackfill = true
				sub.initializingStreams.Store(streamID, struct{}{})
				newValue = append(slices.Clone(oldValue), sub)
				return newValue, xsync.UpdateOp
			}

			// Subscription already exists, no change needed
			return oldValue, xsync.CancelOp
		},
	)

	return
}

// RemoveStreamFromSubscription removes a stream from a subscription
// Returns true if the given stream must be removed from the main syncer set
func (r *registry) RemoveStreamFromSubscription(syncID string, streamID StreamId) {
	r.subscriptionsByStream.Compute(
		streamID,
		func(oldValue []*Subscription, loaded bool) (newValue []*Subscription, op xsync.ComputeOp) {
			// Create a copy of the slice before modifying to prevent race conditions
			copied := slices.Clone(oldValue)
			newValue = slices.DeleteFunc(copied, func(sub *Subscription) bool {
				return sub.syncID == syncID
			})
			if len(newValue) == len(oldValue) {
				// No change, keep the old value
				return oldValue, xsync.CancelOp
			}
			return newValue, xsync.UpdateOp
		},
	)
}

// OnStreamDown is called when a stream goes down
func (r *registry) OnStreamDown(streamID StreamId) {
	r.subscriptionsByStream.Delete(streamID)
}

// GetStats returns statistics about the registry
func (r *registry) GetStats() (streamCount, subscriptionCount int) {
	streamCount = r.subscriptionsByStream.Size()
	subscriptionCount = r.subscriptionsByID.Size()
	return
}

// CancelAll cancels all subscriptions with the given error.
func (r *registry) CancelAll(err error) {
	r.subscriptionsByID.Range(func(syncID string, sub *Subscription) bool {
		if !sub.isClosed() {
			sub.cancel(err)
		}
		return true
	})
	r.subscriptionsByID.Clear()
	r.subscriptionsByStream.Clear()
}

// CleanupUnusedStreams removes unused streams from the syncer set.
func (r *registry) CleanupUnusedStreams(cb func(streamIds [][]byte)) {
	streamIds := make([][]byte, 0)
	r.subscriptionsByStream.Range(func(streamID StreamId, subs []*Subscription) bool {
		if len(subs) == 0 {
			streamIds = append(streamIds, streamID[:])
		}
		return true
	})
	if len(streamIds) > 0 {
		if cb != nil {
			// cb(streamIds)
		}
		for _, streamID := range streamIds {
			r.subscriptionsByStream.Delete(StreamId(streamID))
		}
	}
}
