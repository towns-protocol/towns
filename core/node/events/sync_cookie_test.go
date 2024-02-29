package events

import (
	"testing"

	. "github.com/river-build/river/core/node/protocol"

	"github.com/stretchr/testify/require"
)

func TestEqualAndCopy(t *testing.T) {
	require.True(t, SyncCookieEqual(nil, nil))
	a := &SyncCookie{
		NodeAddress:       "nodeAddress$1",
		StreamId:          "streamid$1",
		MinipoolGen:       5,
		MinipoolSlot:      10,
		PrevMiniblockHash: []byte{0, 1, 2, 4},
	}
	require.True(t, SyncCookieEqual(a, a))
	require.False(t, SyncCookieEqual(nil, a))
	require.False(t, SyncCookieEqual(a, nil))
	b := SyncCookieCopy(a)
	require.True(t, SyncCookieEqual(a, b))
	b.StreamId = "streamid$2"
	require.False(t, SyncCookieEqual(a, b))
	b = SyncCookieCopy(a)
	b.MinipoolGen = 6
	require.False(t, SyncCookieEqual(a, b))
	b = SyncCookieCopy(a)
	b.PrevMiniblockHash = []byte{0, 1, 2, 5}
	require.False(t, SyncCookieEqual(a, b))
	b = SyncCookieCopy(a)
	b.NodeAddress = "nodeAddress$2"
	require.False(t, SyncCookieEqual(a, b))
	b = SyncCookieCopy(a)
	b.MinipoolSlot = 11
	require.False(t, SyncCookieEqual(a, b))
}
