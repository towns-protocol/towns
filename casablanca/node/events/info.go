package events

import (
	"casablanca/node/common"
	. "casablanca/node/protocol"
	"fmt"
)

func StreamInfoFromInceptionEvent(e *ParsedEvent, streamId string, userId string) (*common.StreamInfo, error) {
	payload := e.Event.GetInceptionPayload()
	if payload == nil {
		return nil, fmt.Errorf("no inception payload for stream %s", streamId)
	}

	switch inception := payload.(type) {
	case *UserPayload_Inception:
		return &common.StreamInfo{
			SpaceId:    inception.StreamId,
			StreamType: common.User,
		}, nil
	case *ChannelPayload_Inception:
		return &common.StreamInfo{
			SpaceId:    inception.SpaceId,
			ChannelId:  inception.StreamId,
			StreamType: common.Channel,
		}, nil
	case *SpacePayload_Inception:
		return &common.StreamInfo{
			SpaceId:    inception.StreamId,
			StreamType: common.Space,
		}, nil
	case *UserSettingsPayload_Inception:
		return &common.StreamInfo{
			SpaceId:    inception.StreamId,
			StreamType: common.UserSettings,
		}, nil
	default:
		return nil, fmt.Errorf("unimplemented stream type %T", inception)
	}
}
