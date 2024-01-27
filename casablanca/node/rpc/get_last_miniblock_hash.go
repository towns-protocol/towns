package rpc

import (
	"context"

	"connectrpc.com/connect"
	. "github.com/river-build/river/events"
	"github.com/river-build/river/infra"
	. "github.com/river-build/river/protocol"
)

var getLastMiniblockHashRequests = infra.NewSuccessMetrics("get_last_miniblock_hash", serviceRequests)

func (s *Service) localGetLastMiniblockHash(
	ctx context.Context,
	req *connect.Request[GetLastMiniblockHashRequest],
	nodes *StreamNodes,
) (*connect.Response[GetLastMiniblockHashResponse], error) {
	res, err := s.getLastMiniblockHash(ctx, req, nodes)
	if err != nil {
		getLastMiniblockHashRequests.FailInc()
		return nil, err
	}

	getLastMiniblockHashRequests.PassInc()
	return res, nil
}

func (s *Service) getLastMiniblockHash(
	ctx context.Context,
	req *connect.Request[GetLastMiniblockHashRequest],
	nodes *StreamNodes,
) (*connect.Response[GetLastMiniblockHashResponse], error) {
	streamId := req.Msg.StreamId

	_, streamView, err := s.cache.GetStream(ctx, streamId, nodes)
	if err != nil {
		return nil, err
	}

	lastBlock := streamView.LastBlock()
	resp := &GetLastMiniblockHashResponse{
		Hash:         lastBlock.Hash,
		MiniblockNum: lastBlock.Num,
	}

	return connect.NewResponse(resp), nil
}
