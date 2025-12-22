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
	"golang.org/x/crypto/sha3"

	. "github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/logging"
	. "github.com/towns-protocol/towns/core/node/protocol"
)

const (
	WALLET_PATH              = "./wallet"
	WALLET_PATH_PRIVATE_KEY  = "./wallet/private_key"
	WALLET_PATH_PUBLIC_KEY   = "./wallet/public_key"
	WALLET_PATH_NODE_ADDRESS = "./wallet/node_address"
	KEY_FILE_PERMISSIONS     = 0o600
)

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

// TownsHash is a hasher with a given header. Use different headers for different types of hashes to avoid replay
// attacks.
type TownsHash [8]byte

// TownsHashForEvents is a TownsHash with the prefix 'CSBLANCA' as bytes for hashing Towns events.
var TownsHashForEvents = TownsHash{67, 83, 66, 76, 65, 78, 67, 65} // Prefix 'CSBLANCA' as bytes.

// TownsHashForSnapshots is a TownsHash with the prefix 'SNAPSHOT' as bytes for hashing Towns snapshots.
var TownsHashForSnapshots = TownsHash{83, 78, 65, 80, 83, 72, 79, 84} // Prefix 'SNAPSHOT' as bytes.

// TownsHashForCert is a TownsHash with the prefix 'INTRCERT' as bytes for hashing node-2-node mTLS certificate hash.
var TownsHashForCert = TownsHash{73, 78, 84, 82, 67, 69, 82, 84} // Prefix 'INTRCERT' as bytes.

// Hash computes the hash of the given buffer using the Towns hashing algorithm.
// It uses Keccak256 to ensure compatability with the EVM and uses a header, separator,
// and footer to ensure that the hash is unique to Towns.
func (h TownsHash) Hash(buffer []byte) common.Hash {
	hash := sha3.NewLegacyKeccak256()
	_, _ = hash.Write(h[:])
	// Write length of the buffer as 64-bit little endian uint.
	l := uint64(len(buffer))
	_, _ = hash.Write(
		[]byte{
			byte(l),
			byte(l >> 8),
			byte(l >> 16),
			byte(l >> 24),
			byte(l >> 32),
			byte(l >> 40),
			byte(l >> 48),
			byte(l >> 56),
		},
	)
	_, _ = hash.Write(HASH_SEPARATOR)
	_, _ = hash.Write(buffer)
	_, _ = hash.Write(HASH_FOOTER)
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
	log := logging.FromCtx(ctx)

	key, err := crypto.GenerateKey()
	if err != nil {
		return nil, AsRiverError(err, Err_INTERNAL).
			Message("Failed to generate wallet private key").
			Func("NewWallet")
	}
	address := crypto.PubkeyToAddress(key.PublicKey)

	log.Infow(
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
	log := logging.FromCtx(ctx)

	privKey = strings.TrimPrefix(privKey, "0x")

	// create key pair from private key bytes
	k, err := crypto.HexToECDSA(privKey)
	if err != nil {
		return nil, AsRiverError(err, Err_INVALID_ARGUMENT).
			Message("Failed to decode private key from hex").
			Func("NewWalletFromPrivKey")
	}
	address := crypto.PubkeyToAddress(k.PublicKey)

	log.Infow(
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

func NewWalletFromEnv(ctx context.Context, envVar string) (*Wallet, error) {
	privKey, ok := os.LookupEnv(envVar)
	if !ok {
		return nil, AsRiverError(nil, Err_BAD_CONFIG).
			Message("Environment variable not set").
			Tag("variable", envVar).
			Func("NewWalletFromEnv")
	}
	return NewWalletFromPrivKey(ctx, privKey)
}

func LoadWallet(ctx context.Context, filename string) (*Wallet, error) {
	log := logging.FromCtx(ctx)

	key, err := crypto.LoadECDSA(filename)
	if err != nil {
		log.Errorw("Failed to load wallet.", "error", err)
		return nil, AsRiverError(err, Err_BAD_CONFIG).
			Message("Failed to load wallet from file").
			Tag("filename", filename).
			Func("LoadWallet")
	}
	address := crypto.PubkeyToAddress(key.PublicKey)

	log.Infow("Wallet loaded.", "address", address.Hex(), "publicKey", crypto.FromECDSAPub(&key.PublicKey))
	return &Wallet{
			PrivateKeyStruct: key,
			PrivateKey:       crypto.FromECDSA(key),
			Address:          address,
		},
		nil
}

func (w *Wallet) SaveWallet(
	ctx context.Context,
	privateKeyFilename string,
	publicKeyFilename string,
	addressFilename string,
	overwrite bool,
) error {
	log := logging.FromCtx(ctx)

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

	log.Infow(
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

func (w *Wallet) SignHash(hash common.Hash) ([]byte, error) {
	return crypto.Sign(hash[:], w.PrivateKeyStruct)
}

func RecoverSignerPublicKey(hash []byte, signature []byte) ([]byte, error) {
	pubKey, err := crypto.Ecrecover(hash, signature)
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

func PackWithNonce(address common.Address, nonce uint64) (common.Hash, error) {
	addressTy, err := abi.NewType("address", "address", nil)
	if err != nil {
		return common.Hash{}, AsRiverError(err, Err_INTERNAL).
			Message("Invalid abi type definition").
			Tag("type", "address").
			Func("PackWithNonce")
	}

	uint256Ty, err := abi.NewType("uint256", "uint256", nil)
	if err != nil {
		return common.Hash{}, AsRiverError(err, Err_INTERNAL).
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
		return common.Hash{}, AsRiverError(err, Err_INTERNAL).
			Message("Failed to pack arguments").
			Func("PackWithNonce")
	}

	hasher := sha3.NewLegacyKeccak256()
	hasher.Write(bytes)
	bytes = hasher.Sum(nil)

	return common.BytesToHash(bytes), nil
}

func ToEthMessageHash(messageHash common.Hash) common.Hash {
	bytes := append(
		[]byte("\x19Ethereum Signed Message:\n"),
		[]byte(fmt.Sprintf("%d", len(messageHash)))...,
	)
	bytes = append(bytes, messageHash.Bytes()...)
	return crypto.Keccak256Hash(bytes)
}

func (w Wallet) String() string {
	return w.Address.Hex()
}

func (w Wallet) GoString() string {
	return w.Address.Hex()
}
