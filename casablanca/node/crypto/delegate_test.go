package crypto

import (
	"context"
	"testing"

	"github.com/ethereum/go-ethereum/accounts"
	eth_crypto "github.com/ethereum/go-ethereum/crypto"
	"github.com/stretchr/testify/assert"
)

func TestDelegate(t *testing.T) {
	primaryWallet, err := NewWallet(context.Background())
	assert.NoError(t, err)

	deviceWallet, err := NewWallet(context.Background())
	assert.NoError(t, err)
	devicePubKey := eth_crypto.FromECDSAPub(&deviceWallet.PrivateKeyStruct.PublicKey)

	delegatSig, err := primaryWallet.SignHash(TownsHash(devicePubKey))
	assert.NoError(t, err)

	err = CheckDelegateSig(primaryWallet.Address.Bytes(), devicePubKey, delegatSig)
	assert.NoError(t, err)
}

func TestDelegateOld(t *testing.T) {
	primaryWallet, err := NewWallet(context.Background())
	assert.NoError(t, err)

	deviceWallet, err := NewWallet(context.Background())
	assert.NoError(t, err)
	devicePubKey := eth_crypto.FromECDSAPub(&deviceWallet.PrivateKeyStruct.PublicKey)

	hash := accounts.TextHash(devicePubKey)
	delegatSig, err := eth_crypto.Sign(hash, primaryWallet.PrivateKeyStruct)
	assert.NoError(t, err)
	delegatSig[64] += 27

	err = CheckEthereumMessageSignature(primaryWallet.Address.Bytes(), devicePubKey, delegatSig)
	assert.NoError(t, err)
}
