package nodes

import (
	"context"
	"hash/fnv"
	"sync"

	"github.com/ethereum/go-ethereum/common"
	. "github.com/river-build/river/core/node/base"
	"github.com/river-build/river/core/node/contracts"
	. "github.com/river-build/river/core/node/protocol"
	"github.com/river-build/river/core/node/registries"
	. "github.com/river-build/river/core/node/shared"
)

type StreamRegistry interface {
	// GetStreamInfo: returns nodes, error
	GetStreamInfo(ctx context.Context, streamId StreamId) (StreamNodes, error)
	// GetStreamInfo: returns nodes, error
	AllocateStream(
		ctx context.Context,
		streamId StreamId,
		genesisMiniblockHash common.Hash,
		genesisMiniblock []byte,
	) ([]common.Address, error)
}

type streamRegistryImpl struct {
	localNodeAddress common.Address
	nodeRegistry     NodeRegistry
	replFactor       int
	contract         *registries.RiverRegistryContract

	streamNodeCache sync.Map
}

var _ StreamRegistry = (*streamRegistryImpl)(nil)

func NewStreamRegistry(
	localNodeAddress common.Address,
	nodeRegistry NodeRegistry,
	contract *registries.RiverRegistryContract,
	replFactor int,
) *streamRegistryImpl {
	if replFactor < 1 {
		replFactor = 1
	}
	return &streamRegistryImpl{
		localNodeAddress: localNodeAddress,
		nodeRegistry:     nodeRegistry,
		replFactor:       replFactor,
		contract:         contract,
	}
}

func (sr *streamRegistryImpl) GetStreamInfo(ctx context.Context, streamId StreamId) (StreamNodes, error) {
	if streamNodes, ok := sr.streamNodeCache.Load(streamId); ok {
		return streamNodes.(StreamNodes), nil
	}

	ret, err := sr.contract.GetStream(ctx, streamId)
	if err != nil {
		return nil, err
	}

	streamNodes := NewStreamNodes(ret.Nodes, sr.localNodeAddress)
	sr.streamNodeCache.Store(streamId, streamNodes)
	return streamNodes, nil
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
		if n.Status() == contracts.NodeStatus_Operational {
			nodes = append(nodes, n)
		}
	}

	if len(nodes) < sr.replFactor {
		return nil, RiverError(
			Err_BAD_CONFIG,
			"replication factor is greater than number of operational nodes",
			"replication_factor",
			sr.replFactor,
			"num_nodes",
			len(nodes),
		)
	}

	h := fnv.New64a()
	addrs := make([]common.Address, sr.replFactor)
	for i := 0; i < sr.replFactor; i++ {
		h.Write(streamId[:])
		index := i + int(h.Sum64()%uint64(len(nodes)-i))
		tt := nodes[index]
		nodes[index] = nodes[i]
		nodes[i] = tt
		addrs[i] = nodes[i].Address()
	}

	return addrs, nil
}
