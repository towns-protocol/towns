package crypto

import (
	"context"
	"encoding/hex"
	"errors"
	"math/big"
	"sync"
	"sync/atomic"
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/river-build/river/core/node/infra"

	"github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/crypto"
	. "github.com/river-build/river/core/node/base"
	"github.com/river-build/river/core/node/config"
	"github.com/river-build/river/core/node/dlog"
	. "github.com/river-build/river/core/node/protocol"
)

var _ TransactionPool = (*transactionPool)(nil)

type (
	// TransactionPoolPendingTransaction is a transaction that is submitted to the network but not yet included in the
	// chain. Because a transaction can be resubmitted with different gas parameters the transaction hash isn't stable.
	TransactionPoolPendingTransaction interface {
		// Wait till the transaction is included in the chain and the receipt is available.
		Wait() <-chan *types.Receipt
		// TransactionHash returns the hash of the transaction that was executed on the chain.
		// This is not always reliably populated on the transaction receipt.
		TransactionHash() common.Hash
	}

	// CreateTransaction expects the function to create a transaction with the received transaction options.
	CreateTransaction = func(opts *bind.TransactOpts) (*types.Transaction, error)

	// TransactionPool represents an in-memory transaction pool to which transaction can be submitted.
	TransactionPool interface {
		// Submit calls createTx and sends the resulting transaction to the blockchain. It returns a pending transaction
		// for which the caller can wait for the transaction receipt to arrive. The pool will resubmit transactions
		// when necessary.
		Submit(ctx context.Context, name string, createTx CreateTransaction) (TransactionPoolPendingTransaction, error)

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

	txPoolPendingTransaction struct {
		txHashes   []common.Hash // transaction hashes, due to resubmit there can be multiple
		tx         *types.Transaction
		txOpts     *bind.TransactOpts
		next       *txPoolPendingTransaction
		name       string
		resubmit   CreateTransaction
		lastSubmit time.Time
		// listener waits on this channel for the transaction receipt
		listener chan *types.Receipt
		// The hash of the transaction that was executed on the chain. This is only set on the
		// receipt by geth nodes and is not always available.
		executedHash common.Hash
	}

	transactionPool struct {
		client              BlockchainClient
		wallet              *Wallet
		chainID             uint64
		chainIDStr          string
		replacePolicy       TransactionPoolReplacePolicy
		pricePolicy         TransactionPricePolicy
		signerFn            bind.SignerFn
		processedTxCount    atomic.Int64
		pendingTxCount      atomic.Int64
		replacementsSent    atomic.Int64
		lastReplacementSent atomic.Int64

		// metrics
		transactionSubmitted         *prometheus.CounterVec
		transactionsReplaced         *prometheus.CounterVec
		transactionsPending          prometheus.Gauge
		transactionsProcessed        *prometheus.CounterVec
		transactionInclusionDuration prometheus.Observer
		transactionGasCap            *prometheus.GaugeVec
		transactionGasTip            *prometheus.GaugeVec
		walletBalanceLastTimeChecked time.Time
		walletBalance                prometheus.Gauge

		// mu protects the remaining fields
		mu             sync.Mutex
		firstPendingTx *txPoolPendingTransaction
		lastPendingTx  *txPoolPendingTransaction
	}
)

// NewTransactionPoolWithPoliciesFromConfig creates an in-memory transaction pool that tracks transactions that are
// submitted through it. Pending transactions checked on each block if they are eligable to be replaced (through the
// replacement policy). If the pending transaction must be replaced is uses the price policy to determine the new gas
// fees for the replacement transaction. The pool then submits the replacement policy. It keeps track of the old pending
// transactions in case the original transaction was included in the chain.
func NewTransactionPoolWithPoliciesFromConfig(
	ctx context.Context,
	cfg *config.ChainConfig,
	riverClient BlockchainClient,
	wallet *Wallet,
	chainMonitor ChainMonitor,
	metrics infra.MetricsFactory,
) (*transactionPool, error) {
	if cfg.BlockTimeMs <= 0 {
		return nil, RiverError(Err_BAD_CONFIG, "BlockTimeMs must be set").
			Func("NewBlockchainWithClient")
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
		ctx, riverClient, wallet, replacementPolicy, pricePolicy, chainMonitor, metrics)
}

// NewTransactionPoolWithPolicies creates an in-memory transaction pool that tracks transactions that are submitted
// through it. Pending transactions checked on each block if they are eligable to be replaced. This is determined with
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
	metrics infra.MetricsFactory,
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
		"chain_id", "address", "func_selector",
	)
	transactionsReplacedCounter := metrics.NewCounterVecEx(
		"txpool_replaced", "Number of replacement transactions submitted",
		"chain_id", "address", "func_selector",
	)
	transactionsPendingCounter := metrics.NewGaugeVecEx(
		"txpool_pending", "Number of transactions that are waiting to be included in the chain",
		"chain_id", "address",
	)
	transactionsProcessedCounter := metrics.NewCounterVecEx(
		"txpool_processed", "Number of submitted transactions that are included in the chain",
		"chain_id", "address", "status",
	)
	transactionGasCap := metrics.NewGaugeVecEx(
		"txpool_tx_fee_cap_wei", "Latest submitted EIP1559 transaction gas fee cap",
		"chain_id", "address", "replacement",
	)
	transactionGasTip := metrics.NewGaugeVecEx(
		"txpool_tx_miner_tip_wei", "Latest submitted EIP1559 transaction gas fee miner tip",
		"chain_id", "address", "replacement",
	)
	transactionInclusionDuration := metrics.NewHistogramVecEx(
		"txpool_tx_inclusion_duration_sec",
		"How long it takes before a transaction is included in the chain",
		prometheus.LinearBuckets(1.0, 2.0, 10), "chain_id", "address",
	)
	walletBalance := metrics.NewGaugeVecEx(
		"txpool_wallet_balance_eth", "Wallet native coin balance",
		"chain_id", "address",
	)

	curryLabels := prometheus.Labels{"chain_id": chainID.String(), "address": wallet.Address.String()}
	txPool := &transactionPool{
		client:                       client,
		wallet:                       wallet,
		chainID:                      chainID.Uint64(),
		chainIDStr:                   chainID.String(),
		replacePolicy:                replacePolicy,
		pricePolicy:                  pricePolicy,
		signerFn:                     signerFn,
		transactionSubmitted:         transactionsSubmittedCounter.MustCurryWith(curryLabels),
		transactionsReplaced:         transactionsReplacedCounter.MustCurryWith(curryLabels),
		transactionsPending:          transactionsPendingCounter.With(curryLabels),
		transactionsProcessed:        transactionsProcessedCounter.MustCurryWith(curryLabels),
		transactionInclusionDuration: transactionInclusionDuration.With(curryLabels),
		transactionGasCap:            transactionGasCap.MustCurryWith(curryLabels),
		transactionGasTip:            transactionGasTip.MustCurryWith(curryLabels),
		walletBalance:                walletBalance.With(curryLabels),
	}

	chainMonitor.OnBlock(txPool.OnBlock)
	chainMonitor.OnHeader(txPool.OnHeader)

	return txPool, nil
}

