package sync

import (
	"context"
	"encoding/hex"

	mapset "github.com/deckarep/golang-set/v2"
	"github.com/ethereum/go-ethereum/common"

	"github.com/towns-protocol/towns/core/node/crypto"
	. "github.com/towns-protocol/towns/core/node/events"
	"github.com/towns-protocol/towns/core/node/logging"
	. "github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/track_streams"
)

type AppRegistryTrackedStreamView struct {
	TrackedStreamViewImpl
	listener track_streams.StreamEventListener
	queue    EncryptedMessageQueue
}

func (b *AppRegistryTrackedStreamView) processUserInboxMessage(ctx context.Context, event *ParsedEvent) error {
	// Capture keys sent to the app's inbox and store them in the message cache so that
	// we can dequeue any existing messages that require decryption this session, and immediately
	// forward incoming messages with the same session id.
	if payload := event.Event.GetUserInboxPayload(); payload != nil {
		if groupEncryptionSessions := payload.GetGroupEncryptionSessions(); groupEncryptionSessions != nil {
			sessionIds := groupEncryptionSessions.GetSessionIds()
			deviceCipherTexts := groupEncryptionSessions.GetCiphertexts()
			streamId, err := shared.StreamIdFromBytes(groupEncryptionSessions.StreamId)
			if err != nil {
				return err
			}
			envelopeBytes, err := event.GetEnvelopeBytes()
			if err != nil {
				return err
			}
			for deviceKey := range deviceCipherTexts {
				if err := b.queue.PublishSessionKeys(ctx, streamId, deviceKey, sessionIds, envelopeBytes); err != nil {
					return err
				}
			}
		}
	}
	return nil
}

func (b *AppRegistryTrackedStreamView) onNewEvent(ctx context.Context, view *StreamView, event *ParsedEvent) error {
	streamId := view.StreamId()
	log := logging.FromCtx(ctx).With("func", "AppRegistryTrackedStreamView.onNewEvent", "streamId", view.StreamId())

	if streamId.Type() == shared.STREAM_USER_INBOX_BIN {
		if err := b.processUserInboxMessage(ctx, event); err != nil {
			log.Errorw("Error processing user inbox message", "err", err)
			return err
		}
		return nil
	}

	members, err := view.GetChannelMembers()
	if err != nil {
		return err
	}
	apps := mapset.NewSet[string]()
	members.Each(func(member string) bool {
		// Trim 0x prefix
		if len(member) > 2 && member[:2] == "0x" {
			member = member[2:]
		}

		bytes, err := hex.DecodeString(member)
		if err != nil {
			log.Errorw("Error decoding hex of channel member address", "member", member, "error", err)
			return false
		}
		memberAddress := common.BytesToAddress(bytes)
		isForwardable, _, err := b.queue.IsForwardableApp(ctx, memberAddress)
		if err != nil {
			log.Errorw(
				"Error determining if member address is an app with registered webhook",
				"error",
				err,
				"memberAddress",
				memberAddress,
				"streamId",
				streamId,
			)
		} else if isForwardable {
			apps.Add(member)
		}
		return false
	})

	if apps.Cardinality() > 0 {
		b.listener.OnMessageEvent(ctx, *streamId, view.StreamParentId(), apps, event)
	}

	return nil
}

// NewTrackedStreamForAppRegistry constructs a TrackedStreamView instance from the given
// stream, and executes callbacks to ensure that all apps' cached key fulfillments are up to date,
// and that message events are sent to the supplied listener. It's expected that the stream cookie
// starts with a miniblock that contains a snapshot with stream members.
func NewTrackedStreamForAppRegistryService(
	ctx context.Context,
	streamId shared.StreamId,
	cfg crypto.OnChainConfiguration,
	stream *StreamAndCookie,
	listener track_streams.StreamEventListener,
	store EncryptedMessageQueue,
) (TrackedStreamView, error) {
	trackedView := &AppRegistryTrackedStreamView{
		listener: listener,
		queue:    store,
	}
	view, err := trackedView.TrackedStreamViewImpl.Init(ctx, streamId, cfg, stream, trackedView.onNewEvent)
	if err != nil {
		return nil, err
	}

	if streamId.Type() == shared.STREAM_USER_INBOX_BIN {
		for event := range view.AllEvents() {
			if err := trackedView.processUserInboxMessage(ctx, event); err != nil {
				return nil, err
			}
		}
	}

	return trackedView, nil
}
