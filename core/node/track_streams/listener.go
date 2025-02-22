package track_streams

import (
	"context"

	mapset "github.com/deckarep/golang-set/v2"

	. "github.com/towns-protocol/towns/core/node/events"

	"github.com/towns-protocol/towns/core/node/shared"
)

// The StreamEventListener listens to new events emitted by the stream tracker for streams
// of interest. OnMessageEvent will be called from multiple go routines and must be thread-safe.
type StreamEventListener interface {
	OnMessageEvent(
		ctx context.Context,
		streamID shared.StreamId,
		parentStreamID *shared.StreamId, // only
		members mapset.Set[string],
		event *ParsedEvent,
	)
}
