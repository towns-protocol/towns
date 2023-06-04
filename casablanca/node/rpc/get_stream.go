package rpc

import (
	"context"

	connect_go "github.com/bufbuild/connect-go"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/encoding/protojson"

	. "casablanca/node/base"
	"casablanca/node/events"
	"casablanca/node/infra"
	"casablanca/node/protocol"
)

var (
	getStreamRequests = infra.NewSuccessMetrics("get_stream_requests", serviceRequests)
)

func (s *Service) GetStream(ctx context.Context, req *connect_go.Request[protocol.GetStreamRequest]) (*connect_go.Response[protocol.GetStreamResponse], error) {
	ctx, log, requestId := infra.SetLoggerWithRequestId(ctx)
	log.Debugf("GetStream: request %s", protojson.Format((req.Msg)))

	res, err := s.getStream(ctx, req)
	if err != nil {
		log.Errorf("GetStream error: %v", err)
		getStreamRequests.Fail()
		return nil, RpcAddRequestId(err, requestId)
	}

	parsedEvents := events.FormatEventsToJson(res.Msg.Stream.Events)
	log.Debugf("GetStream: response %s %s", protojson.Format((res.Msg)), parsedEvents)
	getStreamRequests.Pass()

	return res, nil
}

func (s *Service) getStream(ctx context.Context, req *connect_go.Request[protocol.GetStreamRequest]) (*connect_go.Response[protocol.GetStreamResponse], error) {
	streamId := req.Msg.StreamId

	stream, err := s.cache.GetStream(ctx, streamId)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "GetStream: error getting stream: %v", err)
	}

	streamView, cookie := stream.GetViewAndSyncCookie()

	resp := &protocol.GetStreamResponse{
		Stream: &protocol.StreamAndCookie{
			Events:         streamView.Envelopes(),
			StreamId:       streamView.StreamId(),
			NextSyncCookie: []byte(cookie),
		},
	}

	return connect_go.NewResponse(resp), nil
}
