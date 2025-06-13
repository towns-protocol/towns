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

// IsRegisteredApp confirms that the supplied address is registered in the app registry as the
// contract address of an app.
func (arc *AppRegistryContract) IsRegisteredApp(
	ctx context.Context,
	appContractAddress common.Address,
) (bool, error) {
	uid, err := arc.appRegistry.GetLatestAppId(&bind.CallOpts{Context: ctx}, appContractAddress)
	if err != nil {
		return false, AsRiverError(
			err,
		).Message("Unable to check if app is registered").
			Tag("address", appContractAddress)
	}
	return uid != EMPTY_UID, nil
}

// IsRegisteredAppWithClient confirms that the appContractAddress is registered in the registry
// with the clientAddress as the associated user id. All streams for this app will be created
// under the user id derived from the client address.
func (arc *AppRegistryContract) IsRegisteredAppWithClient(
	ctx context.Context,
	appContractAddress common.Address,
	clientAddress common.Address,
) (bool, error) {
	registeredAppAddress, err := arc.appRegistry.GetAppByClient(&bind.CallOpts{Context: ctx}, clientAddress)
	if err != nil {
		return false, AsRiverError(
			err,
		).Message("Unable to check if app exists with client address").
			Tag("appContractAddress", appContractAddress).
			Tag("clientAddress", clientAddress)
	}
	return appContractAddress == registeredAppAddress, nil
}

func (arc *AppRegistryContract) UserIsRegisteredAsApp(
	ctx context.Context,
	userId common.Address,
) (isApp bool, appContractAddress common.Address, err error) {
	zeroAddress := common.Address{}
	registeredAppAddress, err := arc.appRegistry.GetAppByClient(&bind.CallOpts{Context: ctx}, userId)
	if err != nil {
		return false, zeroAddress, AsRiverError(
			err,
		).Message("Unable to check if user is an app").
			Tag("userId", userId)
	}
	return registeredAppAddress != zeroAddress, registeredAppAddress, nil
}
