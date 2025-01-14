package rpc

import (
	"context"

	"connectrpc.com/connect"
	. "github.com/river-build/river/core/node/protocol"
)

func (s *Service) GetMiniblockHeader(
	ctx context.Context,
	req *connect.Request[GetMiniblockHeaderRequest],
) (*connect.Response[GetMiniblockHeaderResponse], error) {
	return executeConnectHandler(ctx, req, s, s.getMiniblockHeaderImpl, "GetMiniblockHeader")
}

func (s *Service) getMiniblockHeaderImpl(
	ctx context.Context,
	req *connect.Request[GetMiniblockHeaderRequest],
) (*connect.Response[GetMiniblockHeaderResponse], error) {
	miniblocksRequest := &GetMiniblocksRequest{
		StreamId: req.Msg.StreamId,
		FromInclusive: req.Msg.MiniblockNum,
		ToExclusive: req.Msg.MiniblockNum + 1,
	}
	miniblocksResponse, err := s.GetMiniblocks(ctx, connect.NewRequest(miniblocksRequest))
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(&GetMiniblockHeaderResponse{
		Header: miniblocksResponse.Msg.Miniblocks[0].GetHeader(),
	}), nil
}
