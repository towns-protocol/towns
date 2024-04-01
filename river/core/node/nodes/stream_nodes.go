package nodes

import (
	"bytes"
	"math/rand"
	"slices"
	"sync"

	"github.com/ethereum/go-ethereum/common"

	. "github.com/river-build/river/core/node/base"
	. "github.com/river-build/river/core/node/protocol"
)

type StreamNodes interface {
	IsLocal() bool
	LocalIsLeader() bool
	GetNodes() []common.Address
	GetRemotes() []common.Address
	NumRemotes() int

	GetStickyPeer() common.Address
	AdvanceStickyPeer(currentPeer common.Address) common.Address
}

// Contains stream node addresses.
// if local node is present,
// returns addresses of all nodes or only remote nodes.
type streamNodesImpl struct {
	// used to synchronize reads/writes to below fields
	mu              sync.RWMutex
	nodes           []common.Address
	localNode       common.Address
	localNodeIndex  int
	localIsLeader   bool
	stickyPeerIndex int
}

var _ StreamNodes = (*streamNodesImpl)(nil)

func localIsLeader(nodes []common.Address, localNode common.Address) bool {
	// Sort the nodes to determine if the local node is the leader. We consider the leader to be the lexically
	// first node in the list.
	slices.SortFunc(nodes, func(i, j common.Address) int {
		return bytes.Compare(i[:], j[:])
	})
	localNodeIndex := slices.IndexFunc(nodes, func(i common.Address) bool {
		return bytes.Equal(i[:], localNode[:])
	})
	return localNodeIndex == 0
}

func NewStreamNodes(nodes []common.Address, localNode common.Address) StreamNodes {
	streamNodes := &streamNodesImpl{
		nodes:         nodes,
		localNode:     localNode,
		localIsLeader: localIsLeader(nodes, localNode),
	}
	streamNodes.shuffle()
	return streamNodes
}

// shuffle randomly shuffles the ordering of nodes and resets the sticky peer to the first remote in the new list.
// shuffle performs writes but has no locking. It is expected to be called on initialization or from a write-protected method.
func (s *streamNodesImpl) shuffle() {
	rand.Shuffle(len(s.nodes), func(i, j int) { s.nodes[i], s.nodes[j] = s.nodes[j], s.nodes[i] })

	s.localNodeIndex = slices.IndexFunc(s.nodes, func(i common.Address) bool {
		return bytes.Equal(i[:], s.localNode[:])
	})

	s.stickyPeerIndex = 0
	if s.stickyPeerIndex == s.localNodeIndex {
		s.stickyPeerIndex++
	}
}

func (s *streamNodesImpl) IsLocal() bool {
	s.mu.RLock()
	defer s.mu.RUnlock()

	return s.localNodeIndex >= 0
}

func (s *streamNodesImpl) GetLocal() (common.Address, error) {
	if !s.IsLocal() {
		return common.Address{}, RiverError(Err_INTERNAL, "Expected nodes to be local")
	} else {
		return s.nodes[s.localNodeIndex], nil
	}
}

// LocalAndFirst is used for fake leader election currently.
func (s *streamNodesImpl) LocalIsLeader() bool {
	s.mu.RLock()
	defer s.mu.RUnlock()

	return s.localIsLeader
}

func (s *streamNodesImpl) GetNodes() []common.Address {
	s.mu.RLock()
	defer s.mu.RUnlock()

	return slices.Clone(s.nodes)
}

func (s *streamNodesImpl) GetRemotes() []common.Address {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if s.localNodeIndex >= 0 {
		nodesCopy := slices.Clone(s.nodes)
		return slices.Delete(nodesCopy, s.localNodeIndex, s.localNodeIndex+1)
	} else {
		return slices.Clone(s.nodes)
	}
}

func (s *streamNodesImpl) GetStickyPeer() common.Address {
	s.mu.RLock()
	defer s.mu.RUnlock()

	return s.nodes[s.stickyPeerIndex]
}

func (s *streamNodesImpl) AdvanceStickyPeer(currentPeer common.Address) common.Address {
	s.mu.Lock()
	defer s.mu.Unlock()

	// If the node has already been advanced, ignore the call to advance and return the current sticky
	// peer. Many concurrent requests may fail and try to advance the node at the same time, but we only
	// want to advance once.
	if s.nodes[s.stickyPeerIndex] != currentPeer {
		return s.nodes[s.stickyPeerIndex]
	}

	// Advance sticky peer
	s.stickyPeerIndex++
	if s.stickyPeerIndex == s.localNodeIndex {
		s.stickyPeerIndex++
	}

	// If we've visited all nodes, shuffle
	if s.stickyPeerIndex >= len(s.nodes) {
		s.shuffle()
	}

	return s.nodes[s.stickyPeerIndex]
}

func (s *streamNodesImpl) NumRemotes() int {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if s.localNodeIndex >= 0 {
		return len(s.nodes) - 1
	} else {
		return len(s.nodes)
	}
}
