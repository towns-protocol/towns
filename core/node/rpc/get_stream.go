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
	numPrecedingMiniblocks int64,
) (*connect.Response[GetStreamResponse], error) {
	var stream *StreamAndCookie
	var err error
	if syncCookie != nil {
		stream, err = streamView.GetStreamSince(ctx, s.wallet.Address, syncCookie)
	} else {
		// Use the new method that properly handles preceding miniblocks
		stream = streamView.GetResetStreamAndCookieWithPrecedingMiniblocks(s.wallet.Address, numPrecedingMiniblocks)
	}
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(&GetStreamResponse{Stream: stream}), nil
}
