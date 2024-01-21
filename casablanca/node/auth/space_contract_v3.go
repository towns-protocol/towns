package auth

import (
	"context"
	"sync"

	"github.com/river-build/river/config"
	"github.com/river-build/river/infra"

	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
)

type Town struct {
	address      common.Address
	entitlements TownsEntitlements
	pausable     TownsPausable
	channels     map[string]TownsChannels
	channelsLock sync.Mutex
}

type SpaceContractV3 struct {
	townsArchitect TownsArchitect
	version        string
	backend        bind.ContractBackend

	towns     map[string]*Town
	townsLock sync.Mutex
}

var contractCalls = infra.NewSuccessMetrics("contract_calls", nil)

var EMPTY_ADDRESS = common.Address{}

func NewSpaceContractV3(
	ctx context.Context,
	townsArchitectCfg *config.ContractConfig,
	backend bind.ContractBackend,
	// walletLinkingCfg *config.ContractConfig,
) (SpaceContract, error) {
	townsArchitect, err := NewTownsArchitect(townsArchitectCfg, backend)
	if err != nil {
		return nil, err
	}

	spaceContract := &SpaceContractV3{
		townsArchitect: townsArchitect,
		version:        townsArchitectCfg.Version,
		backend:        backend,
		towns:          make(map[string]*Town),
	}

	return spaceContract, nil
}

func (sc *SpaceContractV3) IsEntitledToSpace(
	spaceNetworkId string,
	user common.Address,
	permission Permission,
) (bool, error) {
	// get the town entitlements and check if user is entitled.
	town, err := sc.getTown(spaceNetworkId)
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

func (sc *SpaceContractV3) IsEntitledToChannel(
	spaceNetworkId string,
	channelNetworkId string,
	user common.Address,
	permission Permission,
) (bool, error) {
	// get the town entitlements and check if user is entitled to the channel
	town, err := sc.getTown(spaceNetworkId)
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

func (sc *SpaceContractV3) IsSpaceDisabled(spaceNetworkId string) (bool, error) {
	town, err := sc.getTown(spaceNetworkId)
	if err != nil || town == nil {
		return false, err
	}

	isDisabled, err := town.pausable.Paused(nil)
	return isDisabled, err
}

func (sc *SpaceContractV3) IsChannelDisabled(spaceNetworkId string, channelNetworkId string) (bool, error) {
	channel, err := sc.getChannel(spaceNetworkId, channelNetworkId)
	if err != nil || channel == nil {
		return false, err
	}
	isDisabled, err := channel.IsDisabled(nil, channelNetworkId)
	return isDisabled, err
}

func (sc *SpaceContractV3) getTown(townId string) (*Town, error) {
	sc.townsLock.Lock()
	defer sc.townsLock.Unlock()
	if sc.towns[townId] == nil {
		// use the networkId to fetch the town's contract address
		townAddress, err := sc.townsArchitect.GetTownById(nil, townId)
		if err != nil || townAddress == EMPTY_ADDRESS {
			return nil, err
		}
		entitlements, err := NewTownsEntitlements(sc.version, townAddress, sc.backend)
		if err != nil {
			return nil, err
		}
		pausable, err := NewTownsPausable(sc.version, townAddress, sc.backend)
		if err != nil {
			return nil, err
		}
		// cache the town
		sc.towns[townId] = &Town{
			address:      townAddress,
			entitlements: entitlements,
			pausable:     pausable,
			channels:     make(map[string]TownsChannels),
		}
	}
	return sc.towns[townId], nil
}

func (sc *SpaceContractV3) getChannel(spaceNetworkId string, channelNetworkId string) (TownsChannels, error) {
	town, err := sc.getTown(spaceNetworkId)
	if err != nil || town == nil {
		return nil, err
	}
	town.channelsLock.Lock()
	defer town.channelsLock.Unlock()
	if town.channels[channelNetworkId] == nil {
		channel, err := NewTownsChannels(sc.version, town.address, sc.backend)
		if err != nil {
			return nil, err
		}
		town.channels[channelNetworkId] = channel
	}
	return town.channels[channelNetworkId], nil
}
