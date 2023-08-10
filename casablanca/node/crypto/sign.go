package crypto

import (
	"casablanca/node/dlog"
	"context"
	"crypto/ecdsa"
	"encoding/binary"
	"io"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/ethereum/go-ethereum/crypto/secp256k1"

	"golang.org/x/crypto/sha3"
)

const (
	TOWNS_HASH_SIZE = 32
)

// String 'CSBLANCA' as bytes.
var HASH_HEADER = []byte{67, 83, 66, 76, 65, 78, 67, 65}

// String 'ABCDEFG>' as bytes.
var HASH_SEPARATOR = []byte{65, 66, 67, 68, 69, 70, 71, 62}

// String '<GFEDCBA' as bytes.
var HASH_FOOTER = []byte{60, 71, 70, 69, 68, 67, 66, 65}

func writeOrPanic(w io.Writer, buf []byte) {
	_, err := w.Write(buf)
	if err != nil {
		panic(err)
	}
}

func TownsHash(buffer []byte) []byte {
	hash := sha3.NewLegacyKeccak256()
	writeOrPanic(hash, HASH_HEADER)
	// Write length of buffer as 64-bit little endian uint.
	err := binary.Write(hash, binary.LittleEndian, uint64(len(buffer)))
	if err != nil {
		panic(err)
	}
	writeOrPanic(hash, HASH_SEPARATOR)
	writeOrPanic(hash, buffer)
	writeOrPanic(hash, HASH_FOOTER)
	return hash.Sum(nil)
}

type Wallet struct {
	PrivateKeyStruct *ecdsa.PrivateKey
	PrivateKey       []byte
	Address          common.Address
	AddressStr       string
}

// TODO: stop generating and load from file
func NewWallet(ctx context.Context) (*Wallet, error) {
	log := dlog.CtxLog(ctx)

	key, err := crypto.GenerateKey()
	if err != nil {
		return nil, err
	}
	address := crypto.PubkeyToAddress(key.PublicKey)

	log.Info("New wallet generated.", "address", address.Hex(), "publicKey", crypto.FromECDSAPub(&key.PublicKey))
	return &Wallet{
			PrivateKeyStruct: key,
			PrivateKey:       crypto.FromECDSA(key),
			Address:          address,
			AddressStr:       address.Hex(),
		},
		nil
}

func (w *Wallet) SignHash(hash []byte) ([]byte, error) {
	return secp256k1.Sign(hash, w.PrivateKey)
}

func RecoverSignerPublicKey(hash, signature []byte) ([]byte, error) {
	return secp256k1.RecoverPubkey(hash, signature)
}

func PublicKeyToAddress(publicKey []byte) common.Address {
	return common.BytesToAddress(crypto.Keccak256(publicKey[1:])[12:])
}
