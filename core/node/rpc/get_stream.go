package rpc

import (
	"context"

	"connectrpc.com/connect"

	. "github.com/towns-protocol/towns/core/node/events"
	. "github.com/towns-protocol/towns/core/node/protocol"
)

func (s *Service) localGetStream(
	ctx context.Context,
	streamView *StreamView,
	syncCookie *SyncCookie,
) (*connect.Response[GetStreamResponse], error) {
	if syncCookie != nil {
		stream, err := streamView.GetStreamSince(ctx, s.wallet.Address, syncCookie)
		if err != nil {
			return nil, err
		}
		return connect.NewResponse(
			&GetStreamResponse{Stream: stream},
		), nil
	} else {
		return connect.NewResponse(&GetStreamResponse{
			Stream: &StreamAndCookie{
				Events:         streamView.MinipoolEnvelopes(),
				NextSyncCookie: streamView.SyncCookie(s.wallet.Address),
				Miniblocks:     streamView.MiniblocksFromLastSnapshot(),
				SyncReset:      true,
			},
		}), nil
	}
}
