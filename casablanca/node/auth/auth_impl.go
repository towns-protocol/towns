package auth

import (
	. "casablanca/node/base"
	"casablanca/node/common"
	"casablanca/node/config"
	"casablanca/node/dlog"
	"casablanca/node/protocol"
	"casablanca/node/utils"
	"context"
	_ "embed"
	"errors"
	"fmt"
	"sync"

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

var ErrSpaceDisabled = errors.New("space disabled")
var ErrChannelDisabled = errors.New("channel disabled")

// TownsPassThrough is an authorization implementation that allows all requests.
type TownsPassThrough struct{}
type ChainAuth struct {
	chainId            int
	ethClient          *ethclient.Client
	spaceContract      SpaceContract
	walletLinkContract WalletLinkContract
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
	log.Debug("IsAllowed", "args", args, "user", userIdentifier.AccountAddress.Hex(), "streamInfo", streamInfo)

	result, err := za.checkEntitiement(ctx, userIdentifier.AccountAddress, args.Permission, streamInfo)
	if err != nil {
		log.Error("error checking user entitlement", "error", err)
		return false, WrapRiverError(protocol.Err_CANNOT_CHECK_ENTITLEMENTS, err)
	}
	return result, nil
}

func (za *ChainAuth) isWalletAllowed(ctx context.Context, wallet eth.Address, permission Permission, streamInfo *common.StreamInfo) (bool, error) {
	log := dlog.CtxLog(ctx)

	// Check if user is entitled to space / channel.
	switch streamInfo.StreamType {
	case common.Space:
		isEntitled, err := za.isEntitledToSpace(streamInfo, wallet, permission)
		log.Debug("IsAllowed result", "isEntitledToSpace", isEntitled, "err", err)
		return isEntitled, err
	case common.Channel:
		isEntitled, err := za.isEntitledToChannel(ctx, streamInfo, wallet, permission)
		log.Debug("IsAllowed result", "isEntitledToChannel", isEntitled, "err", err)
		return isEntitled, err
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
	// space disabled check.
	isDisabled, err := za.spaceContract.IsSpaceDisabled(streamInfo.SpaceId)
	if err != nil {
		return false, err
	} else if isDisabled {
		return false, ErrSpaceDisabled
	}

	// space entitlement check.
	isEntitled, err := za.spaceContract.IsEntitledToSpace(
		streamInfo.SpaceId,
		user,
		permission,
	)
	return isEntitled, err
}

func (za *ChainAuth) isEntitledToChannel(ctx context.Context, streamInfo *common.StreamInfo, user eth.Address, permission Permission) (bool, error) {
	// channel disabled check.
	isDisabled, err := za.spaceContract.IsChannelDisabled(streamInfo.SpaceId, streamInfo.ChannelId)
	if err != nil {
		return false, err
	} else if isDisabled {
		return false, ErrSpaceDisabled
	}

	// channel entitlement check.
	isEntitled, err := za.spaceContract.IsEntitledToChannel(
		streamInfo.SpaceId,
		streamInfo.ChannelId,
		user,
		permission,
	)
	return isEntitled, err
}

type EntitlementCheckResult struct {
	Allowed bool
	Err     error
}

func (za *ChainAuth) allRelevantWallets(ctx context.Context, rootKey eth.Address) ([]eth.Address, error) {
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

	wallets = append(wallets, rootKey)

	log.Debug("allRelevantWallets", "wallets", wallets)
	return wallets, nil
}

/** checkEntitiement checks if the user is entitled to the space / channel.
 * It checks the entitlments for the root key and all the wallets linked to it in parallel.
 * If any of the wallets is entitled, the user is entitled.
 * If any of the operations fail before getting positive result, the whole operation fails.
 */
func (za *ChainAuth) checkEntitiement(ctx context.Context, rootKey eth.Address, permission Permission, streamInfo *common.StreamInfo) (bool, error) {
	log := dlog.CtxLog(ctx)

	ctx, cancel := context.WithCancel(ctx)
	defer cancel()

	resultsChan := make(chan EntitlementCheckResult)
	var wg sync.WaitGroup

	wg.Add(1)
	go func() {
		defer wg.Done()
		wallets, err := za.allRelevantWallets(ctx, rootKey)
		if err != nil {
			log.Error("error getting all wallets", "rootKey", rootKey.Hex(), "error", err)
			resultsChan <- EntitlementCheckResult{Allowed: false, Err: err}
			return
		}
		for _, wallet := range wallets {
			wg.Add(1)
			go func(address eth.Address) {
				defer wg.Done()
				result, err := za.isWalletAllowed(ctx, address, permission, streamInfo)
				resultsChan <- EntitlementCheckResult{Allowed: result, Err: err}
			}(wallet)
		}
	}()

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
			cancel()
			return false, opResult.Err
		}
		if opResult.Allowed {
			cancel()
			return true, nil
		}
	}
	return false, nil
}
