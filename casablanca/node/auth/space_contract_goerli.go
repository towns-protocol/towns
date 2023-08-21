package auth

import (
	"casablanca/node/auth/contracts/goerli_space"
	"casablanca/node/auth/contracts/goerli_space_factory"
	"sync"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/ethclient"
)

type SpaceContractGoerli struct {
	ethClient    *ethclient.Client
	spaceFactory *goerli_space_factory.GoerliSpaceFactory
	spaces       map[string]*goerli_space.GoerliSpace
	spacesLock   sync.Mutex
}

func NewSpaceContractGoerli(ethClient *ethclient.Client) (*SpaceContractGoerli, error) {
	jsonAddress, err := loadSpaceFactoryAddress(5)
	if err != nil {
		return nil, err
	}
	address := common.HexToAddress(jsonAddress.SpaceFactory)
	spaceFactory, err := goerli_space_factory.NewGoerliSpaceFactory(address, ethClient)
	if err != nil {
		return nil, err
	}
	// no errors.
	var spaceContract = &SpaceContractGoerli{
		ethClient:    ethClient,
		spaceFactory: spaceFactory,
		spaces:       make(map[string]*goerli_space.GoerliSpace),
	}
	return spaceContract, nil
}

func (za *SpaceContractGoerli) IsEntitledToSpace(
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

func (za *SpaceContractGoerli) IsEntitledToChannel(
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

func (za *SpaceContractGoerli) IsSpaceDisabled(spaceNetworkId string) (bool, error) {
	space, err := za.getSpace(spaceNetworkId)
	if err != nil {
		return false, err
	}

	isDisabled, err := space.Disabled(nil)
	return isDisabled, err
}

func (za *SpaceContractGoerli) IsChannelDisabled(spaceNetworkId string, channelNetworkId string) (bool, error) {
	space, err := za.getSpace(spaceNetworkId)
	if err != nil {
		return false, err
	}
	channelIdHash := NetworkIdToHash(channelNetworkId)
	channel, err := space.GetChannelByHash(nil, channelIdHash)
	return channel.Disabled, err
}

func (za *SpaceContractGoerli) getSpace(networkId string) (*goerli_space.GoerliSpace, error) {
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
		space, err := goerli_space.NewGoerliSpace(spaceAddress, za.ethClient)
		if err != nil {
			return nil, err
		}
		za.spaces[networkId] = space
	}
	return za.spaces[networkId], nil
}
