package sync

import (
	"context"

	"github.com/towns-protocol/towns/core/node/crypto"
	. "github.com/towns-protocol/towns/core/node/events"
	. "github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/track_streams"
)

type botRegistryTrackedStreamView struct {
	TrackedStreamViewImpl
	listener track_streams.StreamEventListener
}

func (b *botRegistryTrackedStreamView) onNewEvent(ctx context.Context, view *StreamView, event *ParsedEvent) error {
	streamId := view.StreamId()
	if streamId.Type() == shared.STREAM_USER_INBOX_BIN {
		// TODO: update bot key fulfillments, possibly triggering a flurry of webhook calls
		// that were queued up waiting for a particular fulfillment for a particular channel
		return nil
	}

	// TODO: this list of "members" should be the list of bot members in the channel. We
	// expect the StreamEventListener to make webhook calls for bots that meet "notification"
	// criteria for this channel message.
	members, err := view.GetChannelMembers()
	if err != nil {
		return err
	}

	b.listener.OnMessageEvent(ctx, *streamId, view.StreamParentId(), members, event)
	return nil
}

// NewTrackedStreamForBotRegistry constructs a TrackedStreamView instance from the given
// stream, and executes callbacks to ensure that all bots' cached key fulfillments are up to date,
// and that message events are sent to the supplied listener. It's expected that the stream cookie
// starts with a miniblock that contains a snapshot with stream members.
func NewTrackedStreamForBotRegistryService(
	ctx context.Context,
	streamID shared.StreamId,
	cfg crypto.OnChainConfiguration,
	stream *StreamAndCookie,
	listener track_streams.StreamEventListener,
) (TrackedStreamView, error) {
	trackedView := &botRegistryTrackedStreamView{
		listener: listener,
	}
	_, err := trackedView.TrackedStreamViewImpl.Init(ctx, streamID, cfg, stream, trackedView.onNewEvent)
	if err != nil {
		return nil, err
	}

	// TODO: capture returned view above and update cache / storage with all new key fulfillments,
	// iff this is a bot user inbox stream.

	return trackedView, nil
}
