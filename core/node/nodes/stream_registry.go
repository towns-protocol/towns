package nodes

import (
	"context"

	"github.com/ethereum/go-ethereum/common"

	"github.com/towns-protocol/towns/core/node/crypto"
	"github.com/towns-protocol/towns/core/node/registries"
	. "github.com/towns-protocol/towns/core/node/shared"
)

type StreamRegistry interface {
	// AllocateStream allocates a stream with the given streamId and genesis miniblock.
	AllocateStream(
		ctx context.Context,
		streamId StreamId,
		genesisMiniblockHash common.Hash,
		genesisMiniblock []byte,
	) ([]common.Address, error)

	// AddStream creates a stream with the given streamId and params.
	AddStream(
		ctx context.Context,
		streamId StreamId,
		addrs []common.Address,
		genesisMiniblockHash common.Hash,
		lastMiniblockHash common.Hash,
		lastMiniblockNum int64,
		isSealed bool,
	) error
}

type streamRegistryImpl struct {
	blockchain    *crypto.Blockchain
	nodeRegistry  NodeRegistry
	onChainConfig crypto.OnChainConfiguration
	contract      *registries.RiverRegistryContract
}

func NewStreamRegistry(
	blockchain *crypto.Blockchain,
	nodeRegistry NodeRegistry,
	contract *registries.RiverRegistryContract,
	onChainConfig crypto.OnChainConfiguration,
) StreamRegistry {
	return &streamRegistryImpl{
		blockchain:    blockchain,
		nodeRegistry:  nodeRegistry,
		onChainConfig: onChainConfig,
		contract:      contract,
	}
}

func (sr *streamRegistryImpl) AllocateStream(
	ctx context.Context,
	streamId StreamId,
	genesisMiniblockHash common.Hash,
	genesisMiniblock []byte,
) ([]common.Address, error) {
	addrs, err := sr.nodeRegistry.ChooseStreamNodes(ctx, streamId, int(sr.onChainConfig.Get().ReplicationFactor))
	if err != nil {
		return nil, err
	}

	err = sr.contract.AllocateStream(ctx, streamId, addrs, genesisMiniblockHash, genesisMiniblock)
	if err != nil {
		return nil, err
	}

	return addrs, nil
}

func (sr *streamRegistryImpl) AddStream(
	ctx context.Context,
	streamId StreamId,
	addrs []common.Address,
	genesisMiniblockHash common.Hash,
	lastMiniblockHash common.Hash,
	lastMiniblockNum int64,
	isSealed bool,
) error {
	return sr.contract.AddStream(
		ctx,
		streamId,
		addrs,
		genesisMiniblockHash,
		lastMiniblockHash,
		lastMiniblockNum,
		isSealed,
	)
}
