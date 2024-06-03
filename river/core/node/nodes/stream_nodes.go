package nodes

import (
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

	Update(n common.Address, isAdded bool) error
}

type streamNodesImpl struct {
	mu sync.RWMutex

	// nodes contains all streams nodes in the same order as in contract.
	nodes     []common.Address
	localNode common.Address
	isLocal   bool

	// remotes are all nodes except the local node.
	// remotes are shuffled to avoid the same node being selected as the sticky peer.
	remotes         []common.Address
	stickyPeerIndex int
}

var _ StreamNodes = (*streamNodesImpl)(nil)

func NewStreamNodes(nodes []common.Address, localNode common.Address) StreamNodes {
	streamNodes := &streamNodesImpl{
		localNode: localNode,
	}
	streamNodes.resetNoLock(nodes)
	return streamNodes
}

func (s *streamNodesImpl) resetNoLock(nodes []common.Address) {
	var lastStickyAddr common.Address
	if s.stickyPeerIndex < len(s.remotes) {
		lastStickyAddr = s.remotes[s.stickyPeerIndex]
	}

	s.nodes = slices.Clone(nodes)

	localIndex := slices.Index(nodes, s.localNode)

	if localIndex >= 0 {
		s.isLocal = true
		s.remotes = slices.Concat(nodes[:localIndex], nodes[localIndex+1:])
	} else {
		s.isLocal = false
		s.remotes = slices.Clone(nodes)
	}

	rand.Shuffle(len(s.remotes), func(i, j int) { s.remotes[i], s.remotes[j] = s.remotes[j], s.remotes[i] })

	if lastStickyAddr == (common.Address{}) {
		s.stickyPeerIndex = 0
	} else {
		s.stickyPeerIndex = slices.Index(s.remotes, lastStickyAddr)
		if s.stickyPeerIndex < 0 {
			s.stickyPeerIndex = 0
		}
	}
}

func (s *streamNodesImpl) IsLocal() bool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.isLocal
}

// LocalIsLeader is used for fake leader election currently.
func (s *streamNodesImpl) LocalIsLeader() bool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return len(s.nodes) > 0 && s.nodes[0] == s.localNode
}

func (s *streamNodesImpl) GetNodes() []common.Address {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return slices.Clone(s.nodes)
}

func (s *streamNodesImpl) GetRemotes() []common.Address {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return slices.Clone(s.remotes)
}

func (s *streamNodesImpl) GetStickyPeer() common.Address {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if len(s.remotes) > 0 {
		return s.remotes[s.stickyPeerIndex]
	} else {
		return common.Address{}
	}
}

func (s *streamNodesImpl) AdvanceStickyPeer(currentPeer common.Address) common.Address {
	s.mu.Lock()
	defer s.mu.Unlock()

	if len(s.remotes) == 0 {
		return common.Address{}
	}

	// If the node has already been advanced, ignore the call to advance and return the current sticky
	// peer. Many concurrent requests may fail and try to advance the node at the same time, but we only
	// want to advance once.
	if s.remotes[s.stickyPeerIndex] != currentPeer {
		return s.remotes[s.stickyPeerIndex]
	}

	s.stickyPeerIndex++

	// If we've visited all nodes, shuffle
	if s.stickyPeerIndex >= len(s.remotes) {
		rand.Shuffle(len(s.remotes), func(i, j int) { s.remotes[i], s.remotes[j] = s.remotes[j], s.remotes[i] })
		s.stickyPeerIndex = 0
	}

	return s.remotes[s.stickyPeerIndex]
}

func (s *streamNodesImpl) NumRemotes() int {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return len(s.remotes)
}

func (s *streamNodesImpl) Update(n common.Address, isAdded bool) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	var newNodes []common.Address
	if isAdded {
		if slices.Contains(s.nodes, n) {
			return RiverError(
				Err_INTERNAL,
				"StreamNodes.Update(add): node already exists in stream nodes",
				"nodes",
				s.nodes,
				"node",
				n,
			)
		}
		newNodes = append(s.nodes, n)
	} else {
		index := slices.Index(s.nodes, n)
		if index < 0 {
			return RiverError(Err_INTERNAL, "StreamNodes.Update(delete): node does not exist in stream nodes", "nodes", s.nodes, "node", n)
		}
		newNodes = slices.Concat(s.nodes[:index], s.nodes[index+1:])
	}

	s.resetNoLock(newNodes)
	return nil
}
