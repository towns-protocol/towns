package nodes

import (
	"context"
	"net/http"
	"sync"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	. "github.com/river-build/river/core/node/base"
	"github.com/river-build/river/core/node/contracts"
	"github.com/river-build/river/core/node/crypto"
	"github.com/river-build/river/core/node/dlog"
	"github.com/river-build/river/core/node/http_client"
	. "github.com/river-build/river/core/node/protocol"
	. "github.com/river-build/river/core/node/protocol/protocolconnect"
	"github.com/river-build/river/core/node/registries"

	"connectrpc.com/connect"
)

var TestHttpClientMaker func() *http.Client

type NodeRegistry interface {
	GetNode(address common.Address) (*NodeRecord, error)
	GetAllNodes() []*NodeRecord

	// Returns error for local node.
	GetStreamServiceClientForAddress(address common.Address) (StreamServiceClient, error)
	GetNodeToNodeClientForAddress(address common.Address) (NodeToNodeClient, error)

	// TODO: refactor to provide IsValidNodeAddress(address common.Address) bool functions instead of copying the whole list
	GetValidNodeAddresses() []common.Address
}

type nodeRegistryImpl struct {
	contract         *registries.RiverRegistryContract
	localNodeAddress common.Address
	httpClient       *http.Client

	mu              sync.Mutex
	nodes           map[common.Address]*NodeRecord
	appliedBlockNum crypto.BlockNumber
}

var _ NodeRegistry = (*nodeRegistryImpl)(nil)

func LoadNodeRegistry(
	ctx context.Context,
	contract *registries.RiverRegistryContract,
	localNodeAddress common.Address,
	appliedBlockNum crypto.BlockNumber,
	chainMonitor crypto.ChainMonitor,
) (*nodeRegistryImpl, error) {
	log := dlog.FromCtx(ctx)

	var err error
	var client *http.Client
	if TestHttpClientMaker != nil {
		client = TestHttpClientMaker()
		log.Warn("Using test http client")
	} else {
		client, err = http_client.GetHttpClient(ctx)
		if err != nil {
			log.Error("Error getting http client", "err", err)
			return nil, AsRiverError(err, Err_BAD_CONFIG).
				Message("Unable to get http client").
				Func("LoadNodeRegistry")
		}
	}

	nodes, err := contract.GetAllNodes(ctx, appliedBlockNum)
	if err != nil {
		return nil, err
	}

	ret := &nodeRegistryImpl{
		contract:         contract,
		localNodeAddress: localNodeAddress,
		httpClient:       client,
		nodes:            make(map[common.Address]*NodeRecord, len(nodes)),
		appliedBlockNum:  appliedBlockNum,
	}

	chainMonitor.OnContractWithTopicsEvent(
		contract.Address,
		[][]common.Hash{{contract.NodeRegistryAbi.Events["NodeAdded"].ID}},
		ret.OnNodeAdded,
	)
	chainMonitor.OnContractWithTopicsEvent(
		contract.Address,
		[][]common.Hash{{contract.NodeRegistryAbi.Events["NodeRemoved"].ID}},
		ret.OnNodeRemoved,
	)
	chainMonitor.OnContractWithTopicsEvent(
		contract.Address,
		[][]common.Hash{{contract.NodeRegistryAbi.Events["NodeStatusUpdated"].ID}},
		ret.OnNodeStatusUpdated,
	)
	chainMonitor.OnContractWithTopicsEvent(
		contract.Address,
		[][]common.Hash{{contract.NodeRegistryAbi.Events["NodeUrlUpdated"].ID}},
		ret.OnNodeUrlUpdated,
	)

	localFound := false
	for _, node := range nodes {
		nn := ret.addNode(node.NodeAddress, node.Url, node.Status, node.Operator)
		localFound = localFound || nn.local
	}

	if localNodeAddress != (common.Address{}) && !localFound {
		return nil, RiverError(
			Err_UNKNOWN_NODE,
			"Local node not found in registry",
			"blockNum",
			appliedBlockNum,
			"localAddress",
			localNodeAddress,
		).LogError(log)
	}

	log.Info(
		"Node Registry Loaded from contract",
		"blockNum",
		appliedBlockNum,
		"Nodes",
		ret.nodes,
		"localAddress",
		localNodeAddress,
	)

	return ret, nil
}

func (n *nodeRegistryImpl) addNode(addr common.Address, url string, status uint8, operator common.Address) *NodeRecord {
	// Lock should be taken by the caller
	nn := &NodeRecord{
		address:  addr,
		operator: operator,
		url:      url,
		status:   status,
	}
	if addr == n.localNodeAddress {
		nn.local = true
	} else {
		nn.streamServiceClient = NewStreamServiceClient(n.httpClient, url, connect.WithGRPC())
		nn.nodeToNodeClient = NewNodeToNodeClient(n.httpClient, url, connect.WithGRPC())
	}
	n.nodes[addr] = nn
	return nn
}

// OnNodeAdded can apply INodeRegistry::NodeAdded event against the in-memory node registry.
func (n *nodeRegistryImpl) OnNodeAdded(ctx context.Context, event types.Log) {
	log := dlog.FromCtx(ctx)

	var e contracts.NodeRegistryV1NodeAdded
	if err := n.contract.NodeRegistry.BoundContract().UnpackLog(&e, "NodeAdded", event); err != nil {
		log.Error("OnNodeAdded: unable to decode NodeAdded event")
		return
	}

	n.mu.Lock()
	defer n.mu.Unlock()

	if _, exists := n.nodes[e.NodeAddress]; !exists {
		// TODO: add operator to NodeAdded event
		nodeRecord := n.addNode(e.NodeAddress, e.Url, e.Status, common.Address{})
		log.Info("NodeRegistry: NodeAdded", "node", nodeRecord.address, "blockNum", event.BlockNumber)
	} else {
		log.Error("NodeRegistry: Got NodeAdded for node that already exists in NodeRegistry", "blockNum", event.BlockNumber, "node", e.NodeAddress, "nodes", n.nodes)
	}
}

