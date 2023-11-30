package auth

import (
	"casablanca/node/auth/contracts/base_goerli_towns_pausable"
	"casablanca/node/auth/contracts/localhost_towns_pausable"
	"casablanca/node/dlog"
	"casablanca/node/infra"
	"casablanca/node/protocol"
	"context"
	"time"

	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/ethclient"

	. "casablanca/node/base"
)

type TownsPausable interface {
	Paused(callOpts *bind.CallOpts) (bool, error)
}

type TownsPausableProxy struct {
	address  common.Address
	contract TownsPausable
}

var (
	pausedCalls = infra.NewSuccessMetrics("paused_calls", contractCalls)
)

func NewTownsPausable(address common.Address, ethClient *ethclient.Client, chainId int) (TownsPausable, error) {
	var towns_pausable_contract TownsPausable
	var err error
	switch chainId {
	case infra.CHAIN_ID_LOCALHOST:
		towns_pausable_contract, err = localhost_towns_pausable.NewLocalhostTownsPausable(address, ethClient)
	case infra.CHAIN_ID_BASE_GOERLI:
		towns_pausable_contract, err = base_goerli_towns_pausable.NewBaseGoerliTownsPausable(address, ethClient)

	default:
		return nil, RiverError(protocol.Err_CANNOT_CONNECT, "unsupported chain", "chainId", chainId)
	}
	if err != nil {
		return nil, WrapRiverError(protocol.Err_CANNOT_CONNECT, err)
	}
	return towns_pausable_contract, nil
}

func NewTownsPausableProxy(contract TownsPausable, address common.Address) TownsPausable {
	return &TownsPausableProxy{
		contract: contract,
		address:  address,
	}
}

func (proxy *TownsPausableProxy) Paused(callOpts *bind.CallOpts) (bool, error) {
	log := dlog.CtxLog(context.Background())
	start := time.Now()
	defer infra.StoreExecutionTimeMetrics("Paused", infra.CONTRACT_CALLS_CATEGORY, start)
	log.Debug("Paused", "address", proxy.address)
	result, err := proxy.contract.Paused(callOpts)
	if err != nil {
		pausedCalls.FailInc()
		log.Error("Paused", "address", proxy.address, "error", err)
		return false, WrapRiverError(protocol.Err_CANNOT_CALL_CONTRACT, err)
	}
	pausedCalls.PassInc()
	log.Debug("Paused", "address", proxy.address, "result", result, "duration", time.Since(start).Milliseconds())
	return result, nil
}
