package auth

import (
	"math/big"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
)

func TestBanningCache(t *testing.T) {
	bannedAddressCache := NewBannedTokensCache(1 * time.Second)

	require.Len(t, bannedAddressCache.bannedTokens, 0)

	start := time.Now()
	isBanned, err := bannedAddressCache.IsBanned(
		[]*big.Int{big.NewInt(1)},
		func() (map[string]struct{}, error) {
			return map[string]struct{}{
				big.NewInt(1).String(): {},
			}, nil
		},
	)
	end := time.Now()

	require.NoError(t, err)
	require.True(t, isBanned)
	require.Len(t, bannedAddressCache.bannedTokens, 1)

	// Approximately validate the lastUpdated time
	require.GreaterOrEqual(t, bannedAddressCache.lastUpdated, start)
	require.GreaterOrEqual(t, end, bannedAddressCache.lastUpdated)

	time.Sleep(1 * time.Second)

	start = time.Now()
	isBanned, err = bannedAddressCache.IsBanned(
		[]*big.Int{big.NewInt(1)},
		func() (map[string]struct{}, error) {
			return map[string]struct{}{
				big.NewInt(2).String(): {},
			}, nil
		},
	)
	end = time.Now()
	lastUpdated := bannedAddressCache.lastUpdated

	require.NoError(t, err)
	require.False(t, isBanned)
	require.Len(t, bannedAddressCache.bannedTokens, 1)
	require.GreaterOrEqual(t, lastUpdated, start)
	require.GreaterOrEqual(t, end, lastUpdated)

	// cache should not be hit here, we will expect a false result
	// Note: there is a possibility that this could flake if the tests were running slowly,
	// but this is extremely unlikely.
	isBanned, err = bannedAddressCache.IsBanned(
		[]*big.Int{big.NewInt(2)},
		func() (map[string]struct{}, error) {
			return map[string]struct{}{
				big.NewInt(1).String(): {},
			}, nil
		},
	)
	// Previous onMiss cache value should be used here
	require.True(t, isBanned)
	require.NoError(t, err)
	// Update time has not changed
	require.Equal(t, lastUpdated, bannedAddressCache.lastUpdated)
}
