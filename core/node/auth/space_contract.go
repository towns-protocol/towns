package auth

import (
	"context"
	"math/big"

	"github.com/ethereum/go-ethereum/common"

	"github.com/towns-protocol/towns/core/node/shared"

	"github.com/towns-protocol/towns/core/contracts/types"
)

// MembershipStatus represents the membership status of a user
type MembershipStatus struct {
	IsMember   bool       // Whether the user is a member (has at least one token)
	IsExpired  bool       // Whether the membership is expired
	TokenIds   []*big.Int // List of token IDs owned by the user
	ExpiryTime *big.Int   // Expiry time of the farthest non-expired token, or nil if no non-expired tokens
	ExpiredAt  *big.Int   // When membership expired (if all tokens are expired, this is the most recent expiry)
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
	) ([]types.Entitlement, common.Address, error)
	GetChannelEntitlementsForPermission(
		ctx context.Context,
		spaceId shared.StreamId,
		channelId shared.StreamId,
		permission Permission,
	) ([]types.Entitlement, common.Address, error)
	IsMember(
		ctx context.Context,
		spaceId shared.StreamId,
		user common.Address,
	) (bool, error)
	GetMembershipStatus(
		ctx context.Context,
		spaceId shared.StreamId,
		user common.Address,
	) (*MembershipStatus, error)
	IsBanned(
		ctx context.Context,
		spaceId shared.StreamId,
		tokenIds []*big.Int,
	) (bool, error)
	GetRoles(
		ctx context.Context,
		spaceId shared.StreamId,
	) ([]types.BaseRole, error)
	GetChannels(
		ctx context.Context,
		spaceId shared.StreamId,
	) ([]types.BaseChannel, error)
	IsAppEntitled(
		ctx context.Context,
		spaceId shared.StreamId,
		appClient common.Address,
		appAddress common.Address,
		permission Permission,
	) (bool, error)
	IsAppInstalled(
		ctx context.Context,
		spaceId shared.StreamId,
		appAddress common.Address,
	) (bool, error)
}