func (tx *txPoolPendingTransaction) Wait() <-chan *types.Receipt {
	return tx.listener
}

func (tx *txPoolPendingTransaction) TransactionHash() common.Hash {
	return tx.executedHash
}

// caller is expected to hold a lock on r.mu
func (r *transactionPool) nextNonce(ctx context.Context) (uint64, error) {
	if r.lastPendingTx != nil {
		return r.lastPendingTx.tx.Nonce() + 1, nil
	}
	return r.client.PendingNonceAt(ctx, r.wallet.Address)
}

func (r *transactionPool) ProcessedTransactionsCount() int64 {
	return r.processedTxCount.Load()
}

func (r *transactionPool) PendingTransactionsCount() int64 {
	return r.pendingTxCount.Load()
}

func (r *transactionPool) ReplacementTransactionsCount() int64 {
	return r.replacementsSent.Load()
}

func (r *transactionPool) LastReplacementTransactionUnix() int64 {
	return r.lastReplacementSent.Load()
}

func (r *transactionPool) EstimateGas(ctx context.Context, createTx CreateTransaction) (uint64, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	opts := &bind.TransactOpts{
		From:    r.wallet.Address,
		Nonce:   new(big.Int).SetUint64(0),
		Signer:  r.signerFn,
		Context: ctx,
		NoSend:  true,
	}

	tx, err := createTx(opts)
	log := dlog.FromCtx(ctx)
	if err != nil {
		log.Debug("Estimating gas for transaction failed", "err", err)
		return 0, err
	}
	return tx.Gas(), nil
}

