package crypto

import (
	"context"
	"encoding/binary"
	"encoding/hex"
	"errors"
	"fmt"
	"math/big"
	"strings"

	"github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/ethclient"
	"github.com/ethereum/go-ethereum/ethclient/simulated"
	"github.com/ethereum/go-ethereum/rpc"
	"github.com/prometheus/client_golang/prometheus"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/trace"

	"github.com/towns-protocol/towns/core/node/infra"
)

type simulatedClientWrapper struct {
	simulated.Client
}

var _ BlockchainClient = (*simulatedClientWrapper)(nil)

// NewWrappedSimulatedClient returns a wrapped client that implements methods
// missing on the simulated client which are occasionally used by abi-genned
// contract code.
func NewWrappedSimulatedClient(client simulated.Client) BlockchainClient {
	return &simulatedClientWrapper{
		Client: client,
	}
}

func (scw *simulatedClientWrapper) CallContractAtHash(
	ctx context.Context,
	msg ethereum.CallMsg,
	blockHash common.Hash,
) ([]byte, error) {
	bh, ok := scw.Client.(bind.BlockHashContractCaller)
	if ok {
		return bh.CallContractAtHash(ctx, msg, blockHash)
	}

	block, err := scw.BlockByHash(ctx, blockHash)
	if err != nil {
		return nil, err
	}

	return scw.CallContract(ctx, msg, block.Number())
}

func (scw *simulatedClientWrapper) CodeAtHash(
	ctx context.Context,
	account common.Address,
	blockHash common.Hash,
) ([]byte, error) {
	bh, ok := scw.Client.(bind.BlockHashContractCaller)
	if ok {
		return bh.CodeAtHash(ctx, account, blockHash)
	}

	block, err := scw.BlockByHash(ctx, blockHash)
	if err != nil {
		return nil, err
	}

	return scw.CodeAt(ctx, account, block.Number())
}

type otelEthClient struct {
	*ethclient.Client
	ethCalls *prometheus.CounterVec
	tracer   trace.Tracer
	chainId  string
}

var _ BlockchainClient = (*otelEthClient)(nil)

// NewInstrumentedEthClient wraps an Ethereum client and adds open-telemetry tracing and metrics
// collection.
func NewInstrumentedEthClient(
	client *ethclient.Client,
	chainId uint64,
	metrics infra.MetricsFactory,
	tracer trace.Tracer,
) *otelEthClient {
	ethCalls := metrics.NewCounterVecEx(
		"eth_calls",
		"Number of eth_calls made by an instrumented client",
		"chain_id",
		"method_name",
		"status",
	)

	return &otelEthClient{
		Client:   client,
		chainId:  fmt.Sprintf("%d", chainId),
		ethCalls: ethCalls,
		tracer:   tracer,
	}
}

// obfuscateProviderError scrubs the specific error returned, which often contains secrets embedded
// in the URL of the failed call, and returns a generic error that is as descriptive as possible.
func (ic *otelEthClient) obfuscateProviderError(err error) error {
	if err == nil {
		return nil
	}

	// Check for context cancellation or deadline exceeded and retain this error type if possible
	// to maximize non-privileged information in the returned error.
	if errors.Is(err, context.Canceled) {
		return fmt.Errorf("rpc provider unavailable for chain %s: %w", ic.chainId, context.Canceled)
	}
	if errors.Is(err, context.DeadlineExceeded) {
		return fmt.Errorf("rpc provider unavailable for chain %s: %w", ic.chainId, context.DeadlineExceeded)
	}

	// For all other errors, return a generic error message
	return fmt.Errorf("client call failed for chain %s", ic.chainId)
}

func (ic *otelEthClient) ChainID(ctx context.Context) (*big.Int, error) {
	if ic.tracer != nil {
		var span trace.Span
		ctx, span = ic.tracer.Start(ctx, "eth_chainId")
		defer span.End()
	}

	id, err := ic.Client.ChainID(ctx)
	return id, ic.obfuscateProviderError(err)
}

func (ic *otelEthClient) BlockNumber(ctx context.Context) (uint64, error) {
	if ic.tracer != nil {
		var span trace.Span
		ctx, span = ic.tracer.Start(ctx, "eth_blockNumber")
		defer span.End()
	}

	blockNum, err := ic.Client.BlockNumber(ctx)
	return blockNum, ic.obfuscateProviderError(err)
}

func (ic *otelEthClient) SuggestGasTipCap(ctx context.Context) (*big.Int, error) {
	if ic.tracer != nil {
		var span trace.Span
		ctx, span = ic.tracer.Start(ctx, "eth_maxPriorityFeePerGas")
		defer span.End()
	}

	gasTip, err := ic.Client.SuggestGasTipCap(ctx)
	return gasTip, ic.obfuscateProviderError(err)
}

