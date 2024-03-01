package auth

import (
	"context"
	"sync"

	"github.com/river-build/river/core/node/config"
	"github.com/river-build/river/core/node/infra"

	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
)

type Space struct {
	address      common.Address
	entitlements Entitlements
	pausable     Pausable
	channels     map[string]Channels
	channelsLock sync.Mutex
}

type SpaceContractV3 struct {
	architect Architect
	version   string
	backend   bind.ContractBackend

	spaces     map[string]*Space
	spacesLock sync.Mutex
}

var contractCalls = infra.NewSuccessMetrics("contract_calls", nil)

var EMPTY_ADDRESS = common.Address{}

func NewSpaceContractV3(
	ctx context.Context,
	architectCfg *config.ContractConfig,
	backend bind.ContractBackend,
	// walletLinkingCfg *config.ContractConfig,
) (SpaceContract, error) {
	architect, err := NewArchitect(ctx, architectCfg, backend)
	if err != nil {
		return nil, err
	}

	spaceContract := &SpaceContractV3{
		architect: architect,
		version:   architectCfg.Version,
		backend:   backend,
		spaces:    make(map[string]*Space),
	}

	return spaceContract, nil
}

func (sc *SpaceContractV3) IsEntitledToSpace(
	ctx context.Context,
	spaceNetworkId string,
	user common.Address,
	permission Permission,
) (bool, error) {
	// get the space entitlements and check if user is entitled.
	space, err := sc.getSpace(ctx, spaceNetworkId)
	if err != nil || space == nil {
		return false, err
	}
	isEntitled, err := space.entitlements.IsEntitledToSpace(
		nil,
		user,
		permission.String(),
	)
	return isEntitled, err
}

func (sc *SpaceContractV3) IsEntitledToChannel(
	ctx context.Context,
	spaceNetworkId string,
	channelNetworkId string,
	user common.Address,
	permission Permission,
) (bool, error) {
	// get the space entitlements and check if user is entitled to the channel
	space, err := sc.getSpace(ctx, spaceNetworkId)
	if err != nil || space == nil {
		return false, err
	}
	// channel entitlement check
	isEntitled, err := space.entitlements.IsEntitledToChannel(
		nil,
		channelNetworkId,
		user,
		permission.String(),
	)
	return isEntitled, err
}

func (sc *SpaceContractV3) IsSpaceDisabled(ctx context.Context, spaceNetworkId string) (bool, error) {
	space, err := sc.getSpace(ctx, spaceNetworkId)
	if err != nil || space == nil {
		return false, err
	}

	isDisabled, err := space.pausable.Paused(nil)
	return isDisabled, err
}

func (sc *SpaceContractV3) IsChannelDisabled(ctx context.Context, spaceNetworkId string, channelNetworkId string) (bool, error) {
	channel, err := sc.getChannel(ctx, spaceNetworkId, channelNetworkId)
	if err != nil || channel == nil {
		return false, err
	}
	isDisabled, err := channel.IsDisabled(nil, channelNetworkId)
	return isDisabled, err
}

func (sc *SpaceContractV3) getSpace(ctx context.Context, spaceId string) (*Space, error) {
	sc.spacesLock.Lock()
	defer sc.spacesLock.Unlock()
	if sc.spaces[spaceId] == nil {
		// use the networkId to fetch the space's contract address
		address, err := sc.architect.GetSpaceById(nil, spaceId)
		if err != nil || address == EMPTY_ADDRESS {
			return nil, err
		}
		entitlements, err := NewEntitlements(ctx, sc.version, address, sc.backend)
		if err != nil {
			return nil, err
		}
		pausable, err := NewPausable(ctx, sc.version, address, sc.backend)
		if err != nil {
			return nil, err
		}
		// cache the space
		sc.spaces[spaceId] = &Space{
			address:      address,
			entitlements: entitlements,
			pausable:     pausable,
			channels:     make(map[string]Channels),
		}
	}
	return sc.spaces[spaceId], nil
}

func (sc *SpaceContractV3) getChannel(ctx context.Context, spaceNetworkId string, channelNetworkId string) (Channels, error) {
	space, err := sc.getSpace(ctx, spaceNetworkId)
	if err != nil || space == nil {
		return nil, err
	}
	space.channelsLock.Lock()
	defer space.channelsLock.Unlock()
	if space.channels[channelNetworkId] == nil {
		channel, err := NewChannels(ctx, sc.version, space.address, sc.backend)
		if err != nil {
			return nil, err
		}
		space.channels[channelNetworkId] = channel
	}
	return space.channels[channelNetworkId], nil
}
