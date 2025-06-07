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
	appAddress common.Address,
) (bool, error) {
	uid, err := arc.appRegistry.GetLatestAppId(&bind.CallOpts{Context: ctx}, appAddress)
	if err != nil {
		return false, AsRiverError(err).Message("Unable to check if app is registered").Tag("address", appAddress)
	}
	return uid != EMPTY_UID, nil
}

func (arc *AppRegistryContract) IsRegisteredAppWithClient(
	ctx context.Context,
	appAddress common.Address,
	clientAddress common.Address,
) (bool, error) {
	registeredAppAddress, err := arc.appRegistry.GetAppByClient(&bind.CallOpts{Context: ctx}, clientAddress)
	if err != nil {
		return false, AsRiverError(
			err,
		).Message("Unable to check if app exists with client address").
			Tag("appAddress", appAddress).
			Tag("clientAddress", clientAddress)
	}
	return appAddress.Cmp(registeredAppAddress) == 0, nil
}
