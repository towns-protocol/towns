package nodes

import (
	"context"
	"net/http"
	"slices"
	"sync"

	"github.com/ethereum/go-ethereum/accounts/abi/bind"

	"connectrpc.com/connect"
	"connectrpc.com/otelconnect"
	"github.com/ethereum/go-ethereum/common"

	"github.com/towns-protocol/towns/core/blockchain"
	"github.com/towns-protocol/towns/core/config"
	"github.com/towns-protocol/towns/core/contracts/river"
	. "github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/crypto"
	"github.com/towns-protocol/towns/core/node/logging"
	. "github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/protocol/protocolconnect"
	"github.com/towns-protocol/towns/core/node/registries"
)

type NodeRegistry interface {
	GetNode(address common.Address) (*NodeRecord, error)
	GetNodeByPermanentIndex(index int32) (*NodeRecord, error)
	GetAllNodes() []*NodeRecord

	// Returns error for local node.
	GetStreamServiceClientForAddress(address common.Address) (StreamServiceClient, error)
	GetNodeToNodeClientForAddress(address common.Address) (NodeToNodeClient, error)

	// TODO: refactor to provide IsValidNodeAddress(address common.Address) bool functions instead of copying the whole
	// list
	GetValidNodeAddresses() []common.Address

	IsOperator(address common.Address) bool
}

type nodeRegistryImpl struct {
	contract           *registries.RiverRegistryContract
	onChainConfig      crypto.OnChainConfiguration
	localNodeAddress   common.Address
	httpClient         *http.Client
	httpClientWithCert *http.Client
	connectOpts        []connect.ClientOption

	mu                       sync.RWMutex
	nodesLocked              map[common.Address]*NodeRecord
	nodesByIndexLocked       map[int32]*NodeRecord
	appliedBlockNumLocked    blockchain.BlockNumber
	nextPermanentIndexLocked int

	// All fields below are recalculated from nodesLocked by resetLocked()
	// All fields are immutable, i.e. copy under RWLock can be returned to the caller
	allNodesLocked    []*NodeRecord
	activeNodesLocked []*NodeRecord
	validAddrsLocked  []common.Address
	operatorsLocked   map[common.Address]bool
}

var _ NodeRegistry = (*nodeRegistryImpl)(nil)

func LoadNodeRegistry(
	ctx context.Context,
	contract *registries.RiverRegistryContract,
	localNodeAddress common.Address,
	appliedBlockNum blockchain.BlockNumber,
	chainMonitor crypto.ChainMonitor,
	onChainConfig crypto.OnChainConfiguration,
	httpClient *http.Client,
	httpClientWithCert *http.Client,
	connectOtelIterceptor *otelconnect.Interceptor,
) (*nodeRegistryImpl, error) {
	log := logging.FromCtx(ctx)

	nodes, err := contract.GetAllNodes(ctx, appliedBlockNum)
	if err != nil {
		return nil, err
	}

	connectOpts := []connect.ClientOption{connect.WithGRPC()}
	if connectOtelIterceptor != nil {
		connectOpts = append(connectOpts, connect.WithInterceptors(connectOtelIterceptor))
	}

	ret := &nodeRegistryImpl{
		contract:              contract,
		onChainConfig:         onChainConfig,
		localNodeAddress:      localNodeAddress,
		httpClient:            httpClient,
		httpClientWithCert:    httpClientWithCert,
		nodesLocked:           make(map[common.Address]*NodeRecord, len(nodes)),
		appliedBlockNumLocked: appliedBlockNum,
		connectOpts:           connectOpts,
	}

	localFound := false
	for _, node := range nodes {
		nn, _ := ret.addNodeLocked(node.NodeAddress, node.Url, node.Status, node.Operator, node.PermanentIndex)
		localFound = localFound || nn.local
	}
	ret.resetLocked()

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

	if config.UseDetailedLog(ctx) {
		log.Infow(
			"Node Registry Loaded from contract",
			"blockNum",
			appliedBlockNum,
			"Nodes",
			ret.allNodesLocked,
			"localAddress",
			localNodeAddress,
		)
	}

	// register node registry callbacks
	nodeRegistryMonitor := crypto.NewNodeRegistryChainMonitor(chainMonitor, contract.Address)
	nodeRegistryMonitor.OnNodeAdded(appliedBlockNum+1, ret.OnNodeAdded)
	nodeRegistryMonitor.OnNodeRemoved(appliedBlockNum+1, ret.OnNodeRemoved)
	nodeRegistryMonitor.OnNodeStatusUpdated(appliedBlockNum+1, ret.OnNodeStatusUpdated)
	nodeRegistryMonitor.OnNodeUrlUpdated(appliedBlockNum+1, ret.OnNodeUrlUpdated)

	return ret, nil
}

