package nodes

import (
	"context"
	"encoding/json"
	"net/http"
	"os"
	"strings"
	"sync"

	. "github.com/river-build/river/base"
	"github.com/river-build/river/dlog"
	. "github.com/river-build/river/protocol"
	. "github.com/river-build/river/protocol/protocolconnect"

	"connectrpc.com/connect"
)

type NodeRegistry interface {
	// Returns error for local node.
	GetStreamServiceClientForAddress(address string) (StreamServiceClient, error)
	GetNodeToNodeClientForAddress(address string) (NodeToNodeClient, error)

	CheckNodeIsValid(address string) error

	// Next two methods are required for hash-based stream placement, they will be removed once on-chain registry is implemented.
	NumNodes() int
	GetNodeAddressByIndex(index int) (string, error)
	GetNodeRecordByIndex(index int) (*NodeRecord, error)
}

type nodeJson struct {
	Address string `json:"address"`
	Url     string `json:"url"`
}
type nodeRegistryJson struct {
	Nodes []nodeJson `json:"nodes"`
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

func (n *NodeRecord) Url() string {
	if n.local {
		return "http://localhost:5157"
	} else {
		return n.url
	}
}

// Currently node registry is immutable, so there is no need for locking yet.
type nodeRegistryImpl struct {
	nodes     map[string]*NodeRecord
	nodesFlat []*NodeRecord

	httpClient *http.Client
}

var _ NodeRegistry = (*nodeRegistryImpl)(nil)

func LoadNodeRegistry(ctx context.Context, nodeRegistryPath string, localNodeAddress string) (*nodeRegistryImpl, error) {
	log := dlog.FromCtx(ctx)

	jsonStr, err := os.ReadFile(nodeRegistryPath)
	if err != nil {
		return nil, err
	}

	// Unmarshal the JSON data into the nodeRegistryImpl struct
	var registry nodeRegistryJson
	if err := json.Unmarshal(jsonStr, &registry); err != nil {
		return nil, err
	}

	log.Info("Node Registry Loaded", "Nodes", registry.Nodes, "localAddress", localNodeAddress)

	n := &nodeRegistryImpl{
		nodes:      make(map[string]*NodeRecord),
		nodesFlat:  make([]*NodeRecord, 0, len(registry.Nodes)),
		httpClient: &http.Client{},
	}
	localFound := false
	for _, node := range registry.Nodes {
		local := false
		if node.Address == localNodeAddress {
			local = true
			localFound = true
		}
		nn := &NodeRecord{
			address: node.Address,
			url:     node.Url,
			local:   local,
		}
		n.nodes[node.Address] = nn
		n.nodesFlat = append(n.nodesFlat, nn)
	}
	if !localFound {
		return nil, RiverError(Err_UNKNOWN_NODE, "Local node not found in registry", "localAddress", localNodeAddress)
	}
	return n, nil
}

func NewNodeRegistryFromString(ctx context.Context, nodeRegistryString string, localNodeAddress string) (*nodeRegistryImpl, error) {
	log := dlog.FromCtx(ctx)

	log.Info("Loading node registry from string", "nodeRegistryString", nodeRegistryString, "localAddress", localNodeAddress)

	vals := strings.Split(nodeRegistryString, ",")

	n := &nodeRegistryImpl{
		nodes:      make(map[string]*NodeRecord),
		nodesFlat:  make([]*NodeRecord, 0, len(vals)/2),
		httpClient: &http.Client{},
	}
	localFound := false
	for i := 0; i < len(vals); i += 2 {
		if i+1 >= len(vals) {
			return nil, RiverError(
				Err_BAD_CONFIG,
				"Invalid node registry string, odd number of values",
				"nodeRegistryString",
				nodeRegistryString,
			)
		}
		url := vals[i+1]
		addr, err := AddressStrToEthAddress(vals[i])
		if err != nil {
			return nil, AsRiverError(err).Func("NewNodeRegistryFromCsv")
		}
		addrStr := EthAddressToAddressStr(addr)

		local := false
		if addrStr == localNodeAddress {
			local = true
			localFound = true
		}
		nn := &NodeRecord{
			address: addrStr,
			url:     url,
			local:   local,
		}
		n.nodes[addrStr] = nn
		n.nodesFlat = append(n.nodesFlat, nn)
	}
	if !localFound {
		return nil, RiverError(Err_UNKNOWN_NODE, "Local node not found in registry", "localAddress", localNodeAddress)
	}
	return n, nil
}

func MakeSingleNodeRegistry(ctx context.Context, localNodeAddress string) *nodeRegistryImpl {
	nn := &NodeRecord{
		address: localNodeAddress,
		local:   true,
	}
	return &nodeRegistryImpl{
		nodes:      map[string]*NodeRecord{localNodeAddress: nn},
		nodesFlat:  []*NodeRecord{nn},
		httpClient: &http.Client{},
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
