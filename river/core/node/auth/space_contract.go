package auth

import (
	"context"

	v3 "github.com/river-build/river/core/xchain/contracts/v3"

	"github.com/ethereum/go-ethereum/common"
	"github.com/river-build/river/core/node/shared"
)

type SpaceEntitlements struct {
	entitlementType string
	ruleEntitlement v3.IRuleEntitlementRuleData
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
	) ([]SpaceEntitlements, common.Address, error)
	IsMember(
		ctx context.Context,
		spaceId shared.StreamId,
		user common.Address,
	) (bool, error)
}
