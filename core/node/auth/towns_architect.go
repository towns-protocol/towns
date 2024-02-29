package auth

import (
	"context"
	"time"

	"github.com/river-build/river/core/node/config"
	"github.com/river-build/river/core/node/contracts"
	"github.com/river-build/river/core/node/contracts/dev"
	v3 "github.com/river-build/river/core/node/contracts/v3"
	"github.com/river-build/river/core/node/crypto"
	"github.com/river-build/river/core/node/dlog"
	"github.com/river-build/river/core/node/infra"
	. "github.com/river-build/river/core/node/protocol"

	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"

	. "github.com/river-build/river/core/node/base"
)

type TownsArchitect interface {
	GetSpaceById(opts *bind.CallOpts, townId string) (common.Address, error)
}

type townsArchitectProxy struct {
	contract TownsArchitect
	address  common.Address
	ctx      context.Context
}

var getTownByIdCalls = infra.NewSuccessMetrics("towns_architect_calls", contractCalls)

func NewTownsArchitect(ctx context.Context, cfg *config.ContractConfig, backend bind.ContractBackend) (TownsArchitect, error) {
	address, err := crypto.ParseOrLoadAddress(cfg.Address)
	if err != nil {
		return nil, AsRiverError(err, Err_BAD_CONFIG).Message("Failed to parse contract address").Func("NewTownsArchitect")
	}
	var c TownsArchitect
	switch cfg.Version {
	case contracts.DEV:
		c, err = dev.NewTownArchitect(address, backend)
	case contracts.V3:
		c, err = v3.NewTownArchitect(address, backend)
	}
	if err != nil {
		return nil, WrapRiverError(
			Err_CANNOT_CONNECT,
			err,
		).Tags("address", cfg.Address, "version", cfg.Version).
			Func("NewTownsArchitect").
			Message("Failed to initialize contract")
	}
	if c == nil {
		return nil, RiverError(
			Err_CANNOT_CONNECT,
			"Unsupported version",
			"version",
			cfg.Version,
			"address",
			cfg.Address,
		).Func("NewTownsArchitect")
	}
	return &townsArchitectProxy{
		contract: c,
		address:  address,
		ctx:      ctx,
	}, nil
}

func (proxy *townsArchitectProxy) GetSpaceById(opts *bind.CallOpts, townId string) (common.Address, error) {
	log := dlog.FromCtx(proxy.ctx)
	start := time.Now()
	defer infra.StoreExecutionTimeMetrics("GetSpaceById", infra.CONTRACT_CALLS_CATEGORY, start)
	log.Debug("GetSpaceById", "address", proxy.address, "networkId", townId)
	result, err := proxy.contract.GetSpaceById(opts, townId)
	if err != nil {
		log.Error("GetSpaceById", "address", proxy.address, "networkId", townId, "error", err)
		getTownByIdCalls.FailInc()
		return common.Address{}, WrapRiverError(Err_CANNOT_CALL_CONTRACT, err)
	}
	getTownByIdCalls.PassInc()
	log.Debug(
		"GetSpaceById",
		"address",
		proxy.address,
		"networkId",
		townId,
		"result",
		result,
		"duration",
		time.Since(start).Milliseconds(),
	)
	return result, nil
}
