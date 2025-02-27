package crypto

import (
	"bytes"

	"github.com/ethereum/go-ethereum/accounts"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/crypto"

	. "github.com/towns-protocol/towns/core/node/base"
	. "github.com/towns-protocol/towns/core/node/protocol"
)

func RecoverEthereumMessageSignerPublicKey(hashSrc []byte, inSignature []byte) ([]byte, error) {
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

	recoveredKey, err := crypto.Ecrecover(hash, signature)
	if err != nil {
		return nil, AsRiverError(err).
			Message("Unable to recover public key").
			Func("recoverEthereumMessageSignerAddress")
	}
	return recoveredKey, nil
}

func RecoverEthereumMessageSignerAddress(hashSrc []byte, inSignature []byte) (*common.Address, error) {
	recoveredKey, err := RecoverEthereumMessageSignerPublicKey(hashSrc, inSignature)
	if err != nil {
		return nil, err
	}
	address := PublicKeyToAddress(recoveredKey)
	return &address, nil
}

func CheckDelegateSig(expectedAddress []byte, devicePubKey []byte, delegateSig []byte, expiryEpochMs int64) error {
	hashSrc, err := RiverDelegateHashSrc(devicePubKey, expiryEpochMs)
	if err != nil {
		return err
	}
	recoveredAddress, err := RecoverEthereumMessageSignerAddress(hashSrc, delegateSig)
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
			"deviceAddress",
			PublicKeyToAddress(devicePubKey),
		)
	}
	return nil
}
