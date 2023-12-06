package auth

import (
	. "casablanca/node/base"
	"casablanca/node/config"
	"casablanca/node/crypto"
	"casablanca/node/dlog"
	"casablanca/node/infra"
	"casablanca/node/protocol"
	"casablanca/node/shared"
	"context"
	_ "embed"
	"errors"
	"fmt"
	"sync"
	"time"

	"github.com/ethereum/go-ethereum/common"
)

type AuthorizationArgs struct {
	StreamId   string
	UserId     string
	Permission Permission
}

type AuthChecker interface {
	IsAllowed(ctx context.Context, args AuthorizationArgs, info *shared.StreamInfo) (bool, error)
}

const (
	DEFAULT_REQUEST_TIMEOUT_MS = 5000
	DEFAULT_MAX_WALLETS        = 10
)

// TODO: RiverError
var ErrSpaceDisabled = errors.New("space disabled")
var ErrChannelDisabled = errors.New("channel disabled")

var (
	isEntitledToChannelCacheHit  = infra.NewSuccessMetrics("is_entitled_to_channel_cache_hit", contractCalls)
	isEntitledToChannelCacheMiss = infra.NewSuccessMetrics("is_entitled_to_channel_cache_miss", contractCalls)
	isEntitledToSpaceCacheHit    = infra.NewSuccessMetrics("is_entitled_to_space_cache_hit", contractCalls)
	isEntitledToSpaceCacheMiss   = infra.NewSuccessMetrics("is_entitled_to_space_cache_miss", contractCalls)
	isSpaceEnabledCacheHit       = infra.NewSuccessMetrics("is_space_enabled_cache_hit", contractCalls)
	isSpaceEnabledCacheMiss      = infra.NewSuccessMetrics("is_space_enabled_cache_miss", contractCalls)
	isChannelEnabledCacheHit     = infra.NewSuccessMetrics("is_channel_enabled_cache_hit", contractCalls)
	isChannelEnabledCacheMiss    = infra.NewSuccessMetrics("is_channel_enabled_cache_miss", contractCalls)
)

type chainAuth struct {
	blockchain             *crypto.Blockchain
	spaceContract          SpaceContract
	walletLinkContract     WalletLinkContract
	linkedWalletsLimit     int
	contractCallsTimeoutMs int
	entitlementCache       *entitlementCache
}

func NewChainAuth(
	ctx context.Context,
	blockchain *crypto.Blockchain,
	townsArcitectCfg *config.ContractConfig,
	walletLinkCfg *config.ContractConfig,
	linkedWalletsLimit int,
	contractCallsTimeoutMs int,
) (*chainAuth, error) {
	spaceContract, err := NewSpaceContractV3(ctx, townsArcitectCfg, blockchain.Client)
	if err != nil {
		return nil, err
	}

	walletLinkContract, err := NewTownsWalletLink(walletLinkCfg, blockchain.Client)
	if err != nil {
		return nil, err
	}

	cache, err := newEntitlementCache(ctx, blockchain.Config)
	if err != nil {
		return nil, err
	}

	if linkedWalletsLimit <= 0 {
		linkedWalletsLimit = DEFAULT_MAX_WALLETS
	}
	if contractCallsTimeoutMs <= 0 {
		contractCallsTimeoutMs = DEFAULT_REQUEST_TIMEOUT_MS
	}

	return &chainAuth{
		blockchain:             blockchain,
		spaceContract:          spaceContract,
		walletLinkContract:     walletLinkContract,
		linkedWalletsLimit:     linkedWalletsLimit,
		contractCallsTimeoutMs: contractCallsTimeoutMs,
		entitlementCache:       cache,
	}, nil
}

func (ca *chainAuth) IsAllowed(ctx context.Context, args AuthorizationArgs, streamInfo *shared.StreamInfo) (bool, error) {
	log := dlog.CtxLog(ctx)

	userIdentifier := CreateUserIdentifier(args.UserId)

	result, err := ca.entitlementCache.executeUsingCache(args, func() (bool, error) {
		return ca.checkEntitiement(ctx, userIdentifier.AccountAddress, args.Permission, streamInfo)
	})
	if err != nil {
		log.Error("error checking user entitlement", "error", err)
		return false, WrapRiverError(protocol.Err_CANNOT_CHECK_ENTITLEMENTS, err)
	}
	return result, nil
}

