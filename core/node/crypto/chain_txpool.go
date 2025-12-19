package crypto

import (
	"context"
	"encoding/hex"
	"errors"
	"fmt"
	"math/big"
	"strings"
	"sync/atomic"
	"time"

	"github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	bind2 "github.com/ethereum/go-ethereum/accounts/abi/bind/v2"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/linkdata/deadlock"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/puzpuzpuz/xsync/v4"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/trace"

	"github.com/towns-protocol/towns/core/config"
	. "github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/infra"
	"github.com/towns-protocol/towns/core/node/logging"
	. "github.com/towns-protocol/towns/core/node/protocol"
)

type (
	// TransactionPoolPendingTransaction is a transaction that is submitted to the network but not yet included in the
	// chain. Because a transaction can be resubmitted with different gas parameters the transaction hash isn't stable.
	TransactionPoolPendingTransaction interface {
		// Wait till the transaction is included in the chain and the receipt is available or until ctx expires.
		Wait(context.Context) (*types.Receipt, error)
		// TransactionHash returns the hash of the transaction that was executed on the chain.
		// This is not always reliably populated on the transaction receipt.
		TransactionHash() common.Hash
	}

	// CreateTransaction expects the function to create a transaction with the received transaction options.
	CreateTransaction = func(opts *bind.TransactOpts) (*types.Transaction, error)

	// TransactionPool represents an in-memory transaction pool to which transaction can be submitted.
	TransactionPool interface {
		// Submit calls createTx and sends the resulting transaction to the blockchain.
		// It returns a pending transaction for which the caller can wait for the transaction receipt to arrive.
		// The pool will resubmit transactions when necessary.
		Submit(ctx context.Context, name string, createTx CreateTransaction) (TransactionPoolPendingTransaction, error)

		// SubmitRaw sends transaction created with abigen v2/bind v2 to the blockchain.
		// It returns a pending transaction for which the caller can wait for the transaction receipt to arrive.
		// The pool will resubmit transactions when necessary.
		SubmitRaw(
			ctx context.Context,
			name string,
			contract *bind2.BoundContract,
			data []byte,
		) (TransactionPoolPendingTransaction, error)

		// SubmitTx calls pack and sends the resulting transaction to the blockchain.
		// It returns a pending transaction for which the caller can wait for the transaction receipt to arrive.
		// The pool will resubmit transactions when necessary.
		SubmitTx(
			ctx context.Context,
			name string,
			contract *bind2.BoundContract,
			pack func() ([]byte, error),
		) (TransactionPoolPendingTransaction, error)

		// EstimateGas estimates the gas usage of the transaction that would be created by createTx.
		EstimateGas(ctx context.Context, createTx CreateTransaction) (uint64, error)

		// ProcessedTransactionsCount returns the number of transactions that have been processed
		ProcessedTransactionsCount() int64

		// PendingTransactionsCount returns the number of pending transactions in the pool
		PendingTransactionsCount() int64

		// ReplacementTransactionsCount returns the number of replacement transactions sent
		ReplacementTransactionsCount() int64

		// LastReplacementTransactionUnix returns the last unix timestamp when a replacement transaction was sent.
		// Or 0 when no replacement transaction has been sent.
		LastReplacementTransactionUnix() int64
	}

	// transactionPool allows to submit transactions and keeps track of submitted transactions and can replace them
	// when not included within reasonable time.
	transactionPool struct {
		pendingTransactionPool *pendingTransactionPool
		client                 BlockchainClient
		wallet                 *Wallet
		chainID                uint64
		signerFn               bind.SignerFn
		tracer                 trace.Tracer
		pricePolicy            TransactionPricePolicy

		// metrics
		transactionSubmitted         *prometheus.CounterVec
		walletBalanceLastTimeChecked time.Time
		walletBalance                prometheus.Gauge
		baseFee                      atomic.Pointer[big.Int]

		// mu guards lastNonce that is used to determine the tx nonce
		mu        deadlock.Mutex
		lastNonce *uint64
	}

	// txPoolPendingTransaction represents a transaction that is submitted to the chain but no receipt was retrieved.
	txPoolPendingTransaction struct {
		txHashes     []common.Hash // transaction hashes, due to resubmit there can be multiple
		tx           *types.Transaction
		txOpts       *bind.TransactOpts
		name         string
		resubmit     CreateTransaction
		firstSubmit  time.Time
		lastSubmit   time.Time
		tracer       trace.Tracer
		receiptPolls uint
		// listener waits on this channel for the transaction receipt
		listener chan *types.Receipt
		// The hash of the transaction that was executed on the chain. This is only set on the
		// receipt by geth nodes and is not always available.
		executedHash atomic.Pointer[common.Hash]
	}

	// pendingTransactionPool keeps track of transactions that are submitted but the receipt has not been retrieved.
	pendingTransactionPool struct {
		pendingTxs *xsync.Map[uint64, *txPoolPendingTransaction]

		client  BlockchainClient
		wallet  *Wallet
		chainID uint64

		addPendingTx chan *txPoolPendingTransaction

		replacePolicy TransactionPoolReplacePolicy
		pricePolicy   TransactionPricePolicy

		pendingTxCount      atomic.Int64
		processedTxCount    atomic.Int64
		replacementsSent    atomic.Int64
		lastReplacementSent atomic.Int64

		transactionTotalInclusionDuration prometheus.Observer
		transactionInclusionDuration      prometheus.Observer
		transactionsReplaced              *prometheus.CounterVec
		transactionsPending               prometheus.Gauge
		transactionsProcessed             *prometheus.CounterVec
		transactionReceiptsMissing        prometheus.Counter
		transactionGasCap                 *prometheus.GaugeVec
		transactionGasTip                 *prometheus.GaugeVec

		onCheckPendingTransactionsMutex deadlock.Mutex
	}
)

