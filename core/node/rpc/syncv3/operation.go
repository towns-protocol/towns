package syncv3

import (
	"context"
	"slices"
	"sync"
	"time"

	"github.com/puzpuzpuz/xsync/v4"
	"go.opentelemetry.io/otel/trace"

	. "github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/logging"
	. "github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/utils/dynmsgbuf"
)

const (
	// defaultCommandReplyTimeout is the default timeout for command replies in the sync operation.
	defaultCommandReplyTimeout = 30 * time.Second
)

// Operation represents a behavior of an individual sync operation.
type Operation interface {
	// ID returns the unique identifier of the operation.
	ID() string
	// OnStreamUpdate handles a stream update message.
	// It should be called when a stream update is received.
	OnStreamUpdate(*SyncStreamsResponse)
	// Modify modifies the operation with the given request.
	// It should be called by client to modify the operation.
	Modify(ctx context.Context, request *ModifySyncRequest) (*ModifySyncResponse, error)
	// Cancel cancels the given operation
	Cancel(ctx context.Context)
	// Ping pings the operation to keep it alive.
	Ping(ctx context.Context, nonce string)
	// DebugDropStream is a debug method to drop a specific stream from the sync operation.
	DebugDropStream(ctx context.Context, streamId StreamId) error
}

type command struct {
	ctx  context.Context
	req  *ModifySyncRequest
	resp chan *ModifySyncResponse
	err  chan error
}

func newCommand(ctx context.Context, req *ModifySyncRequest) *command {
	return &command{
		ctx:  ctx,
		req:  req,
		resp: make(chan *ModifySyncResponse, 1),
		err:  make(chan error, 1),
	}

}

// operation implements the Operation interface with the default sync logic.
type operation struct {
	// ctx is the context of the operation, it can be used to cancel the operation.
	ctx context.Context
	// cancel is the cancel function for the operation context.
	cancel context.CancelCauseFunc
	// id is the unique identifier of the operation.
	id string
	// rec is the receiver of stream updates.
	rec Receiver
	// streamUpdatesQueue is the stream updates queue for the operation.
	// When a stream update is received, it should be sent to the queue so the updates processor can handle them.
	streamUpdatesQueue *dynmsgbuf.DynamicBuffer[*SyncStreamsResponse]
	// cmdQueue is the queue for commands that can be processed by the operation.
	cmdQueue chan *command
	// syncerManager is the syncer manager that handles syncers and their states.
	syncerManager SyncerManager
	// streamCache is the stream cache.
	streamCache StreamCache
	// registry is the registry of sync operations and their state.
	registry Registry
	// initializingStreams contains a list of streams that are currently being initialized for this operation.
	// Meaning that a client added the given stream but the initial backfill message is not received yet,
	// and the client is waiting for this message to be received. No other messages should be sent for this stream
	// until the backfill is received. The value here is needed to avoid sending the same data multiple times.
	initializingStreams *xsync.Map[StreamId, struct{}]
	// otelTracer is used to traceoperations, tracing is disabled if nil.
	otelTracer trace.Tracer
}

// NewOperation creates a new instance of the Operation with the given ID.
func NewOperation(
	ctx context.Context,
	id string,
	rec Receiver,
	syncerManager SyncerManager,
	streamCache StreamCache,
	registry Registry,
	otelTracer trace.Tracer,
) Operation {
	ctx, cancel := context.WithCancelCause(ctx)

	op := &operation{
		ctx:                 ctx,
		cancel:              cancel,
		id:                  id,
		rec:                 rec,
		streamUpdatesQueue:  dynmsgbuf.NewDynamicBuffer[*SyncStreamsResponse](),
		cmdQueue:            make(chan *command, 100),
		syncerManager:       syncerManager,
		streamCache:         streamCache,
		registry:            registry,
		initializingStreams: xsync.NewMap[StreamId, struct{}](),
		otelTracer:          otelTracer,
	}

	go op.startCommandsProcessor()
	go op.startUpdatesProcessor()

	return op
}

// ID returns the unique identifier of the operation.
func (op *operation) ID() string {
	return op.id
}

// OnStreamUpdate handles a stream update message.
func (op *operation) OnStreamUpdate(msg *SyncStreamsResponse) {
	select {
	case <-op.ctx.Done():
	default:
		if err := op.streamUpdatesQueue.AddMessage(msg); err != nil {
			op.cancel(err)
		}
	}
}

