package nodes

import (
	"context"
)

// Temp implementation that hashed the streamId and returns the node that is responsible for it.
type fakeStreamRegistryImpl struct {
	localNodeAddress string
	nodeRegistry     NodeRegistry
	replFactor       int
}

var _ StreamRegistry = (*fakeStreamRegistryImpl)(nil)

func NewFakeStreamRegistry(localNodeAddress string, nodeRegistry NodeRegistry, replFactor int) *fakeStreamRegistryImpl {
	return &fakeStreamRegistryImpl{
		localNodeAddress: localNodeAddress,
		nodeRegistry:     nodeRegistry,
		replFactor:       replFactor,
	}
}

func (sr *fakeStreamRegistryImpl) GetStreamInfo(ctx context.Context, streamId string) (*StreamNodes, error) {
	nodes, err := chooseStreamNodes(ctx, streamId, sr.nodeRegistry, sr.replFactor)
	return NewStreamNodes(nodes, sr.localNodeAddress), err
}

func (sr *fakeStreamRegistryImpl) AllocateStream(
	ctx context.Context,
	streamId string,
	genesisMiniblockHash []byte,
	genesisMiniblock []byte,
) ([]string, error) {
	return chooseStreamNodes(ctx, streamId, sr.nodeRegistry, sr.replFactor)
}
