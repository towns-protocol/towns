package nodes

import (
	"bytes"
	"slices"

	"github.com/ethereum/go-ethereum/common"
)

type StreamNodes interface {
	IsLocal() bool
	LocalAndFirst() bool
	GetNodes() []common.Address
	GetRemotes() []common.Address
	NumRemotes() int
}

// Contains sorted stream node addresses,
// if local node is present,
// returns addresses of all nodes or only remote nodes.
type streamNodesImpl struct {
	nodes          []common.Address
	localNodeIndex int
}

var _ StreamNodes = (*streamNodesImpl)(nil)

func NewStreamNodes(nodes []common.Address, localNode common.Address) StreamNodes {
	slices.SortFunc(nodes, func(i, j common.Address) int {
		return bytes.Compare(i[:], j[:])
	})
	localNodeIndex := slices.IndexFunc(nodes, func(i common.Address) bool {
		return bytes.Equal(i[:], localNode[:])
	})
	return &streamNodesImpl{
		nodes:          nodes,
		localNodeIndex: localNodeIndex,
	}
}

func (s *streamNodesImpl) IsLocal() bool {
	return s.localNodeIndex >= 0
}

// LocalAndFirst is used for fake leader election currently.
func (s *streamNodesImpl) LocalAndFirst() bool {
	return s.localNodeIndex == 0
}

func (s *streamNodesImpl) GetNodes() []common.Address {
	return s.nodes
}

func (s *streamNodesImpl) GetRemotes() []common.Address {
	if s.localNodeIndex >= 0 {
		return append(s.nodes[:s.localNodeIndex], s.nodes[s.localNodeIndex+1:]...)
	} else {
		return s.nodes
	}
}

func (s *streamNodesImpl) NumRemotes() int {
	if s.localNodeIndex >= 0 {
		return len(s.nodes) - 1
	} else {
		return len(s.nodes)
	}
}