// Modify modifies the operation with the given request.
func (op *operation) Modify(ctx context.Context, request *ModifySyncRequest) (*ModifySyncResponse, error) {
	// Perform an initial validation of the request before processing further.
	if err := ValidateModifySync(request); err != nil {
		return nil, err
	}

	cmd := newCommand(ctx, request)

	select {
	case op.cmdQueue <- cmd:
		select {
		case <-ctx.Done():
			return nil, RiverError(Err_CANCELED, "sync operation cancelled")
		case err := <-cmd.err:
			return nil, err
		case resp := <-cmd.resp:
			return resp, nil
		}
	case <-time.After(defaultCommandReplyTimeout):
		return nil, RiverError(Err_DEADLINE_EXCEEDED, "sync operation command queue full")
	case <-ctx.Done():
		return nil, AsRiverError(ctx.Err(), Err_CANCELED).Message("request context cancelled")
	case <-op.ctx.Done():
		return nil, AsRiverError(op.ctx.Err(), Err_CANCELED).Message("sync context cancelled")
	}
}

// Cancel cancels the given operation.
// The client connection will be closed in startUpdatesProcessor.
func (op *operation) Cancel(ctx context.Context) {
	op.OnStreamUpdate(&SyncStreamsResponse{SyncOp: SyncOp_SYNC_CLOSE})
	<-op.ctx.Done() // TODO: Add timeouts
}

// Ping pings the operation to keep it alive.
func (op *operation) Ping(ctx context.Context, nonce string) {
	op.OnStreamUpdate(&SyncStreamsResponse{
		SyncOp:    SyncOp_SYNC_PONG,
		PongNonce: nonce,
	})
}

// DebugDropStream is a debug method to drop a specific stream from the sync operation.
// The stream will be removed from the operation in startUpdatesProcessor.
func (op *operation) DebugDropStream(ctx context.Context, streamId StreamId) error {
	op.OnStreamUpdate(&SyncStreamsResponse{SyncOp: SyncOp_SYNC_DOWN, StreamId: streamId[:]})
	return nil
}

