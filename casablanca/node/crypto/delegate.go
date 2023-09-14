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

func RecoverEthereumMessageSignerAddress(content, signature []byte) (*common.Address, error) {
	if len(signature) != 65 {
		return nil, RpcErrorf(Err_BAD_EVENT_SIGNATURE, "Bad signature provided, expected 65 bytes, got %d", len(signature))
	}
	if signature[64] != 27 && signature[64] != 28 {
		return nil, RpcErrorf(Err_BAD_EVENT_SIGNATURE, "Bad signature provided, expected recovery id 27 or 28, got %d", signature[64])
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
		return RpcErrorf(Err_BAD_EVENT_SIGNATURE, "(Ethereum Message) Bad signature provided, computed address %x, expected address %x", recoveredAddress, expectedAddress)
	}
	return nil
}
