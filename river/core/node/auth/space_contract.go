package auth

import (
	"context"

	"github.com/ethereum/go-ethereum/common"
	"github.com/river-build/river/core/node/shared"
	"github.com/river-build/river/core/xchain/contracts"
)

type Entitlement struct {
	entitlementType string
	ruleEntitlement *contracts.IRuleData
	userEntitlement []common.Address
}

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
	GetSpaceEntitlementsForPermission(
		ctx context.Context,
		spaceId shared.StreamId,
		permission Permission,
	) ([]Entitlement, common.Address, error)
	GetChannelEntitlementsForPermission(
		ctx context.Context,
		spaceId shared.StreamId,
		channelId shared.StreamId,
		permission Permission,
	) ([]Entitlement, common.Address, error)
	IsMember(
		ctx context.Context,
		spaceId shared.StreamId,
		user common.Address,
	) (bool, error)
	IsBanned(
		ctx context.Context,
		spaceId shared.StreamId,
		linkedWallets []common.Address,
	) (bool, error)
}
