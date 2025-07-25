package protocol

import "fmt"

type IsStreamEvent_Payload = isStreamEvent_Payload
type IsMiniblockHeader_Content = isMiniblockHeader_Content
type IsMemberPayload_Content = isMemberPayload_Content
type IsSpacePayload_Content = isSpacePayload_Content
type IsChannelPayload_Content = isChannelPayload_Content
type IsDmChannelPayload_Content = isDmChannelPayload_Content
type IsGdmChannelPayload_Content = isGdmChannelPayload_Content
type IsUserPayload_Content = isUserPayload_Content
type IsUserInboxPayload_Content = isUserInboxPayload_Content
type IsUserSettingsPayload_Content = isUserSettingsPayload_Content
type IsUserMetadataPayload_Content = isUserMetadataPayload_Content
type IsMediaPayload_Content = isMediaPayload_Content
type IsMetadataPayload_Content = isMetadataPayload_Content
type IsSnapshot_Content = isSnapshot_Content
type IsBlockchainTransaction_Content = isBlockchainTransaction_Content
type IsGetStreamExResponse_Data = isGetStreamExResponse_Data

type IsInceptionPayload interface {
	isInceptionPayload()
	GetStreamId() []byte
	GetSettings() *StreamSettings
}
func (*SpacePayload_Inception) isInceptionPayload() {}
func (*ChannelPayload_Inception) isInceptionPayload() {}
func (*DmChannelPayload_Inception) isInceptionPayload() {}
func (*GdmChannelPayload_Inception) isInceptionPayload() {}
func (*UserPayload_Inception) isInceptionPayload() {}
func (*UserInboxPayload_Inception) isInceptionPayload() {}
func (*UserSettingsPayload_Inception) isInceptionPayload() {}
func (*UserMetadataPayload_Inception) isInceptionPayload() {}
func (*MediaPayload_Inception) isInceptionPayload() {}
func (*MetadataPayload_Inception) isInceptionPayload() {}

func (e *Snapshot) GetInceptionPayload() IsInceptionPayload {
	switch e.Content.(type) {
	case *Snapshot_SpaceContent:
		r := e.Content.(*Snapshot_SpaceContent).SpaceContent.GetInception()
		if r == nil {
			return nil
		}
		return r
	case *Snapshot_ChannelContent:
		r := e.Content.(*Snapshot_ChannelContent).ChannelContent.GetInception()
		if r == nil {
			return nil
		}
		return r
	case *Snapshot_DmChannelContent:
		r := e.Content.(*Snapshot_DmChannelContent).DmChannelContent.GetInception()
		if r == nil {
			return nil
		}
		return r
	case *Snapshot_GdmChannelContent:
		r := e.Content.(*Snapshot_GdmChannelContent).GdmChannelContent.GetInception()
		if r == nil {
			return nil
		}
		return r
	case *Snapshot_UserContent:
		r := e.Content.(*Snapshot_UserContent).UserContent.GetInception()
		if r == nil {
			return nil
		}
		return r
	case *Snapshot_UserInboxContent:
		r := e.Content.(*Snapshot_UserInboxContent).UserInboxContent.GetInception()
		if r == nil {
			return nil
		}
		return r
	case *Snapshot_UserSettingsContent:
		r := e.Content.(*Snapshot_UserSettingsContent).UserSettingsContent.GetInception()
		if r == nil {
			return nil
		}
		return r
	case *Snapshot_UserMetadataContent:
		r := e.Content.(*Snapshot_UserMetadataContent).UserMetadataContent.GetInception()
		if r == nil {
			return nil
		}
		return r
	case *Snapshot_MediaContent:
		r := e.Content.(*Snapshot_MediaContent).MediaContent.GetInception()
		if r == nil {
			return nil
		}
		return r
	case *Snapshot_MetadataContent:
		r := e.Content.(*Snapshot_MetadataContent).MetadataContent.GetInception()
		if r == nil {
			return nil
		}
		return r
	default:
		return nil
	}
}

