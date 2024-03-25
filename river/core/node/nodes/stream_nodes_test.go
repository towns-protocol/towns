package nodes_test

import (
	"testing"

	"github.com/ethereum/go-ethereum/common"
	"github.com/river-build/river/core/node/nodes"
	"github.com/stretchr/testify/require"
)

var (
	local   = common.BytesToAddress([]byte("local"))
	remotes = []common.Address{
		common.BytesToAddress([]byte("remote1")),
		common.BytesToAddress([]byte("remote2")),
		common.BytesToAddress([]byte("remote3")),
	}
)

func TestStreamNodes(t *testing.T) {
	tests := map[string]struct {
		hasLocal bool
	}{
		"nodes are local": {
			hasLocal: true,
		},
		"nodes are not local": {
			hasLocal: false,
		},
	}
	for name, tc := range tests {
		t.Run(name, func(t *testing.T) {
			nodeAddrs := remotes
			if tc.hasLocal {
				nodeAddrs = append(remotes, local)
			}
			streamNodes := nodes.NewStreamNodes(
				nodeAddrs,
				local,
			)
			require.Equal(t, tc.hasLocal, streamNodes.IsLocal())
			require.Equal(t, tc.hasLocal, streamNodes.LocalIsLeader())
			require.ElementsMatch(t, nodeAddrs, streamNodes.GetNodes())
			require.ElementsMatch(
				t,
				remotes,
				streamNodes.GetRemotes(),
			)

			seenPeers := map[common.Address]struct{}{}

			stickyPeer1 := streamNodes.GetStickyPeer()
			require.Equal(t, stickyPeer1, streamNodes.GetStickyPeer())
			require.Equal(t, stickyPeer1, streamNodes.GetStickyPeer())

			seenPeers[stickyPeer1] = struct{}{}

			stickyPeer2 := streamNodes.AdvanceStickyPeer(stickyPeer1)
			require.Equal(t, stickyPeer2, streamNodes.GetStickyPeer())
			require.Equal(t, stickyPeer2, streamNodes.GetStickyPeer())

			_, seen := seenPeers[stickyPeer2]
			require.False(t, seen)
			seenPeers[stickyPeer2] = struct{}{}

			stickyPeer3 := streamNodes.AdvanceStickyPeer(stickyPeer2)
			require.Equal(t, stickyPeer3, streamNodes.GetStickyPeer())
			require.Equal(t, stickyPeer3, streamNodes.GetStickyPeer())

			_, seen = seenPeers[stickyPeer3]
			require.False(t, seen)
			seenPeers[stickyPeer3] = struct{}{}

			require.NotNil(t, streamNodes.AdvanceStickyPeer(stickyPeer3))

			// At this point, we should be looping through seen nodes
			_, seen = seenPeers[streamNodes.GetStickyPeer()]
			require.True(t, seen)

			// Assert local has never been returned as a peer node
			_, seen = seenPeers[local]
			require.False(t, seen)

			// Continuing to advance should cause no issues
			stickyPeer4 := streamNodes.AdvanceStickyPeer(stickyPeer3)
			require.NotNil(t, stickyPeer4)

			// Multiple calls to advance with the same current sticky node should not advance
			// the sticky peer. Local should continue to be considered the leader even as internal
			// node ordering changes.
			require.Equal(t, tc.hasLocal, streamNodes.LocalIsLeader())
			require.Equal(t, stickyPeer4, streamNodes.AdvanceStickyPeer(stickyPeer3))
			require.Equal(t, stickyPeer4, streamNodes.AdvanceStickyPeer(stickyPeer3))
		})
	}
}
