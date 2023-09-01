package auth

import (
	"casablanca/node/auth/contracts/goerli_towns_architect"
	"casablanca/node/auth/contracts/goerli_towns_channels"
	"casablanca/node/auth/contracts/goerli_towns_entitlements"
	"casablanca/node/auth/contracts/goerli_towns_pausable"
	"sync"

	"golang.org/x/exp/slog"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/ethclient"
)

type TownGoerli struct {
	address      common.Address
	entitlements *goerli_towns_entitlements.GoerliTownsEntitlements
	pausable     *goerli_towns_pausable.GoerliTownsPausable
	channels     map[string]*goerli_towns_channels.GoerliTownsChannels
	channelsLock sync.Mutex
}

type SpaceContractGoerliV3 struct {
	ethClient      *ethclient.Client
	townsArchitect *goerli_towns_architect.GoerliTownsArchitect
	// map of networkId to the town
	towns     map[string]*TownGoerli
	townsLock sync.Mutex
}

func NewSpaceContractGoerliV3(ethClient *ethclient.Client) (SpaceContract, error) {
	// get the space factory address from config
	strAddress, err := loadContractAddress(5)
	if err != nil {
		slog.Error("error parsing goerli contract address", "address", strAddress, "error", err)
		return nil, err
	}
	address := common.HexToAddress(strAddress)
	townsArchitect, err := goerli_towns_architect.NewGoerliTownsArchitect(address, ethClient)
	if err != nil {
		slog.Error("error fetching goerli TownArchitect contract with address", "address", strAddress, "error", err)
		return nil, err
	}
	// no errors.
	spaceContract := &SpaceContractGoerliV3{
		ethClient:      ethClient,
		townsArchitect: townsArchitect,
		towns:          make(map[string]*TownGoerli),
		townsLock:      sync.Mutex{},
	}

	return spaceContract, nil
}

func (za *SpaceContractGoerliV3) IsEntitledToSpace(
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

func (za *SpaceContractGoerliV3) IsEntitledToChannel(
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

func (za *SpaceContractGoerliV3) IsSpaceDisabled(spaceNetworkId string) (bool, error) {
	town, err := za.getTown(spaceNetworkId)
	if err != nil || town == nil {
		return false, err
	}

	isDisabled, err := town.pausable.Paused(nil)
	return isDisabled, err
}

func (za *SpaceContractGoerliV3) IsChannelDisabled(spaceNetworkId string, channelNetworkId string) (bool, error) {
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

func (za *SpaceContractGoerliV3) getTown(networkId string) (*TownGoerli, error) {
	za.townsLock.Lock()
	defer za.townsLock.Unlock()
	if za.towns[networkId] == nil {
		// use the networkId to fetch the town's contract address
		townAddress, err := za.townsArchitect.GetTownById(nil, networkId)
		if err != nil || townAddress == EMPTY_ADDRESS {
			return nil, err
		}
		entitlements, err := goerli_towns_entitlements.NewGoerliTownsEntitlements(townAddress, za.ethClient)
		if err != nil {
			return nil, err
		}
		pausable, err := goerli_towns_pausable.NewGoerliTownsPausable(townAddress, za.ethClient)
		if err != nil {
			return nil, err
		}
		// cache the town
		za.towns[networkId] = &TownGoerli{
			address:      townAddress,
			entitlements: entitlements,
			pausable:     pausable,
			channels:     make(map[string]*goerli_towns_channels.GoerliTownsChannels),
		}
	}
	return za.towns[networkId], nil
}

func (za *SpaceContractGoerliV3) getChannel(spaceNetworkId string, channelNetworkId string) (*goerli_towns_channels.GoerliTownsChannels, error) {
	town, err := za.getTown(spaceNetworkId)
	if err != nil || town == nil {
		return nil, err
	}
	town.channelsLock.Lock()
	defer town.channelsLock.Unlock()
	if town.channels[channelNetworkId] == nil {
		channel, err := goerli_towns_channels.NewGoerliTownsChannels(town.address, za.ethClient)
		if err != nil {
			return nil, err
		}
		town.channels[channelNetworkId] = channel
	}
	return town.channels[channelNetworkId], nil
}
