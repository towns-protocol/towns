package events

import (
	. "casablanca/node/protocol"
	"errors"
	"fmt"
)

// mutate snapshot with content of event if applicable
func Update_Snapshot(iSnapshot *Snapshot, event *ParsedEvent) error {
	switch payload := event.Event.Payload.(type) {
	case *StreamEvent_SpacePayload:
		return update_Snapshot_Space(iSnapshot, payload.SpacePayload)
	case *StreamEvent_ChannelPayload:
		return update_Snapshot_Channel(iSnapshot, payload.ChannelPayload)
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

func update_Snapshot_Space(iSnapshot *Snapshot, spacePayload *SpacePayload) error {
	snapshot := iSnapshot.Content.(*Snapshot_SpaceContent)
	if snapshot == nil {
		return errors.New("blockheader snapshot is not a space snapshot")
	}

	switch content := spacePayload.Content.(type) {
	case *SpacePayload_Inception_:
		return errors.New("cannot update blockheader with inception event")
	case *SpacePayload_Channel_:
		snapshot.SpaceContent.Channels[content.Channel.ChannelId] = content.Channel
		return nil
	case *SpacePayload_Membership:
		snapshot.SpaceContent.Memberships[content.Membership.UserId] = content.Membership
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
	case *ChannelPayload_Message:
		return nil
	case *ChannelPayload_Membership:
		snapshot.ChannelContent.Memberships[content.Membership.UserId] = content.Membership
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
		// default for GetRiverKeyOp is RDKO_KEY_REGISTER
		if content.UserDeviceKey.RiverKeyOp == nil || content.UserDeviceKey.GetRiverKeyOp() == RiverKeyOp_RDKO_KEY_REGISTER {
			snapshot.UserDeviceKeyContent.UserDeviceKeys[content.UserDeviceKey.DeviceKeys.DeviceId] = content.UserDeviceKey
		} else {
			delete(snapshot.UserDeviceKeyContent.UserDeviceKeys, content.UserDeviceKey.DeviceKeys.DeviceId)
		}
		return nil
	default:
		return fmt.Errorf("unknown user device key payload type %T", userDeviceKeyPayload.Content)
	}
}
