package auth

import (
	"casablanca/node/auth/contracts/localhost_towns_wallet_link"
	"casablanca/node/crypto"
	"context"
	"errors"
	"math/big"

	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/ethclient"
)

type TownsWalletLinkLocalhost struct {
	ethClient  *ethclient.Client
	transactor *crypto.Wallet
	link       *localhost_towns_wallet_link.LocalhostTownsWalletLink
}

func NewTownsWalletLinkLocalhost(ethClient *ethclient.Client, nodeWallet *crypto.Wallet) (*TownsWalletLinkLocalhost, error) {
	hexAddress, err := loadWalletLinkContractAddress(31337)
	if err != nil {
		return nil, err
	}
	address := common.HexToAddress(hexAddress)
	wallet_link_contract, err := localhost_towns_wallet_link.NewLocalhostTownsWalletLink(address, ethClient)
	if err != nil {
		return nil, err
	}

	var contract = &TownsWalletLinkLocalhost{
		ethClient:  ethClient,
		link:       wallet_link_contract,
		transactor: nodeWallet,
	}
	return contract, nil
}

func (za *TownsWalletLinkLocalhost) LinkWalletToRootKey(rootKey common.Address, wallet common.Address, rootKeySignature []byte, walletSignature []byte, nonce uint64) error {

	gasLimit := uint64(1000000)
	gasPrice, err := za.ethClient.SuggestGasPrice(context.Background())
	if err != nil {
		return err
	}

	txOpts, err := bind.NewKeyedTransactorWithChainID(za.transactor.PrivateKeyStruct, big.NewInt(31337))
	if err != nil {
		return err
	}
	txOpts.GasPrice = gasPrice
	txOpts.GasLimit = gasLimit

	tx, err := za.link.LinkWalletToRootKey(txOpts, wallet, walletSignature, rootKey, rootKeySignature, nonce)
	if err != nil {
		return err
	}
	// TODO convert this to async.
	receipt, err := bind.WaitMined(context.TODO(), za.ethClient, tx)
	if err != nil {
		return err
	}
	if receipt.Status != types.ReceiptStatusSuccessful {
		return errors.New("transaction failed")
	}
	return nil
}

func (za *TownsWalletLinkLocalhost) GetLinkedWallets(rootKey common.Address) ([]common.Address, error) {
	return za.link.GetWalletsByRootKey(nil, rootKey)
}

func (za *TownsWalletLinkLocalhost) GetLatestNonceForRootKey(rootKey common.Address) (uint64, error) {
	return za.link.GetLatestNonceForRootKey(nil, rootKey)
}
