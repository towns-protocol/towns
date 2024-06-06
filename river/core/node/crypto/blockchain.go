package crypto

import (
	"context"
	"github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/ethclient"
	. "github.com/river-build/river/core/node/base"
	"github.com/river-build/river/core/node/config"
	"github.com/river-build/river/core/node/infra"
	. "github.com/river-build/river/core/node/protocol"
	"math/big"
	"time"
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
	TxPool          TransactionPool
	Config          *config.ChainConfig
	InitialBlockNum BlockNumber
	ChainMonitor    ChainMonitor
}

// NewBlockchain creates a new Blockchain instance that
// contains all necessary information to interact with the blockchain.
// If wallet is nil, the blockchain will be read-only.
// If wallet is not nil, the blockchain will be read-write:
// TxRunner will be created to track nonce used by the account.
func NewBlockchain(
	ctx context.Context,
	cfg *config.ChainConfig,
	wallet *Wallet,
	metrics infra.MetricsFactory,
) (*Blockchain, error) {
	client, err := ethclient.DialContext(ctx, cfg.NetworkUrl)
	if err != nil {
		return nil, AsRiverError(err, Err_CANNOT_CONNECT).
			Message("Cannot connect to chain RPC node").
			Tag("chainId", cfg.ChainId).
			Func("NewBlockchain")
	}

	return NewBlockchainWithClient(ctx, cfg, wallet, client, client, metrics)
}

func NewBlockchainWithClient(
	ctx context.Context,
	cfg *config.ChainConfig,
	wallet *Wallet,
	client BlockchainClient,
	clientCloser Closable,
	metrics infra.MetricsFactory,
) (*Blockchain, error) {
	if cfg.BlockTimeMs <= 0 {
		return nil, RiverError(Err_BAD_CONFIG, "BlockTimeMs must be set").
			Func("NewBlockchainWithClient")
	}
	chainId, err := client.ChainID(ctx)
	if err != nil {
		return nil, AsRiverError(err).
			Message("Cannot retrieve chain id").
			Func("NewBlockchainWithClient")
	}

	if chainId.Uint64() != cfg.ChainId {
		return nil, RiverError(Err_BAD_CONFIG, "Chain id mismatch",
			"configured", cfg.ChainId,
			"providerChainId", chainId.Uint64()).Func("NewBlockchainWithClient")
	}

	blockNum, err := client.BlockNumber(ctx)
	if err != nil {
		return nil, AsRiverError(
			err,
			Err_CANNOT_CONNECT,
		).Message("Cannot retrieve block number").
			Func("NewBlockchainWithClient")
	}
	initialBlockNum := BlockNumber(blockNum)

	monitor := NewChainMonitor()

	bc := &Blockchain{
		ChainId:         big.NewInt(int64(cfg.ChainId)),
		Client:          client,
		ClientCloser:    clientCloser,
		Config:          cfg,
		InitialBlockNum: initialBlockNum,
		ChainMonitor:    monitor,
	}

	go monitor.RunWithBlockPeriod(
		ctx,
		client,
		initialBlockNum,
		time.Duration(cfg.BlockTimeMs)*time.Millisecond,
		metrics,
	)

	if wallet != nil {
		bc.Wallet = wallet
		bc.TxPool, err = NewTransactionPoolWithPoliciesFromConfig(ctx, cfg, bc.Client, wallet, bc.ChainMonitor, metrics)
		if err != nil {
			return nil, err
		}
	}

	return bc, nil
}

func (b *Blockchain) Close() {
	if b.ClientCloser != nil {
		b.ClientCloser.Close()
	}
}

func (b *Blockchain) GetBlockNumber(ctx context.Context) (BlockNumber, error) {
	n, err := b.Client.BlockNumber(ctx)
	if err != nil {
		return 0, AsRiverError(err, Err_CANNOT_CONNECT).Message("Cannot retrieve block number").Func("GetBlockNumber")
	}
	return BlockNumber(n), nil
}
