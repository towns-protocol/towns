package auth

import (
	"github.com/ethereum/go-ethereum/common"
)

type SpaceContract interface {
	IsSpaceDisabled(spaceNetworkId string) (bool, error)
	IsChannelDisabled(
		spaceNetworkId string,
		channelNetworkId string,
	) (bool, error)
	IsEntitledToSpace(
		spaceNetworkId string,
		user common.Address,
		permission Permission,
	) (bool, error)
	IsEntitledToChannel(
		spaceNetworkId string,
		channelNetworkId string,
		user common.Address,
		permission Permission,
	) (bool, error)
}
