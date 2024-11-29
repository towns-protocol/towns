package auth

import (
	"context"
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/prometheus/client_golang/prometheus"

	"github.com/river-build/river/core/config"
	"github.com/river-build/river/core/contracts/base"
	"github.com/river-build/river/core/contracts/types"
	. "github.com/river-build/river/core/node/base"
	"github.com/river-build/river/core/node/crypto"
	"github.com/river-build/river/core/node/dlog"
	"github.com/river-build/river/core/node/infra"
	. "github.com/river-build/river/core/node/protocol"
	"github.com/river-build/river/core/node/shared"
	"github.com/river-build/river/core/xchain/entitlement"

	"github.com/ethereum/go-ethereum/common"
)

type ChainAuth interface {
	/*
		IsEntitled algorithm
		====================
		1. If this check has been recently performed, return the cached result.
		2. Validate that the space or channel is enabled, depending on whether the request is for a space or channel.
		   This computation is cached and if a cached result is available, it is used.
		   If the space or channel is disabled, return false.
		3. All linked wallets for the principal are retrieved.
		4. All linked wallets are checked for space membership. If any are not a space member, the permission check fails.
		5. If the number of linked wallets exceeds the limit, the permission check fails.
		6A. For spaces, the space entitlements are retrieved and checked against all linked wallets.
			1. If the owner of the space is in the linked wallets, the permission check passes.
			2. If the space has a rule entitlement, the rule is evaluated against the linked wallets. If it passes,
			   the permission check passes.
			3. If the space has a user entitlement, all linked wallets are checked against the user entitlement. If any
			   linked wallets are in the user entitlement, the permission check passes.
			4. If none of the above checks pass, the permission check fails.
		6B. For channels, the space contract method `IsEntitledToChannel` is called for each linked wallet. If any of the
			linked wallets are entitled to the channel, the permission check passes. Otherwise, it fails.
	*/
	IsEntitled(ctx context.Context, cfg *config.Config, args *ChainAuthArgs) (bool, error)
}

var everyone = common.HexToAddress("0x1") // This represents an Ethereum address of "0x1"

func NewChainAuthArgsForSpace(spaceId shared.StreamId, userId string, permission Permission) *ChainAuthArgs {
	return &ChainAuthArgs{
		kind:       chainAuthKindSpace,
		spaceId:    spaceId,
		principal:  common.HexToAddress(userId),
		permission: permission,
	}
}

func NewChainAuthArgsForChannel(
	spaceId shared.StreamId,
	channelId shared.StreamId,
	userId string,
	permission Permission,
) *ChainAuthArgs {
	return &ChainAuthArgs{
		kind:       chainAuthKindChannel,
		spaceId:    spaceId,
		channelId:  channelId,
		principal:  common.HexToAddress(userId),
		permission: permission,
	}
}

func NewChainAuthArgsForIsSpaceMember(spaceId shared.StreamId, userId string) *ChainAuthArgs {
	return &ChainAuthArgs{
		kind:      chainAuthKindIsSpaceMember,
		spaceId:   spaceId,
		principal: common.HexToAddress(userId),
	}
}

type chainAuthKind int

const (
	chainAuthKindSpace chainAuthKind = iota
	chainAuthKindChannel
	chainAuthKindSpaceEnabled
	chainAuthKindChannelEnabled
	chainAuthKindIsSpaceMember
)

type ChainAuthArgs struct {
	kind          chainAuthKind
	spaceId       shared.StreamId
	channelId     shared.StreamId
	principal     common.Address
	permission    Permission
	linkedWallets string // a serialized list of linked wallets to comply with the cache key constraints
}

func (args *ChainAuthArgs) Principal() common.Address {
	return args.principal
}

func (args *ChainAuthArgs) String() string {
	return fmt.Sprintf(
		"ChainAuthArgs{kind: %d, spaceId: %s, channelId: %s, principal: %s, permission: %s, linkedWallets: %s}",
		args.kind,
		args.spaceId,
		args.channelId,
		args.principal.Hex(),
		args.permission,
		args.linkedWallets,
	)
}

func (args *ChainAuthArgs) withLinkedWallets(linkedWallets []common.Address) *ChainAuthArgs {
	ret := *args
	var builder strings.Builder
	for i, addr := range linkedWallets {
		if i > 0 {
			builder.WriteString(",")
		}
		builder.WriteString(addr.Hex())
	}
	ret.linkedWallets = builder.String()
	return &ret
}

