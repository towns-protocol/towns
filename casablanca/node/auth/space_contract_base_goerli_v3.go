package auth

import (
	"casablanca/node/auth/contracts/base_goerli_towns_architect"
	"casablanca/node/auth/contracts/base_goerli_towns_channels"
	"casablanca/node/auth/contracts/base_goerli_towns_entitlements"
	"casablanca/node/auth/contracts/base_goerli_towns_pausable"
	"casablanca/node/dlog"
	"context"
	"sync"

	"golang.org/x/exp/slog"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/ethclient"
)

type TownBaseGoerli struct {
	address      common.Address
	entitlements *base_goerli_towns_entitlements.BaseGoerliTownsEntitlements
	pausable     *base_goerli_towns_pausable.BaseGoerliTownsPausable
	channels     map[string]*base_goerli_towns_channels.BaseGoerliTownsChannels
	channelsLock sync.Mutex
}

type SpaceContractBaseGoerliV3 struct {
	ethClient      *ethclient.Client
	townsArchitect *base_goerli_towns_architect.BaseGoerliTownsArchitect
	// map of networkId to the town
	towns     map[string]*TownBaseGoerli
	townsLock sync.Mutex
}

func NewSpaceContractBaseGoerliV3(ethClient *ethclient.Client) (SpaceContract, error) {
	log := dlog.CtxLog(context.Background())

	// get the space factory address from config
	strAddress, err := loadContractAddress(84531)
	if err != nil {
		slog.Error("error parsing base goerli contract address", "address", strAddress, "error", err)
		return nil, err
	}
	address := common.HexToAddress(strAddress)
	townsArchitect, err := base_goerli_towns_architect.NewBaseGoerliTownsArchitect(address, ethClient)
	if err != nil {
		slog.Error("error fetching base goerli TownArchitect contract with address", "address", strAddress, "error", err)
		return nil, err
	}

	log.Info("successfully fetched base goerli TownArchitect contract with address", "address", strAddress)

	// no errors.
	spaceContract := &SpaceContractBaseGoerliV3{
		ethClient:      ethClient,
		townsArchitect: townsArchitect,
		towns:          make(map[string]*TownBaseGoerli),
		townsLock:      sync.Mutex{},
	}

	return spaceContract, nil
}

func (za *SpaceContractBaseGoerliV3) IsEntitledToSpace(
	spaceNetworkId string,
	user common.Address,
	permission Permission,
) (bool, error) {
	// get the town entitlements and check if user is entitled.
	town, err := za.getTown(spaceNetworkId)
	if err != nil || town == nil {
		return false, err
	}
	isEntitled, err := town.entitlements.IsEntitledToTown(
		nil,
		user,
		permission.String(),
	)
	return isEntitled, err
}

func (za *SpaceContractBaseGoerliV3) IsEntitledToChannel(
	spaceNetworkId string,
	channelNetworkId string,
	user common.Address,
	permission Permission,
) (bool, error) {
	log := dlog.CtxLog(context.Background())

	// get the town entitlements and check if user is entitled to the channel
	town, err := za.getTown(spaceNetworkId)
	log.Info("SpaceContractBaseGoerliV3::IsEntitledToChannel", "town", town.address, "err", err, "spaceNetworkId", spaceNetworkId, "channelNetworkId", channelNetworkId)
	if err != nil || town == nil {
		log.Error("IsEntitledToChannel za.getTown", "za", za, "err", err, "town", town, "spaceNetworkId", spaceNetworkId)
		return false, err
	}
	// channel entitlement check
	isEntitled, err := town.entitlements.IsEntitledToChannel(
		nil,
		channelNetworkId,
		user,
		permission.String(),
	)
	if err != nil {
		log.Error("IsEntitledToChannel town.entitlements.IsEntitledToChannel", "town.entitlements", town.entitlements, "err", err, "isEntitled", isEntitled, "permission", permission.String(), "channelNetworkId", channelNetworkId, "user", user.Hex())
		return false, err
	}
	return isEntitled, err
}

func (za *SpaceContractBaseGoerliV3) IsSpaceDisabled(spaceNetworkId string) (bool, error) {
	town, err := za.getTown(spaceNetworkId)
	if err != nil || town == nil {
		return false, err
	}

	isDisabled, err := town.pausable.Paused(nil)
	return isDisabled, err
}

func (za *SpaceContractBaseGoerliV3) IsChannelDisabled(spaceNetworkId string, channelNetworkId string) (bool, error) {
	channel, err := za.getChannel(spaceNetworkId, channelNetworkId)
	if err != nil || channel == nil {
		return false, err
	}
	channelInfo, err := channel.GetChannel(nil, channelNetworkId)
	if err != nil {
		return false, err
	}
	return channelInfo.Disabled, nil
}

func (za *SpaceContractBaseGoerliV3) getTown(networkId string) (*TownBaseGoerli, error) {
	log := dlog.CtxLog(context.Background())
	za.townsLock.Lock()
	defer za.townsLock.Unlock()
	if za.towns[networkId] == nil {
		// use the networkId to fetch the town's contract address
		townAddress, err := za.townsArchitect.GetTownById(nil, networkId)
		log.Info("getTown", "townAddress", townAddress, "err", err, "networkId", networkId)
		if err != nil || townAddress == EMPTY_ADDRESS {
			return nil, err
		}
		entitlements, err := base_goerli_towns_entitlements.NewBaseGoerliTownsEntitlements(townAddress, za.ethClient)
		log.Info("getTown::entitlements", "err", err)
		if err != nil {
			return nil, err
		}
		pausable, err := base_goerli_towns_pausable.NewBaseGoerliTownsPausable(townAddress, za.ethClient)
		log.Info("getTown::pausable", "err", err)
		if err != nil {
			return nil, err
		}
		// cache the town
		za.towns[networkId] = &TownBaseGoerli{
			address:      townAddress,
			entitlements: entitlements,
			pausable:     pausable,
			channels:     make(map[string]*base_goerli_towns_channels.BaseGoerliTownsChannels),
		}
	} else {
		log.Info("getTown::town already cached", "netowrkId", networkId)
	}
	return za.towns[networkId], nil
}

func (za *SpaceContractBaseGoerliV3) getChannel(spaceNetworkId string, channelNetworkId string) (*base_goerli_towns_channels.BaseGoerliTownsChannels, error) {
	log := dlog.CtxLog(context.Background())
	town, err := za.getTown(spaceNetworkId)
	log.Info("getChannel", "town", town.address, "err", err, "spaceNetworkId", spaceNetworkId, "channelNetworkId", channelNetworkId)
	if err != nil || town == nil {
		return nil, err
	}
	town.channelsLock.Lock()
	defer town.channelsLock.Unlock()
	if town.channels[channelNetworkId] == nil {
		channel, err := base_goerli_towns_channels.NewBaseGoerliTownsChannels(town.address, za.ethClient)
		log.Info("getChannel", "channel", channel, "err", err)
		if err != nil {
			return nil, err
		}
		log.Info("getChannel success")
		town.channels[channelNetworkId] = channel
	}
	return town.channels[channelNetworkId], nil
}