var (
	_ TransactionPool                   = (*transactionPool)(nil)
	_ TransactionPoolPendingTransaction = (*txPoolPendingTransaction)(nil)

	riverChainFixedTipCap = big.NewInt(10_000) // 0.00001 gWei
)

func newPendingTransactionPool(
	ctx context.Context,
	monitor ChainMonitor,
	client BlockchainClient,
	chainID *big.Int,
	wallet *Wallet,
	replacePolicy TransactionPoolReplacePolicy,
	pricePolicy TransactionPricePolicy,
	metrics infra.MetricsFactory,
) *pendingTransactionPool {
	transactionsReplacedCounter := metrics.NewCounterVecEx(
		"txpool_replaced", "Number of replacement transactions submitted",
		"chain_id", "address", "method_name",
	)
	transactionsPendingCounter := metrics.NewGaugeVecEx(
		"txpool_pending", "Number of transactions that are waiting to be included in the chain",
		"chain_id", "address",
	)
	transactionsProcessedCounter := metrics.NewCounterVecEx(
		"txpool_processed", "Number of submitted transactions that are included in the chain",
		"chain_id", "address", "status",
	)

	// 1, 3, 5, 7, 9s
	txPoolHistogramBuckets := prometheus.LinearBuckets(1.0, 2.0, 5)
	transactionTotalInclusionDuration := metrics.NewHistogramVecEx(
		"txpool_tx_total_inclusion_duration_sec",
		"How long it takes before a transaction is included in the chain since first submit",
		txPoolHistogramBuckets, "chain_id", "address",
	)
	transactionInclusionDuration := metrics.NewHistogramVecEx(
		"txpool_tx_inclusion_duration_sec",
		"How long it takes before a transaction is included in the chain since last submit",
		txPoolHistogramBuckets, "chain_id", "address",
	)
	transactionReceiptsMissingCounter := metrics.NewCounterVecEx(
		"txpool_missing_tx_receipts", "Number of receipts missing for submitted transactions",
		"chain_id", "address",
	)

	curryLabels := prometheus.Labels{"chain_id": chainID.String(), "address": wallet.Address.String()}

	transactionGasCap := metrics.NewGaugeVecEx(
		"txpool_tx_fee_cap_wei", "Latest submitted EIP1559 transaction gas fee cap",
		"chain_id", "address", "replacement",
	)
	transactionGasTip := metrics.NewGaugeVecEx(
		"txpool_tx_miner_tip_wei", "Latest submitted EIP1559 transaction gas fee miner tip",
		"chain_id", "address", "replacement",
	)

	ptp := &pendingTransactionPool{
		pendingTxs:    xsync.NewMap[uint64, *txPoolPendingTransaction](),
		client:        client,
		wallet:        wallet,
		chainID:       chainID.Uint64(),
		replacePolicy: replacePolicy,
		pricePolicy:   pricePolicy,
		addPendingTx:  make(chan *txPoolPendingTransaction, 10),

		transactionsReplaced:              transactionsReplacedCounter.MustCurryWith(curryLabels),
		transactionsPending:               transactionsPendingCounter.With(curryLabels),
		transactionsProcessed:             transactionsProcessedCounter.MustCurryWith(curryLabels),
		transactionReceiptsMissing:        transactionReceiptsMissingCounter.With(curryLabels),
		transactionTotalInclusionDuration: transactionTotalInclusionDuration.With(curryLabels),
		transactionInclusionDuration:      transactionInclusionDuration.With(curryLabels),
		transactionGasCap:                 transactionGasCap.MustCurryWith(curryLabels),
		transactionGasTip:                 transactionGasTip.MustCurryWith(curryLabels),
	}

	go ptp.run(ctx)

	monitor.OnHeader(ptp.checkPendingTransactions)

	return ptp
}

