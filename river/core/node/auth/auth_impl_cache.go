package auth

import (
	"context"
	"time"

	. "github.com/river-build/river/core/node/base"
	"github.com/river-build/river/core/node/config"
	"github.com/river-build/river/core/node/dlog"
	"github.com/river-build/river/core/node/protocol"

	lru "github.com/hashicorp/golang-lru/arc/v2"
)

type entitlementCache struct {
	// Not using expirable version, as it retains the cache hits for a min TTL, but
	// then continues to return that value as long as a hit happens in that tTL window.
	// We want to return the value only if the cache is fresh, and not continue to return
	positiveCache    *lru.ARCCache[ChainAuthArgs, entitlementCacheValue]
	negativeCache    *lru.ARCCache[ChainAuthArgs, entitlementCacheValue]
	positiveCacheTTL time.Duration
	negativeCacheTTL time.Duration
}

type CacheResult interface {
	IsAllowed() bool
}

// Cached results of isEntitlement check with the TTL of the result
type entitlementCacheValue interface {
	IsAllowed() bool
	GetTimestamp() time.Time
}

type timestampedCacheValue struct {
	result    CacheResult
	timestamp time.Time
}

func (ccv *timestampedCacheValue) IsAllowed() bool {
	return ccv.result.IsAllowed()
}

func (ccv *timestampedCacheValue) Result() CacheResult {
	return ccv.result
}

func (ccv *timestampedCacheValue) GetTimestamp() time.Time {
	return ccv.timestamp
}

type boolCacheResult struct {
	allowed bool
}

func (scr *boolCacheResult) IsAllowed() bool {
	return scr.allowed
}

func newEntitlementCache(ctx context.Context, cfg *config.ChainConfig) (*entitlementCache, error) {
	log := dlog.FromCtx(ctx)

	positiveCacheSize := 10000
	if cfg.PositiveEntitlementCacheSize > 0 {
		positiveCacheSize = cfg.PositiveEntitlementCacheSize
	}

	negativeCacheSize := 10000
	if cfg.NegativeEntitlementCacheSize > 0 {
		negativeCacheSize = cfg.NegativeEntitlementCacheSize
	}
	// Need to figure out how to determine the size of the cache
	positiveCache, err := lru.NewARC[ChainAuthArgs, entitlementCacheValue](positiveCacheSize)
	if err != nil {
		log.Error("error creating auth_impl positive cache", "error", err)
		return nil, WrapRiverError(protocol.Err_CANNOT_CONNECT, err)
	}
	negativeCache, err := lru.NewARC[ChainAuthArgs, entitlementCacheValue](negativeCacheSize)
	if err != nil {
		log.Error("error creating auth_impl negative cache", "error", err)
		return nil, WrapRiverError(protocol.Err_CANNOT_CONNECT, err)
	}

	positiveCacheTTL := 15 * time.Minute
	if cfg.PositiveEntitlementCacheTTLSeconds > 0 {
		positiveCacheTTL = time.Duration(cfg.PositiveEntitlementCacheTTLSeconds) * time.Second
	}
	negativeCacheTTL := 2 * time.Second
	if cfg.NegativeEntitlementCacheTTLSeconds > 0 {
		negativeCacheTTL = time.Duration(cfg.NegativeEntitlementCacheTTLSeconds) * time.Second
	}

	return &entitlementCache{
		positiveCache,
		negativeCache,
		positiveCacheTTL,
		negativeCacheTTL,
	}, nil
}

func newEntitlementManagerCache(ctx context.Context, cfg *config.ChainConfig) (*entitlementCache, error) {
	log := dlog.FromCtx(ctx)

	positiveCacheSize := 10000
	if cfg.PositiveEntitlementCacheSize > 0 {
		positiveCacheSize = cfg.PositiveEntitlementManagerCacheSize
	}

	negativeCacheSize := 10000
	if cfg.NegativeEntitlementCacheSize > 0 {
		negativeCacheSize = cfg.NegativeEntitlementManagerCacheSize
	}
	// Need to figure out how to determine the size of the cache
	positiveCache, err := lru.NewARC[ChainAuthArgs, entitlementCacheValue](positiveCacheSize)
	if err != nil {
		log.Error("error creating auth_impl entitlement manager positive cache", "error", err)
		return nil, WrapRiverError(protocol.Err_CANNOT_CONNECT, err)
	}
	negativeCache, err := lru.NewARC[ChainAuthArgs, entitlementCacheValue](negativeCacheSize)
	if err != nil {
		log.Error("error creating auth_impl entitlement manager negative cache", "error", err)
		return nil, WrapRiverError(protocol.Err_CANNOT_CONNECT, err)
	}

	positiveCacheTTL := 15 * time.Second
	if cfg.PositiveEntitlementCacheTTLSeconds > 0 {
		positiveCacheTTL = time.Duration(cfg.PositiveEntitlementManagerCacheTTLSeconds) * time.Second
	}
	negativeCacheTTL := 2 * time.Second
	if cfg.NegativeEntitlementCacheTTLSeconds > 0 {
		negativeCacheTTL = time.Duration(cfg.NegativeEntitlementManagerCacheTTLSeconds) * time.Second
	}

	return &entitlementCache{
		positiveCache,
		negativeCache,
		positiveCacheTTL,
		negativeCacheTTL,
	}, nil
}

func (ec *entitlementCache) executeUsingCache(
	ctx context.Context,
	cfg *config.Config,
	key *ChainAuthArgs,
	onMiss func(context.Context, *config.Config, *ChainAuthArgs) (CacheResult, error),
) (CacheResult, bool, error) {
	// Check positive cache first
	if val, ok := ec.positiveCache.Get(*key); ok {
		// Positive cache is only valid for a longer time
		if time.Since(val.GetTimestamp()) < ec.positiveCacheTTL {
			return val, true, nil
		} else {
			// Positive cache key is stale, remove it
			ec.positiveCache.Remove(*key)
		}
	}

	// Check negative cache
	if val, ok := ec.negativeCache.Get(*key); ok {
		// Negative cache is only valid for 2 seconds, basically one block
		if time.Since(val.GetTimestamp()) < ec.negativeCacheTTL {
			return val, true, nil
		} else {
			// Negative cache key is stale, remove it
			ec.negativeCache.Remove(*key)
		}
	}

	// Cache miss, execute the closure
	result, err := onMiss(ctx, cfg, key)
	if err != nil {
		return nil, false, err
	}

	// Store the result in the appropriate cache
	cacheVal := &timestampedCacheValue{
		result:    result,
		timestamp: time.Now(),
	}

	if result.IsAllowed() {
		ec.positiveCache.Add(*key, cacheVal)
	} else {
		ec.negativeCache.Add(*key, cacheVal)
	}

	return cacheVal, false, nil
}
