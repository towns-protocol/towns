package auth

import (
	"context"
	"fmt"
	"math/big"
	"sync"
	"time"

	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"

	"github.com/towns-protocol/towns/core/config"
	"github.com/towns-protocol/towns/core/contracts/base"
	"github.com/towns-protocol/towns/core/contracts/types"
	. "github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/crypto"
	"github.com/towns-protocol/towns/core/node/logging"
	"github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/xchain/bindings/ierc5313"
)

type Space struct {
	address         common.Address
	managerContract *base.EntitlementsManager
	queryContract   *base.EntitlementDataQueryable
	rolesContract   *base.IRoles
	banning         Banning
	pausable        *base.Pausable
	channels        *base.Channels
	appAccount      *base.AppAccount
}

type SpaceContractV3 struct {
	architect  *base.Architect
	chainCfg   *config.ChainConfig
	backend    bind.ContractBackend
	spaces     map[shared.StreamId]*Space
	spacesLock sync.Mutex
	decoder    *crypto.EvmErrorDecoder
}

var EMPTY_ADDRESS = common.Address{}

func NewSpaceContractV3(
	ctx context.Context,
	architectCfg *config.ContractConfig,
	chainCfg *config.ChainConfig,
	backend bind.ContractBackend,
	// walletLinkingCfg *config.ContractConfig,
) (SpaceContract, error) {
	architect, err := base.NewArchitect(architectCfg.Address, backend)
	if err != nil {
		return nil, err
	}

	decoder, err := crypto.NewEVMErrorDecoder(
		base.DiamondMetaData,
		base.AppAccountMetaData,
		base.ArchitectMetaData,
		base.BanningMetaData,
		base.ChannelsMetaData,
		base.EntitlementDataQueryableMetaData,
		base.EntitlementsManagerMetaData,
		base.Erc721aQueryableMetaData,
		base.IRolesMetaData,
		base.IEntitlementMetaData,
		base.ICrossChainEntitlementMetaData,
		base.RuleEntitlementMetaData,
		base.RuleEntitlementV2MetaData,
	)
	if err != nil {
		return nil, err
	}

	spaceContract := &SpaceContractV3{
		architect: architect,
		chainCfg:  chainCfg,
		backend:   backend,
		spaces:    make(map[shared.StreamId]*Space),
		decoder:   decoder,
	}

	return spaceContract, nil
}

func (sc *SpaceContractV3) GetChannels(
	ctx context.Context,
	spaceId shared.StreamId,
) ([]types.BaseChannel, error) {
	space, err := sc.getSpace(ctx, spaceId)
	if err != nil {
		return nil, err
	}
	contractChannels, err := space.channels.GetChannels(&bind.CallOpts{Context: ctx})
	if err != nil {
		return nil, AsRiverError(sc.decodeError(err)).Tag("method", "GetChannels")
	}
	baseChannels := make([]types.BaseChannel, len(contractChannels))
	for i, channel := range contractChannels {
		streamId, err := shared.StreamIdFromBytes(channel.Id[:])
		if err != nil {
			return nil, err
		}
		baseChannels[i] = types.BaseChannel{
			Id:       streamId,
			Disabled: channel.Disabled,
			Metadata: channel.Metadata,
			RoleIds:  channel.RoleIds,
		}
	}
	return baseChannels, nil
}

