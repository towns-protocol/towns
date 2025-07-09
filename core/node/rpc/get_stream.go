package rpc

import (
	"context"

	"connectrpc.com/connect"
	"google.golang.org/protobuf/proto"

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
		stream = streamView.GetResetStreamAndCookie(s.wallet.Address)
		
		// If additional preceding miniblocks are requested, load them
		if numPrecedingMiniblocks > 0 && len(stream.Miniblocks) > 0 && stream.SnapshotMiniblockIndex >= 0 {
			// Calculate how many additional miniblocks we need
			existingPrecedingBlocks := stream.SnapshotMiniblockIndex
			if numPrecedingMiniblocks > existingPrecedingBlocks {
				// Parse the first miniblock header to get its number
				var firstMiniblockHeader MiniblockHeader
				if err := proto.Unmarshal(stream.Miniblocks[0].Header.Event, &firstMiniblockHeader); err != nil {
					// Can't parse header, just return what we have
					return connect.NewResponse(&GetStreamResponse{Stream: stream}), nil
				}
				
				firstMiniblockNum := firstMiniblockHeader.MiniblockNum
				targetStartNum := firstMiniblockNum - (numPrecedingMiniblocks - existingPrecedingBlocks)
				
				if targetStartNum < firstMiniblockNum && targetStartNum >= 0 {
					// Load additional miniblocks from storage
					additionalMiniblocks, err := s.storage.ReadMiniblocks(
						ctx,
						*streamView.StreamId(),
						targetStartNum,
						firstMiniblockNum,
						false, // include snapshots
					)
					if err != nil {
						// If we can't load additional miniblocks, just return what we have
						// This is not a fatal error for the RPC
						return connect.NewResponse(&GetStreamResponse{Stream: stream}), nil
					}
					
					// Convert storage miniblocks to protocol miniblocks
					protoMiniblocks := make([]*Miniblock, 0, len(additionalMiniblocks))
					for _, mb := range additionalMiniblocks {
						var miniblock Miniblock
						if err := proto.Unmarshal(mb.Data, &miniblock); err != nil {
							continue // Skip malformed miniblocks
						}
						protoMiniblocks = append(protoMiniblocks, &miniblock)
					}
					
					// Prepend additional miniblocks to the response
					if len(protoMiniblocks) > 0 {
						stream.Miniblocks = append(protoMiniblocks, stream.Miniblocks...)
						// Update the snapshot index to account for the additional miniblocks
						stream.SnapshotMiniblockIndex += int64(len(protoMiniblocks))
					}
				}
			}
		}
	}
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(&GetStreamResponse{Stream: stream}), nil
}
