package auth

import (
	. "casablanca/node/base"
	"casablanca/node/config"
	"casablanca/node/dlog"
	"casablanca/node/protocol"
	"context"
	"time"

	lru "github.com/hashicorp/golang-lru/arc/v2"
)

type entitlementCache struct {
	// Not using expirable version, as it retains the cache hits for a min TTL, but
	// then continues to return that value as long as a hit happens in that tTL window.
	// We want to return the value only if the cache is fresh, and not continue to return
	positiveCache    *lru.ARCCache[AuthCheckArgs, entitlementCacheValue]
	negativeCache    *lru.ARCCache[AuthCheckArgs, entitlementCacheValue]
	positiveCacheTTL time.Duration
	negativeCacheTTL time.Duration
}

// Cached results of isEntitlement check with the TTL of the result
type entitlementCacheValue struct {
	Allowed   bool
	Timestamp time.Time
}

func newEntitlementCache(ctx context.Context, cfg *config.ChainConfig) (*entitlementCache, error) {
	log := dlog.CtxLog(ctx)

	positiveCacheSize := 10000
	if cfg.PositiveEntitlementCacheSize > 0 {
		positiveCacheSize = cfg.PositiveEntitlementCacheSize
	}

	negativeCacheSize := 10000
	if cfg.NegativeEntitlementCacheSize > 0 {
		negativeCacheSize = cfg.NegativeEntitlementCacheSize
	}
	// Need to figure out how to determine the size of the cache
	positiveCache, err := lru.NewARC[AuthCheckArgs, entitlementCacheValue](positiveCacheSize)
	if err != nil {
		log.Error("error creating auth_impl positive cache", "error", err)
		return nil, WrapRiverError(protocol.Err_CANNOT_CONNECT, err)
	}
	negativeCache, err := lru.NewARC[AuthCheckArgs, entitlementCacheValue](negativeCacheSize)
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

// Returns: result, isCacheHit, error
func (ec *entitlementCache) executeUsingCache(
	ctx context.Context,
	key *AuthCheckArgs,
	onMiss func(context.Context, *AuthCheckArgs) (bool, error),
) (bool, bool, error) {
	// Check positive cache first
	if val, ok := ec.positiveCache.Get(*key); ok {
		// Positive cache is only valid for 15 minutes
		if time.Since(val.Timestamp) < ec.positiveCacheTTL {
			return val.Allowed, true, nil
		} else {
			// Positive cache key is stale, remove it
			ec.positiveCache.Remove(*key)
		}
	}

	// Check negative cache
	if val, ok := ec.negativeCache.Get(*key); ok {
		// Negative cache is only valid for 2 seconds, basically one block
		if time.Since(val.Timestamp) < ec.negativeCacheTTL {
			return val.Allowed, true, nil
		} else {
			// Negative cache key is stale, remove it
			ec.negativeCache.Remove(*key)
		}
	}

	// Cache miss, execute the closure
	isAllowed, err := onMiss(ctx, key)
	if err != nil {
		return false, false, err
	}

	// Store the result in the appropriate cache
	cacheVal := entitlementCacheValue{Allowed: isAllowed, Timestamp: time.Now()}
	if isAllowed {
		ec.positiveCache.Add(*key, cacheVal)
	} else {
		ec.negativeCache.Add(*key, cacheVal)
	}

	return isAllowed, false, nil
}
