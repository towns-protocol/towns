package rpc

import (
	"context"

	"connectrpc.com/connect"
	"github.com/ethereum/go-ethereum/common"

	. "github.com/river-build/river/core/node/events"
	. "github.com/river-build/river/core/node/protocol"
	. "github.com/river-build/river/core/node/shared"
)

var _ RemoteMiniblockProvider = (*Service)(nil)

func (s *Service) GetMbProposal(
	ctx context.Context,
	node common.Address,
	request *ProposeMiniblockRequest,
) (*ProposeMiniblockResponse, error) {
	stub, err := s.nodeRegistry.GetNodeToNodeClientForAddress(node)
	if err != nil {
		return nil, err
	}

	resp, err := stub.ProposeMiniblock(
		ctx,
		connect.NewRequest(request),
	)
	if err != nil {
		return nil, err
	}

	return resp.Msg, nil
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

// GetMbs returns a range of miniblocks from the given stream.
func (s *Service) GetMbs(
	ctx context.Context,
	node common.Address,
	streamId StreamId,
	fromInclusive int64,
	toExclusive int64,
) ([]*Miniblock, error) {
	remote, err := s.nodeRegistry.GetStreamServiceClientForAddress(node)
	if err != nil {
		return nil, err
	}

	resp, err := remote.GetMiniblocks(ctx, connect.NewRequest(&GetMiniblocksRequest{
		StreamId:      streamId[:],
		FromInclusive: fromInclusive,
		ToExclusive:   toExclusive,
	}))
	if err != nil {
		return nil, err
	}

	return resp.Msg.GetMiniblocks(), nil
}
