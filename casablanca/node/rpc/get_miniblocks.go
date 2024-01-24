package rpc

import (
	"context"

	connect_go "github.com/bufbuild/connect-go"

	. "github.com/river-build/river/events"
	"github.com/river-build/river/infra"
	. "github.com/river-build/river/protocol"
)

var getMiniblocksRequests = infra.NewSuccessMetrics("get_miniblocks_requests", serviceRequests)

func (s *Service) localGetMiniblocks(
	ctx context.Context,
	req *connect_go.Request[GetMiniblocksRequest],
	nodes *StreamNodes,
) (*connect_go.Response[GetMiniblocksResponse], error) {
	res, err := s.getMiniblocks(ctx, req, nodes)
	if err != nil {
		getMiniblocksRequests.FailInc()
		return nil, err
	}

	getMiniblocksRequests.PassInc()
	return res, nil
}

func (s *Service) getMiniblocks(
	ctx context.Context,
	req *connect_go.Request[GetMiniblocksRequest],
	nodes *StreamNodes,
) (*connect_go.Response[GetMiniblocksResponse], error) {
	streamId := req.Msg.StreamId

	stream, _, err := s.cache.GetStream(ctx, streamId, nodes)
	if err != nil {
		return nil, err
	}

	miniblocks, terminus, err := stream.GetMiniblocks(ctx, req.Msg.FromInclusive, req.Msg.ToExclusive)
	if err != nil {
		return nil, err
	}

	resp := &GetMiniblocksResponse{
		Miniblocks: miniblocks,
		Terminus:   terminus,
	}

	return connect_go.NewResponse(resp), nil
}
