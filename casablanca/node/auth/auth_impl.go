package auth

import (
	"casablanca/node/common"
	"casablanca/node/config"
	"context"
	_ "embed"
	"errors"
	"fmt"

	eth "github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/ethclient"

	log "github.com/sirupsen/logrus"
)

type AuthorizationArgs struct {
	RoomId     string
	UserId     string
	Permission Permission
}

type Authorization interface {
	IsAllowed(ctx context.Context, args AuthorizationArgs, info *common.RoomInfo) (bool, error)
}

var ErrSpaceDisabled = errors.New("space disabled")
var ErrChannelDisabled = errors.New("channel disabled")

// PassthroughAuth is an authorization implementation that allows all requests.
type PassthroughAuth struct{}
type ChainAuth struct {
	chainId       int
	ethClient     *ethclient.Client
	spaceContract SpaceContract
}

func NewPassthroughAuth() Authorization {
	return &PassthroughAuth{}
}

func NewChainAuth(cfg *config.ChainConfig) (Authorization, error) {
	// create the authorization states
	chainId := cfg.ChainId
	// initialise the eth client.
	if cfg.NetworkUrl == "" {
		log.Errorf("No blockchain network url specified in config\n")
		return nil, nil
	}
	ethClient, err := GetEthClient(cfg.NetworkUrl)
	if err != nil {
		log.Errorf("Cannot connect to eth client %v\n", cfg.NetworkUrl)
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
			log.Errorf("error instantiating SpaceContractLocalhost. Error: %v", err)
			return nil, err
		}
		za.spaceContract = localhost
	default:
		errMsg := fmt.Sprintf("unsupported chain id: %d", za.chainId)
		log.Error(errMsg)
		return nil, errors.New(errMsg)
	}
	log.Infof("Successfully initialised %s for chain id: %d", cfg.NetworkUrl, za.chainId)
	// no errors.
	return za, nil
}

func (za *PassthroughAuth) IsAllowed(ctx context.Context, args AuthorizationArgs, info *common.RoomInfo) (bool, error) {
	return true, nil
}

func (za *ChainAuth) IsAllowed(ctx context.Context, args AuthorizationArgs, roomInfo *common.RoomInfo) (bool, error) {
	userIdentifier := CreateUserIdentifier(args.UserId)
	log.Debugf("IsAllowed: %v %v", args, userIdentifier)

	log.Debugf("roomInfo: %v", roomInfo)
	// Check if user is entitled to space / channel.
	switch roomInfo.RoomType {
	case common.Space:
		isEntitled, err := za.isEntitledToSpace(roomInfo, userIdentifier.AccountAddress, args.Permission)
		log.Debugf("isEntitled: %v %v", isEntitled, err)
		return isEntitled, err
	case common.Channel:
		isEntitled, err := za.isEntitledToChannel(roomInfo, userIdentifier.AccountAddress, args.Permission)
		log.Debugf("isEntitled: %v %v", isEntitled, err)
		return isEntitled, err
	case common.User:
		fallthrough
	case common.UserSettings:
		fallthrough
	case common.Unknown:
		fallthrough
	default:
		errMsg := fmt.Sprintf("unhandled room type: %s", roomInfo.RoomType)
		log.Error("IsAllowed", errMsg)
		return false, errors.New(errMsg)
	}
}

func (za *ChainAuth) isEntitledToSpace(roomInfo *common.RoomInfo, user eth.Address, permission Permission) (bool, error) {
	// space disabled check.
	log.Infof("Checking if space is disabled: %v %v %v", roomInfo, user, permission)
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
	log.Infof("Checking if channel is disabled: %v %v %v", roomInfo, user, permission)
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
