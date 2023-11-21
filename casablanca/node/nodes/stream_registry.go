package nodes

import (
	"casablanca/node/dlog"
	"casablanca/node/registries"
	"context"
	"hash/fnv"
)

type StreamRegistry interface {
	GetNodeAddressesForStream(ctx context.Context, streamId string) ([]string, error)
	AllocateStream(ctx context.Context, streamId string) ([]string, error)
}

// Temp implementation that hashed the streamId and returns the node that is responsible for it.
// TODO: replace with on-chain registry.
type streamRegistryImpl struct {
	nodeRegistry                NodeRegistry
	streamReplicationFactor     int
	streamRegistryContract      registries.StreamRegistryContract
	useBlockChainStreamRegistry bool
}

var _ StreamRegistry = (*streamRegistryImpl)(nil)

func NewStreamRegistry(nodeRegistry NodeRegistry, useBlockChainStreamRegistry bool, streamRegistryContract registries.StreamRegistryContract, streamReplicationFactor int) *streamRegistryImpl {
	if streamReplicationFactor < 1 {
		streamReplicationFactor = 1
	}
	return &streamRegistryImpl{
		nodeRegistry:                nodeRegistry,
		streamReplicationFactor:     streamReplicationFactor,
		streamRegistryContract:      streamRegistryContract,
		useBlockChainStreamRegistry: useBlockChainStreamRegistry,
	}
}

func hashStringToUint64(s string) uint64 {
	h := fnv.New64a()
	h.Write([]byte(s))
	return h.Sum64()
}

func (sr *streamRegistryImpl) GetNodeAddressesForStream(ctx context.Context, streamId string) ([]string, error) {
	log := dlog.CtxLog(ctx)
	h := hashStringToUint64(streamId)
	index := h % uint64(sr.nodeRegistry.NumNodes())
	addr, err := sr.nodeRegistry.GetNodeAddressByIndex(int(index))
	if err != nil {
		return nil, err
	}

	if sr.useBlockChainStreamRegistry {
		addresses, err := sr.streamRegistryContract.GetNodeAddressesForStream(streamId)
		if err != nil {
			log.Error("Cannot get node addresses for stream", "streamId", streamId, "error", err)
			return nil, err
		}

		if (addresses != nil) && (len(addresses) == 1) && (addresses[0] == addr) {
			return []string{addr}, nil
		}

		_, err = sr.streamRegistryContract.SetNodeAddressesForStream(streamId, []string{addr})
		if err != nil {
			log.Error("Cannot get node addresses for stream", "streamId", streamId, "error", err)
		}
	}

	return []string{addr}, nil
}

func (sr *streamRegistryImpl) AllocateStream(ctx context.Context, streamId string) ([]string, error) {
	return sr.GetNodeAddressesForStream(ctx, streamId)
}
