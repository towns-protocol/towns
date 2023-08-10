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
	default:
		return nil, fmt.Errorf("unknown inception payload type %T", iPayload)
	}
}
