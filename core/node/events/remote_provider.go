package events

import (
	"context"

	"github.com/ethereum/go-ethereum/common"

	. "github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/utils/rpcinterface"
)

// RemoteProvider abstracts communications required for miniblock production and stream reconciliation
// to make testing of various scenarios easier.
type RemoteProvider interface {
	// GetMbProposal requests miniblock proposal from the given node for the given stream.
	// The node must participate in the stream.
	GetMbProposal(
		ctx context.Context,
		node common.Address,
		request *ProposeMiniblockRequest,
	) (*ProposeMiniblockResponse, error)

	// SaveMbCandidate sends the given mb to the given node and node must save it.
	SaveMbCandidate(
		ctx context.Context,
		node common.Address,
		streamId StreamId,
		candidate *MiniblockInfo,
	) error

	// GetMbs returns a range of miniblocks from the given stream from the given node.
	//
	// Note: it is possible that the returned miniblocks range is limited when the requested miniblock
	// range is too large. Range it limited to chain config setting `stream.getminiblocksmaxpagesize`.
	GetMbs(
		ctx context.Context,
		node common.Address,
		streamId StreamId,
		fromInclusive int64,
		toExclusive int64,
	) ([]*MiniblockInfo, error)

	// GetMiniblocksByIds returns miniblocks by their ids.
	GetMiniblocksByIds(
		ctx context.Context,
		node common.Address,
		req *GetMiniblocksByIdsRequest,
	) (rpcinterface.ServerStreamForClient[GetMiniblockResponse], error)

	// GetLastMiniblockHash returns the last miniblock hash and number for the given stream.
	GetLastMiniblockHash(
		ctx context.Context,
		node common.Address,
		streamId StreamId,
	) (*MiniblockRef, error)

	// GetStream returns the stream from the given node.
	GetStream(
		ctx context.Context,
		node common.Address,
		request *GetStreamRequest,
	) (*GetStreamResponse, error)
}