func (ca *chainAuth) isWalletAllowed(ctx context.Context, wallet common.Address, permission Permission, streamInfo *shared.StreamInfo) (bool, error) {
	// Check if user is entitled to space / channel.
	switch streamInfo.StreamType {
	case shared.Space:
		return ca.isEntitledToSpace(streamInfo, wallet, permission)
	case shared.Channel:
		return ca.isEntitledToChannel(streamInfo, wallet, permission)
	case shared.DMChannel:
		fallthrough
	case shared.GDMChannel:
		fallthrough
	case shared.User:
		fallthrough
	case shared.UserSettings:
		fallthrough
	case shared.Unknown:
		fallthrough
	case shared.InvalidStreamType:
		fallthrough
	default:
		return false, fmt.Errorf("unhandled stream type: %s", streamInfo.StreamType)
	}
}

func (ca *chainAuth) isEntitledToSpace(streamInfo *shared.StreamInfo, user common.Address, permission Permission) (bool, error) {
	disabledCacheHit := true
	// Intentionally use a const for the permission and userid here, as we want to check if the space is enabled, not if the user is entitled to it.
	isEnabled, err := ca.entitlementCache.executeUsingCache(AuthorizationArgs{UserId: "all", StreamId: streamInfo.SpaceId, Permission: 0}, func() (bool, error) {
		// This is awkward as we want enabled to be cached for 15 minutes, but the API returns the inverse
		disabledCacheHit = false
		isDisabled, err := ca.spaceContract.IsSpaceDisabled(streamInfo.SpaceId)
		return !isDisabled, err

	})
	if err != nil {
		return false, err
	}

	if disabledCacheHit {
		isSpaceEnabledCacheHit.PassInc()
	} else {
		isSpaceEnabledCacheMiss.PassInc()
	}

	if !isEnabled {
		return false, ErrSpaceDisabled
	}

	cacheHit := true
	isEntitled, err := ca.entitlementCache.executeUsingCache(AuthorizationArgs{UserId: user.String(), StreamId: streamInfo.ChannelId, Permission: permission}, func() (bool, error) {
		// space entitlement check.
		cacheHit = false
		return ca.spaceContract.IsEntitledToSpace(
			streamInfo.SpaceId,
			user,
			permission,
		)
	})
	if err != nil {
		return false, err
	}

	if cacheHit {
		isEntitledToSpaceCacheHit.PassInc()
	} else {
		isEntitledToSpaceCacheMiss.PassInc()
	}
	return isEntitled, nil
}

func (ca *chainAuth) isEntitledToChannel(streamInfo *shared.StreamInfo, user common.Address, permission Permission) (bool, error) {
	disabledCacheHit := true

	// Intentionally use a const for th
	isEnabled, err := ca.entitlementCache.executeUsingCache(AuthorizationArgs{UserId: "all", StreamId: streamInfo.SpaceId, Permission: 0}, func() (bool, error) {
		disabledCacheHit = false
		// This is awkward as we want enabled to be cached for 15 minutes, but the API returns the inverse
		isDisabled, err := ca.spaceContract.IsChannelDisabled(streamInfo.SpaceId, streamInfo.ChannelId)
		return !isDisabled, err
	})

	if err != nil {
		return false, err
	}

	if disabledCacheHit {
		isChannelEnabledCacheHit.PassInc()
	} else {
		isChannelEnabledCacheMiss.PassInc()
	}

	if !isEnabled {
		return false, ErrSpaceDisabled
	}

	cacheHit := true
	isEntitled, err := ca.entitlementCache.executeUsingCache(AuthorizationArgs{UserId: user.String(), StreamId: streamInfo.ChannelId, Permission: permission}, func() (bool, error) {
		// channel entitlement check.
		cacheHit = false
		return ca.spaceContract.IsEntitledToChannel(
			streamInfo.SpaceId,
			streamInfo.ChannelId,
			user,
			permission,
		)
	})
	if err != nil {
		return false, err
	}

	if cacheHit {
		isEntitledToChannelCacheHit.PassInc()
	} else {
		isEntitledToChannelCacheMiss.PassInc()
	}
	return isEntitled, nil
}

