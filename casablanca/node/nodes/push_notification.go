package nodes

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/river-build/river/config"
	"github.com/river-build/river/dlog"
	"github.com/river-build/river/events"
	"github.com/river-build/river/protocol"
	"github.com/river-build/river/shared"
)

// PushNotification is used to trigger push notifications to the client.
// It creates the push payload and then makes a request to the Push Notification
// Worker (PNW). The PNW implements the requirements of the
// [Push API](https://www.w3.org/TR/push-api/) to trigger the actual push
// notificaiton.
type PushNotification interface {
	SendPushNotification(
		ctx context.Context,
		channel events.StreamView,
		senderId string, // sender of the event
		event *protocol.StreamEvent,
	)
}

type pushNotificationImpl struct {
	cfg *config.PushNotificationConfig
}

var _ PushNotification = (*pushNotificationImpl)(nil)

func MakePushNotification(ctx context.Context, cfg *config.PushNotificationConfig) PushNotification {
	log := dlog.FromCtx(ctx)
	if (cfg.Url == "") || (cfg.AuthToken == "") {
		log.Warn("PushNotification disabled")
		return nil
	}
	log.Info("PushNotification enabled", "url", cfg.Url)
	return &pushNotificationImpl{
		cfg: cfg,
	}
}

func (p pushNotificationImpl) SendPushNotification(
	ctx context.Context,
	channel events.StreamView,
	senderId string,
	event *protocol.StreamEvent,
) {
	go p.sendNotificationRequest(
		ctx,
		channel,
		senderId,
		event,
	)
}

func (p pushNotificationImpl) sendNotificationRequest(
	ctx context.Context,
	channel events.StreamView,
	senderId string,
	event *protocol.StreamEvent,
) {
	log := dlog.FromCtx(ctx)
	var spaceId string
	if channelInfo, err := channel.(events.ChannelStreamView).GetChannelInception(); err == nil {
		spaceId = channelInfo.SpaceId
	}

	users, err := getUsersToNotify(channel, senderId)
	if err != nil {
		log.Error("PushNotification failed to get channel members", "error", err)
		return
	}
	if len(users) == 0 {
		log.Debug("PushNotification has no users to notify")
		return
	}
	// prepare the push notification request params and payload
	var payload NotificationPayload
	if shared.CheckDMStreamId(channel.StreamId()) || shared.ValidGDMChannelStreamId(channel.StreamId()) {
		payload = NotificationPayload{
			Content: &NotificationDirectMessage{
				Kind:       DirectMessage.String(),
				ChannelId:  channel.StreamId(),
				SenderId:   senderId,
				Recipients: users,
				Event:      event,
			},
		}
	} else {
		payload = NotificationPayload{
			Content: &NotificationNewMessage{
				Kind:      NewMessage.String(),
				SpaceId:   spaceId,
				ChannelId: channel.StreamId(),
				SenderId:  senderId,
				Event:     event,
			},
		}
	}
	reqParams := NotificationRequestParams{
		Sender:  senderId,
		Users:   users,
		Payload: payload,
	}
	// create the body as a stream
	body, err := reqParams.NewReader()
	if err != nil {
		log.Error("PushNotification failed to create request body", "error", err)
		return
	}
	// make the request to the PNW
	url := fmt.Sprintf("%s/%s", p.cfg.Url, "api/notify-users")
	request, err := http.NewRequest(http.MethodPost, url, body)
	if err != nil {
		log.Error("PushNotification failed to create request", "error", err)
		return
	}
	// set the headers
	request.Header.Set("Content-Type", "application/json")
	request.Header.Set("Authorization", fmt.Sprintf("Bearer %s", p.cfg.AuthToken))
	// make the request
	client := &http.Client{}
	response, err := client.Do(request.WithContext(ctx))
	if err != nil || response.StatusCode != http.StatusOK {
		if err != nil {
			log.Error("PushNotification failed to send request", "error", err)
		} else {
			log.Error("PushNotification failed to send request", "status", response.StatusCode)
		}
		return
	}
	// success
	log.Debug("PushNotification request sent", "# of members", len(users))
}

type NotificationKind int

const (
	NewMessage NotificationKind = iota
	Mention
	ReplyTo
	DirectMessage
)

func (n NotificationKind) String() string {
	switch n {
	case NewMessage:
		return "new_message"
	case Mention:
		return "mention"
	case ReplyTo:
		return "reply_to"
	case DirectMessage:
		return "direct_message"
	default:
		return "unknown"
	}
}

type NotificationContent interface {
	IsNotificationPayload_Content()
}

type NotificationNewMessage struct {
	Kind      string                `json:"kind"`
	SpaceId   string                `json:"spaceId"`
	ChannelId string                `json:"channelId"`
	SenderId  string                `json:"senderId"`
	Event     *protocol.StreamEvent `json:"event"`
}

type NotificationDirectMessage struct {
	Kind       string                `json:"kind"`
	ChannelId  string                `json:"channelId"`
	SenderId   string                `json:"senderId"`
	Recipients []string              `json:"recipients"`
	Event      *protocol.StreamEvent `json:"event"`
}

type NotificationPayload struct {
	Content NotificationContent `json:"content"`
}

type NotificationRequestParams struct {
	Sender  string              `json:"sender"`
	Users   []string            `json:"users"`
	Payload NotificationPayload `json:"payload"`
}

func (n *NotificationNewMessage) IsNotificationPayload_Content() {}

func (n *NotificationDirectMessage) IsNotificationPayload_Content() {}

func (p NotificationRequestParams) String() string {
	data, err := json.Marshal(p)
	if err != nil {
		return ""
	}

	return string(data)
}

func (p NotificationRequestParams) NewReader() (*bytes.Reader, error) {
	data := p.String()
	reader := bytes.NewReader([]byte(data))
	return reader, nil
}

func getUsersToNotify(
	channel events.StreamView,
	senderId string,
) ([]string, error) {
	joinableView := channel.(events.JoinableStreamView)
	// get the channel membership
	members, err := joinableView.GetChannelMembers()
	if err != nil {
		return nil, err
	}
	// exclude sender
	var recipients []string
	for _, member := range (*members).ToSlice() {
		if member == senderId {
			continue
		}
		recipients = append(recipients, member)
	}
	return recipients, nil
}
