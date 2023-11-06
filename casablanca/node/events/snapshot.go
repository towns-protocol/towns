package events

import (
	"casablanca/node/common"
	. "casablanca/node/protocol"
	"errors"
	"fmt"
)

func Make_GenisisSnapshot(events []*ParsedEvent) (*Snapshot, error) {
	inceptionPayload := events[0].Event.GetInceptionPayload()

	if inceptionPayload == nil {
		return nil, errors.New("inceptionEvent is not an inception event")
	}

	content, err := make_SnapshotContent(inceptionPayload)
	if err != nil {
		return nil, err
	}

	snapshot := &Snapshot{
		Content: content,
	}

	for i, event := range events[1:] {
		// start at index 1 to account for inception event
		err = Update_Snapshot(snapshot, event, 1, i)
		if err != nil {
			return nil, err
		}
	}

	return snapshot, nil
}

func make_SnapshotContent(iPayload IsInceptionPayload) (IsSnapshot_Content, error) {
	if iPayload == nil {
		return nil, errors.New("inceptionEvent is not an inception event")
	}

	switch payload := iPayload.(type) {
	case *SpacePayload_Inception:
		return &Snapshot_SpaceContent{
			SpaceContent: &SpacePayload_Snapshot{
				Inception: payload,
			},
		}, nil
	case *ChannelPayload_Inception:
		return &Snapshot_ChannelContent{
			ChannelContent: &ChannelPayload_Snapshot{
				Inception: payload,
			},
		}, nil
	case *DmChannelPayload_Inception:
		return &Snapshot_DmChannelContent{
			DmChannelContent: &DmChannelPayload_Snapshot{
				Inception: payload,
			},
		}, nil
	case *GdmChannelPayload_Inception:
		return &Snapshot_GdmChannelContent{
			GdmChannelContent: &GdmChannelPayload_Snapshot{
				Inception: payload,
			},
		}, nil
	case *UserPayload_Inception:
		return &Snapshot_UserContent{
			UserContent: &UserPayload_Snapshot{
				Inception: payload,
			},
		}, nil
	case *UserSettingsPayload_Inception:
		return &Snapshot_UserSettingsContent{
			UserSettingsContent: &UserSettingsPayload_Snapshot{
				Inception: payload,
			},
		}, nil
	case *UserDeviceKeyPayload_Inception:
		return &Snapshot_UserDeviceKeyContent{
			UserDeviceKeyContent: &UserDeviceKeyPayload_Snapshot{
				Inception: payload,
			},
		}, nil
	case *MediaPayload_Inception:
		return &Snapshot_MediaContent{
			MediaContent: &MediaPayload_Snapshot{
				Inception: payload,
			},
		}, nil
	default:
		return nil, fmt.Errorf("unknown inception payload type %T", iPayload)
	}
}

// mutate snapshot with content of event if applicable
func Update_Snapshot(iSnapshot *Snapshot, event *ParsedEvent, eventNumOffset int64, eventNum int) error {
	switch payload := event.Event.Payload.(type) {
	case *StreamEvent_SpacePayload:
		user, err := common.AddressHex(event.Event.CreatorAddress)
		if err != nil {
			return err
		}
		return update_Snapshot_Space(iSnapshot, payload.SpacePayload, user, eventNumOffset+int64(eventNum))
	case *StreamEvent_ChannelPayload:
		return update_Snapshot_Channel(iSnapshot, payload.ChannelPayload)
	case *StreamEvent_DmChannelPayload:
		return update_Snapshot_DmChannel(iSnapshot, payload.DmChannelPayload)
	case *StreamEvent_GdmChannelPayload:
		return update_Snapshot_GdmChannel(iSnapshot, payload.GdmChannelPayload)
	case *StreamEvent_UserPayload:
		return update_Snapshot_User(iSnapshot, payload.UserPayload)
	case *StreamEvent_UserSettingsPayload:
		return update_Snapshot_UserSettings(iSnapshot, payload.UserSettingsPayload)
	case *StreamEvent_UserDeviceKeyPayload:
		return update_Snapshot_UserDeviceKey(iSnapshot, payload.UserDeviceKeyPayload)
	default:
		return fmt.Errorf("unknown payload type %T", event.Event.Payload)
	}
}

