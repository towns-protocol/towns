package auth

import (
	"context"
	"testing"

	"github.com/river-build/river/config"

	"github.com/stretchr/testify/assert"
)

// Test for the newEntitlementCache function
func TestCache(t *testing.T) {
	ctx := context.Background()
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

	var cacheMissForReal bool
	result, cacheHit, err := c.executeUsingCache(
		ctx,
		NewAuthCheckArgsForChannel("1", "2", "3", PermissionWrite),
		func(context.Context, *AuthCheckArgs) (bool, error) {
			cacheMissForReal = true
			return true, nil
		},
	)
	assert.NoError(t, err)
	assert.True(t, result)
	assert.False(t, cacheHit)
	assert.True(t, cacheMissForReal)

	cacheMissForReal = false
	result, cacheHit, err = c.executeUsingCache(
		ctx,
		NewAuthCheckArgsForChannel("1", "2", "3", PermissionWrite),
		func(context.Context, *AuthCheckArgs) (bool, error) {
			cacheMissForReal = true
			return false, nil
		},
	)
	assert.NoError(t, err)
	assert.True(t, result)
	assert.True(t, cacheHit)
	assert.False(t, cacheMissForReal)
}