func newArgsForEnabledSpace(spaceId shared.StreamId) *ChainAuthArgs {
	return &ChainAuthArgs{
		kind:    chainAuthKindSpaceEnabled,
		spaceId: spaceId,
	}
}

func newArgsForEnabledChannel(spaceId shared.StreamId, channelId shared.StreamId) *ChainAuthArgs {
	return &ChainAuthArgs{
		kind:      chainAuthKindChannelEnabled,
		spaceId:   spaceId,
		channelId: channelId,
	}
}

// Used as a cache key for linked wallets, which span multiple spaces and channels.
func newArgsForLinkedWallets(principal common.Address) *ChainAuthArgs {
	return &ChainAuthArgs{
		principal: principal,
	}
}

const (
	DEFAULT_REQUEST_TIMEOUT_MS = 5000
	DEFAULT_MAX_WALLETS        = 10
)

type chainAuth struct {
	blockchain              *crypto.Blockchain
	evaluator               *entitlement.Evaluator
	spaceContract           SpaceContract
	walletLinkContract      *base.WalletLink
	linkedWalletsLimit      int
	contractCallsTimeoutMs  int
	entitlementCache        *entitlementCache
	membershipCache         *entitlementCache
	entitlementManagerCache *entitlementCache
	linkedWalletCache       *entitlementCache

	isEntitledToChannelCacheHit  prometheus.Counter
	isEntitledToChannelCacheMiss prometheus.Counter
	isEntitledToSpaceCacheHit    prometheus.Counter
	isEntitledToSpaceCacheMiss   prometheus.Counter
	isSpaceEnabledCacheHit       prometheus.Counter
	isSpaceEnabledCacheMiss      prometheus.Counter
	isChannelEnabledCacheHit     prometheus.Counter
	isChannelEnabledCacheMiss    prometheus.Counter
	entitlementCacheHit          prometheus.Counter
	entitlementCacheMiss         prometheus.Counter
	linkedWalletCacheHit         prometheus.Counter
	linkedWalletCacheMiss        prometheus.Counter
	linkedWalletCacheBust        prometheus.Counter
	membershipCacheHit           prometheus.Counter
	membershipCacheMiss          prometheus.Counter
}

var _ ChainAuth = (*chainAuth)(nil)

func NewChainAuth(
	ctx context.Context,
	blockchain *crypto.Blockchain,
	evaluator *entitlement.Evaluator,
	architectCfg *config.ContractConfig,
	linkedWalletsLimit int,
	contractCallsTimeoutMs int,
	metrics infra.MetricsFactory,
) (*chainAuth, error) {
	// instantiate contract facets from diamond configuration
	spaceContract, err := NewSpaceContractV3(ctx, architectCfg, blockchain.Config, blockchain.Client)
	if err != nil {
		return nil, err
	}

	walletLinkContract, err := base.NewWalletLink(architectCfg.Address, blockchain.Client)
	if err != nil {
		return nil, err
	}

	entitlementCache, err := newEntitlementCache(ctx, blockchain.Config)
	if err != nil {
		return nil, err
	}

	membershipCache, err := newEntitlementCache(ctx, blockchain.Config)
	if err != nil {
		return nil, err
	}

	// seperate cache for entitlement manager as the timeouts are shorter
	entitlementManagerCache, err := newEntitlementManagerCache(ctx, blockchain.Config)
	if err != nil {
		return nil, err
	}

	linkedWalletCache, err := newLinkedWalletCache(ctx, blockchain.Config)
	if err != nil {
		return nil, err
	}

	if linkedWalletsLimit <= 0 {
		linkedWalletsLimit = DEFAULT_MAX_WALLETS
	}
	if contractCallsTimeoutMs <= 0 {
		contractCallsTimeoutMs = DEFAULT_REQUEST_TIMEOUT_MS
	}

	counter := metrics.NewCounterVecEx(
		"entitlement_cache", "Cache hits and misses for entitlement caches", "function", "result")

	return &chainAuth{
		blockchain:              blockchain,
		evaluator:               evaluator,
		spaceContract:           spaceContract,
		walletLinkContract:      walletLinkContract,
		linkedWalletsLimit:      linkedWalletsLimit,
		contractCallsTimeoutMs:  contractCallsTimeoutMs,
		entitlementCache:        entitlementCache,
		membershipCache:         membershipCache,
		entitlementManagerCache: entitlementManagerCache,
		linkedWalletCache:       linkedWalletCache,

		isEntitledToChannelCacheHit:  counter.WithLabelValues("isEntitledToChannel", "hit"),
		isEntitledToChannelCacheMiss: counter.WithLabelValues("isEntitledToChannel", "miss"),
		isEntitledToSpaceCacheHit:    counter.WithLabelValues("isEntitledToSpace", "hit"),
		isEntitledToSpaceCacheMiss:   counter.WithLabelValues("isEntitledToSpace", "miss"),
		isSpaceEnabledCacheHit:       counter.WithLabelValues("isSpaceEnabled", "hit"),
		isSpaceEnabledCacheMiss:      counter.WithLabelValues("isSpaceEnabled", "miss"),
		isChannelEnabledCacheHit:     counter.WithLabelValues("isChannelEnabled", "hit"),
		isChannelEnabledCacheMiss:    counter.WithLabelValues("isChannelEnabled", "miss"),
		entitlementCacheHit:          counter.WithLabelValues("entitlement", "hit"),
		entitlementCacheMiss:         counter.WithLabelValues("entitlement", "miss"),
		linkedWalletCacheHit:         counter.WithLabelValues("linkedWallet", "hit"),
		linkedWalletCacheMiss:        counter.WithLabelValues("linkedWallet", "miss"),
		linkedWalletCacheBust:        counter.WithLabelValues("linkedWallet", "bust"),
		membershipCacheHit:           counter.WithLabelValues("membership", "hit"),
		membershipCacheMiss:          counter.WithLabelValues("membership", "miss"),
	}, nil
}

