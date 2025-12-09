package handler

import (
	"context"
	"time"

	. "github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/events"
	"github.com/towns-protocol/towns/core/node/logging"
	. "github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/rpc/syncv3/eventbus"
	. "github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/utils/dynmsgbuf"
)

const (
	// defaultCommandReplyTimeout is the default timeout for command replies in the sync operation.
	defaultCommandReplyTimeout = 30 * time.Second
)

var (
	_ SyncStreamHandler         = (*syncStreamHandlerImpl)(nil)
	_ eventbus.StreamSubscriber = (*syncStreamHandlerImpl)(nil)
)

// StreamCache represents a behavior of the stream cache.
type StreamCache interface {
	GetStreamNoWait(ctx context.Context, streamID StreamId) (*events.Stream, error)
}

// Receiver is a final receiver of the stream update message, i.e. client.
type Receiver interface {
	// Send sends the given SyncStreamsResponse to the client.
	// Caller of the given function MUST NOT make an assumption that the function is thread safe.
	Send(*SyncStreamsResponse) error
}

// SyncStreamHandler is a client sync operation. It subscribes for stream updates on behalf of
// the client and sends updates to the client. The client can add, remove stream subscription
// or cancel the sync operation.
type SyncStreamHandler interface {
	// Run runs the sync stream handler.
	Run() error

	// SyncID returns the unique identifier for the sync operation that is shared with the client.
	SyncID() string

	// Modify allows the client to add or remove the streams it is subscribed on for update.
	//
	// For each stream that is added, it will subscribe for streams updates. Note that it
	// is possible to receive stream updates before receiving the initial updates from the
	// given sync position. The operation must temporarily buffer incoming updates until the
	// update from the given sync position is sent to the client (backfill).
	//
	// For each stream that is removed, the operation will unsubscribe from further stream updates.
	Modify(ctx context.Context, req *ModifySyncRequest) (*ModifySyncResponse, error)

	// Cancel the stream sync operation.
	// The given operation must be removed from the SyncStreamHandlerRegistry.
	//
	// It is safe to call this method multiple times. e.g., the sync operation is canceled due
	// to a node shutdown and at the same time the client cancels the sync operation.
	Cancel(ctx context.Context) error

	// Ping is used to keep the sync operation alive and make sure it is operational.
	Ping(ctx context.Context, nonce string)

	// DebugDropStream is a debug method to drop a specific stream from the sync operation.
	// Sends a SyncOp_SYNC_DOWN message to the receiver and unsubscribes from the stream updates.
	DebugDropStream(ctx context.Context, streamId StreamId) error
}

// syncStreamHandlerImpl implements SyncStreamHandler interface.
type syncStreamHandlerImpl struct {
	ctx           context.Context
	cancel        context.CancelCauseFunc
	log           *logging.Log
	syncID        string
	receiver      Receiver
	eventBus      eventbus.StreamSubscriptionManager
	streamUpdates *dynmsgbuf.DynamicBuffer[*SyncStreamsResponse]
	streamCache   StreamCache
}

func (s *syncStreamHandlerImpl) Run() error {
	defer func() {
		if err := s.eventBus.EnqueueRemoveSubscriber(s.syncID); err != nil {
			s.log.Errorw("failed to remove sync operation from the event bus", "error", err)
		}
	}()

	// The first message must be a SyncOp_SYNC_NEW message to notify the receiver about the new sync operation with ID.
	if err := s.receiver.Send(&SyncStreamsResponse{
		SyncId: s.syncID,
		SyncOp: SyncOp_SYNC_NEW,
	}); err != nil {
		return err
	}

	// Start processing stream updates.
	var msgs []*SyncStreamsResponse
	for {
		select {
		case <-s.ctx.Done():
			return context.Cause(s.ctx)
		case <-s.streamUpdates.Wait():
			msgs = s.streamUpdates.GetBatch(msgs)

			// nil msgs indicates the buffer is closed.
			if msgs == nil {
				_ = s.receiver.Send(&SyncStreamsResponse{
					SyncId: s.syncID,
					SyncOp: SyncOp_SYNC_CLOSE,
				})
				s.cancel(nil)
				return nil
			}

			// Process each message in the batch.
			// Messages must be processed in the order they were received.
			for _, msg := range msgs {
				if stop := s.processMessage(msg); stop {
					return context.Cause(s.ctx)
				}
			}
		}
	}
}

func (s *syncStreamHandlerImpl) SyncID() string {
	return s.syncID
}

