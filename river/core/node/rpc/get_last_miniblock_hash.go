package rpc

import (
	"context"

	"connectrpc.com/connect"

	. "github.com/river-build/river/core/node/events"
	. "github.com/river-build/river/core/node/protocol"
)

func (s *Service) localGetLastMiniblockHash(
	ctx context.Context,
	streamView StreamView,
) (*connect.Response[GetLastMiniblockHashResponse], error) {
	lastBlock := streamView.LastBlock()
	resp := &GetLastMiniblockHashResponse{
		Hash:         lastBlock.Ref.Hash[:],
		MiniblockNum: lastBlock.Ref.Num,
	}

	return connect.NewResponse(resp), nil
}
