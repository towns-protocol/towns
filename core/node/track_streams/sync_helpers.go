package track_streams

import (
	"context"

	"connectrpc.com/connect"
	"github.com/ethereum/go-ethereum/common"

	"github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/events"
	"github.com/towns-protocol/towns/core/node/nodes"
	"github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/rpc/headers"
	"github.com/towns-protocol/towns/core/node/shared"
)

// getFirstMiniblockNumber extracts the miniblock number from the first miniblock in the slice.
// Returns an error if miniblocks is empty or if parsing fails.
func getFirstMiniblockNumber(miniblocks []*protocol.Miniblock) (int64, error) {
	if len(miniblocks) == 0 {
		return 0, base.RiverError(protocol.Err_INVALID_ARGUMENT, "no miniblocks in response")
	}
	mbInfo, err := events.NewMiniblockInfoFromProto(miniblocks[0], nil, events.NewParsedMiniblockInfoOpts())
	if err != nil {
		return 0, err
	}
	return mbInfo.Ref.Num, nil
}

// fetchMiniblocks fetches miniblocks from a remote node for a given stream.
// This is used for gap recovery when we detect missing miniblocks on restart.
// Returns the raw miniblock protos - caller is responsible for parsing.
func fetchMiniblocks(
	ctx context.Context,
	nodeRegistry nodes.NodeRegistry,
	nodeAddr common.Address,
	streamId shared.StreamId,
	fromInclusive int64,
	toExclusive int64,
) ([]*protocol.Miniblock, error) {
	client, err := nodeRegistry.GetStreamServiceClientForAddress(nodeAddr)
	if err != nil {
		return nil, err
	}

	req := connect.NewRequest(&protocol.GetMiniblocksRequest{
		StreamId:      streamId[:],
		FromInclusive: fromInclusive,
		ToExclusive:   toExclusive,
	})
	req.Header().Set(headers.RiverNoForwardHeader, headers.RiverHeaderTrueValue)

	resp, err := client.GetMiniblocks(ctx, req)
	if err != nil {
		return nil, base.AsRiverError(err).
			Message("Failed to fetch miniblocks for gap recovery").
			Tag("streamId", streamId).
			Tag("fromInclusive", fromInclusive).
			Tag("toExclusive", toExclusive)
	}

	return resp.Msg.GetMiniblocks(), nil
}
