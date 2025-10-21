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
	encryptionAlgorithm, err := streamView.GetEncryptionAlgorithm()
	if err != nil {
		return nil, err
	}
	resp := &GetLastMiniblockHashResponse{
		Hash:                lastBlock.Ref.Hash[:],
		MiniblockNum:        lastBlock.Ref.Num,
		EncryptionAlgorithm: encryptionAlgorithm,
	}

	return connect.NewResponse(resp), nil
}
