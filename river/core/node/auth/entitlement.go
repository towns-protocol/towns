package auth

import (
	"context"
	"time"

	. "github.com/river-build/river/core/node/base"
	"github.com/river-build/river/core/node/contracts/base"
	"github.com/river-build/river/core/node/dlog"
	. "github.com/river-build/river/core/node/protocol"

	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
)

type Entitlements interface {
	IsEntitledToChannel(opts *bind.CallOpts, channelId [32]byte, user common.Address, permission string) (bool, error)
	IsEntitledToSpace(opts *bind.CallOpts, user common.Address, permission string) (bool, error)
	GetEntitlementDataByPermission(
		opts *bind.CallOpts,
		permission string,
	) ([]base.IEntitlementDataQueryableBaseEntitlementData, error)
	GetChannelEntitlementDataByPermission(
		opts *bind.CallOpts,
		channelId [32]byte,
		permission string,
	) ([]base.IEntitlementDataQueryableBaseEntitlementData, error)
}
type entitlementsProxy struct {
	managerContract *base.EntitlementsManager
	queryContract   *base.EntitlementDataQueryable
	address         common.Address
	ctx             context.Context
}

func NewEntitlements(
	ctx context.Context,
	version string,
	address common.Address,
	backend bind.ContractBackend,
) (Entitlements, error) {
	managerContract, err := base.NewEntitlementsManager(address, backend)
	if err != nil {
		return nil, WrapRiverError(
			Err_CANNOT_CONNECT,
			err,
		).Tags("address", address, "version", version, "contract", "EntitlementsManager").
			Func("NewEntitlements").
			Message("Failed to initialize contract")
	}
	queryContract, err := base.NewEntitlementDataQueryable(address, backend)
	if err != nil {
		return nil, WrapRiverError(
			Err_CANNOT_CONNECT,
			err,
		).Tags("address", address, "version", version, "contract", "EntitlementDataQueryable").
			Func("NewEntitlements").
			Message("Failed to initialize contract")
	}
	return &entitlementsProxy{
		managerContract: managerContract,
		queryContract:   queryContract,
		address:         address,
		ctx:             ctx,
	}, nil
}

func (proxy *entitlementsProxy) IsEntitledToChannel(
	opts *bind.CallOpts,
	channelId [32]byte,
	user common.Address,
	permission string,
) (bool, error) {
	log := dlog.FromCtx(proxy.ctx)
	log.Debug(
		"IsEntitledToChannel",
		"channelId",
		channelId,
		"user",
		user,
		"permission",
		permission,
		"address",
		proxy.address,
	)
	result, err := proxy.managerContract.IsEntitledToChannel(opts, channelId, user, permission)
	if err != nil {
		log.Error(
			"IsEntitledToChannel",
			"channelId",
			channelId,
			"user",
			user,
			"permission",
			permission,
			"address",
			proxy.address,
			"error",
			err,
		)
		return false, WrapRiverError(Err_CANNOT_CALL_CONTRACT, err)
	}
	log.Debug(
		"IsEntitledToChannel",
		"channelId",
		channelId,
		"user",
		user,
		"permission",
		permission,
		"address",
		proxy.address,
		"result",
		result,
	)
	return result, nil
}

func (proxy *entitlementsProxy) IsEntitledToSpace(
	opts *bind.CallOpts,
	user common.Address,
	permission string,
) (bool, error) {
	log := dlog.FromCtx(proxy.ctx)
	start := time.Now()
	log.Debug("IsEntitledToSpace", "user", user, "permission", permission, "address", proxy.address)
	result, err := proxy.managerContract.IsEntitledToSpace(opts, user, permission)
	if err != nil {
		log.Error("IsEntitledToSpace", "user", user, "permission", permission, "address", proxy.address, "error", err)
		return false, WrapRiverError(Err_CANNOT_CALL_CONTRACT, err)
	}
	log.Debug(
		"IsEntitledToSpace",
		"user",
		user,
		"permission",
		permission,
		"address",
		proxy.address,
		"result",
		result,
		"duration",
		time.Since(start).Milliseconds(),
	)
	return result, nil
}

func (proxy *entitlementsProxy) GetChannelEntitlementDataByPermission(
	opts *bind.CallOpts,
	channelId [32]byte,
	permission string,
) ([]base.IEntitlementDataQueryableBaseEntitlementData, error) {
	log := dlog.FromCtx(proxy.ctx)
	start := time.Now()
	log.Debug(
		"GetChannelEntitlementDataByPermissions",
		"channelId",
		channelId,
		"permission",
		permission,
		"address",
		proxy.address,
	)
	result, err := proxy.queryContract.GetChannelEntitlementDataByPermission(opts, channelId, permission)
	if err != nil {
		log.Error(
			"GetChannelEntitlementDataByPermissions",
			"channelId",
			channelId,
			"permission",
			permission,
			"address",
			proxy.address,
			"error",
			err,
		)
		return nil, WrapRiverError(Err_CANNOT_CALL_CONTRACT, err)
	}
	log.Debug(
		"GetChannelEntitlementDataByPermissions",
		"channelId",
		channelId,
		"permission",
		permission,
		"address",
		proxy.address,
		"result",
		result,
		"duration",
		time.Since(start).Milliseconds(),
	)
	return result, nil
}

func (proxy *entitlementsProxy) GetEntitlementDataByPermission(
	opts *bind.CallOpts,
	permission string,
) ([]base.IEntitlementDataQueryableBaseEntitlementData, error) {
	log := dlog.FromCtx(proxy.ctx)
	log.Debug("GetEntitlementDataByPermissions", "permission", permission, "address", proxy.address)
	result, err := proxy.queryContract.GetEntitlementDataByPermission(opts, permission)
	if err != nil {
		log.Error("GetEntitlementDataByPermissions", "permission", permission, "address", proxy.address, "error", err)
		return nil, WrapRiverError(Err_CANNOT_CALL_CONTRACT, err)
	}
	log.Debug(
		"GetEntitlementDataByPermissions",
		"permission",
		permission,
		"address",
		proxy.address,
		"result",
		result,
	)
	return result, nil
}
