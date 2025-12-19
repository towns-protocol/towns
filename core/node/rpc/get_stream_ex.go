package rpc

import (
	"context"

	"connectrpc.com/connect"
	"google.golang.org/protobuf/proto"

	. "github.com/towns-protocol/towns/core/node/base"
	. "github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/shared"
)

// localGetStreamEx is the local implementation of GetStreamEx and writes all the
// stream miniblocks to the given resp.
func (s *Service) localGetStreamEx(
	ctx context.Context,
	req *connect.Request[GetStreamExRequest],
	resp *connect.ServerStream[GetStreamExResponse],
) (err error) {
	streamId, err := shared.StreamIdFromBytes(req.Msg.StreamId)
	if err != nil {
		return err
	}

	lastMiniblockNum, err := s.storage.GetLastMiniblockNumber(ctx, streamId)
	if err != nil {
		return err
	}

	const pageSize = int64(10)
	toExclusive := lastMiniblockNum + 1

	for start := int64(0); start < toExclusive; start += pageSize {
		miniblockDescriptors, _, err := s.storage.ReadMiniblocks(
			ctx, streamId, start, min(start+pageSize, toExclusive), req.Msg.GetOmitSnapshot())
		if err != nil {
			return err
		}

		for _, miniblockDescriptor := range miniblockDescriptors {
			var mb Miniblock
			if err = proto.Unmarshal(miniblockDescriptor.Data, &mb); err != nil {
				return WrapRiverError(Err_BAD_BLOCK, err).Message("Unable to unmarshal miniblock")
			}

			var snapshot *Envelope
			if len(miniblockDescriptor.Snapshot) > 0 && !req.Msg.GetOmitSnapshot() {
				snapshot = &Envelope{}
				if err = proto.Unmarshal(miniblockDescriptor.Snapshot, snapshot); err != nil {
					return WrapRiverError(Err_BAD_BLOCK, err).Message("Unable to unmarshal snapshot")
				}
			}

			if err := resp.Send(&GetStreamExResponse{
				Data:     &GetStreamExResponse_Miniblock{Miniblock: &mb},
				Snapshot: snapshot,
			}); err != nil {
				return err
			}
		}
	}

	// Send back an empty response to signal the end of the stream.
	if err = resp.Send(&GetStreamExResponse{}); err != nil {
		return err
	}

	return nil
}