func (ca *chainAuth) IsEntitled(ctx context.Context, cfg *config.Config, args *ChainAuthArgs) (bool, error) {
	// TODO: counter for cache hits here?
	result, _, err := ca.entitlementCache.executeUsingCache(
		ctx,
		cfg,
		args,
		ca.checkEntitlement,
	)
	if err != nil {
		return false, AsRiverError(err).Func("IsEntitled")
	}

	return result.IsAllowed(), nil
}

func (ca *chainAuth) areLinkedWalletsEntitled(
	ctx context.Context,
	cfg *config.Config,
	args *ChainAuthArgs,
) (bool, error) {
	log := dlog.FromCtx(ctx)
	if args.kind == chainAuthKindSpace {
		log.Debug("isWalletEntitled", "kind", "space", "args", args)
		return ca.isEntitledToSpace(ctx, cfg, args)
	} else if args.kind == chainAuthKindChannel {
		log.Debug("isWalletEntitled", "kind", "channel", "args", args)
		return ca.isEntitledToChannel(ctx, cfg, args)
	} else if args.kind == chainAuthKindIsSpaceMember {
		log.Debug("isWalletEntitled", "kind", "isSpaceMember", "args", args)
		return true, nil // is space member is checked by the calling code in checkEntitlement
	} else {
		return false, RiverError(Err_INTERNAL, "Unknown chain auth kind").Func("isWalletEntitled")
	}
}

func (ca *chainAuth) isSpaceEnabledUncached(
	ctx context.Context,
	cfg *config.Config,
	args *ChainAuthArgs,
) (CacheResult, error) {
	// This is awkward as we want enabled to be cached for 15 minutes, but the API returns the inverse
	isDisabled, err := ca.spaceContract.IsSpaceDisabled(ctx, args.spaceId)
	if err != nil {
		return nil, err
	}
	return boolCacheResult(!isDisabled), nil
}

func (ca *chainAuth) checkSpaceEnabled(ctx context.Context, cfg *config.Config, spaceId shared.StreamId) (bool, error) {
	isEnabled, cacheHit, err := ca.entitlementCache.executeUsingCache(
		ctx,
		cfg,
		newArgsForEnabledSpace(spaceId),
		ca.isSpaceEnabledUncached,
	)
	if err != nil {
		return false, err
	}
	if cacheHit {
		ca.isSpaceEnabledCacheHit.Inc()
	} else {
		ca.isSpaceEnabledCacheMiss.Inc()
	}

	return isEnabled.IsAllowed(), nil
}