func update_Snapshot_Space(iSnapshot *Snapshot, spacePayload *SpacePayload, user string, eventNum int64) error {
	snapshot := iSnapshot.Content.(*Snapshot_SpaceContent)
	if snapshot == nil {
		return errors.New("blockheader snapshot is not a space snapshot")
	}

	switch content := spacePayload.Content.(type) {
	case *SpacePayload_Inception_:
		return errors.New("cannot update blockheader with inception event")
	case *SpacePayload_Channel_:
		if snapshot.SpaceContent.Channels == nil {
			snapshot.SpaceContent.Channels = make(map[string]*SpacePayload_Channel)
		}
		snapshot.SpaceContent.Channels[content.Channel.ChannelId] = content.Channel
		return nil
	case *SpacePayload_Membership:
		if snapshot.SpaceContent.Memberships == nil {
			snapshot.SpaceContent.Memberships = make(map[string]*Membership)
		}
		snapshot.SpaceContent.Memberships[content.Membership.UserId] = content.Membership
		return nil
	case *SpacePayload_Username:
		if snapshot.SpaceContent.Usernames == nil {
			snapshot.SpaceContent.Usernames = make(map[string]*SpacePayload_WrappedEncryptedData)
		}
		snapshot.SpaceContent.Usernames[user] = &SpacePayload_WrappedEncryptedData{Data: content.Username, EventNum: eventNum}
		return nil
	case *SpacePayload_DisplayName:
		if snapshot.SpaceContent.DisplayNames == nil {
			snapshot.SpaceContent.DisplayNames = make(map[string]*SpacePayload_WrappedEncryptedData)
		}
		snapshot.SpaceContent.DisplayNames[user] = &SpacePayload_WrappedEncryptedData{Data: content.DisplayName, EventNum: eventNum}
		return nil
	default:
		return fmt.Errorf("unknown space payload type %T", spacePayload.Content)
	}
}

func update_Snapshot_Channel(iSnapshot *Snapshot, channelPayload *ChannelPayload) error {
	snapshot := iSnapshot.Content.(*Snapshot_ChannelContent)
	if snapshot == nil {
		return errors.New("blockheader snapshot is not a channel snapshot")
	}

	switch content := channelPayload.Content.(type) {
	case *ChannelPayload_Inception_:
		return errors.New("cannot update blockheader with inception event")
	case *ChannelPayload_Membership:
		if snapshot.ChannelContent.Memberships == nil {
			snapshot.ChannelContent.Memberships = make(map[string]*Membership)
		}
		snapshot.ChannelContent.Memberships[content.Membership.UserId] = content.Membership
		return nil
	case *ChannelPayload_Message, *ChannelPayload_KeySolicitation, *ChannelPayload_Fulfillment:
		return nil
	default:
		return fmt.Errorf("unknown channel payload type %T", channelPayload.Content)
	}
}

func update_Snapshot_DmChannel(iSnapshot *Snapshot, dmChannelPayload *DmChannelPayload) error {
	snapshot := iSnapshot.Content.(*Snapshot_DmChannelContent)
	if snapshot == nil {
		return errors.New("blockheader snapshot is not a dm channel snapshot")
	}
	switch content := dmChannelPayload.Content.(type) {
	case *DmChannelPayload_Inception_:
		return errors.New("cannot update blockheader with inception event")
	case *DmChannelPayload_Membership:
		if snapshot.DmChannelContent.Memberships == nil {
			snapshot.DmChannelContent.Memberships = make(map[string]*Membership)
		}
		snapshot.DmChannelContent.Memberships[content.Membership.UserId] = content.Membership
		return nil
	case *DmChannelPayload_Message, *DmChannelPayload_KeySolicitation, *DmChannelPayload_Fulfillment:
		return nil
	default:
		return fmt.Errorf("unknown dm channel payload type %T", dmChannelPayload.Content)
	}
}