func (sc *SpaceContractV3) GetRoles(
	ctx context.Context,
	spaceId shared.StreamId,
) ([]types.BaseRole, error) {
	space, err := sc.getSpace(ctx, spaceId)
	if err != nil {
		return nil, err
	}

	iRoleBaseRoles, err := space.rolesContract.GetRoles(&bind.CallOpts{Context: ctx})
	if err != nil {
		return nil, AsRiverError(sc.decodeError(err)).Tag("method", "GetRoles")
	}

	iEntitlementCache := make(map[common.Address]*base.IEntitlement)

	baseRoles := make([]types.BaseRole, len(iRoleBaseRoles))
	for i, iRoleBaseRole := range iRoleBaseRoles {
		marshalledEntitlements := make([]types.Entitlement, 0, len(iRoleBaseRole.Entitlements))
		for _, entitlement := range iRoleBaseRole.Entitlements {
			if _, ok := iEntitlementCache[entitlement]; !ok {
				iEntitlement, err := base.NewIEntitlement(entitlement, sc.backend)
				if err != nil {
					return nil, fmt.Errorf("error constructing IEntitlement for address %v, %w", entitlement, err)
				}
				iEntitlementCache[entitlement] = iEntitlement
			}
			iEntitlement := iEntitlementCache[entitlement]
			entitlementType, err := iEntitlement.ModuleType(&bind.CallOpts{Context: ctx})
			if err != nil {
				return nil, fmt.Errorf(
					"error fetching entitlement type for IEntitlement @ address %v: %w",
					entitlement,
					AsRiverError(sc.decodeError(err)).Tag("method", "ModuleType"),
				)
			}
			entitlementData, err := iEntitlement.GetEntitlementDataByRoleId(
				&bind.CallOpts{Context: ctx},
				iRoleBaseRole.Id,
			)
			if err != nil {
				return nil, fmt.Errorf(
					"error fetching entitlement data for role %v from IEntitlement @ address %v: %w",
					iRoleBaseRole.Id.Uint64(),
					entitlement,
					AsRiverError(sc.decodeError(err)).Tag("method", "GetEntitlementDataByRoleId"),
				)
			}
			rawEntitlement := base.IEntitlementDataQueryableBaseEntitlementData{
				EntitlementType: entitlementType,
				EntitlementData: entitlementData,
			}
			marshalledEntitlement, err := types.MarshalEntitlement(ctx, rawEntitlement)
			if err != nil {
				return nil, fmt.Errorf(
					"error marshalling entitlement for role id %v from IEntitlement @ address %v: %w",
					iRoleBaseRole.Id.Uint64(),
					entitlement,
					err,
				)
			}
			marshalledEntitlements = append(marshalledEntitlements, marshalledEntitlement)
		}
		baseRoles[i] = types.BaseRole{
			Id:           iRoleBaseRole.Id,
			Name:         iRoleBaseRole.Name,
			Disabled:     iRoleBaseRole.Disabled,
			Permissions:  iRoleBaseRole.Permissions,
			Entitlements: marshalledEntitlements,
		}
	}
	return baseRoles, nil
}

func (sc *SpaceContractV3) IsMember(
	ctx context.Context,
	spaceId shared.StreamId,
	user common.Address,
) (bool, error) {
	membershipStatus, err := sc.GetMembershipStatus(ctx, spaceId, user)
	if err != nil {
		return false, err
	}

	return membershipStatus.IsMember && !membershipStatus.IsExpired, nil
}

func (sc *SpaceContractV3) GetMembershipStatus(
	ctx context.Context,
	spaceId shared.StreamId,
	user common.Address,
) (*MembershipStatus, error) {
	log := logging.FromCtx(ctx).With("function", "SpaceContractV3.GetMembershipStatus")
	space, err := sc.getSpace(ctx, spaceId)
	if err != nil {
		return nil, err
	}

	status := &MembershipStatus{
		IsMember:   false,
		IsExpired:  true,
		TokenIds:   []*big.Int{},
		ExpiryTime: nil,
		ExpiredAt:  nil,
	}

	spaceAsQueryable, err := base.NewErc721aQueryable(space.address, sc.backend)
	if err != nil {
		return nil, err
	}

	tokens, err := spaceAsQueryable.TokensOfOwner(&bind.CallOpts{Context: ctx}, user)
	if err != nil {
		return nil, AsRiverError(sc.decodeError(err)).Tag("method", "TokensOfOwner")
	}

	status.TokenIds = tokens
	status.IsMember = len(tokens) > 0

	if !status.IsMember {
		return status, nil
	}

	// Check expirations
	membership, err := base.NewMembership(space.address, sc.backend)
	if err != nil {
		status.IsExpired = false
		return status, nil
	}

	currentTime := big.NewInt(time.Now().Unix())

	// Track active and expired tokens
	var hasActiveToken bool
	var furthestExpiryTime *big.Int
	var mostRecentExpiry *big.Int

	for _, tokenId := range tokens {
		expiresAt, err := membership.ExpiresAt(&bind.CallOpts{Context: ctx}, tokenId)
		if err != nil {
			log.Warnw(
				"Failed to get expiration for token",
				"tokenId",
				tokenId,
				"error",
				AsRiverError(sc.decodeError(err)).Tag("method", "ExpiresAt"),
			)
			return nil, err
		}

		// Token never expires
		if expiresAt.Cmp(big.NewInt(0)) == 0 {
			hasActiveToken = true
			// If a token is permanent, use 0 to indicate it never expires
			if furthestExpiryTime == nil || furthestExpiryTime.Cmp(big.NewInt(0)) != 0 {
				furthestExpiryTime = big.NewInt(0)
			}
			continue
		}

		// Check if token is not expired yet
		if expiresAt.Cmp(currentTime) > 0 {
			hasActiveToken = true

			// Track the furthest future expiry
			if furthestExpiryTime == nil ||
				(furthestExpiryTime.Cmp(big.NewInt(0)) != 0 && expiresAt.Cmp(furthestExpiryTime) > 0) {
				furthestExpiryTime = expiresAt
			}
		} else {
			// This is an expired token
			if mostRecentExpiry == nil || expiresAt.Cmp(mostRecentExpiry) > 0 {
				mostRecentExpiry = expiresAt
			}
		}
	}

	status.IsExpired = !hasActiveToken
	status.ExpiryTime = furthestExpiryTime

	if status.IsExpired && mostRecentExpiry != nil {
		status.ExpiredAt = mostRecentExpiry
	}

	return status, nil
}

