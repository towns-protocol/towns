package auth

import (
	"casablanca/node/auth/contracts/localhost_towns_architect"
	"casablanca/node/auth/contracts/localhost_towns_channels"
	"casablanca/node/auth/contracts/localhost_towns_entitlements"
	"casablanca/node/auth/contracts/localhost_towns_pausable"
	"sync"

	"golang.org/x/exp/slog"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/ethclient"
)

type TownLocalhost struct {
	address      common.Address
	entitlements *localhost_towns_entitlements.LocalhostTownsEntitlements
	pausable     *localhost_towns_pausable.LocalhostTownsPausable
	channels     map[string]*localhost_towns_channels.LocalhostTownsChannels
	channelsLock sync.Mutex
}

type SpaceContractLocalhostV3 struct {
	ethClient      *ethclient.Client
	townsArchitect *localhost_towns_architect.LocalhostTownsArchitect
	// map of networkId to the town
	towns     map[string]*TownLocalhost
	townsLock sync.Mutex
}

func NewSpaceContractLocalhostV3(ethClient *ethclient.Client) (SpaceContract, error) {
	// get the space factory address from config
	jsonAddress, err := loadContractAddresses(31337)
	if err != nil {
		slog.Error("error parsing localhost contract address", "address", jsonAddress, "error", err)
		return nil, err
	}
	address := common.HexToAddress(jsonAddress.TownFactory)
	townsArchitect, err := localhost_towns_architect.NewLocalhostTownsArchitect(address, ethClient)
	if err != nil {
		slog.Error("error fetching localhost TownArchitect contract with address", "address", jsonAddress, "error", err)
		return nil, err
	}
	// no errors.
	spaceContract := &SpaceContractLocalhostV3{
		ethClient:      ethClient,
		townsArchitect: townsArchitect,
		towns:          make(map[string]*TownLocalhost),
		townsLock:      sync.Mutex{},
	}

	return spaceContract, nil
}

func (za *SpaceContractLocalhostV3) IsEntitledToSpace(
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

func (za *SpaceContractLocalhostV3) IsEntitledToChannel(
	spaceNetworkId string,
	channelNetworkId string,
	user common.Address,
	permission Permission,
) (bool, error) {
	// get the town entitlements and check if user is entitled to the channel
	town, err := za.getTown(spaceNetworkId)
	if err != nil || town == nil {
		return false, err
	}
	// channel entitlement check
	isEntitled, err := town.entitlements.IsEntitledToChannel(
		nil,
		channelNetworkId,
		user,
		permission.String(),
	)
	return isEntitled, err
}

func (za *SpaceContractLocalhostV3) IsSpaceDisabled(spaceNetworkId string) (bool, error) {
	town, err := za.getTown(spaceNetworkId)
	if err != nil || town == nil {
		return false, err
	}

	isDisabled, err := town.pausable.Paused(nil)
	return isDisabled, err
}

func (za *SpaceContractLocalhostV3) IsChannelDisabled(spaceNetworkId string, channelNetworkId string) (bool, error) {
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

func (za *SpaceContractLocalhostV3) getTown(networkId string) (*TownLocalhost, error) {
	za.townsLock.Lock()
	defer za.townsLock.Unlock()
	if za.towns[networkId] == nil {
		// use the networkId to fetch the town's contract address
		townAddress, err := za.townsArchitect.GetTownById(nil, networkId)
		if err != nil || townAddress == EMPTY_ADDRESS {
			return nil, err
		}
		entitlements, err := localhost_towns_entitlements.NewLocalhostTownsEntitlements(townAddress, za.ethClient)
		if err != nil {
			return nil, err
		}
		pausable, err := localhost_towns_pausable.NewLocalhostTownsPausable(townAddress, za.ethClient)
		if err != nil {
			return nil, err
		}
		// cache the town
		za.towns[networkId] = &TownLocalhost{
			address:      townAddress,
			entitlements: entitlements,
			pausable:     pausable,
			channels:     make(map[string]*localhost_towns_channels.LocalhostTownsChannels),
		}
	}
	return za.towns[networkId], nil
}

func (za *SpaceContractLocalhostV3) getChannel(spaceNetworkId string, channelNetworkId string) (*localhost_towns_channels.LocalhostTownsChannels, error) {
	town, err := za.getTown(spaceNetworkId)
	if err != nil || town == nil {
		return nil, err
	}
	town.channelsLock.Lock()
	defer town.channelsLock.Unlock()
	if town.channels[channelNetworkId] == nil {
		channel, err := localhost_towns_channels.NewLocalhostTownsChannels(town.address, za.ethClient)
		if err != nil {
			return nil, err
		}
		town.channels[channelNetworkId] = channel
	}
	return town.channels[channelNetworkId], nil
}
