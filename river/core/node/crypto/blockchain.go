package crypto

import (
	"context"
	"math/big"
	"time"

	. "github.com/river-build/river/core/node/base"
	"github.com/river-build/river/core/node/config"
	. "github.com/river-build/river/core/node/protocol"

	"github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/ethclient"
)

// BlockchainClient is an interface that covers common functionality
// between ethclient.Client and simulated.Backend.
// go-ethereum splits functionality into multiple implicit interfaces,
// but there is no explicit interface for client.
type BlockchainClient interface {
	ethereum.BlockNumberReader
	ethereum.ChainReader
	ethereum.ChainStateReader
	ethereum.ContractCaller
	ethereum.GasEstimator
	ethereum.GasPricer
	ethereum.GasPricer1559
	ethereum.FeeHistoryReader
	ethereum.LogFilterer
	ethereum.PendingStateReader
	ethereum.PendingContractCaller
	ethereum.TransactionReader
	ethereum.TransactionSender
	ethereum.ChainIDReader
}

type Closable interface {
	Close()
}

// Holds necessary information to interact with the blockchain.
// Use NewReadOnlyBlockchain to create a read-only Blockchain.
// Use NewReadWriteBlockchain to create a read-write Blockchain that tracks nonce used by the account.
type Blockchain struct {
	ChainId         *big.Int
	Wallet          *Wallet
	Client          BlockchainClient
	ClientCloser    Closable
	TxRunner        *TxRunner
	Config          *config.ChainConfig
	BlockMonitor    BlockMonitor
	InitialBlockNum BlockNumber
}

// NewBlockchain creates a new Blockchain instance that
// contains all necessary information to interact with the blockchain.
// If wallet is nil, the blockchain will be read-only.
// If wallet is not nil, the blockchain will be read-write:
// TxRunner will be created to track nonce used by the account.
func NewBlockchain(ctx context.Context, cfg *config.ChainConfig, wallet *Wallet) (*Blockchain, error) {
	client, err := ethclient.DialContext(ctx, cfg.NetworkUrl)
	if err != nil {
		return nil, AsRiverError(err, Err_CANNOT_CONNECT).
			Message("Cannot connect to chain RPC node").
			Tag("chainId", cfg.ChainId).
			Func("NewBlockchain")
	}

	return NewBlockchainWithClient(ctx, cfg, wallet, client, client)
}

func NewBlockchainWithClient(ctx context.Context, cfg *config.ChainConfig, wallet *Wallet, client BlockchainClient, clientCloser Closable) (*Blockchain, error) {
	chainId, err := client.ChainID(ctx)
	if err != nil {
		return nil, AsRiverError(err).
			Message("Cannot retrieve chain id").
			Func("NewBlockchainWithClient")
	}

	if chainId.Uint64() != uint64(cfg.ChainId) {
		return nil, RiverError(Err_BAD_CONFIG, "Chain id mismatch",
			"configured", cfg.ChainId,
			"providerChainId", chainId.Uint64()).Func("NewBlockchainWithClient")
	}

	blockNum, err := client.BlockNumber(ctx)
	if err != nil {
		return nil, AsRiverError(err, Err_CANNOT_CONNECT).Message("Cannot retrieve block number").Func("NewBlockchainWithClient")
	}
	initialBlockNum := BlockNumber(blockNum)

	bm, err := NewBlockMonitor(ctx, client, initialBlockNum, time.Duration(cfg.BlockTimeMs)*time.Millisecond)
	if err != nil {
		return nil, AsRiverError(err, Err_CANNOT_CONNECT).Message("Cannot create block monitor").Func("NewBlockchainWithClient")
	}

	bc := &Blockchain{
		ChainId:         big.NewInt(int64(cfg.ChainId)),
		Client:          client,
		ClientCloser:    clientCloser,
		Config:          cfg,
		BlockMonitor:    bm,
		InitialBlockNum: initialBlockNum,
	}

	if wallet != nil {
		bc.TxRunner = NewTxRunner(ctx, &TxRunnerParams{
			Wallet:  wallet,
			Client:  bc.Client,
			ChainId: bc.ChainId,
			// TODO: timeout config
		})

		bc.Wallet = wallet
	}

	return bc, nil
}

func (b *Blockchain) Close() {
	if b.BlockMonitor != nil {
		b.BlockMonitor.Close()
	}
	if b.ClientCloser != nil {
		b.ClientCloser.Close()
	}
}
