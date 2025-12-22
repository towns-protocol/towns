package nodes

import (
	"math/rand"
	"slices"

	"github.com/ethereum/go-ethereum/common"
	"github.com/linkdata/deadlock"

	"github.com/towns-protocol/towns/core/contracts/river"
)

type StreamNodes interface {
	// GetQuorumNodes returns all nodes in the same order as in contract that participate in the streams quorum.
	GetQuorumNodes() []common.Address

	// GetReconcileNodes returns the nodes that don't take part in the quorum but reconcile the stream in local storage.
	GetReconcileNodes() []common.Address

	// IsLocalInQuorum returns an indication if the local node is part of the quorum.
	IsLocalInQuorum() bool

	// GetRemotesAndIsLocal returns all remote nodes and true if the local node is in the list of nodes.
	GetRemotesAndIsLocal() ([]common.Address, bool)

	// GetQuorumAndReconcileNodesAndIsLocal returns
	// quorumNodes - a list of nodes that participate in the stream quorum
	// reconcileNodes - a list nodes that reconcile the stream into local storage but don't participate in quorum (yet)
	// isLocal - boolean, whether the stream is hosted on this node
	// GetQuorumAndReconcileNodesAndIsLocal is thread-safe.
	GetQuorumAndReconcileNodesAndIsLocal() ([]common.Address, []common.Address, bool)

	// GetStickyPeer returns the current sticky peer.
	// If there are no remote nodes, it returns an empty address.
	// The sticky peer is selected in a round-robin manner from the remote nodes.
	GetStickyPeer() common.Address

	// AdvanceStickyPeer advances the sticky peer to the next node in the round-robin manner.
	// If the current sticky peer is the last node, it shuffles the nodes and resets the sticky peer to the first node.
	AdvanceStickyPeer(currentPeer common.Address) common.Address

	// ResetFromStreamWithId the list of nodes from the given stream record.
	ResetFromStreamWithId(stream *river.StreamWithId, localNode common.Address)

	// Reset the list of nodes to the given nodes and local node. The nodes in range Nodes[0:replicationFactor] take
	// part in the quorum. The nodes in range Nodes[replicationFactor:] are the nodes that reconcile the stream into
	// local
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

	// reconcileNodes contains the nodes that reconcile the stream into local storage but don't take part in quorum.
	reconcileNodes []common.Address

	// remotes are all nodes except the local node.
	// remotes are shuffled to avoid the same node being selected as the sticky peer.
	remotes         []common.Address
	stickyPeerIndex int
}

var _ StreamNodes = (*StreamNodesWithoutLock)(nil)

func (s *StreamNodesWithoutLock) ResetFromStreamWithId(stream *river.StreamWithId, localNode common.Address) {
	s.Reset(stream.ReplicationFactor(), stream.Nodes(), localNode)
}

func (s *StreamNodesWithoutLock) ResetFromStream(stream *river.Stream, localNode common.Address) {
	s.Reset(stream.ReplicationFactor(), stream.Nodes, localNode)
}

func (s *StreamNodesWithoutLock) Reset(replicationFactor int, nodes []common.Address, localNode common.Address) {
	var lastStickyAddr common.Address
	if s.stickyPeerIndex < len(s.remotes) {
		lastStickyAddr = s.remotes[s.stickyPeerIndex]
	}

	s.quorumNodes = slices.Clone(nodes[:replicationFactor])
	s.reconcileNodes = slices.Clone(nodes[replicationFactor:])
	s.isLocal = slices.Contains(nodes, localNode)

	localIndex := slices.Index(s.quorumNodes, localNode)
	s.isLocalInQuorum = localIndex >= 0

	if s.isLocalInQuorum {
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

func (s *StreamNodesWithoutLock) GetReconcileNodes() []common.Address {
	return s.reconcileNodes
}

func (s *StreamNodesWithoutLock) IsLocalInQuorum() bool {
	return s.isLocalInQuorum
}

func (s *StreamNodesWithoutLock) GetRemotesAndIsLocal() ([]common.Address, bool) {
	return s.remotes, s.isLocal
}

func (s *StreamNodesWithoutLock) GetQuorumAndReconcileNodesAndIsLocal() ([]common.Address, []common.Address, bool) {
	return s.quorumNodes, s.reconcileNodes, s.isLocal
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

// GetQuorumAndReconcileNodesAndIsLocal returns
// quorumNodes - a list of non-local nodes that participate in the stream quorum
// reconcileNodes - a list of non-local nodes that reconcile the stream into local storage but don't participate in
// quorum (yet)
// isLocal - boolean, whether the stream is hosted on this node
// GetQuorumAndReconcileNodesAndIsLocal is thread-safe.
func (s *StreamNodesWithLock) GetQuorumAndReconcileNodesAndIsLocal() ([]common.Address, []common.Address, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	qn, rn, l := s.n.GetQuorumAndReconcileNodesAndIsLocal()
	return slices.Clone(qn), slices.Clone(rn), l
}

func (s *StreamNodesWithLock) GetReconcileNodes() []common.Address {
	s.mu.RLock()
	defer s.mu.RUnlock()

	return s.n.GetReconcileNodes()
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

func (s *StreamNodesWithLock) ResetFromStreamWithId(stream *river.StreamWithId, localNode common.Address) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.n.ResetFromStreamWithId(stream, localNode)
}
