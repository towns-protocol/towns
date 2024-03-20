package nodes

import (
	"context"
	"net/http"
	"sync"

	"github.com/ethereum/go-ethereum/common"
	. "github.com/river-build/river/core/node/base"
	"github.com/river-build/river/core/node/contracts"
	"github.com/river-build/river/core/node/crypto"
	"github.com/river-build/river/core/node/dlog"
	"github.com/river-build/river/core/node/http_client"
	. "github.com/river-build/river/core/node/protocol"
	. "github.com/river-build/river/core/node/protocol/protocolconnect"
	"github.com/river-build/river/core/node/registries"
	"github.com/river-build/river/core/node/utils"

	"connectrpc.com/connect"
)

var TestHttpClientMaker func() *http.Client

type NodeRegistry interface {
	// Returns error for local node.
	GetStreamServiceClientForAddress(address common.Address) (StreamServiceClient, error)
	GetNodeToNodeClientForAddress(address common.Address) (NodeToNodeClient, error)

	// Next two methods are required for hash-based stream placement, they will be removed once on-chain registry is implemented.
	NumNodes() int
	GetValidNodeAddresses() []common.Address
	GetNodeAddressByIndex(index int) (common.Address, error)

	// GetNodeInfoByIndex returns the address, url and isLocal of the node at the given index.
	GetNodeByIndex(index int) (*NodeRecord, error)
}

type NodeRecord struct {
	Address             common.Address
	Url                 string
	Status              uint8
	Local               bool
	StreamServiceClient StreamServiceClient
	NodeToNodeClient    NodeToNodeClient
}

// Currently node registry is immutable, so there is no need for locking yet.
type nodeRegistryImpl struct {
	contract         *registries.RiverRegistryContract
	localNodeAddress common.Address
	httpClient       *http.Client

	mu              sync.Mutex
	nodes           *utils.OrderedMap[common.Address, *NodeRecord]
	appliedBlockNum crypto.BlockNumber
}

var _ NodeRegistry = (*nodeRegistryImpl)(nil)

func LoadNodeRegistry(ctx context.Context, contract *registries.RiverRegistryContract, localNodeAddress common.Address) (*nodeRegistryImpl, error) {
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

	appliedBlockNum, err := contract.Blockchain.GetBlockNumber(ctx)
	if err != nil {
		return nil, err
	}

	nodes, err := contract.GetAllNodes(ctx, appliedBlockNum)
	if err != nil {
		return nil, err
	}

	nodesMap := utils.NewOrderedMap[common.Address, *NodeRecord](len(nodes))

	localFound := false
	for _, node := range nodes {
		local := node.NodeAddress == localNodeAddress
		localFound = localFound || local
		nn := &NodeRecord{
			Address: node.NodeAddress,
			Url:     node.Url,
			Status:  node.Status,
			Local:   local,
		}
		nodesMap.Set(node.NodeAddress, nn)
	}

	if !localFound {
		return nil, RiverError(Err_UNKNOWN_NODE, "Local node not found in registry", "blockNum", appliedBlockNum, "localAddress", localNodeAddress).LogError(log)
	}

	log.Info("Node Registry Loaded from contract", "blockNum", appliedBlockNum, "Nodes", nodesMap.Values, "localAddress", localNodeAddress)

	ret := &nodeRegistryImpl{
		contract:         contract,
		localNodeAddress: localNodeAddress,
		httpClient:       client,
		nodes:            nodesMap,
		appliedBlockNum:  appliedBlockNum,
	}

	c := crypto.MakeBlockNumberChannel()

	err = contract.Blockchain.BlockMonitor.AddListener(c, appliedBlockNum)
	if err != nil {
		return nil, err
	}

	go ret.readBlockUpdates(ctx, c)

	return ret, nil
}

func (n *nodeRegistryImpl) readBlockUpdates(ctx context.Context, c crypto.BlockNumberChannel) {
	for {
		select {
		case <-ctx.Done():
			return
		case blockNum := <-c:
			n.updateNodes(ctx, blockNum)
		}
	}
}