func (ca *chainAuth) isChannelEnabledUncached(
	ctx context.Context,
	cfg *config.Config,
	args *ChainAuthArgs,
) (CacheResult, error) {
	// This is awkward as we want enabled to be cached for 15 minutes, but the API returns the inverse
	isDisabled, err := ca.spaceContract.IsChannelDisabled(ctx, args.spaceId, args.channelId)
	if err != nil {
		return nil, err
	}
	return boolCacheResult(!isDisabled), nil
}

func (ca *chainAuth) checkChannelEnabled(
	ctx context.Context,
	cfg *config.Config,
	spaceId shared.StreamId,
	channelId shared.StreamId,
) (bool, error) {
	isEnabled, cacheHit, err := ca.entitlementCache.executeUsingCache(
		ctx,
		cfg,
		newArgsForEnabledChannel(spaceId, channelId),
		ca.isChannelEnabledUncached,
	)
	if err != nil {
		return false, err
	}
	if cacheHit {
		ca.isChannelEnabledCacheHit.Inc()
	} else {
		ca.isChannelEnabledCacheMiss.Inc()
	}

	return isEnabled.IsAllowed(), nil
}

// CacheResult is the result of a cache lookup.
// allowed means that this value should be cached
// not that the caller is allowed to access the permission
type entitlementCacheResult struct {
	allowed         bool
	entitlementData []types.Entitlement
	owner           common.Address
}

func (scr *entitlementCacheResult) IsAllowed() bool {
	return scr.allowed
}

// If entitlements are found for the permissions, they are returned and the allowed flag is set true so the results may be cached.
// If the call fails or the space is not found, the allowed flag is set to false so the negative caching time applies.
func (ca *chainAuth) getSpaceEntitlementsForPermissionUncached(
	ctx context.Context,
	cfg *config.Config,
	args *ChainAuthArgs,
) (CacheResult, error) {
	log := dlog.FromCtx(ctx)
	entitlementData, owner, err := ca.spaceContract.GetSpaceEntitlementsForPermission(
		ctx,
		args.spaceId,
		args.permission,
	)

	log.Debug("getSpaceEntitlementsForPermissionUncached", "args", args, "entitlementData", entitlementData)
	if err != nil {
		return &entitlementCacheResult{
				allowed: false,
			}, AsRiverError(
				err,
			).Func("getSpaceEntitlementsForPermision").
				Message("Failed to get space entitlements")
	}
	return &entitlementCacheResult{allowed: true, entitlementData: entitlementData, owner: owner}, nil
}

// If entitlements are found for the permissions, they are returned and the allowed flag is set true so the results may be cached.
// If the call fails or the space is not found, the allowed flag is set to false so the negative caching time applies.
func (ca *chainAuth) getChannelEntitlementsForPermissionUncached(
	ctx context.Context,
	cfg *config.Config,
	args *ChainAuthArgs,
) (CacheResult, error) {
	log := dlog.FromCtx(ctx)
	entitlementData, owner, err := ca.spaceContract.GetChannelEntitlementsForPermission(
		ctx,
		args.spaceId,
		args.channelId,
		args.permission,
	)

	log.Debug("getChannelEntitlementsForPermissionUncached", "args", args, "entitlementData", entitlementData)
	if err != nil {
		return &entitlementCacheResult{
				allowed: false,
			}, AsRiverError(
				err,
			).Func("getChannelEntitlementsForPermission").
				Message("Failed to get channel entitlements")
	}
	return &entitlementCacheResult{allowed: true, entitlementData: entitlementData, owner: owner}, nil
}

