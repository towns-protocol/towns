package handler

import (
	"context"

	"github.com/puzpuzpuz/xsync/v4"

	. "github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/rpc/syncv3/eventbus"
)

type (
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

	syncStreamHandlerRegistryImpl struct {
		handlers         xsync.Map[string, *syncStreamHandlerImpl]
		streamUpdatesBus eventbus.StreamSubscriptionManager
	}
)

var (
	_ SyncStreamHandlerRegistry = (*syncStreamHandlerRegistryImpl)(nil)
)

func (s *syncStreamHandlerRegistryImpl) Get(syncID string) (SyncStreamHandler, bool) {
	return s.handlers.Load(syncID)
}

func (s *syncStreamHandlerRegistryImpl) New(ctx context.Context, syncID string, receiver Receiver) SyncStreamHandler {
	handler := &syncStreamHandlerImpl{
		syncID:           syncID,
		receiver:         receiver,
		streamUpdatesBus: s.streamUpdatesBus,
	}

	s.handlers.Store(handler.SyncID(), handler)

	return handler
}
