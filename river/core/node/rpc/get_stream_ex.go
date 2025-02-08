package rpc

import (
	"context"

	"connectrpc.com/connect"
	"google.golang.org/protobuf/proto"

	. "github.com/towns-protocol/towns/core/node/base"
	. "github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/shared"
)

func (s *Service) localGetStreamEx(
	ctx context.Context,
	req *connect.Request[GetStreamExRequest],
	resp *connect.ServerStream[GetStreamExResponse],
) (err error) {
	streamId, err := shared.StreamIdFromBytes(req.Msg.StreamId)
	if err != nil {
		return err
	}

	if err = s.storage.ReadMiniblocksByStream(ctx, streamId, func(blockdata []byte, seqNum int) error {
		var mb Miniblock
		if err = proto.Unmarshal(blockdata, &mb); err != nil {
			return WrapRiverError(Err_BAD_BLOCK, err).Message("Unable to unmarshal miniblock")
		}

		return resp.Send(&GetStreamExResponse{
			Data: &GetStreamExResponse_Miniblock{
				Miniblock: &mb,
			},
		})
	}); err != nil {
		return err
	}

	// Send back an empty response to signal the end of the stream.
	if err = resp.Send(&GetStreamExResponse{}); err != nil {
		return err
	}

	return nil
}
