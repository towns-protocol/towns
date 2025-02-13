package nodes

import (
	"math/rand"
	"slices"

	"github.com/ethereum/go-ethereum/common"
	"github.com/linkdata/deadlock"
	"github.com/towns-protocol/towns/core/contracts/river"
	. "github.com/towns-protocol/towns/core/node/base"
	. "github.com/towns-protocol/towns/core/node/protocol"
)

type StreamNodes interface {
	// GetNodes returns all nodes in the same order as in contract.
	GetNodes() []common.Address

	// GetRemotesAndIsLocal returns all remote nodes and true if the local node is in the list of nodes.
	GetRemotesAndIsLocal() ([]common.Address, bool)

	// GetStickyPeer returns the current sticky peer.
	// If there are no remote nodes, it returns an empty address.
	// The sticky peer is selected in a round-robin manner from the remote nodes.
	GetStickyPeer() common.Address

	// AdvanceStickyPeer advances the sticky peer to the next node in the round-robin manner.
	// If the current sticky peer is the last node, it shuffles the nodes and resets the sticky peer to the first node.
	AdvanceStickyPeer(currentPeer common.Address) common.Address

	// Update updates the list of nodes.
	// If the node is already in the list, it returns an error.
	Update(event *river.StreamPlacementUpdated, localNode common.Address) error
}

type StreamNodesWithoutLock struct {
	// nodes contains all streams nodes in the same order as in contract.
	nodes []common.Address

	// remotes are all nodes except the local node.
	// remotes are shuffled to avoid the same node being selected as the sticky peer.
	remotes         []common.Address
	stickyPeerIndex int
}

var _ StreamNodes = (*StreamNodesWithoutLock)(nil)

func (s *StreamNodesWithoutLock) Reset(nodes []common.Address, localNode common.Address) {
	var lastStickyAddr common.Address
	if s.stickyPeerIndex < len(s.remotes) {
		lastStickyAddr = s.remotes[s.stickyPeerIndex]
	}

	s.nodes = slices.Clone(nodes)

	localIndex := slices.Index(nodes, localNode)

	if localIndex >= 0 {
		s.remotes = slices.Concat(nodes[:localIndex], nodes[localIndex+1:])
	} else {
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

func (s *StreamNodesWithoutLock) GetNodes() []common.Address {
	return s.nodes
}

func (s *StreamNodesWithoutLock) GetRemotesAndIsLocal() ([]common.Address, bool) {
	return s.remotes, len(s.nodes) > len(s.remotes)
}

func (s *StreamNodesWithoutLock) IsLocal() bool {
	return len(s.nodes) > len(s.remotes)
}

func (s *StreamNodesWithoutLock) GetStickyPeer() common.Address {
	if len(s.remotes) > 0 {
		return s.remotes[s.stickyPeerIndex]
	} else {
		return common.Address{}
	}
}

func (s *StreamNodesWithoutLock) AdvanceStickyPeer(currentPeer common.Address) common.Address {
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

func (s *StreamNodesWithoutLock) Update(event *river.StreamPlacementUpdated, localNode common.Address) error {
	var newNodes []common.Address
	if event.IsAdded {
		if slices.Contains(s.nodes, event.NodeAddress) {
			return RiverError(
				Err_INTERNAL,
				"StreamNodes.Update(add): node already exists in stream nodes",
				"nodes",
				s.nodes,
				"node",
				event.NodeAddress,
			)
		}
		newNodes = append(s.nodes, event.NodeAddress)
	} else {
		index := slices.Index(s.nodes, event.NodeAddress)
		if index < 0 {
			return RiverError(Err_INTERNAL, "StreamNodes.Update(delete): node does not exist in stream nodes", "nodes", s.nodes, "node", event.NodeAddress)
		}
		newNodes = slices.Concat(s.nodes[:index], s.nodes[index+1:])
	}

	s.Reset(newNodes, localNode)
	return nil
}

type StreamNodesWithLock struct {
	n  StreamNodesWithoutLock
	mu deadlock.RWMutex
}

var _ StreamNodes = (*StreamNodesWithLock)(nil)

func NewStreamNodesWithLock(nodes []common.Address, localNode common.Address) *StreamNodesWithLock {
	ret := &StreamNodesWithLock{}
	ret.n.Reset(nodes, localNode)
	return ret
}

func (s *StreamNodesWithLock) GetNodes() []common.Address {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return slices.Clone(s.n.GetNodes())
}

func (s *StreamNodesWithLock) GetRemotesAndIsLocal() ([]common.Address, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	r, l := s.n.GetRemotesAndIsLocal()
	return slices.Clone(r), l
}

func (s *StreamNodesWithLock) GetStickyPeer() common.Address {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.n.GetStickyPeer()
}

func (s *StreamNodesWithLock) AdvanceStickyPeer(currentPeer common.Address) common.Address {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.n.AdvanceStickyPeer(currentPeer)
}

func (s *StreamNodesWithLock) Update(event *river.StreamPlacementUpdated, localNode common.Address) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.n.Update(event, localNode)
}
