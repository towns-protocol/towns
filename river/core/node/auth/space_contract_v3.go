package auth

import (
	"context"
	"encoding/json"
	"math/big"
	"strings"
	"sync"

	. "github.com/river-build/river/core/node/base"
	"github.com/river-build/river/core/node/contracts/base"
	"github.com/river-build/river/core/node/dlog"
	. "github.com/river-build/river/core/node/protocol"

	"github.com/river-build/river/core/node/config"
	"github.com/river-build/river/core/node/shared"
	"github.com/river-build/river/core/xchain/bindings/erc721"
	"github.com/river-build/river/core/xchain/bindings/ierc5313"
	"github.com/river-build/river/core/xchain/contracts"
	v3 "github.com/river-build/river/core/xchain/contracts/v3"

	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
)

type Space struct {
	address      common.Address
	entitlements Entitlements
	banning      Banning
	pausable     Pausable
	channels     map[shared.StreamId]Channels
	channelsLock sync.Mutex
}

type SpaceContractV3 struct {
	architect  Architect
	chainCfg   *config.ChainConfig
	version    string
	backend    bind.ContractBackend
	spaces     map[shared.StreamId]*Space
	spacesLock sync.Mutex
}

var EMPTY_ADDRESS = common.Address{}

func NewSpaceContractV3(
	ctx context.Context,
	architectCfg *config.ContractConfig,
	chainCfg *config.ChainConfig,
	backend bind.ContractBackend,
	// walletLinkingCfg *config.ContractConfig,
) (SpaceContract, error) {
	architect, err := NewArchitect(ctx, architectCfg, backend)
	if err != nil {
		return nil, err
	}

	spaceContract := &SpaceContractV3{
		architect: architect,
		chainCfg:  chainCfg,
		version:   architectCfg.Version,
		backend:   backend,
		spaces:    make(map[shared.StreamId]*Space),
	}

	return spaceContract, nil
}

func (sc *SpaceContractV3) IsMember(
	ctx context.Context,
	spaceId shared.StreamId,
	user common.Address,
) (bool, error) {
	space, err := sc.getSpace(ctx, spaceId)
	if err != nil || space == nil {
		return false, err
	}

	spaceAsErc271, err := erc721.NewErc721(space.address, sc.backend)
	if err != nil {
		return false, err
	}

	isMember, err := spaceAsErc271.BalanceOf(nil, user)
	if err != nil {
		return false, err
	}
	return isMember.Cmp(big.NewInt(0)) > 0, err
}

