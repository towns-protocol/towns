package protocol

import "fmt"

type IsStreamEvent_Payload = isStreamEvent_Payload
type IsUserPayload_Payload = isUserPayload_Payload
type IsSpacePayload_Payload = isSpacePayload_Payload
type IsChannelPayload_Payload = isChannelPayload_Payload
type IsUserSettingsPayload_Payload = isUserSettingsPayload_Payload

type IsInceptionPayload interface {
	isInceptionPayload()
	GetStreamId() string
}
func (*UserPayload_Inception) isInceptionPayload() {}
func (*SpacePayload_Inception) isInceptionPayload() {}
func (*ChannelPayload_Inception) isInceptionPayload() {}
func (*UserSettingsPayload_Inception) isInceptionPayload() {}

func (e *StreamEvent) GetInceptionPayload() IsInceptionPayload {
	switch e.Payload.(type) {
	case *StreamEvent_UserPayload:
		return e.Payload.(*StreamEvent_UserPayload).UserPayload.GetInception()
	case *StreamEvent_SpacePayload:
		return e.Payload.(*StreamEvent_SpacePayload).SpacePayload.GetInception()
	case *StreamEvent_ChannelPayload:
		return e.Payload.(*StreamEvent_ChannelPayload).ChannelPayload.GetInception()
	case *StreamEvent_UserSettingsPayload:
		return e.Payload.(*StreamEvent_UserSettingsPayload).UserSettingsPayload.GetInception()
	default:
		return nil
	}
}


func (e *StreamEvent) VerifyPayloadTypeMatchesStreamType(i IsInceptionPayload) error {
	switch e.Payload.(type) {
	case *StreamEvent_UserPayload:
		_, ok := i.(*UserPayload_Inception)
		if !ok {
			return fmt.Errorf("inception type mismatch: *protocol.StreamEvent_UserPayload::%T vs %T", e.GetUserPayload().Payload, i)
		}
	case *StreamEvent_SpacePayload:
		_, ok := i.(*SpacePayload_Inception)
		if !ok {
			return fmt.Errorf("inception type mismatch: *protocol.StreamEvent_SpacePayload::%T vs %T", e.GetSpacePayload().Payload, i)
		}
	case *StreamEvent_ChannelPayload:
		_, ok := i.(*ChannelPayload_Inception)
		if !ok {
			return fmt.Errorf("inception type mismatch: *protocol.StreamEvent_ChannelPayload::%T vs %T", e.GetChannelPayload().Payload, i)
		}
	case *StreamEvent_UserSettingsPayload:
		_, ok := i.(*UserSettingsPayload_Inception)
		if !ok {
			return fmt.Errorf("inception type mismatch: *protocol.StreamEvent_UserSettingsPayload::%T vs %T", e.GetUserSettingsPayload().Payload, i)
		}
	default:
		return fmt.Errorf("inception type type not handled: %T vs %T", e.Payload, i)
	}
	return nil
}
