package nodes

import (
	. "casablanca/node/base"
	"casablanca/node/dlog"
	. "casablanca/node/protocol"
	. "casablanca/node/protocol/protocolconnect"
	"context"
	"encoding/csv"
	"encoding/json"
	"net/http"
	"os"
	"strings"
	"sync"

	"github.com/bufbuild/connect-go"
)

type NodeRegistry interface {
	// Returns error for local node.
	GetStreamServiceClientForAddress(address string) (StreamServiceClient, error)
	GetNodeToNodeClientForAddress(address string) (NodeToNodeClient, error)

	CheckNodeIsValid(address string) error

	// Next two methods are required for hash-based stream placement, they will be removed once on-chain registry is implemented.
	NumNodes() int
	GetNodeAddressByIndex(index int) (string, error)
}

type nodeJson struct {
	Address string `json:"address"`
	Url     string `json:"url"`
}
type nodeRegistryJson struct {
	Nodes []nodeJson `json:"nodes"`
}

type nodeRecord struct {
	address string
	url     string
	local   bool

	streamServiceClientOnce sync.Once
	streamServiceClient     StreamServiceClient

	nodeToNodeClientOnce sync.Once
	nodeToNodeClient     NodeToNodeClient
}

// Currently node registry is immutable, so there is no need for locking yet.
type nodeRegistryImpl struct {
	nodes     map[string]*nodeRecord
	nodesFlat []*nodeRecord

	httpClient *http.Client
}

var _ NodeRegistry = (*nodeRegistryImpl)(nil)

func LoadNodeRegistry(ctx context.Context, nodeRegistryPath string, localNodeAddress string) (*nodeRegistryImpl, error) {
	log := dlog.CtxLog(ctx)

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
		nodes:      make(map[string]*nodeRecord),
		nodesFlat:  make([]*nodeRecord, 0, len(registry.Nodes)),
		httpClient: &http.Client{},
	}
	localFound := false
	for _, node := range registry.Nodes {
		local := false
		if node.Address == localNodeAddress {
			local = true
			localFound = true
		}
		nn := &nodeRecord{
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

func NewNodeRegistryFromCsv(ctx context.Context, nodeRegistryCsv string, localNodeAddress string) (*nodeRegistryImpl, error) {
	log := dlog.CtxLog(ctx)

	r := csv.NewReader(strings.NewReader(nodeRegistryCsv))
	r.Comment = '#'
	r.FieldsPerRecord = 2
	r.TrimLeadingSpace = true
	records, err := r.ReadAll()
	if err != nil {
		return nil, WrapRiverError(Err_BAD_CONFIG, err).Message("Failed to parse node registry CSV").Func("NewNodeRegistryFromCsv")
	}

	log.Info("Node Registry CSV parsed", "records", records, "localAddress", localNodeAddress)

	n := &nodeRegistryImpl{
		nodes:      make(map[string]*nodeRecord),
		nodesFlat:  make([]*nodeRecord, 0, len(records)),
		httpClient: &http.Client{},
	}
	localFound := false
	for _, node := range records {
		addr, err := AddressStrToEthAddress(node[0])
		if err != nil {
			return nil, AsRiverError(err).Func("NewNodeRegistryFromCsv")
		}
		addrStr := EthAddressToAddressStr(addr)

		local := false
		if addrStr == localNodeAddress {
			local = true
			localFound = true
		}
		nn := &nodeRecord{
			address: addrStr,
			url:     node[1],
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
	nn := &nodeRecord{
		address: localNodeAddress,
		local:   true,
	}
	return &nodeRegistryImpl{
		nodes:      map[string]*nodeRecord{localNodeAddress: nn},
		nodesFlat:  []*nodeRecord{nn},
		httpClient: &http.Client{},
	}
}

// Returns error for local node.
func (n *nodeRegistryImpl) GetStreamServiceClientForAddress(address string) (StreamServiceClient, error) {
	node := n.nodes[address]
	if node == nil {
		return nil, RiverError(Err_UNKNOWN_NODE, "No record for node", "address", address)
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
		return nil, RiverError(Err_UNKNOWN_NODE, "No record for node", "address", address)
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
		return RiverError(Err_UNKNOWN_NODE, "No record for node", "address", address)
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
