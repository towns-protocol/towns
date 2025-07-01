package subscription

import (
	"slices"
	"sync"

	. "github.com/towns-protocol/towns/core/node/shared"
)

type registry struct {
	// sLock is the mutex that protects the subscriptions map
	sLock sync.Mutex
	// subscriptions is a map of stream IDs to subscriptions.
	subscriptions map[StreamId][]*Subscription
}

func newRegistry() *registry {
	return &registry{
		subscriptions: make(map[StreamId][]*Subscription),
	}
}

// addStream adds the given stream to the current subscription.
// Returns true if the given stream must be added to the main syncer set.
func (r *registry) addStream(s *Subscription, streamID StreamId) (shouldAdd bool, shouldBackfill bool) {
	r.sLock.Lock()
	subscriptions, ok := r.subscriptions[streamID]
	if !ok || len(subscriptions) == 0 {
		shouldAdd = true
		r.subscriptions[streamID] = []*Subscription{s}
	} else {
		if !slices.ContainsFunc(subscriptions, func(sub *Subscription) bool {
			return sub.syncID == s.syncID
		}) {
			// The given stream should be backfilled and then start syncing.
			shouldBackfill = true
			s.initializingStreams.Store(streamID, struct{}{})
			r.subscriptions[streamID] = append(r.subscriptions[streamID], s)
		}
	}
	r.sLock.Unlock()
	return
}

// removeStream removes the given stream from the current subscription.
// Returns true if the given stream must be removed from the main syncer set.
func (r *registry) removeStream(syncID string, streamID StreamId) (removeFromRemote bool) {
	r.sLock.Lock()
	r.subscriptions[streamID] = slices.DeleteFunc(
		r.subscriptions[streamID],
		func(sub *Subscription) bool {
			return sub.syncID == syncID
		},
	)
	if removeFromRemote = len(r.subscriptions[streamID]) == 0; removeFromRemote {
		delete(r.subscriptions, streamID)
	}
	r.sLock.Unlock()
	return
}
