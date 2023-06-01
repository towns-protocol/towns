package events

import (
	"casablanca/node/common"
	. "casablanca/node/protocol"
	"fmt"
)

func RoomInfoFromInceptionEvent(e *ParsedEvent, streamId string, userId string) (*common.RoomInfo, error) {
	payload := e.Event.GetInceptionPayload()
	if payload == nil {
		return nil, fmt.Errorf("no inception payload for stream %s", streamId)
	}

	creator := common.UserIdFromAddress(e.Event.GetCreatorAddress())
	switch inception := payload.(type) {
	case *UserPayload_Inception:
		return &common.RoomInfo{
			SpaceId:  inception.StreamId,
			RoomType: common.User,
			IsOwner:  creator == userId,
		}, nil
	case *ChannelPayload_Inception:
		return &common.RoomInfo{
			SpaceId:   inception.SpaceId,
			ChannelId: inception.StreamId,
			RoomType:  common.Channel,
			IsOwner:   creator == userId,
		}, nil
	case *SpacePayload_Inception:
		return &common.RoomInfo{
			SpaceId:  inception.StreamId,
			RoomType: common.Space,
			IsOwner:  creator == userId,
		}, nil
	case *UserSettingsPayload_Inception:
		return &common.RoomInfo{
			SpaceId:  inception.StreamId,
			RoomType: common.UserSettings,
			IsOwner:  creator == userId,
		}, nil
	default:
		return nil, fmt.Errorf("unimplemented stream type %T", inception)
	}
}