func (ca *chainAuth) isEntitledToChannelUncached(
	ctx context.Context,
	cfg *config.Config,
	args *ChainAuthArgs,
) (CacheResult, error) {
	log := dlog.FromCtx(ctx)
	log.Debug("isEntitledToChannelUncached", "args", args)

	result, cacheHit, err := ca.entitlementManagerCache.executeUsingCache(
		ctx,
		cfg,
		args,
		ca.getChannelEntitlementsForPermissionUncached,
	)
	if err != nil {
		return nil, AsRiverError(err).Func("isEntitledToChannel").Message("Failed to get channel entitlements")
	}

	if cacheHit {
		ca.entitlementCacheHit.Inc()
	} else {
		ca.entitlementCacheMiss.Inc()
	}

	temp := (result.(*timestampedCacheValue).Result())
	entitlementData := temp.(*entitlementCacheResult) // Assuming result is of *entitlementCacheResult type

	allowed, err := ca.evaluateWithEntitlements(
		ctx,
		cfg,
		args,
		entitlementData.owner,
		entitlementData.entitlementData,
	)
	if err != nil {
		return nil, AsRiverError(err).
			Func("isEntitledToChannel").
			Message("Failed to evaluate entitlements").
			Tag("channelId", args.channelId)
	}
	return boolCacheResult(allowed), nil
}

func deserializeWallets(serialized string) []common.Address {
	addressStrings := strings.Split(serialized, ",")
	linkedWallets := make([]common.Address, len(addressStrings))
	for i, addrStr := range addressStrings {
		linkedWallets[i] = common.HexToAddress(addrStr)
	}
	return linkedWallets
}

// evaluateEntitlementData evaluates a list of entitlements and returns true if any of them are true.
// The entitlements are evaluated across all linked wallets - if any of the wallets are entitled, the user is entitled.
// Rule entitlements are evaluated by a library shared with xchain and user entitlements are evaluated in the loop.
func (ca *chainAuth) evaluateEntitlementData(
	ctx context.Context,
	entitlements []types.Entitlement,
	cfg *config.Config,
	args *ChainAuthArgs,
) (bool, error) {
	log := dlog.FromCtx(ctx).With("function", "evaluateEntitlementData")
	log.Debug("evaluateEntitlementData", "args", args)

	wallets := deserializeWallets(args.linkedWallets)
	for _, ent := range entitlements {
		if ent.EntitlementType == types.ModuleTypeRuleEntitlement {
			re := ent.RuleEntitlement
			log.Debug(ent.EntitlementType, "re", re)

			// Convert the rule data to the latest version
			reV2, err := types.ConvertV1RuleDataToV2(ctx, re)
			if err != nil {
				return false, err
			}

			result, err := ca.evaluator.EvaluateRuleData(ctx, wallets, reV2)
			if err != nil {
				return false, err
			}
			if result {
				log.Debug("rule entitlement is true", "spaceId", args.spaceId)
				return true, nil
			} else {
				log.Debug("rule entitlement is false", "spaceId", args.spaceId)
			}
		} else if ent.EntitlementType == types.ModuleTypeRuleEntitlementV2 {
			re := ent.RuleEntitlementV2
			log.Debug(ent.EntitlementType, "re", re)
			result, err := ca.evaluator.EvaluateRuleData(ctx, wallets, re)
			if err != nil {
				return false, err
			}
			if result {
				log.Debug("rule entitlement v2 is true", "spaceId", args.spaceId)
				return true, nil
			} else {
				log.Debug("rule entitlement v2 is false", "spaceId", args.spaceId)
			}

		} else if ent.EntitlementType == types.ModuleTypeUserEntitlement {
			log.Debug("UserEntitlement", "userEntitlement", ent.UserEntitlement)
			for _, user := range ent.UserEntitlement {
				if user == everyone {
					log.Debug("user entitlement: everyone is entitled to space", "spaceId", args.spaceId)
					return true, nil
				} else {
					for _, wallet := range wallets {
						if wallet == user {
							log.Debug("user entitlement: wallet is entitled to space", "spaceId", args.spaceId, "wallet", wallet)
							return true, nil
						}
					}
				}
			}
		} else {
			log.Warn("Invalid entitlement type", "entitlement", ent)
		}
	}
	return false, nil
}

