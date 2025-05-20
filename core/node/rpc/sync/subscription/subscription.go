package subscription

import (
	"context"
	"fmt"
	"slices"
	"sync/atomic"

	"connectrpc.com/connect"
	"github.com/ethereum/go-ethereum/common"
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
	SyncID   string
	Messages *dynmsgbuf.DynamicBuffer[*SyncStreamsResponse]

	manager *Manager

	closed uint32
}

func (s *Subscription) Close() {
	atomic.StoreUint32(&s.closed, 1)
	s.Messages.Close()
	// The given subscription is going to be removed from the list (s.subscriptions) automatically during the next stream update.
}

func (s *Subscription) isClosed() bool {
	return atomic.LoadUint32(&s.closed) == 1
}

// Send sends the given message to the subscription messages channel.
func (s *Subscription) Send(msg *SyncStreamsResponse) {
	if s.isClosed() {
		return
	}

	err := s.Messages.AddMessage(proto.Clone(msg).(*SyncStreamsResponse))
	if err != nil {
		rvrErr := AsRiverError(err).
			Tag("syncId", s.SyncID).
			Tag("op", msg.GetSyncOp())
		s.Cancel(rvrErr) // Cancelling client context that will lead to the subscription cancellation
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
	streamID := StreamId(cookie.GetStreamId())
	var streamAlreadyInSync bool
	var updatedSubscribers bool

	// Add the stream to the subscription if not added yet
	s.manager.sLock.Lock()
	subscriptions, ok := s.manager.subscriptions[streamID]
	if !ok || len(subscriptions) == 0 {
		s.manager.subscriptions[streamID] = []*Subscription{s}
		updatedSubscribers = true
	} else {
		streamAlreadyInSync = true
		if !slices.ContainsFunc(subscriptions, func(sub *Subscription) bool {
			return sub.SyncID == s.SyncID
		}) {
			updatedSubscribers = true
			s.manager.subscriptions[streamID] = append(s.manager.subscriptions[streamID], s)
		}
	}
	s.manager.sLock.Unlock()

	if streamAlreadyInSync {
		if !updatedSubscribers {
			// The given subscription already subscribed on the given stream, do nothing
			return false
		} else {
			// TODO: BACKFILL
			go func() {
				if err := s.backfillByCookie(s.Ctx, cookie); err != nil {
					rvrErr := AsRiverError(err).
						Tag("syncId", s.SyncID).
						Tag("op", cookie.GetStreamId())
					s.Cancel(rvrErr) // Cancelling client context that will lead to the subscription cancellation
					s.log.Errorw("Failed to backfill stream by the given cookie",
						"op", cookie.GetStreamId(), "err", err)
				}
			}()
		}
	}

	return !streamAlreadyInSync
}

// removeStream removes the given stream from the current subscription.
// Returns true if the given stream must be removed from the main syncer set.
func (s *Subscription) removeStream(streamID []byte) (removeFromRemote bool) {
	s.manager.sLock.Lock()
	s.manager.subscriptions[StreamId(streamID)] = slices.DeleteFunc(
		s.manager.subscriptions[StreamId(streamID)],
		func(sub *Subscription) bool {
			return sub.SyncID == s.SyncID
		},
	)
	if removeFromRemote = len(s.manager.subscriptions[StreamId(streamID)]) == 0; removeFromRemote {
		delete(s.manager.subscriptions, StreamId(streamID))
	}
	s.manager.sLock.Unlock()

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
			return err
		}

		// Try address from cookie first
		if len(cookie.GetNodeAddress()) > 0 {
			addr := common.BytesToAddress(cookie.GetNodeAddress())
			if s.manager.localNodeAddr.Cmp(addr) == 0 {
				v, err := st.GetViewIfLocal(ctx)
				if err == nil {
					sc, _ = v.GetStreamSince(ctx, s.manager.localNodeAddr, cookie)
				}
			} else {
				cl, err := s.manager.nodeRegistry.GetStreamServiceClientForAddress(addr)
				if err == nil {
					resp, err := cl.GetStream(ctx, connect.NewRequest(&GetStreamRequest{
						StreamId:   cookie.GetStreamId(),
						SyncCookie: cookie,
					}))
					if err == nil {
						sc = resp.Msg.GetStream()
					}
				}
			}
		}

		if sc == nil {
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
		}

		// TODO: What to do if the stream cannot be backfilled from the given cookie?
		if sc != nil {
			s.Send(&SyncStreamsResponse{SyncOp: SyncOp_SYNC_UPDATE, Stream: sc, SyncId: s.SyncID})
		}
	}

	return nil
}

// DebugDropStream drops the given stream from the subscription.
// TODO: Doublecheck the complete behaviour
func (s *Subscription) DebugDropStream(ctx context.Context, streamID StreamId) error {
	fmt.Println("debug drop stream", streamID, s.SyncID)
	/*removeFromRemote := s.removeStream(streamID[:])
	if !removeFromRemote {
		return nil
	}*/

	return s.manager.syncers.DebugDropStream(ctx, streamID)
}
