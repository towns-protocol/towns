package rpc

import (
	"context"

	"connectrpc.com/connect"

	. "github.com/river-build/river/core/node/events"
	. "github.com/river-build/river/core/node/protocol"
)

func (s *Service) localGetMiniblocks(
	ctx context.Context,
	req *connect.Request[GetMiniblocksRequest],
	stream SyncStream,
) (*connect.Response[GetMiniblocksResponse], error) {
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