// evaluateWithEntitlements evaluates a user permission considering 3 factors:
// 1. Are they the space owner? The space owner has su over all space operations.
// 2. Are they banned from the space? If so, they are not entitled to anything.
// 3. Are they entitled to the space based on the entitlement data?
func (ca *chainAuth) evaluateWithEntitlements(
	ctx context.Context,
	cfg *config.Config,
	args *ChainAuthArgs,
	owner common.Address,
	entitlements []types.Entitlement,
) (bool, error) {
	log := dlog.FromCtx(ctx)

	// 1. Check if the user is the space owner
	// Space owner has su over all space operations.
	wallets := deserializeWallets(args.linkedWallets)
	for _, wallet := range wallets {
		if wallet == owner {
			log.Debug(
				"owner is entitled to space",
				"spaceId",
				args.spaceId,
				"userId",
				wallet,
				"principal",
				args.principal,
			)
			return true, nil
		}
	}
	// 2. Check if the user has been banned
	banned, err := ca.spaceContract.IsBanned(ctx, args.spaceId, wallets)
	if err != nil {
		return false, AsRiverError(err).Func("evaluateEntitlements").
			Tag("spaceId", args.spaceId).
			Tag("userId", args.principal)
	}
	if banned {
		log.Warn(
			"Evaluating entitlements for a user who is banned from the space",
			"userId",
			args.principal,
			"spaceId",
			args.spaceId,
			"linkedWallets",
			args.linkedWallets,
		)
		return false, nil
	}

	// 3. Evaluate entitlement data to check if the user is entitled to the space.
	allowed, err := ca.evaluateEntitlementData(ctx, entitlements, cfg, args)
	if err != nil {
		return false, AsRiverError(err).Func("evaluateEntitlements")
	} else {
		return allowed, nil
	}
}

func (ca *chainAuth) isEntitledToSpaceUncached(
	ctx context.Context,
	cfg *config.Config,
	args *ChainAuthArgs,
) (CacheResult, error) {
	log := dlog.FromCtx(ctx)
	log.Debug("isEntitledToSpaceUncached", "args", args)
	result, cacheHit, err := ca.entitlementManagerCache.executeUsingCache(
		ctx,
		cfg,
		args,
		ca.getSpaceEntitlementsForPermissionUncached,
	)
	if err != nil {
		return nil, AsRiverError(err).Func("isEntitledToSpace").
			Message("Failed to get space entitlements")
	}

	if cacheHit {
		ca.entitlementCacheHit.Inc()
	} else {
		ca.entitlementCacheMiss.Inc()
	}

	temp := (result.(*timestampedCacheValue).Result())
	entitlementData := temp.(*entitlementCacheResult) // Assuming result is of *entitlementCacheResult type

	allowed, err := ca.evaluateWithEntitlements(ctx, cfg, args, entitlementData.owner, entitlementData.entitlementData)
	if err != nil {
		return nil, AsRiverError(err).
			Func("isEntitledToSpace").
			Message("Failed to evaluate entitlements")
	}
	return boolCacheResult(allowed), nil
}

func (ca *chainAuth) isEntitledToSpace(ctx context.Context, cfg *config.Config, args *ChainAuthArgs) (bool, error) {
	if args.kind != chainAuthKindSpace {
		return false, RiverError(Err_INTERNAL, "Wrong chain auth kind")
	}

	isEntitled, cacheHit, err := ca.entitlementCache.executeUsingCache(ctx, cfg, args, ca.isEntitledToSpaceUncached)
	if err != nil {
		return false, err
	}
	if cacheHit {
		ca.isEntitledToSpaceCacheHit.Inc()
	} else {
		ca.isEntitledToSpaceCacheMiss.Inc()
	}

	return isEntitled.IsAllowed(), nil
}

func (ca *chainAuth) isEntitledToChannel(ctx context.Context, cfg *config.Config, args *ChainAuthArgs) (bool, error) {
	if args.kind != chainAuthKindChannel {
		return false, RiverError(Err_INTERNAL, "Wrong chain auth kind")
	}

	isEntitled, cacheHit, err := ca.entitlementCache.executeUsingCache(ctx, cfg, args, ca.isEntitledToChannelUncached)
	if err != nil {
		return false, err
	}
	if cacheHit {
		ca.isEntitledToChannelCacheHit.Inc()
	} else {
		ca.isEntitledToChannelCacheMiss.Inc()
	}

	return isEntitled.IsAllowed(), nil
}

func (ca *chainAuth) getLinkedWalletsUncached(
	ctx context.Context,
	_ *config.Config,
	args *ChainAuthArgs,
) (CacheResult, error) {
	log := dlog.FromCtx(ctx)

	wallets, err := entitlement.GetLinkedWallets(ctx, args.principal, ca.walletLinkContract, nil, nil, nil)
	if err != nil {
		log.Error("Failed to get linked wallets", "err", err, "wallet", args.principal.Hex())
		return nil, err
	}

	return &linkedWalletCacheValue{
		wallets: wallets,
	}, nil
}

