package auth

import (
	"casablanca/node/config"
	"casablanca/node/crypto"
	"errors"
	"fmt"

	"golang.org/x/exp/slog"

	"github.com/ethereum/go-ethereum/common"
)

type WalletLinkContract interface {
	LinkWallet(rootKey common.Address, wallet common.Address, rootKeySignature []byte, walletSignature []byte) error
	GetLinkedWallets(rootKey common.Address) ([]common.Address, error)
}

func NewTownsWalletLink(cfg *config.ChainConfig, nodeWallet *crypto.Wallet) (WalletLinkContract, error) {
	chainId := cfg.ChainId
	// initialise the eth client.
	if cfg.NetworkUrl == "" {
		slog.Error("No blockchain network url specified in config")
		return nil, fmt.Errorf("no blockchain network url specified in config")
	}
	ethClient, err := GetEthClient(cfg.NetworkUrl)
	if err != nil {
		slog.Error("Cannot connect to eth client", "url", cfg.NetworkUrl, "error", err)
		return nil, err
	}

	switch chainId {
	case 31337:
		contract, err := NewTownsWalletLinkLocalhost(ethClient, nodeWallet)
		if err != nil {
			return nil, err
		}
		return contract, nil
	default:
		errMsg := fmt.Sprintf("unsupported chainId: %d", chainId)
		slog.Error("NewTownsWalletLink", errMsg)
		return nil, errors.New(errMsg)
	}
}
