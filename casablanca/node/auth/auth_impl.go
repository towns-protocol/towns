package auth

import (
	"casablanca/node/common"
	"casablanca/node/config"
	"casablanca/node/dlog"
	"context"
	_ "embed"
	"errors"
	"fmt"

	eth "github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/ethclient"
	"golang.org/x/exp/slog"
)

type AuthorizationArgs struct {
	RoomId     string
	UserId     string
	Permission Permission
}

type TownsContract interface {
	IsAllowed(ctx context.Context, args AuthorizationArgs, info *common.RoomInfo) (bool, error)
	GetUserId(ctx context.Context, townsKey string) (string, error)
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
	default:
		slog.Error("Bad chain id", "id", za.chainId)
		return nil, fmt.Errorf("unsupported chain id: %d", za.chainId)
	}
	slog.Info("Successfully initialised %s for chain id: %d", cfg.NetworkUrl, za.chainId)
	// no errors.
	return za, nil
}

func (za *TownsPassThrough) IsAllowed(ctx context.Context, args AuthorizationArgs, info *common.RoomInfo) (bool, error) {
	return true, nil
}

func (za *TownsPassThrough) GetUserId(ctx context.Context, townsKey string) (string, error) {
	// In passthrough towns key is the user id.
	return townsKey, nil
}

func (za *ChainAuth) IsAllowed(ctx context.Context, args AuthorizationArgs, roomInfo *common.RoomInfo) (bool, error) {
	log := dlog.CtxLog(ctx)

	userIdentifier := CreateUserIdentifier(args.UserId)
	log.Debug("IsAllowed", "args", args, "user", userIdentifier, "roomInfo", roomInfo)

	// Check if user is entitled to space / channel.
	switch roomInfo.RoomType {
	case common.Space:
		isEntitled, err := za.isEntitledToSpace(roomInfo, userIdentifier.AccountAddress, args.Permission)
		log.Debug("IsAllowed result", "isEntitledToSpace", isEntitled, "err", err)
		return isEntitled, err
	case common.Channel:
		isEntitled, err := za.isEntitledToChannel(roomInfo, userIdentifier.AccountAddress, args.Permission)
		log.Debug("IsAllowed result", "isEntitledToChannel", isEntitled, "err", err)
		return isEntitled, err
	case common.User:
		fallthrough
	case common.UserSettings:
		fallthrough
	case common.Unknown:
		fallthrough
	case common.InvalidRoomType:
		fallthrough
	default:
		return false, fmt.Errorf("unhandled room type: %s", roomInfo.RoomType)
	}
}

func (za *ChainAuth) GetUserId(ctx context.Context, townsKey string) (string, error) {
	// TODO: implement this.
	return townsKey, nil
}

func (za *ChainAuth) isEntitledToSpace(roomInfo *common.RoomInfo, user eth.Address, permission Permission) (bool, error) {
	// space disabled check.
	isDisabled, err := za.spaceContract.IsSpaceDisabled(roomInfo.SpaceId)
	if err != nil {
		return false, err
	} else if isDisabled {
		return false, ErrSpaceDisabled
	}

	// space entitlement check.
	isEntitled, err := za.spaceContract.IsEntitledToSpace(
		roomInfo.SpaceId,
		user,
		permission,
	)
	return isEntitled, err
}

func (za *ChainAuth) isEntitledToChannel(roomInfo *common.RoomInfo, user eth.Address, permission Permission) (bool, error) {
	// channel disabled check.
	isDisabled, err := za.spaceContract.IsChannelDisabled(roomInfo.SpaceId, roomInfo.ChannelId)
	if err != nil {
		return false, err
	} else if isDisabled {
		return false, ErrSpaceDisabled
	}

	// channel entitlement check.
	isEntitled, err := za.spaceContract.IsEntitledToChannel(
		roomInfo.SpaceId,
		roomInfo.ChannelId,
		user,
		permission,
	)
	return isEntitled, err
}
