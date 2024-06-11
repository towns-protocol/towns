package auth

import (
	"testing"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/stretchr/testify/require"
)

func TestBanningCache(t *testing.T) {
	bannedAddressCache := NewBannedAddressCache(1 * time.Second)

	require.Len(t, bannedAddressCache.bannedAddresses, 0)

	start := time.Now()
	isBanned, err := bannedAddressCache.IsBanned(
		[]common.Address{common.HexToAddress("0x1")},
		func() (map[common.Address]struct{}, error) {

			return map[common.Address]struct{}{
				common.HexToAddress("0x1"): {},
			}, nil
		},
	)
	end := time.Now()

	require.NoError(t, err)
	require.True(t, isBanned)
	require.Len(t, bannedAddressCache.bannedAddresses, 1)

	// Approximately validate the lastUpdated time
	require.GreaterOrEqual(t, bannedAddressCache.lastUpdated, start)
	require.GreaterOrEqual(t, end, bannedAddressCache.lastUpdated)

	time.Sleep(1 * time.Second)

	start = time.Now()
	isBanned, err = bannedAddressCache.IsBanned(
		[]common.Address{common.HexToAddress("0x1")},
		func() (map[common.Address]struct{}, error) {

			return map[common.Address]struct{}{
				common.HexToAddress("0x2"): {},
			}, nil
		},
	)
	end = time.Now()
	lastUpdated := bannedAddressCache.lastUpdated

	require.NoError(t, err)
	require.False(t, isBanned)
	require.Len(t, bannedAddressCache.bannedAddresses, 1)
	require.GreaterOrEqual(t, lastUpdated, start)
	require.GreaterOrEqual(t, end, lastUpdated)

	// cache should not be hit here, we will expect a false result
	// Note: there is a possibility that this could flake if the tests were running slowly,
	// but this is extremely unlikely.
	isBanned, err = bannedAddressCache.IsBanned(
		[]common.Address{common.HexToAddress("0x2")},
		func() (map[common.Address]struct{}, error) {
			return map[common.Address]struct{}{
				common.HexToAddress("0x1"): {},
			}, nil
		},
	)
	// Previous onMiss cache value should be used here
	require.True(t, isBanned)
	require.NoError(t, err)
	// Update time has not changed
	require.Equal(t, lastUpdated, bannedAddressCache.lastUpdated)

}
