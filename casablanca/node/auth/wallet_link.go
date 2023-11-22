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

var (
	getWalletsByRootKeyCalls = infra.NewSuccessMetrics("get_wallets_by_root_key_calls", contractCalls)
	getRootKeyForWalletCalls = infra.NewSuccessMetrics("get_root_key_for_wallet_calls", contractCalls)
	getLatestNonceCalls      = infra.NewSuccessMetrics("get_latest_nonce_calls", contractCalls)
	checkIfLinkedCalls       = infra.NewSuccessMetrics("check_if_linked_calls", contractCalls)
)

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
		getWalletsByRootKeyCalls.Fail()
		log.Error("GetWalletsByRootKey", "rootKey", rootKey, "error", err)
		return nil, WrapRiverError(protocol.Err_CANNOT_CALL_CONTRACT, err)
	}
	getWalletsByRootKeyCalls.Pass()
	log.Debug("GetWalletsByRootKey", "rootKey", rootKey, "result", result)
	return result, nil
}

func (za *TownsWalletLink) GetRootKeyForWallet(wallet common.Address) (common.Address, error) {
	log := dlog.CtxLog(context.Background())
	log.Debug("GetRootKeyForWallet", "wallet", wallet)
	result, err := za.link.GetRootKeyForWallet(nil, wallet)
	if err != nil {
		getRootKeyForWalletCalls.Fail()
		log.Error("GetRootKeyForWallet", "wallet", wallet, "error", err)
		return common.Address{}, WrapRiverError(protocol.Err_CANNOT_CALL_CONTRACT, err)
	}
	getRootKeyForWalletCalls.Pass()
	log.Debug("GetRootKeyForWallet", "wallet", wallet, "result", result)
	return result, nil
}

func (za *TownsWalletLink) GetLatestNonceForRootKey(rootKey common.Address) (uint64, error) {
	log := dlog.CtxLog(context.Background())
	log.Debug("GetLatestNonceForRootKey", "rootKey", rootKey)
	result, err := za.link.GetLatestNonceForRootKey(nil, rootKey)
	if err != nil {
		getLatestNonceCalls.Fail()
		log.Error("GetLatestNonceForRootKey", "rootKey", rootKey, "error", err)
		return 0, WrapRiverError(protocol.Err_CANNOT_CALL_CONTRACT, err)
	}
	getLatestNonceCalls.Pass()
	log.Debug("GetLatestNonceForRootKey", "rootKey", rootKey, "result", result)
	return result, nil
}

func (za *TownsWalletLink) CheckIfLinked(rootKey common.Address, wallet common.Address) (bool, error) {
	log := dlog.CtxLog(context.Background())
	log.Debug("CheckIfLinked", "rootKey", rootKey, "wallet", wallet)
	result, err := za.link.CheckIfLinked(nil, rootKey, wallet)
	if err != nil {
		checkIfLinkedCalls.Fail()
		log.Error("CheckIfLinked", "rootKey", rootKey, "wallet", wallet, "error", err)
		return false, WrapRiverError(protocol.Err_CANNOT_CALL_CONTRACT, err)
	}
	checkIfLinkedCalls.Pass()
	log.Debug("CheckIfLinked", "rootKey", rootKey, "wallet", wallet, "result", result)
	return result, nil
}
