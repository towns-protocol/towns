package rpc

import (
	"context"

	"connectrpc.com/connect"
	. "github.com/river-build/river/events"
	"github.com/river-build/river/infra"
	. "github.com/river-build/river/protocol"
)

var getStreamRequests = infra.NewSuccessMetrics("get_stream_requests", serviceRequests)

func (s *Service) localGetStream(
	ctx context.Context,
	req *connect.Request[GetStreamRequest],
	nodes *StreamNodes,
) (*connect.Response[GetStreamResponse], error) {
	res, err := s.getStream(ctx, req, nodes)
	if err != nil {
		getStreamRequests.FailInc()
		return nil, err
	}

	getStreamRequests.PassInc()
	return res, nil
}

func (s *Service) getStream(
	ctx context.Context,
	req *connect.Request[GetStreamRequest],
	nodes *StreamNodes,
) (*connect.Response[GetStreamResponse], error) {
	streamId := req.Msg.StreamId

	_, streamView, err := s.cache.GetStream(ctx, streamId, nodes)
	if err != nil {
		return nil, err
	}

	resp := &GetStreamResponse{
		Stream: &StreamAndCookie{
			Events:         streamView.MinipoolEnvelopes(),
			NextSyncCookie: streamView.SyncCookie(s.wallet.AddressStr),
			Miniblocks:     streamView.MiniblocksFromLastSnapshot(),
		},
	}

	return connect.NewResponse(resp), nil
}
