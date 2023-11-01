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
	case *GdmChannelPayload_Inception:
		return &common.StreamInfo{
			SpaceId:    inception.StreamId,
			StreamType: common.GDMChannel,
		}, nil
	case *DmChannelPayload_Inception:
		return &common.StreamInfo{
			SpaceId:    inception.StreamId,
			StreamType: common.DMChannel,
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

func DMStreamInfoFromInceptionPayload(payload IsInceptionPayload, streamId string) (*common.DMStreamInfo, error) {
	if payload == nil {
		return nil, RiverError(Err_STREAM_NO_INCEPTION_EVENT, "no inception payload for stream", "streamId", streamId)
	}

	switch inception := payload.(type) {
	case *DmChannelPayload_Inception:
		return &common.DMStreamInfo{
			FirstPartyId:  inception.FirstPartyId,
			SecondPartyId: inception.SecondPartyId,
		}, nil
	default:
		return nil, RiverError(Err_STREAM_BAD_EVENT, "not a DM inception payload").Func("DMStreamInfoFromInceptionPayload")
	}
}

func MediaStreamInfoFromInceptionPayload(payload IsInceptionPayload, streamId string) (*common.MediaStreamInfo, error) {
	if payload == nil {
		return nil, RiverError(Err_STREAM_NO_INCEPTION_EVENT, "no inception payload for stream", "streamId", streamId)
	}
	switch inception := payload.(type) {
	case *MediaPayload_Inception:
		return &common.MediaStreamInfo{
			ChannelId:  inception.ChannelId,
			MediaId:    inception.StreamId,
			ChunkCount: inception.ChunkCount,
		}, nil
	default:
		return nil, RiverError(Err_STREAM_BAD_EVENT, "not a media inception payload").Func("MediaStreamInfoFromInceptionPayload")
	}
}
