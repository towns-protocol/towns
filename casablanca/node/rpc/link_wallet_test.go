package rpc_test

import (
	"casablanca/node/crypto"
	"casablanca/node/protocol"
	"context"
	"encoding/hex"
	"os"
	"testing"

	"github.com/bufbuild/connect-go"
	"github.com/ethereum/go-ethereum/accounts"
	eth_crypto "github.com/ethereum/go-ethereum/crypto"
)

func TestWalletLinkRpc(t *testing.T) {
	if os.Getenv("RIVER_INTEGRATION") == "" {
		t.Skip("skipping integration tests: set RIVER_INTEGRATION environment variable")
	}

	ctx := context.Background()
	client, closer := testServerAndClient(ctx, testDatabaseUrl, testSchemaName, true)
	defer closer()

	wallet, _ := crypto.NewWallet(ctx)
	rootKey, _ := crypto.NewWallet(ctx)
	rootKeyPub, walletSig, err := signRootKeyByWallet(wallet, rootKey)
	if err != nil {
		t.Fatal(err)
	}
	rootSig, err := signWalletByRootKey(wallet, rootKey)
	if err != nil {
		t.Fatal(err)
	}
	_, err = client.LinkWallet(ctx, connect.NewRequest(&protocol.LinkWalletRequest{
		WalletAddress:    wallet.Address.String(),
		RootKeyId:        hex.EncodeToString(rootKeyPub),
		RootKeySignature: hex.EncodeToString(rootSig),
		WalletSignature:  hex.EncodeToString(walletSig),
	}))
	if err != nil {
		t.Fatal(err)
	}

	addresses, err := client.GetLinkedWallets(ctx, connect.NewRequest(&protocol.GetLinkedWalletsRequest{
		RootKeyId: hex.EncodeToString(rootKeyPub),
	}))
	if err != nil {
		t.Fatal(err)
	}
	if len(addresses.Msg.WalletAddresses) != 1 {
		t.Fatal("wallet not linked")
	}
	// TODO HNT-2344 enable when the contract handles requests on behalf of the wallet
	// if addresses.Msg.WalletAddresses[0] != wallet.Address.String() {
	// 	t.Fatal(fmt.Printf("wallet address mismatch: %s != %s", addresses.Msg.WalletAddresses[0], wallet.Address.String()))
	// }
}

func signRootKeyByWallet(wallet *crypto.Wallet, rootKey *crypto.Wallet) ([]byte, []byte, error) {
	rootKeyPub := eth_crypto.FromECDSAPub(&rootKey.PrivateKeyStruct.PublicKey)
	hash := accounts.TextHash(rootKeyPub)
	delegatSig, err := eth_crypto.Sign(hash, wallet.PrivateKeyStruct)
	if err != nil {
		return nil, nil, err
	}
	delegatSig[64] += 27
	return rootKeyPub, delegatSig, nil
}

func signWalletByRootKey(wallet *crypto.Wallet, rootKey *crypto.Wallet) ([]byte, error) {
	hash := crypto.TownsHash(wallet.Address.Bytes())
	return eth_crypto.Sign(hash, rootKey.PrivateKeyStruct)
}
