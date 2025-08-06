package syncer

import (
	"context"
	"sync"

	"github.com/ethereum/go-ethereum/common"

	. "github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/logging"
	"github.com/towns-protocol/towns/core/node/nodes"
	. "github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/shared"
)

// registryImpl is an implementation of the Registry interface.
type registryImpl struct {
	// ctx is the global node context.
	ctx context.Context
	// log is the logger for the registry.
	log *logging.Log
	// localAddr is the address of the current node.
	localAddr common.Address
	// streamCache is the global stream cache.
	streamCache StreamCache
	// nodeRegistry is the global node registry.
	nodeRegistry nodes.NodeRegistry
	// syncersLock is a mutex to protect the syncers map.
	syncersLock sync.Mutex
	// syncers is a map of stream IDs to their corresponding StreamUpdateEmitter instances.
	syncers map[StreamId]StreamUpdateEmitter
}

// NewRegistry creates a new instance of the Registry.
func NewRegistry(
	ctx context.Context,
	localAddr common.Address,
	streamCache StreamCache,
	nodeRegistry nodes.NodeRegistry,
) *registryImpl {
	return &registryImpl{
		ctx:          ctx,
		log:          logging.FromCtx(ctx).Named("syncv3.Registry"),
		localAddr:    localAddr,
		streamCache:  streamCache,
		nodeRegistry: nodeRegistry,
		syncers:      make(map[StreamId]StreamUpdateEmitter),
	}
}

// Subscribe subscribes a StreamSubscriber to the updates of the given streamID.
func (r *registryImpl) Subscribe(streamID StreamId, subscriber StreamSubscriber) {
	r.syncersLock.Lock()
	defer r.syncersLock.Unlock()

	emitter, ok := r.syncers[streamID]
	if !ok {
		var err error
		if emitter, err = r.createEmitterNoLock(streamID); err != nil {
			r.log.Errorw("failed to create stream emitter", "streamId", streamID, "error", err)
			r.sendStreamDown(streamID, subscriber)
			return
		}
	}

	emitter.Subscribe(subscriber)
}

// Unsubscribe unsubscribes a StreamSubscriber from the updates of the given streamID.
func (r *registryImpl) Unsubscribe(streamID StreamId, subscriber StreamSubscriber) {
	r.syncersLock.Lock()
	defer r.syncersLock.Unlock()

	if emitter, ok := r.syncers[streamID]; ok {
		emitter.Unsubscribe(subscriber)
	}
}

// Backfill sends a backfill request for the given targetSyncID to the corresponding StreamUpdateEmitter.
func (r *registryImpl) Backfill(cookie *SyncCookie, targetSyncID string) error {
	r.syncersLock.Lock()
	defer r.syncersLock.Unlock()

	streamID, err := StreamIdFromBytes(cookie.GetStreamId())
	if err != nil {
		return AsRiverError(err).
			Tag("streamID", cookie.GetStreamId()).
			Func("registryImpl.Backfill")
	}

	emitter, ok := r.syncers[streamID]
	if !ok {
		return RiverError(Err_NOT_FOUND, "stream emitter not found").
			Tag("streamID", streamID.String()).
			Func("registryImpl.Backfill")
	}

	if err = emitter.Backfill(cookie, targetSyncID); err != nil {
		return AsRiverError(err).
			Tag("streamID", streamID.String()).
			Tag("targetSyncID", targetSyncID).
			Func("registryImpl.Backfill")
	}

	return nil
}

// createEmitterNoLock creates a new StreamUpdateEmitter for the given streamID without acquiring the lock.
func (r *registryImpl) createEmitterNoLock(streamID StreamId) (StreamUpdateEmitter, error) {
	ctxWithTimeout, ctxWithCancel := context.WithTimeout(r.ctx, remoteStreamUpdateEmitterTimeout)
	defer ctxWithCancel()

	// Get stream remote nodes first
	stream, err := r.streamCache.GetStreamNoWait(ctxWithTimeout, streamID)
	if err != nil {
		return nil, AsRiverError(err).Func("registryImpl.createEmitter")
	}

	// Get current sticky peer address for the stream.
	// The sticky peer could be advanced by the emitter if a remote node is failed or unavailable.
	addr := stream.GetStickyPeer()

	// Create a new emitter based on whether the address is local or remote.
	var streamUpdateEmitter StreamUpdateEmitter
	if addr == r.localAddr {
		streamUpdateEmitter, err = NewLocalStreamUpdateEmitter(
			r.ctx,
			addr,
			r.streamCache,
			streamID,
			r.deleteEmitter(streamID),
		)
	} else {
		streamUpdateEmitter, err = NewRemoteStreamUpdateEmitter(
			r.ctx,
			addr,
			r.nodeRegistry,
			streamID,
			r.deleteEmitter(streamID),
		)
	}
	if err != nil {
		return nil, AsRiverError(err).Func("registryImpl.createEmitter")
	}

	// Store the given emitter in the registry without acquiring the lock.
	// This function is called with the lock already held, so we can safely add it to the map.
	r.syncers[streamID] = streamUpdateEmitter

	return streamUpdateEmitter, nil
}

// deleteEmitter returns a function that deletes the emitter for the given streamID from the registry.
// The returned function is passed as a callback and called when the emitter is closed or no longer needed.
func (r *registryImpl) deleteEmitter(streamID StreamId) func() {
	return func() {
		r.syncersLock.Lock()
		delete(r.syncers, streamID)
		r.syncersLock.Unlock()
	}
}

// sendStreamDown sends a stream down message to the given subscriber for the specified streamID.
func (r *registryImpl) sendStreamDown(streamID StreamId, subscriber StreamSubscriber) {
	subscriber.OnStreamEvent(&SyncStreamsResponse{SyncOp: SyncOp_SYNC_DOWN, StreamId: streamID[:]})
}