func (op *operation) modify(ctx context.Context, request *ModifySyncRequest) (*ModifySyncResponse, error) {
	var response ModifySyncResponse

	// Adding stream to the sync op. Scenarios:
	// 1. If the stream is already syncing for the given op, just backfill it(or skip?) - no syncer call.
	// 2. If the stream is already syncing for another op, add it to the current op and backfill it - no syncer call.
	// 3. If the stream is not syncing, add it to sync and ONLY after successful syncer call, add it to the registry.
	var (
		toAddStreams []*SyncCookie
		toBackfill   []*SyncCookie
	)
	for _, cookie := range request.GetAddStreams() {
		streamID := StreamId(cookie.GetStreamId())

		streamExists, added := op.registry.AddOpToExistingStream(streamID, op)
		if added {
			// Add the stream to the initializing streams map. See map description for more details about the logic.
			op.initializingStreams.LoadOrStore(streamID, struct{}{})

			// The already syncing stream was successfully added to the current operation. Backfill it.
			toBackfill = append(toBackfill, cookie)
		} else if !streamExists {
			// Add the stream to the initializing streams map. See map description for more details about the logic.
			op.initializingStreams.LoadOrStore(streamID, struct{}{})

			// The given stream is not syncing yet, so we need to add it to the syncer.
			// Add this list to the registry after a successful syncer manager call.
			toAddStreams = append(toAddStreams, cookie)
			// The given stream in not added to the given operation on a moment of adding it to the sync so the first
			// update is going to be skipped since the distribution will not identify the given operation as
			// the receiver of the first update most likely. Just backfill it after. OPTIMIZE IT LATER.
			toBackfill = append(toBackfill, cookie)
		}
	}

	// Just remove streams from the list of streams of the current operation.
	// Do not modify the syncer state here, since it is not needed.
	// It is done in a separate background process to avoid blocking the operation
	// and unnecessary state changes - other ops might want to re-subscribe or smth.
	for _, stream := range request.GetRemoveStreams() {
		op.registry.RemoveOpFromStream(StreamId(stream), op.id)
	}

	if len(toAddStreams) > 0 {
		// Start syncing streams that are not syncing yet and should be syncing.
		resp, err := op.syncerManager.Modify(ctx, &ModifySyncRequest{AddStreams: toAddStreams})
		if err != nil {
			rvrErr := AsRiverError(err)
			for _, cookie := range toAddStreams {
				// Remove the given stream from both lists since it was not added successfully.
				toBackfill = slices.DeleteFunc(toBackfill, func(c *SyncCookie) bool { return cookie.SameStream(c) })
				toAddStreams = slices.DeleteFunc(toAddStreams, func(c *SyncCookie) bool { return cookie.SameStream(c) })

				// Add the given stream to the list of streams that were not added successfully.
				response.Adds = append(response.Adds, &SyncStreamOpStatus{
					StreamId: cookie.GetStreamId(),
					Code:     int32(rvrErr.Code),
					Message:  rvrErr.GetMessage(),
				})
			}
		} else if len(resp.GetAdds()) > 0 {
			for _, status := range resp.GetAdds() {
				// Remove the given stream from both lists since it was not added successfully.
				toBackfill = slices.DeleteFunc(toBackfill, func(c *SyncCookie) bool { return c.SameStream(status) })
				toAddStreams = slices.DeleteFunc(toAddStreams, func(c *SyncCookie) bool { return c.SameStream(status) })

				// Add the given stream to the list of streams that were not added successfully.
				response.Adds = append(response.Adds, status)
			}
		}
	}

	// Add successfully added streams to the registry.
	for _, cookie := range toAddStreams {
		op.registry.AddOpToStream(StreamId(cookie.GetStreamId()), op)
	}

	if len(toBackfill) > 0 {
		// Backfill to make sure that all of newly added streams are up to date.
		// Optimize this logic later to be able to receive initial updates when adding stream first time.
		// The request must use the add list of streams to backfill - they will be automatically converted to
		// the backfill request in the syncer manager since they are already being syncing.
		resp, err := op.syncerManager.Modify(ctx, &ModifySyncRequest{SyncId: op.id, AddStreams: toBackfill})
		if err != nil {
			rvrErr := AsRiverError(err)
			for _, cookie := range toBackfill {
				op.registry.RemoveOpFromStream(StreamId(cookie.GetStreamId()), op.id)
				response.Adds = append(response.Adds, &SyncStreamOpStatus{
					StreamId: cookie.GetStreamId(),
					Code:     int32(rvrErr.Code),
					Message:  rvrErr.GetMessage(),
				})
			}
		} else if len(resp.GetAdds()) > 0 {
			for _, status := range resp.GetAdds() {
				op.registry.RemoveOpFromStream(StreamId(status.GetStreamId()), op.id)
				response.Adds = append(response.Adds, status)
			}
		}
	}

	// Backfill an explicit list of streams that are already syncing for the given operation and wants to be
	// backfilled by another node.
	statuses := op.localBackfill(ctx, request.TargetSyncIDs(), request.GetBackfillStreams().GetStreams())
	if len(statuses) > 0 {
		response.Backfills = append(response.Backfills, statuses...)
	}

	return &response, nil
}

// localBackfill backfills streams from the request assuming all of them are local.
// Requests are goiong to be timed out by the context if a sync is not local.
// This function can be called only when another node is trying to backfill streams for a client.
func (op *operation) localBackfill(ctx context.Context, targetSyncIDs []string, cookies []*SyncCookie) []*SyncStreamOpStatus {
	var (
		lock     sync.Mutex
		statuses []*SyncStreamOpStatus
		wg       sync.WaitGroup
	)

	if len(targetSyncIDs) == 0 {
		return nil
	}

	wg.Add(len(cookies))
	for _, cookie := range cookies {
		go func(cookie *SyncCookie) {
			defer wg.Done()

			// There could be a very rare case when the cookie is nil, just skip it instead of panicking.
			if cookie == nil {
				return
			}

			streamID := StreamId(cookie.GetStreamId())

			stream, err := op.streamCache.GetStreamWaitForLocal(ctx, streamID)
			if err != nil {
				rvrErr := AsRiverError(err)
				lock.Lock()
				statuses = append(statuses, &SyncStreamOpStatus{
					StreamId: cookie.GetStreamId(),
					Code:     int32(rvrErr.Code),
					Message:  rvrErr.GetMessage(),
				})
				lock.Unlock()
				return
			}

			if err = stream.UpdatesSinceCookie(ctx, cookie, func(streamAndCookie *StreamAndCookie) error {
				op.OnStreamUpdate(&SyncStreamsResponse{
					SyncOp:        SyncOp_SYNC_UPDATE,
					Stream:        streamAndCookie,
					TargetSyncIds: targetSyncIDs[1:],
				})
				return nil
			}); err != nil {
				rvrErr := AsRiverError(err)
				lock.Lock()
				statuses = append(statuses, &SyncStreamOpStatus{
					StreamId: cookie.GetStreamId(),
					Code:     int32(rvrErr.Code),
					Message:  rvrErr.GetMessage(),
				})
				lock.Unlock()
			}
		}(cookie)
	}
	wg.Wait()

	return statuses
}

