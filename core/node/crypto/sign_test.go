package crypto

import (
	"testing"

	"github.com/ethereum/go-ethereum/crypto/secp256k1"
	"github.com/stretchr/testify/assert"

	"github.com/towns-protocol/towns/core/node/base/test"
)

func TestSign(t *testing.T) {
	ctx := test.NewTestContext(t)

	wallet, err := NewWallet(ctx)
	if err != nil {
		return
	}

	message := []byte("Hello, World!")
	hash := TownsHashForEvents.Hash(message)
	assert.Equal(t, "0xc6252c41c99028ea8600a2d9818d8dcfdf13ab69f9d4df54cbc1d1ed1a475592", hash.Hex())

	signature, err := wallet.SignHash(hash)
	assert.Nil(t, err)
	assert.Equal(t, 65, len(signature))

	key, err := RecoverSignerPublicKey(hash[:], signature)
	assert.Nil(t, err)
	recoveredAddress := PublicKeyToAddress(key)
	assert.Equal(t, wallet.Address, recoveredAddress)

	message2 := []byte("Hello, Universe!")
	hash2 := TownsHashForEvents.Hash(message2)
	assert.Equal(t, "0xb8c5bb634af3b0191b7aa98c38d3baceeb0651b15cf252cacad2e0a8cda7f040", hash2.Hex())
	signature2, err := wallet.SignHash(hash2)
	assert.Nil(t, err)
	assert.Equal(t, 65, len(signature2))
	assert.NotEqual(t, signature, signature2)

	key, err = RecoverSignerPublicKey(hash[:], signature2)
	assert.Nil(t, err)
	recoveredAddress = PublicKeyToAddress(key)
	assert.NotEqual(t, wallet.Address, recoveredAddress)
}

func TestSecp256k1Available(t *testing.T) {
	// If geth is built without cgo, geth.crypto defaults to pure go implementation.
	// Node can be run in this mode, but it is slower.
	// While running like this is supported, this test fails to build in without cgo crypto to
	// detect such situation.
	_, _ = secp256k1.Sign([]byte("Hello, World!"), []byte("Hello, World!"))
}
