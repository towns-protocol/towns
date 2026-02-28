package notifications

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"slices"
	"time"

	"go.uber.org/zap"

	"github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/crypto"

	mapset "github.com/deckarep/golang-set/v2"
	"github.com/ethereum/go-ethereum/common"
	"github.com/sideshow/apns2/payload"
	"google.golang.org/protobuf/proto"

	"github.com/towns-protocol/towns/core/config"
	"github.com/towns-protocol/towns/core/node/events"
	"github.com/towns-protocol/towns/core/node/logging"
	"github.com/towns-protocol/towns/core/node/notifications/apps"
	"github.com/towns-protocol/towns/core/node/notifications/push"
	"github.com/towns-protocol/towns/core/node/notifications/types"
	. "github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/shared"
)

// MaxWebPushAllowedNotificationStreamEventPayloadSize is the max length of a serialized stream
// event that is included in the notification payload. If the event is larger it must not be
// included because the push service will likely refuse it. Clients must support notifications
// without the stream event and show the user the notification without the decrypted contents.
// Deep linking should still be possible with the remaining meta-data.
const MaxWebPushAllowedNotificationStreamEventPayloadSize = 3 * 1024

// MaxAPNAllowedNotificationStreamEventPayloadSize is the max length of a serialized stream
// event that is included in Apple push notification payload. If the event is larger it must not
// be included because the push service will refuse it. Clients must support notifications without
// the stream event and show the user the notification without the decrypted contents. Deep
// linking should still be possible with the remaining meta-data.
// https://developer.apple.com/documentation/usernotifications/generating-a-remote-notification
//
// Note: this value is too high. When APN returns a http 413 the notification is sent again
// with the stream event dropped. This is a limit that we know will fail due to this error
// and immediately strip the stream event from the notification payload before trying it.
const MaxAPNAllowedNotificationStreamEventPayloadSize = 4096

// MessageToNotificationsProcessor implements events.StreamEventListener and for each stream event determines
// if it needs to send a notification, to who and sends it.
type MessageToNotificationsProcessor struct {
	ctx                    context.Context
	cache                  UserPreferencesStore
	subscriptionExpiration time.Duration
	notifier               push.MessageNotifier
	log                    *logging.Log
}

// NewNotificationMessageProcessor processes incoming messages, determines when and to whom to send a notification
// for a processed message and sends it.
func NewNotificationMessageProcessor(
	ctx context.Context,
	userPreferences UserPreferencesStore,
	config config.NotificationsConfig,
	notifier push.MessageNotifier,
) *MessageToNotificationsProcessor {
	subscriptionExpiration := 90 * 24 * time.Hour // 90 days default
	if config.SubscriptionExpirationDuration > time.Duration(0) {
		subscriptionExpiration = config.SubscriptionExpirationDuration
	}

	return &MessageToNotificationsProcessor{
		ctx:                    ctx,
		notifier:               notifier,
		cache:                  userPreferences,
		subscriptionExpiration: subscriptionExpiration,
		log:                    logging.FromCtx(ctx),
	}
}

