package events_test

import (
	"testing"

	"github.com/stretchr/testify/require"

	. "casablanca/node/events"
)

func TestCookie(t *testing.T) {
	c := MakeSyncCookie(
		SyncCookie{
			StreamId:         "streamid$1",
			MiniblockNum:     5,
			MiniblockHashStr: "00ab",
			MinipoolInstance: "minipoolInstanceId$1",
			MinipoolSlot:     10,
		},
	)
	require.Equal(t, "5/10/minipoolInstanceId$1/00ab/streamid$1", c)

	parsed, err := ParseSyncCookie(c)
	require.NoError(t, err)
	require.Equal(t, "streamid$1", parsed.StreamId)
	require.Equal(t, 5, parsed.MiniblockNum)
	require.Equal(t, "00ab", parsed.MiniblockHashStr)
	require.Equal(t, "minipoolInstanceId$1", parsed.MinipoolInstance)
	require.Equal(t, 10, parsed.MinipoolSlot)

	parsed2, err := ParseSyncCookie("0/2/oa_fjfY8uY6DVO9yJaZqi/00/22-bobs-channel-mF1msDa7JwS7EuirDfz4k")
	require.NoError(t, err)
	require.Equal(t, "22-bobs-channel-mF1msDa7JwS7EuirDfz4k", parsed2.StreamId)
	require.Equal(t, 0, parsed2.MiniblockNum)
	require.Equal(t, "00", parsed2.MiniblockHashStr)
	require.Equal(t, "oa_fjfY8uY6DVO9yJaZqi", parsed2.MinipoolInstance)
	require.Equal(t, 2, parsed2.MinipoolSlot)

	parsed3, err := ParseSyncCookie("0/2/oa_fjfY8uY6DVO9yJaZqi/00/22-bobs-channel-mF1msDa7JwS7EuirDfz4k/a/a/a/a")
	require.NoError(t, err)
	require.Equal(t, "22-bobs-channel-mF1msDa7JwS7EuirDfz4k/a/a/a/a", parsed3.StreamId)

	_, err = ParseSyncCookie("0/2/oa_fjfY8uY6DVO9yJaZqi/00/")
	require.Error(t, err)

	_, err = ParseSyncCookie("0/2/oa_fjfY8uY6DVO9yJaZqi/00")
	require.Error(t, err)

	_, err = ParseSyncCookie("q/2/oa_fjfY8uY6DVO9yJaZqi/00/22-bobs-channel-mF1msDa7JwS7EuirDfz4k")
	require.Error(t, err)

	_, err = ParseSyncCookie("0/q/oa_fjfY8uY6DVO9yJaZqi/00/22-bobs-channel-mF1msDa7JwS7EuirDfz4k")
	require.Error(t, err)
}
