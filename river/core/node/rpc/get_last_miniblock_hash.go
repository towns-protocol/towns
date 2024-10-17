package rpc

import (
	"context"

	"connectrpc.com/connect"

	. "github.com/river-build/river/core/node/protocol"
	"github.com/river-build/river/core/node/shared"
)

func (s *Service) localGetLastMiniblockHash(
	ctx context.Context,
	req *connect.Request[GetLastMiniblockHashRequest],
) (*connect.Response[GetLastMiniblockHashResponse], error) {
	streamId, err := shared.StreamIdFromBytes(req.Msg.StreamId)
	if err != nil {
		return nil, err
	}

	stream, err := s.cache.GetStream(ctx, streamId)
	if err != nil {
		return nil, err
	}

	streamView, err := stream.GetView(ctx)
	if err != nil {
		return nil, err
	}

	lastBlock := streamView.LastBlock()
	resp := &GetLastMiniblockHashResponse{
		Hash:         lastBlock.Ref.Hash[:],
		MiniblockNum: lastBlock.Ref.Num,
	}

	return connect.NewResponse(resp), nil
}
