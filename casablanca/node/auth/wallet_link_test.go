package auth_test

import (
	"casablanca/node/auth"
	"casablanca/node/crypto"
	"casablanca/node/testutils"
	"context"
	"fmt"
	"os"
	"testing"

	"github.com/ethereum/go-ethereum/ethclient"
	"github.com/ethereum/go-ethereum/rpc"
)

func TestWalletLink(t *testing.T) {
	ctx := context.Background()
	if os.Getenv("RIVER_INTEGRATION") == "" {
		t.Skip("skipping integration tests: set RIVER_INTEGRATION environment variable")
	}
	wallet, err := crypto.NewWallet(ctx)
	if err != nil {
		panic(err)
	}
	rootKey, err := crypto.NewWallet(ctx)
	if err != nil {
		panic(err)
	}

	rpcClient, err := rpc.DialContext(ctx, "http://127.0.0.1:8545")
	if err != nil {
		panic(err)
	}
	ethClient := ethclient.NewClient(rpcClient)
	err = testutils.FundWallet(ctx, wallet.Address, "http://127.0.0.1:8545")
	if err != nil {
		panic(err)
	}

	var walletLink auth.WalletLinkContract
	walletLink, err = auth.NewTownsWalletLinkLocalhost(ethClient, wallet)
	if err != nil {
		panic(err)
	}

	err = walletLink.LinkWallet(rootKey.Address)
	if err != nil {
		panic(err)
	}

	balance, err := ethClient.BalanceAt(context.Background(), wallet.Address, nil)
	if err != nil {
		panic(err)
	}
	fmt.Printf("Balance: %s\n", balance.String())

	wallets, err := walletLink.GetLinkedWallets(rootKey.Address)
	if err != nil {
		panic(err)
	}

	if len(wallets) != 1 {
		panic(fmt.Errorf("expected 1 wallet, got %d", len(wallets)))
	}

	if wallets[0].Hex() != wallet.Address.Hex() {
		panic("expected wallets to be linked")
	}

	fmt.Printf("Linked Wallets: %v\n", wallets)

}
