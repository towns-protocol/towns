package auth

import (
	"casablanca/node/auth/contracts/base_goerli_towns_wallet_link"
	"casablanca/node/auth/contracts/localhost_towns_wallet_link"
	"casablanca/node/dlog"
	"casablanca/node/infra"
	"context"

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
	case infra.CHAIN_ID_LOCALHOST:
		wallet_link_contract, err = localhost_towns_wallet_link.NewLocalhostTownsWalletLink(address, ethClient)
	case infra.CHAIN_ID_BASE_GOERLI:
		wallet_link_contract, err = base_goerli_towns_wallet_link.NewBaseGoerliTownsWalletLink(address, ethClient)
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
	log := dlog.CtxLog(context.Background())
	log.Debug("GetWalletsByRootKey", "rootKey", rootKey)
	result, err := za.link.GetWalletsByRootKey(nil, rootKey)
	if err != nil {
		log.Error("GetWalletsByRootKey", "rootKey", rootKey, "error", err)
		return nil, WrapRiverError(protocol.Err_CANNOT_CALL_CONTRACT, err)
	}
	log.Debug("GetWalletsByRootKey", "rootKey", rootKey, "result", result)
	return result, nil
}

func (za *TownsWalletLink) GetRootKeyForWallet(wallet common.Address) (common.Address, error) {
	log := dlog.CtxLog(context.Background())
	log.Debug("GetRootKeyForWallet", "wallet", wallet)
	result, err := za.link.GetRootKeyForWallet(nil, wallet)
	if err != nil {
		log.Error("GetRootKeyForWallet", "wallet", wallet, "error", err)
		return common.Address{}, WrapRiverError(protocol.Err_CANNOT_CALL_CONTRACT, err)
	}
	log.Debug("GetRootKeyForWallet", "wallet", wallet, "result", result)
	return result, nil
}

func (za *TownsWalletLink) GetLatestNonceForRootKey(rootKey common.Address) (uint64, error) {
	log := dlog.CtxLog(context.Background())
	log.Debug("GetLatestNonceForRootKey", "rootKey", rootKey)
	result, err := za.link.GetLatestNonceForRootKey(nil, rootKey)
	if err != nil {
		log.Error("GetLatestNonceForRootKey", "rootKey", rootKey, "error", err)
		return 0, WrapRiverError(protocol.Err_CANNOT_CALL_CONTRACT, err)
	}
	log.Debug("GetLatestNonceForRootKey", "rootKey", rootKey, "result", result)
	return result, nil
}

func (za *TownsWalletLink) CheckIfLinked(rootKey common.Address, wallet common.Address) (bool, error) {
	log := dlog.CtxLog(context.Background())
	log.Debug("CheckIfLinked", "rootKey", rootKey, "wallet", wallet)
	result, err := za.link.CheckIfLinked(nil, rootKey, wallet)
	if err != nil {
		log.Error("CheckIfLinked", "rootKey", rootKey, "wallet", wallet, "error", err)
		return false, WrapRiverError(protocol.Err_CANNOT_CALL_CONTRACT, err)
	}
	log.Debug("CheckIfLinked", "rootKey", rootKey, "wallet", wallet, "result", result)
	return result, nil
}
