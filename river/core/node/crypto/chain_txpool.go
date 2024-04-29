package crypto

import (
	"context"
	"errors"
	"math/big"
	"sync"
	"sync/atomic"
	"time"

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

type (
	// TransactionPoolPendingTransaction is a transaction that is submitted to the network but not yet included in the
	// chain. Because a transaction can be resubmitted with different gas parameters the transaction hash isn't stable.
	TransactionPoolPendingTransaction interface {
		// Wait till the transaction is included in the chain and the receipt is available.
		Wait() <-chan *types.Receipt
	}

	// CreateTransaction expects the function to create a transaction with the received transaction options.
	CreateTransaction = func(opts *bind.TransactOpts) (*types.Transaction, error)

	// TransactionPool represents an in-memory transaction pool to which transaction can be submitted.
	TransactionPool interface {
		// Submit calls createTx and sends the resulting transaction to the blockchain. It returns a pending transaction
		// for which the caller can wait for the transaction receipt to arrive. The pool will resubmit transactions
		// when necessary.
		Submit(ctx context.Context, createTx CreateTransaction) (TransactionPoolPendingTransaction, error)

		// SetOnSubmitHandler is called each time a transaction was sent to the chain
		SetOnSubmitHandler(func())

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
		resubmit   CreateTransaction
		lastSubmit time.Time
		// listener waits on this channel for the transaction receipt
		listener chan *types.Receipt
	}

	transactionPool struct {
		client              BlockchainClient
		wallet              *Wallet
		chainID             uint64
		replacePolicy       TransactionPoolReplacePolicy
		pricePolicy         TransactionPricePolicy
		signerFn            bind.SignerFn
		processedTxCount    atomic.Int64
		pendingTxCount      atomic.Int64
		replacementsSent    atomic.Int64
		lastReplacementSent atomic.Int64

		// mu protects the remaining fields
		mu              sync.Mutex
		firstPendingTx  *txPoolPendingTransaction
		lastPendingTx   *txPoolPendingTransaction
		onSubmitHandler func()
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
		ctx, riverClient, wallet, replacementPolicy, pricePolicy, chainMonitor)
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

	txPool := &transactionPool{
		client:        client,
		wallet:        wallet,
		chainID:       chainID.Uint64(),
		replacePolicy: replacePolicy,
		pricePolicy:   pricePolicy,
		signerFn:      signerFn,
	}

	chainMonitor.OnHeader(txPool.OnHead)

	return txPool, nil
}

func (tx *txPoolPendingTransaction) Wait() <-chan *types.Receipt {
	return tx.listener
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

func (r *transactionPool) SetOnSubmitHandler(handler func()) {
	r.onSubmitHandler = handler
}

func (r *transactionPool) Submit(
	ctx context.Context,
	createTx CreateTransaction,
) (TransactionPoolPendingTransaction, error) {
	log := dlog.Log()

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
			Tags("tx.GasFeeCap", tx.GasFeeCap().String(), "user.GasFeeCap", r.pricePolicy.GasFeeCap().String()).
			Func("Submit")
	}

	if err := r.client.SendTransaction(ctx, tx); err != nil {
		return nil, err
	}

	log.Info("transaction sent", "txHash", tx.Hash(), "chain", r.chainID)

	pendingTx := &txPoolPendingTransaction{
		txHashes:   []common.Hash{tx.Hash()},
		tx:         tx,
		txOpts:     opts,
		resubmit:   createTx,
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

	if r.onSubmitHandler != nil {
		r.onSubmitHandler()
	}

	return pendingTx, nil
}

func (r *transactionPool) OnHead(ctx context.Context, head *types.Header) {
	log := dlog.FromCtx(ctx).With("chain", r.chainID)

	if !r.mu.TryLock() {
		log.Debug("unable to claim tx pool lock")
		return
	}
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
				if r.lastPendingTx.tx.Nonce() == pendingTx.tx.Nonce() {
					r.lastPendingTx = nil
				}

				r.firstPendingTx.listener <- receipt
				r.firstPendingTx, pendingTx.next = r.firstPendingTx.next, nil

				log.Debug("transaction processed",
					"txHash", receipt.TxHash, "block#", receipt.BlockNumber.Uint64(), "status", receipt.Status)
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

	// replace transactions that are eligible for it
	for pendingTx := r.firstPendingTx; pendingTx != nil; pendingTx = pendingTx.next {
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
				log.Info("Transaction replaced", "old", pendingTx.tx.Hash(), "new", tx.Hash())
				pendingTx.tx = tx
				pendingTx.txHashes = append(pendingTx.txHashes, tx.Hash())
				pendingTx.lastSubmit = time.Now()
				r.replacementsSent.Add(1)
				r.lastReplacementSent.Store(pendingTx.lastSubmit.Unix())
			} else {
				log.Error("unable to replace transaction", "txHash", tx.Hash(), "err", err)
			}
		}
	}
}