func (r *transactionPool) Submit(
	ctx context.Context,
	name string,
	createTx CreateTransaction,
) (TransactionPoolPendingTransaction, error) {
	log := dlog.FromCtx(ctx)

	r.mu.Lock()
	defer r.mu.Unlock()

	nonce, err := r.nextNonce(ctx)
	if err != nil {
		return nil, err
	}

	opts := &bind.TransactOpts{
		From:    r.wallet.Address,
		Nonce:   new(big.Int).SetUint64(nonce),
		Signer:  r.signerFn,
		Context: ctx,
		NoSend:  true,
	}

	tx, err := createTx(opts)
	if err != nil {
		return nil, err
	}

	// ensure that tx gas price is not higher than node operator has defined in the config he is willing to pay
	if tx.GasFeeCap() != nil && r.pricePolicy.GasFeeCap() != nil && tx.GasFeeCap().Cmp(r.pricePolicy.GasFeeCap()) > 0 {
		return nil, RiverError(Err_BAD_CONFIG, "Transaction too expensive").
			Tags("tx.GasFeeCap", tx.GasFeeCap().String(), "user.GasFeeCap", r.pricePolicy.GasFeeCap().String(), "name", name).
			Func("Submit")
	}

	if err := r.client.SendTransaction(ctx, tx); err != nil {
		return nil, err
	}

	// metrics
	funcSelector := funcSelectorFromTxForMetrics(tx)
	gasCap, _ := tx.GasFeeCap().Float64()
	tipCap, _ := tx.GasTipCap().Float64()

	r.transactionSubmitted.With(prometheus.Labels{"func_selector": funcSelector}).Add(1)
	r.transactionsPending.Add(1)
	r.transactionGasCap.With(prometheus.Labels{"replacement": "false"}).Set(gasCap)
	r.transactionGasTip.With(prometheus.Labels{"replacement": "false"}).Set(tipCap)

	log.Debug(
		"TxPool: Transaction SENT",
		"txHash", tx.Hash(),
		"chain", r.chainID,
		"name", name,
		"nonce", tx.Nonce(),
		"from", opts.From,
		"to", tx.To(),
		"gasPrice", tx.GasPrice(),
		"gasFeeCap", tx.GasFeeCap(),
		"gasTipCap", tx.GasTipCap(),
	)

	pendingTx := &txPoolPendingTransaction{
		txHashes:   []common.Hash{tx.Hash()},
		tx:         tx,
		txOpts:     opts,
		resubmit:   createTx,
		name:       name,
		lastSubmit: time.Now(),
		listener:   make(chan *types.Receipt, 1),
	}

	if r.lastPendingTx == nil {
		r.firstPendingTx = pendingTx
		r.lastPendingTx = pendingTx
	} else {
		r.lastPendingTx.next = pendingTx
		r.lastPendingTx = pendingTx
	}

	r.pendingTxCount.Add(1)

	return pendingTx, nil
}

func (r *transactionPool) OnHeader(ctx context.Context, _ *types.Header) {
	if time.Since(r.walletBalanceLastTimeChecked) < time.Minute {
		return
	}

	balance, err := r.client.BalanceAt(ctx, r.wallet.Address, nil)
	if err != nil {
		log := dlog.FromCtx(ctx).With("chain", r.chainID)
		log.Error("Unable to retrieve wallet balance", "err", err)
		return
	}

	r.walletBalance.Set(WeiToEth(balance))
	r.walletBalanceLastTimeChecked = time.Now()
}