// OnMessageEvent sends a notification to the given user for the given event when needed.
//
// Note: there is room for an optimization for (large) space channels to keep a list of members that have subscribed
// to messages or replies and reactions and use that list to iterate over the group members to determine to who send a
// notification instead of walking over the entire member list for each message.
func (p *MessageToNotificationsProcessor) OnMessageEvent(
	ctx context.Context,
	channelID shared.StreamId,
	spaceID *shared.StreamId,
	members mapset.Set[string],
	event *events.ParsedEvent,
) {
	l := p.log.With(
		"channel", channelID,
		"event", event.Hash,
		"members", members.String(),
		"eventCreator", common.BytesToAddress(event.Event.CreatorAddress),
	)
	if spaceID != nil {
		l = l.With("space", *spaceID)
	}
	l.Debugw("Process event")

	kind := "new_message"
	tags := event.Event.GetTags()

	switch tags.GetMessageInteractionType() {
	case MessageInteractionType_MESSAGE_INTERACTION_TYPE_TIP:
		kind = "tip"
	case MessageInteractionType_MESSAGE_INTERACTION_TYPE_REPLY:
		kind = "reply_to"
	case MessageInteractionType_MESSAGE_INTERACTION_TYPE_REACTION:
		kind = "reaction"
	case MessageInteractionType_MESSAGE_INTERACTION_TYPE_UNSPECIFIED:
		kind = "new_message"
	case MessageInteractionType_MESSAGE_INTERACTION_TYPE_POST:
		kind = "new_message"
	case MessageInteractionType_MESSAGE_INTERACTION_TYPE_TRADE:
		kind = "trade"
	case MessageInteractionType_MESSAGE_INTERACTION_TYPE_EDIT:
		return
	case MessageInteractionType_MESSAGE_INTERACTION_TYPE_REDACTION:
		return
	case MessageInteractionType_MESSAGE_INTERACTION_TYPE_SLASH_COMMAND:
		return
	}

	usersToNotify := make(map[common.Address]*types.UserPreferences)
	recipients := mapset.NewSet[common.Address]()
	sender := common.BytesToAddress(event.Event.CreatorAddress)

	if slices.Contains(tags.GetGroupMentionTypes(), GroupMentionType_GROUP_MENTION_TYPE_AT_CHANNEL) {
		kind = "@channel"
	}

	members.Each(func(member string) bool {
		var (
			participant = common.HexToAddress(member)
			pref, err   = p.cache.GetUserPreferences(ctx, participant)
		)

		if slices.ContainsFunc(tags.GetMentionedUserAddresses(), func(member []byte) bool {
			return bytes.Equal(member, participant[:])
		}) {
			kind = "mention"
		}

		if err != nil {
			p.log.Warnw("Unable to retrieve user preference to determine if notification must be send",
				"channel", channelID,
				"event", event.Hash,
				"error", err,
			)
			return false
		}

		//
		// There are 3 global rules that apply to DM, GDM, and Space channel messages
		// 1. never receive a notification for your own message
		// 2. never receive a notification when the user hasn't subscribed (web/apn push)
		// 3. never receive a notification for a message from a blocked user
		//

		if sender == participant {
			return false
		}

		if !pref.HasSubscriptions() {
			p.log.Debugw("User hasn't subscribed for notifications",
				"user", participant, "event", event.Hash)
			return false
		}

		blocked := p.cache.IsBlocked(participant, sender)
		if blocked {
			p.log.Debugw("Message creator was blocked", "user", participant, "blocked_user", sender)
			return false
		}

		switch payload := event.Event.Payload.(type) {
		case *StreamEvent_DmChannelPayload:
			if p.onDMChannelPayload(channelID, participant, pref, event) {
				usersToNotify[participant] = pref
				kind = "direct_message"
			}
			recipients.Add(participant)
		case *StreamEvent_GdmChannelPayload:
			if p.onGDMChannelPayload(channelID, participant, pref, event) {
				usersToNotify[participant] = pref
			}
			recipients.Add(participant)
		case *StreamEvent_ChannelPayload:
			if spaceID != nil {
				if p.onSpaceChannelPayload(*spaceID, channelID, participant, pref, event) {
					usersToNotify[participant] = pref
				}
				recipients.Add(participant)
			} else {
				p.log.Errorw("Space channel misses spaceID", "channel", channelID)
			}
		case *StreamEvent_MemberPayload:
			switch payload.MemberPayload.Content.(type) {
			// for member payloads we need to figure out what kind of stream we're in before we can check prefs
			case *MemberPayload_MemberBlockchainTransaction_:
				if spaceID != nil && shared.ValidChannelStreamId(&channelID) {
					if p.onSpaceChannelPayload(*spaceID, channelID, participant, pref, event) {
						usersToNotify[participant] = pref
					}
					recipients.Add(participant)
				} else if shared.ValidDMChannelStreamId(&channelID) {
					if p.onDMChannelPayload(channelID, participant, pref, event) {
						usersToNotify[participant] = pref
					}
					recipients.Add(participant)
				} else if shared.ValidGDMChannelStreamId(&channelID) {
					if p.onGDMChannelPayload(channelID, participant, pref, event) {
						usersToNotify[participant] = pref
					}
					recipients.Add(participant)
				} else {
					p.log.Errorw("Unexpected stream ID", "channel", channelID)
				}
			}
		}

		return false
	})

	recipients.Remove(sender)

	for user, userPref := range usersToNotify {
		p.sendNotification(ctx, user, userPref, spaceID, channelID, event, kind, members)
	}
}

