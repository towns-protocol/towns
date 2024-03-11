package crypto

import (
	"testing"

	"github.com/ethereum/go-ethereum/accounts"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/river-build/river/core/node/base/test"
	"github.com/stretchr/testify/assert"
)

func TestDelegateEth(t *testing.T) {
	ctx := test.NewTestContext()

	primaryWallet, err := NewWallet(ctx)
	assert.NoError(t, err)

	deviceWallet, err := NewWallet(ctx)
	assert.NoError(t, err)
	devicePubKey := crypto.FromECDSAPub(&deviceWallet.PrivateKeyStruct.PublicKey)

	hash := accounts.TextHash(devicePubKey)
	delegatSig, err := crypto.Sign(hash, primaryWallet.PrivateKeyStruct)
	assert.NoError(t, err)
	delegatSig[64] += 27

	err = CheckDelegateSig(primaryWallet.Address.Bytes(), devicePubKey, delegatSig)
	assert.NoError(t, err)
}
