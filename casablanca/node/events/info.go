package events

import (
	. "casablanca/node/base"
	"casablanca/node/common"
	. "casablanca/node/protocol"
)

func StreamInfoFromInceptionPayload(payload IsInceptionPayload, streamId string, userId string) (*common.StreamInfo, error) {
	if payload == nil {
		return nil, RiverError(Err_STREAM_NO_INCEPTION_EVENT, "no inception payload for stream", "streamId", streamId)
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
		return nil, RiverError(Err_STREAM_BAD_EVENT, "unimplemented stream type").Func("StreamInfoFromInceptionPayload")
	}
}

func MediaStreamInfoFromInceptionPayload(payload IsInceptionPayload, streamId string) (*common.MediaStreamInfo, error) {
	if payload == nil {
		return nil, RiverError(Err_STREAM_NO_INCEPTION_EVENT, "no inception payload for stream", "streamId", streamId)
	}
	switch inception := payload.(type) {
	case *MediaPayload_Inception:
		return &common.MediaStreamInfo{
			StreamInfo: common.StreamInfo{
				SpaceId:   inception.SpaceId,
				ChannelId: inception.ChannelId,
			},
			MediaId:    inception.StreamId,
			ChunkCount: inception.ChunkCount,
		}, nil
	default:
		return nil, RiverError(Err_STREAM_BAD_EVENT, "not a media inception payload").Func("MediaStreamInfoFromInceptionPayload")
	}
}
