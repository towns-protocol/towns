package auth

import (
	"casablanca/node/auth/contracts/base_goerli_towns_pausable"
	"casablanca/node/auth/contracts/localhost_towns_pausable"
	"casablanca/node/protocol"

	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/ethclient"

	. "casablanca/node/base"
)

type TownsPausable interface {
	Paused(callOpts *bind.CallOpts) (bool, error)
}

func NewTownsPausable(address common.Address, ethClient *ethclient.Client, chainId int) (TownsPausable, error) {
	var towns_pausable_contract TownsPausable
	var err error
	switch chainId {
	case 31337:
		towns_pausable_contract, err = localhost_towns_pausable.NewLocalhostTownsPausable(address, ethClient)
	case 84531:
		towns_pausable_contract, err = base_goerli_towns_pausable.NewBaseGoerliTownsPausable(address, ethClient)

	default:
		return nil, RiverError(protocol.Err_CANNOT_CONNECT, "unsupported chain", "chainId", chainId)
	}
	if err != nil {
		return nil, WrapRiverError(protocol.Err_CANNOT_CONNECT, err)
	}
	return towns_pausable_contract, nil
}