// OnNodeRemoved can apply INodeRegistry::NodeRemoved event against the in-memory node registry.
func (n *nodeRegistryImpl) OnNodeRemoved(ctx context.Context, event types.Log) {
	log := dlog.FromCtx(ctx)

	var e contracts.NodeRegistryV1NodeRemoved
	if err := n.contract.NodeRegistry.BoundContract().UnpackLog(&e, "NodeRemoved", event); err != nil {
		log.Error("OnNodeRemoved: unable to decode NodeRemoved event")
		return
	}

	n.mu.Lock()
	defer n.mu.Unlock()

	if _, exists := n.nodes[e.NodeAddress]; exists {
		delete(n.nodes, e.NodeAddress)
		log.Info("NodeRegistry: NodeRemoved", "blockNum", event.BlockNumber, "node", e.NodeAddress)
	} else {
		log.Error("NodeRegistry: Got NodeRemoved for node that does not exist in NodeRegistry",
			"blockNum", event.BlockNumber, "node", e.NodeAddress, "nodes", n.nodes)
	}
}

// OnNodeStatusUpdated can apply INodeRegistry::NodeStatusUpdated event against the in-memory node registry.
func (n *nodeRegistryImpl) OnNodeStatusUpdated(ctx context.Context, event types.Log) {
	log := dlog.FromCtx(ctx)

	var e contracts.NodeRegistryV1NodeStatusUpdated
	if err := n.contract.NodeRegistry.BoundContract().UnpackLog(&e, "NodeStatusUpdated", event); err != nil {
		log.Error("OnNodeStatusUpdated: unable to decode NodeStatusUpdated event")
		return
	}

	n.mu.Lock()
	defer n.mu.Unlock()

	nn := n.nodes[e.NodeAddress]
	if nn != nil {
		newNode := *nn
		newNode.status = e.Status
		n.nodes[e.NodeAddress] = &newNode
		log.Info("NodeRegistry: NodeStatusUpdated", "blockNum", event.BlockNumber, "node", nn)
	} else {
		log.Error("NodeRegistry: Got NodeStatusUpdated for node that does not exist in NodeRegistry", "blockNum", event.BlockNumber, "node", e.NodeAddress, "nodes", n.nodes)
	}
}

// OnNodeUrlUpdated can apply INodeRegistry::NodeUrlUpdated events against the in-memory node registry.
func (n *nodeRegistryImpl) OnNodeUrlUpdated(ctx context.Context, event types.Log) {
	log := dlog.FromCtx(ctx)

	var e contracts.NodeRegistryV1NodeUrlUpdated
	if err := n.contract.NodeRegistry.BoundContract().UnpackLog(&e, "NodeUrlUpdated", event); err != nil {
		log.Error("OnNodeUrlUpdated: unable to decode NodeUrlUpdated event")
		return
	}

	n.mu.Lock()
	defer n.mu.Unlock()

	nn := n.nodes[e.NodeAddress]
	if nn != nil {
		newNode := *nn
		newNode.url = e.Url
		if !nn.local {
			newNode.streamServiceClient = NewStreamServiceClient(n.httpClient, e.Url, connect.WithGRPC())
			newNode.nodeToNodeClient = NewNodeToNodeClient(n.httpClient, e.Url, connect.WithGRPC())
		}
		n.nodes[e.NodeAddress] = &newNode
		log.Info("NodeRegistry: NodeUrlUpdated", "blockNum", event.BlockNumber, "node", nn)
	} else {
		log.Error("NodeRegistry: Got NodeUrlUpdated for node that does not exist in NodeRegistry",
			"blockNum", event.BlockNumber, "node", e.NodeAddress, "nodes", n.nodes)
	}
}

func (n *nodeRegistryImpl) GetNode(address common.Address) (*NodeRecord, error) {
	n.mu.Lock()
	defer n.mu.Unlock()

	nn := n.nodes[address]
	if nn == nil {
		return nil, RiverError(Err_UNKNOWN_NODE, "No record for node", "address", address).Func("GetNode")
	}
	return nn, nil
}

func (n *nodeRegistryImpl) GetAllNodes() []*NodeRecord {
	n.mu.Lock()
	defer n.mu.Unlock()

	ret := make([]*NodeRecord, 0, len(n.nodes))
	for _, nn := range n.nodes {
		ret = append(ret, nn)
	}
	return ret
}

// Returns error for local node.
func (n *nodeRegistryImpl) GetStreamServiceClientForAddress(address common.Address) (StreamServiceClient, error) {
	node, err := n.GetNode(address)
	if err != nil {
		return nil, err
	}

	if node.local {
		return nil, RiverError(Err_INTERNAL, "can't get remote stub for local node")
	}

	return node.streamServiceClient, nil
}

// Returns error for local node.
func (n *nodeRegistryImpl) GetNodeToNodeClientForAddress(address common.Address) (NodeToNodeClient, error) {
	node, err := n.GetNode(address)
	if err != nil {
		return nil, err
	}

	if node.local {
		return nil, RiverError(Err_INTERNAL, "can't get remote stub for local node")
	}

	return node.nodeToNodeClient, nil
}

func (n *nodeRegistryImpl) GetValidNodeAddresses() []common.Address {
	n.mu.Lock()
	defer n.mu.Unlock()

	ret := make([]common.Address, 0, len(n.nodes))
	for addr := range n.nodes {
		ret = append(ret, addr)
	}
	return ret
}
