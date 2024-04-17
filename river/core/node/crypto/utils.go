package crypto

import (
	"encoding/hex"

	eth_crypto "github.com/ethereum/go-ethereum/crypto"
)

const (
	// TransactionResultSuccess indidactes that transaction was successful
	TransactionResultSuccess = uint64(1)
)

// GetDeviceId returns the device id for a given wallet, useful for testing
func GetDeviceId(wallet *Wallet) (string, error) {
	publicKey := eth_crypto.FromECDSAPub(&wallet.PrivateKeyStruct.PublicKey)
	hash := RiverHash(publicKey)
	return hex.EncodeToString(hash[:]), nil
}
