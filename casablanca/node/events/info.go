package events

import (
	. "casablanca/node/base"
	. "casablanca/node/protocol"
	"casablanca/node/shared"
)

func ChannelFromInception(i IsInceptionPayload) (*ChannelPayload_Inception, error) {
	c, ok := i.(*ChannelPayload_Inception)
	if ok {
		return c, nil
	} else {
		return nil, RiverError(Err_WRONG_STREAM_TYPE, "Expected channel stream", "streamId", i.GetStreamId())
	}
}

func ChannelInceptionFromView(v StreamView) (*ChannelPayload_Inception, error) {
	return ChannelFromInception(v.InceptionPayload())
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
