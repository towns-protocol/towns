package nodes

import (
	"context"
	"hash/fnv"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/puzpuzpuz/xsync/v3"

	"github.com/river-build/river/core/contracts/river"
	. "github.com/river-build/river/core/node/base"
	"github.com/river-build/river/core/node/crypto"
	"github.com/river-build/river/core/node/dlog"
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

type streamDescriptor struct {
	streamNodesImpl
	nodesUpdatedOnBlock  crypto.BlockNumber
	lastMb               MiniblockRef
	lastMbUpdatedOnBlock crypto.BlockNumber
}

var _ StreamNodes = (*streamDescriptor)(nil)

func newStreamDescriptor(
	stream *registries.GetStreamResult,
	blockNum crypto.BlockNumber,
	localNodeAddress common.Address,
) *streamDescriptor {
	sd := &streamDescriptor{
		streamNodesImpl: streamNodesImpl{
			localNode: localNodeAddress,
		},
		nodesUpdatedOnBlock: blockNum,
		lastMb: MiniblockRef{
			Hash: stream.LastMiniblockHash,
			Num:  int64(stream.LastMiniblockNum),
		},
		lastMbUpdatedOnBlock: blockNum,
	}
	sd.resetNoLock(stream.Nodes)
	return sd
}

func (sd *streamDescriptor) placementUpdated(ctx context.Context, event *river.StreamRegistryV1StreamPlacementUpdated) {
	sd.mu.Lock()
	defer sd.mu.Unlock()
	blockNum := crypto.BlockNumber(event.Raw.BlockNumber)
	if blockNum <= sd.nodesUpdatedOnBlock {
		return
	}
	err := sd.updateNoLock(event.NodeAddress, event.IsAdded)
	if err != nil {
		dlog.FromCtx(ctx).Error("Failed to update stream nodes", "err", err)
	}
	sd.nodesUpdatedOnBlock = blockNum
}

func (sd *streamDescriptor) lastMiniblockUpdated(
	ctx context.Context,
	event *river.StreamRegistryV1StreamLastMiniblockUpdated,
) {
	sd.mu.Lock()
	defer sd.mu.Unlock()
	blockNum := crypto.BlockNumber(event.Raw.BlockNumber)
	if blockNum <= sd.lastMbUpdatedOnBlock {
		return
	}
	sd.lastMb = MiniblockRef{
		Hash: event.LastMiniblockHash,
		Num:  int64(event.LastMiniblockNum),
	}
	sd.lastMbUpdatedOnBlock = blockNum
}

type streamRegistryImpl struct {
	blockchain       *crypto.Blockchain
	localNodeAddress common.Address
	nodeRegistry     NodeRegistry
	onChainConfig    crypto.OnChainConfiguration
	contract         *registries.RiverRegistryContract

	streamNodeCache *xsync.MapOf[StreamId, *streamDescriptor]
}

var _ StreamRegistry = (*streamRegistryImpl)(nil)

func NewStreamRegistry(
	ctx context.Context,
	blockchain *crypto.Blockchain,
	localNodeAddress common.Address,
	nodeRegistry NodeRegistry,
	contract *registries.RiverRegistryContract,
	onChainConfig crypto.OnChainConfiguration,
) (*streamRegistryImpl, error) {
	blockNum, err := blockchain.GetBlockNumber(ctx)
	if err != nil {
		return nil, err
	}

	impl := &streamRegistryImpl{
		blockchain:       blockchain,
		localNodeAddress: localNodeAddress,
		nodeRegistry:     nodeRegistry,
		onChainConfig:    onChainConfig,
		contract:         contract,
		streamNodeCache:  xsync.NewMapOf[StreamId, *streamDescriptor](),
	}

	blockchain.ChainMonitor.OnBlockWithLogs(blockNum+1, impl.onBlockWithLogs)

	return impl, nil
}

func (sr *streamRegistryImpl) onBlockWithLogs(ctx context.Context, blockNum crypto.BlockNumber, logs []*types.Log) {
	streamEvents, errs := sr.contract.FilterStreamEvents(ctx, logs)
	// Process parsed stream events even if some failed to parse
	for _, err := range errs {
		dlog.FromCtx(ctx).Error("Failed to parse stream event", "err", err)
	}

	for _, e := range streamEvents {
		switch event := e.(type) {
		case *river.StreamRegistryV1StreamLastMiniblockUpdated:
			d, ok := sr.streamNodeCache.Load(event.StreamId)
			if ok {
				d.lastMiniblockUpdated(ctx, event)
			}
		case *river.StreamRegistryV1StreamPlacementUpdated:
			d, ok := sr.streamNodeCache.Load(event.StreamId)
			if ok {
				d.placementUpdated(ctx, event)
			}
		case *river.StreamRegistryV1StreamAllocated:
			break
		default:
			dlog.FromCtx(ctx).Error("Unknown stream event", "event", event)
		}
	}
}

func (sr *streamRegistryImpl) GetStreamInfo(ctx context.Context, streamId StreamId) (StreamNodes, error) {
	d, ok := sr.streamNodeCache.Load(streamId)
	if ok {
		return &d.streamNodesImpl, nil
	}

	blockNum, err := sr.blockchain.GetBlockNumber(ctx)
	if err != nil {
		return nil, err
	}
	result, err := sr.contract.GetStream(ctx, streamId, blockNum)
	if err != nil {
		return nil, err
	}

	newD := newStreamDescriptor(result, blockNum, sr.localNodeAddress)

	// TODO: there is a race between inserting the entry and applying block events:
	// event from block in flight might be missed for the new entry being inserted.
	d, _ = sr.streamNodeCache.LoadOrStore(streamId, newD)
	return &d.streamNodesImpl, nil
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