func (pool *pendingTransactionPool) PendingTransactionsCount() int64 {
	return pool.pendingTxCount.Load()
}

func (pool *pendingTransactionPool) appendPendingTx(ctx context.Context, ptx *txPoolPendingTransaction) {
	// Read before storing to avoid data race
	gasCap, _ := ptx.tx.GasFeeCap().Float64()
	tipCap, _ := ptx.tx.GasTipCap().Float64()

	pool.pendingTxs.Store(ptx.tx.Nonce(), ptx)
	pool.pendingTxCount.Add(1)

	// metrics
	pool.transactionsPending.Add(1)
	pool.transactionGasCap.With(prometheus.Labels{"replacement": "false"}).Set(gasCap)
	pool.transactionGasTip.With(prometheus.Labels{"replacement": "false"}).Set(tipCap)
}

func (pool *pendingTransactionPool) run(ctx context.Context) {
	for {
		select {
		case <-ctx.Done():
			return
		case ptx := <-pool.addPendingTx:
			pool.appendPendingTx(ctx, ptx)
		}
	}
}

func (pool *pendingTransactionPool) closeTx(
	log *logging.Log,
	ptx *txPoolPendingTransaction,
	receipt *types.Receipt,
	txHash common.Hash,
) {
	pool.pendingTxs.Delete(ptx.tx.Nonce())
	if (txHash != common.Hash{}) {
		ptx.executedHash.Store(&txHash)
	}
	if receipt != nil {
		ptx.listener <- receipt
	}

	close(ptx.listener)

	status := "failed"
	if receipt != nil {
		if receipt.Status == types.ReceiptStatusSuccessful {
			status = "succeeded"
		}

		log.Debugw(
			"TxPool: Transaction DONE",
			"txHash", txHash,
			"chain", pool.chainID,
			"name", ptx.name,
			"from", ptx.txOpts.From,
			"to", ptx.tx.To(),
			"nonce", ptx.tx.Nonce(),
			"succeeded", receipt.Status == types.ReceiptStatusSuccessful,
			"cumulativeGasUsed", receipt.CumulativeGasUsed,
			"gasUsed", receipt.GasUsed,
			"effectiveGasPrice", receipt.EffectiveGasPrice,
			"blockHash", receipt.BlockHash,
			"blockNumber", receipt.BlockNumber,
		)
	} else {
		status = "canceled"
		log.Debugw(
			"TxPool: Transaction DONE",
			"txHash", txHash,
			"chain", pool.chainID,
			"name", ptx.name,
			"from", ptx.txOpts.From,
			"to", ptx.tx.To(),
			"nonce", ptx.tx.Nonce(),
			"succeeded", false,
		)
	}

	pool.pendingTxCount.Add(-1)
	pool.processedTxCount.Add(1)
	took := time.Since(ptx.firstSubmit)
	pool.transactionTotalInclusionDuration.Observe(took.Seconds())
	pool.transactionInclusionDuration.Observe(took.Seconds())
	pool.transactionsProcessed.With(prometheus.Labels{"status": status}).Inc()
	pool.transactionsPending.Add(-1)

	if took >= 15*time.Second {
		log.Warnw("Transaction took too long to be included in the chain",
			"name", ptx.name,
			"executedHash", ptx.executedHash.Load(),
			"took", took,
			"hashes", ptx.txHashes,
			"firstSubmit", ptx.firstSubmit,
			"lastSubmit", ptx.lastSubmit,
		)
	}
}

