package crypto

import (
	"context"
	"math/big"

	. "github.com/river-build/river/base"
	"github.com/river-build/river/config"
	. "github.com/river-build/river/protocol"

	"github.com/ethereum/go-ethereum/ethclient"
)

// Holds necessary information to interact with the blockchain.
// Use NewReadOnlyBlockchain to create a read-only Blockchain.
// Use NewReadWriteBlockchain to create a read-write Blockchain that tracks nonce used by the account.
type Blockchain struct {
	ChainId  *big.Int
	Wallet   *Wallet
	Client   *ethclient.Client
	TxRunner *TxRunner
	Config   *config.ChainConfig
}

func NewReadOnlyBlockchain(ctx context.Context, cfg *config.ChainConfig) (*Blockchain, error) {
	client, err := ethclient.DialContext(ctx, cfg.NetworkUrl)
	if err != nil {
		return nil, err
	}

	chainId, err := client.ChainID(ctx)
	if err != nil {
		return nil, err
	}

	if chainId.Uint64() != uint64(cfg.ChainId) {
		return nil, RiverError(Err_BAD_CONFIG, "Chain id mismatch",
			"configured", cfg.ChainId,
			"providerChainId", chainId.Uint64()).Func("NewROBlockchain")
	}

	return &Blockchain{
		ChainId: big.NewInt(int64(cfg.ChainId)),
		Client:  client,
		Config:  cfg,
	}, nil
}

func NewReadWriteBlockchain(ctx context.Context, cfg *config.ChainConfig, wallet *Wallet) (*Blockchain, error) {
	bc, err := NewReadOnlyBlockchain(ctx, cfg)
	if err != nil {
		return nil, err
	}

	bc.TxRunner = NewTxRunner(ctx, &TxRunnerParams{
		Wallet:  wallet,
		Client:  bc.Client,
		ChainId: bc.ChainId,
		// TODO: timeout config
	})

	bc.Wallet = wallet

	return bc, nil
}
