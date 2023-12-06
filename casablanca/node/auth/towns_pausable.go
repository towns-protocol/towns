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

type TownsPausable interface {
	Paused(callOpts *bind.CallOpts) (bool, error)
}

type townsPausableProxy struct {
	address  common.Address
	contract TownsPausable
}

var (
	pausedCalls = infra.NewSuccessMetrics("paused_calls", contractCalls)
)

func NewTownsPausable(version string, address common.Address, backend bind.ContractBackend) (TownsPausable, error) {
	var c TownsPausable
	var err error
	switch version {
	case contracts.DEV:
		c, err = dev.NewPausable(address, backend)
	case contracts.V3:
		c, err = v3.NewTownsPausable(address, backend)
	}
	if err != nil {
		return nil, WrapRiverError(Err_CANNOT_CONNECT, err).Tags("address", address, "version", version).Func("NewTownsPausable").Message("Failed to initialize contract")
	}
	if c == nil {
		return nil, RiverError(Err_CANNOT_CONNECT, "Unsupported version", "address", address, "version", version).Func("NewTownsPausable")
	}
	return &townsPausableProxy{
		contract: c,
		address:  address,
	}, nil
}

func (proxy *townsPausableProxy) Paused(callOpts *bind.CallOpts) (bool, error) {
	log := dlog.CtxLog(context.Background())
	start := time.Now()
	defer infra.StoreExecutionTimeMetrics("Paused", infra.CONTRACT_CALLS_CATEGORY, start)
	log.Debug("Paused", "address", proxy.address)
	result, err := proxy.contract.Paused(callOpts)
	if err != nil {
		pausedCalls.FailInc()
		log.Error("Paused", "address", proxy.address, "error", err)
		return false, WrapRiverError(Err_CANNOT_CALL_CONTRACT, err)
	}
	pausedCalls.PassInc()
	log.Debug("Paused", "address", proxy.address, "result", result, "duration", time.Since(start).Milliseconds())
	return result, nil
}
