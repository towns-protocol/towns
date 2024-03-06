package nodes

import (
	"bytes"
	"context"
	"net/http"
	"sync"

	"github.com/ethereum/go-ethereum/common"
	. "github.com/river-build/river/core/node/base"
	"github.com/river-build/river/core/node/dlog"
	"github.com/river-build/river/core/node/http_client"
	. "github.com/river-build/river/core/node/protocol"
	. "github.com/river-build/river/core/node/protocol/protocolconnect"
	"github.com/river-build/river/core/node/registries"

	"connectrpc.com/connect"
)

type NodeRegistry interface {
	// Returns error for local node.
	GetStreamServiceClientForAddress(address common.Address) (StreamServiceClient, error)
	GetNodeToNodeClientForAddress(address common.Address) (NodeToNodeClient, error)

	CheckNodeIsValid(address common.Address) error

	// Next two methods are required for hash-based stream placement, they will be removed once on-chain registry is implemented.
	NumNodes() int
	GetValidNodeAddresses() []common.Address
	GetNodeAddressByIndex(index int) (common.Address, error)
	GetNodeRecordByIndex(index int) (*NodeRecord, error)
}

type NodeRecord struct {
	address common.Address
	url     string
	local   bool

	streamServiceClientOnce sync.Once
	streamServiceClient     StreamServiceClient

	nodeToNodeClientOnce sync.Once
	nodeToNodeClient     NodeToNodeClient
}

func (nr *NodeRecord) GetUrl() string {
	return nr.url
}

func (nr *NodeRecord) IsLocal() bool {
	return nr.local
}

// Currently node registry is immutable, so there is no need for locking yet.
type nodeRegistryImpl struct {
	nodes     map[common.Address]*NodeRecord
	nodesFlat []*NodeRecord

	httpClient *http.Client
}

var _ NodeRegistry = (*nodeRegistryImpl)(nil)

func LoadNodeRegistry(ctx context.Context, contract *registries.RiverRegistryContract, localNodeAddress common.Address) (*nodeRegistryImpl, error) {
	log := dlog.FromCtx(ctx)

	nodes, err := contract.GetAllNodes(ctx)
	if err != nil {
		return nil, AsRiverError(err).Func("LoadNodeRegistry")
	}

	log.Info("Node Registry Loaded from contract", "Nodes", nodes, "localAddress", localNodeAddress)

	client, err := http_client.GetHttpClient(ctx)
	if err != nil {
		log.Error("Error getting http client", "err", err)
		return nil, AsRiverError(err, Err_BAD_CONFIG).
			Message("Unable to get http client").
			Func("LoadNodeRegistry")
	}

	n := &nodeRegistryImpl{
		nodes:      make(map[common.Address]*NodeRecord),
		nodesFlat:  make([]*NodeRecord, 0, len(nodes)),
		httpClient: client,
	}
	localFound := false
	for _, node := range nodes {
		local := false
		if bytes.Equal(node.NodeAddress[:], localNodeAddress[:]) {
			local = true
			localFound = true
		}
		nn := &NodeRecord{
			address: node.NodeAddress,
			url:     node.Url,
			local:   local,
		}
		n.nodes[node.NodeAddress] = nn
		n.nodesFlat = append(n.nodesFlat, nn)
	}
	if !localFound {
		return nil, RiverError(Err_UNKNOWN_NODE, "Local node not found in registry", "localAddress", localNodeAddress)
	}
	return n, nil
}

// Returns error for local node.
func (n *nodeRegistryImpl) GetStreamServiceClientForAddress(address common.Address) (StreamServiceClient, error) {
	node := n.nodes[address]
	if node == nil {
		return nil, RiverError(Err_UNKNOWN_NODE, "No record for node", "address", address, "nodes", n.nodes).Func("GetStreamServiceClientForAddress")
	}

	if node.local {
		return nil, RiverError(Err_INTERNAL, "can't get remote stub for local node")
	}

	node.streamServiceClientOnce.Do(func() {
		node.streamServiceClient = NewStreamServiceClient(n.httpClient, node.url, connect.WithGRPC())
	})
	return node.streamServiceClient, nil
}

// Returns error for local node.
func (n *nodeRegistryImpl) GetNodeToNodeClientForAddress(address common.Address) (NodeToNodeClient, error) {
	node := n.nodes[address]
	if node == nil {
		return nil, RiverError(Err_UNKNOWN_NODE, "No record for node", "address", address, "nodes", n.nodes).Func(
			"GetNodeToNodeClientForAddress",
		)
	}

	if node.local {
		return nil, RiverError(Err_INTERNAL, "can't get remote stub for local node")
	}

	node.nodeToNodeClientOnce.Do(func() {
		node.nodeToNodeClient = NewNodeToNodeClient(n.httpClient, node.url, connect.WithGRPC())
	})
	return node.nodeToNodeClient, nil
}

func (n *nodeRegistryImpl) CheckNodeIsValid(address common.Address) error {
	node, ok := n.nodes[address]
	if !ok || node == nil {
		return RiverError(Err_UNKNOWN_NODE, "No record for node", "address", address, "nodes", n.nodes).Func("CheckNodeIsValid")
	}
	return nil
}

func (n *nodeRegistryImpl) NumNodes() int {
	return len(n.nodesFlat)
}

func (n *nodeRegistryImpl) GetValidNodeAddresses() []common.Address {
	ret := make([]common.Address, 0, len(n.nodesFlat))
	for key := range n.nodes {
		ret = append(ret, key)
	}
	return ret
}

func (n *nodeRegistryImpl) GetNodeAddressByIndex(index int) (common.Address, error) {
	if index < 0 || index >= len(n.nodesFlat) {
		return common.Address{}, RiverError(Err_INTERNAL, "Invalid node index", "index", index)
	}
	return n.nodesFlat[index].address, nil
}

func (n *nodeRegistryImpl) GetNodeRecordByIndex(index int) (*NodeRecord, error) {
	if index < 0 || index >= len(n.nodesFlat) {
		return nil, RiverError(Err_INTERNAL, "Invalid node index", "index", index)
	}
	return n.nodesFlat[index], nil
}
