package rpc

import (
	"context"

	connect_go "github.com/bufbuild/connect-go"

	"casablanca/node/infra"
	. "casablanca/node/protocol"
)

var (
	getStreamRequests = infra.NewSuccessMetrics("get_stream_requests", serviceRequests)
)

func (s *Service) GetStream(ctx context.Context, req *connect_go.Request[GetStreamRequest]) (*connect_go.Response[GetStreamResponse], error) {
	ctx, log := ctxAndLogForRequest(ctx, req)

	log.Debug("GetStream ENTER", "streamId", req.Msg.StreamId)

	res, err := s.getStream(ctx, req)
	if err != nil {
		log.Warn("GetStream WARN", "error", err)
		getStreamRequests.Fail()
		return nil, err
	}

	log.Debug("GetStream LEAVE", "response", res.Msg)
	getStreamRequests.Pass()

	return res, nil
}

func (s *Service) getStream(ctx context.Context, req *connect_go.Request[GetStreamRequest]) (*connect_go.Response[GetStreamResponse], error) {
	streamId := req.Msg.StreamId

	_, streamView, err := s.cache.GetStream(ctx, streamId)
	if err != nil {
		return nil, err
	}

	resp := &GetStreamResponse{
		Stream: &StreamAndCookie{
			Events:         streamView.Envelopes(), // todo HNT-2073 switch to MinipoolEnvelopes
			StreamId:       streamView.StreamId(),
			NextSyncCookie: streamView.SyncCookie(),
		},
		Miniblocks: streamView.MiniblocksFromLastSnapshot(),
	}

	return connect_go.NewResponse(resp), nil
}
