package protocol

import "fmt"

type IsStreamEvent_Payload = isStreamEvent_Payload
type IsBlockHeader_Content = isBlockHeader_Content
type IsUserPayload_Content = isUserPayload_Content
type IsSpacePayload_Content = isSpacePayload_Content
type IsChannelPayload_Content = isChannelPayload_Content
type IsUserSettingsPayload_Content = isUserSettingsPayload_Content
type IsUserDeviceKeyPayload_Content = isUserDeviceKeyPayload_Content

type IsInceptionPayload interface {
	isInceptionPayload()
	GetStreamId() string
}
func (*UserPayload_Inception) isInceptionPayload() {}
func (*SpacePayload_Inception) isInceptionPayload() {}
func (*ChannelPayload_Inception) isInceptionPayload() {}
func (*UserSettingsPayload_Inception) isInceptionPayload() {}
func (*UserDeviceKeyPayload_Inception) isInceptionPayload() {}

func (e *StreamEvent) GetInceptionPayload() IsInceptionPayload {
	switch e.Payload.(type) {
	case *StreamEvent_UserPayload:
		r := e.Payload.(*StreamEvent_UserPayload).UserPayload.GetInception()
		if r == nil {
			return nil
		}
		return r
	case *StreamEvent_SpacePayload:
		r := e.Payload.(*StreamEvent_SpacePayload).SpacePayload.GetInception()
		if r == nil {
			return nil
		}
		return r
	case *StreamEvent_ChannelPayload:
		r := e.Payload.(*StreamEvent_ChannelPayload).ChannelPayload.GetInception()
		if r == nil {
			return nil
		}
		return r
	case *StreamEvent_UserSettingsPayload:
		r := e.Payload.(*StreamEvent_UserSettingsPayload).UserSettingsPayload.GetInception()
		if r == nil {
			return nil
		}
		return r
	case *StreamEvent_UserDeviceKeyPayload:
		r := e.Payload.(*StreamEvent_UserDeviceKeyPayload).UserDeviceKeyPayload.GetInception()
		if r == nil {
			return nil
		}
		return r
	default:
		return nil
	}
}

func (e *StreamEvent) VerifyPayloadTypeMatchesStreamType(i IsInceptionPayload) error {
	switch e.Payload.(type) {
	case *StreamEvent_UserPayload:
		_, ok := i.(*UserPayload_Inception)
		if !ok {
			return fmt.Errorf("inception type mismatch: *protocol.StreamEvent_UserPayload::%T vs %T", e.GetUserPayload().Content, i)
		}
	case *StreamEvent_SpacePayload:
		_, ok := i.(*SpacePayload_Inception)
		if !ok {
			return fmt.Errorf("inception type mismatch: *protocol.StreamEvent_SpacePayload::%T vs %T", e.GetSpacePayload().Content, i)
		}
	case *StreamEvent_ChannelPayload:
		_, ok := i.(*ChannelPayload_Inception)
		if !ok {
			return fmt.Errorf("inception type mismatch: *protocol.StreamEvent_ChannelPayload::%T vs %T", e.GetChannelPayload().Content, i)
		}
	case *StreamEvent_UserSettingsPayload:
		_, ok := i.(*UserSettingsPayload_Inception)
		if !ok {
			return fmt.Errorf("inception type mismatch: *protocol.StreamEvent_UserSettingsPayload::%T vs %T", e.GetUserSettingsPayload().Content, i)
		}
	case *StreamEvent_UserDeviceKeyPayload:
		_, ok := i.(*UserDeviceKeyPayload_Inception)
		if !ok {
			return fmt.Errorf("inception type mismatch: *protocol.StreamEvent_UserDeviceKeyPayload::%T vs %T", e.GetUserDeviceKeyPayload().Content, i)
		}
	default:
		return fmt.Errorf("inception type type not handled: %T vs %T", e.Payload, i)
	}
	return nil
}
