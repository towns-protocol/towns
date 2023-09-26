package nodes

import (
	. "casablanca/node/base"
	"casablanca/node/dlog"
	. "casablanca/node/protocol"
	. "casablanca/node/protocol/protocolconnect"
	"context"
	"encoding/json"
	"net/http"
	"os"
	"sync"
)

type LocalNode struct {
	NodeAddress string
	Stub        StreamServiceHandler
	Syncer      LocalStreamSyncer
}

type NodeRegistry interface {
	GetStubForAddress(address string) (StreamService, error)
	GetRemoteSyncStubForAddress(address string) (StreamServiceClientOnly, error)

	// Next two methods are required for hash-based stream placement, they will be removed once on-chain registry is implemented.
	NumNodes() int
	GetNodeAddressByIndex(index int) (string, error)

	GetLocalNode() *LocalNode
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

	initStub   sync.Once
	remoteStub StreamServiceClient
}

// Currently node registry is immutable, so there is no need for locking yet.
type nodeRegistryImpl struct {
	nodes     map[string]*nodeRecord
	nodesFlat []*nodeRecord

	localNode  *LocalNode
	httpClient *http.Client
}

var _ NodeRegistry = (*nodeRegistryImpl)(nil)

func LoadNodeRegistry(ctx context.Context, nodeRegistryPath string, localNode *LocalNode) (*nodeRegistryImpl, error) {
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

	log.Info("Node Registry Loaded", "Nodes", registry.Nodes, "localAddress", localNode.NodeAddress)

	n := &nodeRegistryImpl{
		nodes:      make(map[string]*nodeRecord),
		nodesFlat:  make([]*nodeRecord, 0, len(registry.Nodes)),
		localNode:  localNode,
		httpClient: &http.Client{},
	}
	localFound := false
	for _, node := range registry.Nodes {
		local := false
		if node.Address == localNode.NodeAddress {
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
		return nil, RiverErrorf(Err_UNKNOWN_NODE, "Local node not found in registry, localAddress=%s", localNode.NodeAddress)
	}
	return n, nil
}

func MakeSingleNodeRegistry(ctx context.Context, localNode *LocalNode) *nodeRegistryImpl {
	nn := &nodeRecord{
		address: localNode.NodeAddress,
		local:   true,
	}
	return &nodeRegistryImpl{
		nodes:      map[string]*nodeRecord{localNode.NodeAddress: nn},
		nodesFlat:  []*nodeRecord{nn},
		localNode:  localNode,
		httpClient: &http.Client{},
	}
}

// Returns nil, nil if address is for the local node.
func (n *nodeRegistryImpl) getRemoteStubForAddress(address string) (StreamServiceClient, error) {
	node := n.nodes[address]
	if node == nil {
		return nil, RiverErrorf(Err_UNKNOWN_NODE, "No record for node, address=%s", address)
	}

	if node.local {
		return nil, nil
	}

	node.initStub.Do(func() {
		node.remoteStub = NewStreamServiceClient(n.httpClient, node.url)
	})
	return node.remoteStub, nil
}

func (n *nodeRegistryImpl) GetStubForAddress(address string) (StreamService, error) {
	stub, err := n.getRemoteStubForAddress(address)
	if err != nil {
		return nil, err
	}
	if stub != nil {
		return stub, nil
	} else {
		return n.localNode.Stub, nil
	}
}

func (n *nodeRegistryImpl) GetRemoteSyncStubForAddress(address string) (StreamServiceClientOnly, error) {
	stub, err := n.getRemoteStubForAddress(address)
	if err != nil {
		return nil, err
	}
	if stub != nil {
		return stub, nil
	} else {
		return nil, RiverErrorf(Err_INTERNAL_ERROR, "Remote stub requested for local node, address=%s", address)
	}
}

func (n *nodeRegistryImpl) NumNodes() int {
	return len(n.nodesFlat)
}

func (n *nodeRegistryImpl) GetNodeAddressByIndex(index int) (string, error) {
	if index < 0 || index >= len(n.nodesFlat) {
		return "", RiverErrorf(Err_INTERNAL_ERROR, "Invalid node index, index=%d", index)
	}
	return n.nodesFlat[index].address, nil
}

func (n *nodeRegistryImpl) GetLocalNode() *LocalNode {
	return n.localNode
}