func (sc *SpaceContractV3) IsEntitledToSpace(
	ctx context.Context,
	spaceId shared.StreamId,
	user common.Address,
	permission Permission,
) (bool, error) {
	// get the space entitlements and check if user is entitled.
	space, err := sc.getSpace(ctx, spaceId)
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

var (
	parsedABI abi.ABI
	once      sync.Once
)

func getABI() (abi.ABI, error) {
	var err error
	once.Do(func() {
		parsedABI, err = abi.JSON(strings.NewReader(v3.IEntitlementGatedMetaData.ABI))
	})
	return parsedABI, err
}

func (sc *SpaceContractV3) marshalEntitlements(
	ctx context.Context,
	entitlementData []base.IEntitlementDataQueryableBaseEntitlementData,
) ([]Entitlement, error) {
	log := dlog.FromCtx(ctx)
	entitlements := make([]Entitlement, len(entitlementData))

	for i, entitlement := range entitlementData {
		if entitlement.EntitlementType == "RuleEntitlement" {
			entitlements[i].entitlementType = entitlement.EntitlementType
			log.Info("Entitlement data", "entitlement_data", entitlement.EntitlementData)
			// Parse the ABI definition
			parsedABI, err := getABI()
			if err != nil {
				log.Error("Failed to parse ABI", "error", err)
				return nil, err
			}

			var ruleData contracts.IRuleData

			unpackedData, err := parsedABI.Unpack("getRuleData", entitlement.EntitlementData)
			if err != nil {
				log.Warn(
					"Failed to unpack rule data",
					"error",
					err,
					"entitlement",
					entitlement,
					"entitlement_data",
					entitlement.EntitlementData,
					"len(entitlement.EntitlementData)",
					len(entitlement.EntitlementData),
				)
			}

			if len(unpackedData) > 0 {
				// Marshal into JSON, because for some UnpackIntoInterface doesn't work when unpacking diretly into a struct
				jsonData, err := json.Marshal(unpackedData[0])
				if err != nil {
					log.Warn("Failed to marshal data to JSON", "error", err, "unpackedData", unpackedData)
				}

				err = json.Unmarshal(jsonData, &ruleData)
				if err != nil {
					log.Warn(
						"Failed to unmarshal JSON to struct",
						"error",
						err,
						"jsonData",
						jsonData,
						"ruleData",
						ruleData,
					)
				}
			} else {
				log.Warn("No data unpacked", "unpackedData", unpackedData)
			}

			entitlements[i].ruleEntitlement = &ruleData

		} else if entitlement.EntitlementType == "UserEntitlement" {
			entitlements[i].entitlementType = entitlement.EntitlementType
			abiDef := `[{"name":"getAddresses","outputs":[{"type":"address[]","name":"out"}],"constant":true,"payable":false,"type":"function"}]`

			// Parse the ABI definition
			parsedABI, err := abi.JSON(strings.NewReader(abiDef))
			if err != nil {
				return nil, err
			}
			var addresses []common.Address
			// Unpack the data
			err = parsedABI.UnpackIntoInterface(&addresses, "getAddresses", entitlement.EntitlementData)
			if err != nil {
				return nil, err
			}
			entitlements[i].userEntitlement = addresses
		} else {
			return nil, RiverError(Err_UNKNOWN, "Invalid entitlement type").Tag("entitlement_type", entitlement.EntitlementType)
		}
	}
	return entitlements, nil
}

func (sc *SpaceContractV3) IsBanned(
	ctx context.Context,
	spaceId shared.StreamId,
	linkedWallets []common.Address,
) (bool, error) {
	log := dlog.FromCtx(ctx).With("function", "SpaceContractV3.IsBanned")
	space, err := sc.getSpace(ctx, spaceId)
	if err != nil || space == nil {
		log.Warn("Failed to get space", "space_id", spaceId, "error", err)
		return false, err
	}
	return space.banning.IsBanned(ctx, linkedWallets)
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
) ([]Entitlement, common.Address, error) {
	log := dlog.FromCtx(ctx)
	// get the channel entitlements and check if user is entitled.
	space, err := sc.getSpace(ctx, spaceId)
	if err != nil || space == nil {
		log.Warn("Failed to get space", "space_id", spaceId, "error", err)
		return nil, EMPTY_ADDRESS, err
	}

	// get owner address - owner has all permissions
	spaceAsIerc5313, err := ierc5313.NewIerc5313(space.address, sc.backend)
	if err != nil {
		log.Warn("Failed to get spaceAsIerc5313", "space_id", spaceId, "error", err)
		return nil, EMPTY_ADDRESS, err
	}

	owner, err := spaceAsIerc5313.Owner(nil)
	if err != nil {
		log.Warn("Failed to get owner", "space_id", spaceId, "error", err)
		return nil, EMPTY_ADDRESS, err
	}

	entitlementData, err := space.entitlements.GetChannelEntitlementDataByPermission(
		nil,
		channelId,
		permission.String(),
	)
	log.Info(
		"Got channel entitlement data",
		"err",
		err,
		"entitlement_data",
		entitlementData,
		"space_id",
		spaceId,
		"channel_id",
		channelId,
		"permission",
		permission.String(),
	)
	if err != nil {
		return nil, EMPTY_ADDRESS, err
	}

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
) ([]Entitlement, common.Address, error) {
	log := dlog.FromCtx(ctx)
	// get the space entitlements and check if user is entitled.
	space, err := sc.getSpace(ctx, spaceId)
	if err != nil || space == nil {
		log.Warn("Failed to get space", "space_id", spaceId, "error", err)
		return nil, EMPTY_ADDRESS, err
	}

	spaceAsIerc5313, err := ierc5313.NewIerc5313(space.address, sc.backend)
	if err != nil {
		log.Warn("Failed to get spaceAsIerc5313", "space_id", spaceId, "error", err)
		return nil, EMPTY_ADDRESS, err
	}

	owner, err := spaceAsIerc5313.Owner(nil)
	if err != nil {
		log.Warn("Failed to get owner", "space_id", spaceId, "error", err)
		return nil, EMPTY_ADDRESS, err
	}

	entitlementData, err := space.entitlements.GetEntitlementDataByPermission(
		nil,
		permission.String(),
	)
	log.Info(
		"Got entitlement data",
		"err",
		err,
		"entitlement_data",
		entitlementData,
		"space_id",
		spaceId,
		"permission",
		permission.String(),
	)
	if err != nil {
		return nil, EMPTY_ADDRESS, err
	}

	entitlements, err := sc.marshalEntitlements(ctx, entitlementData)
	if err != nil {
		return nil, EMPTY_ADDRESS, err
	}

	log.Debug(
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
	if err != nil || space == nil {
		return false, err
	}
	// channel entitlement check
	isEntitled, err := space.entitlements.IsEntitledToChannel(
		nil,
		channelId,
		user,
		permission.String(),
	)
	return isEntitled, err
}

func (sc *SpaceContractV3) IsSpaceDisabled(ctx context.Context, spaceId shared.StreamId) (bool, error) {
	space, err := sc.getSpace(ctx, spaceId)
	if err != nil || space == nil {
		return false, err
	}

	isDisabled, err := space.pausable.Paused(nil)
	return isDisabled, err
}

func (sc *SpaceContractV3) IsChannelDisabled(
	ctx context.Context,
	spaceId shared.StreamId,
	channelId shared.StreamId,
) (bool, error) {
	channel, err := sc.getChannel(ctx, spaceId, channelId)
	if err != nil || channel == nil {
		return false, err
	}
	isDisabled, err := channel.IsDisabled(nil, channelId)
	return isDisabled, err
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
		entitlements, err := NewEntitlements(ctx, sc.version, address, sc.backend)
		if err != nil {
			return nil, err
		}
		pausable, err := NewPausable(ctx, sc.version, address, sc.backend)
		if err != nil {
			return nil, err
		}
		banning, err := NewBanning(ctx, sc.chainCfg, sc.version, address, sc.backend)
		if err != nil {
			return nil, err
		}

		// cache the space
		sc.spaces[spaceId] = &Space{
			address:      address,
			entitlements: entitlements,
			banning:      banning,
			pausable:     pausable,
			channels:     make(map[shared.StreamId]Channels),
		}
	}
	return sc.spaces[spaceId], nil
}

func (sc *SpaceContractV3) getChannel(
	ctx context.Context,
	spaceId shared.StreamId,
	channelId shared.StreamId,
) (Channels, error) {
	space, err := sc.getSpace(ctx, spaceId)
	if err != nil || space == nil {
		return nil, err
	}
	space.channelsLock.Lock()
	defer space.channelsLock.Unlock()
	if space.channels[channelId] == nil {
		channel, err := NewChannels(ctx, sc.version, space.address, sc.backend)
		if err != nil {
			return nil, err
		}
		space.channels[channelId] = channel
	}
	return space.channels[channelId], nil
}