func (ic *otelEthClient) PendingCodeAt(ctx context.Context, account common.Address) ([]byte, error) {
	if ic.tracer != nil {
		var span trace.Span
		ctx, span = ic.tracer.Start(ctx, "eth_getCode")
		defer span.End()
	}

	code, err := ic.Client.PendingCodeAt(ctx, account)
	return code, ic.obfuscateProviderError(err)
}

func (ic *otelEthClient) SendTransaction(ctx context.Context, tx *types.Transaction) error {
	if ic.tracer != nil {
		var span trace.Span
		ctx, span = ic.tracer.Start(ctx, "eth_sendRawTransaction")
		defer span.End()

		span.SetAttributes(attribute.String("tx_hash", tx.Hash().String()))
		data := tx.Data()
		methodName := getMethodName(data)
		span.SetAttributes(attribute.String("method_name", methodName))
	}

	err := ic.Client.SendTransaction(ctx, tx)
	return ic.obfuscateProviderError(err)
}

func (ic *otelEthClient) HeaderByNumber(ctx context.Context, number *big.Int) (*types.Header, error) {
	if ic.tracer != nil {
		var span trace.Span
		ctx, span = ic.tracer.Start(ctx, "eth_getHeaderByNumber")
		defer span.End()
	}

	header, err := ic.Client.HeaderByNumber(ctx, number)
	return header, ic.obfuscateProviderError(err)
}

func (ic *otelEthClient) BlockByNumber(ctx context.Context, number *big.Int) (*types.Block, error) {
	if ic.tracer != nil {
		var span trace.Span
		ctx, span = ic.tracer.Start(ctx, "eth_getBlockByNumber")
		defer span.End()
	}
	block, err := ic.Client.BlockByNumber(ctx, number)
	return block, ic.obfuscateProviderError(err)
}

// extractCallErrorStatus extracts the revert reason from an error if it is a contract error
// with a revert reason. Otherwise, it will return "revert" for contract data errors, or
// "fail" for other types of errors.
func extractCallErrorStatus(err error) string {
	if de, ok := err.(rpc.DataError); ok {
		hexStr, ok := de.ErrorData().(string)
		if ok {
			hexStr = strings.TrimPrefix(hexStr, "0x")
			revert, e := hex.DecodeString(hexStr)
			if e == nil {
				reason, e := abi.UnpackRevert(revert)
				if e == nil {
					return reason
				}
			}
			return "revert"
		}
	}
	return "fail"
}

func getMethodName(data []byte) string {
	var methodName string
	if len(data) >= 4 {
		selector := binary.BigEndian.Uint32(data)
		var defined bool
		methodName, defined = GetSelectorMethodName(selector)
		if !defined {
			return hex.EncodeToString(data[:4])
		}
	}
	return methodName
}

func (ic *otelEthClient) makeEthCallWithTraceAndMetrics(
	ctx context.Context,
	msg ethereum.CallMsg,
	call func() ([]byte, error),
) ([]byte, error) {
	var methodName string

	if ic.tracer != nil {
		var span trace.Span
		_, span = ic.tracer.Start(ctx, "eth_call")
		defer span.End()

		methodName = getMethodName(msg.Data)
		span.SetAttributes(attribute.String("method_name", methodName))
	}

	data, err := call()

	status := "ok"
	if err != nil {
		status = extractCallErrorStatus(err)
	}

	// If tracer was nil, we may not have computed the method name.
	if methodName == "" {
		methodName = getMethodName(msg.Data)
	}

	ic.ethCalls.With(
		prometheus.Labels{
			"chain_id":    ic.chainId,
			"method_name": methodName,
			"status":      status,
		},
	).Inc()

	return data, ic.obfuscateProviderError(err)
}

func (ic *otelEthClient) CallContract(ctx context.Context, msg ethereum.CallMsg, blockNumber *big.Int) ([]byte, error) {
	return ic.makeEthCallWithTraceAndMetrics(
		ctx,
		msg,
		func() ([]byte, error) {
			return ic.Client.CallContract(ctx, msg, blockNumber)
		},
	)
}

func (ic *otelEthClient) CallContractAtHash(
	ctx context.Context,
	msg ethereum.CallMsg,
	blockHash common.Hash,
) ([]byte, error) {
	return ic.makeEthCallWithTraceAndMetrics(
		ctx,
		msg,
		func() ([]byte, error) {
			return ic.Client.CallContractAtHash(ctx, msg, blockHash)
		},
	)
}

func (ic *otelEthClient) PendingCallContract(ctx context.Context, msg ethereum.CallMsg) ([]byte, error) {
	if ic.tracer != nil {
		var span trace.Span
		ctx, span = ic.tracer.Start(ctx, "eth_pendingCallContract")
		defer span.End()

		methodName := getMethodName(msg.Data)
		span.SetAttributes(attribute.String("method_name", methodName))
	}

	result, err := ic.Client.PendingCallContract(ctx, msg)
	return result, ic.obfuscateProviderError(err)
}

