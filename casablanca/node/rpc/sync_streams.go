package rpc

import (
	"casablanca/node/infra"
	"casablanca/node/protocol"
	"context"

	. "casablanca/node/base"

	connect_go "github.com/bufbuild/connect-go"
	"google.golang.org/protobuf/encoding/protojson"
)

var (
	syncStreamsRequests   = infra.NewSuccessMetrics("sync_streams_requests", serviceRequests)
	syncStreamsResultSize = infra.NewCounter("sync_streams_result_size", "The total number of events returned by sync streams")
)

func (s *Service) SyncStreams(ctx context.Context, req *connect_go.Request[protocol.SyncStreamsRequest], stream *connect_go.ServerStream[protocol.SyncStreamsResponse]) error {
	ctx, log, requestId := infra.SetLoggerWithRequestId(ctx)
	log.Debugf("SyncStreams: CALL timeout: %d req: %s", req.Msg.TimeoutMs, protojson.Format((req.Msg)))
	err := s.syncStreams(ctx, req, stream)

	if err != nil {
		log.Errorf("SyncStreams error: %v", err)
		syncStreamsRequests.Fail()
		return RpcAddRequestId(err, requestId)
	}
	syncStreamsRequests.Pass()
	return err
}

func (s *Service) syncStreams(ctx context.Context, req *connect_go.Request[protocol.SyncStreamsRequest], stream *connect_go.ServerStream[protocol.SyncStreamsResponse]) error {

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
	total := 0
	for _, stream := range streams {
		total += len(stream.Events)
	}
	syncStreamsResultSize.Add(float64(total))
	err = stream.Send(&res)
	return err

}
