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
	var stream *StreamAndCookie
	var err error
	if syncCookie != nil {
		stream, err = streamView.GetStreamSince(ctx, s.wallet, syncCookie)
	} else {
		stream, err = streamView.GetResetStreamAndCookie(s.wallet)
	}
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(
		&GetStreamResponse{Stream: stream},
	), nil
}
