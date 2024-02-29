package crypto

import (
	"testing"

	"github.com/river-build/river/core/node/base/test"
	"github.com/stretchr/testify/assert"
)

func TestSign(t *testing.T) {
	ctx := test.NewTestContext()

	wallet, err := NewWallet(ctx)
	if err != nil {
		return
	}

	message := []byte("Hello, World!")
	hash := TownsHash(message)

	signature, err := wallet.SignHash(hash[:])
	assert.Nil(t, err)
	assert.Equal(t, 65, len(signature))

	key, err := RecoverSignerPublicKey(hash[:], signature)
	assert.Nil(t, err)
	recoveredAddress := PublicKeyToAddress(key)
	assert.Equal(t, wallet.Address, recoveredAddress)

	message2 := []byte("Hello, Universe!")
	hash2 := TownsHash(message2)
	signature2, err := wallet.SignHash(hash2[:])
	assert.Nil(t, err)
	assert.Equal(t, 65, len(signature2))
	assert.NotEqual(t, signature, signature2)

	key, err = RecoverSignerPublicKey(hash[:], signature2)
	assert.Nil(t, err)
	recoveredAddress = PublicKeyToAddress(key)
	assert.NotEqual(t, wallet.Address, recoveredAddress)
}
