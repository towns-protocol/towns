package events

import (
	"testing"

	"github.com/river-build/river/core/node/base/test"
	"github.com/river-build/river/core/node/crypto"
	. "github.com/river-build/river/core/node/protocol"
	. "github.com/river-build/river/core/node/shared"
	"github.com/river-build/river/core/node/testutils"

	"github.com/stretchr/testify/require"
)

func TestEqualAndCopy(t *testing.T) {
	ctx, cancel := test.NewTestContext()
	defer cancel()
	nodeWallet1, _ := crypto.NewWallet(ctx)
	nodeWallet2, _ := crypto.NewWallet(ctx)
	require.True(t, SyncCookieEqual(nil, nil))
	stream1Id := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	badStreamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)

	a := &SyncCookie{
		NodeAddress:       nodeWallet1.Address[:],
		StreamId:          stream1Id[:],
		MinipoolGen:       5,
		MinipoolSlot:      10,
		PrevMiniblockHash: []byte{0, 1, 2, 4},
	}
	require.True(t, SyncCookieEqual(a, a))
	require.False(t, SyncCookieEqual(nil, a))
	require.False(t, SyncCookieEqual(a, nil))
	b := SyncCookieCopy(a)
	require.True(t, SyncCookieEqual(a, b))
	b.StreamId = badStreamId[:]
	require.False(t, SyncCookieEqual(a, b))
	b = SyncCookieCopy(a)
	b.MinipoolGen = 6
	require.False(t, SyncCookieEqual(a, b))
	b = SyncCookieCopy(a)
	b.PrevMiniblockHash = []byte{0, 1, 2, 5}
	require.False(t, SyncCookieEqual(a, b))
	b = SyncCookieCopy(a)
	b.NodeAddress = nodeWallet2.Address[:]
	require.False(t, SyncCookieEqual(a, b))
	b = SyncCookieCopy(a)
	b.MinipoolSlot = 11
	require.False(t, SyncCookieEqual(a, b))
}
