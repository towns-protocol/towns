package subscription

import (
	"slices"
	"sync"

	. "github.com/towns-protocol/towns/core/node/shared"
)

// Registry defines the contract for managing subscription lifecycle
type Registry interface {
	AddSubscription(sub *Subscription)
	RemoveSubscription(syncID string)
	GetSubscriptionsForStream(streamID StreamId) []*Subscription
	GetSubscriptionByID(syncID string) (*Subscription, bool)
	AddStreamToSubscription(syncID string, streamID StreamId) (shouldAddToRemote bool, shouldBackfill bool)
	RemoveStreamFromSubscription(syncID string, streamID StreamId) (shouldRemoveFromRemote bool)
	GetStats() (streamCount, subscriptionCount int)
	CancelAll(err error)
}

// registry implements SubscriptionRegistry for managing subscription lifecycle
type registry struct {
	// sLock is the mutex that protects the subscriptions maps
	sLock sync.RWMutex
	// subscriptionsByStream is a map of stream IDs to subscriptions
	subscriptionsByStream map[StreamId][]*Subscription
	// subscriptionsByID is a map of sync IDs to subscriptions for fast lookup
	subscriptionsByID map[string]*Subscription
}

// newRegistry creates a new subscription registry
func newRegistry() *registry {
	return &registry{
		subscriptionsByStream: make(map[StreamId][]*Subscription),
		subscriptionsByID:     make(map[string]*Subscription),
	}
}

// AddSubscription adds a subscription to the registry
func (r *registry) AddSubscription(sub *Subscription) {
	r.sLock.Lock()
	r.subscriptionsByID[sub.syncID] = sub
	r.sLock.Unlock()
}

// RemoveSubscription removes a subscription from the registry
func (r *registry) RemoveSubscription(syncID string) {
	r.sLock.Lock()

	delete(r.subscriptionsByID, syncID)

	// Remove from all stream mappings
	for streamID, subs := range r.subscriptionsByStream {
		r.subscriptionsByStream[streamID] = slices.DeleteFunc(subs, func(s *Subscription) bool {
			return s.syncID == syncID
		})
		if len(r.subscriptionsByStream[streamID]) == 0 {
			delete(r.subscriptionsByStream, streamID)
		}
	}

	r.sLock.Unlock()
}

// GetSubscriptionsForStream returns all subscriptions for a given stream
func (r *registry) GetSubscriptionsForStream(streamID StreamId) []*Subscription {
	r.sLock.RLock()
	defer r.sLock.RUnlock()

	return slices.Clone(r.subscriptionsByStream[streamID])
}

// GetSubscriptionByID returns a subscription by its sync ID
func (r *registry) GetSubscriptionByID(syncID string) (*Subscription, bool) {
	r.sLock.RLock()
	sub, ok := r.subscriptionsByID[syncID]
	r.sLock.RUnlock()
	return sub, ok
}

// AddStreamToSubscription adds a stream to a subscription
// Returns true if the given stream must be added to the main syncer set
func (r *registry) AddStreamToSubscription(syncID string, streamID StreamId) (shouldAddToRemote bool, shouldBackfill bool) {
	r.sLock.Lock()
	defer r.sLock.Unlock()

	sub, exists := r.subscriptionsByID[syncID]
	if !exists {
		return false, false
	}

	subscriptions, ok := r.subscriptionsByStream[streamID]
	if !ok || len(subscriptions) == 0 {
		shouldAddToRemote = true
		r.subscriptionsByStream[streamID] = []*Subscription{sub}
	} else {
		if !slices.ContainsFunc(subscriptions, func(s *Subscription) bool {
			return s.syncID == syncID
		}) {
			shouldBackfill = true
			sub.initializingStreams.Store(streamID, struct{}{})
			r.subscriptionsByStream[streamID] = append(r.subscriptionsByStream[streamID], sub)
		}
	}
	return
}

// RemoveStreamFromSubscription removes a stream from a subscription
// Returns true if the given stream must be removed from the main syncer set
func (r *registry) RemoveStreamFromSubscription(syncID string, streamID StreamId) (shouldRemoveFromRemote bool) {
	r.sLock.Lock()
	r.subscriptionsByStream[streamID] = slices.DeleteFunc(
		r.subscriptionsByStream[streamID],
		func(sub *Subscription) bool {
			return sub.syncID == syncID
		},
	)

	if shouldRemoveFromRemote = len(r.subscriptionsByStream[streamID]) == 0; shouldRemoveFromRemote {
		delete(r.subscriptionsByStream, streamID)
	}
	r.sLock.Unlock()
	return
}

// GetStats returns statistics about the registry
func (r *registry) GetStats() (streamCount, subscriptionCount int) {
	r.sLock.RLock()
	defer r.sLock.RUnlock()

	return len(r.subscriptionsByStream), len(r.subscriptionsByID)
}

// CancelAll cancels all subscriptions with the given error.
func (r *registry) CancelAll(err error) {
	r.sLock.Lock()
	for _, sub := range r.subscriptionsByID {
		if !sub.isClosed() {
			sub.cancel(err)
		}
	}
	r.subscriptionsByID = make(map[string]*Subscription)
	r.subscriptionsByStream = make(map[StreamId][]*Subscription)
	r.sLock.Unlock()
}
