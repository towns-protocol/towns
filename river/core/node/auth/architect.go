package auth

import (
	"context"
	"math/big"
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
	GetTokenIdBySpace(opts *bind.CallOpts, spaceId common.Address) (*big.Int, error)
}

type architectProxy struct {
	contract *base.Architect
	address  common.Address
	ctx      context.Context
}

var GetTokenIdBySpaceCalls = infra.NewSuccessMetrics("architect_calls", contractCalls)

func NewArchitect(ctx context.Context, cfg *config.ContractConfig, backend bind.ContractBackend) (Architect, error) {
	address, err := crypto.ParseOrLoadAddress(cfg.Address)
	if err != nil {
		return nil, AsRiverError(err, Err_BAD_CONFIG).Message("Failed to parse contract address").Func("NewArchitect")
	}
	//var c Architect
	c, err := base.NewArchitect(address, backend)
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

func (proxy *architectProxy) GetTokenIdBySpace(opts *bind.CallOpts, spaceId common.Address) (*big.Int, error) {
	log := dlog.FromCtx(proxy.ctx)
	start := time.Now()
	defer infra.StoreExecutionTimeMetrics("GetTokenIdBySpace", infra.CONTRACT_CALLS_CATEGORY, start)
	log.Debug("GetTokenIdBySpace", "address", proxy.address, "networkId", spaceId)
	result, err := proxy.contract.GetTokenIdBySpace(opts, spaceId)
	if err != nil {
		log.Error("GetTokenIdBySpace", "address", proxy.address, "networkId", spaceId, "error", err)
		GetTokenIdBySpaceCalls.FailInc()
		return nil, WrapRiverError(Err_CANNOT_CALL_CONTRACT, err)
	}
	GetTokenIdBySpaceCalls.PassInc()
	log.Debug(
		"GetTokenIdBySpace",
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
