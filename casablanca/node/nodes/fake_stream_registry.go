package nodes

import (
	"context"

	. "casablanca/node/base"
)

// Temp implementation that hashed the streamId and returns the node that is responsible for it.
type fakeStreamRegistryImpl struct {
	nodeRegistry NodeRegistry
	replFactor   int
}

var _ StreamRegistry = (*fakeStreamRegistryImpl)(nil)

func NewFakeStreamRegistry(nodeRegistry NodeRegistry, replFactor int) *fakeStreamRegistryImpl {
	return &fakeStreamRegistryImpl{
		nodeRegistry: nodeRegistry,
		replFactor:   replFactor,
	}
}

func (sr *fakeStreamRegistryImpl) GetStreamInfo(ctx context.Context, streamId string) ([]string, []byte, error) {
	nodes, err := chooseStreamNodes(ctx, streamId, sr.nodeRegistry, sr.replFactor)
	return nodes, ZeroHashBytes, err
}

func (sr *fakeStreamRegistryImpl) AllocateStream(ctx context.Context, streamId string, genesisMiniblockHash []byte) ([]string, error) {
	return chooseStreamNodes(ctx, streamId, sr.nodeRegistry, sr.replFactor)
}