// startCommandsProcessor starts the commands processor that handles incoming commands.
func (op *operation) startCommandsProcessor() {
	for {
		select {
		case <-op.ctx.Done():
			return
		case cmd := <-op.cmdQueue:
			resp, err := op.modify(cmd.ctx, cmd.req)
			if err != nil {
				// If the command failed, send the error to the command's error channel.
				cmd.err <- err
			} else {
				// If the command succeeded, send the response to the command's response channel.
				cmd.resp <- resp
			}
		}
	}
}

// startUpdatesProcessor starts the updates processor that sends stream updates to the receiver.
func (op *operation) startUpdatesProcessor() {
	var msgs []*SyncStreamsResponse
	for {
		select {
		case <-op.ctx.Done():
			return
		case _, open := <-op.streamUpdatesQueue.Wait():
			msgs = op.streamUpdatesQueue.GetBatch(msgs)

			// nil msgs indicates the buffer is closed.
			if msgs == nil {
				_ = op.rec.Send(&SyncStreamsResponse{
					SyncId: op.id,
					SyncOp: SyncOp_SYNC_CLOSE,
				})
				op.cancel(nil)
				return
			}

			for _, msg := range msgs {
				select {
				case <-op.ctx.Done():
					return
				default:
				}

				// Special cases depending on the message type that should be applied before sending the message.
				if msg.GetSyncOp() == SyncOp_SYNC_DOWN {
					streamID, err := StreamIdFromBytes(msg.StreamID())
					if err != nil {
						logging.FromCtx(op.ctx).Warnw("received invalid stream ID",
							"streamId", msg.GetStreamId(), "error", err)
						continue
					}

					// If the sync operation is a down operation, remove the operation from the stream.
					op.registry.RemoveOpFromStream(streamID, op.id)
				} else if msg.GetSyncOp() == SyncOp_SYNC_UPDATE {
					streamID, err := StreamIdFromBytes(msg.StreamID())
					if err != nil {
						logging.FromCtx(op.ctx).Warnw("received invalid stream ID",
							"streamId", msg.GetStreamId(), "error", err)
						continue
					}

					// Waiting for the backfill message to be sent first
					if _, exists := op.initializingStreams.Compute(
						streamID,
						func(_ struct{}, loaded bool) (struct{}, xsync.ComputeOp) {
							if !loaded {
								return struct{}{}, xsync.CancelOp
							}

							if len(msg.GetTargetSyncIds()) == 0 {
								return struct{}{}, xsync.CancelOp
							}

							return struct{}{}, xsync.DeleteOp

						},
					); exists {
						continue
					}
				}

				msg.SyncId = op.id
				if err := op.rec.Send(msg); err != nil {
					op.cancel(err)
					return
				}

				// Special cases depending on the message type that should be applied after sending the message.
				switch msg.GetSyncOp() {
				case SyncOp_SYNC_CLOSE:
					// Close the operation and return from the stream updates processor.
					op.cancel(nil)
					return
				}
			}

			// If the client sent a close message, stop sending messages to client from the buffer.
			// In theory should not happen, but just in case.
			if !open {
				_ = op.rec.Send(&SyncStreamsResponse{
					SyncId: op.id,
					SyncOp: SyncOp_SYNC_CLOSE,
				})
				op.cancel(nil)
				return
			}
		}
	}
}
