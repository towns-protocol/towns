package nodes

import (
	"casablanca/node/dlog"
	"context"
	"encoding/json"
	"os"
)

const (
	NODE_REGISTRY_PATH = "../node_registry.json"
)

type NodeRegistry interface {
	GetNodes() *[]Node
}

type Node struct {
	Name    string `json:"name"`
	RPCPort int    `json:"rpc_port"`
	Address string `json:"address"`
}

type nodeRegistryImpl struct {
	Nodes []Node `json:"nodes"`
}

func NewNodeRegistry(ctx context.Context) *nodeRegistryImpl {
	log := dlog.CtxLog(ctx)
	// Read the JSON file
	data, err := os.ReadFile(NODE_REGISTRY_PATH)
	if err != nil {
		log.Error("Failed reading file", "err:", err)
		return &nodeRegistryImpl{Nodes: []Node{}}
	}

	// Unmarshal the JSON data into the nodeRegistryImpl struct
	var registry nodeRegistryImpl
	if err := json.Unmarshal(data, &registry); err != nil {
		log.Error("Failed unmarshalling JSON", "err:", err)
		return &nodeRegistryImpl{Nodes: []Node{}}
	}

	log.Info("Found Registered Nodes", "Nodes", registry.Nodes)

	return &registry
}

func (nr *nodeRegistryImpl) GetNodes() *[]Node {
	return &nr.Nodes
}
