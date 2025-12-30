package auth

import (
	"context"
	"testing"

	"github.com/ethereum/go-ethereum/common"

	"github.com/towns-protocol/towns/core/config"
	"github.com/towns-protocol/towns/core/node/base/test"
	"github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/testutils"

	"github.com/stretchr/testify/assert"
)

type simpleCacheResult struct {
	allowed bool
}

func (scr *simpleCacheResult) IsAllowed() bool {
	return scr.allowed
}

func (scr *simpleCacheResult) Reason() EntitlementResultReason {
	return EntitlementResultReason_NONE
}

func TestEntitlementResultReasons(t *testing.T) {
	for i := EntitlementResultReason_NONE; i < EntitlementResultReason_MAX; i++ {
		assert.True(t, i >= EntitlementResultReason_NONE && i < EntitlementResultReason_MAX)
		assert.NotNil(
			t,
			i.String(),
			"EntitlementResultReason.String() is an array, please keep it up to date with EntitlementResultReason values",
		)
	}

	// test that EntitlementReason_MAX is the last value
	assert.Equal(
		t,
		EntitlementResultReason_MAX,
		EntitlementResultReason(len(entitlementResultReasonDescriptions) - 1), // -1 to exclude the MAX value
	)
}

// Test for the newEntitlementCache function
// Test for the newEntitlementCache function
func TestCache(t *testing.T) {
	ctx := test.NewTestContext(t)

	cfg := &config.Config{}

	c, err := newEntitlementCache(
		ctx,
		&config.ChainConfig{
			PositiveEntitlementCacheSize:       10000,
			NegativeEntitlementCacheSize:       10000,
			PositiveEntitlementCacheTTLSeconds: 15,
			NegativeEntitlementCacheTTLSeconds: 2,
		},
	)
	assert.NoError(t, err)
	spaceId := testutils.FakeStreamId(shared.STREAM_SPACE_BIN)
	channelId := testutils.MakeChannelId(spaceId)

	argsKey := func() *ChainAuthArgs {
		return NewChainAuthArgsForChannel(
			spaceId,
			channelId,
			common.HexToAddress("0x3"),
			PermissionWrite,
			common.Address{1, 2, 3},
		)
	}

	var cacheMissForReal bool
	result, cacheHit, err := c.executeUsingCache(
		ctx,
		cfg,
		argsKey(),
		func(context.Context, *config.Config, *ChainAuthArgs) (CacheResult, error) {
			cacheMissForReal = true
			return &simpleCacheResult{allowed: true}, nil
		},
	)
	assert.NoError(t, err)
	assert.True(t, result.IsAllowed())
	assert.False(t, cacheHit)
	assert.True(t, cacheMissForReal)

	cacheMissForReal = false
	result, cacheHit, err = c.executeUsingCache(
		ctx,
		cfg,
		argsKey(),
		func(context.Context, *config.Config, *ChainAuthArgs) (CacheResult, error) {
			cacheMissForReal = true
			return &simpleCacheResult{allowed: false}, nil
		},
	)
	assert.NoError(t, err)
	assert.True(t, result.IsAllowed())
	assert.True(t, cacheHit)
	assert.False(t, cacheMissForReal)

	// Bust negative cache, validate next computation was a cache miss with expected
	// result
	c.bust(argsKey())

	cacheMissForReal = false
	result, cacheHit, err = c.executeUsingCache(
		ctx,
		cfg,
		argsKey(),
		func(context.Context, *config.Config, *ChainAuthArgs) (CacheResult, error) {
			cacheMissForReal = true
			return &simpleCacheResult{allowed: true}, nil
		},
	)
	assert.NoError(t, err)
	assert.True(t, result.IsAllowed())
	assert.False(t, cacheHit)
	assert.True(t, cacheMissForReal)

	// This next result should be a cache hit
	cacheMissForReal = false
	result, cacheHit, err = c.executeUsingCache(
		ctx,
		cfg,
		argsKey(),
		func(context.Context, *config.Config, *ChainAuthArgs) (CacheResult, error) {
			cacheMissForReal = true
			return &simpleCacheResult{allowed: true}, nil
		},
	)
	assert.NoError(t, err)
	assert.True(t, result.IsAllowed())
	assert.True(t, cacheHit)
	assert.False(t, cacheMissForReal)

	// Bust positive cache, validate next computation was a cache miss with expected
	// result
	c.bust(argsKey())

	cacheMissForReal = false
	result, cacheHit, err = c.executeUsingCache(
		ctx,
		cfg,
		argsKey(),
		func(context.Context, *config.Config, *ChainAuthArgs) (CacheResult, error) {
			cacheMissForReal = true
			return &simpleCacheResult{allowed: true}, nil
		},
	)
	assert.NoError(t, err)
	assert.True(t, result.IsAllowed())
	assert.False(t, cacheHit)
	assert.True(t, cacheMissForReal)
}