func (n *nodeRegistryImpl) resetLocked() {
	n.allNodesLocked = make([]*NodeRecord, 0, len(n.nodesLocked))
	n.activeNodesLocked = make([]*NodeRecord, 0, len(n.nodesLocked))
	n.validAddrsLocked = make([]common.Address, 0, len(n.nodesLocked))
	n.operatorsLocked = make(map[common.Address]bool, len(n.nodesLocked))
	n.nodesByIndexLocked = make(map[int32]*NodeRecord, len(n.nodesLocked))

	nodeBlocklist := n.onChainConfig.Get().NodeBlocklist
	for addr, nn := range n.nodesLocked {
		n.allNodesLocked = append(n.allNodesLocked, nn)
		n.validAddrsLocked = append(n.validAddrsLocked, addr)
		n.operatorsLocked[nn.operator] = true
		if idx := int32(nn.permanentIndex); idx > 0 {
			n.nodesByIndexLocked[idx] = nn
		}
		if nn.Status() == river.NodeStatus_Operational && !slices.Contains(nodeBlocklist, nn.Address()) {
			n.activeNodesLocked = append(n.activeNodesLocked, nn)
		}
	}
}

// addNodeLocked adds a node to the registry if it does not exist.
// Returns new node record and a true if the node was added,
// existing node record and false if it already existed.
func (n *nodeRegistryImpl) addNodeLocked(
	addr common.Address,
	url string,
	status uint8,
	operator common.Address,
	permanentIndex uint32,
) (*NodeRecord, bool) {
	if existingNode, ok := n.nodesLocked[addr]; ok {
		return existingNode, false
	}

	nn := &NodeRecord{
		address:        addr,
		operator:       operator,
		url:            url,
		status:         status,
		permanentIndex: int(permanentIndex),
	}
	if addr == n.localNodeAddress {
		nn.local = true
	} else {
		nn.streamServiceClient = NewStreamServiceClient(n.httpClient, url, n.connectOpts...)
		nn.nodeToNodeClient = NewNodeToNodeClient(n.httpClientWithCert, url, n.connectOpts...)
	}
	n.nodesLocked[addr] = nn
	return nn, true
}

// OnNodeAdded can apply INodeRegistry::NodeAdded event against the in-memory node registry.
func (n *nodeRegistryImpl) OnNodeAdded(ctx context.Context, e *river.NodeRegistryV1NodeAdded) {
	log := logging.FromCtx(ctx)

	// TODO: Remove this call after NodeAdded event is updated to include permanent index.
	node, err := n.contract.NodeRegistry.GetNode(&bind.CallOpts{Context: ctx}, e.NodeAddress)
	if err != nil {
		log.Errorw("NodeRegistry: Got NodeAdded event but failed to get node record from the node registry contract",
			"err", err, "address", e.NodeAddress)
		return
	}

	n.mu.Lock()
	defer n.mu.Unlock()

	nodeRecord, added := n.addNodeLocked(e.NodeAddress, e.Url, e.Status, e.Operator, node.PermanentIndex)
	if added {
		n.resetLocked()
		// TODO: add operator to NodeAdded event
		log.Infow(
			"NodeRegistry: NodeAdded",
			"node",
			nodeRecord.address,
			"blockNum",
			e.Raw.BlockNumber,
			"operator",
			e.Operator,
		)
	} else {
		log.Errorw("NodeRegistry: Got NodeAdded for node that already exists in NodeRegistry",
			"blockNum", e.Raw.BlockNumber, "node", e.NodeAddress, "operator", e.Operator, "nodes", n.allNodesLocked)
	}
}

// OnNodeRemoved can apply INodeRegistry::NodeRemoved event against the in-memory node registry.
func (n *nodeRegistryImpl) OnNodeRemoved(ctx context.Context, e *river.NodeRegistryV1NodeRemoved) {
	log := logging.FromCtx(ctx)

	n.mu.Lock()
	defer n.mu.Unlock()
	if _, exists := n.nodesLocked[e.NodeAddress]; exists {
		delete(n.nodesLocked, e.NodeAddress)
		n.resetLocked()
		log.Infow("NodeRegistry: NodeRemoved", "blockNum", e.Raw.BlockNumber, "node", e.NodeAddress)
	} else {
		log.Errorw("NodeRegistry: Got NodeRemoved for node that does not exist in NodeRegistry",
			"blockNum", e.Raw.BlockNumber, "node", e.NodeAddress, "nodes", n.allNodesLocked)
	}
}

// OnNodeStatusUpdated can apply INodeRegistry::NodeStatusUpdated event against the in-memory node registry.
func (n *nodeRegistryImpl) OnNodeStatusUpdated(ctx context.Context, e *river.NodeRegistryV1NodeStatusUpdated) {
	log := logging.FromCtx(ctx)

	n.mu.Lock()
	defer n.mu.Unlock()
	nn := n.nodesLocked[e.NodeAddress]
	if nn != nil {
		newNode := *nn
		newNode.status = e.Status
		n.nodesLocked[e.NodeAddress] = &newNode
		n.resetLocked()
		log.Infow("NodeRegistry: NodeStatusUpdated", "blockNum", e.Raw.BlockNumber, "node", nn)
	} else {
		log.Errorw("NodeRegistry: Got NodeStatusUpdated for node that does not exist in NodeRegistry",
			"blockNum", e.Raw.BlockNumber, "node", e.NodeAddress, "nodes", n.allNodesLocked)
	}
}

