package events

import (
	. "casablanca/node/protocol"
	"errors"
	"fmt"
)

func Make_Snapshot(iPayload IsInceptionPayload) (*Snapshot, error) {
	content, err := Make_SnapshotContent(iPayload)
	if err != nil {
		return nil, err
	}
	return &Snapshot{
		Content: content,
	}, nil
}

func Make_SnapshotContent(iPayload IsInceptionPayload) (IsSnapshot_Content, error) {
	if iPayload == nil {
		return nil, errors.New("inceptionEvent is not an inception event")
	}

	switch payload := iPayload.(type) {
	case *SpacePayload_Inception:
		return &Snapshot_SpaceContent{
			SpaceContent: make_Space_Snapshot(payload),
		}, nil
	case *ChannelPayload_Inception:
		return &Snapshot_ChannelContent{
			ChannelContent: make_Channel_Snapshot(payload),
		}, nil
	case *UserPayload_Inception:
		return &Snapshot_UserContent{
			UserContent: make_User_Snapshot(payload),
		}, nil
	case *UserSettingsPayload_Inception:
		return &Snapshot_UserSettingsContent{
			UserSettingsContent: make_UserSettings_Snapshot(payload),
		}, nil
	case *UserDeviceKeyPayload_Inception:
		return &Snapshot_UserDeviceKeyContent{
			UserDeviceKeyContent: make_UserDeviceKey_Snapshot(payload),
		}, nil
	default:
		return nil, fmt.Errorf("unknown inception payload type %T", iPayload)
	}
}

func make_Space_Snapshot(inception *SpacePayload_Inception) *SpacePayload_Snapshot {
	return &SpacePayload_Snapshot{
		Inception:   inception,
		Channels:    make(map[string]*SpacePayload_Channel),
		Memberships: make(map[string]*Membership),
	}
}

func make_Channel_Snapshot(inception *ChannelPayload_Inception) *ChannelPayload_Snapshot {
	return &ChannelPayload_Snapshot{
		Inception:   inception,
		Memberships: make(map[string]*Membership),
	}
}

func make_User_Snapshot(inception *UserPayload_Inception) *UserPayload_Snapshot {
	return &UserPayload_Snapshot{
		Inception:   inception,
		Memberships: make(map[string]*UserPayload_UserMembership),
	}
}

func make_UserSettings_Snapshot(inception *UserSettingsPayload_Inception) *UserSettingsPayload_Snapshot {
	return &UserSettingsPayload_Snapshot{
		Inception:        inception,
		FullyReadMarkers: make(map[string]*UserSettingsPayload_FullyReadMarkers),
	}
}

func make_UserDeviceKey_Snapshot(inception *UserDeviceKeyPayload_Inception) *UserDeviceKeyPayload_Snapshot {
	return &UserDeviceKeyPayload_Snapshot{
		Inception: inception,
	}
}
