package rpc

import (
	"context"

	"connectrpc.com/connect"
	. "github.com/river-build/river/core/node/protocol"
	"github.com/river-build/river/core/node/shared"
)

func (s *Service) localGetMiniblocks(
	ctx context.Context,
	req *connect.Request[GetMiniblocksRequest],
) (*connect.Response[GetMiniblocksResponse], error) {
	streamId, err := shared.StreamIdFromBytes(req.Msg.StreamId)
	if err != nil {
		return nil, err
	}

	stream, err := s.cache.GetSyncStream(ctx, streamId)
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