func (s *syncStreamHandlerImpl) Modify(ctx context.Context, req *ModifySyncRequest) (*ModifySyncResponse, error) {
	// Perform an initial structural validation of the request before processing further.
	if err := validateModifySync(req); err != nil {
		return nil, err
	}

	var res ModifySyncResponse

	for _, cookie := range req.GetAddStreams() {
		streamId, _ := StreamIdFromBytes(cookie.GetStreamId())

		// Check if the stream exists in the cache before subscribing.
		// If not found, add the error to the response and continue with the next stream.
		if _, err := s.streamCache.GetStreamNoWait(ctx, streamId); err != nil {
			rvrErr := AsRiverError(err)
			res.Adds = append(res.Adds, &SyncStreamOpStatus{
				StreamId: cookie.GetStreamId(),
				Code:     int32(rvrErr.Code),
				Message:  rvrErr.GetMessage(),
			})
			continue
		}

		if err := s.eventBus.EnqueueSubscribe(cookie, s); err != nil {
			rvrErr := AsRiverError(err)
			res.Adds = append(res.Adds, &SyncStreamOpStatus{
				StreamId: cookie.GetStreamId(),
				Code:     int32(rvrErr.Code),
				Message:  rvrErr.GetMessage(),
			})
		}
	}

	for _, streamID := range req.GetRemoveStreams() {
		if err := s.eventBus.EnqueueUnsubscribe(StreamId(streamID), s); err != nil {
			rvrErr := AsRiverError(err)
			res.Removals = append(res.Removals, &SyncStreamOpStatus{
				StreamId: streamID[:],
				Code:     int32(rvrErr.Code),
				Message:  rvrErr.GetMessage(),
			})
		}
	}

	for _, cookie := range req.GetBackfillStreams().GetStreams() {
		if err := s.eventBus.EnqueueBackfill(cookie, s.syncID, req.BackfillStreams.GetSyncId()); err != nil {
			rvrErr := AsRiverError(err)
			res.Backfills = append(res.Backfills, &SyncStreamOpStatus{
				StreamId: cookie.GetStreamId(),
				Code:     int32(rvrErr.Code),
				Message:  rvrErr.GetMessage(),
			})
		}
	}

	return &res, nil
}

func (s *syncStreamHandlerImpl) Cancel(ctx context.Context) error {
	if err := s.ctx.Err(); err != nil {
		return err
	}

	if err := s.streamUpdates.AddMessage(&SyncStreamsResponse{
		SyncOp: SyncOp_SYNC_CLOSE,
	}); err != nil {
		return AsRiverError(err).
			Func("syncStreamHandlerImpl.Cancel").
			Message("failed to add close message to the stream updates queue")
	}

	// Operation is expected to be cancelled by the updates processor.
	select {
	case <-time.After(defaultCommandReplyTimeout):
		return RiverError(Err_DEADLINE_EXCEEDED, "sync operation could not be cancelled in time")
	case <-ctx.Done():
		return AsRiverError(ctx.Err(), Err_CANCELED).Message("request context cancelled")
	case <-s.ctx.Done():
		return nil
	}
}

func (s *syncStreamHandlerImpl) Ping(_ context.Context, nonce string) {
	if s.ctx.Err() != nil {
		return
	}

	if err := s.streamUpdates.AddMessage(&SyncStreamsResponse{
		SyncOp:    SyncOp_SYNC_PONG,
		PongNonce: nonce,
	}); err != nil {
		s.log.Errorw("failed to add ping message to the stream updates queue", "error", err)
	}
}

func (s *syncStreamHandlerImpl) DebugDropStream(_ context.Context, streamId StreamId) error {
	if err := s.ctx.Err(); err != nil {
		return err
	}

	if err := s.eventBus.EnqueueUnsubscribe(streamId, s); err != nil {
		return err
	}

	return s.streamUpdates.AddMessage(&SyncStreamsResponse{
		SyncOp:   SyncOp_SYNC_DOWN,
		StreamId: streamId[:],
	})
}

// OnUpdate implements the eventbus.StreamSubscriber interface.
// It is expected to receive SyncOp_SYNC_UPDATE and SyncOp_SYNC_DOWN messages here.
func (s *syncStreamHandlerImpl) OnUpdate(update *SyncStreamsResponse) {
	if s.ctx.Err() != nil {
		return
	}

	if err := s.streamUpdates.AddMessage(update); err != nil {
		s.cancel(err)
	}
}

// processMessage processes a single message from the stream updates queue.
// Returns true if the processor should stop processing messages.
func (s *syncStreamHandlerImpl) processMessage(msg *SyncStreamsResponse) bool {
	if s.ctx.Err() != nil {
		return true
	}

	msg.SyncId = s.syncID
	if err := s.receiver.Send(msg); err != nil {
		s.cancel(err)
		return true
	}

	// Special cases depending on the message type that should be applied after sending the message.
	if msg.GetSyncOp() == SyncOp_SYNC_CLOSE {
		s.cancel(nil)
		return true
	}

	return false
}
