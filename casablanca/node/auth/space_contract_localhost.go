package auth

import (
	"casablanca/node/auth/contracts/localhost_space"
	"casablanca/node/auth/contracts/localhost_space_factory"
	"sync"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/ethclient"
)

type SpaceContractLocalhost struct {
	ethClient    *ethclient.Client
	spaceFactory *localhost_space_factory.LocalhostSpaceFactory
	spaces       map[string]*localhost_space.LocalhostSpace
	spacesLock   sync.Mutex
}

func NewSpaceContractLocalhostV2(ethClient *ethclient.Client) (*SpaceContractLocalhost, error) {
	jsonAddress, err := loadContractAddresses(31337)
	if err != nil {
		return nil, err
	}
	address := common.HexToAddress(jsonAddress.SpaceFactory)
	spaceFactory, err := localhost_space_factory.NewLocalhostSpaceFactory(address, ethClient)
	if err != nil {
		return nil, err
	}
	// no errors.
	var spaceContract = &SpaceContractLocalhost{
		ethClient:    ethClient,
		spaceFactory: spaceFactory,
		spaces:       make(map[string]*localhost_space.LocalhostSpace),
	}
	return spaceContract, nil
}

func (za *SpaceContractLocalhost) IsEntitledToSpace(
	spaceNetworkId string,
	user common.Address,
	permission Permission,
) (bool, error) {
	// get the space and check if user is entitled.
	space, err := za.getSpace(spaceNetworkId)
	if err != nil {
		return false, err
	}
	isEntitled, err := space.IsEntitledToSpace(
		nil,
		user,
		permission.String(),
	)
	return isEntitled, err
}

func (za *SpaceContractLocalhost) IsEntitledToChannel(
	spaceNetworkId string,
	channelNetworkId string,
	user common.Address,
	permission Permission,
) (bool, error) {
	// get the space and check if user is entitled.
	space, err := za.getSpace(spaceNetworkId)
	if err != nil {
		return false, err
	}
	// channel entitlement check
	isEntitled, err := space.IsEntitledToChannel(
		nil,
		channelNetworkId,
		user,
		permission.String(),
	)
	return isEntitled, err
}

func (za *SpaceContractLocalhost) IsSpaceDisabled(spaceNetworkId string) (bool, error) {
	space, err := za.getSpace(spaceNetworkId)
	if err != nil {
		return false, err
	}

	isDisabled, err := space.Disabled(nil)
	return isDisabled, err
}

func (za *SpaceContractLocalhost) IsChannelDisabled(spaceNetworkId string, channelNetworkId string) (bool, error) {
	space, err := za.getSpace(spaceNetworkId)
	if err != nil {
		return false, err
	}
	channelIdHash := NetworkIdToHash(channelNetworkId)
	channel, err := space.GetChannelByHash(nil, channelIdHash)
	return channel.Disabled, err
}

func (za *SpaceContractLocalhost) getSpace(networkId string) (*localhost_space.LocalhostSpace, error) {
	za.spacesLock.Lock()
	defer za.spacesLock.Unlock()
	if za.spaces[networkId] == nil {
		// convert the networkId to keccak256 spaceIdHash
		spaceIdHash := NetworkIdToHash(networkId)
		// then use the spaceFactory to fetch the space address
		spaceAddress, err := za.spaceFactory.SpaceByHash(nil, spaceIdHash)
		if err != nil {
			return nil, err
		}
		// cache the space for future use
		space, err := localhost_space.NewLocalhostSpace(spaceAddress, za.ethClient)
		if err != nil {
			return nil, err
		}
		za.spaces[networkId] = space
	}
	return za.spaces[networkId], nil
}
