package auth

import (
	"casablanca/node/auth/contracts/base_goerli_towns_entitlements"
	"casablanca/node/auth/contracts/localhost_towns_entitlements"
	"casablanca/node/protocol"

	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/ethclient"

	. "casablanca/node/base"
)

type TownsEntitlements interface {
	IsEntitledToChannel(opts *bind.CallOpts, channelNetworkId string, user common.Address, permission string) (bool, error)
	IsEntitledToTown(opts *bind.CallOpts, user common.Address, permission string) (bool, error)
}

func NewTownsEntitlements(address common.Address, ethClient *ethclient.Client, chainId int) (TownsEntitlements, error) {
	var towns_entitlement_contract TownsEntitlements
	var err error
	switch chainId {
	case 31337:
		towns_entitlement_contract, err = localhost_towns_entitlements.NewLocalhostTownsEntitlements(address, ethClient)
	case 84531:
		towns_entitlement_contract, err = base_goerli_towns_entitlements.NewBaseGoerliTownsEntitlements(address, ethClient)
	default:
		return nil, RiverError(protocol.Err_CANNOT_CONNECT, "unsupported chain", "chainId", chainId)
	}
	if err != nil {
		return nil, WrapRiverError(protocol.Err_CANNOT_CONNECT, err)
	}

	return towns_entitlement_contract, nil
}