func (ic *otelEthClient) NonceAt(ctx context.Context, account common.Address, blockNumber *big.Int) (uint64, error) {
	if ic.tracer != nil {
		var span trace.Span
		ctx, span = ic.tracer.Start(ctx, "eth_nonceAt")
		defer span.End()
	}

	nonce, err := ic.Client.NonceAt(ctx, account, blockNumber)
	return nonce, ic.obfuscateProviderError(err)
}

func (ic *otelEthClient) PendingNonceAt(ctx context.Context, account common.Address) (uint64, error) {
	if ic.tracer != nil {
		var span trace.Span
		ctx, span = ic.tracer.Start(ctx, "eth_pendingNonceAt")
		defer span.End()
	}

	nonce, err := ic.Client.PendingNonceAt(ctx, account)
	return nonce, ic.obfuscateProviderError(err)
}

func (ic *otelEthClient) TransactionReceipt(ctx context.Context, txHash common.Hash) (*types.Receipt, error) {
	if ic.tracer != nil {
		var span trace.Span
		ctx, span = ic.tracer.Start(ctx, "eth_getTransactionReceipt")
		defer span.End()
	}

	receipt, err := ic.Client.TransactionReceipt(ctx, txHash)
	return receipt, ic.obfuscateProviderError(err)
}

func (ic *otelEthClient) BalanceAt(
	ctx context.Context,
	account common.Address,
	blockNumber *big.Int,
) (*big.Int, error) {
	if ic.tracer != nil {
		var span trace.Span
		ctx, span = ic.tracer.Start(ctx, "eth_balanceAt")
		defer span.End()
	}

	balance, err := ic.Client.BalanceAt(ctx, account, blockNumber)
	return balance, ic.obfuscateProviderError(err)
}

func (ic *otelEthClient) FilterLogs(ctx context.Context, q ethereum.FilterQuery) ([]types.Log, error) {
	if ic.tracer != nil {
		var span trace.Span
		ctx, span = ic.tracer.Start(ctx, "eth_filterLogs")
		defer span.End()

		if q.FromBlock != nil {
			span.SetAttributes(attribute.String("from", q.FromBlock.String()))
		}
		if q.ToBlock != nil {
			span.SetAttributes(attribute.String("to", q.ToBlock.String()))
		}
	}
	logs, err := ic.Client.FilterLogs(ctx, q)
	return logs, ic.obfuscateProviderError(err)
}

func (ic *otelEthClient) BlockByHash(ctx context.Context, hash common.Hash) (*types.Block, error) {
	if ic.tracer != nil {
		var span trace.Span
		ctx, span = ic.tracer.Start(ctx, "eth_blockByHash")
		defer span.End()
	}

	block, err := ic.Client.BlockByHash(ctx, hash)
	return block, ic.obfuscateProviderError(err)
}

func (ic *otelEthClient) CodeAt(ctx context.Context, account common.Address, blockNumber *big.Int) ([]byte, error) {
	if ic.tracer != nil {
		var span trace.Span
		ctx, span = ic.tracer.Start(ctx, "eth_getCode")
		defer span.End()
	}

	code, err := ic.Client.CodeAt(ctx, account, blockNumber)
	return code, ic.obfuscateProviderError(err)
}

func (ic *otelEthClient) CodeAtHash(
	ctx context.Context,
	contract common.Address,
	blockHash common.Hash,
) ([]byte, error) {
	var bc BlockchainClient = ic.Client
	bh, ok := bc.(bind.BlockHashContractCaller)
	if ok {
		if ic.tracer != nil {
			var span trace.Span
			ctx, span = ic.tracer.Start(ctx, "eth_getCode")
			defer span.End()
		}
		code, err := bh.CodeAtHash(ctx, contract, blockHash)
		return code, ic.obfuscateProviderError(err)
	}

	if ic.tracer != nil {
		var span trace.Span
		ctx, span = ic.tracer.Start(ctx, "CodeAtHash")
		defer span.End()

		span.SetAttributes(attribute.String("blockHash", hex.EncodeToString(blockHash[:])))
	}

	block, err := ic.BlockByHash(ctx, blockHash)
	if err != nil {
		return nil, ic.obfuscateProviderError(err)
	}

	code, err := ic.CodeAt(ctx, contract, block.Number())
	return code, ic.obfuscateProviderError(err)
}

func (ic *otelEthClient) EstimateGas(ctx context.Context, call ethereum.CallMsg) (uint64, error) {
	if ic.tracer != nil {
		var span trace.Span
		ctx, span = ic.tracer.Start(ctx, "eth_estimateGas")
		defer span.End()
	}

	gasLimit, err := ic.Client.EstimateGas(ctx, call)
	return gasLimit, ic.obfuscateProviderError(err)
}

func (ic *otelEthClient) HeaderByHash(ctx context.Context, hash common.Hash) (*types.Header, error) {
	if ic.tracer != nil {
		var span trace.Span
		ctx, span = ic.tracer.Start(ctx, "eth_getBlockByHash")
		defer span.End()
	}

	header, err := ic.Client.HeaderByHash(ctx, hash)
	return header, ic.obfuscateProviderError(err)
}
