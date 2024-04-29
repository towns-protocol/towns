package util

import (
	"context"
	"os"

	"github.com/river-build/river/core/node/crypto"
)

func LoadWallet(ctx context.Context) (*crypto.Wallet, error) {
	var (
		wallet  *crypto.Wallet
		privKey = os.Getenv("WALLETPRIVATEKEY")
		err     error
	)
	// Read env var WALLETPRIVATEKEY or PRIVATE_KEY
	if privKey == "" {
		privKey = os.Getenv("PRIVATE_KEY")
	}
	if privKey != "" {
		wallet, err = crypto.NewWalletFromPrivKey(ctx, privKey)
	} else {
		wallet, err = crypto.LoadWallet(ctx, crypto.WALLET_PATH_PRIVATE_KEY)
	}
	if err != nil {
		return nil, err
	}
	return wallet, err
}