func (e *StreamEvent) GetInceptionPayload() IsInceptionPayload {
	switch e.Payload.(type) {
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
	case *StreamEvent_DmChannelPayload:
		r := e.Payload.(*StreamEvent_DmChannelPayload).DmChannelPayload.GetInception()
		if r == nil {
			return nil
		}
		return r
	case *StreamEvent_GdmChannelPayload:
		r := e.Payload.(*StreamEvent_GdmChannelPayload).GdmChannelPayload.GetInception()
		if r == nil {
			return nil
		}
		return r
	case *StreamEvent_UserPayload:
		r := e.Payload.(*StreamEvent_UserPayload).UserPayload.GetInception()
		if r == nil {
			return nil
		}
		return r
	case *StreamEvent_UserInboxPayload:
		r := e.Payload.(*StreamEvent_UserInboxPayload).UserInboxPayload.GetInception()
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
	case *StreamEvent_UserMetadataPayload:
		r := e.Payload.(*StreamEvent_UserMetadataPayload).UserMetadataPayload.GetInception()
		if r == nil {
			return nil
		}
		return r
	case *StreamEvent_MediaPayload:
		r := e.Payload.(*StreamEvent_MediaPayload).MediaPayload.GetInception()
		if r == nil {
			return nil
		}
		return r
	case *StreamEvent_MetadataPayload:
		r := e.Payload.(*StreamEvent_MetadataPayload).MetadataPayload.GetInception()
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
	case *StreamEvent_DmChannelPayload:
		_, ok := i.(*DmChannelPayload_Inception)
		if !ok {
			return fmt.Errorf("inception type mismatch: *protocol.StreamEvent_DmChannelPayload::%T vs %T", e.GetDmChannelPayload().Content, i)
		}
	case *StreamEvent_GdmChannelPayload:
		_, ok := i.(*GdmChannelPayload_Inception)
		if !ok {
			return fmt.Errorf("inception type mismatch: *protocol.StreamEvent_GdmChannelPayload::%T vs %T", e.GetGdmChannelPayload().Content, i)
		}
	case *StreamEvent_UserPayload:
		_, ok := i.(*UserPayload_Inception)
		if !ok {
			return fmt.Errorf("inception type mismatch: *protocol.StreamEvent_UserPayload::%T vs %T", e.GetUserPayload().Content, i)
		}
	case *StreamEvent_UserInboxPayload:
		_, ok := i.(*UserInboxPayload_Inception)
		if !ok {
			return fmt.Errorf("inception type mismatch: *protocol.StreamEvent_UserInboxPayload::%T vs %T", e.GetUserInboxPayload().Content, i)
		}
	case *StreamEvent_UserSettingsPayload:
		_, ok := i.(*UserSettingsPayload_Inception)
		if !ok {
			return fmt.Errorf("inception type mismatch: *protocol.StreamEvent_UserSettingsPayload::%T vs %T", e.GetUserSettingsPayload().Content, i)
		}
	case *StreamEvent_UserMetadataPayload:
		_, ok := i.(*UserMetadataPayload_Inception)
		if !ok {
			return fmt.Errorf("inception type mismatch: *protocol.StreamEvent_UserMetadataPayload::%T vs %T", e.GetUserMetadataPayload().Content, i)
		}
	case *StreamEvent_MediaPayload:
		_, ok := i.(*MediaPayload_Inception)
		if !ok {
			return fmt.Errorf("inception type mismatch: *protocol.StreamEvent_MediaPayload::%T vs %T", e.GetMediaPayload().Content, i)
		}
	case *StreamEvent_MetadataPayload:
		_, ok := i.(*MetadataPayload_Inception)
		if !ok {
			return fmt.Errorf("inception type mismatch: *protocol.StreamEvent_MetadataPayload::%T vs %T", e.GetMetadataPayload().Content, i)
		}
	case *StreamEvent_MemberPayload:
		return nil
	default:
		return fmt.Errorf("inception type not handled: %T vs %T", e.Payload, i)
	}
	return nil
}
