package syncer

import (
	"context"
	"sync"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/trace"

	"github.com/towns-protocol/towns/core/node/logging"
	"github.com/towns-protocol/towns/core/node/nodes"
	. "github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/shared"
)

const (
	// sharedStreamUpdateEmitterTimeout is the default timeout for operations in sharedStreamUpdateEmitter.
	sharedStreamUpdateEmitterTimeout = time.Second * 10
)

// sharedStreamUpdateEmitter is an implementation of the StreamUpdateEmitter interface that
// initializes either a local or remote emitter based on the stream location in a background.
// While the emitter is being initialized, backfill requests are queued in a dynamic buffer so the
// caller can immediately start processing backfills.
type sharedStreamUpdateEmitter struct {
	log  *logging.Log
	lock sync.Mutex
	// backfills is the queue of backfill requests that are received while the emitter is being initialized.
	// If the emitter initialization fails, the queue is set to nil to indicate that no further backfill.
	backfills []*backfillRequest
	emitter   StreamUpdateEmitter
	streamID  StreamId
	version   int
}

func newSharedStreamUpdateEmitter(
	ctx context.Context,
	localAddr common.Address,
	streamCache StreamCache,
	nodeRegistry nodes.NodeRegistry,
	subscriber StreamSubscriber,
	streamID StreamId,
	version int,
	otelTracer trace.Tracer,
) *sharedStreamUpdateEmitter {
	emitter := &sharedStreamUpdateEmitter{
		log: logging.FromCtx(ctx).
			Named("syncv3.sharedStreamUpdateEmitter").
			With("version", version, "streamID", streamID),
		backfills: make([]*backfillRequest, 0),
		streamID:  streamID,
		version:   version,
	}

	// Initialize emitter in a separate goroutine to avoid blocking caller.
	go emitter.run(ctx, localAddr, streamCache, nodeRegistry, subscriber, otelTracer)

	return emitter
}

func (s *sharedStreamUpdateEmitter) run(
	ctx context.Context,
	localAddr common.Address,
	streamCache StreamCache,
	nodeRegistry nodes.NodeRegistry,
	subscriber StreamSubscriber,
	otelTracer trace.Tracer,
) {
	if otelTracer != nil {
		var span trace.Span
		ctx, span = otelTracer.Start(ctx, "syncv3.syncer.sharedStreamUpdateEmitter.run",
			trace.WithAttributes(
				attribute.String("streamID", s.streamID.String()),
				attribute.Int("version", s.version)))
		defer span.End()
	}

	ctxWithTimeout, ctxWithCancel := context.WithTimeout(ctx, sharedStreamUpdateEmitterTimeout)
	defer ctxWithCancel()

	var backfills []*backfillRequest

	stream, err := streamCache.GetStreamNoWait(ctxWithTimeout, s.streamID)
	if err != nil {
		s.log.With("error", err).Error("failed to get stream for further emitter initialization")

		s.lock.Lock()
		backfills = s.backfills
		s.backfills = nil
		s.lock.Unlock()

		for _, br := range backfills {
			subscriber.OnStreamEvent(
				&SyncStreamsResponse{SyncOp: SyncOp_SYNC_DOWN, StreamId: s.streamID[:], TargetSyncIds: br.syncIDs},
				PendingSubscribersVersion,
			)
		}
		return
	}

	var emitter StreamUpdateEmitter
	if stream.IsLocal() {
		emitter, err = NewLocalStreamUpdateEmitter(
			ctx,
			stream,
			localAddr,
			subscriber,
			s.version,
			otelTracer,
		)
	} else {
		emitter, err = NewRemoteStreamUpdateEmitter(
			ctx,
			stream,
			nodeRegistry,
			subscriber,
			s.version,
			otelTracer,
		)
	}
	if err != nil {
		s.log.With("error", err).Error("failed to create stream updates emitter")

		s.lock.Lock()
		backfills = s.backfills
		s.backfills = nil
		s.lock.Unlock()

		for _, br := range backfills {
			subscriber.OnStreamEvent(
				&SyncStreamsResponse{SyncOp: SyncOp_SYNC_DOWN, StreamId: s.streamID[:], TargetSyncIds: br.syncIDs},
				PendingSubscribersVersion,
			)
		}
		return
	}

	s.lock.Lock()
	s.emitter = emitter
	backfills = s.backfills
	s.backfills = nil
	s.lock.Unlock()

	for _, br := range backfills {
		if !s.emitter.EnqueueBackfill(br.cookie, br.syncIDs) {
			subscriber.OnStreamEvent(
				&SyncStreamsResponse{SyncOp: SyncOp_SYNC_DOWN, StreamId: s.streamID[:], TargetSyncIds: br.syncIDs},
				PendingSubscribersVersion,
			)
		}
	}
}

func (s *sharedStreamUpdateEmitter) StreamID() StreamId {
	return s.streamID
}

func (s *sharedStreamUpdateEmitter) Node() common.Address {
	s.lock.Lock()
	defer s.lock.Unlock()

	if s.emitter != nil {
		return s.emitter.Node()
	}

	return common.Address{}
}

func (s *sharedStreamUpdateEmitter) Version() int {
	return s.version
}

func (s *sharedStreamUpdateEmitter) EnqueueBackfill(cookie *SyncCookie, syncIDs []string) bool {
	s.lock.Lock()
	defer s.lock.Unlock()

	// If emitter is initialized (not nil), forward backfill request to it.
	if s.emitter != nil {
		return s.emitter.EnqueueBackfill(cookie, syncIDs)
	}

	// If the backfill queue is nil, it means the emitter initialization has failed, so just returns false
	// to let the caller know that the backfill request cannot be executed.
	if s.backfills == nil {
		return false
	}

	s.backfills = append(s.backfills, &backfillRequest{
		cookie:  cookie,
		syncIDs: syncIDs,
	})

	return true
}

func (s *sharedStreamUpdateEmitter) Close() {
	s.lock.Lock()
	if s.emitter != nil {
		s.emitter.Close()
	}
	s.lock.Unlock()
}
