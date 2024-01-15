package nodes

import (
	"context"
	"hash/fnv"

	. "github.com/river-build/river/base"
	. "github.com/river-build/river/protocol"
	"github.com/river-build/river/registries"
)

type StreamRegistry interface {
	GetStreamInfo(ctx context.Context, streamId string) ([]string, []byte, error)
	AllocateStream(ctx context.Context, streamId string, genesisMiniblockHash []byte) ([]string, error)
}

type streamRegistryImpl struct {
	nodeRegistry NodeRegistry
	replFactor   int
	contract     registries.StreamRegistryContract
}

var _ StreamRegistry = (*streamRegistryImpl)(nil)

func NewStreamRegistry(nodeRegistry NodeRegistry, contract registries.StreamRegistryContract, replFactor int) *streamRegistryImpl {
	if replFactor < 1 {
		replFactor = 1
	}
	return &streamRegistryImpl{
		nodeRegistry: nodeRegistry,
		replFactor:   replFactor,
		contract:     contract,
	}
}

func (sr *streamRegistryImpl) GetStreamInfo(ctx context.Context, streamId string) ([]string, []byte, error) {
	return sr.contract.GetStream(ctx, streamId)
}

func (sr *streamRegistryImpl) AllocateStream(ctx context.Context, streamId string, genesisMiniblockHash []byte) ([]string, error) {
	addrs, err := chooseStreamNodes(ctx, streamId, sr.nodeRegistry, sr.replFactor)
	if err != nil {
		return nil, err
	}

	err = sr.contract.AllocateStream(ctx, streamId, addrs, genesisMiniblockHash)
	if err != nil {
		return nil, err
	}

	return addrs, nil
}

func chooseStreamNodes(ctx context.Context, streamId string, nr NodeRegistry, replFactor int) ([]string, error) {
	if replFactor < 1 {
		replFactor = 1
	}
	if nr.NumNodes() < replFactor {
		return nil, RiverError(Err_BAD_CONFIG, "replication factor is greater than number of nodes", "replication_factor", replFactor, "num_nodes", nr.NumNodes())
	}

	indexes := make([]int, 0, replFactor)
	h := fnv.New64a()
	numNodes := uint64(nr.NumNodes())
	for len(indexes) < replFactor {
		h.Write([]byte(streamId))
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

	addrs := make([]string, 0, len(indexes))
	for _, i := range indexes {
		addr, err := nr.GetNodeAddressByIndex(i)
		if err != nil {
			return nil, err
		}
		addrs = append(addrs, addr)
	}
	return addrs, nil
}
