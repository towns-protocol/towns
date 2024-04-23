package crypto

import (
	"testing"

	"github.com/ethereum/go-ethereum/accounts"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/river-build/river/core/node/base/test"
	"github.com/stretchr/testify/assert"
)

func TestDelegateEth(t *testing.T) {
	ctx, cancel := test.NewTestContext()
	defer cancel()

	primaryWallet, err := NewWallet(ctx)
	assert.NoError(t, err)

	deviceWallet, err := NewWallet(ctx)
	assert.NoError(t, err)
	devicePubKey := crypto.FromECDSAPub(&deviceWallet.PrivateKeyStruct.PublicKey)

	hashSrc, err := RiverDelegateHashSrc(devicePubKey, 0)
	assert.NoError(t, err)
	hash := accounts.TextHash(hashSrc)
	delegatSig, err := crypto.Sign(hash, primaryWallet.PrivateKeyStruct)
	assert.NoError(t, err)
	delegatSig[64] += 27

	err = CheckDelegateSig(primaryWallet.Address.Bytes(), devicePubKey, delegatSig, 0)
	assert.NoError(t, err)
}

func TestDelegateEthWithExpiry(t *testing.T) {
	ctx, cancel := test.NewTestContext()
	defer cancel()

	primaryWallet, err := NewWallet(ctx)
	assert.NoError(t, err)

	deviceWallet, err := NewWallet(ctx)
	assert.NoError(t, err)
	devicePubKey := crypto.FromECDSAPub(&deviceWallet.PrivateKeyStruct.PublicKey)

	expiry := int64(1234567890)

	hashSrc, err := RiverDelegateHashSrc(devicePubKey, expiry)
	assert.NoError(t, err)

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
