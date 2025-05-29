package subscription

import (
	"context"
	"slices"
	"sync/atomic"

	"github.com/puzpuzpuz/xsync/v4"
	"go.opentelemetry.io/otel/trace"
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
	s.log.Info("Closing subscription", "err", s.ctx.Err())
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
	if s.manager.otelTracer != nil {
		var span trace.Span
		ctx, span = s.manager.otelTracer.Start(ctx, "subscription::modify")
		defer span.End()
	}

	// Validate the given request first
	if err := req.Validate(); err != nil {
		return err
	}

	// Handle streams that the clients wants to backfill.
	for _, backfill := range req.ToBackfill {
		s.manager.syncers.Backfill(ctx, s.syncID, backfill, req.BackfillingFailureHandler)
	}

	// Handle streams that the clients wants to subscribe to.
	for _, toAdd := range req.ToAdd {
		var failedToAdd bool
		if err := s.addStream(ctx, func(status *SyncStreamOpStatus) {
			failedToAdd = true
			req.AddingFailureHandler(status)
		}, toAdd); err != nil {
			s.log.Errorw("Failed to add to add-stream", "toAdd", toAdd, "err", err)
		}
		if failedToAdd {
			if err := s.removeStream(ctx, func(status *SyncStreamOpStatus) {}, toAdd.GetStreamId()); err != nil {
				s.log.Errorw("Failed to remove stream after failed add", "toAdd", toAdd, "err", err)
			}
		}
	}

	// Handle streams that the clients wants to unsubscribe from.
	for _, toRemove := range req.ToRemove {
		if err := s.removeStream(ctx, req.RemovingFailureHandler, toRemove); err != nil {
			s.log.Errorw("Failed to remove stream", "toRemove", toRemove, "err", err)
		}
	}

	return nil
}

// addStream adds the given stream to the current subscription.
// Returns true if the given stream must be added to the main syncer set.
func (s *Subscription) addStream(
	ctx context.Context,
	failureHandler func(status *SyncStreamOpStatus),
	cookie *SyncCookie,
) error {
	var shouldAdd, shouldBackfill bool
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

	if shouldAdd {
		if err := s.manager.syncers.Modify(ctx, client.ModifyRequest{
			SyncID:               s.syncID,
			ToAdd:                []*SyncCookie{cookie},
			AddingFailureHandler: failureHandler,
		}); err != nil {
			return err
		}
	} else if shouldBackfill {
		s.manager.syncers.Backfill(ctx, s.syncID, &ModifySyncRequest_Backfill{
			SyncId:  s.syncID,
			Streams: []*SyncCookie{cookie},
		}, failureHandler)
	}

	return nil
}

// removeStream removes the given stream from the current subscription.
// Returns true if the given stream must be removed from the main syncer set.
func (s *Subscription) removeStream(
	ctx context.Context,
	failureHandler func(status *SyncStreamOpStatus),
	streamID []byte,
) error {
	var removeFromRemote bool

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
	s.initializingStreams.Delete(StreamId(streamID))
	s.manager.sLock.Unlock()

	if removeFromRemote {
		if err := s.manager.syncers.Modify(ctx, client.ModifyRequest{
			SyncID:                 s.syncID,
			ToRemove:               [][]byte{streamID},
			RemovingFailureHandler: failureHandler,
		}); err != nil {
			return err
		}
	}

	return nil
}

// DebugDropStream drops the given stream from the subscription.
func (s *Subscription) DebugDropStream(ctx context.Context, streamID StreamId) error {
	if err := s.removeStream(ctx, func(status *SyncStreamOpStatus) {}, streamID[:]); err != nil {
		return err
	}
	s.Send(&SyncStreamsResponse{SyncOp: SyncOp_SYNC_DOWN, StreamId: streamID[:]})
	return nil
}
