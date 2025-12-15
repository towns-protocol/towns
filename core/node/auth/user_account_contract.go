package auth

import (
	"context"

	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"

	"github.com/towns-protocol/towns/core/contracts/base"
	. "github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/crypto"
	"github.com/towns-protocol/towns/core/node/protocol"
)

type UserAccountContract interface {
	IsAppInstalled(
		ctx context.Context,
		userAccountAddress common.Address,
		appAddress common.Address,
	) (bool, error)
}

type UserAccountContractImpl struct {
	backend bind.ContractBackend
	decoder *crypto.EvmErrorDecoder
}

var _ UserAccountContract = (*UserAccountContractImpl)(nil)

func NewUserAccountContract(
	backend bind.ContractBackend,
) (*UserAccountContractImpl, error) {
	decoder, err := crypto.NewEVMErrorDecoder(
		base.AppAccountMetaData,
	)
	if err != nil {
		return nil, err
	}

	return &UserAccountContractImpl{
		backend: backend,
		decoder: decoder,
	}, nil
}

func (uac *UserAccountContractImpl) decodeError(err error) error {
	ce, se, decodeErr := uac.decoder.DecodeEVMError(err)
	if ce != nil {
		return AsRiverError(ce, protocol.Err_CANNOT_CALL_CONTRACT)
	} else if se != nil {
		return AsRiverError(se, protocol.Err_CANNOT_CALL_CONTRACT)
	} else if decodeErr != nil {
		return err
	}
	return err
}

// IsAppInstalled checks if the given app is installed on the user's smart account.
func (uac *UserAccountContractImpl) IsAppInstalled(
	ctx context.Context,
	userAccountAddress common.Address,
	appAddress common.Address,
) (bool, error) {
	// Create an AppAccount binding for the user's account address
	appAccount, err := base.NewAppAccount(userAccountAddress, uac.backend)
	if err != nil {
		return false, AsRiverError(err).Tag("method", "NewAppAccount").Tag("userAccount", userAccountAddress.Hex())
	}

	isInstalled, err := appAccount.IsAppInstalled(
		&bind.CallOpts{Context: ctx},
		appAddress,
	)
	if err != nil {
		return false, AsRiverError(
			uac.decodeError(err),
		).Tag("method", "IsAppInstalled").
			Tag("userAccount", userAccountAddress.Hex()).
			Tag("appAddress", appAddress.Hex())
	}

	return isInstalled, nil
}
