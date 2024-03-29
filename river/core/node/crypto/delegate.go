package crypto

import (
	"bytes"

	"github.com/ethereum/go-ethereum/accounts"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/crypto/secp256k1"

	. "github.com/river-build/river/core/node/base"
	. "github.com/river-build/river/core/node/protocol"
)

func recoverEthereumMessageSignerAddress(hashSrc []byte, inSignature []byte) (*common.Address, error) {
	if len(inSignature) != 65 {
		return nil, RiverError(
			Err_BAD_EVENT_SIGNATURE,
			"Bad signature provided, expected 65 bytes",
			"len",
			len(inSignature),
		)
	}

	var signature []byte
	// Ethereum signatures are in the [R || S || V] format where V is 27 or 28
	// Support both the Ethereum and directly signed formats
	if inSignature[64] == 27 || inSignature[64] == 28 {
		// copy the signature to avoid modifying the original
		signature = bytes.Clone(inSignature)
		signature[64] -= 27
	} else {
		signature = inSignature
	}

	hash := accounts.TextHash(hashSrc)

	recoveredKey, err := secp256k1.RecoverPubkey(hash, signature)
	if err != nil {
		return nil, AsRiverError(err).
			Message("Unable to recover public key").
			Func("recoverEthereumMessageSignerAddress")
	}
	address := PublicKeyToAddress(recoveredKey)
	return &address, nil
}

func CheckDelegateSig(expectedAddress []byte, devicePubKey []byte, delegateSig []byte, expiryEpochMs int64) error {
	hashSrc, err := RiverDelegateHashSrc(devicePubKey, expiryEpochMs)
	if err != nil {
		return err
	}
	recoveredAddress, err := recoverEthereumMessageSignerAddress(hashSrc, delegateSig)
	if err != nil {
		return err
	}
	if !bytes.Equal(expectedAddress, recoveredAddress.Bytes()) {
		return RiverError(
			Err_BAD_EVENT_SIGNATURE,
			"(Ethereum Message) Bad signature provided",
			"computed address",
			recoveredAddress,
			"expected address",
			expectedAddress,
		)
	}
	return nil
}