// OnNodeUrlUpdated can apply INodeRegistry::NodeUrlUpdated events against the in-memory node registry.
func (n *nodeRegistryImpl) OnNodeUrlUpdated(ctx context.Context, e *river.NodeRegistryV1NodeUrlUpdated) {
	log := logging.FromCtx(ctx)

	n.mu.Lock()
	defer n.mu.Unlock()
	nn := n.nodesLocked[e.NodeAddress]
	if nn != nil {
		newNode := *nn
		newNode.url = e.Url
		if !nn.local {
			newNode.streamServiceClient = NewStreamServiceClient(n.httpClient, e.Url, n.connectOpts...)
			newNode.nodeToNodeClient = NewNodeToNodeClient(n.httpClientWithCert, e.Url, n.connectOpts...)
		}
		n.nodesLocked[e.NodeAddress] = &newNode
		n.resetLocked()
		log.Infow("NodeRegistry: NodeUrlUpdated", "blockNum", e.Raw.BlockNumber, "node", nn)
	} else {
		log.Errorw("NodeRegistry: Got NodeUrlUpdated for node that does not exist in NodeRegistry",
			"blockNum", e.Raw.BlockNumber, "node", e.NodeAddress, "nodes", n.allNodesLocked)
	}
}

func (n *nodeRegistryImpl) GetNode(address common.Address) (*NodeRecord, error) {
	n.mu.RLock()
	defer n.mu.RUnlock()
	nn := n.nodesLocked[address]
	if nn == nil {
		return nil, RiverError(Err_UNKNOWN_NODE, "No record for node", "address", address).Func("GetNode")
	}
	return nn, nil
}

func (n *nodeRegistryImpl) GetNodeByPermanentIndex(index int32) (*NodeRecord, error) {
	n.mu.RLock()
	defer n.mu.RUnlock()
	nn := n.nodesByIndexLocked[index]
	if nn == nil {
		return nil, RiverError(
			Err_UNKNOWN_NODE,
			"No record for node index",
			"index",
			index,
		).Func("GetNodeByPermanentIndex")
	}
	return nn, nil
}

func (n *nodeRegistryImpl) GetAllNodes() []*NodeRecord {
	n.mu.RLock()
	defer n.mu.RUnlock()
	return n.allNodesLocked
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

// GetNodeToNodeClientForAddress returns error for local node.
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
	n.mu.RLock()
	defer n.mu.RUnlock()
	return n.validAddrsLocked
}

// CloneWithClients returns a new node registry with cloned values from n and the given
// httpClient and httpClientWithCert.
func (n *nodeRegistryImpl) CloneWithClients(
	httpClient *http.Client,
	httpClientWithCert *http.Client,
) *nodeRegistryImpl {
	n.mu.RLock()
	defer n.mu.RUnlock()

	clone := &nodeRegistryImpl{
		contract:              n.contract,
		onChainConfig:         n.onChainConfig,
		localNodeAddress:      n.localNodeAddress,
		httpClient:            httpClient,
		httpClientWithCert:    httpClientWithCert,
		appliedBlockNumLocked: n.appliedBlockNumLocked,
	}

	clone.connectOpts = make([]connect.ClientOption, len(n.connectOpts))
	copy(clone.connectOpts, n.connectOpts)

	clone.nodesLocked = make(map[common.Address]*NodeRecord, len(n.nodesLocked))
	for addr, node := range n.nodesLocked {
		clonedNode := &NodeRecord{
			address:             node.address,
			operator:            node.operator,
			url:                 node.url,
			status:              node.status,
			local:               node.local,
			streamServiceClient: node.streamServiceClient,
			nodeToNodeClient:    node.nodeToNodeClient,
			permanentIndex:      node.permanentIndex,
		}
		clone.nodesLocked[addr] = clonedNode
	}

	clone.nodesByIndexLocked = make(map[int32]*NodeRecord, len(n.nodesByIndexLocked))
	for _, node := range clone.nodesLocked {
		if node == nil {
			continue
		}
		if idx := int32(node.permanentIndex); idx > 0 {
			clone.nodesByIndexLocked[idx] = node
		}
	}

	clone.allNodesLocked = make([]*NodeRecord, len(n.allNodesLocked))
	for i, node := range n.allNodesLocked {
		clone.allNodesLocked[i] = clone.nodesLocked[node.address]
	}

	clone.activeNodesLocked = make([]*NodeRecord, len(n.activeNodesLocked))
	for i, node := range n.activeNodesLocked {
		clone.activeNodesLocked[i] = clone.nodesLocked[node.address]
	}

	clone.validAddrsLocked = make([]common.Address, len(n.validAddrsLocked))
	copy(clone.validAddrsLocked, n.validAddrsLocked)

	clone.operatorsLocked = make(map[common.Address]bool, len(n.operatorsLocked))
	for addr, val := range n.operatorsLocked {
		clone.operatorsLocked[addr] = val
	}

	return clone
}

func (n *nodeRegistryImpl) IsOperator(address common.Address) bool {
	n.mu.RLock()
	defer n.mu.RUnlock()
	return n.operatorsLocked[address]
}