func (p *MessageToNotificationsProcessor) onDMChannelPayload(
	streamID shared.StreamId,
	participant common.Address,
	userPref *types.UserPreferences,
	event *events.ParsedEvent,
) bool {
	if dmChannelPayload, ok := event.Event.Payload.(*StreamEvent_DmChannelPayload); ok {
		if dmChannelPayload.DmChannelPayload.GetMessage() == nil {
			return false // inception
		}
	}

	if userPref.WantsNotificationForDMMessage(streamID) {
		return true
	}

	p.log.Debugw("User has doesn't want to receive notification for DM message",
		"user", participant,
		"channel", streamID,
		"event", event.Hash)

	return false
}

func isMentioned(
	participant common.Address,
	groupMentions []GroupMentionType,
	mentionedUsers [][]byte,
) bool {
	if slices.Contains(groupMentions, GroupMentionType_GROUP_MENTION_TYPE_AT_CHANNEL) {
		return true
	}

	return slices.ContainsFunc(mentionedUsers, func(addr []byte) bool {
		return bytes.Equal(addr, participant[:])
	})
}

func isParticipating(
	participant common.Address,
	participatingUsers [][]byte,
) bool {
	return slices.ContainsFunc(participatingUsers, func(addr []byte) bool {
		return bytes.Equal(addr, participant[:])
	})
}

func (p *MessageToNotificationsProcessor) onGDMChannelPayload(
	streamID shared.StreamId,
	participant common.Address,
	userPref *types.UserPreferences,
	event *events.ParsedEvent,
) bool {
	if gdmChannelPayload, ok := event.Event.Payload.(*StreamEvent_GdmChannelPayload); ok {
		if gdmChannelPayload.GdmChannelPayload.GetMessage() == nil {
			return false // inception or channel properties
		}
	}

	tags := event.Event.GetTags()
	messageInteractionType := tags.GetMessageInteractionType()
	mentioned := isMentioned(participant, tags.GetGroupMentionTypes(), tags.GetMentionedUserAddresses())
	participating := isParticipating(participant, tags.GetParticipatingUserAddresses())

	if userPref.WantsNotificationForGDMMessage(streamID, mentioned, participating, messageInteractionType) {
		return true
	}

	p.log.Debugw("User don't want to receive notification for GDM message",
		"user", participant,
		"channel", streamID,
		"event", event.Hash,
		"mentioned", mentioned,
		"messageType", messageInteractionType)

	return false
}

func (p *MessageToNotificationsProcessor) onSpaceChannelPayload(
	spaceID shared.StreamId,
	channelID shared.StreamId,
	participant common.Address,
	userPref *types.UserPreferences,
	event *events.ParsedEvent,
) bool {
	if streamChannelPayload, ok := event.Event.Payload.(*StreamEvent_ChannelPayload); ok {
		if streamChannelPayload.ChannelPayload.GetMessage() == nil {
			return false // inception or channel properties
		}
	}

	tags := event.Event.GetTags()
	messageInteractionType := event.Event.GetTags().GetMessageInteractionType()
	mentioned := isMentioned(participant, tags.GetGroupMentionTypes(), tags.GetMentionedUserAddresses())
	participating := isParticipating(participant, tags.GetParticipatingUserAddresses())

	// for non-reaction events send a notification to all users
	if userPref.WantNotificationForSpaceChannelMessage(
		spaceID,
		channelID,
		mentioned,
		participating,
		messageInteractionType,
	) {
		return true
	}

	p.log.Debugw("User doesn't want to receive notification for space channel message",
		"user", participant,
		"space", spaceID,
		"channel", channelID,
		"event", event.Hash,
		"mentioned", mentioned,
		"messageType", messageInteractionType)

	return false
}

