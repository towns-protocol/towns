package syncer

import (
	"context"
	"sync"

	"github.com/ethereum/go-ethereum/common"
	"go.opentelemetry.io/otel/trace"

	"github.com/towns-protocol/towns/core/node/infra"
	"github.com/towns-protocol/towns/core/node/logging"
	"github.com/towns-protocol/towns/core/node/nodes"
	. "github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/utils/dynmsgbuf"
)

const (
	// PendingSubscribersVersion is the version number assigned to pending subscribers of a stream.
	// When a new subscriber subscribes to a stream updates but the beckfill message from a specific emitter
	// is not received yet, we assign emitter version 0 to that subscriber unit the backfill is received.
	PendingSubscribersVersion = 0
	// AllSubscribersVersion is the version number used to indicate that an update should be sent to all subscribers.
	AllSubscribersVersion = -1

	// InitialEmitterVersion is the initial version assigned to a newly created emitter.
	InitialEmitterVersion = 1
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
	ctx          context.Context
	log          *logging.Log
	localAddr    common.Address
	streamCache  StreamCache
	nodeRegistry nodes.NodeRegistry
	subscriber   StreamSubscriber
	syncersLock  sync.Mutex
	syncers      map[StreamId]StreamUpdateEmitter
	queue        *dynmsgbuf.DynamicBuffer[*registryMsg]
	otelTracer   trace.Tracer
}

// NewRegistry creates a new instance of the Registry.
func NewRegistry(
	ctx context.Context,
	localAddr common.Address,
	streamCache StreamCache,
	nodeRegistry nodes.NodeRegistry,
	subscriber StreamSubscriber,
	metrics infra.MetricsFactory,
	otelTracer trace.Tracer,
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
		queue:        dynmsgbuf.NewUnboundedDynamicBuffer[*registryMsg](),
		otelTracer:   otelTracer,
	}

	go func() {
		if err := r.run(); err != nil {
			r.log.Errorw("sync registry stopped with error", "error", err)
		} else {
			r.log.Info("sync registry stopped")
		}
	}()

	r.runMetricsCollector(metrics)

	return r
}

func (r *registryImpl) EnqueueSubscribeAndBackfill(cookie *SyncCookie, syncIDs []string) {
	err := r.queue.AddMessage(
		&registryMsg{subAndBackfill: &registryMsgSubAndBackfill{cookie: cookie, syncIDs: syncIDs}},
	)
	if err != nil {
		// This should never happen as the queue is unbounded. If it does, log the error with the stream ID for easier debugging.
		streamID, _ := StreamIdFromBytes(cookie.GetStreamId())
		r.log.Errorw("failed to enqueue subscribe-and-backfill request", "streamID", streamID, "error", err)
	}
}

func (r *registryImpl) EnqueueUnsubscribe(streamID StreamId) {
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
		case <-r.queue.Wait():
			msgs = r.queue.GetBatch(msgs)

			// Messages must be processed in the order they were received.
			for _, msg := range msgs {
				if msg.subAndBackfill != nil {
					r.processSubscribeAndBackfill(msg.subAndBackfill.cookie, msg.subAndBackfill.syncIDs)
				} else if msg.unsub != nil {
					r.processUnsubscribe(msg.unsub.streamID)
				}
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
			InitialEmitterVersion,
			r.otelTracer,
		)
		r.syncers[streamID] = emitter

		if !emitter.EnqueueBackfill(cookie, syncIDs) {
			r.log.Errorw("failed to backfill after recreating stream emitter", "streamID", streamID)
			emitter.Close()
		}
	} else {
		// Trying to backfill using the existing emitter.
		// If it fails, creating a new emitter with an incremented version and trying again.
		if !emitter.EnqueueBackfill(cookie, syncIDs) {
			currentVersion := emitter.Version()
			emitter = newSharedStreamUpdateEmitter(
				r.ctx,
				r.localAddr,
				r.streamCache,
				r.nodeRegistry,
				r.subscriber,
				streamID,
				currentVersion+1,
				r.otelTracer,
			)
			r.syncers[streamID] = emitter

			if !emitter.EnqueueBackfill(cookie, syncIDs) {
				r.log.Errorw("failed to backfill after recreating stream emitter", "streamID", streamID)
				emitter.Close()
			}
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
