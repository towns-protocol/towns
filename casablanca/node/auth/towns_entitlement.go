package auth

import (
	"casablanca/node/auth/contracts/base_goerli_towns_entitlements"
	"casablanca/node/auth/contracts/localhost_towns_entitlements"
	"casablanca/node/dlog"
	"casablanca/node/infra"
	"casablanca/node/protocol"
	"context"

	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/ethclient"

	. "casablanca/node/base"
)

type TownsEntitlements interface {
	IsEntitledToChannel(opts *bind.CallOpts, channelNetworkId string, user common.Address, permission string) (bool, error)
	IsEntitledToTown(opts *bind.CallOpts, user common.Address, permission string) (bool, error)
}

type TownsEntitlementsProxy struct {
	contract TownsEntitlements
	address  common.Address
}

var (
	isEntitledToChannelCalls = infra.NewSuccessMetrics("is_entitled_to_channel_calls", contractCalls)
	isEntitledToTownCalls    = infra.NewSuccessMetrics("is_entitled_to_town_calls", contractCalls)
)

func NewTownsEntitlements(address common.Address, ethClient *ethclient.Client, chainId int) (TownsEntitlements, error) {
	var towns_entitlement_contract TownsEntitlements
	var err error
	switch chainId {
	case infra.CHAIN_ID_LOCALHOST:
		towns_entitlement_contract, err = localhost_towns_entitlements.NewLocalhostTownsEntitlements(address, ethClient)
	case infra.CHAIN_ID_BASE_GOERLI:
		towns_entitlement_contract, err = base_goerli_towns_entitlements.NewBaseGoerliTownsEntitlements(address, ethClient)
	default:
		return nil, RiverError(protocol.Err_CANNOT_CONNECT, "unsupported chain", "chainId", chainId)
	}
	if err != nil {
		return nil, WrapRiverError(protocol.Err_CANNOT_CONNECT, err)
	}

	return NewTownsEntitlementsProxy(towns_entitlement_contract, address), nil
}

func NewTownsEntitlementsProxy(contract TownsEntitlements, address common.Address) TownsEntitlements {
	return &TownsEntitlementsProxy{
		contract: contract,
		address:  address,
	}
}

func (proxy *TownsEntitlementsProxy) IsEntitledToChannel(opts *bind.CallOpts, channelNetworkId string, user common.Address, permission string) (bool, error) {
	log := dlog.CtxLog(context.Background())
	log.Debug("IsEntitledToChannel", "channelNetworkId", channelNetworkId, "user", user, "permission", permission, "address", proxy.address)
	result, err := proxy.contract.IsEntitledToChannel(opts, channelNetworkId, user, permission)
	if err != nil {
		isEntitledToChannelCalls.Fail()
		log.Error("IsEntitledToChannel", "channelNetworkId", channelNetworkId, "user", user, "permission", permission, "address", proxy.address, "error", err)
		return false, WrapRiverError(protocol.Err_CANNOT_CALL_CONTRACT, err)
	}
	isEntitledToChannelCalls.Pass()
	log.Debug("IsEntitledToChannel", "channelNetworkId", channelNetworkId, "user", user, "permission", permission, "address", proxy.address, "result", result)
	return result, nil
}

func (proxy *TownsEntitlementsProxy) IsEntitledToTown(opts *bind.CallOpts, user common.Address, permission string) (bool, error) {
	log := dlog.CtxLog(context.Background())
	log.Debug("IsEntitledToTown", "user", user, "permission", permission, "address", proxy.address)
	result, err := proxy.contract.IsEntitledToTown(opts, user, permission)
	if err != nil {
		isEntitledToTownCalls.Fail()
		log.Error("IsEntitledToTown", "user", user, "permission", permission, "address", proxy.address, "error", err)
		return false, WrapRiverError(protocol.Err_CANNOT_CALL_CONTRACT, err)
	}
	isEntitledToTownCalls.Pass()
	log.Debug("IsEntitledToTown", "user", user, "permission", permission, "address", proxy.address, "result", result)
	return result, nil
}
