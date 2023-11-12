package rpc

import (
	"context"

	connect_go "github.com/bufbuild/connect-go"

	"casablanca/node/infra"
	. "casablanca/node/protocol"
)

var (
	getLastMiniblockHashRequests = infra.NewSuccessMetrics("get_last_miniblock_hash", serviceRequests)
)

func (s *Service) localGetLastMiniblockHash(
	ctx context.Context,
	req *connect_go.Request[GetLastMiniblockHashRequest],
) (*connect_go.Response[GetLastMiniblockHashResponse], error) {
	res, err := s.getLastMiniblockHash(ctx, req)
	if err != nil {
		getLastMiniblockHashRequests.Fail()
		return nil, err
	}

	getLastMiniblockHashRequests.Pass()
	return res, nil
}

func (s *Service) getLastMiniblockHash(
	ctx context.Context,
	req *connect_go.Request[GetLastMiniblockHashRequest],
) (*connect_go.Response[GetLastMiniblockHashResponse], error) {
	streamId := req.Msg.StreamId

	_, streamView, err := s.cache.GetStream(ctx, streamId)
	if err != nil {
		return nil, err
	}

	hash, num := streamView.LastBlockHashAndNum()
	resp := &GetLastMiniblockHashResponse{
		Hash:         hash,
		MiniblockNum: num,
	}

	return connect_go.NewResponse(resp), nil
}
