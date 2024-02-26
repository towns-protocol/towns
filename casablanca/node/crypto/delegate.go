package crypto

import (
	"bytes"

	"github.com/ethereum/go-ethereum/accounts"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/crypto/secp256k1"

	. "github.com/river-build/river/base"
	. "github.com/river-build/river/protocol"
)

func RecoverDelegateSigAddress(devicePubKey, delegateSig []byte) (*common.Address, error) {
	hash := TownsHash(devicePubKey)
	recoveredKey, err := RecoverSignerPublicKey(hash.Bytes(), delegateSig)
	if err != nil {
		return nil, err
	}
	address := PublicKeyToAddress(recoveredKey)
	return &address, nil
}

func CheckDelegateSig(expectedAddress []byte, devicePubKey, delegateSig []byte) error {
	recoveredAddress, err := RecoverDelegateSigAddress(devicePubKey, delegateSig)
	if err != nil {
		return err
	}
	if !bytes.Equal(expectedAddress, recoveredAddress.Bytes()) {
		return RiverError(
			Err_BAD_EVENT_SIGNATURE,
			"Bad signature provided",
			"computed_address",
			recoveredAddress,
			"event_creatorAddress",
			expectedAddress,
		)
	}
	return nil
}

func RecoverEthereumMessageSignerAddress(content, signature []byte) (*common.Address, error) {
	if len(signature) != 65 {
		return nil, RiverError(Err_BAD_EVENT_SIGNATURE, "Bad signature provided, expected 65 bytes", "len", len(signature))
	}
	if signature[64] != 27 && signature[64] != 28 {
		return nil, RiverError(
			Err_BAD_EVENT_SIGNATURE,
			"Bad signature provided, expected recovery id 27 or 28",
			"id",
			signature[64],
		)
	}
	signature[64] -= 27

	hash := accounts.TextHash(content)
	recoveredKey, err := secp256k1.RecoverPubkey(hash, signature)
	if err != nil {
		return nil, err
	}
	address := PublicKeyToAddress(recoveredKey)
	return &address, nil
}

func CheckEthereumMessageSignature(expectedAddress []byte, devicePubKey, delegateSig []byte) error {
	recoveredAddress, err := RecoverEthereumMessageSignerAddress(devicePubKey, delegateSig)
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
