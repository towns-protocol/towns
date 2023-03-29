package rpc

import (
	"casablanca/node/protocol"
	"context"

	connect "github.com/bufbuild/connect-go"
)

func (s *Service) SyncStreams(ctx context.Context, req *connect.Request[protocol.SyncStreamsRequest], stream *connect.ServerStream[protocol.SyncStreamsResponse]) error {

	blocks, err := s.Storage.SyncStreams(ctx, req.Msg.SyncPos, -1, req.Msg.TimeoutMs)
	if err != nil {
		return err
	}

	var streams []*protocol.StreamAndCookie
	for streamId, events := range blocks {
		streamAndCookie := protocol.StreamAndCookie{
			StreamId:           streamId,
			Events:             events.Events,
			NextSyncCookie:     events.SyncCookie,
			OriginalSyncCookie: events.OriginalSyncCookie,
		}
		streams = append(streams, &streamAndCookie)
	}
	res := protocol.SyncStreamsResponse{
		Streams: streams,
	}
	err = stream.Send(&res)
	return err

}
