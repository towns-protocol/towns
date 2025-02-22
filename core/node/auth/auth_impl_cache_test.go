package auth

import (
	"context"
	"testing"

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

// Test for the newEntitlementCache function
func TestCache(t *testing.T) {
	ctx, cancel := test.NewTestContext()
	defer cancel()

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

	var cacheMissForReal bool
	result, cacheHit, err := c.executeUsingCache(
		ctx,
		cfg,
		NewChainAuthArgsForChannel(spaceId, channelId, "3", PermissionWrite),
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
		NewChainAuthArgsForChannel(spaceId, channelId, "3", PermissionWrite),
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
	c.bust(NewChainAuthArgsForChannel(spaceId, channelId, "3", PermissionWrite))

	cacheMissForReal = false
	result, cacheHit, err = c.executeUsingCache(
		ctx,
		cfg,
		NewChainAuthArgsForChannel(spaceId, channelId, "3", PermissionWrite),
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
		NewChainAuthArgsForChannel(spaceId, channelId, "3", PermissionWrite),
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
	c.bust(NewChainAuthArgsForChannel(spaceId, channelId, "3", PermissionWrite))

	cacheMissForReal = false
	result, cacheHit, err = c.executeUsingCache(
		ctx,
		cfg,
		NewChainAuthArgsForChannel(spaceId, channelId, "3", PermissionWrite),
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
