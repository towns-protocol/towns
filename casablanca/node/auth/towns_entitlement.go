package auth

import (
	. "casablanca/node/base"
	"casablanca/node/contracts"
	"casablanca/node/contracts/dev"
	v3 "casablanca/node/contracts/v3"
	"casablanca/node/dlog"
	"casablanca/node/infra"
	. "casablanca/node/protocol"
	"context"
	"time"

	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
)

type TownsEntitlements interface {
	IsEntitledToChannel(opts *bind.CallOpts, channelNetworkId string, user common.Address, permission string) (bool, error)
	IsEntitledToTown(opts *bind.CallOpts, user common.Address, permission string) (bool, error)
}

type townsEntitlementsProxy struct {
	contract TownsEntitlements
	address  common.Address
}

var (
	isEntitledToChannelCalls = infra.NewSuccessMetrics("is_entitled_to_channel_calls", contractCalls)
	isEntitledToTownCalls    = infra.NewSuccessMetrics("is_entitled_to_town_calls", contractCalls)
)

func NewTownsEntitlements(version string, address common.Address, backend bind.ContractBackend) (TownsEntitlements, error) {
	var c TownsEntitlements
	var err error
	switch version {
	case contracts.DEV:
		c, err = dev.NewEntitlementsManager(address, backend)
	case contracts.V3:
		c, err = v3.NewTownsEntitlements(address, backend)
	}
	if err != nil {
		return nil, WrapRiverError(Err_CANNOT_CONNECT, err).Tags("address", address, "version", version).Func("NewTownsEntitlements").Message("Failed to initialize contract")
	}
	if c == nil {
		return nil, RiverError(Err_CANNOT_CONNECT, "Unsupported version", "address", address, "version", version).Func("NewTownsEntitlements")
	}
	return &townsEntitlementsProxy{
		contract: c,
		address:  address,
	}, nil
}

func (proxy *townsEntitlementsProxy) IsEntitledToChannel(opts *bind.CallOpts, channelNetworkId string, user common.Address, permission string) (bool, error) {
	log := dlog.CtxLog(context.Background())
	start := time.Now()
	defer infra.StoreExecutionTimeMetrics("IsEntitledToChannel", infra.CONTRACT_CALLS_CATEGORY, start)
	log.Debug("IsEntitledToChannel", "channelNetworkId", channelNetworkId, "user", user, "permission", permission, "address", proxy.address)
	result, err := proxy.contract.IsEntitledToChannel(opts, channelNetworkId, user, permission)
	if err != nil {
		isEntitledToChannelCalls.FailInc()
		log.Error("IsEntitledToChannel", "channelNetworkId", channelNetworkId, "user", user, "permission", permission, "address", proxy.address, "error", err)
		return false, WrapRiverError(Err_CANNOT_CALL_CONTRACT, err)
	}
	isEntitledToChannelCalls.PassInc()
	log.Debug("IsEntitledToChannel", "channelNetworkId", channelNetworkId, "user", user, "permission", permission, "address", proxy.address, "result", result, "duration", time.Since(start).Milliseconds())
	return result, nil
}

func (proxy *townsEntitlementsProxy) IsEntitledToTown(opts *bind.CallOpts, user common.Address, permission string) (bool, error) {
	log := dlog.CtxLog(context.Background())
	start := time.Now()
	defer infra.StoreExecutionTimeMetrics("IsEntitledToTown", infra.CONTRACT_CALLS_CATEGORY, start)
	log.Debug("IsEntitledToTown", "user", user, "permission", permission, "address", proxy.address)
	result, err := proxy.contract.IsEntitledToTown(opts, user, permission)
	if err != nil {
		isEntitledToTownCalls.FailInc()
		log.Error("IsEntitledToTown", "user", user, "permission", permission, "address", proxy.address, "error", err)
		return false, WrapRiverError(Err_CANNOT_CALL_CONTRACT, err)
	}
	isEntitledToTownCalls.PassInc()
	log.Debug("IsEntitledToTown", "user", user, "permission", permission, "address", proxy.address, "result", result, "duration", time.Since(start).Milliseconds())
	return result, nil
}