func (p *MessageToNotificationsProcessor) apnPayloadV1(
	channelID shared.StreamId,
	spaceID *shared.StreamId,
	event *events.ParsedEvent,
	kind string,
	receivers []string,
) (map[string]interface{}, error) {
	eventBytes, err := proto.Marshal(event.Event)
	if err != nil {
		return nil, base.AsRiverError(err, Err_INTERNAL)
	}

	apnPayload := map[string]interface{}{
		"channelId":      hex.EncodeToString(channelID[:]),
		"kind":           kind,
		"senderId":       common.BytesToAddress(event.Event.CreatorAddress),
		"payloadVersion": int(NotificationPushVersion_NOTIFICATION_PUSH_VERSION_1),
	}

	eventBytesHex := hex.EncodeToString(eventBytes)
	if len(eventBytesHex) <= MaxAPNAllowedNotificationStreamEventPayloadSize {
		apnPayload["event"] = eventBytesHex
	}

	if len(receivers) > 0 {
		apnPayload["recipients"] = receivers
	}

	if spaceID != nil {
		apnPayload["spaceId"] = spaceID.String()
	}

	if threadID := event.Event.GetTags().GetThreadId(); len(threadID) > 0 {
		apnPayload["threadId"] = hex.EncodeToString(threadID)
	}

	return apnPayload, nil
}

func (p *MessageToNotificationsProcessor) apnPayloadV2(
	channelID shared.StreamId,
	spaceID *shared.StreamId,
	event *events.ParsedEvent,
	kind string,
	eventHash string,
	receivers []string,
) (map[string]interface{}, error) {
	// only include fields that the iOS/OSX uses to reduce payload size
	eventBytes, err := proto.Marshal(&StreamEvent{
		CreatorAddress:   event.Event.GetCreatorAddress(),
		CreatedAtEpochMs: event.Event.GetCreatedAtEpochMs(),
		Payload:          removeUnusedFieldsInPayloadForAPNS(event.Event.GetPayload()),
	})
	if err != nil {
		return nil, base.AsRiverError(err, Err_INTERNAL)
	}

	apnPayload := map[string]interface{}{
		"channelId":        hex.EncodeToString(channelID[:]),
		"kind":             kind,
		"senderId":         common.BytesToAddress(event.Event.GetCreatorAddress()),
		"createdAtEpochMs": event.Event.GetCreatedAtEpochMs(),
		"eventId":          eventHash,
		"payloadVersion":   int(NotificationPushVersion_NOTIFICATION_PUSH_VERSION_2),
		"tags":             event.Event.GetTags(),
	}

	// only add the (stream)event if there is a reasonable chance that the payload isn't too large.
	if base64.StdEncoding.EncodedLen(len(eventBytes)) <= MaxAPNAllowedNotificationStreamEventPayloadSize {
		apnPayload["event"] = base64.StdEncoding.EncodeToString(eventBytes)
	}

	if len(receivers) > 0 {
		apnPayload["recipients"] = receivers
	}

	if spaceID != nil {
		apnPayload["spaceId"] = spaceID.String()
	}

	if threadID := event.Event.GetTags().GetThreadId(); len(threadID) > 0 {
		apnPayload["threadId"] = hex.EncodeToString(threadID)
	}

	return apnPayload, nil
}

// removeUnusedFieldsInPayloadForAPNS removes large fields do not need to be sent to the client.
// This is to avoid APNS rejecting the payload as too large.
func removeUnusedFieldsInPayloadForAPNS(payload IsStreamEvent_Payload) IsStreamEvent_Payload {
	switch payload := payload.(type) {
	case *StreamEvent_MemberPayload:
		// clean out receipts for member payloads — a receipt can easily be 7-8kb in size
		switch content := payload.MemberPayload.Content.(type) {
			case *MemberPayload_MemberBlockchainTransaction_:
				content.MemberBlockchainTransaction.Transaction.Receipt = nil
				content.MemberBlockchainTransaction.Transaction.SolanaReceipt = nil
				payload.MemberPayload.Content = content
			default:
				break
		}
	default:
		break
	}
	return payload
}

func (p *MessageToNotificationsProcessor) sendNotification(
	ctx context.Context,
	user common.Address,
	userPref *types.UserPreferences,
	spaceID *shared.StreamId,
	channelID shared.StreamId,
	event *events.ParsedEvent,
	kind string,
	members mapset.Set[string],
) {
	eventBytes, err := proto.Marshal(event.Event)
	if err != nil {
		p.log.Errorw("Unable to marshal event", "error", err)
		return
	}

	var receivers []string
	if channelID.Type() == shared.STREAM_DM_CHANNEL_BIN || channelID.Type() == shared.STREAM_GDM_CHANNEL_BIN {
		receivers = members.ToSlice()
	}

	// Send Web Push notifications
	if len(userPref.Subscriptions.WebPush) > 0 {
		p.sendWebPushNotifications(ctx, user, userPref, spaceID, channelID, event, kind, eventBytes, receivers)
	}

	// Send APNS notifications
	if len(userPref.Subscriptions.APNPush) > 0 {
		p.sendAPNSNotifications(ctx, user, userPref, spaceID, channelID, event, kind, eventBytes, receivers)
	}
}

