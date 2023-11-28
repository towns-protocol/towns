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

func (s *Service) localGetStream(ctx context.Context, req *connect_go.Request[GetStreamRequest]) (*connect_go.Response[GetStreamResponse], error) {
	res, err := s.getStream(ctx, req)
	if err != nil {
		getStreamRequests.FailInc()
		return nil, err
	}

	getStreamRequests.PassInc()
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
			Events:         streamView.MinipoolEnvelopes(),
			NextSyncCookie: streamView.SyncCookie(s.wallet.AddressStr),
		},
		Miniblocks: streamView.MiniblocksFromLastSnapshot(),
	}

	return connect_go.NewResponse(resp), nil
}
