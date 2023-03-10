package crypto

import (
	"crypto/ecdsa"
	"errors"
	"strconv"

	"github.com/ethereum/go-ethereum/crypto"
	"github.com/ethereum/go-ethereum/crypto/secp256k1"

	"golang.org/x/crypto/sha3"

	log "github.com/sirupsen/logrus"
)

type Wallet struct {
	PrivateKey        *ecdsa.PrivateKey
	Address           []byte
	DelegateSignature []byte
}

func HashPersonalMessage(buffer []byte) []byte {
	len := []byte(strconv.Itoa(len(buffer)))
	hash := sha3.NewLegacyKeccak256()
	hash.Write([]byte{0x19})
	hash.Write([]byte("Ethereum Signed Message:"))
	hash.Write([]byte{0x0A})
	hash.Write(len)
	hash.Write(buffer)
	sum := hash.Sum(nil)
	return sum
}

func NewWallet() (*Wallet, error) {
	key, err := crypto.GenerateKey()
	if err != nil {
		return nil, err
	}
	address := crypto.PubkeyToAddress(key.PublicKey)
	delegateSig, err := makeDelegateSig(key)
	if err != nil {
		return nil, err
	}

	log.Debugf("New wallet generated: %s %v %v", address.String(), crypto.FromECDSAPub(&key.PublicKey), delegateSig)
	return &Wallet{PrivateKey: key, Address: address.Bytes(), DelegateSignature: delegateSig}, nil
}

func makeDelegateSig(key *ecdsa.PrivateKey) ([]byte, error) {
	pubKeyBytes := crypto.FromECDSAPub(&key.PublicKey)
	if len(pubKeyBytes) == 0 || pubKeyBytes[0] != 4 {
		return nil, errors.New("invalid public key")
	}
	publicKeyHash := HashPersonalMessage(pubKeyBytes[1:])
	delegateSig, err := sign(key, publicKeyHash)
	if err != nil {
		return nil, err
	}
	return delegateSig, nil
}

func (w *Wallet) Sign(data []byte) ([]byte, error) {
	hash := HashPersonalMessage(data)
	sig, err := sign(w.PrivateKey, hash)
	if err != nil {
		return nil, err
	}
	return sig, nil
}

func sign(key *ecdsa.PrivateKey, hash []byte) ([]byte, error) {
	sig, err := secp256k1.Sign(hash, key.D.Bytes())
	if err != nil {
		return nil, err
	}

	sig[64] += 27 // Transform V from 0/1 to 27/28
	return sig, nil
}