func (sc *SpaceContractV3) IsEntitledToSpace(
	ctx context.Context,
	spaceId shared.StreamId,
	user common.Address,
	permission Permission,
) (bool, error) {
	// get the space entitlements and check if user is entitled.
	space, err := sc.getSpace(ctx, spaceId)
	if err != nil {
		return false, err
	}
	isEntitled, err := space.managerContract.IsEntitledToSpace(
		&bind.CallOpts{Context: ctx},
		user,
		permission.String(),
	)
	if err != nil {
		return false, AsRiverError(sc.decodeError(err)).Tag("method", "IsEntitledToSpace")
	}
	return isEntitled, nil
}

func (sc *SpaceContractV3) marshalEntitlements(
	ctx context.Context,
	entitlementData []base.IEntitlementDataQueryableBaseEntitlementData,
) ([]types.Entitlement, error) {
	log := logging.FromCtx(ctx)
	entitlements := make([]types.Entitlement, len(entitlementData))

	for i, rawEntitlement := range entitlementData {
		entitlement, err := types.MarshalEntitlement(ctx, rawEntitlement)
		if err != nil {
			log.Warnw("Failed to marshal entitlement", "index", i, "error", err)
			return nil, AsRiverError(err)
		}
		entitlements[i] = entitlement
	}
	return entitlements, nil
}

func (sc *SpaceContractV3) IsBanned(
	ctx context.Context,
	spaceId shared.StreamId,
	tokenIds []*big.Int,
) (bool, error) {
	log := logging.FromCtx(ctx).With("function", "SpaceContractV3.IsBanned")
	space, err := sc.getSpace(ctx, spaceId)
	if err != nil {
		log.Warnw("Failed to get space", "space_id", spaceId, "error", err)
		return false, err
	}
	isBanned, err := space.banning.IsBanned(ctx, tokenIds)
	if err != nil {
		return false, AsRiverError(sc.decodeError(err)).Tag("method", "IsBanned")
	}
	return isBanned, nil
}

/**
 * GetChannelEntitlementsForPermission returns the entitlements for the given permission for a channel.
 * The entitlements are returned as a list of `Entitlement`s.
 * Each Entitlement object contains the entitlement type and the entitlement data.
 * The entitlement data is either a RuleEntitlement or a UserEntitlement.
 * The RuleEntitlement contains the rule data.
 * The UserEntitlement contains the list of user addresses.
 */