type EntitlementCheckResult struct {
	Allowed bool
	Err     error
}

func (ca *chainAuth) getLinkedWallets(ctx context.Context, rootKey common.Address) ([]common.Address, error) {
	log := dlog.CtxLog(ctx)

	if ca.walletLinkContract == nil {
		log.Warn("Wallet link contract is not setup properly, returning root key only")
		return []common.Address{rootKey}, nil
	}

	// get all the wallets for the root key.
	wallets, err := ca.walletLinkContract.GetWalletsByRootKey(rootKey)
	if err != nil {
		log.Error("error getting all wallets", "rootKey", rootKey.Hex(), "error", err)
		return nil, err
	}

	log.Debug("allRelevantWallets", "wallets", wallets)

	return wallets, nil
}

/** checkEntitiement checks if the user is entitled to the space / channel.
 * It checks the entitlments for the root key and all the wallets linked to it in parallel.
 * If any of the wallets is entitled, the user is entitled and all inflight requests are cancelled.
 * If any of the operations fail before getting positive result, the whole operation fails.
 */
func (ca *chainAuth) checkEntitiement(ctx context.Context, rootKey common.Address, permission Permission, streamInfo *shared.StreamInfo) (bool, error) {
	log := dlog.CtxLog(ctx)

	ctx, cancel := context.WithTimeout(ctx, time.Millisecond*time.Duration(ca.contractCallsTimeoutMs))
	defer cancel()

	// We need to check the root key and all linked wallets.
	resultsChan := make(chan EntitlementCheckResult, ca.linkedWalletsLimit+1)
	var wg sync.WaitGroup

	// Get linked wallets and check them in parallel.
	wg.Add(1)
	go func() {
		// defer here is essential since we are (mis)using WaitGroup here.
		// It is ok to increment the WaitGroup once it is being waited on as long as the counter is not zero
		// (see https://pkg.go.dev/sync#WaitGroup)
		// We are adding new goroutines to the WaitGroup in the loop below, so we need to make sure that the counter is always > 0.
		defer wg.Done()
		wallets, err := ca.getLinkedWallets(ctx, rootKey)
		if err != nil {
			log.Error("error getting all wallets", "rootKey", rootKey.Hex(), "error", err)
			resultsChan <- EntitlementCheckResult{Allowed: false, Err: err}
			return
		}
		if len(wallets) > ca.linkedWalletsLimit {
			log.Error("too many wallets linked to the root key", "rootKey", rootKey.Hex(), "wallets", len(wallets))
			resultsChan <- EntitlementCheckResult{Allowed: false, Err: fmt.Errorf("too many wallets linked to the root key: %d", len(wallets)-1)}
			return
		}
		// Check all wallets in parallel.
		for _, wallet := range wallets {
			wg.Add(1)
			go func(address common.Address) {
				defer wg.Done()
				result, err := ca.isWalletAllowed(ctx, address, permission, streamInfo)
				resultsChan <- EntitlementCheckResult{Allowed: result, Err: err}
			}(wallet)
		}
	}()

	// Check root key in parallel.
	wg.Add(1)
	go func() {
		defer wg.Done()
		result, err := ca.isWalletAllowed(ctx, rootKey, permission, streamInfo)
		resultsChan <- EntitlementCheckResult{Allowed: result, Err: err}
	}()

	go func() {
		wg.Wait()
		close(resultsChan)
	}()

	for opResult := range resultsChan {
		if opResult.Err != nil {
			// we don't check for context cancellation error here because
			// * if it is a timeout it has to propagate
			// * the explicit cancel happens only here, so it is not possible.

			// Cancel all inflight requests.
			cancel()
			// Any error is a failure.
			return false, opResult.Err
		}
		if opResult.Allowed {
			// We have the result we need, cancel all inflight requests.
			cancel()

			return true, nil
		}
	}
	return false, nil
}
