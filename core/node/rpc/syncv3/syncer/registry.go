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
	"github.com/towns-protocol/towns/core/node/utils/dynmsgbuf"
)

var (
	_ Registry = (*registryImpl)(nil)
)

type (
	registryMsgSubAndBackfill struct {
		cookie  *SyncCookie
		syncIDs []string
	}

	registryMsgUnsub struct {
		streamID StreamId
	}
	registryMsg struct {
		subAndBackfill *registryMsgSubAndBackfill
		unsub          *registryMsgUnsub
	}

	// registryImpl is an implementation of the Registry interface.
	registryImpl struct {
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
		// queue of sync registry commands.
		queue *dynmsgbuf.DynamicBuffer[*registryMsg]
	}
)

// NewRegistry creates a new instance of the Registry.
func NewRegistry(
	ctx context.Context,
	localAddr common.Address,
	streamCache StreamCache,
	nodeRegistry nodes.NodeRegistry,
	subscriber StreamSubscriber,
) *registryImpl {
	r := &registryImpl{
		ctx: ctx,
		log: logging.FromCtx(ctx).
			Named("syncv3.registry").
			With("addr", localAddr),
		localAddr:    localAddr,
		streamCache:  streamCache,
		nodeRegistry: nodeRegistry,
		subscriber:   subscriber,
		syncers:      make(map[StreamId]StreamUpdateEmitter),
		queue:        dynmsgbuf.NewDynamicBuffer[*registryMsg](),
	}
	go r.run()
	return r
}

func (r *registryImpl) SubscribeAndBackfill(cookie *SyncCookie, syncIDs []string) {
	err := r.queue.AddMessage(&registryMsg{subAndBackfill: &registryMsgSubAndBackfill{cookie: cookie, syncIDs: syncIDs}})
	if err != nil {
		streamID, _ := StreamIdFromBytes(cookie.GetStreamId())
		r.log.Errorw("failed to enqueue subscribe-and-backfill request", "streamID", streamID, "error", err)
		r.subscriber.OnStreamEvent(&SyncStreamsResponse{SyncOp: SyncOp_SYNC_DOWN, StreamId: cookie.GetStreamId()}, 0)
	}
}

func (r *registryImpl) Unsubscribe(streamID StreamId) {
	err := r.queue.AddMessage(&registryMsg{unsub: &registryMsgUnsub{streamID: streamID}})
	if err != nil {
		r.log.Errorw("failed to enqueue unsubscribe request", "streamID", streamID, "error", err)
	}
}
func (r *registryImpl) run() {
	var msgs []*registryMsg
	for {
		select {
		case <-r.ctx.Done():
			return
		case _, open := <-r.queue.Wait():
			msgs = r.queue.GetBatch(msgs)

			// Messages must be processed in the order they were received.
			for _, msg := range msgs {
				if msg.subAndBackfill != nil {
					r.processSubscribeAndBackfill(msg.subAndBackfill.cookie, msg.subAndBackfill.syncIDs)
				} else if msg.unsub != nil {
					r.processUnsubscribe(msg.unsub.streamID)
				}
			}

			if !open {
				r.log.Error("sync registry queue closed, stopping the registry")
				return
			}
		}
	}
}

func (r *registryImpl) processSubscribeAndBackfill(cookie *SyncCookie, syncIDs []string) {
	r.syncersLock.Lock()
	defer r.syncersLock.Unlock()

	streamID, err := StreamIdFromBytes(cookie.GetStreamId())
	if err != nil {
		r.log.Errorw("invalid stream ID in cookie", "streamID", cookie.GetStreamId(), "error", err)
		return
	}

	emitter, ok := r.syncers[streamID]
	if !ok {
		emitter, err = r.createEmitterNoLock(streamID, 1)
		if err != nil {
			r.log.Errorw("failed to create stream emitter for backfill", "streamID", streamID, "error", err)
			r.subscriber.OnStreamEvent(&SyncStreamsResponse{SyncOp: SyncOp_SYNC_DOWN, StreamId: streamID[:], TargetSyncIds: syncIDs}, 0)
			return
		}
	}

	if !emitter.Backfill(cookie, syncIDs) {
		currentVersion := emitter.Version()
		emitter, err = r.createEmitterNoLock(streamID, currentVersion+1)
		if err != nil {
			r.log.Errorw("failed to recreate stream emitter for backfill", "streamID", streamID, "error", err)
			r.subscriber.OnStreamEvent(&SyncStreamsResponse{SyncOp: SyncOp_SYNC_DOWN, StreamId: streamID[:], TargetSyncIds: syncIDs}, 0)
			return
		}

		if !emitter.Backfill(cookie, syncIDs) {
			r.log.Errorw("failed to backfill after recreating stream emitter", "streamID", streamID)
			r.subscriber.OnStreamEvent(&SyncStreamsResponse{SyncOp: SyncOp_SYNC_DOWN, StreamId: streamID[:], TargetSyncIds: syncIDs}, 0)
			return
		}
	}
}

func (r *registryImpl) processUnsubscribe(streamID StreamId) {
	r.syncersLock.Lock()
	defer r.syncersLock.Unlock()

	if emitter, ok := r.syncers[streamID]; ok {
		emitter.Close()
		delete(r.syncers, streamID)
	}
}

// createEmitterNoLock creates a new StreamUpdateEmitter for the given streamID without acquiring the lock.
func (r *registryImpl) createEmitterNoLock(streamID StreamId, version int32) (StreamUpdateEmitter, error) {
	ctxWithTimeout, ctxWithCancel := context.WithTimeout(r.ctx, 20*time.Second)
	defer ctxWithCancel()

	// Get stream remote nodes first
	stream, err := r.streamCache.GetStreamNoWait(ctxWithTimeout, streamID)
	if err != nil {
		return nil, AsRiverError(err).Func("registryImpl.createEmitterNoLock")
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
