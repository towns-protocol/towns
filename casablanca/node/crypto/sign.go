package crypto

import (
	"casablanca/node/dlog"
	"context"
	"crypto/ecdsa"
	"encoding/binary"
	"encoding/hex"
	"io"
	"os"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/ethereum/go-ethereum/crypto/secp256k1"

	"golang.org/x/crypto/sha3"
)

const (
	WALLET_PATH              = "./wallet"
	WALLET_PATH_PRIVATE_KEY  = "./wallet/private_key"
	WALLET_PATH_PUBLIC_KEY   = "./wallet/public_key"
	WALLET_PATH_NODE_ADDRESS = "./wallet/node_address"
	KEY_FILE_PERMISSIONS     = 0600
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

func LoadWallet(ctx context.Context, filename string) (*Wallet, error) {
	log := dlog.CtxLog(ctx)

	key, err := crypto.LoadECDSA(filename)
	if err != nil {
		log.Error("Failed to load wallet.", "error", err)
		return nil, err
	}
	address := crypto.PubkeyToAddress(key.PublicKey)

	log.Info("Wallet loaded.", "address", address.Hex(), "publicKey", crypto.FromECDSAPub(&key.PublicKey))
	return &Wallet{
			PrivateKeyStruct: key,
			PrivateKey:       crypto.FromECDSA(key),
			Address:          address,
			AddressStr:       address.Hex(),
		},
		nil
}

func (w *Wallet) SaveWallet(ctx context.Context, privateKeyFilename string, publicKeyFilename string, addressFilename string, overwrite bool) error {
	log := dlog.CtxLog(ctx)

	openFlags := os.O_WRONLY | os.O_CREATE | os.O_EXCL
	if overwrite {
		openFlags = os.O_WRONLY | os.O_CREATE | os.O_TRUNC
	}

	fPriv, err := os.OpenFile(privateKeyFilename, openFlags, KEY_FILE_PERMISSIONS)
	if err != nil {
		return err
	}
	defer fPriv.Close()

	fPub, err := os.OpenFile(publicKeyFilename, openFlags, KEY_FILE_PERMISSIONS)
	if err != nil {
		return err
	}
	defer fPub.Close()

	fAddr, err := os.OpenFile(addressFilename, openFlags, KEY_FILE_PERMISSIONS)
	if err != nil {
		return err
	}
	defer fAddr.Close()

	k := hex.EncodeToString(w.PrivateKey)
	_, err = fPriv.WriteString(k)
	if err != nil {
		return err
	}

	err = fPriv.Close()
	if err != nil {
		return err
	}

	k = hex.EncodeToString(crypto.FromECDSAPub(&w.PrivateKeyStruct.PublicKey))
	_, err = fPub.WriteString(k)
	if err != nil {
		return err
	}

	err = fPub.Close()
	if err != nil {
		return err
	}

	_, err = fAddr.WriteString(w.AddressStr)
	if err != nil {
		return err
	}

	err = fAddr.Close()
	if err != nil {
		return err
	}

	log.Info("Wallet saved.", "address", w.Address.Hex(), "publicKey", crypto.FromECDSAPub(&w.PrivateKeyStruct.PublicKey), "filename", privateKeyFilename)
	return nil
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
