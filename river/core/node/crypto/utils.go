package crypto

import (
	"context"
	"encoding/hex"
	"math/big"
	"time"

	"github.com/ethereum/go-ethereum/params"

	eth_crypto "github.com/ethereum/go-ethereum/crypto"
)

const (
	// TransactionResultSuccess indicates that transaction was successful
	TransactionResultSuccess = uint64(1)
)

// GetDeviceId returns the device id for a given wallet, useful for testing
func GetDeviceId(wallet *Wallet) (string, error) {
	publicKey := eth_crypto.FromECDSAPub(&wallet.PrivateKeyStruct.PublicKey)
	hash := RiverHash(publicKey)
	return hex.EncodeToString(hash[:]), nil
}

func loadChainID(ctx context.Context, client BlockchainClient) *big.Int {
	for {
		if chainID, _ := client.ChainID(ctx); chainID != nil {
			return chainID
		}
		select {
		case <-ctx.Done():
			return nil
		case <-time.After(2 * time.Second):
			continue
		}
	}
}

func WeiToEth(wei *big.Int) float64 {
	b, _ := new(big.Float).Quo(new(big.Float).SetInt(wei), big.NewFloat(params.Ether)).Float64()
	return b
}
