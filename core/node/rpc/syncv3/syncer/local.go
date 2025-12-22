package syncer

import (
	"context"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/trace"

	"github.com/towns-protocol/towns/core/node/events"
	"github.com/towns-protocol/towns/core/node/logging"
	. "github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/utils/dynmsgbuf"
)

const (
	// localStreamUpdateEmitterTimeout is the default timeout for operations in localStreamUpdateEmitter.
	localStreamUpdateEmitterTimeout = time.Second * 10
)

// localStreamUpdateEmitter is an implementation of the StreamUpdateEmitter interface that emits updates for a local
// stream.
type localStreamUpdateEmitter struct {
	cancel         context.CancelCauseFunc
	log            *logging.Log
	localAddr      common.Address
	stream         *events.Stream
	subscriber     StreamSubscriber
	backfillsQueue *dynmsgbuf.DynamicBuffer[*backfillRequest]
	// version is the version of the current emitter.
	// It is used to indicate which version of the syncer the update is sent from to avoid sending
	// sync down message for sync operations from another version of syncer.
	version    int
	otelTracer trace.Tracer
}

// NewLocalStreamUpdateEmitter creates a new local stream update emitter for the given stream ID.
// Context is used to control the lifetime (stopping emitter when context is done) of the emitter.
func NewLocalStreamUpdateEmitter(
	ctx context.Context,
	stream *events.Stream,
	localAddr common.Address,
	subscriber StreamSubscriber,
	version int,
	otelTracer trace.Tracer,
) (StreamUpdateEmitter, error) {
	ctx, cancel := context.WithCancelCause(ctx)
	l := &localStreamUpdateEmitter{
		cancel: cancel,
		log: logging.FromCtx(ctx).
			Named("syncv3.localStreamUpdateEmitter").
			With("addr", localAddr, "streamID", stream.StreamId(), "version", version),
		localAddr:      localAddr,
		stream:         stream,
		subscriber:     subscriber,
		backfillsQueue: dynmsgbuf.NewDynamicBuffer[*backfillRequest](),
		version:        version,
		otelTracer:     otelTracer,
	}

	ctxWithTimeout, ctxWithCancel := context.WithTimeout(ctx, localStreamUpdateEmitterTimeout)
	err := stream.SubNoCookie(ctxWithTimeout, l)
	ctxWithCancel()
	if err != nil {
		cancel(nil)
		return nil, err
	}

	go l.run(ctx)

	return l, nil
}

// OnUpdate implements events.SyncResultReceiver interface.
func (l *localStreamUpdateEmitter) OnUpdate(streamID StreamId, r *StreamAndCookie) {
	l.subscriber.OnStreamEvent(streamID, &SyncStreamsResponse{SyncOp: SyncOp_SYNC_UPDATE, Stream: r}, l.version)
}

// OnSyncDown implements events.SyncResultReceiver interface.
func (l *localStreamUpdateEmitter) OnSyncDown(StreamId) {
	l.log.Warn("local stream sync down")
	l.cancel(nil)
}

func (l *localStreamUpdateEmitter) StreamID() StreamId {
	return l.stream.StreamId()
}

func (l *localStreamUpdateEmitter) Node() common.Address {
	return l.localAddr
}

func (l *localStreamUpdateEmitter) Version() int {
	return l.version
}

func (l *localStreamUpdateEmitter) EnqueueBackfill(cookie *SyncCookie, syncIDs []string) bool {
	err := l.backfillsQueue.AddMessage(&backfillRequest{cookie: cookie, syncIDs: syncIDs})
	if err != nil {
		l.log.Errorw("failed to add backfill request to the queue", "error", err)
		l.cancel(err)
		return false
	}
	return true
}

func (l *localStreamUpdateEmitter) Close() {
	l.cancel(nil)
}

