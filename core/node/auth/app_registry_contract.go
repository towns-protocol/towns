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

// IsUserBotOwner checks if the given user (potentialOwner) is the owner of the bot
// whose client address is botClientAddress.
func (arc *AppRegistryContract) IsUserBotOwner(
	ctx context.Context,
	potentialOwner common.Address,
	botClientAddress common.Address,
) (bool, error) {
	zeroAddress := common.Address{}

	// Get the app contract address from the bot's client address
	appAddress, err := arc.appRegistry.GetAppByClient(&bind.CallOpts{Context: ctx}, botClientAddress)
	if err != nil {
		return false, AsRiverError(
			err,
		).Message("Unable to get app by client address").
			Tag("botClientAddress", botClientAddress)
	}

	// If no app is registered with this client address, the user can't be the owner
	if appAddress == zeroAddress {
		return false, nil
	}

	// Get the latest app ID for this app address
	appId, err := arc.appRegistry.GetLatestAppId(&bind.CallOpts{Context: ctx}, appAddress)
	if err != nil {
		return false, AsRiverError(
			err,
		).Message("Unable to get latest app ID").
			Tag("appAddress", appAddress)
	}

	// If no valid app ID, the user can't be the owner
	if appId == EMPTY_UID {
		return false, nil
	}

	// Get the app data to check the owner
	appData, err := arc.appRegistry.GetAppById(&bind.CallOpts{Context: ctx}, appId)
	if err != nil {
		return false, AsRiverError(
			err,
		).Message("Unable to get app by ID").
			Tag("appId", appId)
	}

	// Check if the potential owner matches the app's owner
	return appData.Owner == potentialOwner, nil
}
