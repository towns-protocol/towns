package syncv3

import (
	"context"
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
	// eventBus is the event bus that handles stream updates and commands.
	eventBus EventBus
	// operationRegistry is the registry of sync operations and their state.
	operationRegistry OperationRegistry
	// initializingStreams contains a list of streams that are currently being initialized for this operation.
	// Meaning that a client added the given stream but the initial backfill message is not received yet,
	// and the client is waiting for this message to be received. No other messages should be sent for this stream
	// until the backfill is received. The value here is needed to avoid sending the same data multiple times.
	initializingStreams *xsync.Map[StreamId, struct{}]
	// otelTracer is used to trace operations, tracing is disabled if nil.
	otelTracer trace.Tracer
}

// NewOperation creates a new instance of the Operation with the given ID.
func NewOperation(
	ctx context.Context,
	id string,
	rec Receiver,
	eventBus EventBus,
	operationRegistry OperationRegistry,
	otelTracer trace.Tracer,
) Operation {
	ctx, cancel := context.WithCancelCause(ctx)

	op := &operation{
		ctx:                 ctx,
		cancel:              cancel,
		id:                  id,
		rec:                 rec,
		eventBus:            eventBus,
		operationRegistry:   operationRegistry,
		streamUpdatesQueue:  dynmsgbuf.NewDynamicBuffer[*SyncStreamsResponse](),
		cmdQueue:            make(chan *command, 100),
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
	if err := validateModifySync(request); err != nil {
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

	// Send messages to the event bus to add streams to the given sync
	for _, cookie := range request.GetAddStreams() {
		op.initializingStreams.Store(StreamId(cookie.GetStreamId()), struct{}{})
		err := op.eventBus.OnUpdate(*NewEventBusMessageSubscribe(op, cookie))
		if err != nil {
			rvrErr := AsRiverError(err)
			response.Adds = append(response.Adds, &SyncStreamOpStatus{
				StreamId: cookie.GetStreamId(),
				Code:     int32(rvrErr.Code),
				Message:  rvrErr.GetMessage(),
			})
		}
	}

	// Send messages to the event bus to remove streams from the given sync
	for _, stream := range request.GetRemoveStreams() {
		err := op.eventBus.OnUpdate(*NewEventBusMessageUnsubscribe(op, StreamId(stream)))
		if err != nil {
			rvrErr := AsRiverError(err)
			response.Removals = append(response.Removals, &SyncStreamOpStatus{
				StreamId: stream,
				Code:     int32(rvrErr.Code),
				Message:  rvrErr.GetMessage(),
			})
		}
	}

	// Backfill streams
	if streams := request.GetBackfillStreams(); len(streams.GetStreams()) > 0 {
		for _, cookie := range streams.GetStreams() {
			err := op.eventBus.OnUpdate(*NewEventBusMessageBackfill(op, request.GetSyncId(), cookie))
			if err != nil {
				rvrErr := AsRiverError(err)
				response.Backfills = append(response.Backfills, &SyncStreamOpStatus{
					StreamId: cookie.GetStreamId(),
					Code:     int32(rvrErr.Code),
					Message:  rvrErr.GetMessage(),
				})
			}
		}
	}

	return &response, nil
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
					op.operationRegistry.RemoveOpFromStream(streamID, op.id)
					op.initializingStreams.Delete(streamID)
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

					if len(msg.GetTargetSyncIds()) > 0 {
						msg.TargetSyncIds = msg.TargetSyncIds[1:]
					}
				}

				msg.SyncId = op.id
				if err := op.rec.Send(msg); err != nil {
					op.cancel(err)
					return
				}

				// Special cases depending on the message type that should be applied after sending the message.
				if msg.GetSyncOp() == SyncOp_SYNC_CLOSE {
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
