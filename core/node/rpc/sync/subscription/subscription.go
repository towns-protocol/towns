package subscription

import (
	"context"
	"slices"

	"github.com/puzpuzpuz/xsync/v4"

	. "github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/logging"
	. "github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/rpc/sync/client"
	"github.com/towns-protocol/towns/core/node/rpc/sync/dynmsgbuf"
	. "github.com/towns-protocol/towns/core/node/shared"
)

type Subscription struct {
	// log is the logger for this stream sync operation
	log      *logging.Log
	Ctx      context.Context
	Cancel   context.CancelCauseFunc
	SyncOp   string
	Messages *dynmsgbuf.DynamicBuffer[*SyncStreamsResponse]

	manager *Manager
}

func (s *Subscription) Run() {
	for {
		select {
		case <-s.Ctx.Done():
			s.Messages.Close()
			s.manager.subscriptions.Delete(s.SyncOp)
		}
	}
}

// Send sends the given message to the subscription messages channel.
func (s *Subscription) Send(msg *SyncStreamsResponse) {
	if err := s.Messages.AddMessage(msg); err != nil {
		rvrErr := AsRiverError(err).
			Tag("syncId", s.SyncOp).
			Tag("op", msg.GetSyncOp())
		s.Cancel(rvrErr)
		s.log.Errorw("Failed to add message to subscription",
			"op", msg.GetSyncOp(), "err", err)
	}
}

func (s *Subscription) Modify(ctx context.Context, req client.ModifyRequest) error {
	// Validate the given request first
	if err := req.Validate(); err != nil {
		return err
	}

	// Prepare a request to be sent to the syncer set if needed
	modifiedReq := client.ModifyRequest{
		AddingFailureHandler: func(status *SyncStreamOpStatus) {
			req.AddingFailureHandler(status)
			s.removeStream(status.GetStreamId())
		},
		RemovingFailureHandler: req.RemovingFailureHandler,
	}

	// Handle streams that the clients wants to subscribe to.
	for _, toAdd := range req.ToAdd {
		addToRemote := s.addStream(toAdd)
		if !addToRemote {
			// The given stream must be added to the main syncer set
			modifiedReq.ToAdd = append(modifiedReq.ToAdd, toAdd)
		}
	}

	// Handle streams that the clients wants to unsubscribe from.
	for _, toRemove := range req.ToRemove {
		removeFromRemote := s.removeStream(toRemove)
		if removeFromRemote {
			// The given stream must be removed from the main syncer set
			modifiedReq.ToRemove = append(modifiedReq.ToRemove, toRemove)
		}
	}

	if len(modifiedReq.ToAdd) == 0 && len(modifiedReq.ToRemove) == 0 {
		// No changes to be made, just return
		return nil
	}

	// Send the request to the syncer set
	if err := s.manager.syncers.Modify(ctx, modifiedReq); err != nil {
		return err
	}

	return nil
}

// addStream adds the given stream to the current subscription.
// Returns true if the given stream must be added to the main syncer set.
func (s *Subscription) addStream(cookie *SyncCookie) (addToRemote bool) {
	var (
		streamSyncing bool
		subscribed    bool
	)

	// Add the stream to the subscription if not added yet
	s.manager.streamToSubscriptions.Compute(
		StreamId(cookie.GetStreamId()),
		func(oldValue []string, loaded bool) (newValue []string, op xsync.ComputeOp) {
			streamSyncing = loaded

			if subscribed = slices.Contains(oldValue, s.SyncOp); subscribed {
				// The given stream is already subscribed
				return nil, xsync.CancelOp
			}

			return append(oldValue, s.SyncOp), xsync.UpdateOp
		},
	)

	if subscribed {
		// The given subscription already subscribed on the given stream, no nothing
		return
	}

	if !streamSyncing {
		// The given stream is not syncing yet, add it to the syncer set.
		// It is ok to use the entire cookie when subscribing at the first time.
		addToRemote = true
	} else {
		// The given stream is already syncing but the client might
		// want to get updates since a specific miniblock.
		// TODO: Load stream updates based on the sync cookie, properly merge loaded results with latest sync updates
	}

	return addToRemote
}

// removeStream removes the given stream from the current subscription.
// Returns true if the given stream must be removed from the main syncer set.
func (s *Subscription) removeStream(streamID []byte) (removeFromRemote bool) {
	// Remove the stream from the subscription
	s.manager.streamToSubscriptions.Compute(
		StreamId(streamID),
		func(oldValue []string, loaded bool) (newValue []string, op xsync.ComputeOp) {
			if !loaded {
				// No record found for the given stream, just cancel
				return nil, xsync.CancelOp
			}

			if len(oldValue) == 0 {
				// No subscriptions for the given stream, just delete the record from cache
				return nil, xsync.DeleteOp
			}

			// Remove the given subscriptions from the list of subscribers on the given stream
			for i, sub := range oldValue {
				if sub == s.SyncOp {
					newValue = append(oldValue[:i], oldValue[i+1:]...)
				}
			}

			if len(newValue) == len(oldValue) {
				// The given subscriber is not subscribed on the given stream
				return nil, xsync.CancelOp
			}

			if len(newValue) == 0 {
				// No more subscriptions for the given stream, remove it from the entire sync
				removeFromRemote = true
				return nil, xsync.DeleteOp
			}

			return newValue, xsync.UpdateOp
		},
	)

	return removeFromRemote
}

// DebugDropStream drops the given stream from the subscription.
func (s *Subscription) DebugDropStream(ctx context.Context, streamID StreamId) error {
	removeFromRemote := s.removeStream(streamID[:])
	if !removeFromRemote {
		return nil
	}

	return s.manager.syncers.DebugDropStream(ctx, streamID)
}
