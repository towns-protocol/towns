package handler

import (
	"context"
	"sync"

	. "github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/rpc/syncv3/eventbus"
	. "github.com/towns-protocol/towns/core/node/shared"
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
		//
		// TODO: discuss what error needs to be returned for streams that can't be found. Probably just a stream down message with a message immediately.
		Modify(req *ModifySyncRequest) *ModifySyncResponse

		// Cancel the stream sync operation.
		// The given operation must be removed from the SyncStreamHandlerRegistry.
		//
		// It is safe to call this method multiple times. e.g., the sync operation is canceled due
		// to a node shutdown and at the same time the client cancels the sync operation.
		Cancel(ctx context.Context) error

		// Ping is used to keep the sync operation alive and make sure it is operational.
		Ping(ctx context.Context)
	}

	// Receiver is a final receiver of the stream update message, i.e. client.
	// It is not thread safe so the race detector will throw an error if multiple goroutines
	// try to call Send at the same time.
	Receiver interface {
		Send(*SyncStreamsResponse) error
	}

	// SyncStreamHandlerRegistry holds a mapping from syncId that is shared with the client and
	// its associated SyncStreamHandler that is responsible to send stream updates to the client.
	SyncStreamHandlerRegistry interface {
		// Get sync stream handler by sync id.
		Get(syncID string) (SyncStreamHandler, bool)

		// New create a new sync stream handler.
		New(ctx context.Context, syncID string, receiver Receiver) SyncStreamHandler
	}

	syncStreamHandlerImpl struct {
		syncID           string
		receiver         Receiver
		streamUpdatesBus eventbus.StreamSubscriptionManager
	}

	syncStreamHandlerRegistryImpl struct {
		handlersLock sync.Mutex
		handlers     map[string]*syncStreamHandlerImpl

		streamUpdatesBus eventbus.StreamSubscriptionManager
	}
)

var (
	_ SyncStreamHandler         = (*syncStreamHandlerImpl)(nil)
	_ eventbus.StreamSubscriber = (*syncStreamHandlerImpl)(nil)

	_ SyncStreamHandlerRegistry = (*syncStreamHandlerRegistryImpl)(nil)
)

func (s *syncStreamHandlerImpl) SyncID() string {
	return s.syncID
}

func (s *syncStreamHandlerImpl) Modify(req *ModifySyncRequest) *ModifySyncResponse {
	// TODO: validate req

	var res ModifySyncResponse
	for _, stream := range req.AddStreams {
		if err := s.streamUpdatesBus.Subscribe(StreamId(stream.GetStreamId()), s); err != nil {
			res.Adds = append(res.Adds, &SyncStreamOpStatus{
				StreamId:    stream.GetStreamId(),
				Code:        1, // TODO??
				Message:     err.Error(),
				NodeAddress: nil, // TODO??
			})
		}
	}

	for _, streamID := range req.RemoveStreams {
		s.streamUpdatesBus.Unsubscribe(StreamId(streamID), s)
	}

	for _, cookie := range req.BackfillStreams.Streams {
		if err := s.streamUpdatesBus.Backfill(cookie, s.syncID, req.BackfillStreams.GetSyncId()); err != nil {
			res.Backfills = append(res.Backfills, &SyncStreamOpStatus{
				StreamId:    cookie.GetStreamId(),
				Code:        1, // TODO??
				Message:     err.Error(),
				NodeAddress: nil, // TODO??
			})
		}
	}

	return &res
}

func (s *syncStreamHandlerImpl) Cancel(ctx context.Context) error {
	// TODO implement me
	panic("implement me")
}

func (s *syncStreamHandlerImpl) Ping(ctx context.Context) {
	// TODO implement me
	panic("implement me")
}

// OnUpdate implements the eventbus.StreamSubscriber interface.
func (s *syncStreamHandlerImpl) OnUpdate(update *SyncStreamsResponse) {
	// TODO implement me

	// set syncID as exchanged with client
	update.SyncId = s.syncID

	// add update to internal queue

	panic("implement me")
}

func (s *syncStreamHandlerRegistryImpl) Get(syncID string) (SyncStreamHandler, bool) {
	handler, ok := s.handlers[syncID]
	return handler, ok
}

func (s *syncStreamHandlerRegistryImpl) New(ctx context.Context, syncID string, receiver Receiver) SyncStreamHandler {
	handler := &syncStreamHandlerImpl{
		syncID:           syncID,
		receiver:         receiver,
		streamUpdatesBus: s.streamUpdatesBus,
	}

	s.handlersLock.Lock()
	s.handlers[handler.SyncID()] = handler
	s.handlersLock.Unlock()

	return handler
}
