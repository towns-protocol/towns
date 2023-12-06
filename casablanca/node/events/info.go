package events

import (
	. "casablanca/node/base"
	. "casablanca/node/protocol"
	"casablanca/node/shared"
)

func StreamInfoFromInceptionPayload(payload IsInceptionPayload, streamId string, userId string) (*shared.StreamInfo, error) {
	if payload == nil {
		return nil, RiverError(Err_STREAM_NO_INCEPTION_EVENT, "no inception payload for stream", "streamId", streamId)
	}

	switch inception := payload.(type) {
	case *UserPayload_Inception:
		return &shared.StreamInfo{
			SpaceId:    inception.StreamId,
			StreamType: shared.User,
		}, nil
	case *ChannelPayload_Inception:
		return &shared.StreamInfo{
			SpaceId:    inception.SpaceId,
			ChannelId:  inception.StreamId,
			StreamType: shared.Channel,
		}, nil
	case *GdmChannelPayload_Inception:
		return &shared.StreamInfo{
			SpaceId:    inception.StreamId,
			StreamType: shared.GDMChannel,
		}, nil
	case *DmChannelPayload_Inception:
		return &shared.StreamInfo{
			SpaceId:    inception.StreamId,
			StreamType: shared.DMChannel,
		}, nil
	case *SpacePayload_Inception:
		return &shared.StreamInfo{
			SpaceId:    inception.StreamId,
			StreamType: shared.Space,
		}, nil
	case *UserSettingsPayload_Inception:
		return &shared.StreamInfo{
			SpaceId:    inception.StreamId,
			StreamType: shared.UserSettings,
		}, nil
	default:
		return nil, RiverError(Err_STREAM_BAD_EVENT, "unimplemented stream type").Func("StreamInfoFromInceptionPayload")
	}
}

func DMStreamInfoFromInceptionPayload(payload IsInceptionPayload, streamId string) (*shared.DMStreamInfo, error) {
	if payload == nil {
		return nil, RiverError(Err_STREAM_NO_INCEPTION_EVENT, "no inception payload for stream", "streamId", streamId)
	}

	switch inception := payload.(type) {
	case *DmChannelPayload_Inception:
		return &shared.DMStreamInfo{
			FirstPartyId:  inception.FirstPartyId,
			SecondPartyId: inception.SecondPartyId,
		}, nil
	default:
		return nil, RiverError(Err_STREAM_BAD_EVENT, "not a DM inception payload").Func("DMStreamInfoFromInceptionPayload")
	}
}

func MediaStreamInfoFromInceptionPayload(payload IsInceptionPayload, streamId string) (*shared.MediaStreamInfo, error) {
	if payload == nil {
		return nil, RiverError(Err_STREAM_NO_INCEPTION_EVENT, "no inception payload for stream", "streamId", streamId)
	}
	switch inception := payload.(type) {
	case *MediaPayload_Inception:
		return &shared.MediaStreamInfo{
			ChannelId:  inception.ChannelId,
			MediaId:    inception.StreamId,
			ChunkCount: inception.ChunkCount,
		}, nil
	default:
		return nil, RiverError(Err_STREAM_BAD_EVENT, "not a media inception payload").Func("MediaStreamInfoFromInceptionPayload")
	}
}
