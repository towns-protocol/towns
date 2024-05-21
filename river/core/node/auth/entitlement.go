package auth

import (
	"context"
	"time"

	. "github.com/river-build/river/core/node/base"
	"github.com/river-build/river/core/node/contracts/base"
	"github.com/river-build/river/core/node/dlog"
	"github.com/river-build/river/core/node/infra"
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
}
type entitlementsProxy struct {
	managerContract *base.EntitlementsManager
	queryContract   *base.EntitlementDataQueryable
	address         common.Address
	ctx             context.Context
}

var (
	isEntitledToChannelCalls             = infra.NewSuccessMetrics("is_entitled_to_channel_calls", contractCalls)
	isEntitledToSpaceCalls               = infra.NewSuccessMetrics("is_entitled_to_space_calls", contractCalls)
	getEntitlementDataByPermissionsCalls = infra.NewSuccessMetrics(
		"get_entitlement_data_by_permissions_calls",
		contractCalls,
	)
)

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
	start := time.Now()
	defer infra.StoreExecutionTimeMetrics("IsEntitledToChannel", infra.CONTRACT_CALLS_CATEGORY, start)
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
		isEntitledToChannelCalls.FailInc()
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
	isEntitledToChannelCalls.PassInc()
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
		"duration",
		time.Since(start).Milliseconds(),
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
	defer infra.StoreExecutionTimeMetrics("IsEntitledToSpace", infra.CONTRACT_CALLS_CATEGORY, start)
	log.Debug("IsEntitledToSpace", "user", user, "permission", permission, "address", proxy.address)
	result, err := proxy.managerContract.IsEntitledToSpace(opts, user, permission)
	if err != nil {
		isEntitledToSpaceCalls.FailInc()
		log.Error("IsEntitledToSpace", "user", user, "permission", permission, "address", proxy.address, "error", err)
		return false, WrapRiverError(Err_CANNOT_CALL_CONTRACT, err)
	}
	isEntitledToSpaceCalls.PassInc()
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

func (proxy *entitlementsProxy) GetEntitlementDataByPermission(
	opts *bind.CallOpts,
	permission string,
) ([]base.IEntitlementDataQueryableBaseEntitlementData, error) {
	log := dlog.FromCtx(proxy.ctx)
	start := time.Now()
	defer infra.StoreExecutionTimeMetrics("GetEntitlementDataByPermissions", infra.CONTRACT_CALLS_CATEGORY, start)
	log.Debug("GetEntitlementDataByPermissions", "permission", permission, "address", proxy.address)
	result, err := proxy.queryContract.GetEntitlementDataByPermission(opts, permission)
	if err != nil {
		getEntitlementDataByPermissionsCalls.FailInc()
		log.Error("GetEntitlementDataByPermissions", "permission", permission, "address", proxy.address, "error", err)
		return nil, WrapRiverError(Err_CANNOT_CALL_CONTRACT, err)
	}
	getEntitlementDataByPermissionsCalls.PassInc()
	log.Debug(
		"GetEntitlementDataByPermissions",
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
