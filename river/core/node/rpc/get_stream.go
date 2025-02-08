package rpc

import (
	"connectrpc.com/connect"

	. "github.com/towns-protocol/towns/core/node/events"
	. "github.com/towns-protocol/towns/core/node/protocol"
)

func (s *Service) localGetStream(
	streamView *StreamView,
) (*connect.Response[GetStreamResponse], error) {
	return connect.NewResponse(&GetStreamResponse{
		Stream: &StreamAndCookie{
			Events:         streamView.MinipoolEnvelopes(),
			NextSyncCookie: streamView.SyncCookie(s.wallet.Address),
			Miniblocks:     streamView.MiniblocksFromLastSnapshot(),
		},
	}), nil
}
