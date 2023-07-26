package events

import (
	. "casablanca/node/protocol"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestEqualAndCopy(t *testing.T) {
	require.True(t, SyncCookieEqual(nil, nil))
	a := &SyncCookie{
		StreamId:         "streamid$1",
		MiniblockNum:     5,
		MiniblockHash:    []byte{0, 1, 2, 4},
		MinipoolInstance: "minipoolInstanceId$1",
		MinipoolSlot:     10,
	}
	require.True(t, SyncCookieEqual(a, a))
	require.False(t, SyncCookieEqual(nil, a))
	require.False(t, SyncCookieEqual(a, nil))
	b := SyncCookieCopy(a)
	require.True(t, SyncCookieEqual(a, b))
	b.StreamId = "streamid$2"
	require.False(t, SyncCookieEqual(a, b))
	b = SyncCookieCopy(a)
	b.MiniblockNum = 6
	require.False(t, SyncCookieEqual(a, b))
	b = SyncCookieCopy(a)
	b.MiniblockHash = []byte{0, 1, 2, 5}
	require.False(t, SyncCookieEqual(a, b))
	b = SyncCookieCopy(a)
	b.MinipoolInstance = "minipoolInstanceId$2"
	require.False(t, SyncCookieEqual(a, b))
	b = SyncCookieCopy(a)
	b.MinipoolSlot = 11
	require.False(t, SyncCookieEqual(a, b))
}
