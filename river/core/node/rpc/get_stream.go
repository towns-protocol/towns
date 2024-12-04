package rpc

import (
	"context"

	"connectrpc.com/connect"

	. "github.com/river-build/river/core/node/events"
	. "github.com/river-build/river/core/node/protocol"
)

func (s *Service) localGetStream(
	ctx context.Context,
	stream SyncStream,
	streamView StreamView,
) (*connect.Response[GetStreamResponse], error) {
	return connect.NewResponse(&GetStreamResponse{
		Stream: &StreamAndCookie{
			Events:         streamView.MinipoolEnvelopes(),
			NextSyncCookie: streamView.SyncCookie(s.wallet.Address),
			Miniblocks:     streamView.MiniblocksFromLastSnapshot(),
		},
	}), nil
}
