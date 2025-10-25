package handler

import (
	"context"
	"sync"

	. "github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/infra"
	"github.com/towns-protocol/towns/core/node/logging"
	. "github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/rpc/syncv3/eventbus"
	"github.com/towns-protocol/towns/core/node/utils/dynmsgbuf"
)

var _ Registry = (*syncStreamHandlerRegistryImpl)(nil)

// Registry is the sync stream handler registry.
// Registry holds a mapping from syncId that is shared with the client and
// its associated SyncStreamHandler that is responsible to send stream updates to the client.
type Registry interface {
	// Get sync stream handler by sync id.
	Get(syncID string) (SyncStreamHandler, bool)

	// New creates a new sync stream handler.
	New(ctx context.Context, syncID string, receiver Receiver) (SyncStreamHandler, error)

	// Remove removes the sync stream handler from the registry by the given sync ID.
	Remove(syncID string)
}

type syncStreamHandlerRegistryImpl struct {
	handlersLock sync.Mutex
	handlers     map[string]*syncStreamHandlerImpl
	eventBus     eventbus.StreamSubscriptionManager
}

func NewRegistry(
	eventBus eventbus.StreamSubscriptionManager,
	metrics infra.MetricsFactory,
) Registry {
	h := &syncStreamHandlerRegistryImpl{
		handlers: make(map[string]*syncStreamHandlerImpl),
		eventBus: eventBus,
	}

	if metrics != nil {
		h.runMetricsCollector(metrics)
	}

	return h
}

func (s *syncStreamHandlerRegistryImpl) Get(syncID string) (SyncStreamHandler, bool) {
	s.handlersLock.Lock()
	handler, ok := s.handlers[syncID]
	s.handlersLock.Unlock()
	return handler, ok
}

func (s *syncStreamHandlerRegistryImpl) Remove(syncID string) {
	var handler *syncStreamHandlerImpl

	s.handlersLock.Lock()
	handler = s.handlers[syncID]
	if handler != nil {
		delete(s.handlers, syncID)
	}
	s.handlersLock.Unlock()

	if handler == nil {
		return
	}

	// If the handler hasn’t started (ctx still live), force the teardown so we
	// don’t leak a subscriber or a buffer nobody will ever drain.
	if handler.ctx.Err() == nil {
		handler.streamUpdates.Close()
		if err := handler.eventBus.EnqueueRemoveSubscriber(syncID); err != nil {
			handler.log.Errorw("failed to remove sync operation from the event bus", "error", err)
		}
		handler.cancel(nil)
	}
}

func (s *syncStreamHandlerRegistryImpl) New(
	ctx context.Context,
	syncID string,
	receiver Receiver,
) (SyncStreamHandler, error) {
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

	s.handlers[syncID] = handler

	return handler, nil
}
