package rpc

import (
	"connectrpc.com/connect"

	. "github.com/towns-protocol/towns/core/node/events"
	. "github.com/towns-protocol/towns/core/node/protocol"
)

func (s *Service) localGetLastMiniblockHash(
	streamView *StreamView,
) (*connect.Response[GetLastMiniblockHashResponse], error) {
	lastBlock := streamView.LastBlock()
	resp := &GetLastMiniblockHashResponse{
		Hash:         lastBlock.Ref.Hash[:],
		MiniblockNum: lastBlock.Ref.Num,
	}

	return connect.NewResponse(resp), nil
}
