package syncer

import (
	"context"
	"sync"
	"time"

	"github.com/ethereum/go-ethereum/common"

	. "github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/logging"
	"github.com/towns-protocol/towns/core/node/nodes"
	. "github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/shared"
)

var (
	_ Registry = (*registryImpl)(nil)
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
	// subscriber is the StreamSubscriber that receives updates from all syncers.
	subscriber StreamSubscriber
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
	subscriber StreamSubscriber,
) *registryImpl {
	return &registryImpl{
		ctx: ctx,
		log: logging.FromCtx(ctx).
			Named("syncv3.Registry").
			With("addr", localAddr),
		localAddr:    localAddr,
		streamCache:  streamCache,
		nodeRegistry: nodeRegistry,
		subscriber:   subscriber,
		syncers:      make(map[StreamId]StreamUpdateEmitter),
	}
}

// Subscribe subscribes a StreamSubscriber to the updates of the given streamID.
func (r *registryImpl) Subscribe(streamID StreamId) {
	r.syncersLock.Lock()
	defer r.syncersLock.Unlock()

	if _, ok := r.syncers[streamID]; !ok {
		var err error
		if _, err = r.createEmitterNoLock(streamID, 1); err != nil {
			r.log.Errorw("failed to create stream emitter", "streamID", streamID, "error", err)
			r.sendStreamDown(streamID)
			return
		}
	}
}

// Unsubscribe unsubscribes a StreamSubscriber from the updates of the given streamID.
func (r *registryImpl) Unsubscribe(streamID StreamId) {
	r.syncersLock.Lock()
	defer r.syncersLock.Unlock()

	if emitter, ok := r.syncers[streamID]; ok {
		emitter.Close()
		delete(r.syncers, streamID)
	}
}

// Backfill sends a backfill request for the given syncIDs to the corresponding StreamUpdateEmitter.
func (r *registryImpl) Backfill(cookie *SyncCookie, syncIDs []string) error {
	r.syncersLock.Lock()
	defer r.syncersLock.Unlock()

	streamID, err := StreamIdFromBytes(cookie.GetStreamId())
	if err != nil {
		return AsRiverError(err).
			Tag("streamID", cookie.GetStreamId()).Func("registryImpl.Backfill")
	}

	emitter, ok := r.syncers[streamID]
	if !ok {
		emitter, err = r.createEmitterNoLock(streamID, 1)
		if err != nil {
			return AsRiverError(err).
				Tag("streamID", streamID).Func("registryImpl.Backfill")
		}
	}

	if !emitter.Backfill(cookie, syncIDs) {
		currentVersion := emitter.Version()
		emitter, err = r.createEmitterNoLock(streamID, currentVersion+1)
		if err != nil {
			return AsRiverError(err).
				Tag("streamID", streamID).Func("registryImpl.Backfill")
		}

		if !emitter.Backfill(cookie, syncIDs) {
			return RiverError(Err_NOT_FOUND, "failed to create a new stream updates emitter").
				Tag("streamID", streamID).Func("registryImpl.Backfill")
		}
	}

	return nil
}

// createEmitterNoLock creates a new StreamUpdateEmitter for the given streamID without acquiring the lock.
func (r *registryImpl) createEmitterNoLock(streamID StreamId, version int32) (StreamUpdateEmitter, error) {
	ctxWithTimeout, ctxWithCancel := context.WithTimeout(r.ctx, 20*time.Second)
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
		streamUpdateEmitter = NewLocalStreamUpdateEmitter(
			r.ctx,
			addr,
			r.streamCache,
			streamID,
			r.subscriber,
			version,
		)
	} else {
		streamUpdateEmitter = NewRemoteStreamUpdateEmitter(
			r.ctx,
			addr,
			r.nodeRegistry,
			streamID,
			r.subscriber,
			version,
		)
	}

	// Store the given emitter in the registry without acquiring the lock.
	// This function is called with the lock already held, so we can safely add it to the map.
	r.syncers[streamID] = streamUpdateEmitter

	return streamUpdateEmitter, nil
}

// sendStreamDown sends a stream down message to the given subscriber for the specified streamID.
func (r *registryImpl) sendStreamDown(streamID StreamId) {
	r.subscriber.OnStreamEvent(&SyncStreamsResponse{SyncOp: SyncOp_SYNC_DOWN, StreamId: streamID[:]}, 0)
}
