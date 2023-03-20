package rpc

import (
	. "casablanca/node/protocol"
	"context"

	connect "github.com/bufbuild/connect-go"
	log "github.com/sirupsen/logrus"
)

func (s *Service) SyncStreams(ctx context.Context, req *connect.Request[SyncStreamsRequest]) (*connect.Response[SyncStreamsResponse], error) {
	log.Info("SyncStreams: CALL ", len(req.Msg.SyncPos), req.Msg.TimeoutMs)
	for _, s := range req.Msg.SyncPos {
		log.Infof("SyncStreams: CALL     %s %x", s.StreamId, s.SyncCookie)
	}

	blocks, err := s.Storage.SyncStreams(ctx, req.Msg.SyncPos, -1, req.Msg.TimeoutMs)
	if err != nil {
		return nil, err
	}

	var streams []*StreamAndCookie
	for streamId, events := range blocks {
		streamAndCookie := StreamAndCookie{
			StreamId:           streamId,
			Events:             events.Events,
			NextSyncCookie:     events.SyncCookie,
			OriginalSyncCookie: events.OriginalSyncCookie,
		}
		log.Infof("SyncStreams: RESPONSE %s %d %x => %x", streamId, len(events.Events), events.OriginalSyncCookie, events.SyncCookie)
		streams = append(streams, &streamAndCookie)
	}

	return connect.NewResponse(&SyncStreamsResponse{
		Streams: streams,
	}), nil
}