func (p *MessageToNotificationsProcessor) sendWebPushNotifications(
	ctx context.Context,
	user common.Address,
	userPref *types.UserPreferences,
	spaceID *shared.StreamId,
	channelID shared.StreamId,
	event *events.ParsedEvent,
	kind string,
	eventBytes []byte,
	receivers []string,
) {
	eventBytesHex := hex.EncodeToString(eventBytes)

	webPayload := map[string]interface{}{
		"channelId": hex.EncodeToString(channelID[:]),
		"kind":      kind,
		"senderId":  common.BytesToAddress(event.Event.CreatorAddress),
	}

	if len(eventBytesHex) <= MaxWebPushAllowedNotificationStreamEventPayloadSize {
		webPayload["event"] = eventBytesHex
	}

	if len(receivers) > 0 {
		webPayload["recipients"] = receivers
	}

	if spaceID != nil {
		webPayload["spaceId"] = spaceID.String()
	}

	if threadID := event.Event.GetTags().GetThreadId(); len(threadID) > 0 {
		webPayload["threadId"] = hex.EncodeToString(threadID)
	}

	for _, sub := range userPref.Subscriptions.WebPush {
		if time.Since(sub.LastSeen) >= p.subscriptionExpiration {
			p.log.Warnw("Ignore WebPush subscription due to no activity",
				"user", user,
				"event", event.Hash,
				"channelID", channelID,
				"lastSeen", sub.LastSeen,
				"since", time.Since(sub.LastSeen),
				"sub.expiration", p.subscriptionExpiration,
			)
			continue
		}

		subscriptionExpired, err := p.sendWebPushNotification(ctx, channelID, sub, event, webPayload)
		if err == nil {
			p.log.Debugw("Successfully sent web push notification",
				"user", user,
				"event", event.Hash,
				"channelID", channelID,
				"user", user,
			)
		} else if subscriptionExpired {
			if err := p.cache.RemoveExpiredWebPushSubscription(ctx, userPref.UserID, sub.Sub, sub.App); err != nil {
				p.log.Errorw("Unable to remove expired webpush subscription",
					"user", userPref.UserID, "error", err)
			} else {
				p.log.Infow("Removed expired webpush subscription", "user", userPref.UserID)
			}
		} else {
			p.log.Errorw("Unable to send web push notification",
				"user", user,
				"error", err,
				"event", event.Hash,
				"channelID", channelID,
			)
		}
	}
}