func update_Snapshot_GdmChannel(iSnapshot *Snapshot, channelPayload *GdmChannelPayload) error {
	snapshot := iSnapshot.Content.(*Snapshot_GdmChannelContent)
	if snapshot == nil {
		return errors.New("blockheader snapshot is not a channel snapshot")
	}

	switch content := channelPayload.Content.(type) {
	case *GdmChannelPayload_Inception_:
		return errors.New("cannot update blockheader with inception event")
	case *GdmChannelPayload_Membership:
		if snapshot.GdmChannelContent.Memberships == nil {
			snapshot.GdmChannelContent.Memberships = make(map[string]*Membership)
		}
		snapshot.GdmChannelContent.Memberships[content.Membership.UserId] = content.Membership
		return nil
	case *GdmChannelPayload_Message, *GdmChannelPayload_KeySolicitation, *GdmChannelPayload_Fulfillment:
		return nil
	default:
		return fmt.Errorf("unknown channel payload type %T", channelPayload.Content)
	}
}

func update_Snapshot_User(iSnapshot *Snapshot, userPayload *UserPayload) error {
	snapshot := iSnapshot.Content.(*Snapshot_UserContent)
	if snapshot == nil {
		return errors.New("blockheader snapshot is not a user snapshot")
	}
	switch content := userPayload.Content.(type) {
	case *UserPayload_Inception_:
		return errors.New("cannot update blockheader with inception event")
	case *UserPayload_UserMembership_:
		if snapshot.UserContent.Memberships == nil {
			snapshot.UserContent.Memberships = make(map[string]*UserPayload_UserMembership)
		}
		snapshot.UserContent.Memberships[content.UserMembership.StreamId] = content.UserMembership
		return nil
	case *UserPayload_ToDevice_:
		return nil
	default:
		return fmt.Errorf("unknown user payload type %T", userPayload.Content)
	}
}

func update_Snapshot_UserSettings(iSnapshot *Snapshot, userSettingsPayload *UserSettingsPayload) error {
	snapshot := iSnapshot.Content.(*Snapshot_UserSettingsContent)
	if snapshot == nil {
		return errors.New("blockheader snapshot is not a user settings snapshot")
	}
	switch content := userSettingsPayload.Content.(type) {
	case *UserSettingsPayload_Inception_:
		return errors.New("cannot update blockheader with inception event")
	case *UserSettingsPayload_FullyReadMarkers_:
		if snapshot.UserSettingsContent.FullyReadMarkers == nil {
			snapshot.UserSettingsContent.FullyReadMarkers = make(map[string]*UserSettingsPayload_FullyReadMarkers)
		}
		snapshot.UserSettingsContent.FullyReadMarkers[content.FullyReadMarkers.ChannelStreamId] = content.FullyReadMarkers
		return nil
	default:
		return fmt.Errorf("unknown user settings payload type %T", userSettingsPayload.Content)
	}
}

func update_Snapshot_UserDeviceKey(iSnapshot *Snapshot, userDeviceKeyPayload *UserDeviceKeyPayload) error {
	snapshot := iSnapshot.Content.(*Snapshot_UserDeviceKeyContent)
	if snapshot == nil {
		return errors.New("blockheader snapshot is not a user device key snapshot")
	}
	switch content := userDeviceKeyPayload.Content.(type) {
	case *UserDeviceKeyPayload_Inception_:
		return errors.New("cannot update blockheader with inception event")
	case *UserDeviceKeyPayload_UserDeviceKey_:
		if snapshot.UserDeviceKeyContent.UserDeviceKeys == nil {
			snapshot.UserDeviceKeyContent.UserDeviceKeys = make(map[string]*UserDeviceKeyPayload_UserDeviceKey)
		}
		snapshot.UserDeviceKeyContent.UserDeviceKeys[content.UserDeviceKey.DeviceKeys.DeviceId] = content.UserDeviceKey
		return nil
	default:
		return fmt.Errorf("unknown user device key payload type %T", userDeviceKeyPayload.Content)
	}
}