func (sc *SpaceContractV3) GetChannelEntitlementsForPermission(
	ctx context.Context,
	spaceId shared.StreamId,
	channelId shared.StreamId,
	permission Permission,
) ([]types.Entitlement, common.Address, error) {
	log := logging.FromCtx(ctx)
	// get the channel entitlements and check if user is entitled.
	space, err := sc.getSpace(ctx, spaceId)
	if err != nil {
		log.Warnw("Failed to get space", "space_id", spaceId, "error", err)
		return nil, EMPTY_ADDRESS, err
	}

	// get owner address - owner has all permissions
	spaceAsIerc5313, err := ierc5313.NewIerc5313(space.address, sc.backend)
	if err != nil {
		log.Warnw("Failed to get spaceAsIerc5313", "space_id", spaceId, "error", err)
		return nil, EMPTY_ADDRESS, err
	}

	owner, err := spaceAsIerc5313.Owner(&bind.CallOpts{Context: ctx})
	if err != nil {
		log.Warnw("Failed to get owner", "space_id", spaceId, "error", err)
		return nil, EMPTY_ADDRESS, AsRiverError(sc.decodeError(err)).Tag("method", "Owner")
	}

	entitlementData, err := space.queryContract.GetChannelEntitlementDataByPermission(
		&bind.CallOpts{Context: ctx},
		channelId,
		permission.String(),
	)
	if err != nil {
		return nil, EMPTY_ADDRESS, AsRiverError(
			sc.decodeError(err),
		).Tag("method", "GetChannelEntitlementDataByPermission")
	}

	log.Debugw(
		"Got channel entitlement data",
		"entitlement_data",
		entitlementData,
		"space_id",
		spaceId,
		"channel_id",
		channelId,
		"permission",
		permission.String(),
	)

	entitlements, err := sc.marshalEntitlements(ctx, entitlementData)
	if err != nil {
		return nil, EMPTY_ADDRESS, err
	}

	return entitlements, owner, nil
}

/**
 * GetSpaceEntitlementsForPermission returns the entitlements for the given permission.
 * The entitlements are returned as a list of `Entitlement`s.
 * Each Entitlement object contains the entitlement type and the entitlement data.
 * The entitlement data is either a RuleEntitlement or a UserEntitlement.
 * The RuleEntitlement contains the rule data.
 * The UserEntitlement contains the list of user addresses.
 * The owner of the space is also returned.
 */
func (sc *SpaceContractV3) GetSpaceEntitlementsForPermission(
	ctx context.Context,
	spaceId shared.StreamId,
	permission Permission,
) ([]types.Entitlement, common.Address, error) {
	log := logging.FromCtx(ctx)
	// get the space entitlements and check if user is entitled.
	space, err := sc.getSpace(ctx, spaceId)
	if err != nil {
		log.Warnw("Failed to get space", "space_id", spaceId, "error", err)
		return nil, EMPTY_ADDRESS, err
	}

	spaceAsIerc5313, err := ierc5313.NewIerc5313(space.address, sc.backend)
	if err != nil {
		log.Warnw("Failed to get spaceAsIerc5313", "space_id", spaceId, "error", err)
		return nil, EMPTY_ADDRESS, err
	}

	owner, err := spaceAsIerc5313.Owner(&bind.CallOpts{Context: ctx})
	if err != nil {
		log.Warnw("Failed to get owner", "space_id", spaceId, "error", err)
		return nil, EMPTY_ADDRESS, AsRiverError(sc.decodeError(err)).Tag("method", "Owner")
	}

	entitlementData, err := space.queryContract.GetEntitlementDataByPermission(
		&bind.CallOpts{Context: ctx},
		permission.String(),
	)
	log.Debugw(
		"Got entitlement data",
		"error",
		err,
		"entitlement_data",
		entitlementData,
		"space_id",
		spaceId,
		"permission",
		permission.String(),
	)
	if err != nil {
		return nil, EMPTY_ADDRESS, AsRiverError(sc.decodeError(err)).Tag("method", "GetEntitlementDataByPermission")
	}

	entitlements, err := sc.marshalEntitlements(ctx, entitlementData)
	if err != nil {
		return nil, EMPTY_ADDRESS, err
	}

	log.Debugw(
		"Returning entitlements",
		"entitlements",
		entitlements,
		"space_id",
		spaceId,
		"permission",
		permission.String(),
	)

	return entitlements, owner, nil
}

func (sc *SpaceContractV3) IsEntitledToChannel(
	ctx context.Context,
	spaceId shared.StreamId,
	channelId shared.StreamId,
	user common.Address,
	permission Permission,
) (bool, error) {
	// get the space entitlements and check if user is entitled to the channel
	space, err := sc.getSpace(ctx, spaceId)
	if err != nil {
		return false, err
	}
	// channel entitlement check
	isEntitled, err := space.managerContract.IsEntitledToChannel(
		&bind.CallOpts{Context: ctx},
		channelId,
		user,
		permission.String(),
	)
	if err != nil {
		return false, AsRiverError(sc.decodeError(err)).Tag("method", "IsEntitledToChannel")
	}

	return isEntitled, nil
}

