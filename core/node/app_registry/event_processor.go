package app_registry

import (
	"bytes"
	"context"
	"encoding/hex"
	"slices"

	mapset "github.com/deckarep/golang-set/v2"
	"github.com/ethereum/go-ethereum/common"

	"github.com/towns-protocol/towns/core/node/app_registry/types"
	"github.com/towns-protocol/towns/core/node/events"
	"github.com/towns-protocol/towns/core/node/logging"
	. "github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/shared"
)

type MessageToAppProcessor struct {
	cache *CachedEncryptedMessageQueue
}

func NewAppMessageProcessor(
	ctx context.Context,
	cache *CachedEncryptedMessageQueue,
) *MessageToAppProcessor {
	return &MessageToAppProcessor{
		cache: cache,
	}
}

func listIncludesUser(
	userList [][]byte,
	user common.Address,
) bool {
	return slices.ContainsFunc(userList, func(addr []byte) bool {
		return bytes.Equal(addr, user[:])
	})
}

func isMentioned(
	app common.Address,
	groupMentions []GroupMentionType,
	mentionedUsers [][]byte,
) bool {
	if slices.Contains(groupMentions, GroupMentionType_GROUP_MENTION_TYPE_AT_CHANNEL) {
		return true
	}

	return listIncludesUser(mentionedUsers, app)
}

func shouldForwardSpaceChannelMessage(
	appUserId common.Address,
	settings types.AppSettings,
	tags *Tags,
) bool {
	// NO_MESSAGES means no forwarding whatsoever.
	if settings.ForwardSetting == ForwardSettingValue_FORWARD_SETTING_NO_MESSAGES {
		return false
	}

	// ALL_MESSAGES means we forward everything - tips, trades, redactions...
	if settings.ForwardSetting == ForwardSettingValue_FORWARD_SETTING_ALL_MESSAGES {
		return true
	}

	msgInteractionType := tags.GetMessageInteractionType()
	// UNSPECIFIED and MENTIONS_REPLIES_REACTIONS work the same way - messages are only
	// forwarded if the bot is explicitly mentioned, or if the message is a reaction, reply
	mentioned := isMentioned(appUserId, tags.GetGroupMentionTypes(), tags.GetMentionedUserAddresses())
	tags.GetGroupMentionTypes()
	isParticipating := listIncludesUser(tags.GetParticipatingUserAddresses(), appUserId)
	return mentioned ||
		(isParticipating && (msgInteractionType == MessageInteractionType_MESSAGE_INTERACTION_TYPE_REACTION ||
			msgInteractionType == MessageInteractionType_MESSAGE_INTERACTION_TYPE_REPLY ||
			msgInteractionType == MessageInteractionType_MESSAGE_INTERACTION_TYPE_TIP))
}

// Extract the encryption session from a stream event if it has a payload which contains encrypted data.
func getEncryptionSession(event *events.ParsedEvent) string {
	if message := event.GetEncryptedMessage(); message != nil {
		return hex.EncodeToString(message.SessionIdBytes)
	}

	switch payload := event.Event.Payload.(type) {
	case *StreamEvent_MemberPayload:
		{
			switch content := payload.MemberPayload.Content.(type) {
			case *MemberPayload_DisplayName:
				return hex.EncodeToString(content.DisplayName.SessionIdBytes)
			case *MemberPayload_Username:
				return hex.EncodeToString(content.Username.SessionIdBytes)

			case *MemberPayload_EncryptionAlgorithm_:
			case *MemberPayload_KeyFulfillment_:
			case *MemberPayload_KeySolicitation_:
			case *MemberPayload_MemberBlockchainTransaction_:
			case *MemberPayload_Membership_:
			case *MemberPayload_Nft_:
			case *MemberPayload_Pin_:
			case *MemberPayload_Unpin_:
			}
		}
	}
	return ""
}

func (p *MessageToAppProcessor) OnMessageEvent(
	ctx context.Context,
	channelId shared.StreamId,
	spaceId *shared.StreamId,
	members mapset.Set[string],
	event *events.ParsedEvent,
) {
	log := logging.FromCtx(ctx).With("func", "MessageToAppProcessor.OnMessageEvent")

	creator := common.BytesToAddress(event.Event.CreatorAddress)
	isApp, err := p.cache.IsApp(ctx, creator)
	if err != nil {
		log.Errorw(
			"Error determining if event creatorAddress is an app",
			"creatorAddress",
			event.Event.CreatorAddress,
			"error",
			err,
			"event",
			event,
		)
		return
	}

	// Do not forward bot-authored events
	if isApp {
		return
	}

	appIds := make([]common.Address, 0, members.Cardinality())
	members.Each(func(memberId string) bool {
		appId := common.HexToAddress(memberId)
		isForwardable, settings, err := p.cache.IsForwardableApp(ctx, appId)
		if err != nil {
			log.Errorw(
				"Error checking if member is a registered app that can receive forwarded messages",
				"error",
				err,
				"appId",
				appId,
				"event",
				event,
			)
		} else if isForwardable && shouldForwardSpaceChannelMessage(appId, settings, event.Event.Tags) {
			appIds = append(appIds, appId)
		}

		return false
	})
	streamEnvelope, err := event.GetEnvelopeBytes()
	if err != nil {
		log.Errorw("Error marshaling stream envelope", "event", event, "streamId", channelId, "spaceId", spaceId)
		return
	}

	// The cache is also a broker that will dispatch sendable messages to the appropriate
	// consumers in order to make webhook calls to app services.
	if err := p.cache.DispatchOrEnqueueMessages(
		ctx,
		appIds,
		getEncryptionSession(event),
		channelId,
		streamEnvelope,
	); err != nil {
		log.Errorw(
			"Error enqueueing messages for stream event",
			"event",
			event,
			"streamId",
			channelId,
			"spaceId",
			spaceId,
			"error",
			err,
		)
	}
}
