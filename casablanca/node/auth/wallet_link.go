package auth

import (
	"casablanca/node/auth/contracts/localhost_towns_wallet_link"
	. "casablanca/node/base"
	"casablanca/node/protocol"

	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/ethclient"
)

type WalletLinkContract interface {
	GetLatestNonceForRootKey(rootKey common.Address) (uint64, error)
	GetWalletsByRootKey(rootKey common.Address) ([]common.Address, error)
	GetRootKeyForWallet(wallet common.Address) (common.Address, error)
	CheckIfLinked(rootKey common.Address, wallet common.Address) (bool, error)
}

type GeneratedWalletLinkContract interface {
	GetLatestNonceForRootKey(opts *bind.CallOpts, rootKey common.Address) (uint64, error)
	GetWalletsByRootKey(opts *bind.CallOpts, rootKey common.Address) ([]common.Address, error)
	GetRootKeyForWallet(opts *bind.CallOpts, wallet common.Address) (common.Address, error)
	CheckIfLinked(opts *bind.CallOpts, rootKey common.Address, wallet common.Address) (bool, error)
}

type TownsWalletLink struct {
	ethClient *ethclient.Client
	link      GeneratedWalletLinkContract
}

func NewTownsWalletLink(ethClient *ethclient.Client, chainId int) (*TownsWalletLink, error) {
	hexAddress, err := loadWalletLinkContractAddress(chainId)
	if err != nil {
		return nil, WrapRiverError(protocol.Err_CANNOT_CONNECT, err)
	}
	address := common.HexToAddress(hexAddress)

	var wallet_link_contract GeneratedWalletLinkContract
	switch chainId {
	case 31337:
		wallet_link_contract, err = localhost_towns_wallet_link.NewLocalhostTownsWalletLink(address, ethClient)
	default:
		return nil, RiverError(protocol.Err_CANNOT_CONNECT, "unsupported chain", "chainId", chainId)
	}
	if err != nil {
		return nil, WrapRiverError(protocol.Err_CANNOT_CONNECT, err)
	}

	var contract = &TownsWalletLink{
		ethClient: ethClient,
		link:      wallet_link_contract,
	}
	return contract, nil
}

func (za *TownsWalletLink) GetWalletsByRootKey(rootKey common.Address) ([]common.Address, error) {
	return za.link.GetWalletsByRootKey(nil, rootKey)
}

func (za *TownsWalletLink) GetRootKeyForWallet(wallet common.Address) (common.Address, error) {
	return za.link.GetRootKeyForWallet(nil, wallet)
}

func (za *TownsWalletLink) GetLatestNonceForRootKey(rootKey common.Address) (uint64, error) {
	return za.link.GetLatestNonceForRootKey(nil, rootKey)
}

func (za *TownsWalletLink) CheckIfLinked(rootKey common.Address, wallet common.Address) (bool, error) {
	return za.link.CheckIfLinked(nil, rootKey, wallet)
}
