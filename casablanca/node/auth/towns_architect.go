package auth

import (
	"casablanca/node/auth/contracts/base_goerli_towns_architect"
	"casablanca/node/auth/contracts/localhost_towns_architect"
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

type TownsArchitect interface {
	GetTownById(opts *bind.CallOpts, networkId string) (common.Address, error)
}

type TownsArchitectProxy struct {
	contract TownsArchitect
	address  common.Address
}

var (
	getTownByIdCalls = infra.NewSuccessMetrics("towns_architect_calls", contractCalls)
)

func NewTownsArchitect(address common.Address, ethClient *ethclient.Client, chainId int) (TownsArchitect, error) {
	var town_architect_contract TownsArchitect
	var err error
	switch chainId {
	case infra.CHAIN_ID_LOCALHOST:
		town_architect_contract, err = localhost_towns_architect.NewLocalhostTownsArchitect(address, ethClient)
	case infra.CHAIN_ID_BASE_GOERLI:
		town_architect_contract, err = base_goerli_towns_architect.NewBaseGoerliTownsArchitect(address, ethClient)
	default:
		return nil, RiverError(protocol.Err_CANNOT_CONNECT, "unsupported chain", "chainId", chainId)
	}
	if err != nil {
		return nil, WrapRiverError(protocol.Err_CANNOT_CONNECT, err)
	}
	return NewTownsArchitectProxy(town_architect_contract, address), nil
}

func NewTownsArchitectProxy(contract TownsArchitect, address common.Address) TownsArchitect {
	return &TownsArchitectProxy{
		contract: contract,
		address:  address,
	}
}

func (proxy *TownsArchitectProxy) GetTownById(opts *bind.CallOpts, networkId string) (common.Address, error) {
	log := dlog.CtxLog(context.Background())
	start := time.Now()
	defer infra.StoreExecutionTimeMetrics("GetTownByIdMs", start)
	log.Debug("GetTownById", "address", proxy.address, "networkId", networkId)
	result, err := proxy.contract.GetTownById(opts, networkId)
	if err != nil {
		log.Error("GetTownById", "address", proxy.address, "networkId", networkId, "error", err)
		getTownByIdCalls.Fail()
		return common.Address{}, WrapRiverError(protocol.Err_CANNOT_CALL_CONTRACT, err)
	}
	getTownByIdCalls.Pass()
	log.Debug("GetTownById", "address", proxy.address, "networkId", networkId, "result", result, "duration", time.Since(start).Milliseconds())
	return result, nil
}