func (pool *pendingTransactionPool) checkPendingTransactions(ctx context.Context, head *types.Header) {
	// Try lock to have only one invocation at a time.
	if !pool.onCheckPendingTransactionsMutex.TryLock() {
		return
	}
	defer pool.onCheckPendingTransactionsMutex.Unlock()

	log := logging.FromCtx(ctx).With("chain", pool.chainID)

	// grab the latest nonce, pending transactions with a nonce lower are included in the chain and should
	// have a receipt available.
	nonce, err := pool.client.NonceAt(ctx, pool.wallet.Address, head.Number)
	if err != nil {
		log.Warnw("unable to get tx pool nonce", "error", err)
		return
	}

	// drop transactions that have a receipt available from the pool and check others if it is time to send a
	// replacement transactions
	pool.pendingTxs.Range(func(ptxNonce uint64, ptx *txPoolPendingTransaction) bool {
		ptxConfirmed := ptxNonce < nonce

		if ptxConfirmed {
			ptx.receiptPolls++
			// there can be multiple transactions (original + replacements), start from latest submitted
			for i := len(ptx.txHashes) - 1; i >= 0; i-- {
				txHash := ptx.txHashes[i]
				receipt, err := pool.client.TransactionReceipt(ctx, txHash)
				if receipt != nil {
					pool.closeTx(log, ptx, receipt, txHash)
					return true
				}
				if errors.Is(err, ethereum.NotFound) {
					continue
				}
				if err != nil {
					log.Warnw("unable to get transaction receipt", "txHash", txHash.Hex(), "error", err)
					return true
				}
			}

			// it is possible that the nonce already progressed as an indication the tx was included in the chain
			// but the rpc node doesn't yet have the receipt available. Allow several retries before giving up waiting
			// for the receipt.
			if ptx.receiptPolls > 15 {
				// Receipt not available can be caused by the chain rpc node lagging behind the canonical chain at
				// the time the transactions were created and an outdated nonce was retrieved from the rpc node. A tx
				// with the same nonce was already included in the canonical chain. When the rpc node caught up the tx
				// was dropped from the rpc node tx pool and therefor we never get a receipt for it. Closing
				// ptx.listener will yield an error to the client waiting for the receipt that it is not available.

				// TODO: FIX: it seems that not all counters are updated here correctly? see closeTx
				pool.transactionReceiptsMissing.Add(1)
				pool.pendingTxs.Delete(nonce)
				close(ptx.listener) // this will return an error that the receipt wasn't available when waiting for it
			}
		} else if ptx.txOpts.Context != nil && ptx.txOpts.Context.Err() != nil {
			log.Debugw("replacement transaction canceled", "txHash", ptx.tx.Hash(), "error", ptx.txOpts.Context.Err())
			pool.closeTx(log, ptx, nil, common.Hash{})
		} else if pool.replacePolicy.Eligible(head, ptx.lastSubmit, ptx.tx) { // determine if tx is eligible for resubmit
			ptx.txOpts.GasPrice, ptx.txOpts.GasFeeCap, ptx.txOpts.GasTipCap = pool.pricePolicy.Reprice(head, ptx.tx)

			ptx.txOpts.GasLimit = 0 // force re-simulation to determine new gas limit

			tx, err := ptx.resubmit(ptx.txOpts)
			if err != nil {
				log.Warnw("unable to create replacement transaction", "txHash", ptx.tx.Hash(), "error", err)
				return true
			}

			if err := pool.client.SendTransaction(ctx, tx); err == nil {
				log.Debugw(
					"TxPool: Transaction REPLACED",
					"old", ptx.tx.Hash(),
					"txHash", tx.Hash(),
					"chain", pool.chainID,
					"name", ptx.name,
					"nonce", tx.Nonce(),
					"from", ptx.txOpts.From,
					"to", tx.To(),
					"gasPrice", tx.GasPrice(),
					"gasFeeCap", tx.GasFeeCap(),
					"gasTipCap", tx.GasTipCap(),
				)

				ptx.tx = tx
				ptx.txHashes = append(ptx.txHashes, tx.Hash())
				ptx.lastSubmit = time.Now()

				methodName := getMethodName(tx.Data())
				gasCap, _ := tx.GasFeeCap().Float64()
				tipCap, _ := tx.GasTipCap().Float64()

				pool.replacementsSent.Add(1)
				pool.lastReplacementSent.Store(ptx.lastSubmit.Unix())
				pool.transactionsReplaced.With(prometheus.Labels{"method_name": methodName}).Add(1)
				pool.transactionGasCap.With(prometheus.Labels{"replacement": "false"}).Set(gasCap)
				pool.transactionGasTip.With(prometheus.Labels{"replacement": "false"}).Set(tipCap)
			} else if errors.Is(err, context.Canceled) || errors.Is(err, context.DeadlineExceeded) {
				log.Debugw("replacement transaction canceled", "txHash", tx.Hash(), "error", err)
				pool.closeTx(log, ptx, nil, common.Hash{})
			} else {
				log.Errorw("unable to replace transaction", "txHash", tx.Hash(), "error", err)
			}
		}

		return true
	})
}

