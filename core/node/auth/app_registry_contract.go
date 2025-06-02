package auth

import (
	"context"

	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"

	"github.com/towns-protocol/towns/core/config"
	"github.com/towns-protocol/towns/core/contracts/base"
	. "github.com/towns-protocol/towns/core/node/base"
)

type AppRegistryContract struct {
	appRegistry *base.AppRegistry
}

func NewAppRegistryContract(
	ctx context.Context,
	appRegistryConfig *config.ContractConfig,
	backend bind.ContractBackend,
) (*AppRegistryContract, error) {
	appRegistry, err := base.NewAppRegistry(appRegistryConfig.Address, backend)
	if err != nil {
		return nil, err
	}

	return &AppRegistryContract{
		appRegistry: appRegistry,
	}, nil
}

var EMPTY_UID = [32]byte{}

func (arc *AppRegistryContract) IsRegisteredApp(
	ctx context.Context,
	address common.Address,
) (bool, error) {
	uid, err := arc.appRegistry.GetLatestAppId(&bind.CallOpts{}, address)
	if err != nil {
		return false, AsRiverError(err).Message("Unable to check if app is registered").Tag("address", address)
	}
	return uid != EMPTY_UID, nil
}
