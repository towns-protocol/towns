package crypto

import (
	"context"
	"encoding/hex"
	"math/big"

	"github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/ethclient"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/trace"
)

type otelEthClient struct {
	*ethclient.Client
	tracer trace.Tracer
}

var _ BlockchainClient = (*otelEthClient)(nil)

// NewInstrumentedEthClient wraps an Ethereum client and adds open-telemetry tracing.
func NewInstrumentedEthClient(client *ethclient.Client, tracer trace.Tracer) *otelEthClient {
	return &otelEthClient{Client: client, tracer: tracer}
}

func (ic *otelEthClient) ChainID(ctx context.Context) (*big.Int, error) {
	ctx, span := ic.tracer.Start(ctx, "eth_chainId")
	defer span.End()

	return ic.Client.ChainID(ctx)
}

func (ic *otelEthClient) BlockNumber(ctx context.Context) (uint64, error) {
	ctx, span := ic.tracer.Start(ctx, "eth_blockNumber")
	defer span.End()

	return ic.Client.BlockNumber(ctx)
}

func (ic *otelEthClient) SendTransaction(ctx context.Context, tx *types.Transaction) error {
	ctx, span := ic.tracer.Start(ctx, "eth_sendRawTransaction")
	defer span.End()

	span.SetAttributes(attribute.String("tx_hash", tx.Hash().String()))
	if len(tx.Data()) >= 4 {
		span.SetAttributes(attribute.String("func_selector", hex.EncodeToString(tx.Data()[:4])))
	}

	return ic.Client.SendTransaction(ctx, tx)
}

func (ic *otelEthClient) HeaderByNumber(ctx context.Context, number *big.Int) (*types.Header, error) {
	ctx, span := ic.tracer.Start(ctx, "eth_getHeaderByNumber")
	defer span.End()

	return ic.Client.HeaderByNumber(ctx, number)
}

func (ic *otelEthClient) BlockByNumber(ctx context.Context, number *big.Int) (*types.Block, error) {
	ctx, span := ic.tracer.Start(ctx, "eth_getBlockByNumber")
	defer span.End()

	return ic.Client.BlockByNumber(ctx, number)
}

func (ic *otelEthClient) CallContract(ctx context.Context, msg ethereum.CallMsg, blockNumber *big.Int) ([]byte, error) {
	ctx, span := ic.tracer.Start(ctx, "eth_callContract")
	defer span.End()

	if len(msg.Data) >= 4 {
		span.SetAttributes(attribute.String("func_selector", hex.EncodeToString(msg.Data[:4])))
	}

	return ic.Client.CallContract(ctx, msg, blockNumber)
}

func (ic *otelEthClient) CallContractAtHash(ctx context.Context, msg ethereum.CallMsg, blockHash common.Hash) ([]byte, error) {
	ctx, span := ic.tracer.Start(ctx, "eth_callContractAtHash")
	defer span.End()

	if len(msg.Data) >= 4 {
		span.SetAttributes(attribute.String("func_selector", hex.EncodeToString(msg.Data[:4])))
	}

	return ic.Client.CallContractAtHash(ctx, msg, blockHash)
}

func (ic *otelEthClient) PendingCallContract(ctx context.Context, msg ethereum.CallMsg) ([]byte, error) {
	ctx, span := ic.tracer.Start(ctx, "eth_pendingCallContract")
	defer span.End()

	if len(msg.Data) >= 4 {
		span.SetAttributes(attribute.String("func_selector", hex.EncodeToString(msg.Data[:4])))
	}

	return ic.Client.PendingCallContract(ctx, msg)
}

func (ic *otelEthClient) NonceAt(ctx context.Context, account common.Address, blockNumber *big.Int) (uint64, error) {
	ctx, span := ic.tracer.Start(ctx, "eth_nonceAt")
	defer span.End()

	return ic.Client.NonceAt(ctx, account, blockNumber)
}

func (ic *otelEthClient) PendingNonceAt(ctx context.Context, account common.Address) (uint64, error) {
	ctx, span := ic.tracer.Start(ctx, "eth_pendingNonceAt")
	defer span.End()

	return ic.Client.PendingNonceAt(ctx, account)
}

func (ic *otelEthClient) TransactionReceipt(ctx context.Context, txHash common.Hash) (*types.Receipt, error) {
	ctx, span := ic.tracer.Start(ctx, "eth_getTransactionReceipt")
	defer span.End()

	return ic.Client.TransactionReceipt(ctx, txHash)
}

func (ic *otelEthClient) BalanceAt(ctx context.Context, account common.Address, blockNumber *big.Int) (*big.Int, error) {
	ctx, span := ic.tracer.Start(ctx, "eth_balanceAt")
	defer span.End()

	return ic.Client.BalanceAt(ctx, account, blockNumber)
}

func (ic *otelEthClient) FilterLogs(ctx context.Context, q ethereum.FilterQuery) ([]types.Log, error) {
	ctx, span := ic.tracer.Start(ctx, "eth_filterLogs")
	defer span.End()

	if q.FromBlock != nil {
		span.SetAttributes(attribute.String("from", q.FromBlock.String()))
	}
	if q.ToBlock != nil {
		span.SetAttributes(attribute.String("to", q.ToBlock.String()))
	}

	return ic.Client.FilterLogs(ctx, q)
}