func (p *MessageToNotificationsProcessor) sendAPNSNotifications(
	ctx context.Context,
	user common.Address,
	userPref *types.UserPreferences,
	spaceID *shared.StreamId,
	channelID shared.StreamId,
	event *events.ParsedEvent,
	kind string,
	eventBytes []byte,
	receivers []string,
) {
	// eventHash is used by iOS/OSX to route the user on the device notification to the message
	eventHash := hex.EncodeToString(crypto.TownsHashForEvents.Hash(eventBytes).Bytes())

	for _, sub := range userPref.Subscriptions.APNPush {
		if time.Since(sub.LastSeen) >= p.subscriptionExpiration {
			if err := p.cache.RemoveAPNSubscription(ctx, sub.DeviceToken, userPref.UserID); err != nil {
				p.log.Errorw("Unable to remove expired APN subscription",
					"user", userPref.UserID, "error", err)
				continue
			}

			p.log.Infow("Removed APN subscription due to no activity",
				"user", user,
				"event", event.Hash,
				"channelID", channelID,
				"lastSeen", sub.LastSeen,
				"since", time.Since(sub.LastSeen),
				"sub.expiration", p.subscriptionExpiration,
			)

			continue
		}

		var (
			apnPayload map[string]interface{}
			err        error
		)

		switch sub.PushVersion {
		case NotificationPushVersion_NOTIFICATION_PUSH_VERSION_UNSPECIFIED:
			p.log.Errorw("Unspecified APN push version in subscription", "deviceToken", sub.DeviceToken)
			continue
		case NotificationPushVersion_NOTIFICATION_PUSH_VERSION_1:
			apnPayload, err = p.apnPayloadV1(channelID, spaceID, event, kind, receivers)
		case NotificationPushVersion_NOTIFICATION_PUSH_VERSION_2:
			apnPayload, err = p.apnPayloadV2(channelID, spaceID, event, kind, eventHash, receivers)
		default:
			p.log.Warnw("Ignore APN subscription due to unsupported push payload format",
				"pushVersion", sub.PushVersion)
			continue
		}

		if err != nil {
			p.log.Errorw("Unable to prepare APN payload", "error", err)
			continue
		}

		subscriptionExpired, statusCode, err := p.sendAPNNotification(
			channelID,
			sub,
			event,
			apnPayload,
			sub.PushVersion,
		)

		// APN can return an error that the payload is too large, drop the (stream)event from the payload and retry.
		// The client can handle notifications with no (stream)event and doesn't show a preview to the user.
		if err != nil && statusCode == http.StatusRequestEntityTooLarge {
			if _, exists := apnPayload["event"]; exists {
				delete(apnPayload, "event")
				p.log.Infow("Payload too large, retry notification with event stripped", "event", event.Hash)
				subscriptionExpired, statusCode, err = p.sendAPNNotification(
					channelID,
					sub,
					event,
					apnPayload,
					sub.PushVersion,
				)

				if err != nil && statusCode == http.StatusRequestEntityTooLarge {
					if _, exists := apnPayload["tags"]; exists {
						delete(apnPayload, "tags")
						p.log.Infow("Payload too large, retry notification with tags stripped", "event", event.Hash)
						subscriptionExpired, _, err = p.sendAPNNotification(
							channelID,
							sub,
							event,
							apnPayload,
							sub.PushVersion,
						)
					}
				}
			}
		}

		if err == nil {
			p.log.Debugw("Successfully sent APN notification",
				"user", user,
				"event", event.Hash,
				"channelID", channelID,
				"deviceToken", sub.DeviceToken,
				"env", sub.Environment,
				"version", sub.PushVersion,
			)
		} else if !subscriptionExpired {
			p.log.Errorw("Unable to send APN notification",
				"user", user,
				"user", user,
				"event", event.Hash,
				"channelID", channelID,
				"deviceToken", sub.DeviceToken,
				"env", sub.Environment,
				"version", sub.PushVersion,
				"error", err)
		} else {
			if err := p.cache.RemoveAPNSubscription(ctx, sub.DeviceToken, userPref.UserID); err != nil {
				p.log.Errorw("Unable to remove expired APN subscription",
					"user", userPref.UserID, "error", err)
			} else {
				p.log.Infow("Removed expired APN subscription", "user", userPref.UserID)
			}
		}
	}
}

func (p *MessageToNotificationsProcessor) sendWebPushNotification(
	ctx context.Context,
	streamID shared.StreamId,
	sub *types.WebPushSubscription,
	event *events.ParsedEvent,
	content map[string]interface{},
) (bool, error) {
	payload, _ := json.Marshal(map[string]interface{}{
		"channelId": streamID,
		"payload":   content,
	})

	// Default to Towns app if not specified
	app := apps.Default
	if sub.App != "" {
		app = sub.App
	}
	return p.notifier.SendWebPushNotification(ctx, sub.Sub, event.Hash, payload, app)
}

func (p *MessageToNotificationsProcessor) sendAPNNotification(
	streamID shared.StreamId,
	sub *types.APNPushSubscription,
	event *events.ParsedEvent,
	content map[string]interface{},
	payloadVersion NotificationPushVersion,
) (bool, int, error) {
	// lint:ignore context.Background() is fine here
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	notificationPayload := payload.NewPayload().
		AlertTitle("You have a new message").
		Custom("content", content).
		ThreadID(streamID.String()).
		ContentAvailable().
		MutableContent().
		Sound("default")

	if p.log.Level() <= zap.DebugLevel {
		p.log.Debugw("APN Notification",
			"from", common.BytesToAddress(event.Event.GetCreatorAddress()),
			"notification", notificationPayload)
	}

	_, containsStreamEvent := content["event"]

	// Default to Towns app if not specified
	app := apps.Default
	if sub.App != "" {
		app = sub.App
	}
	return p.notifier.SendApplePushNotification(
		ctx, sub, event.Hash, notificationPayload, containsStreamEvent, app)
}
