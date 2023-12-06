package auth

import (
	"casablanca/node/config"
	"casablanca/node/contracts"
	"casablanca/node/contracts/dev"
	v3 "casablanca/node/contracts/v3"
	"casablanca/node/crypto"
	"casablanca/node/dlog"
	"casablanca/node/infra"
	. "casablanca/node/protocol"
	"context"
	"time"

	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"

	. "casablanca/node/base"
)

type TownsArchitect interface {
	GetTownById(opts *bind.CallOpts, townId string) (common.Address, error)
}

type townsArchitectProxy struct {
	contract TownsArchitect
	address  common.Address
}

var (
	getTownByIdCalls = infra.NewSuccessMetrics("towns_architect_calls", contractCalls)
)

func NewTownsArchitect(cfg *config.ContractConfig, backend bind.ContractBackend) (TownsArchitect, error) {
	address, err := crypto.ParseOrLoadAddress(cfg.Address)
	if err != nil {
		return nil, AsRiverError(err, Err_BAD_CONFIG).Message("Failed to parse contract address").Func("NewTownsArchitect")
	}
	var c TownsArchitect
	switch cfg.Version {
	case contracts.DEV:
		c, err = dev.NewTownArchitect(address, backend)
	case contracts.V3:
		c, err = v3.NewTownsArchitect(address, backend)
	}
	if err != nil {
		return nil, WrapRiverError(Err_CANNOT_CONNECT, err).Tags("address", cfg.Address, "version", cfg.Version).Func("NewTownsArchitect").Message("Failed to initialize contract")
	}
	if c == nil {
		return nil, RiverError(Err_CANNOT_CONNECT, "Unsupported version", "version", cfg.Version, "address", cfg.Address).Func("NewTownsArchitect")
	}
	return &townsArchitectProxy{
		contract: c,
		address:  address,
	}, nil
}

func (proxy *townsArchitectProxy) GetTownById(opts *bind.CallOpts, townId string) (common.Address, error) {
	log := dlog.CtxLog(context.Background())
	start := time.Now()
	defer infra.StoreExecutionTimeMetrics("GetTownById", infra.CONTRACT_CALLS_CATEGORY, start)
	log.Debug("GetTownById", "address", proxy.address, "networkId", townId)
	result, err := proxy.contract.GetTownById(opts, townId)
	if err != nil {
		log.Error("GetTownById", "address", proxy.address, "networkId", townId, "error", err)
		getTownByIdCalls.FailInc()
		return common.Address{}, WrapRiverError(Err_CANNOT_CALL_CONTRACT, err)
	}
	getTownByIdCalls.PassInc()
	log.Debug("GetTownById", "address", proxy.address, "networkId", townId, "result", result, "duration", time.Since(start).Milliseconds())
	return result, nil
}
