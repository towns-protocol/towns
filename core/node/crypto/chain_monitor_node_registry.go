package crypto

import (
	"context"

	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"go.uber.org/zap/zapcore"

	"github.com/towns-protocol/towns/core/blockchain"
	"github.com/towns-protocol/towns/core/contracts/river"
	"github.com/towns-protocol/towns/core/node/logging"
)

type (
	// NodeRegistryChainMonitor monitors the River Registry contract for node events and calls
	// registered callbacks for each event.
	NodeRegistryChainMonitor interface {
		// OnNodeAdded registers a callback that is called each time a node is added to the
		// River Registry contract.
		OnNodeAdded(from blockchain.BlockNumber, cb OnNodeAddedCallback)

		// OnNodeStatusUpdated registers a callback that is called each time a node status is updated
		// in the River Registry contract.
		OnNodeStatusUpdated(from blockchain.BlockNumber, cb OnNodeStatusUpdatedCallback)

		// OnNodeUrlUpdated registers a callback that is called each time a node url is updated
		// in the River Registry contract.
		OnNodeUrlUpdated(from blockchain.BlockNumber, cb OnNodeUrlUpdatedCallback)

		// OnNodeRemoved registers a callback that is called each time a node is removed from the
		// River Registry contract.
		OnNodeRemoved(from blockchain.BlockNumber, cb OnNodeRemovedCallback)
	}

	// OnNodeAddedCallback called each time a node is added.
	OnNodeAddedCallback = func(ctx context.Context, event *river.NodeRegistryV1NodeAdded)

	// OnNodeStatusUpdatedCallback called each time a node status is updated.
	OnNodeStatusUpdatedCallback = func(ctx context.Context, event *river.NodeRegistryV1NodeStatusUpdated)

	// OnNodeUrlUpdatedCallback called each time a node url is updated.
	OnNodeUrlUpdatedCallback = func(ctx context.Context, event *river.NodeRegistryV1NodeUrlUpdated)

	// OnNodeRemovedCallback called each time a node is removed.
	OnNodeRemovedCallback = func(ctx context.Context, event *river.NodeRegistryV1NodeRemoved)

	nodeRegistryChainMonitor struct {
		chainMonitor ChainMonitor
		nodeRegistry common.Address
		nodeABI      *abi.ABI
	}
)

var _ NodeRegistryChainMonitor = (*nodeRegistryChainMonitor)(nil)

// NewNodeRegistryChainMonitor constructs a NodeRegistryChainMonitor that can monitor the River
// Registry contract for node events and calls the registered callbacks for each event.
func NewNodeRegistryChainMonitor(chainMonitor ChainMonitor, nodeRegistry common.Address) *nodeRegistryChainMonitor {
	nodeABI, err := river.NodeRegistryV1MetaData.GetAbi()
	if err != nil {
		logging.DefaultLogger(zapcore.InfoLevel).
			Panicw("NodeRegistry ABI invalid", "error", err)
	}

	return &nodeRegistryChainMonitor{
		chainMonitor: chainMonitor,
		nodeRegistry: nodeRegistry,
		nodeABI:      nodeABI,
	}
}

func (cm *nodeRegistryChainMonitor) OnNodeAdded(from blockchain.BlockNumber, cb OnNodeAddedCallback) {
	nodeAddedEventTopic := cm.nodeABI.Events["NodeAdded"].ID
	cm.chainMonitor.OnContractWithTopicsEvent(
		from,
		cm.nodeRegistry,
		[][]common.Hash{{nodeAddedEventTopic}},
		func(ctx context.Context, log types.Log) {
			e := river.NodeRegistryV1NodeAdded{
				NodeAddress: common.BytesToAddress(log.Topics[1].Bytes()),
				Operator:    common.BytesToAddress(log.Topics[2].Bytes()),
				Raw:         log,
			}

			if err := cm.nodeABI.UnpackIntoInterface(&e, "NodeAdded", log.Data); err == nil {
				cb(ctx, &e)
			} else {
				logging.FromCtx(ctx).Errorw("unable to unpack NodeAdded event",
					"error", err, "tx", log.TxHash, "index", log.Index, "log", log)
			}
		},
	)
}

func (cm *nodeRegistryChainMonitor) OnNodeRemoved(from blockchain.BlockNumber, cb OnNodeRemovedCallback) {
	nodeRemovedEventTopic := cm.nodeABI.Events["NodeRemoved"].ID
	cm.chainMonitor.OnContractWithTopicsEvent(
		from,
		cm.nodeRegistry,
		[][]common.Hash{{nodeRemovedEventTopic}},
		func(ctx context.Context, log types.Log) {
			e := river.NodeRegistryV1NodeRemoved{
				NodeAddress: common.BytesToAddress(log.Topics[1].Bytes()),
				Raw:         log,
			}

			cb(ctx, &e)
		},
	)
}

func (cm *nodeRegistryChainMonitor) OnNodeUrlUpdated(from blockchain.BlockNumber, cb OnNodeUrlUpdatedCallback) {
	nodeUrlUpdatedEventTopic := cm.nodeABI.Events["NodeUrlUpdated"].ID
	cm.chainMonitor.OnContractWithTopicsEvent(
		from,
		cm.nodeRegistry,
		[][]common.Hash{{nodeUrlUpdatedEventTopic}},
		func(ctx context.Context, log types.Log) {
			e := river.NodeRegistryV1NodeUrlUpdated{
				NodeAddress: common.BytesToAddress(log.Topics[1].Bytes()),
				Raw:         log,
			}

			if err := cm.nodeABI.UnpackIntoInterface(&e, "NodeUrlUpdated", log.Data); err == nil {
				cb(ctx, &e)
			} else {
				logging.FromCtx(ctx).Errorw("unable to unpack NodeUrlUpdated event",
					"error", err, "tx", log.TxHash, "index", log.Index, "log", log)
			}
		},
	)
}

func (cm *nodeRegistryChainMonitor) OnNodeStatusUpdated(from blockchain.BlockNumber, cb OnNodeStatusUpdatedCallback) {
	nodeStatusUpdatedEventTopic := cm.nodeABI.Events["NodeStatusUpdated"].ID
	cm.chainMonitor.OnContractWithTopicsEvent(
		from,
		cm.nodeRegistry,
		[][]common.Hash{{nodeStatusUpdatedEventTopic}},
		func(ctx context.Context, log types.Log) {
			e := river.NodeRegistryV1NodeStatusUpdated{
				NodeAddress: common.BytesToAddress(log.Topics[1].Bytes()),
				Raw:         log,
			}

			if err := cm.nodeABI.UnpackIntoInterface(&e, "NodeStatusUpdated", log.Data); err == nil {
				cb(ctx, &e)
			} else {
				logging.FromCtx(ctx).Errorw("unable to unpack NodeStatusUpdated event",
					"error", err, "tx", log.TxHash, "index", log.Index, "log", log)
			}
		},
	)
}
