package rpc

import (
	"context"

	"connectrpc.com/connect"
	"google.golang.org/protobuf/proto"

	. "github.com/river-build/river/core/node/base"
	. "github.com/river-build/river/core/node/protocol"
	"github.com/river-build/river/core/node/shared"
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

	var miniblockNumber int64 = 0
	for {
		miniblocks, err := s.storage.ReadMiniblocks(ctx, streamId, miniblockNumber, miniblockNumber+1)
		if err != nil {
			return err
		}
		if len(miniblocks) == 0 {
			break
		}

		var miniblock Miniblock
		err = proto.Unmarshal(miniblocks[0], &miniblock)
		if err != nil {
			return WrapRiverError(Err_BAD_BLOCK, err).Message("Unable to unmarshal miniblock")
		}

		if err := resp.Send(&GetStreamExResponse{
			Data: &GetStreamExResponse_Miniblock{
				Miniblock: &miniblock,
			},
		}); err != nil {
			return err
		}

		miniblockNumber++
	}

	// Send back an empty response to signal the end of the stream.
	if err := resp.Send(&GetStreamExResponse{}); err != nil {
		return err
	}

	return nil
}
