package rpc

import (
	"context"

	"connectrpc.com/connect"
	"github.com/river-build/river/core/node/infra"
	. "github.com/river-build/river/core/node/protocol"
)

var getMiniblocksRequests = infra.NewSuccessMetrics("get_miniblocks_requests", serviceRequests)

func (s *Service) localGetMiniblocks(
	ctx context.Context,
	req *connect.Request[GetMiniblocksRequest],
) (*connect.Response[GetMiniblocksResponse], error) {
	res, err := s.getMiniblocks(ctx, req)
	if err != nil {
		getMiniblocksRequests.FailInc()
		return nil, err
	}

	getMiniblocksRequests.PassInc()
	return res, nil
}

func (s *Service) getMiniblocks(
	ctx context.Context,
	req *connect.Request[GetMiniblocksRequest],
) (*connect.Response[GetMiniblocksResponse], error) {
	streamId := req.Msg.StreamId

	stream, _, err := s.cache.GetStream(ctx, streamId)
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

	return connect.NewResponse(resp), nil
}
