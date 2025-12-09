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
// We skip snapshot validation because we only need the miniblock number from the header,
// not the snapshot content. The snapshot is provided separately in the sync reset response.
func getFirstMiniblockNumber(miniblocks []*protocol.Miniblock) (int64, error) {
	if len(miniblocks) == 0 {
		return 0, base.RiverError(protocol.Err_INVALID_ARGUMENT, "no miniblocks in response")
	}
	opts := events.NewParsedMiniblockInfoOpts().WithSkipSnapshotValidation()
	mbInfo, err := events.NewMiniblockInfoFromProto(miniblocks[0], nil, opts)
	if err != nil {
		return 0, err
	}
	return mbInfo.Ref.Num, nil
}

// fetchMiniblocks fetches miniblocks from remote nodes for a given stream.
// This is used for gap recovery when we detect missing miniblocks on restart.
// It tries preferredNode first (if provided), then each node in the quorum.
// Returns on first success. Returns the raw miniblock protos - caller is responsible for parsing.
func fetchMiniblocks(
	ctx context.Context,
	nodeRegistry nodes.NodeRegistry,
	preferredNode common.Address,
	remotes nodes.StreamNodes,
	streamId shared.StreamId,
	fromInclusive int64,
	toExclusive int64,
) ([]*protocol.Miniblock, error) {
	nodeAddrs := remotes.GetQuorumNodes()
	if len(nodeAddrs) == 0 {
		return nil, base.RiverError(protocol.Err_INVALID_ARGUMENT, "no remote nodes available for gap recovery").
			Tag("streamId", streamId)
	}

	var lastErr error

	// Try preferred node first (the node we're syncing from)
	if preferredNode != (common.Address{}) {
		miniblocks, err := fetchMiniblocksFromNode(
			ctx,
			nodeRegistry,
			preferredNode,
			streamId,
			fromInclusive,
			toExclusive,
		)
		if err == nil {
			return miniblocks, nil
		}
		lastErr = err
	}

	// Try remaining nodes
	for _, nodeAddr := range nodeAddrs {
		// Skip preferred node since we already tried it
		if nodeAddr == preferredNode {
			continue
		}
		miniblocks, err := fetchMiniblocksFromNode(ctx, nodeRegistry, nodeAddr, streamId, fromInclusive, toExclusive)
		if err == nil {
			return miniblocks, nil
		}
		lastErr = err
	}

	return nil, base.AsRiverError(lastErr).
		Message("Failed to fetch miniblocks from all remote nodes").
		Tag("streamId", streamId).
		Tag("fromInclusive", fromInclusive).
		Tag("toExclusive", toExclusive).
		Tag("numNodesTried", len(nodeAddrs))
}

// fetchMiniblocksFromNode fetches miniblocks from a specific node.
// It handles pagination by making multiple requests if the server returns fewer
// miniblocks than requested due to page size limits.
func fetchMiniblocksFromNode(
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

	var allMiniblocks []*protocol.Miniblock
	currentFrom := fromInclusive

	for currentFrom < toExclusive {
		req := connect.NewRequest(&protocol.GetMiniblocksRequest{
			StreamId:      streamId[:],
			FromInclusive: currentFrom,
			ToExclusive:   toExclusive,
		})
		req.Header().Set(headers.RiverNoForwardHeader, headers.RiverHeaderTrueValue)

		resp, err := client.GetMiniblocks(ctx, req)
		if err != nil {
			return nil, base.AsRiverError(err).
				Message("Failed to fetch miniblocks for gap recovery").
				Tag("streamId", streamId).
				Tag("nodeAddr", nodeAddr).
				Tag("fromInclusive", currentFrom).
				Tag("toExclusive", toExclusive)
		}

		miniblocks := resp.Msg.GetMiniblocks()
		if len(miniblocks) == 0 {
			// No miniblocks returned, cannot make progress
			return nil, base.RiverError(protocol.Err_UNAVAILABLE, "Node returned no miniblocks").
				Tag("streamId", streamId).
				Tag("nodeAddr", nodeAddr).
				Tag("fromInclusive", currentFrom).
				Tag("toExclusive", toExclusive)
		}

		allMiniblocks = append(allMiniblocks, miniblocks...)
		currentFrom += int64(len(miniblocks))
	}

	return allMiniblocks, nil
}
