package handler

import (
	"context"
	"sync"
	"time"

	. "github.com/towns-protocol/towns/core/node/base"
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

	_ Registry = (*syncStreamHandlerRegistryImpl)(nil)
)

type (
	// SyncStreamHandler is a client sync operation. It subscribes for stream updates on behalf of
	// the client and sends updates to the client. The client can add, remove stream subscription
	// or cancel the sync operation.
	SyncStreamHandler interface {
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
		Modify(req *ModifySyncRequest) (*ModifySyncResponse, error)

		// Cancel the stream sync operation.
		// The given operation must be removed from the SyncStreamHandlerRegistry.
		//
		// It is safe to call this method multiple times. e.g., the sync operation is canceled due
		// to a node shutdown and at the same time the client cancels the sync operation.
		Cancel(ctx context.Context) error

		// Ping is used to keep the sync operation alive and make sure it is operational.
		Ping(ctx context.Context, nonce string)
	}

	// Receiver is a final receiver of the stream update message, i.e. client.
	// It is not thread safe so the race detector will throw an error if multiple goroutines
	// try to call Send at the same time.
	Receiver interface {
		Send(*SyncStreamsResponse) error
	}

	// Registry is the sync stream handler registry.
	// Registry holds a mapping from syncId that is shared with the client and
	// its associated SyncStreamHandler that is responsible to send stream updates to the client.
	Registry interface {
		// Get sync stream handler by sync id.
		Get(syncID string) (SyncStreamHandler, bool)

		// New create a new sync stream handler.
		New(ctx context.Context, syncID string, receiver Receiver) (SyncStreamHandler, error)
	}

	// syncStreamHandlerImpl is a concrete implementation of the SyncStreamHandler interface.
	//
	// TODO: Remove sync operation from event bas after its cancellation.
	syncStreamHandlerImpl struct {
		// ctx is the context of the sync operation.
		ctx context.Context
		// cancel is the cancel function for the operation context.
		cancel context.CancelCauseFunc
		// log is the logger for the operation.
		log *logging.Log
		// syncID is the unique identifier for the sync operation.
		syncID string
		// receiver is the final receiver of the stream update message, i.e. client.
		receiver Receiver
		// eventBus is the event bus that is used to subscribe for stream updates.
		eventBus eventbus.StreamSubscriptionManager
		// streamUpdates is the stream updates queue.
		// When a stream update is received, it should be sent to the queue so the updates processor can handle them.
		streamUpdates *dynmsgbuf.DynamicBuffer[*SyncStreamsResponse]
	}

	// syncStreamHandlerRegistryImpl is a concrete implementation of the Registry interface.
	syncStreamHandlerRegistryImpl struct {
		// handlersLock is a mutex that protects access to the handlers map.
		handlersLock sync.Mutex
		// handlers is a map of sync stream handlers by their sync ID.
		handlers map[string]*syncStreamHandlerImpl
		// eventBus is the event bus that is used to subscribe for stream updates.
		eventBus eventbus.StreamSubscriptionManager
	}
)

func (s *syncStreamHandlerImpl) SyncID() string {
	return s.syncID
}

