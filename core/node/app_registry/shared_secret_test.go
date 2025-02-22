package app_registry

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestEncryptDecryptSharedSecret(t *testing.T) {
	require := require.New(t)
	// The aes256 data encryption key and the HS256 key are the same length, so generateHSA256SharedSecret
	// can be used in tests to generate a key for aes encryption.
	aesKey, err := genHS256SharedSecret()
	require.NoError(err)

	for range 10 {
		secret, err := genHS256SharedSecret()
		require.NoError(err)

		encrypted, err := encryptSharedSecret(secret, aesKey)
		require.NoError(err)

		decrypted, err := decryptSharedSecret(encrypted, aesKey)
		require.NoError(err)

		require.Equal(
			secret,
			decrypted,
			"Expected encrypted/decrypted to match original secret, original %v, encrypted %v, decrypted %v",
			secret,
			encrypted,
			decrypted,
		)
	}
}
