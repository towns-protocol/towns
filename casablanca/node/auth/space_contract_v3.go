package auth

import (
	"casablanca/node/dlog"
	"casablanca/node/infra"
	"context"
	"sync"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/ethclient"
)

type Town struct {
	address      common.Address
	entitlements TownsEntitlements
	pausable     TownsPausable
	channels     map[string]TownsChannels
	channelsLock sync.Mutex
}

type SpaceContractV3 struct {
	ethClient      *ethclient.Client
	townsArchitect TownsArchitect
	// map of networkId to the town
	towns     map[string]*Town
	chainId   int
	townsLock sync.Mutex
}

var (
	contractCalls = infra.NewSuccessMetrics("contract_calls", nil)
)


func NewSpaceContractV3(ctx context.Context, ethClient *ethclient.Client, chanId int) (SpaceContract, error) {
	log := dlog.CtxLog(ctx)
	// get the space factory address from config
	strAddress, err := loadContractAddress(chanId)
	if err != nil {
		log.Error("error parsing contract address", "address", strAddress, "chainId", chanId, "error", err)
		return nil, err
	}
	address := common.HexToAddress(strAddress)
	townsArchitect, err := NewTownsArchitect(address, ethClient, chanId)
	if err != nil {
		log.Error("error fetching TownArchitect contract with address", "address", strAddress, "chainId", chanId, "error", err)
		return nil, err
	}
	// no errors.
	spaceContract := &SpaceContractV3{
		ethClient:      ethClient,
		townsArchitect: townsArchitect,
		towns:          make(map[string]*Town),
		chainId:        chanId,
		townsLock:      sync.Mutex{},
	}

	return spaceContract, nil
}

func (za *SpaceContractV3) IsEntitledToSpace(
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

func (za *SpaceContractV3) IsEntitledToChannel(
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

func (za *SpaceContractV3) IsSpaceDisabled(spaceNetworkId string) (bool, error) {
	town, err := za.getTown(spaceNetworkId)
	if err != nil || town == nil {
		return false, err
	}

	isDisabled, err := town.pausable.Paused(nil)
	return isDisabled, err
}

func (za *SpaceContractV3) IsChannelDisabled(spaceNetworkId string, channelNetworkId string) (bool, error) {
	channel, err := za.getChannel(spaceNetworkId, channelNetworkId)
	if err != nil || channel == nil {
		return false, err
	}
	isDisabled, err := channel.IsDisabled(nil, channelNetworkId)
	return isDisabled, err
}

func (za *SpaceContractV3) getTown(networkId string) (*Town, error) {
	za.townsLock.Lock()
	defer za.townsLock.Unlock()
	if za.towns[networkId] == nil {
		// use the networkId to fetch the town's contract address
		townAddress, err := za.townsArchitect.GetTownById(nil, networkId)
		if err != nil || townAddress == EMPTY_ADDRESS {
			return nil, err
		}
		entitlements, err := NewTownsEntitlements(townAddress, za.ethClient, za.chainId)
		if err != nil {
			return nil, err
		}
		pausable, err := NewTownsPausable(townAddress, za.ethClient, za.chainId)
		if err != nil {
			return nil, err
		}
		// cache the town
		za.towns[networkId] = &Town{
			address:      townAddress,
			entitlements: entitlements,
			pausable:     pausable,
			channels:     make(map[string]TownsChannels),
		}
	}
	return za.towns[networkId], nil
}

func (za *SpaceContractV3) getChannel(spaceNetworkId string, channelNetworkId string) (TownsChannels, error) {
	town, err := za.getTown(spaceNetworkId)
	if err != nil || town == nil {
		return nil, err
	}
	town.channelsLock.Lock()
	defer town.channelsLock.Unlock()
	if town.channels[channelNetworkId] == nil {
		channel, err := NewTownsChannels(za.ethClient, za.chainId, town.address)
		if err != nil {
			return nil, err
		}
		town.channels[channelNetworkId] = channel
	}
	return town.channels[channelNetworkId], nil
}
