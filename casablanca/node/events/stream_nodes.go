package events

import "slices"

// Contains sorted stream node addresses,
// if local node is present,
// returns addresses of all nodes or only remote nodes.
type StreamNodes struct {
	nodes          []string
	localNodeIndex int
}

func NewStreamNodes(nodes []string, localNode string) *StreamNodes {
	slices.Sort(nodes)
	localNodeIndex := slices.Index(nodes, localNode)
	return &StreamNodes{
		nodes:          nodes,
		localNodeIndex: localNodeIndex,
	}
}

func (s *StreamNodes) IsLocal() bool {
	return s.localNodeIndex >= 0
}

func (s *StreamNodes) GetNodes() []string {
	return s.nodes
}

func (s *StreamNodes) GetRemotes() []string {
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
