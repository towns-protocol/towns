package subscription

import (
	"context"
	"fmt"
	"slices"

	"connectrpc.com/connect"
	"github.com/puzpuzpuz/xsync/v4"
	"google.golang.org/protobuf/proto"

	. "github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/logging"
	. "github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/rpc/sync/client"
	"github.com/towns-protocol/towns/core/node/rpc/sync/dynmsgbuf"
	. "github.com/towns-protocol/towns/core/node/shared"
)

type Subscription struct {
	// log is the logger for this stream sync operation
	log *logging.Log

	Ctx      context.Context
	Cancel   context.CancelCauseFunc
	SyncOp   string
	Messages *dynmsgbuf.DynamicBuffer[*SyncStreamsResponse]

	manager *Manager
}

func (s *Subscription) Close() {
	s.Messages.Close()
	s.manager.subscriptions.Delete(s.SyncOp)
	s.manager.streamToSubscriptions.Range(func(streamID StreamId, syncOps []string) bool {
		for i, op := range syncOps {
			if op == s.SyncOp {
				syncOps = append(syncOps[:i], syncOps[i+1:]...)
				break
			}
		}
		s.manager.streamToSubscriptions.Store(streamID, syncOps)
		return true
	})
}

// Send sends the given message to the subscription messages channel.
func (s *Subscription) Send(msg *SyncStreamsResponse) {
	select {
	case <-s.Ctx.Done():
		// Client context is cancelled, do not send the message.
		return
	default:
		if err := s.Messages.AddMessage(proto.Clone(msg).(*SyncStreamsResponse)); err != nil {
			rvrErr := AsRiverError(err).
				Tag("syncId", s.SyncOp).
				Tag("op", msg.GetSyncOp())
			s.Cancel(rvrErr) // Cancelling client context that will lead to the subscription cancellation
			s.log.Errorw("Failed to add message to subscription",
				"op", msg.GetSyncOp(), "err", err)
		}
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
		if addToRemote {
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
func (s *Subscription) addStream(cookie *SyncCookie) bool {
	var streamAlreadyInSync bool
	var updatedSubscribers bool

	// Add the stream to the subscription if not added yet
	s.manager.streamToSubscriptions.Compute(
		StreamId(cookie.GetStreamId()),
		func(oldValue []string, loaded bool) (newValue []string, op xsync.ComputeOp) {
			// The given stream is not syncing yet, add it to the syncer set.
			// It is ok to use the entire cookie when subscribing at the first time.
			streamAlreadyInSync = loaded && len(oldValue) > 0
			if slices.Contains(oldValue, s.SyncOp) {
				// The given stream is already subscribed, do nothing
				return nil, xsync.CancelOp
			}
			updatedSubscribers = true
			return append(oldValue, s.SyncOp), xsync.UpdateOp
		},
	)

	if streamAlreadyInSync {
		if !updatedSubscribers {
			// The given subscription already subscribed on the given stream, do nothing
			return false
		} else {
			// The given stream is already syncing but the client is not subscribed yet might
			// want to get updates since a specific miniblock.
			if err := s.backfillByCookie(s.Ctx, cookie); err != nil {
				// TODO: Handle this error
				fmt.Println("failed to backfill stream", err)
			}
			// TODO: Load stream updates based on the sync cookie, properly merge loaded results with latest sync updates
		}
	}

	return !streamAlreadyInSync
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
					break
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

// backfillByCookie sends the stream since the given cookie to the subscription.
// TODO: There could be a gap between the given cookie and the latest stream update.
func (s *Subscription) backfillByCookie(
	ctx context.Context,
	cookie *SyncCookie,
) error {
	streamID := StreamId(cookie.GetStreamId())

	if cookie.GetMinipoolGen() > 0 {
		var sc *StreamAndCookie

		st, err := s.manager.streamCache.GetStreamNoWait(ctx, streamID)
		if err != nil {
			return AsRiverError(err).Func("startSyncingByCookie")
		}

		remotes, isLocal := st.GetRemotesAndIsLocal()
		if isLocal {
			v, err := st.GetViewIfLocal(ctx)
			if err == nil {
				sc, _ = v.GetStreamSince(ctx, s.manager.localNodeAddr, cookie)
			}
		}

		if sc == nil {
			for _, addr := range remotes {
				cl, err := s.manager.nodeRegistry.GetStreamServiceClientForAddress(addr)
				if err != nil {
					continue
				}

				resp, err := cl.GetStream(ctx, connect.NewRequest(&GetStreamRequest{
					StreamId:   cookie.GetStreamId(),
					SyncCookie: cookie,
				}))
				if err != nil {
					continue
				}

				sc = resp.Msg.GetStream()
				break
			}
		}

		// TODO: What to do if the stream cannot be backfilled from the given cookie?
		if sc != nil {
			s.Send(&SyncStreamsResponse{
				SyncId: s.SyncOp,
				SyncOp: SyncOp_SYNC_UPDATE,
				Stream: sc,
			})
		}
	}

	return nil
}

// DebugDropStream drops the given stream from the subscription.
// TODO: Doublecheck the complete behaviour
func (s *Subscription) DebugDropStream(ctx context.Context, streamID StreamId) error {
	fmt.Println("debug drop stream", streamID, s.SyncOp)
	/*removeFromRemote := s.removeStream(streamID[:])
	if !removeFromRemote {
		return nil
	}*/

	return s.manager.syncers.DebugDropStream(ctx, streamID)
}
