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

	err = CheckDelegateSig(primaryWallet.Address.Bytes(), devicePubKey, delegatSig, 0)
	assert.NoError(t, err)
}

func TestDelegateEthWithExpiry(t *testing.T) {
	ctx := test.NewTestContext()

	primaryWallet, err := NewWallet(ctx)
	assert.NoError(t, err)

	deviceWallet, err := NewWallet(ctx)
	assert.NoError(t, err)
	devicePubKey := crypto.FromECDSAPub(&deviceWallet.PrivateKeyStruct.PublicKey)

	expiry := int64(1234567890)

	hashSrc := RiverDelegateHashSrc(devicePubKey, expiry)

	hash := accounts.TextHash(hashSrc)
	delegatSig, err := crypto.Sign(hash, primaryWallet.PrivateKeyStruct)
	assert.NoError(t, err)
	delegatSig[64] += 27

	// should fail because the expiry is not 0
	err = CheckDelegateSig(primaryWallet.Address.Bytes(), devicePubKey, delegatSig, 0)
	assert.Error(t, err)

	// should succeed
	err = CheckDelegateSig(primaryWallet.Address.Bytes(), devicePubKey, delegatSig, expiry)
	assert.NoError(t, err)
}
