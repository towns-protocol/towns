package nodes

import (
	"bytes"
	"slices"

	"github.com/ethereum/go-ethereum/common"
)

// Contains sorted stream node addresses,
// if local node is present,
// returns addresses of all nodes or only remote nodes.
type StreamNodes struct {
	nodes          []common.Address
	localNodeIndex int
}

func NewStreamNodes(nodes []common.Address, localNode common.Address) *StreamNodes {
	slices.SortFunc(nodes, func(i, j common.Address) int {
		return bytes.Compare(i[:], j[:])
	})
	localNodeIndex := slices.IndexFunc(nodes, func(i common.Address) bool {
		return bytes.Equal(i[:], localNode[:])
	})
	return &StreamNodes{
		nodes:          nodes,
		localNodeIndex: localNodeIndex,
	}
}

func (s *StreamNodes) IsLocal() bool {
	return s.localNodeIndex >= 0
}

// LocalAndFirst is used for fake leader election currently.
func (s *StreamNodes) LocalAndFirst() bool {
	return s.localNodeIndex == 0
}

func (s *StreamNodes) GetNodes() []common.Address {
	return s.nodes
}

func (s *StreamNodes) GetRemotes() []common.Address {
	if s.localNodeIndex >= 0 {
		return append(s.nodes[:s.localNodeIndex], s.nodes[s.localNodeIndex+1:]...)
	} else {
		return s.nodes
	}
}

func (s *StreamNodes) NumRemotes() int {
	if s.localNodeIndex >= 0 {
		return len(s.nodes) - 1
	} else {
		return len(s.nodes)
	}
}
