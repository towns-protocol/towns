package nodes

import (
	"math/rand"
	"slices"

	"github.com/ethereum/go-ethereum/common"
	"github.com/linkdata/deadlock"

	"github.com/towns-protocol/towns/core/contracts/river"
	"github.com/towns-protocol/towns/core/node/registries"
)

type StreamNodes interface {
	// GetQuorumNodes returns all nodes in the same order as in contract that participate in the streams quorum.
	GetQuorumNodes() []common.Address

	// GetSyncNodes returns the nodes that don't take part in the quorum but sync the stream in local storage.
	GetSyncNodes() []common.Address

	// IsLocalInQuorum returns an indication if the local node is part of the quorum.
	IsLocalInQuorum() bool

	// GetRemotesAndIsLocal returns all remote nodes and true if the local node is in the list of nodes.
	GetRemotesAndIsLocal() ([]common.Address, bool)

	// GetStickyPeer returns the current sticky peer.
	// If there are no remote nodes, it returns an empty address.
	// The sticky peer is selected in a round-robin manner from the remote nodes.
	GetStickyPeer() common.Address

	// AdvanceStickyPeer advances the sticky peer to the next node in the round-robin manner.
	// If the current sticky peer is the last node, it shuffles the nodes and resets the sticky peer to the first node.
	AdvanceStickyPeer(currentPeer common.Address) common.Address

	// ResetFromStreamState the list of nodes from the given stream state.
	ResetFromStreamState(state *river.StreamState, localNode common.Address)

	// ResetFromStreamResult the list of nodes from the given stream result.
	ResetFromStreamResult(result *registries.GetStreamResult, localNode common.Address)

	// Reset the list of nodes to the given nodes and local node. The nodes in range Nodes[0:replicationFactor] take
	// part in the quorum. The nodes in range Nodes[replicationFactor:] are the nodes that sync the stream into local
	// storage but don't take part in quorum.
	Reset(replicationFactor int, nodes []common.Address, localNode common.Address)
}

type StreamNodesWithoutLock struct {
	// isLocal is true when the local node is in the list of nodes.
	// Note: this doesn't mean that the local node is part of the stream quorum.
	isLocal bool
	// isLocalInQuorum is true when the local node is part of the quorum.
	isLocalInQuorum bool

	// quorumNodes contains all streams nodes that participate in the streams quorum in the same order as the contract.
	quorumNodes []common.Address

	// syncNodes contains the nodes that sync the stream into local storage but don't take part in quorum.
	syncNodes []common.Address

	// remotes are all nodes except the local node.
	// remotes are shuffled to avoid the same node being selected as the sticky peer.
	remotes         []common.Address
	stickyPeerIndex int
}

var _ StreamNodes = (*StreamNodesWithoutLock)(nil)

func (s *StreamNodesWithoutLock) ResetFromStreamState(state *river.StreamState, localNode common.Address) {
	s.Reset(state.StreamReplicationFactor(), state.Nodes, localNode)
}

func (s *StreamNodesWithoutLock) ResetFromStreamResult(result *registries.GetStreamResult, localNode common.Address) {
	s.Reset(result.StreamReplicationFactor(), result.Nodes, localNode)
}

func (s *StreamNodesWithoutLock) Reset(replicationFactor int, nodes []common.Address, localNode common.Address) {
	var lastStickyAddr common.Address
	if s.stickyPeerIndex < len(s.quorumNodes) {
		lastStickyAddr = s.quorumNodes[s.stickyPeerIndex]
	}

	s.quorumNodes = slices.Clone(nodes[:replicationFactor])
	s.syncNodes = slices.Clone(nodes[replicationFactor:])
	s.isLocalInQuorum = slices.Contains(s.quorumNodes, localNode)

	localIndex := slices.Index(s.quorumNodes, localNode)
	s.isLocal = localIndex >= 0

	if s.isLocal {
		s.remotes = slices.Concat(s.quorumNodes[:localIndex], s.quorumNodes[localIndex+1:])
	} else {
		s.remotes = slices.Clone(s.quorumNodes)
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

func (s *StreamNodesWithoutLock) GetQuorumNodes() []common.Address {
	return s.quorumNodes
}

func (s *StreamNodesWithoutLock) GetSyncNodes() []common.Address {
	return s.syncNodes
}

func (s *StreamNodesWithoutLock) IsLocalInQuorum() bool {
	return s.isLocalInQuorum
}

func (s *StreamNodesWithoutLock) GetRemotesAndIsLocal() ([]common.Address, bool) {
	return s.remotes, s.isLocal
}

func (s *StreamNodesWithoutLock) IsLocal() bool {
	return s.isLocal
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

type StreamNodesWithLock struct {
	n  StreamNodesWithoutLock
	mu deadlock.RWMutex
}

var _ StreamNodes = (*StreamNodesWithLock)(nil)

func NewStreamNodesWithLock(replFactor int, nodes []common.Address, localNode common.Address) *StreamNodesWithLock {
	ret := &StreamNodesWithLock{}
	ret.n.Reset(replFactor, nodes, localNode)

	return ret
}

func (s *StreamNodesWithLock) GetQuorumNodes() []common.Address {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return slices.Clone(s.n.GetQuorumNodes())
}

func (s *StreamNodesWithLock) GetRemotesAndIsLocal() ([]common.Address, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	r, l := s.n.GetRemotesAndIsLocal()
	return slices.Clone(r), l
}

func (s *StreamNodesWithLock) GetSyncNodes() []common.Address {
	s.mu.RLock()
	defer s.mu.RUnlock()

	return s.n.GetSyncNodes()
}

func (s *StreamNodesWithLock) IsLocalInQuorum() bool {
	s.mu.RLock()
	defer s.mu.RUnlock()

	return s.n.IsLocalInQuorum()
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

func (s *StreamNodesWithLock) Reset(replicationFactor int, nodes []common.Address, localNode common.Address) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.n.Reset(replicationFactor, nodes, localNode)
}

func (s *StreamNodesWithLock) ResetFromStreamState(state *river.StreamState, localNode common.Address) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.n.ResetFromStreamState(state, localNode)
}

func (s *StreamNodesWithLock) ResetFromStreamResult(result *registries.GetStreamResult, localNode common.Address) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.n.ResetFromStreamResult(result, localNode)
}
