package rpc

import (
	"context"

	"connectrpc.com/connect"

	. "github.com/towns-protocol/towns/core/node/base"
	. "github.com/towns-protocol/towns/core/node/events"
	. "github.com/towns-protocol/towns/core/node/protocol"
)

func (s *Service) localGetMiniblocks(
	ctx context.Context,
	req *connect.Request[GetMiniblocksRequest],
	stream *Stream,
) (*connect.Response[GetMiniblocksResponse], error) {
	toExclusive := req.Msg.ToExclusive

	if toExclusive <= req.Msg.FromInclusive {
		return nil, RiverError(Err_INVALID_ARGUMENT, "invalid range")
	}

	limit := int64(s.chainConfig.Get().GetMiniblocksMaxPageSize)
	if limit > 0 && toExclusive-req.Msg.FromInclusive > limit {
		toExclusive = req.Msg.FromInclusive + limit
	}

	miniblocks, terminus, err := stream.GetMiniblocks(ctx, req.Msg.FromInclusive, toExclusive)
	if err != nil {
		return nil, err
	}

	fromInclusive := req.Msg.FromInclusive
	if len(miniblocks) > 0 {
		header, err := ParseEvent(miniblocks[0].GetHeader())
		if err != nil {
			return nil, err
		}

		fromInclusive = header.Event.GetMiniblockHeader().GetMiniblockNum()
	}

	resp := &GetMiniblocksResponse{
		Miniblocks:    miniblocks,
		Terminus:      terminus,
		FromInclusive: fromInclusive,
		Limit:         limit,
	}

	return connect.NewResponse(resp), nil
}
