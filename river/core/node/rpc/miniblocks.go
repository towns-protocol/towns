package rpc

import (
	"connectrpc.com/connect"
	"context"
	"github.com/ethereum/go-ethereum/common"
	. "github.com/river-build/river/core/node/events"
	. "github.com/river-build/river/core/node/protocol"
	. "github.com/river-build/river/core/node/shared"
)

var _ RemoteMiniblockProvider = (*Service)(nil)

func (s *Service) GetMbProposal(
	ctx context.Context,
	node common.Address,
	streamId StreamId,
	forceSnapshot bool,
) (*MiniblockProposal, error) {
	stub, err := s.nodeRegistry.GetNodeToNodeClientForAddress(node)
	if err != nil {
		return nil, err
	}

	resp, err := stub.ProposeMiniblock(
		ctx,
		connect.NewRequest(&ProposeMiniblockRequest{
			StreamId:           streamId[:],
			DebugForceSnapshot: forceSnapshot,
		}),
	)
	if err != nil {
		return nil, err
	}

	return resp.Msg.Proposal, nil
}

func (s *Service) SaveMbCandidate(
	ctx context.Context,
	node common.Address,
	streamId StreamId,
	mb *Miniblock,
) error {
	stub, err := s.nodeRegistry.GetNodeToNodeClientForAddress(node)
	if err != nil {
		return err
	}

	_, err = stub.SaveMiniblockCandidate(
		ctx,
		connect.NewRequest(&SaveMiniblockCandidateRequest{
			StreamId:  streamId[:],
			Miniblock: mb,
		}),
	)

	return err
}

// GetMiniBlocksStreamed returns a range of mini-blocks from the given stream.
func (s *Service) GetMbsStreamed(
	ctx context.Context,
	node common.Address,
	streamId StreamId,
	fromInclusive int64, // inclusive
	toExclusive int64, // exclusive
) <-chan *MbOrError {
	miniBlocksOrError := make(chan *MbOrError)

	go func() {
		defer close(miniBlocksOrError)

		remote, err := s.nodeRegistry.GetStreamServiceClientForAddress(node)
		if err != nil {
			miniBlocksOrError <- &MbOrError{Err: err}
			return
		}

		for from := fromInclusive; from <= toExclusive; from += 128 {
			to := min(from+128, toExclusive)

			// TODO: consider to switch over to a streaming call for GetMiniblocks to support large block ranges
			miniBlocksResp, err := remote.GetMiniblocks(ctx, connect.NewRequest(&GetMiniblocksRequest{
				StreamId:      streamId[:],
				FromInclusive: from,
				ToExclusive:   to,
			}))

			if err != nil {
				miniBlocksOrError <- &MbOrError{Err: err}
				return
			}

			for _, blk := range miniBlocksResp.Msg.GetMiniblocks() {
				miniBlocksOrError <- &MbOrError{Miniblock: blk}
			}
		}
	}()

	return miniBlocksOrError
}
