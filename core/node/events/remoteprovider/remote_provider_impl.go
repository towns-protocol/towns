package remoteprovider

import (
	"context"

	"connectrpc.com/connect"
	"github.com/ethereum/go-ethereum/common"

	. "github.com/towns-protocol/towns/core/node/events"
	. "github.com/towns-protocol/towns/core/node/nodes"
	. "github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/rpc/headers"
	. "github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/utils/rpcinterface"
)

type remoteProviderImpl struct {
	nodeRegistry NodeRegistry
}

var _ RemoteProvider = (*remoteProviderImpl)(nil)

func NewRemoteProvider(nodeRegistry NodeRegistry) *remoteProviderImpl {
	return &remoteProviderImpl{nodeRegistry: nodeRegistry}
}

func (s *remoteProviderImpl) GetMbProposal(
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

func (s *remoteProviderImpl) SaveMbCandidate(
	ctx context.Context,
	node common.Address,
	streamId StreamId,
	candidate *MiniblockInfo,
) error {
	stub, err := s.nodeRegistry.GetNodeToNodeClientForAddress(node)
	if err != nil {
		return err
	}

	_, err = stub.SaveMiniblockCandidate(
		ctx,
		connect.NewRequest(&SaveMiniblockCandidateRequest{
			StreamId:  streamId[:],
			Miniblock: candidate.Proto,
			Snapshot:  candidate.SnapshotEnvelope,
		}),
	)

	return err
}

// GetMbs returns a range of miniblocks from the given stream.
func (s *remoteProviderImpl) GetMbs(
	ctx context.Context,
	node common.Address,
	streamId StreamId,
	fromInclusive int64,
	toExclusive int64,
) ([]*MiniblockInfo, error) {
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

	mbs := make([]*MiniblockInfo, len(resp.Msg.GetMiniblocks()))
	for i, mbProto := range resp.Msg.GetMiniblocks() {
		mbs[i], err = NewMiniblockInfoFromProto(
			mbProto, resp.Msg.GetMiniblockSnapshot(fromInclusive+int64(i)),
			NewParsedMiniblockInfoOpts().WithExpectedBlockNumber(fromInclusive+int64(i)),
		)
		if err != nil {
			return nil, err
		}
	}

	return mbs, nil
}

func (s *remoteProviderImpl) GetMiniblocksByIds(
	ctx context.Context,
	node common.Address,
	req *GetMiniblocksByIdsRequest,
) (rpcinterface.ServerStreamForClient[GetMiniblockResponse], error) {
	remote, err := s.nodeRegistry.GetNodeToNodeClientForAddress(node)
	if err != nil {
		return nil, err
	}

	return remote.GetMiniblocksByIds(ctx, connect.NewRequest(req))
}

func (s *remoteProviderImpl) GetLastMiniblockHash(
	ctx context.Context,
	node common.Address,
	streamId StreamId,
) (*MiniblockRef, error) {
	remote, err := s.nodeRegistry.GetStreamServiceClientForAddress(node)
	if err != nil {
		return nil, err
	}

	req := connect.NewRequest(&GetLastMiniblockHashRequest{
		StreamId: streamId[:],
	})
	req.Header().Set(RiverNoForwardHeader, RiverHeaderTrueValue)

	resp, err := remote.GetLastMiniblockHash(ctx, req)
	if err != nil {
		return nil, err
	}

	return &MiniblockRef{
		Hash: common.BytesToHash(resp.Msg.Hash),
		Num:  resp.Msg.MiniblockNum,
	}, nil
}
