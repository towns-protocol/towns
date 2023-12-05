package auth

import (
	. "casablanca/node/base"
	"casablanca/node/common"
	"casablanca/node/config"
	"casablanca/node/dlog"
	"casablanca/node/infra"
	"casablanca/node/protocol"
	"casablanca/node/utils"
	"context"
	_ "embed"
	"errors"
	"fmt"
	"sync"
	"time"

	eth "github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/ethclient"
)

type AuthorizationArgs struct {
	StreamId   string
	UserId     string
	Permission Permission
}

type TownsContract interface {
	IsAllowed(ctx context.Context, args AuthorizationArgs, info *common.StreamInfo) (bool, error)
}

const (
	DEFAULT_REQUEST_TIMEOUT_MS = 5000
	DEFAULT_MAX_WALLETS        = 10
)

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

// TownsPassThrough is an authorization implementation that allows all requests.
type TownsPassThrough struct{}

type ChainAuth struct {
	chainId                int
	ethClient              *ethclient.Client
	spaceContract          SpaceContract
	walletLinkContract     WalletLinkContract
	linkedWalletsLimit     int
	contractCallsTimeoutMs int
	entitlementCache       *entitlementCache
}

func NewTownsPassThrough() TownsContract {
	return &TownsPassThrough{}
}

func NewTownsContract(ctx context.Context, cfg *config.ChainConfig) (TownsContract, error) {
	log := dlog.CtxLog(ctx)

	chainId := cfg.ChainId
	// initialise the eth client.
	if cfg.NetworkUrl == "" {
		log.Error("No blockchain network url specified in config")
		return nil, RiverError(protocol.Err_BAD_CONFIG, "no blockchain network url specified in config")
	}
	ethClient, err := utils.GetEthClient(cfg.NetworkUrl)
	if err != nil {
		log.Error("Cannot connect to eth client", "url", cfg.NetworkUrl, "error", err)
		return nil, WrapRiverError(protocol.Err_CANNOT_CONNECT, err)
	}

	za := &ChainAuth{
		chainId:   chainId,
		ethClient: ethClient,
	}

	za.entitlementCache, err = newEntitlementCache(ctx, cfg)
	if err != nil {

		return nil, WrapRiverError(protocol.Err_CANNOT_CONNECT, err)
	}

	space_contract, err := NewSpaceContractV3(ctx, ethClient, chainId)
	if err != nil {
		log.Error("error fetching SpaceContractV3", "error", err)
		return nil, WrapRiverError(protocol.Err_CANNOT_CONNECT, err)
	}
	za.spaceContract = space_contract

	// initialise the wallet link contract.
	walletLinkContract, err := NewTownsWalletLink(za.ethClient, za.chainId)
	if err != nil {
		log.Error("error instantiating WalletLinkLocalhost", "error", err)
		return nil, WrapRiverError(protocol.Err_BAD_CONTRACT, err)
	}
	za.walletLinkContract = walletLinkContract

	if cfg.LinkedWalletsLimit > 0 {
		za.linkedWalletsLimit = cfg.LinkedWalletsLimit
	} else {
		za.linkedWalletsLimit = DEFAULT_MAX_WALLETS
	}

	if cfg.ContractCallsTimeoutMs > 0 {
		za.contractCallsTimeoutMs = cfg.ContractCallsTimeoutMs
	} else {
		za.contractCallsTimeoutMs = DEFAULT_REQUEST_TIMEOUT_MS
	}

	log.Info("Successfully initialised", "network", cfg.NetworkUrl, "id", za.chainId)

	// no errors.
	return za, nil
}

func (za *TownsPassThrough) IsAllowed(ctx context.Context, args AuthorizationArgs, info *common.StreamInfo) (bool, error) {
	return true, nil
}

func (za *ChainAuth) IsAllowed(ctx context.Context, args AuthorizationArgs, streamInfo *common.StreamInfo) (bool, error) {
	log := dlog.CtxLog(ctx)

	userIdentifier := CreateUserIdentifier(args.UserId)

	result, err := za.entitlementCache.executeUsingCache(args, func() (bool, error) {
		return za.checkEntitiement(ctx, userIdentifier.AccountAddress, args.Permission, streamInfo)
	})
	if err != nil {
		log.Error("error checking user entitlement", "error", err)
		return false, WrapRiverError(protocol.Err_CANNOT_CHECK_ENTITLEMENTS, err)
	}
	return result, nil
}

func (za *ChainAuth) isWalletAllowed(ctx context.Context, wallet eth.Address, permission Permission, streamInfo *common.StreamInfo) (bool, error) {
	// Check if user is entitled to space / channel.
	switch streamInfo.StreamType {
	case common.Space:
		return za.isEntitledToSpace(streamInfo, wallet, permission)
	case common.Channel:
		return za.isEntitledToChannel(streamInfo, wallet, permission)
	case common.DMChannel:
		fallthrough
	case common.GDMChannel:
		fallthrough
	case common.User:
		fallthrough
	case common.UserSettings:
		fallthrough
	case common.Unknown:
		fallthrough
	case common.InvalidStreamType:
		fallthrough
	default:
		return false, fmt.Errorf("unhandled stream type: %s", streamInfo.StreamType)
	}
}

