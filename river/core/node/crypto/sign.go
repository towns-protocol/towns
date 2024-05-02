package crypto

import (
	"bytes"
	"context"
	"crypto/ecdsa"
	"encoding/binary"
	"encoding/hex"
	"fmt"
	"io"
	"math/big"
	"os"
	"strings"

	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/ethereum/go-ethereum/crypto/secp256k1"
	. "github.com/river-build/river/core/node/base"
	"github.com/river-build/river/core/node/dlog"
	. "github.com/river-build/river/core/node/protocol"
	"golang.org/x/crypto/sha3"
)

const (
	WALLET_PATH              = "./wallet"
	WALLET_PATH_PRIVATE_KEY  = "./wallet/private_key"
	WALLET_PATH_PUBLIC_KEY   = "./wallet/public_key"
	WALLET_PATH_NODE_ADDRESS = "./wallet/node_address"
	KEY_FILE_PERMISSIONS     = 0o600
)

// String 'CSBLANCA' as bytes.
var HASH_HEADER = []byte{67, 83, 66, 76, 65, 78, 67, 65}

// String 'ABCDEFG>' as bytes.
var HASH_SEPARATOR = []byte{65, 66, 67, 68, 69, 70, 71, 62}

// String '<GFEDCBA' as bytes.
var HASH_FOOTER = []byte{60, 71, 70, 69, 68, 67, 66, 65}

// String 'RIVERSIG' as bytes.
var DELEGATE_HASH_HEADER = []byte{82, 73, 86, 69, 82, 83, 73, 71}

func writeOrPanic(w io.Writer, buf []byte) {
	_, err := w.Write(buf)
	if err != nil {
		panic(err)
	}
}

// RiverHash computes the hash of the given buffer using the River hashing algorithm.
// It uses Keccak256 to ensure compatability with the EVM and uses a header, separator,
// and footer to ensure that the hash is unique to River.
func RiverHash(buffer []byte) common.Hash {
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
	return common.BytesToHash(hash.Sum(nil))
}

// RiverDelegateHashSrc computes the hash of the given buffer using the River delegate hashing algorithm.
func RiverDelegateHashSrc(delegatePublicKey []byte, expiryEpochMs int64) ([]byte, error) {
	if expiryEpochMs < 0 {
		return nil, RiverError(Err_INVALID_ARGUMENT, "expiryEpochMs must be non-negative")
	}
	if len(delegatePublicKey) != 64 && len(delegatePublicKey) != 65 {
		return nil, RiverError(Err_INVALID_ARGUMENT, "delegatePublicKey must be 64 or 65 bytes")
	}
	writer := bytes.Buffer{}
	writeOrPanic(&writer, DELEGATE_HASH_HEADER)
	writeOrPanic(&writer, delegatePublicKey)
	// Write expiry as 64-bit little endian uint.
	err := binary.Write(&writer, binary.LittleEndian, expiryEpochMs)
	if err != nil {
		panic(err)
	}
	return writer.Bytes(), nil
}

type Wallet struct {
	PrivateKeyStruct *ecdsa.PrivateKey
	PrivateKey       []byte
	Address          common.Address
}

func NewWallet(ctx context.Context) (*Wallet, error) {
	log := dlog.FromCtx(ctx)

	key, err := crypto.GenerateKey()
	if err != nil {
		return nil, AsRiverError(err, Err_INTERNAL).
			Message("Failed to generate wallet private key").
			Func("NewWallet")
	}
	address := crypto.PubkeyToAddress(key.PublicKey)

	log.Info(
		"New wallet generated.",
		"address",
		address.Hex(),
		"publicKey",
		FormatFullHashFromBytes(crypto.FromECDSAPub(&key.PublicKey)),
	)
	return &Wallet{
			PrivateKeyStruct: key,
			PrivateKey:       crypto.FromECDSA(key),
			Address:          address,
		},
		nil
}

func NewWalletFromPrivKey(ctx context.Context, privKey string) (*Wallet, error) {
	log := dlog.FromCtx(ctx)

	privKey = strings.TrimPrefix(privKey, "0x")

	// create key pair from private key bytes
	k, err := crypto.HexToECDSA(privKey)
	if err != nil {
		return nil, AsRiverError(err, Err_INVALID_ARGUMENT).
			Message("Failed to decode private key from hex").
			Func("NewWalletFromPrivKey")
	}
	address := crypto.PubkeyToAddress(k.PublicKey)

	log.Info(
		"Wallet loaded from configured private key.",
		"address",
		address.Hex(),
		"publicKey",
		crypto.FromECDSAPub(&k.PublicKey),
	)
	return &Wallet{
			PrivateKeyStruct: k,
			PrivateKey:       crypto.FromECDSA(k),
			Address:          address,
		},
		nil
}

