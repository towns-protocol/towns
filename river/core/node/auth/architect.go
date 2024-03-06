package auth

import (
	"context"
	"time"

	"github.com/river-build/river/core/node/config"
	"github.com/river-build/river/core/node/contracts/base"
	"github.com/river-build/river/core/node/crypto"
	"github.com/river-build/river/core/node/dlog"
	"github.com/river-build/river/core/node/infra"
	. "github.com/river-build/river/core/node/protocol"

	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"

	. "github.com/river-build/river/core/node/base"
)

type Architect interface {
	GetSpaceById(opts *bind.CallOpts, spaceId string) (common.Address, error)
}

type architectProxy struct {
	contract Architect
	address  common.Address
	ctx      context.Context
}

var getSpaceByIdCalls = infra.NewSuccessMetrics("architect_calls", contractCalls)

func NewArchitect(ctx context.Context, cfg *config.ContractConfig, backend bind.ContractBackend) (Architect, error) {
	address, err := crypto.ParseOrLoadAddress(cfg.Address)
	if err != nil {
		return nil, AsRiverError(err, Err_BAD_CONFIG).Message("Failed to parse contract address").Func("NewArchitect")
	}
	var c Architect
	c, err = base.NewArchitect(address, backend)
	if err != nil {
		return nil, WrapRiverError(
			Err_CANNOT_CONNECT,
			err,
		).Tags("address", cfg.Address, "version", cfg.Version).
			Func("NewArchitect").
			Message("Failed to initialize contract")
	}
	return &architectProxy{
		contract: c,
		address:  address,
		ctx:      ctx,
	}, nil
}

func (proxy *architectProxy) GetSpaceById(opts *bind.CallOpts, spaceId string) (common.Address, error) {
	log := dlog.FromCtx(proxy.ctx)
	start := time.Now()
	defer infra.StoreExecutionTimeMetrics("GetSpaceById", infra.CONTRACT_CALLS_CATEGORY, start)
	log.Debug("GetSpaceById", "address", proxy.address, "networkId", spaceId)
	result, err := proxy.contract.GetSpaceById(opts, spaceId)
	if err != nil {
		log.Error("GetSpaceById", "address", proxy.address, "networkId", spaceId, "error", err)
		getSpaceByIdCalls.FailInc()
		return common.Address{}, WrapRiverError(Err_CANNOT_CALL_CONTRACT, err)
	}
	getSpaceByIdCalls.PassInc()
	log.Debug(
		"GetSpaceById",
		"address",
		proxy.address,
		"networkId",
		spaceId,
		"result",
		result,
		"duration",
		time.Since(start).Milliseconds(),
	)
	return result, nil
}
