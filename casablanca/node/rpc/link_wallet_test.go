package rpc_test

import (
	"casablanca/node/crypto"
	"casablanca/node/protocol"
	"context"
	"encoding/hex"
	"fmt"
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

	nonceMsg, err := client.GetLinkWalletNonce(ctx, connect.NewRequest(&protocol.GetLinkWalletNonceRequest{
		RootKeyId: "0x" + hex.EncodeToString(rootKey.Address.Bytes()),
	}))
	if err != nil {
		t.Fatal(err)
	}
	nonce := nonceMsg.Msg.GetNonce() + 1

	walletSig, err := signAddressWithNonce(wallet, rootKey, nonce)
	if err != nil {
		t.Fatal(err)
	}
	rootSig, err := signAddressWithNonce(rootKey, wallet, nonce)
	if err != nil {
		t.Fatal(err)
	}
	_, err = client.LinkWallet(ctx, connect.NewRequest(&protocol.LinkWalletRequest{
		WalletAddress:    wallet.Address.Hex(),
		RootKeyId:        rootKey.Address.Hex(),
		RootKeySignature: hex.EncodeToString(rootSig),
		WalletSignature:  hex.EncodeToString(walletSig),
		Nonce:            nonce,
	}))
	if err != nil {
		t.Fatal(err)
	}

	addresses, err := client.GetLinkedWallets(ctx, connect.NewRequest(&protocol.GetLinkedWalletsRequest{
		RootKeyId: rootKey.Address.Hex(),
	}))
	if err != nil {
		t.Fatal(err)
	}
	if len(addresses.Msg.WalletAddresses) != 1 {
		t.Fatal("wallet not linked")
	}
	if addresses.Msg.WalletAddresses[0] != wallet.Address.String() {
		t.Fatal(fmt.Printf("wallet address mismatch: %s != %s", addresses.Msg.WalletAddresses[0], wallet.Address.String()))
	}
}

func signAddressWithNonce(signer *crypto.Wallet, wallet *crypto.Wallet, nonce uint64) ([]byte, error) {
	address := wallet.Address
	packed, err := crypto.PackWithNonce(address, nonce)
	if err != nil {
		return nil, err
	}
	hash := accounts.TextHash(packed)
	delegatSig, err := eth_crypto.Sign(hash, signer.PrivateKeyStruct)
	if err != nil {
		return nil, err
	}
	delegatSig[64] += 27
	fmt.Printf("delegatSig: %v, address: %v, nonce: %v, hash: %s, packed: %s\n", delegatSig, address, nonce,
		hex.EncodeToString(hash),
		hex.EncodeToString(packed))
	return delegatSig, nil
}