func (s *syncStreamHandlerImpl) Modify(req *ModifySyncRequest) (*ModifySyncResponse, error) {
	// Perform an initial validation of the request before processing further.
	if err := validateModifySync(req); err != nil {
		return nil, err
	}

	var res ModifySyncResponse

	for _, cookie := range req.GetAddStreams() {
		if err := s.eventBus.Subscribe(cookie, s); err != nil {
			rvrErr := AsRiverError(err)
			res.Adds = append(res.Adds, &SyncStreamOpStatus{
				StreamId: cookie.GetStreamId(),
				Code:     int32(rvrErr.Code),
				Message:  rvrErr.GetMessage(),
			})
		}
	}

	for _, streamID := range req.GetRemoveStreams() {
		if err := s.eventBus.Unsubscribe(StreamId(streamID), s); err != nil {
			rvrErr := AsRiverError(err)
			res.Removals = append(res.Removals, &SyncStreamOpStatus{
				StreamId: streamID[:],
				Code:     int32(rvrErr.Code),
				Message:  rvrErr.GetMessage(),
			})
		}
	}

	for _, cookie := range req.GetBackfillStreams().GetStreams() {
		if err := s.eventBus.Backfill(cookie, s.syncID, req.BackfillStreams.GetSyncId()); err != nil {
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
	select {
	case <-s.ctx.Done():
		return s.ctx.Err()
	default:
	}

	if err := s.streamUpdates.AddMessage(&SyncStreamsResponse{
		SyncId: s.syncID,
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
	select {
	case <-s.ctx.Done():
		return
	default:
	}

	if err := s.streamUpdates.AddMessage(&SyncStreamsResponse{
		SyncId:    s.syncID,
		SyncOp:    SyncOp_SYNC_PONG,
		PongNonce: nonce,
	}); err != nil {
		s.log.Errorw("failed to add ping message to the stream updates queue", "error", err)
	}
}

// OnUpdate implements the eventbus.StreamSubscriber interface.
// It is expected to receive SyncOp_SYNC_UPDATE and SyncOp_SYNC_DOWN messages here.
func (s *syncStreamHandlerImpl) OnUpdate(update *SyncStreamsResponse) {
	select {
	case <-s.ctx.Done():
		return
	default:
	}

	// Set SyncID as exchanged with client
	update.SyncId = s.syncID

	// Add update to internal queue
	if err := s.streamUpdates.AddMessage(update); err != nil {
		s.cancel(err)
	}
}

// startUpdatesProcessor starts the updates processor that sends stream updates to the receiver.
func (s *syncStreamHandlerImpl) startUpdatesProcessor() {
	var msgs []*SyncStreamsResponse
	for {
		select {
		case <-s.ctx.Done():
			return
		case _, open := <-s.streamUpdates.Wait():
			msgs = s.streamUpdates.GetBatch(msgs)

			// nil msgs indicates the buffer is closed.
			if msgs == nil {
				_ = s.receiver.Send(&SyncStreamsResponse{
					SyncId: s.syncID,
					SyncOp: SyncOp_SYNC_CLOSE,
				})
				s.cancel(nil)
				return
			}

			// Process each message in the batch.
			// Messages must be processed in the order they were received.
			for _, msg := range msgs {
				if stop := s.processMessage(msg); stop {
					return
				}
			}

			// If the client sent a close message, stop sending messages to client from the buffer.
			// In theory should not happen, but just in case.
			if !open {
				_ = s.receiver.Send(&SyncStreamsResponse{
					SyncId: s.syncID,
					SyncOp: SyncOp_SYNC_CLOSE,
				})
				s.cancel(nil)
				return
			}
		}
	}
}

// processMessage processes a single message from the stream updates queue.
// Returns true if the processor should stop processing messages.
func (s *syncStreamHandlerImpl) processMessage(msg *SyncStreamsResponse) bool {
	// Check context before AND after preparing the message
	select {
	case <-s.ctx.Done():
		return true
	default:
	}

	select {
	case <-s.ctx.Done():
		return true
	default:
		msg.SyncId = s.syncID
		if err := s.receiver.Send(msg); err != nil {
			s.cancel(err)
			return true
		}
	}

	// Special cases depending on the message type that should be applied after sending the message.
	if msg.GetSyncOp() == SyncOp_SYNC_CLOSE {
		// Close the operation and return from the stream updates processor.
		s.cancel(nil)
		return true
	}

	return false
}

// NewRegistry creates a new instance of the Registry.
func NewRegistry(eventBus eventbus.StreamSubscriptionManager) Registry {
	return &syncStreamHandlerRegistryImpl{
		handlers: make(map[string]*syncStreamHandlerImpl),
		eventBus: eventBus,
	}
}

// Get retrieves a sync stream handler by its sync ID.
func (s *syncStreamHandlerRegistryImpl) Get(syncID string) (SyncStreamHandler, bool) {
	s.handlersLock.Lock()
	handler, ok := s.handlers[syncID]
	s.handlersLock.Unlock()
	return handler, ok
}

// New creates a new sync stream handler and registers it in the registry.
func (s *syncStreamHandlerRegistryImpl) New(ctx context.Context, syncID string, receiver Receiver) (SyncStreamHandler, error) {
	s.handlersLock.Lock()
	defer s.handlersLock.Unlock()

	if _, exists := s.handlers[syncID]; exists {
		return nil, RiverError(Err_ALREADY_EXISTS, "sync operation with the given ID already exists")
	}

	ctx, cancel := context.WithCancelCause(ctx)

	handler := &syncStreamHandlerImpl{
		ctx:           ctx,
		cancel:        cancel,
		log:           logging.FromCtx(ctx).Named("syncv3.handler").With("syncID", syncID),
		syncID:        syncID,
		receiver:      receiver,
		eventBus:      s.eventBus,
		streamUpdates: dynmsgbuf.NewDynamicBuffer[*SyncStreamsResponse](),
	}

	go handler.startUpdatesProcessor()

	s.handlers[syncID] = handler

	return handler, nil
}
