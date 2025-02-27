package sync

import (
	"context"

	"github.com/towns-protocol/towns/core/node/crypto"
	. "github.com/towns-protocol/towns/core/node/events"
	. "github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/storage"
	"github.com/towns-protocol/towns/core/node/track_streams"
)

type AppRegistryTrackedStreamView struct {
	TrackedStreamViewImpl
	listener track_streams.StreamEventListener
	store    storage.AppRegistryStore
}

func (b *AppRegistryTrackedStreamView) onNewEvent(ctx context.Context, view *StreamView, event *ParsedEvent) error {
	streamId := view.StreamId()

	if streamId.Type() == shared.STREAM_USER_INBOX_BIN {
		// TODO: update app encrypted session keys, possibly triggering a flurry of webhook calls
		// that were queued up waiting for a particular session key
		return nil
	}

	// TODO: this list of "members" should be the list of app members in the channel. We
	// expect the StreamEventListener to make webhook calls for apps that meet "notification"
	// criteria for this channel message.
	members, err := view.GetChannelMembers()
	if err != nil {
		return err
	}

	b.listener.OnMessageEvent(ctx, *streamId, view.StreamParentId(), members, event)
	return nil
}

// NewTrackedStreamForAppRegistry constructs a TrackedStreamView instance from the given
// stream, and executes callbacks to ensure that all apps' cached key fulfillments are up to date,
// and that message events are sent to the supplied listener. It's expected that the stream cookie
// starts with a miniblock that contains a snapshot with stream members.
func NewTrackedStreamForAppRegistryService(
	ctx context.Context,
	streamID shared.StreamId,
	cfg crypto.OnChainConfiguration,
	stream *StreamAndCookie,
	listener track_streams.StreamEventListener,
	store storage.AppRegistryStore,
) (TrackedStreamView, error) {
	trackedView := &AppRegistryTrackedStreamView{
		listener: listener,
		store:    store,
	}
	_, err := trackedView.TrackedStreamViewImpl.Init(ctx, streamID, cfg, stream, trackedView.onNewEvent)
	if err != nil {
		return nil, err
	}

	// TODO: capture returned view above and update cache / storage with all group encryption sessions,
	// iff this is an app user inbox stream.

	return trackedView, nil
}
