package subscription

import (
	"context"
	"fmt"
	"slices"
	"sync/atomic"

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
	// ctx is the context of the sync operation
	ctx context.Context
	// cancel is the cancellation function of the sync op context
	cancel context.CancelCauseFunc
	// syncID is the subscription/sync ID
	syncID string
	// Messages is the channel for the subscription messages
	Messages *dynmsgbuf.DynamicBuffer[*SyncStreamsResponse]
	// closed is the indicator of the subscription status. 1 means the subscription is closed.
	closed  uint32
	manager *Manager

	initializingStreams *xsync.Map[StreamId, bool]
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

	msg = proto.Clone(msg).(*SyncStreamsResponse)
	err := s.Messages.AddMessage(msg)
	if err != nil {
		rvrErr := AsRiverError(err).
			Tag("syncId", s.syncID).
			Tag("op", msg.GetSyncOp())
		s.cancel(rvrErr) // Cancelling client context that will lead to the subscription cancellation
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
		SyncID:                    s.syncID,
		ToBackfill:                req.ToBackfill, // TODO: Should be accepted by the stream nodes only?
		BackfillingFailureHandler: req.BackfillingFailureHandler,
		AddingFailureHandler: func(status *SyncStreamOpStatus) {
			req.AddingFailureHandler(status)
			s.removeStream(status.GetStreamId())
		},
		RemovingFailureHandler: req.RemovingFailureHandler,
	}
	/*
		ST1: to backfill
		ST2: to add (backfilled by the node)
		->
		ToBackfill: {Streams: [ST1 (target sync ID specified), ST2 (target sync ID not specified)]}
	*/

	if len(req.ToBackfill) > 0 {
		// TODO: Currently target sync ID is reset in the send function which is not correct for explicit backfill requests
		//fmt.Println("req.ToBackfill", s.manager.localNodeAddr, len(req.ToBackfill), s.syncID)
	}

	// Handle streams that the clients wants to subscribe to.
	var implicitBackfills []*SyncCookie
	for _, toAdd := range req.ToAdd {
		addToRemote, shouldBackfill := s.addStream(toAdd)
		if addToRemote {
			// The given stream must be added to the main syncer set
			modifiedReq.ToAdd = append(modifiedReq.ToAdd, toAdd)
		} else if shouldBackfill {
			// The given stream must be backfilled implicitly only for the given subscription
			// TODO: In this case, there is only one target sync ID which is s.syncID
			implicitBackfills = append(implicitBackfills, toAdd)
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

	if len(implicitBackfills) == 0 && len(modifiedReq.ToAdd) == 0 && len(modifiedReq.ToRemove) == 0 {
		// No changes to be made, just return
		return nil
	}

	if len(implicitBackfills) > 0 {
		modifiedReq.ToBackfill = append(modifiedReq.ToBackfill, &ModifySyncRequest_Backfill{
			SyncId:  s.syncID,
			Streams: implicitBackfills,
		})
	}

	// Send the request to the syncer set
	if err := s.manager.syncers.Modify(ctx, modifiedReq); err != nil {
		return err
	}

	return nil
}

// addStream adds the given stream to the current subscription.
// Returns true if the given stream must be added to the main syncer set.
func (s *Subscription) addStream(cookie *SyncCookie) (shouldAdd bool, shouldBackfill bool) {
	streamID := StreamId(cookie.GetStreamId())

	// Add the stream to the subscription if not added yet
	s.manager.sLock.Lock()
	subscriptions, ok := s.manager.subscriptions[streamID]
	if !ok || len(subscriptions) == 0 {
		shouldAdd = true
		s.manager.subscriptions[streamID] = []*Subscription{s}
	} else {
		if !slices.ContainsFunc(subscriptions, func(sub *Subscription) bool {
			return sub.syncID == s.syncID
		}) {
			if cookie.GetMinipoolGen() > 0 || len(cookie.GetPrevMiniblockHash()) > 0 {
				// The given stream should be backfilled and then start syncing
				shouldBackfill = true
				s.initializingStreams.Store(streamID, true)
			}
			s.manager.subscriptions[streamID] = append(s.manager.subscriptions[streamID], s)
		}
	}
	s.manager.sLock.Unlock()

	return
}

// removeStream removes the given stream from the current subscription.
// Returns true if the given stream must be removed from the main syncer set.
func (s *Subscription) removeStream(streamID []byte) (removeFromRemote bool) {
	s.manager.sLock.Lock()
	s.manager.subscriptions[StreamId(streamID)] = slices.DeleteFunc(
		s.manager.subscriptions[StreamId(streamID)],
		func(sub *Subscription) bool {
			return sub.syncID == s.syncID
		},
	)
	if removeFromRemote = len(s.manager.subscriptions[StreamId(streamID)]) == 0; removeFromRemote {
		delete(s.manager.subscriptions, StreamId(streamID))
	}
	s.manager.sLock.Unlock()

	return removeFromRemote
}

// DebugDropStream drops the given stream from the subscription.
// TODO: Doublecheck the complete behaviour
func (s *Subscription) DebugDropStream(ctx context.Context, streamID StreamId) error {
	fmt.Println("debug drop stream", streamID, s.syncID)
	/*removeFromRemote := s.removeStream(streamID[:])
	if !removeFromRemote {
		return nil
	}*/

	return s.manager.syncers.DebugDropStream(ctx, streamID)
}
