package crypto

import (
	"context"
	"math/big"
	"time"

	"go.opentelemetry.io/otel/trace"

	"github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/ethclient"

	"github.com/towns-protocol/towns/core/config"
	. "github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/infra"
	. "github.com/towns-protocol/towns/core/node/protocol"
)

// BlockchainClient is an interface that covers common functionality needed
// between ethclient.Client and simulated.Backend to satisfy the requirements
// of generated abi contract code and the chain monitor.
// go-ethereum splits functionality into multiple implicit interfaces,
// but there is no explicit interface for client.
// Note: the simulated client does not implement the BlockHashContractCaller
// interface, so we wrap it with NewWrappedSimulatedClient in tests to provide the
// full suite of methods.
type BlockchainClient interface {
	bind.BlockHashContractCaller
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
	Metrics         infra.MetricsFactory
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
	tracer trace.Tracer,
) (*Blockchain, error) {
	client, err := ethclient.DialContext(ctx, cfg.NetworkUrl)
	if err != nil {
		return nil, AsRiverError(err, Err_CANNOT_CONNECT).
			Message("Cannot connect to chain RPC node").
			Tag("chainId", cfg.ChainId).
			Func("NewBlockchain")
	}

	instrumentedClient := NewInstrumentedEthClient(client, cfg.ChainId, metrics, tracer)
	return NewBlockchainWithClient(ctx, cfg, wallet, instrumentedClient, instrumentedClient, metrics, tracer)
}

func NewBlockchainWithClient(
	ctx context.Context,
	cfg *config.ChainConfig,
	wallet *Wallet,
	client BlockchainClient,
	clientCloser Closable,
	metrics infra.MetricsFactory,
	tracer trace.Tracer,
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
		Metrics:         metrics,
	}

	if wallet != nil {
		bc.Wallet = wallet
		bc.TxPool, err = NewTransactionPoolWithPoliciesFromConfig(
			ctx, cfg, bc.Client, wallet, bc.ChainMonitor,
			cfg.DisableReplacePendingTransactionOnBoot, metrics, tracer)
		if err != nil {
			return nil, err
		}
	}

	monitor.Start(
		ctx,
		client,
		initialBlockNum,
		time.Duration(cfg.BlockTimeMs)*time.Millisecond,
		metrics,
	)

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