func LoadWallet(ctx context.Context, filename string) (*Wallet, error) {
	log := dlog.FromCtx(ctx)

	key, err := crypto.LoadECDSA(filename)
	if err != nil {
		log.Error("Failed to load wallet.", "error", err)
		return nil, AsRiverError(err, Err_BAD_CONFIG).
			Message("Failed to load wallet from file").
			Tag("filename", filename).
			Func("LoadWallet")
	}
	address := crypto.PubkeyToAddress(key.PublicKey)

	log.Info("Wallet loaded.", "address", address.Hex(), "publicKey", crypto.FromECDSAPub(&key.PublicKey))
	return &Wallet{
			PrivateKeyStruct: key,
			PrivateKey:       crypto.FromECDSA(key),
			Address:          address,
		},
		nil
}

func (w *Wallet) SaveWalletFromEnv(
	ctx context.Context,
	privateKeyFilename string,
	publicKeyFilename string,
	addressFilename string,
	overwrite bool,
) error {
	log := dlog.FromCtx(ctx)

	openFlags := os.O_WRONLY | os.O_CREATE | os.O_EXCL
	if overwrite {
		openFlags = os.O_WRONLY | os.O_CREATE | os.O_TRUNC
	}

	fAddr, err := os.OpenFile(addressFilename, openFlags, KEY_FILE_PERMISSIONS)
	if err != nil {
		return AsRiverError(err, Err_BAD_CONFIG).
			Message("Failed to open address file").
			Tag("filename", addressFilename).
			Func("SaveWalletFromEnv")
	}
	defer fAddr.Close()

	_, err = fAddr.WriteString(w.String())
	if err != nil {
		return AsRiverError(err, Err_INTERNAL).
			Message("Failed to write address to file").
			Tag("filename", addressFilename).
			Func("SaveWalletFromEnv")
	}

	err = fAddr.Close()
	if err != nil {
		return AsRiverError(err, Err_INTERNAL).
			Message("Failed to close address file").
			Tag("filename", addressFilename).
			Func("SaveWalletFromEnv")
	}

	fPriv, err := os.OpenFile(privateKeyFilename, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, KEY_FILE_PERMISSIONS)
	if err != nil {
		return AsRiverError(err, Err_BAD_CONFIG).
			Message("Failed to open private key file").
			Tag("filename", privateKeyFilename).
			Func("SaveWalletFromEnv")
	}
	defer fPriv.Close()

	fPub, err := os.OpenFile(publicKeyFilename, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, KEY_FILE_PERMISSIONS)
	if err != nil {
		return AsRiverError(err, Err_BAD_CONFIG).
			Message("Failed to open public key file").
			Tag("filename", publicKeyFilename).
			Func("SaveWalletFromEnv")
	}
	defer fPub.Close()

	k := hex.EncodeToString(w.PrivateKey)
	_, err = fPriv.WriteString(k)
	if err != nil {
		return AsRiverError(err, Err_INTERNAL).
			Message("Failed to write private key to file").
			Tag("filename", privateKeyFilename).
			Func("SaveWalletFromEnv")
	}

	err = fPriv.Close()
	if err != nil {
		return AsRiverError(err, Err_INTERNAL).
			Message("Failed to close private key file").
			Tag("filename", privateKeyFilename).
			Func("SaveWalletFromEnv")
	}

	k = hex.EncodeToString(crypto.FromECDSAPub(&w.PrivateKeyStruct.PublicKey))
	_, err = fPub.WriteString(k)
	if err != nil {
		return AsRiverError(err, Err_INTERNAL).
			Message("Failed to write public key to file").
			Tag("filename", publicKeyFilename).
			Func("SaveWalletFromEnv")
	}

	err = fPub.Close()
	if err != nil {
		return AsRiverError(err, Err_INTERNAL).
			Message("Failed to close public key file").
			Tag("filename", publicKeyFilename).
			Func("SaveWalletFromEnv")
	}

	log.Info(
		"Wallet saved from env.",
		"address",
		w.Address.Hex(),
		"publicKey",
		crypto.FromECDSAPub(&w.PrivateKeyStruct.PublicKey),
	)
	return nil
}

