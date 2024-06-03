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

type Pausable interface {
	Paused(callOpts *bind.CallOpts) (bool, error)
}

type pausableProxy struct {
	address  common.Address
	contract Pausable
	ctx      context.Context
}

func NewPausable(
	ctx context.Context,
	version string,
	address common.Address,
	backend bind.ContractBackend,
) (Pausable, error) {
	var c Pausable
	var err error
	c, err = base.NewPausable(address, backend)
	if err != nil {
		return nil, WrapRiverError(
			Err_CANNOT_CONNECT,
			err,
		).Tags("address", address, "version", version).
			Func("NewPausable").
			Message("Failed to initialize contract")
	}
	return &pausableProxy{
		contract: c,
		address:  address,
		ctx:      ctx,
	}, nil
}

func (proxy *pausableProxy) Paused(callOpts *bind.CallOpts) (bool, error) {
	log := dlog.FromCtx(proxy.ctx)
	start := time.Now()
	log.Debug("Paused", "address", proxy.address)
	result, err := proxy.contract.Paused(callOpts)
	if err != nil {
		log.Error("Paused", "address", proxy.address, "error", err)
		return false, WrapRiverError(Err_CANNOT_CALL_CONTRACT, err)
	}
	log.Debug("Paused", "address", proxy.address, "result", result, "duration", time.Since(start).Milliseconds())
	return result, nil
}
