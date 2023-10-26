package auth

import (
	"casablanca/node/common"
	"casablanca/node/config"
	"casablanca/node/dlog"
	"context"
	_ "embed"
	"errors"
	"fmt"

	"golang.org/x/exp/slog"

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
	chainId       int
	ethClient     *ethclient.Client
	spaceContract SpaceContract
}

func NewTownsPassThrough() TownsContract {
	return &TownsPassThrough{}
}

func NewTownsContract(cfg *config.ChainConfig) (TownsContract, error) {
	chainId := cfg.ChainId
	// initialise the eth client.
	if cfg.NetworkUrl == "" {
		slog.Error("No blockchain network url specified in config")
		return nil, fmt.Errorf("no blockchain network url specified in config")
	}
	ethClient, err := GetEthClient(cfg.NetworkUrl)
	if err != nil {
		slog.Error("Cannot connect to eth client", "url", cfg.NetworkUrl, "error", err)
		return nil, err
	}

	za := &ChainAuth{
		chainId:   chainId,
		ethClient: ethClient,
	}
	switch za.chainId {
	case 1337, 31337:
		localhost, err := NewSpaceContractLocalhost(za.ethClient)
		if err != nil {
			slog.Error("error instantiating SpaceContractLocalhost", "error", err)
			return nil, err
		}
		za.spaceContract = localhost

	case 5:
		goerli, err := NewSpaceContractGoerli(za.ethClient)
		if err != nil {
			slog.Error("error instantiating SpaceContractGoerli", "error", err)
			return nil, err
		}
		za.spaceContract = goerli

	case 11155111:
		sepolia, err := NewSpaceContractSepolia(za.ethClient)
		if err != nil {
			slog.Error("error instantiating SpaceContractSepolia", "error", err)
			return nil, err
		}
		za.spaceContract = sepolia
	case 84531:
		baseGoerli, err := NewSpaceContractBaseGoerli(za.ethClient)
		if err != nil {
			slog.Error("error instantiating SpaceContractBaseGoerli", "error", err)
			return nil, err
		}
		za.spaceContract = baseGoerli
	default:
		slog.Error("Bad chain id", "id", za.chainId)
		return nil, fmt.Errorf("unsupported chain id: %d", za.chainId)
	}
	slog.Info("Successfully initialised", "network", cfg.NetworkUrl, "id", za.chainId)
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

	// Check if user is entitled to space / channel.
	switch streamInfo.StreamType {
	case common.Space:
		isEntitled, err := za.isEntitledToSpace(streamInfo, userIdentifier.AccountAddress, args.Permission)
		log.Debug("IsAllowed result", "isEntitledToSpace", isEntitled, "err", err)
		return isEntitled, err
	case common.Channel:
		isEntitled, err := za.isEntitledToChannel(streamInfo, userIdentifier.AccountAddress, args.Permission)
		log.Debug("IsAllowed result", "isEntitledToChannel", isEntitled, "err", err)
		return isEntitled, err
	case common.DMChannel:
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

func (za *ChainAuth) isEntitledToChannel(streamInfo *common.StreamInfo, user eth.Address, permission Permission) (bool, error) {
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
