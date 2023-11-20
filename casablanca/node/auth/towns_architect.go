package auth

import (
	"casablanca/node/auth/contracts/base_goerli_towns_architect"
	"casablanca/node/auth/contracts/localhost_towns_architect"
	"casablanca/node/protocol"

	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/ethclient"

	. "casablanca/node/base"
)

type TownsArchitect interface {
	GetTownById(opts *bind.CallOpts, networkId string) (common.Address, error)
}

func NewTownsArchitect(address common.Address, ethClient *ethclient.Client, chainId int) (TownsArchitect, error) {
	var town_architect_contract TownsArchitect
	var err error
	switch chainId {
	case 31337:
		town_architect_contract, err = localhost_towns_architect.NewLocalhostTownsArchitect(address, ethClient)
	case 84531:
		town_architect_contract, err = base_goerli_towns_architect.NewBaseGoerliTownsArchitect(address, ethClient)
	default:
		return nil, RiverError(protocol.Err_CANNOT_CONNECT, "unsupported chain", "chainId", chainId)
	}
	if err != nil {
		return nil, WrapRiverError(protocol.Err_CANNOT_CONNECT, err)
	}
	return town_architect_contract, nil
}