func (ca *chainAuth) getLinkedWallets(
	ctx context.Context,
	cfg *config.Config,
	args *ChainAuthArgs,
) ([]common.Address, error) {
	log := dlog.FromCtx(ctx)

	if ca.walletLinkContract == nil {
		log.Warn("Wallet link contract is not setup properly, returning root key only")
		return []common.Address{args.principal}, nil
	}

	userCacheKey := newArgsForLinkedWallets(args.principal)
	// We want fresh linked wallets when evaluating space and channel joins, key solicitations,
	// and user scrubs, all of which request the Read permission.
	// Note: space joins seem to request Read on the space, but they should probably actually
	// be sending chain auth args with kind set to chainAuthKindIsSpaceMember.
	if args.permission == PermissionRead || args.kind == chainAuthKindIsSpaceMember {
		ca.linkedWalletCache.bust(userCacheKey)
		ca.linkedWalletCacheBust.Inc()
	}

	result, cacheHit, err := ca.linkedWalletCache.executeUsingCache(
		ctx,
		cfg,
		userCacheKey,
		ca.getLinkedWalletsUncached,
	)
	if err != nil {
		log.Error("Failed to get linked wallets", "err", err, "wallet", args.principal.Hex())
		return nil, err
	}

	if cacheHit {
		ca.linkedWalletCacheHit.Inc()
	} else {
		ca.linkedWalletCacheMiss.Inc()
	}

	return result.(*timestampedCacheValue).result.(*linkedWalletCacheValue).wallets, nil
}

func (ca *chainAuth) checkMembershipUncached(
	ctx context.Context,
	_ *config.Config,
	args *ChainAuthArgs,
) (CacheResult, error) {
	isMember, err := ca.spaceContract.IsMember(ctx, args.spaceId, args.principal)
	if err != nil {
		return boolCacheResult(false), err
	}
	return boolCacheResult(isMember), nil
}

func (ca *chainAuth) checkMembership(
	ctx context.Context,
	cfg *config.Config,
	address common.Address,
	spaceId shared.StreamId,
	results chan<- bool,
	errors chan<- error,
	wg *sync.WaitGroup,
) {
	log := dlog.FromCtx(ctx)
	defer wg.Done()

	args := ChainAuthArgs{
		kind:      chainAuthKindIsSpaceMember,
		spaceId:   spaceId,
		principal: address,
	}
	result, cacheHit, err := ca.membershipCache.executeUsingCache(
		ctx,
		cfg,
		&args,
		ca.checkMembershipUncached,
	)
	if err != nil {
		// Errors here could be due to context cancellation if another wallet evaluates as a member.
		// However, these can also be informative. Anything that is not a context cancellation is
		// an actual error. However, the entitlement check may still be successful if at least one
		// linked wallet resulted in a positive membership check.
		log.Info(
			"Error checking membership (due to early termination?)",
			"err",
			err,
			"address",
			address.Hex(),
			"spaceId",
			spaceId,
		)
		errors <- err
		return
	}

	if cacheHit {
		ca.membershipCacheHit.Inc()
	} else {
		ca.membershipCacheMiss.Inc()
	}

	if result.IsAllowed() {
		results <- true
	}
	// We expect that all linked wallets except the wallet with the membership token will evaluate to
	// false here and don't bother logging false membership checks.
}

func (ca *chainAuth) checkStreamIsEnabled(
	ctx context.Context,
	cfg *config.Config,
	args *ChainAuthArgs,
) (bool, error) {
	if args.kind == chainAuthKindSpace || args.kind == chainAuthKindIsSpaceMember {
		isEnabled, err := ca.checkSpaceEnabled(ctx, cfg, args.spaceId)
		if err != nil {
			return false, err
		}
		return isEnabled, nil
	} else if args.kind == chainAuthKindChannel {
		isEnabled, err := ca.checkChannelEnabled(ctx, cfg, args.spaceId, args.channelId)
		if err != nil {
			return false, err
		}
		return isEnabled, nil
	} else {
		return false, RiverError(Err_INTERNAL, "Unknown chain auth kind").Func("checkStreamIsEnabled")
	}
}

