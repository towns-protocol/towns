package subscription

import (
	"context"
	"slices"
	"sync/atomic"

	"github.com/ethereum/go-ethereum/common"
	"github.com/puzpuzpuz/xsync/v4"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/trace"

	. "github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/logging"
	. "github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/rpc/sync/client"
	. "github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/utils/dynmsgbuf"
)

// SyncerSet represents a syncer set behaviour
type SyncerSet interface {
	Modify(ctx context.Context, req client.ModifyRequest) error
}

// Subscription represents an individual subscription for streams synchronization.
type Subscription struct {
	// Messages is the channel for the subscription messages
	Messages *dynmsgbuf.DynamicBuffer[*SyncStreamsResponse]
	// log is the logger for this stream sync operation
	log *logging.Log
	// ctx is the context of the sync operation
	ctx context.Context
	// cancel is the cancellation function of the sync op context
	cancel context.CancelCauseFunc
	// syncID is the subscription/sync ID
	syncID string
	// initializingStreams is a map of streams that are currently being initialized for this subscription.
	// A placement of the stream in this map means that the stream is being initialized and
	// the routing logic (in manager) should not send any messages for this stream until it is initialized.
	initializingStreams *xsync.Map[StreamId, struct{}]
	// backfillEvents is the map of stream and backfill events and miniblocks hashes that were sent to the client.
	// This is used to avoid sending the same backfill events multiple times.
	// The list of hashes is deleted after receiving the first message after the backfill.
	backfillEvents *xsync.Map[StreamId, map[common.Hash]struct{}]
	// syncers is the set of syncers that handle stream synchronization
	syncers SyncerSet
	// registry is the subscription registry that manages all subscriptions.
	registry Registry
	// closed is the indicator of the subscription status. 1 means the subscription is closed.
	closed atomic.Bool
	// otelTracer is the OpenTelemetry tracer used for tracing individual sync operations.
	otelTracer trace.Tracer
}

// Close closes the subscription.
func (s *Subscription) Close() {
	s.closed.Store(true)
	// Remove the subscription from the registry
	s.registry.RemoveSubscription(s.syncID)
	s.Messages.Close()
	s.initializingStreams.Clear()
	s.backfillEvents.Clear()
}

// isClosed returns true if the subscription is closed, false otherwise.
func (s *Subscription) isClosed() bool {
	return s.closed.Load()
}

// Send sends the given message to the subscription messages channel.
func (s *Subscription) Send(msg *SyncStreamsResponse) {
	if s.isClosed() {
		return
	}

	err := s.Messages.AddMessage(msg)
	if err != nil {
		rvrErr := AsRiverError(err).
			Tag("syncId", s.syncID).
			Func("Subscription.Send")
		s.cancel(rvrErr) // Cancelling client context that will lead to the subscription cancellation
		_ = rvrErr.LogError(s.log)
	}
}

// Modify modifies the current subscription by adding or removing streams.
// It also handles implicit backfills for streams that are added or being added.
func (s *Subscription) Modify(ctx context.Context, req client.ModifyRequest) error {
	if s.otelTracer != nil {
		var span trace.Span
		ctx, span = s.otelTracer.Start(ctx, "subscription::modify",
			trace.WithAttributes(attribute.String("syncId", s.syncID)))
		defer span.End()
	}

	// Validate the given request first
	if err := req.Validate(); err != nil {
		return err
	}

	// Prepare a request to be sent to the syncer set if needed
	modifiedReq := client.ModifyRequest{
		SyncID:                    s.syncID,
		ToBackfill:                req.ToBackfill,
		BackfillingFailureHandler: req.BackfillingFailureHandler,
		AddingFailureHandler: func(status *SyncStreamOpStatus) {
			req.AddingFailureHandler(status)
			s.registry.RemoveStreamFromSubscription(s.syncID, StreamId(status.GetStreamId()))
		},
		RemovingFailureHandler: func(status *SyncStreamOpStatus) {
			req.RemovingFailureHandler(status)
			s.registry.AddStreamToSubscription(s.syncID, StreamId(status.GetStreamId()))
		},
	}

	// Handle streams that the clients wants to subscribe to.
	removeOnFailure := make([]StreamId, len(req.ToAdd))
	var implicitBackfills []*SyncCookie
	for i, toAdd := range req.ToAdd {
		addToRemote, shouldBackfill := s.registry.AddStreamToSubscription(s.syncID, StreamId(toAdd.GetStreamId()))
		if addToRemote {
			// The given stream must be added to the main syncer set
			modifiedReq.ToAdd = append(modifiedReq.ToAdd, toAdd)
		} else if shouldBackfill {
			// The given stream must be backfilled implicitly only for the given subscription.
			implicitBackfills = append(implicitBackfills, toAdd)
		}
		removeOnFailure[i] = StreamId(toAdd.GetStreamId())
	}

	// Handle streams that the clients wants to unsubscribe from.
	for _, toRemove := range req.ToRemove {
		s.registry.RemoveStreamFromSubscription(s.syncID, StreamId(toRemove))
	}

	if len(implicitBackfills) > 0 {
		if modifiedReq.BackfillingFailureHandler == nil {
			modifiedReq.BackfillingFailureHandler = modifiedReq.AddingFailureHandler
		} else {
			originalBackfillingFailureHandler := req.BackfillingFailureHandler
			modifiedReq.BackfillingFailureHandler = func(status *SyncStreamOpStatus) {
				if slices.ContainsFunc(implicitBackfills, func(c *SyncCookie) bool {
					return StreamId(c.GetStreamId()) == StreamId(status.GetStreamId())
				}) {
					modifiedReq.AddingFailureHandler(status)
				} else {
					originalBackfillingFailureHandler(status)
					s.registry.RemoveStreamFromSubscription(s.syncID, StreamId(status.GetStreamId()))
				}
			}
		}

		modifiedReq.ToBackfill = append(modifiedReq.ToBackfill, &ModifySyncRequest_Backfill{
			SyncId:  s.syncID,
			Streams: implicitBackfills,
		})
	}

	if len(modifiedReq.ToBackfill) == 0 &&
		len(modifiedReq.ToAdd) == 0 &&
		len(modifiedReq.ToRemove) == 0 {
		// No changes to be made, just return
		return nil
	}

	// Send the request to the syncer set
	if err := s.syncers.Modify(ctx, modifiedReq); err != nil {
		// If the modification failed, we need to remove added streams from the subscription
		for _, streamId := range removeOnFailure {
			s.registry.RemoveStreamFromSubscription(s.syncID, streamId)
		}
		return err
	}

	return nil
}

// DebugDropStream drops the given stream from the subscription.
func (s *Subscription) DebugDropStream(_ context.Context, streamID StreamId) error {
	s.registry.RemoveStreamFromSubscription(s.syncID, streamID)
	s.Send(&SyncStreamsResponse{SyncOp: SyncOp_SYNC_DOWN, StreamId: streamID[:]})
	return nil
}
