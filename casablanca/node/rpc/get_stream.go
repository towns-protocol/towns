package rpc

import (
	"context"

	"connectrpc.com/connect"
	. "github.com/river-build/river/base"
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

	if err != nil && req.Msg.Optional && AsRiverError(err).Code == Err_NOT_FOUND {
		// aellis - this is actually an error, if the forwarder thinks the stream exists, but it doesn't exist in the cache
		// it's a real error, but currently (feb 2024) in single node this will reach here
		return connect.NewResponse(&GetStreamResponse{}), nil
	} else if err != nil {
		return nil, err
	} else {
		return connect.NewResponse(&GetStreamResponse{
			Stream: &StreamAndCookie{
				Events:         streamView.MinipoolEnvelopes(),
				NextSyncCookie: streamView.SyncCookie(s.wallet.AddressStr),
				Miniblocks:     streamView.MiniblocksFromLastSnapshot(),
			},
		}), nil
	}
}
