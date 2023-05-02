package crypto

import (
	"bytes"

	"github.com/ethereum/go-ethereum/accounts"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/crypto/secp256k1"

	. "casablanca/node/base"
	. "casablanca/node/protocol"
)

func RecoverDelegateSigAddress(devicePubKey, delegateSig []byte) (*common.Address, error) {
	hash := TownsHash(devicePubKey)
	recoveredKey, err := RecoverSignerPublicKey(hash, delegateSig)
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
		return RpcErrorf(Err_BAD_EVENT_SIGNATURE, "Bad signature provided, computed address %x, event creatorAddress %x", recoveredAddress, expectedAddress)
	}
	return nil
}

// TODO(HNT-1380): remove this function once transition to new delegate sig is complete
func RecoverOldDelegateSigAddress(devicePubKey, delegateSig []byte) (*common.Address, error) {
	if len(delegateSig) != 65 {
		return nil, RpcErrorf(Err_BAD_EVENT_SIGNATURE, "Bad signature provided, expected 65 bytes, got %d", len(delegateSig))
	}
	if delegateSig[64] != 27 && delegateSig[64] != 28 {
		return nil, RpcErrorf(Err_BAD_EVENT_SIGNATURE, "Bad signature provided, expected recovery id 27 or 28, got %d", delegateSig[64])
	}
	delegateSig[64] -= 27

	hash := accounts.TextHash(devicePubKey)
	recoveredKey, err := secp256k1.RecoverPubkey(hash, delegateSig)
	if err != nil {
		return nil, err
	}
	address := PublicKeyToAddress(recoveredKey)
	return &address, nil
}

// TODO(HNT-1380): remove this function once transition to new delegate sig is complete
func CheckOldDelegateSig(expectedAddress []byte, devicePubKey, delegateSig []byte) error {
	recoveredAddress, err := RecoverOldDelegateSigAddress(devicePubKey, delegateSig)
	if err != nil {
		return err
	}
	if !bytes.Equal(expectedAddress, recoveredAddress.Bytes()) {
		return RpcErrorf(Err_BAD_EVENT_SIGNATURE, "(Old Delegate) Bad signature provided, computed address %x, event creatorAddress %x", recoveredAddress, expectedAddress)
	}
	return nil
}