func (r *transactionPool) OnBlock(ctx context.Context, blockNumber BlockNumber) {
	log := dlog.FromCtx(ctx).With("chain", r.chainID)

	r.mu.Lock()
	// if !r.mu.TryLock() {
	// 	log.Debug("unable to claim tx pool lock")
	// 	return
	// }
	defer r.mu.Unlock()

	if r.firstPendingTx == nil {
		return
	}

	nonce, err := r.client.NonceAt(ctx, r.wallet.Address, nil)
	if err != nil {
		log.Warn("unable to get tx pool nonce", "err", err)
		return
	}

	// retrieve receipts for processed transactions and send receipt to listener
	for pendingTx := r.firstPendingTx; pendingTx != nil && pendingTx.tx.Nonce() < nonce; pendingTx = r.firstPendingTx {
		for _, txHash := range r.firstPendingTx.txHashes {
			receipt, err := r.client.TransactionReceipt(ctx, txHash)
			if receipt != nil {
				r.pendingTxCount.Add(-1)
				r.processedTxCount.Add(1)
				r.transactionInclusionDuration.Observe(time.Since(r.firstPendingTx.lastSubmit).Seconds())

				if r.lastPendingTx.tx.Nonce() == pendingTx.tx.Nonce() {
					r.lastPendingTx = nil
				}
				r.firstPendingTx.executedHash = txHash
				r.firstPendingTx.listener <- receipt
				r.firstPendingTx, pendingTx.next = r.firstPendingTx.next, nil

				status := "failed"
				if receipt.Status == types.ReceiptStatusSuccessful {
					status = "succeeded"
				}
				r.transactionsProcessed.With(prometheus.Labels{"status": status}).Inc()
				r.transactionsPending.Add(-1)

				log.Debug(
					"TxPool: Transaction DONE",
					"txHash", txHash,
					"chain", r.chainID,
					"name", pendingTx.name,
					"from", pendingTx.txOpts.From,
					"to", pendingTx.tx.To(),
					"nonce", pendingTx.tx.Nonce(),
					"succeeded", receipt.Status == types.ReceiptStatusSuccessful,
					"cumulativeGasUsed", receipt.CumulativeGasUsed,
					"gasUsed", receipt.GasUsed,
					"effectiveGasPrice", receipt.EffectiveGasPrice,
					"blockHash", receipt.BlockHash,
					"blockNumber", receipt.BlockNumber,
				)
				break
			}
			if errors.Is(err, ethereum.NotFound) {
				continue
			}
			if err != nil {
				log.Warn("unable to get transaction receipt", "txHash", txHash.Hex(), "err", err)
				return
			}
		}
	}

	var head *types.Header
	// replace transactions that are eligible for it
	for pendingTx := r.firstPendingTx; pendingTx != nil; pendingTx = pendingTx.next {
		if head == nil {
			// replace transactions that are eligible for it
			head, err = r.client.HeaderByNumber(ctx, blockNumber.AsBigInt())
			if err != nil {
				log.Error("unable to retrieve chain head", "err", err)
				return
			}
		}
		if r.replacePolicy.Eligible(head, pendingTx.lastSubmit, pendingTx.tx) {
			pendingTx.txOpts.GasPrice, pendingTx.txOpts.GasFeeCap, pendingTx.txOpts.GasTipCap = r.pricePolicy.Reprice(
				head, pendingTx.tx)

			pendingTx.txOpts.GasLimit = 0 // force resimulation to determine new gas limit

			tx, err := pendingTx.resubmit(pendingTx.txOpts)
			if err != nil {
				log.Warn("unable to create replacement transaction", "txHash", pendingTx.tx.Hash(), "err", err)
				continue
			}

			if err := r.client.SendTransaction(ctx, tx); err == nil {
				log.Debug(
					"TxPool: Transaction REPLACED",
					"old", pendingTx.tx.Hash(),
					"txHash", tx.Hash(),
					"chain", r.chainID,
					"name", pendingTx.name,
					"nonce", tx.Nonce(),
					"from", pendingTx.txOpts.From,
					"to", tx.To(),
					"gasPrice", tx.GasPrice(),
					"gasFeeCap", tx.GasFeeCap(),
					"gasTipCap", tx.GasTipCap(),
				)

				pendingTx.tx = tx
				pendingTx.txHashes = append(pendingTx.txHashes, tx.Hash())
				pendingTx.lastSubmit = time.Now()
				r.replacementsSent.Add(1)
				r.lastReplacementSent.Store(pendingTx.lastSubmit.Unix())

				funcSelector := funcSelectorFromTxForMetrics(tx)
				gasCap, _ := tx.GasFeeCap().Float64()
				tipCap, _ := tx.GasTipCap().Float64()

				r.transactionsReplaced.With(prometheus.Labels{"func_selector": funcSelector}).Add(1)
				r.transactionGasCap.With(prometheus.Labels{"replacement": "false"}).Set(gasCap)
				r.transactionGasTip.With(prometheus.Labels{"replacement": "false"}).Set(tipCap)
			} else {
				log.Error("unable to replace transaction", "txHash", tx.Hash(), "err", err)
			}
		}
	}
}

func funcSelectorFromTxForMetrics(tx *types.Transaction) string {
	if len(tx.Data()) >= 4 {
		return hex.EncodeToString(tx.Data()[:4])
	}
	return "unknown"
}
