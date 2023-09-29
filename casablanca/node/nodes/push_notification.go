package nodes

import (
	"bytes"
	. "casablanca/node/config"
	"context"
	"encoding/json"
)

// PushNotification is used to trigger push notifications to the client.
// It creates the push payload and then makes a request to the Push Notification
// Worker (PNW). The PNW implements the requirements of the
// [Push API](https://www.w3.org/TR/push-api/) to trigger the actual push
// notificaiton.
// This is a stub interface, it is not implemented yet.
type PushNotification interface {
	SendPushNotification(
		ctx context.Context,
		cfg PushNotificationConfig,
		spaceId string,
		channelId string,
		senderId string, // sender of the event
		payload NotificationPayload,
	) (int, error)
}

type NotificationType int

const (
	NewMessage NotificationType = iota
	Mention
	ReplyTo
)

func (n NotificationType) String() string {
	switch n {
	case NewMessage:
		return "new_message"
	case Mention:
		return "mention"
	case ReplyTo:
		return "reply_to"
	default:
		return "unknown"
	}
}

type NotificationNewMessage struct {
	SpaceId   string `json:"spaceId"`
	ChannelId string `json:"channelId"`
	SenderId  string `json:"senderId"`
}

type NotificationPayload struct {
	NotificationType string `json:"notificationType"`
	Content          any    `json:"content"`
}

type NotificationRequestParams struct {
	SpaceId   string              `json:"spaceId"`
	ChannelId string              `json:"channelId"`
	Payload   NotificationPayload `json:"payload"`
	Sender    string              `json:"sender"`
	Users     []string            `json:"users"`
}

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
