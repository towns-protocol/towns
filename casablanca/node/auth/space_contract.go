package auth

import (
	"context"

	"github.com/ethereum/go-ethereum/common"
)

type SpaceContract interface {
	IsSpaceDisabled(ctx context.Context, spaceNetworkId string) (bool, error)
	IsChannelDisabled(
		ctx context.Context,
		spaceNetworkId string,
		channelNetworkId string,
	) (bool, error)
	IsEntitledToSpace(
		ctx context.Context,
		spaceNetworkId string,
		user common.Address,
		permission Permission,
	) (bool, error)
	IsEntitledToChannel(
		ctx context.Context,
		spaceNetworkId string,
		channelNetworkId string,
		user common.Address,
		permission Permission,
	) (bool, error)
}
