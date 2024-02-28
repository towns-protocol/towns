package nodes

import (
	"context"
	"net/http"
	"sync"

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
	GetStreamServiceClientForAddress(address string) (StreamServiceClient, error)
	GetNodeToNodeClientForAddress(address string) (NodeToNodeClient, error)

	CheckNodeIsValid(address string) error

	// Next two methods are required for hash-based stream placement, they will be removed once on-chain registry is implemented.
	NumNodes() int
	GetValidNodeAddresses() []string
	GetNodeAddressByIndex(index int) (string, error)
	GetNodeRecordByIndex(index int) (*NodeRecord, error)
}

type NodeRecord struct {
	address string
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
	nodes     map[string]*NodeRecord
	nodesFlat []*NodeRecord

	httpClient *http.Client
}

var _ NodeRegistry = (*nodeRegistryImpl)(nil)

func LoadNodeRegistry(ctx context.Context, contract *registries.RiverRegistryContract, localNodeAddress string) (*nodeRegistryImpl, error) {
	log := dlog.FromCtx(ctx)

	nodes, err := contract.GetAllNodes(ctx)
	if err != nil {
		return nil, AsRiverError(err).Func("LoadNodeRegistry")
	}

	log.Info("Node Registry Loaded from contract", "Nodes", nodes, "localAddress", localNodeAddress)

	client, err := http_client.GetHttpClient(ctx)
	if err != nil {
		log.Error("Error getting http client", "err", err)
		return nil, err
	}

	n := &nodeRegistryImpl{
		nodes:      make(map[string]*NodeRecord),
		nodesFlat:  make([]*NodeRecord, 0, len(nodes)),
		httpClient: client,
	}
	localFound := false
	for _, node := range nodes {
		local := false
		addr := EthAddressToAddressStr(node.NodeAddress)
		if addr == localNodeAddress {
			local = true
			localFound = true
		}
		nn := &NodeRecord{
			address: addr,
			url:     node.Url,
			local:   local,
		}
		n.nodes[addr] = nn
		n.nodesFlat = append(n.nodesFlat, nn)
	}
	if !localFound {
		return nil, RiverError(Err_UNKNOWN_NODE, "Local node not found in registry", "localAddress", localNodeAddress)
	}
	return n, nil
}

func MakeSingleNodeRegistry(ctx context.Context, localNodeAddress string) *nodeRegistryImpl {
	log := dlog.FromCtx(ctx)
	nn := &NodeRecord{
		address: localNodeAddress,
		local:   true,
	}

	client, err := http_client.GetHttpClient(ctx)
	if err != nil {
		log.Error("Error getting http client", "err", err)
		return nil
	}

	return &nodeRegistryImpl{
		nodes:      map[string]*NodeRecord{localNodeAddress: nn},
		nodesFlat:  []*NodeRecord{nn},
		httpClient: client,
	}
}

// Returns error for local node.
func (n *nodeRegistryImpl) GetStreamServiceClientForAddress(address string) (StreamServiceClient, error) {
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
func (n *nodeRegistryImpl) GetNodeToNodeClientForAddress(address string) (NodeToNodeClient, error) {
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

func (n *nodeRegistryImpl) CheckNodeIsValid(address string) error {
	node, ok := n.nodes[address]
	if !ok || node == nil {
		return RiverError(Err_UNKNOWN_NODE, "No record for node", "address", address, "nodes", n.nodes).Func("CheckNodeIsValid")
	}
	return nil
}

func (n *nodeRegistryImpl) NumNodes() int {
	return len(n.nodesFlat)
}

func (n *nodeRegistryImpl) GetValidNodeAddresses() []string {
	ret := make([]string, 0, len(n.nodesFlat))
	for key := range n.nodes {
		ret = append(ret, key)
	}
	return ret
}

func (n *nodeRegistryImpl) GetNodeAddressByIndex(index int) (string, error) {
	if index < 0 || index >= len(n.nodesFlat) {
		return "", RiverError(Err_INTERNAL, "Invalid node index", "index", index)
	}
	return n.nodesFlat[index].address, nil
}

func (n *nodeRegistryImpl) GetNodeRecordByIndex(index int) (*NodeRecord, error) {
	if index < 0 || index >= len(n.nodesFlat) {
		return nil, RiverError(Err_INTERNAL, "Invalid node index", "index", index)
	}
	return n.nodesFlat[index], nil
}
