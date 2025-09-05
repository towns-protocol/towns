package syncer

import (
	"context"
	"sync"

	"github.com/ethereum/go-ethereum/common"

	"github.com/towns-protocol/towns/core/node/logging"
	"github.com/towns-protocol/towns/core/node/nodes"
	. "github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/utils/dynmsgbuf"
)

var _ Registry = (*registryImpl)(nil)

type registryMsgSubAndBackfill struct {
	cookie  *SyncCookie
	syncIDs []string
}

type registryMsgUnsub struct {
	streamID StreamId
}

type registryMsg struct {
	subAndBackfill *registryMsgSubAndBackfill
	unsub          *registryMsgUnsub
}

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
	// queue of sync registry commands.
	queue *dynmsgbuf.DynamicBuffer[*registryMsg]
}

// NewRegistry creates a new instance of the Registry.
func NewRegistry(
	ctx context.Context,
	localAddr common.Address,
	streamCache StreamCache,
	nodeRegistry nodes.NodeRegistry,
	subscriber StreamSubscriber,
) Registry {
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

	go func() {
		if err := r.run(); err != nil {
			r.log.Errorw("sync registry stopped with error", "error", err)
		} else {
			r.log.Info("sync registry stopped")
		}
	}()

	return r
}

func (r *registryImpl) SubscribeAndBackfill(cookie *SyncCookie, syncIDs []string) {
	err := r.queue.AddMessage(
		&registryMsg{subAndBackfill: &registryMsgSubAndBackfill{cookie: cookie, syncIDs: syncIDs}},
	)
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

func (r *registryImpl) run() error {
	var msgs []*registryMsg
	for {
		select {
		case <-r.ctx.Done():
			return r.ctx.Err()
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
				return nil
			}
		}
	}
}

func (r *registryImpl) processSubscribeAndBackfill(cookie *SyncCookie, syncIDs []string) {
	streamID, err := StreamIdFromBytes(cookie.GetStreamId())
	if err != nil {
		r.log.Errorw("invalid stream ID in cookie", "streamID", cookie.GetStreamId(), "error", err)
		return
	}

	r.syncersLock.Lock()
	defer r.syncersLock.Unlock()

	emitter, ok := r.syncers[streamID]
	if !ok {
		emitter = newSharedStreamUpdateEmitter(
			r.ctx,
			r.localAddr,
			r.streamCache,
			r.nodeRegistry,
			r.subscriber,
			streamID,
			1,
		)
		r.syncers[streamID] = emitter
	}

	if !emitter.Backfill(cookie, syncIDs) {
		currentVersion := emitter.Version()
		emitter = newSharedStreamUpdateEmitter(
			r.ctx,
			r.localAddr,
			r.streamCache,
			r.nodeRegistry,
			r.subscriber,
			streamID,
			currentVersion+1,
		)
		r.syncers[streamID] = emitter

		if !emitter.Backfill(cookie, syncIDs) {
			r.log.Errorw("failed to backfill after recreating stream emitter", "streamID", streamID)
			r.subscriber.OnStreamEvent(
				&SyncStreamsResponse{SyncOp: SyncOp_SYNC_DOWN, StreamId: streamID[:], TargetSyncIds: syncIDs},
				0,
			)
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
