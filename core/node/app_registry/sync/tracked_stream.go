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
	store    EncryptedMessageStore
}

func (b *AppRegistryTrackedStreamView) processUserInboxMessage(ctx context.Context, event *ParsedEvent) error {
	log := logging.FromCtx(ctx)
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
			for deviceKey, cipherTexts := range deviceCipherTexts {
				log.Debugw(
					"Publishing session keys for device",
					"deviceKey",
					deviceKey,
					"streamId",
					streamId,
					"sessionIds",
					sessionIds,
				)
				if err := b.store.PublishSessionKeys(ctx, streamId, deviceKey, sessionIds, cipherTexts); err != nil {
					logging.FromCtx(ctx).Errorw(
						"Unable to publish session keys for device",
						"deviceKey",
						deviceKey,
						"streamId",
						streamId,
						"sessionIds",
						sessionIds,
					)
					return err
				}
			}
		}
	}
	return nil
}

func (b *AppRegistryTrackedStreamView) onNewEvent(ctx context.Context, view *StreamView, event *ParsedEvent) error {
	streamId := view.StreamId()
	log := logging.FromCtx(ctx)

	if streamId.Type() == shared.STREAM_USER_INBOX_BIN {
		return b.processUserInboxMessage(ctx, event)
	}

	members, err := view.GetChannelMembers()
	if err != nil {
		return err
	}
	appMembers := mapset.NewSet[string]()
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
		if b.store.HasRegisteredWebhook(ctx, memberAddress) {
			appMembers.Add(member)
		}
		return false
	})

	log.Debugw(
		"Witnessed channel message",
		"streamId",
		streamId,
		"members",
		members,
		"appMembers",
		appMembers,
		"event",
		event,
	)

	if appMembers.Cardinality() > 0 {
		log.Debugw("OnMessageEvent message", "streamId", streamId, "appMembers", appMembers, "event", event)
		log.Sync()
		b.listener.OnMessageEvent(ctx, *streamId, view.StreamParentId(), appMembers, event)
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
	store EncryptedMessageStore,
) (TrackedStreamView, error) {
	trackedView := &AppRegistryTrackedStreamView{
		listener: listener,
		store:    store,
	}
	view, err := trackedView.TrackedStreamViewImpl.Init(ctx, streamId, cfg, stream, trackedView.onNewEvent)
	if err != nil {
		return nil, err
	}

	if streamId.Type() == shared.STREAM_USER_INBOX_BIN {
		logging.FromCtx(ctx).Debugw("Detected user inbox stream", "streamId", view.StreamId())
		for event := range view.AllEvents() {
			if err := trackedView.processUserInboxMessage(ctx, event); err != nil {
				return nil, err
			}
		}
	}

	return trackedView, nil
}