/** checkEntitlement checks if the user is entitled to the space / channel.
 * It checks the entitlments for the root key and all the wallets linked to it in parallel.
 * If any of the wallets is entitled, the user is entitled and all inflight requests are cancelled.
 * If any of the operations fail before getting positive result, the whole operation fails.
 * A prerequisite for this function is that one of the linked wallets is a member of the space.
 */
func (ca *chainAuth) checkEntitlement(
	ctx context.Context,
	cfg *config.Config,
	args *ChainAuthArgs,
) (CacheResult, error) {
	log := dlog.FromCtx(ctx)

	ctx, cancel := context.WithTimeout(ctx, time.Millisecond*time.Duration(ca.contractCallsTimeoutMs))
	defer cancel()

	isEnabled, err := ca.checkStreamIsEnabled(ctx, cfg, args)
	if err != nil {
		return nil, err
	} else if !isEnabled {
		return boolCacheResult(false), nil
	}

	// Get all linked wallets.
	wallets, err := ca.getLinkedWallets(ctx, cfg, args)
	if err != nil {
		return nil, err
	}

	args = args.withLinkedWallets(wallets)

	isMemberCtx, isMemberCancel := context.WithCancel(ctx)
	defer isMemberCancel()

	isMemberResults := make(chan bool, len(wallets))
	isMemberError := make(chan error, len(wallets))

	var isMemberWg sync.WaitGroup

	for _, address := range wallets {
		isMemberWg.Add(1)
		go ca.checkMembership(isMemberCtx, cfg, address, args.spaceId, isMemberResults, isMemberError, &isMemberWg)
	}

	// Wait for at least one true result or all to complete
	go func() {
		isMemberWg.Wait()
		close(isMemberResults)
		close(isMemberError)
	}()

	isMember := false
	var membershipError error = nil

	// This loop will wait on at least one true result, and will exit if the channel is closed,
	// meaning all checks have terminated, or if at least one check was positive.
	for result := range isMemberResults {
		if result {
			isMember = true
			isMemberCancel() // Cancel all other goroutines
			break
		}
	}

	// Look for any returned errors. If at least one check was positive, then we ignore any subsequent
	// errors. Otherwise we will report an error result since we could not conclusively determine that
	// the user was not a space member.
	if !isMember {
		for err := range isMemberError {
			// Once we encounter a positive entitlement result, we cancel all other request, which should result
			// in context cancellation errors being returned for those checks, even though the check itself was
			// not faulty. However, a context cancellation error can also occur if a server request times out, so
			// not all cancellations can be ignored.
			// Here, we collect all errors and report them, assuming that when the isMember result is false,
			// no contexts were cancelled by us and therefore any errors that occur at all are informative.
			if err != nil {
				if membershipError != nil {
					membershipError = fmt.Errorf("%w; %w", membershipError, err)
				} else {
					membershipError = err
				}
			}
		}
		if membershipError != nil {
			membershipError = AsRiverError(membershipError, Err_CANNOT_CHECK_ENTITLEMENTS).
				Message("Error(s) evaluating user space membership").
				Func("checkEntitlement").
				Tag("principal", args.principal).
				Tag("permission", args.permission).
				Tag("wallets", args.linkedWallets).
				Tag("spaceId", args.spaceId)
			log.Error(
				"User membership could not be evaluated",
				"userId",
				args.principal,
				"spaceId",
				args.spaceId,
				"wallets",
				wallets,
				"aggregateError",
				membershipError,
			)
			return nil, membershipError
		} else {
			// It is expected that some membership checks will fail when the user is legitimately
			// not entitled, so this log statement is for debugging only.
			log.Debug(
				"User is not a member of the space",
				"userId",
				args.principal,
				"spaceId",
				args.spaceId,
				"wallets",
				wallets,
			)
			return boolCacheResult(false), nil
		}
	}

	// Now that we know the user is a member of the space, we can check entitlements.
	if len(wallets) > ca.linkedWalletsLimit {
		return nil, RiverError(Err_RESOURCE_EXHAUSTED,
			"too many wallets linked to the root key",
			"rootKey", args.principal, "wallets", len(wallets)).LogError(log)
	}

	result, err := ca.areLinkedWalletsEntitled(ctx, cfg, args)
	if err != nil {
		return nil, err
	}

	return boolCacheResult(result), nil
}