func (sc *SpaceContractV3) IsSpaceDisabled(ctx context.Context, spaceId shared.StreamId) (bool, error) {
	space, err := sc.getSpace(ctx, spaceId)
	if err != nil {
		return false, err
	}

	isDisabled, err := space.pausable.Paused(&bind.CallOpts{Context: ctx})
	if err != nil {
		return false, AsRiverError(sc.decodeError(err)).Tag("method", "IsSpaceDisabled")
	}

	return isDisabled, nil
}

func (sc *SpaceContractV3) IsChannelDisabled(
	ctx context.Context,
	spaceId shared.StreamId,
	channelId shared.StreamId,
) (bool, error) {
	space, err := sc.getSpace(ctx, spaceId)
	if err != nil {
		return false, err
	}

	channel, err := space.channels.GetChannel(
		&bind.CallOpts{Context: ctx},
		channelId,
	)
	if err != nil {
		return false, AsRiverError(sc.decodeError(err)).Tag("method", "GetChannel")
	}

	return channel.Disabled, nil
}

func (sc *SpaceContractV3) IsAppEntitled(
	ctx context.Context,
	spaceId shared.StreamId,
	appClient common.Address,
	appAddress common.Address,
	permission Permission,
) (bool, error) {
	space, err := sc.getSpace(ctx, spaceId)
	if err != nil {
		return false, err
	}

	// Convert permission string to bytes32
	var permissionBytes [32]byte
	permissionStr := permission.String()
	copy(permissionBytes[:], []byte(permissionStr))

	isEntitled, err := space.appAccount.IsAppEntitled(
		&bind.CallOpts{Context: ctx},
		appAddress,
		appClient,
		permissionBytes,
	)
	if err != nil {
		return false, AsRiverError(sc.decodeError(err)).Tag("method", "IsAppEntitled")
	}

	return isEntitled, nil
}

func (sc *SpaceContractV3) decodeError(err error) error {
	ce, se, err := sc.decoder.DecodeEVMError(err)
	if ce != nil {
		return AsRiverError(ce, protocol.Err_CANNOT_CALL_CONTRACT)
	} else if se != nil {
		return AsRiverError(se, protocol.Err_CANNOT_CALL_CONTRACT)
	} else {
		return err
	}
}

func (sc *SpaceContractV3) IsAppInstalled(
	ctx context.Context,
	spaceId shared.StreamId,
	appAddress common.Address,
) (bool, error) {
	space, err := sc.getSpace(ctx, spaceId)
	if err != nil {
		return false, err
	}

	isInstalled, err := space.appAccount.IsAppInstalled(
		&bind.CallOpts{Context: ctx},
		appAddress,
	)
	if err != nil {
		return false, AsRiverError(sc.decodeError(err)).Tag("method", "IsAppInstalled")
	}

	return isInstalled, nil
}

func (sc *SpaceContractV3) getSpace(ctx context.Context, spaceId shared.StreamId) (*Space, error) {
	sc.spacesLock.Lock()
	defer sc.spacesLock.Unlock()
	if sc.spaces[spaceId] == nil {
		// use the networkId to fetch the space's contract address
		address, err := shared.AddressFromSpaceId(spaceId)
		if err != nil || address == EMPTY_ADDRESS {
			return nil, err
		}
		managerContract, err := base.NewEntitlementsManager(address, sc.backend)
		if err != nil {
			return nil, err
		}
		queryContract, err := base.NewEntitlementDataQueryable(address, sc.backend)
		if err != nil {
			return nil, err
		}
		rolesContract, err := base.NewIRoles(address, sc.backend)
		if err != nil {
			return nil, err
		}
		pausable, err := base.NewPausable(address, sc.backend)
		if err != nil {
			return nil, err
		}
		banning, err := NewBanning(ctx, sc.chainCfg, address, sc.backend)
		if err != nil {
			return nil, err
		}
		channels, err := base.NewChannels(address, sc.backend)
		if err != nil {
			return nil, err
		}
		appAccount, err := base.NewAppAccount(address, sc.backend)
		if err != nil {
			return nil, err
		}

		// cache the space
		sc.spaces[spaceId] = &Space{
			address:         address,
			managerContract: managerContract,
			queryContract:   queryContract,
			rolesContract:   rolesContract,
			banning:         banning,
			pausable:        pausable,
			channels:        channels,
			appAccount:      appAccount,
		}
	}
	return sc.spaces[spaceId], nil
}
