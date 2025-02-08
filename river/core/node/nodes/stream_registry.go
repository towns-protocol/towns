package nodes

import (
	"context"
	"hash/fnv"

	"github.com/ethereum/go-ethereum/common"

	"github.com/towns-protocol/towns/core/contracts/river"
	. "github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/crypto"
	. "github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/registries"
	. "github.com/towns-protocol/towns/core/node/shared"
)

type StreamRegistry interface {
	// GetStreamInfo: returns nodes, error
	AllocateStream(
		ctx context.Context,
		streamId StreamId,
		genesisMiniblockHash common.Hash,
		genesisMiniblock []byte,
	) ([]common.Address, error)
}

type streamRegistryImpl struct {
	blockchain    *crypto.Blockchain
	nodeRegistry  NodeRegistry
	onChainConfig crypto.OnChainConfiguration
	contract      *registries.RiverRegistryContract
}

var _ StreamRegistry = (*streamRegistryImpl)(nil)

func NewStreamRegistry(
	ctx context.Context,
	blockchain *crypto.Blockchain,
	nodeRegistry NodeRegistry,
	contract *registries.RiverRegistryContract,
	onChainConfig crypto.OnChainConfiguration,
) (*streamRegistryImpl, error) {
	impl := &streamRegistryImpl{
		blockchain:    blockchain,
		nodeRegistry:  nodeRegistry,
		onChainConfig: onChainConfig,
		contract:      contract,
	}

	return impl, nil
}

func (sr *streamRegistryImpl) AllocateStream(
	ctx context.Context,
	streamId StreamId,
	genesisMiniblockHash common.Hash,
	genesisMiniblock []byte,
) ([]common.Address, error) {
	addrs, err := sr.chooseStreamNodes(ctx, streamId)
	if err != nil {
		return nil, err
	}

	err = sr.contract.AllocateStream(ctx, streamId, addrs, genesisMiniblockHash, genesisMiniblock)
	if err != nil {
		return nil, err
	}

	return addrs, nil
}

func (sr *streamRegistryImpl) chooseStreamNodes(ctx context.Context, streamId StreamId) ([]common.Address, error) {
	allNodes := sr.nodeRegistry.GetAllNodes()
	nodes := make([]*NodeRecord, 0, len(allNodes))

	for _, n := range allNodes {
		if n.Status() == river.NodeStatus_Operational {
			nodes = append(nodes, n)
		}
	}

	replFactor := int(sr.onChainConfig.Get().ReplicationFactor)

	if len(nodes) < replFactor {
		return nil, RiverError(
			Err_BAD_CONFIG,
			"replication factor is greater than number of operational nodes",
			"replication_factor",
			replFactor,
			"num_nodes",
			len(nodes),
		)
	}

	h := fnv.New64a()
	addrs := make([]common.Address, replFactor)
	for i := 0; i < replFactor; i++ {
		h.Write(streamId[:])
		index := i + int(h.Sum64()%uint64(len(nodes)-i))
		tt := nodes[index]
		nodes[index] = nodes[i]
		nodes[i] = tt
		addrs[i] = nodes[i].Address()
	}

	return addrs, nil
}