func (w *Wallet) SaveWallet(
	ctx context.Context,
	privateKeyFilename string,
	publicKeyFilename string,
	addressFilename string,
	overwrite bool,
) error {
	log := dlog.FromCtx(ctx)

	openFlags := os.O_WRONLY | os.O_CREATE | os.O_EXCL
	if overwrite {
		openFlags = os.O_WRONLY | os.O_CREATE | os.O_TRUNC
	}

	fPriv, err := os.OpenFile(privateKeyFilename, openFlags, KEY_FILE_PERMISSIONS)
	if err != nil {
		return AsRiverError(err, Err_BAD_CONFIG).
			Message("Failed to open private key file").
			Tag("filename", privateKeyFilename).
			Func("SaveWallet")
	}
	defer fPriv.Close()

	fPub, err := os.OpenFile(publicKeyFilename, openFlags, KEY_FILE_PERMISSIONS)
	if err != nil {
		return AsRiverError(err, Err_BAD_CONFIG).
			Message("Failed to open public key file").
			Tag("filename", publicKeyFilename).
			Func("SaveWallet")
	}
	defer fPub.Close()

	fAddr, err := os.OpenFile(addressFilename, openFlags, KEY_FILE_PERMISSIONS)
	if err != nil {
		return AsRiverError(err, Err_BAD_CONFIG).
			Message("Failed to open address file").
			Tag("filename", addressFilename).
			Func("SaveWallet")
	}
	defer fAddr.Close()

	k := hex.EncodeToString(w.PrivateKey)
	_, err = fPriv.WriteString(k)
	if err != nil {
		return AsRiverError(err, Err_INTERNAL).
			Message("Failed to write private key to file").
			Tag("filename", privateKeyFilename).
			Func("SaveWallet")
	}

	err = fPriv.Close()
	if err != nil {
		return AsRiverError(err, Err_INTERNAL).
			Message("Failed to close private key file").
			Tag("filename", privateKeyFilename).
			Func("SaveWallet")
	}

	k = hex.EncodeToString(crypto.FromECDSAPub(&w.PrivateKeyStruct.PublicKey))
	_, err = fPub.WriteString(k)
	if err != nil {
		return AsRiverError(err, Err_INTERNAL).
			Message("Failed to write public key to file").
			Tag("filename", publicKeyFilename).
			Func("SaveWallet")
	}

	err = fPub.Close()
	if err != nil {
		return AsRiverError(err, Err_INTERNAL).
			Message("Failed to close public key file").
			Tag("filename", publicKeyFilename).
			Func("SaveWallet")
	}

	_, err = fAddr.WriteString(w.String())
	if err != nil {
		return AsRiverError(err, Err_INTERNAL).
			Message("Failed to write address to file").
			Tag("filename", addressFilename).
			Func("SaveWallet")
	}

	err = fAddr.Close()
	if err != nil {
		return AsRiverError(err, Err_INTERNAL).
			Message("Failed to close address file").
			Tag("filename", addressFilename).
			Func("SaveWallet")
	}

	log.Info(
		"Wallet saved.",
		"address",
		w.Address.Hex(),
		"publicKey",
		crypto.FromECDSAPub(&w.PrivateKeyStruct.PublicKey),
		"filename",
		privateKeyFilename,
	)
	return nil
}

func (w *Wallet) SignHash(hash []byte) ([]byte, error) {
	return secp256k1.Sign(hash, w.PrivateKey)
}

func RecoverSignerPublicKey(hash []byte, signature []byte) ([]byte, error) {
	pubKey, err := secp256k1.RecoverPubkey(hash, signature)
	if err == nil {
		return pubKey, nil
	}
	return nil, AsRiverError(err, Err_INVALID_ARGUMENT).
		Message("Could not recover public key from signature").
		Func("RecoverSignerPublicKey")
}

func PublicKeyToAddress(publicKey []byte) common.Address {
	return common.BytesToAddress(crypto.Keccak256(publicKey[1:])[12:])
}

func PackWithNonce(address common.Address, nonce uint64) ([]byte, error) {
	addressTy, err := abi.NewType("address", "address", nil)
	if err != nil {
		return nil, AsRiverError(err, Err_INTERNAL).
			Message("Invalid abi type definition").
			Tag("type", "address").
			Func("PackWithNonce")
	}

	uint256Ty, err := abi.NewType("uint256", "uint256", nil)
	if err != nil {
		return nil, AsRiverError(err, Err_INTERNAL).
			Message("Invalid abi type definition").
			Tag("type", "uint256").
			Func("PackWithNonce")
	}
	arguments := abi.Arguments{
		{
			Type: addressTy,
		},
		{
			Type: uint256Ty,
		},
	}
	bytes, err := arguments.Pack(address, new(big.Int).SetUint64(nonce))
	if err != nil {
		return nil, AsRiverError(err, Err_INTERNAL).
			Message("Failed to pack arguments").
			Func("PackWithNonce")
	}

	hasher := sha3.NewLegacyKeccak256()
	hasher.Write(bytes)
	bytes = hasher.Sum(nil)

	return bytes, nil
}

func ToEthMessageHash(messageHash []byte) []byte {
	bytes := append(
		[]byte("\x19Ethereum Signed Message:\n"),
		[]byte(fmt.Sprintf("%d", len(messageHash)))...,
	)
	bytes = append(bytes, messageHash...)
	return crypto.Keccak256(bytes)
}

func (w Wallet) String() string {
	return w.Address.Hex()
}

func (w Wallet) GoString() string {
	return w.Address.Hex()
}