// NewTransactionPoolWithPoliciesFromConfig creates an in-memory transaction pool that tracks transactions that are
// submitted through it. Pending transactions checked on each block if they are eligible to be replaced (through the
// replacement policy). If the pending transaction must be replaced is uses the price policy to determine the new gas
// fees for the replacement transaction. The pool then submits the replacement policy. It keeps track of the old pending
// transactions in case the original transaction was included in the chain.
func NewTransactionPoolWithPoliciesFromConfig(
	ctx context.Context,
	cfg *config.ChainConfig,
	riverClient BlockchainClient,
	wallet *Wallet,
	chainMonitor ChainMonitor,
	disableReplacePendingTransactionOnBoot bool,
	metrics infra.MetricsFactory,
	tracer trace.Tracer,
) (*transactionPool, error) {
	if cfg.BlockTimeMs <= 0 {
		return nil, RiverError(Err_BAD_CONFIG, "BlockTimeMs must be set").
			Func("NewTransactionPoolWithPoliciesFromConfig")
	}
	// if pending tx timeout is not specified use a default of 3*chain.BlockPeriod
	txTimeout := cfg.TransactionPool.TransactionTimeout
	if txTimeout == 0 {
		txTimeout = 3 * time.Duration(cfg.BlockTimeMs) * time.Millisecond
	}

	var (
		replacementPolicy = NewTransactionPoolDeadlinePolicy(txTimeout)
		pricePolicy       = NewDefaultTransactionPricePolicy(
			cfg.TransactionPool.GasFeeIncreasePercentage,
			cfg.TransactionPool.GasFeeCap,
			cfg.TransactionPool.MinerTipFeeReplacementPercentage)
	)

	return NewTransactionPoolWithPolicies(
		ctx, riverClient, wallet, replacementPolicy, pricePolicy, chainMonitor,
		disableReplacePendingTransactionOnBoot, metrics, tracer)
}

// NewTransactionPoolWithPolicies creates an in-memory transaction pool that tracks transactions that are submitted
// through it. Pending transactions checked on each block if they are eligible to be replaced. This is determined with
// the given replacePolicy. If the pending transaction must be replaced the given pricePolicy is used to determine the
// fees for the replacement transaction. The pool than submits the replacement policy. It keeps track of the old pending
// transactions in case the original transaction was included in the chain.
func NewTransactionPoolWithPolicies(
	ctx context.Context,
	client BlockchainClient,
	wallet *Wallet,
	replacePolicy TransactionPoolReplacePolicy,
	pricePolicy TransactionPricePolicy,
	chainMonitor ChainMonitor,
	disableReplacePendingTransactionOnBoot bool,
	metrics infra.MetricsFactory,
	tracer trace.Tracer,
) (*transactionPool, error) {
	chainID, err := client.ChainID(ctx)
	if err != nil {
		return nil, err
	}

	signer := types.LatestSignerForChainID(chainID)

	signerFn := func(address common.Address, tx *types.Transaction) (*types.Transaction, error) {
		signature, err := crypto.Sign(signer.Hash(tx).Bytes(), wallet.PrivateKeyStruct)
		if err != nil {
			return nil, err
		}
		return tx.WithSignature(signer, signature)
	}

	transactionsSubmittedCounter := metrics.NewCounterVecEx(
		"txpool_submitted", "Number of transactions submitted",
		"chain_id", "address", "method_name",
	)

	walletBalance := metrics.NewGaugeVecEx(
		"txpool_wallet_balance_eth", "Wallet native coin balance",
		"chain_id", "address",
	)

	curryLabels := prometheus.Labels{"chain_id": chainID.String(), "address": wallet.Address.String()}
	txPool := &transactionPool{
		client:               client,
		wallet:               wallet,
		chainID:              chainID.Uint64(),
		pricePolicy:          pricePolicy,
		signerFn:             signerFn,
		tracer:               tracer,
		transactionSubmitted: transactionsSubmittedCounter.MustCurryWith(curryLabels),
		walletBalance:        walletBalance.With(curryLabels),
		pendingTransactionPool: newPendingTransactionPool(
			ctx, chainMonitor, client, chainID, wallet, replacePolicy, pricePolicy, metrics),
	}

	chainMonitor.OnHeader(txPool.onHead)

	if !disableReplacePendingTransactionOnBoot {
		go txPool.sendReplacementTransactions(ctx)
	}

	return txPool, nil
}

