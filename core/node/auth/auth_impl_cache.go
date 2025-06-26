package auth

import (
	"context"
	"time"

	"github.com/ethereum/go-ethereum/common"
	lru "github.com/hashicorp/golang-lru/arc/v2"

	"github.com/towns-protocol/towns/core/config"
	. "github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/logging"
	"github.com/towns-protocol/towns/core/node/protocol"
)

type entitlementCache struct {
	// Not using expirable version, as it retains the cache hits for a min TTL, but
	// then continues to return that value as long as a hit happens in that TTL window.
	// We want to return the value only if the cache is fresh, and not continue to return
	positiveCache    *lru.ARCCache[ChainAuthArgs, entitlementCacheValue]
	negativeCache    *lru.ARCCache[ChainAuthArgs, entitlementCacheValue]
	positiveCacheTTL time.Duration
	negativeCacheTTL time.Duration
}

type EntitlementResultReason int

const (
	EntitlementResultReason_NONE EntitlementResultReason = iota
	EntitlementResultReason_MEMBERSHIP
	EntitlementResultReason_MEMBERSHIP_EXPIRED
	EntitlementResultReason_SPACE_ENTITLEMENTS
	EntitlementResultReason_CHANNEL_ENTITLEMENTS
	EntitlementResultReason_SPACE_DISABLED
	EntitlementResultReason_CHANNEL_DISABLED
	EntitlementResultReason_WALLET_NOT_LINKED
	EntitlementResultReason_IS_APP
	EntitlementResultReason_IS_NOT_APP
	EntitlementResultReason_MISMATCHED_APP_ADDRESS
	EntitlementResultReason_APP_ENTITLEMENTS
	EntitlementResultReason_MAX // MAX - leave at the end
)

var entitlementResultReasonDescriptions = []string{
	"NONE",
	"MEMBERSHIP",
	"MEMBERSHIP_EXPIRED",
	"SPACE_ENTITLEMENTS",
	"CHANNEL_ENTITLEMENTS",
	"SPACE_DISABLED",
	"CHANNEL_DISABLED",
	"WALLET_NOT_LINKED",
	"USER_IS_APP",
	"USER_IS_NOT_APP",
	"MISMATCHED_APP_ADDRESS",
	"APP_ENTITLEMENTS",
}

func (r EntitlementResultReason) String() string {
	return entitlementResultReasonDescriptions[r]
}

type CacheResult interface {
	IsAllowed() bool
	Reason() EntitlementResultReason
}

// Cached results of isEntitlement check with the TTL of the result
type entitlementCacheValue interface {
	IsAllowed() bool
	Reason() EntitlementResultReason
	GetTimestamp() time.Time
}

type timestampedCacheValue struct {
	result    CacheResult
	timestamp time.Time
}

func (ccv *timestampedCacheValue) IsAllowed() bool {
	return ccv.result.IsAllowed()
}

func (ccv *timestampedCacheValue) Reason() EntitlementResultReason {
	return ccv.result.Reason()
}

func (ccv *timestampedCacheValue) Result() CacheResult {
	return ccv.result
}

func (ccv *timestampedCacheValue) GetTimestamp() time.Time {
	return ccv.timestamp
}

type boolCacheResult struct {
	isAllowed bool
	reason    EntitlementResultReason
}

func (b boolCacheResult) IsAllowed() bool {
	return b.isAllowed
}

func (b boolCacheResult) Reason() EntitlementResultReason {
	if b.isAllowed {
		return EntitlementResultReason_NONE
	}
	return b.reason
}

type membershipStatusCacheResult struct {
	status *MembershipStatus
}

func (ms *membershipStatusCacheResult) IsAllowed() bool {
	if ms.status == nil {
		return false
	}
	return ms.status.IsMember && !ms.status.IsExpired
}

func (ms *membershipStatusCacheResult) GetMembershipStatus() *MembershipStatus {
	return ms.status
}

func (ms *membershipStatusCacheResult) Reason() EntitlementResultReason {
	if ms.status == nil {
		return EntitlementResultReason_NONE
	}
	if !ms.status.IsMember {
		return EntitlementResultReason_MEMBERSHIP
	}
	if ms.status.IsExpired {
		return EntitlementResultReason_MEMBERSHIP_EXPIRED
	}
	return EntitlementResultReason_NONE
}

