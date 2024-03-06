package nodes

import (
	"context"
	"hash/fnv"

	"github.com/ethereum/go-ethereum/common"
	. "github.com/river-build/river/core/node/base"
	. "github.com/river-build/river/core/node/protocol"
	"github.com/river-build/river/core/node/registries"
	. "github.com/river-build/river/core/node/shared"
)

type StreamRegistry interface {
	// GetStreamInfo: returns nodes, error
	GetStreamInfo(ctx context.Context, streamId StreamId) (*StreamNodes, error)
	// GetStreamInfo: returns nodes, error
	AllocateStream(ctx context.Context, streamId StreamId, genesisMiniblockHash common.Hash, genesisMiniblock []byte) ([]common.Address, error)
}

type streamRegistryImpl struct {
	localNodeAddress common.Address
	nodeRegistry     NodeRegistry
	replFactor       int
	contract         *registries.RiverRegistryContract
}

var _ StreamRegistry = (*streamRegistryImpl)(nil)

func NewStreamRegistry(localNodeAddress common.Address, nodeRegistry NodeRegistry, contract *registries.RiverRegistryContract, replFactor int) *streamRegistryImpl {
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

func (sr *streamRegistryImpl) GetStreamInfo(ctx context.Context, streamId StreamId) (*StreamNodes, error) {
	ret, err := sr.contract.GetStream(ctx, streamId)
	if err != nil {
		return nil, err
	}
	return NewStreamNodes(ret.Nodes, sr.localNodeAddress), nil
}

func (sr *streamRegistryImpl) AllocateStream(ctx context.Context, streamId StreamId, genesisMiniblockHash common.Hash, genesisMiniblock []byte) ([]common.Address, error) {
	addrs, err := chooseStreamNodes(ctx, streamId, sr.nodeRegistry, sr.replFactor)
	if err != nil {
		return nil, err
	}

	err = sr.contract.AllocateStream(ctx, streamId, addrs, genesisMiniblockHash, genesisMiniblock)
	if err != nil {
		return nil, err
	}

	return addrs, nil
}

func chooseStreamNodes(ctx context.Context, streamId StreamId, nr NodeRegistry, replFactor int) ([]common.Address, error) {
	if replFactor < 1 {
		replFactor = 1
	}
	if nr.NumNodes() < replFactor {
		return nil, RiverError(
			Err_BAD_CONFIG,
			"replication factor is greater than number of nodes",
			"replication_factor",
			replFactor,
			"num_nodes",
			nr.NumNodes(),
		)
	}

	indexes := make([]int, 0, replFactor)
	h := fnv.New64a()
	numNodes := uint64(nr.NumNodes())
	for len(indexes) < replFactor {
		h.Write(streamId.Bytes())
		index := int(h.Sum64() % numNodes)
	outerLoop:
		for {
			for _, i := range indexes {
				if i == index {
					index = (index + 1) % nr.NumNodes()
					continue outerLoop
				}
			}
			break
		}
		indexes = append(indexes, index)
	}

	addrs := make([]common.Address, 0, len(indexes))
	for _, i := range indexes {
		addr, err := nr.GetNodeAddressByIndex(i)
		if err != nil {
			return nil, err
		}
		addrs = append(addrs, addr)
	}
	return addrs, nil
}