func (r *transactionPool) isRiverChain() bool {
	return r.chainID == 550 /*mainnet*/ || r.chainID == 6524490 /*devnet*/
}

// sendReplacementTransactions tries to send replacement transactions for pending/stuck transactions.
func (r *transactionPool) sendReplacementTransactions(ctx context.Context) {
	log := logging.FromCtx(ctx)

	nonce, err := r.client.NonceAt(ctx, r.wallet.Address, nil)
	if err != nil {
		log.Errorw("Unable to obtain nonce for replacement transactions", "error", err)
	}

	pendingNonce, err := r.client.PendingNonceAt(ctx, r.wallet.Address)
	if err != nil {
		log.Errorw("Unable to obtain pending nonce for replacement transactions", "error", err)
	}

	if nonce >= pendingNonce {
		return
	}

	var (
		signer   = types.LatestSignerForChainID(new(big.Int).SetUint64(r.chainID))
		start    = time.Now()
		createTx = func(opts *bind.TransactOpts) (*types.Transaction, error) {
			head, err := r.client.HeaderByNumber(ctx, nil)
			if err != nil {
				return nil, err
			}

			gasTipCap, err := r.client.SuggestGasTipCap(ctx)
			if err != nil {
				return nil, err
			}

			gasTipCap = new(big.Int).Add(gasTipCap, gasTipCap)

			gasFeeCap := new(big.Int).Add(
				gasTipCap,
				new(big.Int).Mul(head.BaseFee, big.NewInt(3)))

			// Replaces the tx with a transaction that is guaranteed fo fail, deploy the following contract:
			// contract AlwaysRevert { constructor() { revert(); } }
			data, _ := hex.DecodeString("6080604052348015600e575f80fd5b5f80fdfe")

			// try to cancel/replace the existing tx by sending a 0ETH tx to our self.
			return types.SignNewTx(r.wallet.PrivateKeyStruct, signer, &types.DynamicFeeTx{
				ChainID:   new(big.Int).SetUint64(r.chainID),
				Nonce:     opts.Nonce.Uint64(),
				GasTipCap: gasTipCap,
				GasFeeCap: gasFeeCap,
				Gas:       60_000,
				To:        nil,
				Data:      data,
			})
		}

		lastPendingTx *txPoolPendingTransaction
	)

	log.Warnw("Try to replace pending transactions from previous run",
		"wallet", r.wallet.Address, "from", nonce, "to", pendingNonce)

	for nonce < pendingNonce {
		opts := &bind.TransactOpts{
			Nonce: new(big.Int).SetUint64(nonce),
		}

		// send a replacement tx that is guaranteed to fail
		tx, err := createTx(opts)
		if err != nil {
			log.Errorw("Unable to create replacement transaction", "error", err)
			return
		}

		if err := r.client.SendTransaction(ctx, tx); err != nil {
			log.Errorw("Unable to submit replacement transaction", "error", err)
			return
		}

		log.Infow("Try to replace pending transaction")

		pendingTx := &txPoolPendingTransaction{
			txHashes:    []common.Hash{tx.Hash()},
			tx:          tx,
			txOpts:      opts,
			resubmit:    createTx,
			name:        "ReplacePendingTxOnBoot",
			firstSubmit: start,
			lastSubmit:  start,
			tracer:      r.tracer,
			listener:    make(chan *types.Receipt, 1),
		}

		r.pendingTransactionPool.replacementsSent.Add(1)
		r.pendingTransactionPool.addPendingTx <- pendingTx
		lastPendingTx = pendingTx

		nonce++
	}

	if lastPendingTx == nil {
		return
	}

	// wait for pending tx to be included
	if _, err := lastPendingTx.Wait(ctx); err != nil {
		log.Errorw("Replacement transaction failed", "error", err)
		return
	}

	log.Infow("Replaced transaction during boot", "count", pendingNonce-nonce, "took", time.Since(start))
}