type linkedWalletCacheValue struct {
	wallets []common.Address
}

func (lwcv *linkedWalletCacheValue) GetLinkedWallets() []common.Address {
	return lwcv.wallets
}

// linked wallet cache entries are always retained for the positive cache ttl unless
// the node busts the cache. See the note on newLinkedWalletCache below.
func (lwcv *linkedWalletCacheValue) IsAllowed() bool {
	return true
}

func (lwcv *linkedWalletCacheValue) Reason() EntitlementResultReason {
	return EntitlementResultReason_NONE
}

func (lwcv *linkedWalletCacheValue) GetTimestamp() time.Time {
	return time.Now()
}

func newEntitlementCache(ctx context.Context, cfg *config.ChainConfig) (*entitlementCache, error) {
	log := logging.FromCtx(ctx)

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
		log.Errorw("error creating auth_impl positive cache", "error", err)
		return nil, WrapRiverError(protocol.Err_CANNOT_CONNECT, err)
	}
	negativeCache, err := lru.NewARC[ChainAuthArgs, entitlementCacheValue](negativeCacheSize)
	if err != nil {
		log.Errorw("error creating auth_impl negative cache", "error", err)
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

// the linked wallets cache stores linked wallets. We are ok with cached values for some operations,
// but for space and channel joins, key solicitations, and channel scrubs, we want to use the most
// recent value. That's why the auth_impl module busts the cache whenever IsEntitled is called with
// the Read permission is requested, or space membership is being evaluated.
func newLinkedWalletCache(ctx context.Context, cfg *config.ChainConfig) (*entitlementCache, error) {
	log := logging.FromCtx(ctx)

	positiveCacheSize := 50000
	if cfg.LinkedWalletCacheSize > 0 {
		positiveCacheSize = cfg.PositiveEntitlementManagerCacheSize
	}

	// We do not use the negative entitlement cache for linked wallets but bust it manually
	// bust the cache when Reads and space membership are evaluated, see note above.
	negativeCacheSize := 1

	positiveCache, err := lru.NewARC[ChainAuthArgs, entitlementCacheValue](positiveCacheSize)
	if err != nil {
		log.Errorw("error creating auth_impl entitlement manager positive cache", "error", err)
		return nil, WrapRiverError(protocol.Err_CANNOT_CONNECT, err)
	}

	// We don't use this, but make it anyway to initialize the entitlementCache.
	negativeCache, err := lru.NewARC[ChainAuthArgs, entitlementCacheValue](negativeCacheSize)
	if err != nil {
		log.Errorw("error creating auth_impl entitlement manager negative cache", "error", err)
		return nil, WrapRiverError(protocol.Err_CANNOT_CONNECT, err)
	}

	positiveCacheTTL := 15 * time.Second
	if cfg.LinkedWalletCacheTTLSeconds > 0 {
		positiveCacheTTL = time.Duration(cfg.PositiveEntitlementManagerCacheTTLSeconds) * time.Second
	}
	// This value is irrelevant as we don't use the negative cache for linked wallets.
	negativeCacheTTL := 2 * time.Second

	return &entitlementCache{
		positiveCache,
		negativeCache,
		positiveCacheTTL,
		negativeCacheTTL,
	}, nil
}

func newEntitlementManagerCache(ctx context.Context, cfg *config.ChainConfig) (*entitlementCache, error) {
	log := logging.FromCtx(ctx)

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
		log.Errorw("error creating auth_impl entitlement manager positive cache", "error", err)
		return nil, WrapRiverError(protocol.Err_CANNOT_CONNECT, err)
	}
	negativeCache, err := lru.NewARC[ChainAuthArgs, entitlementCacheValue](negativeCacheSize)
	if err != nil {
		log.Errorw("error creating auth_impl entitlement manager negative cache", "error", err)
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

func (ec *entitlementCache) bust(
	key *ChainAuthArgs,
) {
	if ok := ec.positiveCache.Contains(*key); ok {
		ec.positiveCache.Remove(*key)
	}

	// Check negative cache
	if ok := ec.negativeCache.Contains(*key); ok {
		ec.negativeCache.Remove(*key)
	}
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
