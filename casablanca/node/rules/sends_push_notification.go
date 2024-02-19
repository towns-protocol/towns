package rules

import (
	"github.com/river-build/river/events"
	. "github.com/river-build/river/protocol"
	"github.com/river-build/river/shared"
)

func SendsPushNotification(parsedEvent *events.ParsedEvent) (bool, string) {
	switch parsedEvent.Event.Payload.(type) {
	case *StreamEvent_ChannelPayload:
		user, err := shared.AddressHex(parsedEvent.Event.CreatorAddress)
		if err != nil {
			return false, ""
		}
		return true, user
	case *StreamEvent_DmChannelPayload:
		user, err := shared.AddressHex(parsedEvent.Event.CreatorAddress)
		if err != nil {
			return false, ""
		}
		return true, user
	case *StreamEvent_GdmChannelPayload:
		user, err := shared.AddressHex(parsedEvent.Event.CreatorAddress)
		if err != nil {
			return false, ""
		}
		return true, user
	case *StreamEvent_SpacePayload:
		return false, ""
	case *StreamEvent_UserPayload:
		return false, ""
	case *StreamEvent_UserDeviceKeyPayload:
		return false, ""
	case *StreamEvent_UserSettingsPayload:
		return false, ""
	case *StreamEvent_UserInboxPayload:
		return false, ""
	case *StreamEvent_MediaPayload:
		return false, ""
	case *StreamEvent_CommonPayload:
		return false, ""
	default:
		return false, ""
	}
}