// Wait until the receipt is available for tx or until ctx expired.
// Can only be called once, when the receipt is read it isn't available again and an error is returned.
func (tx *txPoolPendingTransaction) Wait(ctx context.Context) (*types.Receipt, error) {
	var span trace.Span
	if tx.tracer != nil {
		ctx, span = tx.tracer.Start(ctx, "pending_tx_wait",
			trace.WithAttributes(
				attribute.String("function", tx.name),
				attribute.String("tx", fmt.Sprintf("%s", tx.tx.Hash())),
				attribute.Int64("nonce", int64(tx.tx.Nonce())),
			),
		)
		defer span.End()
	}

	select {
	case receipt, ok := <-tx.listener:
		if !ok {
			return nil, RiverError(Err_UNAVAILABLE,
				"Transaction receipt already retrieved or not available").Func("Wait")
		}
		if span != nil {
			span.SetAttributes(attribute.String("tx_hash", receipt.TxHash.String()))
		}
		return receipt, nil
	case <-ctx.Done():
		return nil, ctx.Err()
	}
}

// TransactionHash returns the transaction hash and is only available after the receipt was retrieved.
func (tx *txPoolPendingTransaction) TransactionHash() common.Hash {
	txHash := tx.executedHash.Load()
	if txHash == nil {
		return common.Hash{}
	}
	return *txHash
}

// caller is expected to hold a lock on r.mu
func (r *transactionPool) nextNonce(ctx context.Context) (uint64, error) {
	if r.lastNonce != nil {
		return *r.lastNonce + 1, nil
	}
	return r.client.PendingNonceAt(ctx, r.wallet.Address)
}

func (r *transactionPool) EstimateGas(ctx context.Context, createTx CreateTransaction) (uint64, error) {
	opts := &bind.TransactOpts{
		From:    r.wallet.Address,
		Nonce:   new(big.Int).SetUint64(0),
		Signer:  r.signerFn,
		Context: ctx,
		NoSend:  true,
	}

	tx, err := createTx(opts)
	log := logging.FromCtx(ctx)
	if err != nil {
		log.Debugw("Estimating gas for transaction failed", "error", err)
		return 0, err
	}
	return tx.Gas(), nil
}

func (r *transactionPool) Submit(
	ctx context.Context,
	name string,
	createTx CreateTransaction,
) (TransactionPoolPendingTransaction, error) {
	// lock to prevent tx.Nonce collisions
	r.mu.Lock()
	defer r.mu.Unlock()

	return r.submitLocked(ctx, name, createTx, true)
}

func (r *transactionPool) SubmitRaw(
	ctx context.Context,
	name string,
	contract *bind2.BoundContract,
	data []byte,
) (TransactionPoolPendingTransaction, error) {
	// lock to prevent tx.Nonce collisions
	r.mu.Lock()
	defer r.mu.Unlock()

	return r.submitLocked(
		ctx,
		name,
		func(opts *bind.TransactOpts) (*types.Transaction, error) {
			return bind2.Transact(contract, opts, data)
		},
		true,
	)
}

func (r *transactionPool) SubmitTx(
	ctx context.Context,
	name string,
	contract *bind2.BoundContract,
	pack func() ([]byte, error),
) (TransactionPoolPendingTransaction, error) {
	calldata, err := pack()
	if err != nil {
		return nil, AsRiverError(
			err,
			Err_CANNOT_CALL_CONTRACT,
		).Func("SubmitTx").
			Message("Failed to pack transaction").
			Tag("name", name)
	}

	return r.SubmitRaw(ctx, name, contract, calldata)
}

