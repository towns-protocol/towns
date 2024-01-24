package rpc

import (
	"context"

	connect_go "github.com/bufbuild/connect-go"

	. "github.com/river-build/river/events"
	"github.com/river-build/river/infra"
	. "github.com/river-build/river/protocol"
)

var getLastMiniblockHashRequests = infra.NewSuccessMetrics("get_last_miniblock_hash", serviceRequests)

func (s *Service) localGetLastMiniblockHash(
	ctx context.Context,
	req *connect_go.Request[GetLastMiniblockHashRequest],
	nodes *StreamNodes,
) (*connect_go.Response[GetLastMiniblockHashResponse], error) {
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
	req *connect_go.Request[GetLastMiniblockHashRequest],
	nodes *StreamNodes,
) (*connect_go.Response[GetLastMiniblockHashResponse], error) {
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

	return connect_go.NewResponse(resp), nil
}
