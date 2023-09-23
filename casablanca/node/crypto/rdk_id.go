package crypto

import (
	. "casablanca/node/base"
	"casablanca/node/protocol"
)

const TOWNS_HASH_SIZE = 32

type RdkId [TOWNS_HASH_SIZE]byte

func RdkIdFromPubKey(signerPubKey []byte) (RdkId, error) {
	// accept only uncompressed pub keys
	if len(signerPubKey) != 65 || (len(signerPubKey) < 1 && signerPubKey[0] != 4) {
		return RdkId{}, RiverErrorf(protocol.Err_BAD_PUBLIC_KEY, "Invalid signer public key length: %d", len(signerPubKey))
	}

	rdkId := [TOWNS_HASH_SIZE]byte(TownsHash(signerPubKey))
	return rdkId, nil
}

func RdkIdFromSlice(slice []byte) (RdkId, error) {
	if len(slice) != TOWNS_HASH_SIZE {
		return RdkId{}, RiverErrorf(protocol.Err_BAD_PUBLIC_KEY, "Invalid slice length: %d", len(slice))
	}

	rdkId := [TOWNS_HASH_SIZE]byte{}
	copy(rdkId[:], slice)
	return rdkId, nil
}
