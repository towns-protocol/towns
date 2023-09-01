package auth

import (
	"casablanca/node/auth/contracts/sepolia_towns_architect"
	"casablanca/node/auth/contracts/sepolia_towns_channels"
	"casablanca/node/auth/contracts/sepolia_towns_entitlements"
	"casablanca/node/auth/contracts/sepolia_towns_pausable"
	"sync"

	"golang.org/x/exp/slog"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/ethclient"
)

type TownSepolia struct {
	address      common.Address
	entitlements *sepolia_towns_entitlements.SepoliaTownsEntitlements
	pausable     *sepolia_towns_pausable.SepoliaTownsPausable
	channels     map[string]*sepolia_towns_channels.SepoliaTownsChannels
	channelsLock sync.Mutex
}

type SpaceContractSepoliaV3 struct {
	ethClient      *ethclient.Client
	townsArchitect *sepolia_towns_architect.SepoliaTownsArchitect
	// map of networkId to the town
	towns     map[string]*TownSepolia
	townsLock sync.Mutex
}

func NewSpaceContractSepoliaV3(ethClient *ethclient.Client) (SpaceContract, error) {
	// get the space factory address from config
	strAddress, err := loadContractAddress(11155111)
	if err != nil {
		slog.Error("error parsing sepolia contract address", "address", strAddress, "error", err)
		return nil, err
	}
	address := common.HexToAddress(strAddress)
	townsArchitect, err := sepolia_towns_architect.NewSepoliaTownsArchitect(address, ethClient)
	if err != nil {
		slog.Error("error fetching sepolia TownArchitect contract with address", "address", strAddress, "error", err)
		return nil, err
	}
	// no errors.
	spaceContract := &SpaceContractSepoliaV3{
		ethClient:      ethClient,
		townsArchitect: townsArchitect,
		towns:          make(map[string]*TownSepolia),
		townsLock:      sync.Mutex{},
	}

	return spaceContract, nil
}

func (za *SpaceContractSepoliaV3) IsEntitledToSpace(
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

func (za *SpaceContractSepoliaV3) IsEntitledToChannel(
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

func (za *SpaceContractSepoliaV3) IsSpaceDisabled(spaceNetworkId string) (bool, error) {
	town, err := za.getTown(spaceNetworkId)
	if err != nil || town == nil {
		return false, err
	}

	isDisabled, err := town.pausable.Paused(nil)
	return isDisabled, err
}

func (za *SpaceContractSepoliaV3) IsChannelDisabled(spaceNetworkId string, channelNetworkId string) (bool, error) {
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

func (za *SpaceContractSepoliaV3) getTown(networkId string) (*TownSepolia, error) {
	za.townsLock.Lock()
	defer za.townsLock.Unlock()
	if za.towns[networkId] == nil {
		// use the networkId to fetch the town's contract address
		townAddress, err := za.townsArchitect.GetTownById(nil, networkId)
		if err != nil || townAddress == EMPTY_ADDRESS {
			return nil, err
		}
		entitlements, err := sepolia_towns_entitlements.NewSepoliaTownsEntitlements(townAddress, za.ethClient)
		if err != nil {
			return nil, err
		}
		pausable, err := sepolia_towns_pausable.NewSepoliaTownsPausable(townAddress, za.ethClient)
		if err != nil {
			return nil, err
		}
		// cache the town
		za.towns[networkId] = &TownSepolia{
			address:      townAddress,
			entitlements: entitlements,
			pausable:     pausable,
			channels:     make(map[string]*sepolia_towns_channels.SepoliaTownsChannels),
		}
	}
	return za.towns[networkId], nil
}

func (za *SpaceContractSepoliaV3) getChannel(spaceNetworkId string, channelNetworkId string) (*sepolia_towns_channels.SepoliaTownsChannels, error) {
	town, err := za.getTown(spaceNetworkId)
	if err != nil || town == nil {
		return nil, err
	}
	town.channelsLock.Lock()
	defer town.channelsLock.Unlock()
	if town.channels[channelNetworkId] == nil {
		channel, err := sepolia_towns_channels.NewSepoliaTownsChannels(town.address, za.ethClient)
		if err != nil {
			return nil, err
		}
		town.channels[channelNetworkId] = channel
	}
	return town.channels[channelNetworkId], nil
}