// run initializes and runs the local stream update emitter.
func (l *localStreamUpdateEmitter) run(ctx context.Context) {
	defer l.cleanup()

	var msgs []*backfillRequest
	for {
		select {
		case <-ctx.Done():
			return
		case <-l.backfillsQueue.Wait():
			msgs = l.backfillsQueue.GetBatch(msgs)

			// nil msgs indicates the buffer is closed.
			if msgs == nil {
				l.cancel(nil)
				return
			}

			// Messages must be processed in the order they were received.
			for i, msg := range msgs {
				// Context could be cancelled while processing messages so adding one more check here.
				if err := ctx.Err(); err != nil {
					l.reAddUnprocessedBackfills(msgs[i:])
					return
				}

				if err := l.processBackfillRequest(ctx, msg); err != nil {
					l.log.Errorw("failed to process backfill request", "cookie", msg.cookie, "error", err)
					l.cancel(err)
					l.reAddUnprocessedBackfills(msgs[i:])
					return
				}
			}
		}
	}
}

// reAddUnprocessedBackfills re-adds the given backfill requests back to the queue for further processing
// by the deferred cleanup function. Basically, in case of the emitter failure, given requests must be addressed
// by sending sync down message to the sync operations that requested them.
func (l *localStreamUpdateEmitter) reAddUnprocessedBackfills(msgs []*backfillRequest) {
	for _, m := range msgs {
		if err := l.backfillsQueue.AddMessage(m); err != nil {
			l.log.Errorw(
				"failed to re-add unprocessed backfill request to the queue",
				"cookie",
				m.cookie,
				"error",
				err,
			)
		}
	}
}

func (l *localStreamUpdateEmitter) cleanup() {
	remainingMsgs := l.backfillsQueue.CloseAndGetBatch()
	l.stream.Unsub(l)

	// Send a stream down message to all active syncs of the current syncer version via event bul.
	l.subscriber.OnStreamEvent(l.stream.StreamId(), &SyncStreamsResponse{
		SyncOp:   SyncOp_SYNC_DOWN,
		StreamId: l.stream.StreamId().Bytes(),
	}, l.version)

	// Send a stream down message to all pending syncs, i.e. those that are waiting for backfill.
	for _, msg := range remainingMsgs {
		l.subscriber.OnStreamEvent(l.stream.StreamId(), &SyncStreamsResponse{
			SyncOp:        SyncOp_SYNC_DOWN,
			StreamId:      l.stream.StreamId().Bytes(),
			TargetSyncIds: msg.syncIDs,
		}, l.version)
	}
}

// processBackfillRequest processes the given backfill request by fetching updates since the given cookie
// and sending the message back to the event bus for further forwarding to the specified sync operation.
func (l *localStreamUpdateEmitter) processBackfillRequest(ctx context.Context, msg *backfillRequest) error {
	if l.otelTracer != nil {
		var span trace.Span
		ctx, span = l.otelTracer.Start(ctx, "syncv3.syncer.localStreamUpdateEmitter.processBackfillRequest",
			trace.WithAttributes(
				attribute.String("streamID", l.stream.StreamId().String()),
				attribute.Int("version", l.version)))
		defer span.End()
	}

	ctxWithTimeout, cancel := context.WithTimeout(ctx, localStreamUpdateEmitterTimeout)
	defer cancel()

	return l.stream.UpdatesSinceCookie(
		ctxWithTimeout,
		&SyncCookie{
			NodeAddress:       l.localAddr.Bytes(),
			StreamId:          l.stream.StreamId().Bytes(),
			MinipoolGen:       msg.cookie.GetMinipoolGen(),
			PrevMiniblockHash: msg.cookie.GetPrevMiniblockHash(),
		},
		func(streamAndCookie *StreamAndCookie) error {
			l.subscriber.OnStreamEvent(l.stream.StreamId(), &SyncStreamsResponse{
				SyncOp:        SyncOp_SYNC_UPDATE,
				Stream:        streamAndCookie,
				TargetSyncIds: msg.syncIDs,
			}, l.version)
			return nil
		},
	)
}
