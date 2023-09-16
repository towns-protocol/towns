package nodes

import (
	"hash/fnv"
)

type StreamRegistry interface {
	GetNodeAddressesForStream(streamId string, newStream bool) ([]string, error)
}

// Temp implementation that hashed the streamId and returns the node that is responsible for it.
// TODO: replace with on-chain registry.
type streamRegistryImpl struct {
	nodeRegistry NodeRegistry
}

var _ StreamRegistry = (*streamRegistryImpl)(nil)

func NewStreamRegistry(nodeRegistry NodeRegistry) *streamRegistryImpl {
	return &streamRegistryImpl{
		nodeRegistry: nodeRegistry,
	}
}

func hashStringToUint64(s string) uint64 {
	h := fnv.New64a()
	h.Write([]byte(s))
	return h.Sum64()
}

func (sr *streamRegistryImpl) GetNodeAddressesForStream(streamId string, newStream bool) ([]string, error) {
	h := hashStringToUint64(streamId)
	index := h % uint64(sr.nodeRegistry.NumNodes())
	addr, err := sr.nodeRegistry.GetNodeAddressByIndex(int(index))
	if err != nil {
		return nil, err
	}
	return []string{addr}, nil
}
