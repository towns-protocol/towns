package syncv3

import (
	"context"

	"github.com/ethereum/go-ethereum/common"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/trace"

	. "github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/events"
	. "github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/shared"
)

// validateModifySync validates the ModifySyncRequest to ensure it is well-formed.
func validateModifySync(req *ModifySyncRequest) error {
	// Make sure the request is not empty
	if len(req.GetAddStreams()) == 0 && len(req.GetRemoveStreams()) == 0 && len(req.GetBackfillStreams().GetStreams()) == 0 {
		return RiverError(Err_INVALID_ARGUMENT, "Empty modify sync request")
	}

	// Prevent duplicates in the backfill list
	seen := make(map[StreamId]struct{})
	for _, c := range req.GetBackfillStreams().GetStreams() {
		streamId, err := StreamIdFromBytes(c.GetStreamId())
		if err != nil {
			return RiverError(Err_INVALID_ARGUMENT, "Invalid stream in backfill list")
		}

		if _, exists := seen[streamId]; exists {
			return RiverError(Err_INVALID_ARGUMENT, "Duplicate stream in backfill list")
		}
		seen[streamId] = struct{}{}
	}

	// Prevent duplicates in the add list
	seen = make(map[StreamId]struct{}, len(req.GetAddStreams()))
	for _, c := range req.GetAddStreams() {
		streamId, err := StreamIdFromBytes(c.GetStreamId())
		if err != nil {
			return RiverError(Err_INVALID_ARGUMENT, "Invalid stream in add list")
		}

		if _, exists := seen[streamId]; exists {
			return RiverError(Err_INVALID_ARGUMENT, "Duplicate stream in add list")
		}
		seen[streamId] = struct{}{}
	}

	// Prevent duplicates in the remove list
	removeSeen := make(map[StreamId]struct{}, len(req.GetRemoveStreams()))
	for _, s := range req.GetRemoveStreams() {
		streamId, err := StreamIdFromBytes(s)
		if err != nil {
			return RiverError(Err_INVALID_ARGUMENT, "Invalid stream in remove list")
		}

		if _, exists := removeSeen[streamId]; exists {
			return RiverError(Err_INVALID_ARGUMENT, "Duplicate stream in remove list")
		}
		removeSeen[streamId] = struct{}{}

		if _, exists := seen[streamId]; exists {
			return RiverError(Err_INVALID_ARGUMENT, "Stream in remove list is also in add list")
		}
	}

	return nil
}

// otelSender is a wrapper around the Receiver that adds OpenTelemetry tracing to the Send method.
type otelSender struct {
	ctx        context.Context
	otelTracer trace.Tracer
	sender     Receiver
}

func (s *otelSender) Send(msg *SyncStreamsResponse) error {
	_, span := s.otelTracer.Start(s.ctx, "SyncStreamsResponse")
	defer span.End()

	streamIdBytes := msg.GetStreamId()
	if streamIdBytes == nil {
		streamIdBytes = msg.Stream.GetNextSyncCookie().GetStreamId()
	}
	if streamIdBytes != nil {
		id, err := StreamIdFromBytes(streamIdBytes)
		if err == nil {
			span.SetAttributes(attribute.String("streamId", id.String()))
		}
	}
	span.SetAttributes(
		attribute.String("syncOp", msg.GetSyncOp().String()),
		attribute.String("syncId", msg.GetSyncId()),
	)

	err := s.sender.Send(msg)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
	}
	return err
}

// Stream represents the behavior of a stream.
// This abstraction is created to allow better unit testing the code.
type Stream interface {
	GetRemotesAndIsLocal() ([]common.Address, bool)
	GetStickyPeer() common.Address
	AdvanceStickyPeer(currentPeer common.Address) common.Address
	UpdatesSinceCookie(ctx context.Context, cookie *SyncCookie, callback func(streamAndCookie *StreamAndCookie) error) error
	Sub(ctx context.Context, cookie *SyncCookie, r events.SyncResultReceiver) error
	Unsub(r events.SyncResultReceiver)
	StreamId() StreamId
}

// StreamCache represents a behavior of the stream cache.
// This abstraction is created to allow better unit testing the code.
type StreamCache interface {
	GetStreamWaitForLocal(ctx context.Context, streamId StreamId) (Stream, error)
	GetStreamNoWait(ctx context.Context, streamId StreamId) (Stream, error)
}

// StreamCacheWrapper is a wrapper around the events.StreamCache that implements the StreamCache interface.
// This is created to be able to unit test the code that uses StreamCache without relying on the actual events.StreamCache implementation.
type StreamCacheWrapper struct {
	cache *events.StreamCache
}

// NewStreamCacheWrapper creates a new StreamCacheWrapper instance from the given events.StreamCache.
func NewStreamCacheWrapper(cache *events.StreamCache) StreamCache {
	return &StreamCacheWrapper{cache: cache}
}

func (scw *StreamCacheWrapper) GetStreamWaitForLocal(ctx context.Context, streamId StreamId) (Stream, error) {
	return scw.cache.GetStreamWaitForLocal(ctx, streamId)
}

func (scw *StreamCacheWrapper) GetStreamNoWait(ctx context.Context, streamId StreamId) (Stream, error) {
	return scw.cache.GetStreamNoWait(ctx, streamId)
}
