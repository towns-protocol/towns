package rpc

import (
	"context"

	connect_go "github.com/bufbuild/connect-go"

	"casablanca/node/infra"
	. "casablanca/node/protocol"
)

var (
	getMiniblocksRequests = infra.NewSuccessMetrics("get_miniblocks_requests", serviceRequests)
)

func (s *Service) localGetMiniblocks(ctx context.Context, req *connect_go.Request[GetMiniblocksRequest]) (*connect_go.Response[GetMiniblocksResponse], error) {
	res, err := s.getMiniblocks(ctx, req)
	if err != nil {
		getMiniblocksRequests.Fail()
		return nil, err
	}

	getMiniblocksRequests.Pass()
	return res, nil
}

func (s *Service) getMiniblocks(ctx context.Context, req *connect_go.Request[GetMiniblocksRequest]) (*connect_go.Response[GetMiniblocksResponse], error) {
	streamId := req.Msg.StreamId

	stream, _, err := s.cache.GetStream(ctx, streamId)
	if err != nil {
		return nil, err
	}

	miniblocks, terminus, err := stream.GetMiniblocks(ctx, int(req.Msg.FromInclusive), int(req.Msg.ToExclusive))

	if err != nil {
		return nil, err
	}

	resp := &GetMiniblocksResponse{
		Miniblocks: miniblocks,
		Terminus:   terminus,
	}

	return connect_go.NewResponse(resp), nil
}
