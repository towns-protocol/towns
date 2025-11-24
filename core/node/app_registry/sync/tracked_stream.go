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
	// we can dequeue any existing messages that require decryption for this session, and
	// can now immediately forward incoming messages with the same session id.
	log := logging.FromCtx(ctx).With("func", "AppRegistryTrackedStreamView.processUserInboxMessage")
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
				log.Infow(
					"Publishing session keys for bot",
					"streamId", streamId,
					"deviceKey", deviceKey,
					"sessionIdCount", len(sessionIds),
					"sessionIds", sessionIds,
				)
				if err := b.queue.PublishSessionKeys(ctx, streamId, deviceKey, sessionIds, envelopeBytes); err != nil {
					log.Errorw(
						"Failed to publish session keys",
						"error",
						err,
						"streamId",
						streamId,
						"deviceKey",
						deviceKey,
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
	log := logging.FromCtx(ctx).With("func", "AppRegistryTrackedStreamView.onNewEvent", "streamId", view.StreamId())

	// Track whether this stream has bot members (for selective cookie persistence)
	hadBotMembers := false

	if streamId.Type() == shared.STREAM_USER_INBOX_BIN {
		if err := b.processUserInboxMessage(ctx, event); err != nil {
			log.Errorw("Error processing user inbox message", "error", err)
			return err
		}
		// User inbox streams for bots should have cookies persisted
		hadBotMembers = b.isBotInboxStream(ctx, *streamId)
	} else {
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
				log.Infow(
					"Found forwardable app in channel",
					"appAddress", memberAddress.Hex(),
					"streamId", streamId,
				)
				apps.Add(member)
			}
			return false
		})

		if apps.Cardinality() > 0 {
			hadBotMembers = true
			log.Infow(
				"Channel event detected for forwarding to bots",
				"streamId", streamId,
				"eventHash", hex.EncodeToString(event.Hash[:]),
				"appCount", apps.Cardinality(),
				"apps", apps.ToSlice(),
				"eventCreator", hex.EncodeToString(event.Event.CreatorAddress),
			)
			b.listener.OnMessageEvent(ctx, *streamId, view.StreamParentId(), apps, event)
		} else {
			log.Infow("No forwardable apps found in channel members", "streamId", streamId)
		}
	}

	// Persist sync cookie if this stream has bot members
	if hadBotMembers {
		b.persistSyncCookie(ctx, *streamId)
	}

	return nil
}

// isBotInboxStream checks if a user inbox stream belongs to a registered bot
func (b *AppRegistryTrackedStreamView) isBotInboxStream(ctx context.Context, streamId shared.StreamId) bool {
	log := logging.FromCtx(ctx)

	// Extract user address from inbox stream ID
	// User inbox streams have format: [STREAM_USER_INBOX_BIN (1 byte)][user address (20 bytes)][padding (11 bytes)]
	if streamId.Type() != shared.STREAM_USER_INBOX_BIN {
		return false
	}

	// Extract the 20-byte address starting at byte 1
	userAddress := common.BytesToAddress(streamId[1:21])

	// Check if this user is a registered bot
	isApp, err := b.queue.IsApp(ctx, userAddress)
	if err != nil {
		log.Warnw("Failed to check if user is a bot",
			"streamId", streamId,
			"userAddress", userAddress,
			"error", err)
		return false
	}

	return isApp
}

// persistSyncCookie attempts to persist the sync cookie for a stream (fire-and-forget)
func (b *AppRegistryTrackedStreamView) persistSyncCookie(ctx context.Context, streamId shared.StreamId) {
	log := logging.FromCtx(ctx)

	// Extract cookie from context
	cookie := track_streams.SyncCookieFromContext(ctx)
	if cookie == nil {
		log.Debugw("No sync cookie in context, skipping persistence", "streamId", streamId)
		return
	}

	// Persist cookie asynchronously to avoid blocking event processing
	go func() {
		// Create a detached context for the background operation
		// nolint:contextcheck // This is intentional - we want persistence to continue even if parent context is cancelled
		bgCtx := context.TODO()

		if err := b.queue.PersistSyncCookie(bgCtx, streamId, cookie.MinipoolGen, cookie.PrevMiniblockHash); err != nil {
			log.Warnw("Failed to persist sync cookie",
				"streamId", streamId,
				"minipoolGen", cookie.MinipoolGen,
				"error", err)
		} else {
			log.Debugw("Persisted sync cookie",
				"streamId", streamId,
				"minipoolGen", cookie.MinipoolGen)
		}
	}()
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