func (n *nodeRegistryImpl) updateNodes(ctx context.Context, blockNum crypto.BlockNumber) {
	log := dlog.FromCtx(ctx)

	events, err := n.contract.GetNodeEventsForBlock(ctx, blockNum)
	if err != nil {
		log.Error("NodeRegistry: Error getting node events", "err", err)
		return
	}

	if len(events) == 0 {
		return
	}

	n.mu.Lock()
	defer n.mu.Unlock()

	if blockNum <= n.appliedBlockNum {
		log.Error("NodeRegistry: Got events for block that is not newer than last applied block", "blockNum", blockNum, "appliedBlockNum", n.appliedBlockNum)
		return
	}
	n.appliedBlockNum = blockNum

	for _, event := range events {
		switch e := event.(type) {
		case *contracts.NodeRegistryV1NodeAdded:
			if !n.nodes.Has(e.NodeAddress) {
				nn := &NodeRecord{
					Address: e.NodeAddress,
					Url:     e.Url,
					Status:  e.Status,
					Local:   e.NodeAddress == n.localNodeAddress,
				}
				n.nodes.Set(e.NodeAddress, nn)
				log.Info("NodeRegistry: NodeAdded", "blockNum", blockNum, "node", nn)
			} else {
				log.Error("NodeRegistry: Got NodeAdded for node that already exists in NodeRegistry", "blockNum", blockNum, "node", e.NodeAddress, "nodes", n.nodes.Values)
			}
		case *contracts.NodeRegistryV1NodeRemoved:
			if n.nodes.Has(e.NodeAddress) {
				n.nodes.Delete(e.NodeAddress)
				log.Info("NodeRegistry: NodeRemoved", "blockNum", blockNum, "node", e.NodeAddress)
			} else {
				log.Error("NodeRegistry: Got NodeRemoved for node that does not exist in NodeRegistry", "blockNum", blockNum, "node", e.NodeAddress, "nodes", n.nodes.Values)
			}
		case *contracts.NodeRegistryV1NodeStatusUpdated:
			nn, _ := n.nodes.Get(e.NodeAddress)
			if nn != nil {
				nn.Status = e.Status
				log.Info("NodeRegistry: NodeStatusUpdated", "blockNum", blockNum, "node", nn)
			} else {
				log.Error("NodeRegistry: Got NodeStatusUpdated for node that does not exist in NodeRegistry", "blockNum", blockNum, "node", e.NodeAddress, "nodes", n.nodes.Values)
			}
		case *contracts.NodeRegistryV1NodeUrlUpdated:
			nn, _ := n.nodes.Get(e.NodeAddress)
			if nn != nil {
				nn.Url = e.Url
				nn.StreamServiceClient = nil
				nn.NodeToNodeClient = nil
				log.Info("NodeRegistry: NodeUrlUpdated", "blockNum", blockNum, "node", nn)
			} else {
				log.Error("NodeRegistry: Got NodeUrlUpdated for node that does not exist in NodeRegistry", "blockNum", blockNum, "node", e.NodeAddress, "nodes", n.nodes.Values)
			}
		default:
			log.Error("Unknown event type", "event", e)
		}
	}
}

// Returns error for local node.
func (n *nodeRegistryImpl) GetStreamServiceClientForAddress(address common.Address) (StreamServiceClient, error) {
	n.mu.Lock()
	defer n.mu.Unlock()

	node, _ := n.nodes.Get(address)
	if node == nil {
		return nil, RiverError(Err_UNKNOWN_NODE, "No record for node", "address", address, "nodes", n.nodes).Func("GetStreamServiceClientForAddress")
	}

	if node.Local {
		return nil, RiverError(Err_INTERNAL, "can't get remote stub for local node")
	}

	if node.StreamServiceClient == nil {
		node.StreamServiceClient = NewStreamServiceClient(n.httpClient, node.Url, connect.WithGRPC())
	}

	return node.StreamServiceClient, nil
}

// Returns error for local node.
func (n *nodeRegistryImpl) GetNodeToNodeClientForAddress(address common.Address) (NodeToNodeClient, error) {
	n.mu.Lock()
	defer n.mu.Unlock()

	node, _ := n.nodes.Get(address)
	if node == nil {
		return nil, RiverError(Err_UNKNOWN_NODE, "No record for node", "address", address, "nodes", n.nodes).Func(
			"GetNodeToNodeClientForAddress",
		)
	}

	if node.Local {
		return nil, RiverError(Err_INTERNAL, "can't get remote stub for local node")
	}

	if node.NodeToNodeClient == nil {
		node.NodeToNodeClient = NewNodeToNodeClient(n.httpClient, node.Url, connect.WithGRPC())
	}

	return node.NodeToNodeClient, nil
}

func (n *nodeRegistryImpl) NumNodes() int {
	n.mu.Lock()
	defer n.mu.Unlock()
	return n.nodes.Len()
}

func (n *nodeRegistryImpl) GetValidNodeAddresses() []common.Address {
	n.mu.Lock()
	defer n.mu.Unlock()

	ret := make([]common.Address, 0, n.nodes.Len())
	for _, nn := range n.nodes.Values {
		ret = append(ret, nn.Address)
	}
	return ret
}

func (n *nodeRegistryImpl) GetNodeAddressByIndex(index int) (common.Address, error) {
	n.mu.Lock()
	defer n.mu.Unlock()

	if index < 0 || index >= n.nodes.Len() {
		return common.Address{}, RiverError(Err_INTERNAL, "Invalid node index", "index", index)
	}
	return n.nodes.Values[index].Address, nil
}

func (n *nodeRegistryImpl) GetNodeByIndex(index int) (*NodeRecord, error) {
	n.mu.Lock()
	defer n.mu.Unlock()

	if index < 0 || index >= n.nodes.Len() {
		return nil, RiverError(Err_INTERNAL, "Invalid node index", "index", index).Func("GetNodeByIndex")
	}
	// Create copy of the record
	nn := *n.nodes.Values[index]
	return &nn, nil
}

func (n *nodeRegistryImpl) GetNodeByAddress(addr common.Address) (*NodeRecord, error) {
	n.mu.Lock()
	defer n.mu.Unlock()

	node, _ := n.nodes.Get(addr)
	if node == nil {
		return nil, RiverError(Err_UNKNOWN_NODE, "No record for node", "address", addr).Func("GetNodeByAddress")
	}
	// Create copy of the record
	nn := *node
	return &nn, nil
}