func (za *ChainAuth) isEntitledToSpace(streamInfo *common.StreamInfo, user eth.Address, permission Permission) (bool, error) {
	disabledCacheHit := true
	// Intentionally use a const for the permission and userid here, as we want to check if the space is enabled, not if the user is entitled to it.
	isEnabled, err := za.entitlementCache.executeUsingCache(AuthorizationArgs{UserId: "all", StreamId: streamInfo.SpaceId, Permission: 0}, func() (bool, error) {
		// This is awkward as we want enabled to be cached for 15 minutes, but the API returns the inverse
		disabledCacheHit = false
		isDisabled, err := za.spaceContract.IsSpaceDisabled(streamInfo.SpaceId)
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
	isEntitled, err := za.entitlementCache.executeUsingCache(AuthorizationArgs{UserId: user.String(), StreamId: streamInfo.ChannelId, Permission: permission}, func() (bool, error) {
		// space entitlement check.
		cacheHit = false
		return za.spaceContract.IsEntitledToSpace(
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

func (za *ChainAuth) isEntitledToChannel(streamInfo *common.StreamInfo, user eth.Address, permission Permission) (bool, error) {
	disabledCacheHit := true

	// Intentionally use a const for th
	isEnabled, err := za.entitlementCache.executeUsingCache(AuthorizationArgs{UserId: "all", StreamId: streamInfo.SpaceId, Permission: 0}, func() (bool, error) {
		disabledCacheHit = false
		// This is awkward as we want enabled to be cached for 15 minutes, but the API returns the inverse
		isDisabled, err := za.spaceContract.IsChannelDisabled(streamInfo.SpaceId, streamInfo.ChannelId)
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
	isEntitled, err := za.entitlementCache.executeUsingCache(AuthorizationArgs{UserId: user.String(), StreamId: streamInfo.ChannelId, Permission: permission}, func() (bool, error) {
		// channel entitlement check.
		cacheHit = false
		return za.spaceContract.IsEntitledToChannel(
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

func (za *ChainAuth) getLinkedWallets(ctx context.Context, rootKey eth.Address) ([]eth.Address, error) {
	log := dlog.CtxLog(ctx)

	if za.walletLinkContract == nil {
		log.Warn("Wallet link contract is not setup properly, returning root key only")
		return []eth.Address{rootKey}, nil
	}

	// get all the wallets for the root key.
	wallets, err := za.walletLinkContract.GetWalletsByRootKey(rootKey)
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
func (za *ChainAuth) checkEntitiement(ctx context.Context, rootKey eth.Address, permission Permission, streamInfo *common.StreamInfo) (bool, error) {
	log := dlog.CtxLog(ctx)

	ctx, cancel := context.WithTimeout(ctx, time.Millisecond*time.Duration(za.contractCallsTimeoutMs))
	defer cancel()

	// We need to check the root key and all linked wallets.
	resultsChan := make(chan EntitlementCheckResult, za.linkedWalletsLimit+1)
	var wg sync.WaitGroup

	// Get linked wallets and check them in parallel.
	wg.Add(1)
	go func() {
		// defer here is essential since we are (mis)using WaitGroup here.
		// It is ok to increment the WaitGroup once it is being waited on as long as the counter is not zero
		// (see https://pkg.go.dev/sync#WaitGroup)
		// We are adding new goroutines to the WaitGroup in the loop below, so we need to make sure that the counter is always > 0.
		defer wg.Done()
		wallets, err := za.getLinkedWallets(ctx, rootKey)
		if err != nil {
			log.Error("error getting all wallets", "rootKey", rootKey.Hex(), "error", err)
			resultsChan <- EntitlementCheckResult{Allowed: false, Err: err}
			return
		}
		if len(wallets) > za.linkedWalletsLimit {
			log.Error("too many wallets linked to the root key", "rootKey", rootKey.Hex(), "wallets", len(wallets))
			resultsChan <- EntitlementCheckResult{Allowed: false, Err: fmt.Errorf("too many wallets linked to the root key: %d", len(wallets)-1)}
			return
		}
		// Check all wallets in parallel.
		for _, wallet := range wallets {
			wg.Add(1)
			go func(address eth.Address) {
				defer wg.Done()
				result, err := za.isWalletAllowed(ctx, address, permission, streamInfo)
				resultsChan <- EntitlementCheckResult{Allowed: result, Err: err}
			}(wallet)
		}
	}()

	// Check root key in parallel.
	wg.Add(1)
	go func() {
		defer wg.Done()
		result, err := za.isWalletAllowed(ctx, rootKey, permission, streamInfo)
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
