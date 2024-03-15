package auth

import (
	"context"

	"github.com/ethereum/go-ethereum/common"
	"github.com/river-build/river/core/node/shared"
)

type SpaceContract interface {
	IsSpaceDisabled(ctx context.Context, spaceId shared.StreamId) (bool, error)
	IsChannelDisabled(
		ctx context.Context,
		spaceId shared.StreamId,
		channelId shared.StreamId,
	) (bool, error)
	IsEntitledToSpace(
		ctx context.Context,
		spaceId shared.StreamId,
		user common.Address,
		permission Permission,
	) (bool, error)
	IsEntitledToChannel(
		ctx context.Context,
		spaceId shared.StreamId,
		channelId shared.StreamId,
		user common.Address,
		permission Permission,
	) (bool, error)
}
