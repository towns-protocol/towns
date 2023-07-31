package events

import (
	. "casablanca/node/protocol"
	"errors"
	"fmt"

	"google.golang.org/protobuf/types/known/emptypb"
)

func Make_EmptySnapshot() IsMiniblockHeader_Content {
	return &MiniblockHeader_None{
		None: &emptypb.Empty{},
	}
}

func Make_Snapshot(inceptionEvent *ParsedEvent) (IsMiniblockHeader_Content, error) {
	if inceptionEvent.Event.GetInceptionPayload() == nil {
		return nil, errors.New("inceptionEvent is not an inception event")
	}

	switch payload := inceptionEvent.Event.GetInceptionPayload().(type) {
	case *SpacePayload_Inception:
		return &MiniblockHeader_SpaceContent{
			SpaceContent: make_Space_Snapshot(payload),
		}, nil
	case *ChannelPayload_Inception:
		return &MiniblockHeader_ChannelContent{
			ChannelContent: make_Channel_Snapshot(payload),
		}, nil
	case *UserPayload_Inception:
		return &MiniblockHeader_UserContent{
			UserContent: make_User_Snapshot(payload),
		}, nil
	case *UserSettingsPayload_Inception:
		return &MiniblockHeader_UserSettingsContent{
			UserSettingsContent: make_UserSettings_Snapshot(payload),
		}, nil
	case *UserDeviceKeyPayload_Inception:
		return &MiniblockHeader_UserDeviceKeyContent{
			UserDeviceKeyContent: make_UserDeviceKey_Snapshot(payload),
		}, nil
	default:
		return nil, fmt.Errorf("unknown inception payload type %T", inceptionEvent.Event.Payload)
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