func (r *transactionPool) submitLocked(
	ctx context.Context,
	name string,
	createTx CreateTransaction,
	canRetry bool,
) (TransactionPoolPendingTransaction, error) {
	var span trace.Span
	if r.tracer != nil {
		ctx, span = r.tracer.Start(ctx, "txpool_submit")
		defer span.End()
	}

	nonce, err := r.nextNonce(ctx)
	if err != nil {
		return nil, err
	}

	opts := &bind.TransactOpts{
		From:      r.wallet.Address,
		Nonce:     new(big.Int).SetUint64(nonce),
		Signer:    r.signerFn,
		Context:   ctx,
		NoSend:    true,
		GasFeeCap: r.pricePolicy.GasFeeCap(),
	}

	// on river chain there is no gas market and miners are expected to include transactions with a
	// fixed tip of riverChainFixedTipCap. This saves several rpc calls when assembling the transaction.
	if r.isRiverChain() {
		if baseFee := r.baseFee.Load(); baseFee != nil {
			opts.GasFeeCap = new(big.Int).Add(
				new(big.Int).Mul(baseFee, big.NewInt(2)),
				riverChainFixedTipCap)
		}
		opts.GasTipCap = riverChainFixedTipCap
	}

	tx, err := createTx(opts)
	if err != nil {
		return nil, err
	}

	if span != nil {
		span.SetAttributes(attribute.String("tx_hash", tx.Hash().String()))
	}

	// TODO: disabling this check for now
	// ensure that tx gas price is not higher than node operator has defined in the config he is willing to pay
	// if tx.GasFeeCap() != nil && r.pricePolicy.GasFeeCap() != nil && tx.GasFeeCap().Cmp(r.pricePolicy.GasFeeCap()) > 0
	// {
	// 	return nil, RiverError(Err_BAD_CONFIG, "Transaction too expensive").
	// 		Tags("tx.GasFeeCap", tx.GasFeeCap().String(), "user.GasFeeCap", r.pricePolicy.GasFeeCap().String(), "name",
	// name).
	// 		Func("Submit")
	// }

	if err := r.client.SendTransaction(ctx, tx); err != nil {
		// force fetching the latest nonce from the rpc node again when it was reported to be too low. This can be
		// caused by the chain rpc node lagging behind when the tx pool fetched the nonce. When the chain rpc node
		// caught up the fetched nonce can be too low. Fetch the nonce again recovers from this scenario.
		if canRetry && strings.Contains(strings.ToLower(err.Error()), "nonce too low") {
			r.lastNonce = nil
			return r.submitLocked(ctx, name, createTx, false)
		}
		return nil, err
	}

	now := time.Now()
	pendingTx := &txPoolPendingTransaction{
		txHashes:    []common.Hash{tx.Hash()},
		tx:          tx,
		txOpts:      opts,
		resubmit:    createTx,
		name:        name,
		firstSubmit: now,
		lastSubmit:  now,
		tracer:      r.tracer,
		listener:    make(chan *types.Receipt, 1),
	}

	if r.lastNonce == nil {
		r.lastNonce = new(uint64)
	}
	*r.lastNonce = pendingTx.tx.Nonce()

	r.pendingTransactionPool.addPendingTx <- pendingTx

	// metrics
	methodName := getMethodName(tx.Data())
	r.transactionSubmitted.With(prometheus.Labels{"method_name": methodName}).Add(1)

	log := logging.FromCtx(ctx)
	log.Infow(
		"TxPool: Transaction SENT",
		"txHash", tx.Hash(),
		"chain", r.chainID,
		"name", name,
		"method", methodName,
		"nonce", tx.Nonce(),
		"from", opts.From,
		"to", tx.To(),
		"gasPrice", tx.GasPrice(),
		"gasFeeCap", tx.GasFeeCap(),
		"gasTipCap", tx.GasTipCap(),
	)

	return pendingTx, nil
}

func (r *transactionPool) onHead(ctx context.Context, head *types.Header) {
	r.baseFee.Store(new(big.Int).Set(head.BaseFee))

	if time.Since(r.walletBalanceLastTimeChecked) < time.Minute {
		return
	}

	balance, err := r.client.BalanceAt(ctx, r.wallet.Address, nil)
	if err != nil {
		log := logging.FromCtx(ctx).With("chain", r.chainID)
		log.Errorw("Unable to retrieve wallet balance", "error", err)
		return
	}

	r.walletBalance.Set(WeiToEth(balance))
	r.walletBalanceLastTimeChecked = time.Now()
}

func (r *transactionPool) ProcessedTransactionsCount() int64 {
	return r.pendingTransactionPool.processedTxCount.Load()
}

func (r *transactionPool) PendingTransactionsCount() int64 {
	return r.pendingTransactionPool.pendingTxCount.Load()
}

func (r *transactionPool) ReplacementTransactionsCount() int64 {
	return r.pendingTransactionPool.replacementsSent.Load()
}

func (r *transactionPool) LastReplacementTransactionUnix() int64 {
	return r.pendingTransactionPool.lastReplacementSent.Load()
}
