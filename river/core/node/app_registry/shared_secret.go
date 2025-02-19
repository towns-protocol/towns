package app_registry

import (
	"crypto/aes"
	"crypto/rand"
	"io"
)

// genHS256SharedSecret generates a cryptographically secure random 32-byte key for use
// between the app registry service and the app developer as a method of authenticating
// that webhook calls came from the registry service.
func genHS256SharedSecret() ([32]byte, error) {
	var key [32]byte
	_, err := io.ReadFull(rand.Reader, key[:])
	if err != nil {
		return [32]byte{}, err
	}
	return key, nil
}

// encryptSharedSecret uses 256-bit aes encryption to encrypt the 32-byte, HS256 shared
// secret for secure storage in the database.
func encryptSharedSecret(secret [32]byte, dataEncryptionKey [32]byte) ([32]byte, error) {
	cipher, err := aes.NewCipher(dataEncryptionKey[:])
	if err != nil {
		return [32]byte{}, err
	}

	var encrypted [32]byte
	// Encrypt both blocks
	cipher.Encrypt(encrypted[:], secret[:])
	cipher.Encrypt(encrypted[16:], secret[16:])
	return encrypted, nil
}

// decryptSharedSecret decrypts a secret encrypted via aes with the supplied data encryption key.
func decryptSharedSecret(encryptedSecret [32]byte, dataEncryptionKey [32]byte) ([32]byte, error) {
	cipher, err := aes.NewCipher(dataEncryptionKey[:])
	if err != nil {
		return [32]byte{}, err
	}

	var decrypted [32]byte
	// Decrypt both blocks
	cipher.Decrypt(decrypted[:], encryptedSecret[:])
	cipher.Decrypt(decrypted[16:], encryptedSecret[16:])
	return decrypted, nil
}
