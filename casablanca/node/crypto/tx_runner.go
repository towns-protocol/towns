package crypto

import (
	"context"
	"math/big"
	"sync"
	"time"

	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	ethCrypto "github.com/ethereum/go-ethereum/crypto"

	. "github.com/river-build/river/base"
	. "github.com/river-build/river/protocol"
)

type Transactor interface {
	Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error)
}

type TxRunnerParams struct {
	Wallet         *Wallet
	Client         BlockchainClient
	ChainId        *big.Int
	WaitPollPeriod time.Duration
	MaxWait        time.Duration
}

// Transactions signed by the same address need to have sequential nonces.
// This class ensures that.
// All transactions to specific blockchain to all possible contracts from a specific address should go through this class.
type TxRunner struct {
	p TxRunnerParams

	signerFn bind.SignerFn

	// Next fields are protected by mu.
	nonce *big.Int
	mu    sync.Mutex
}

func NewTxRunner(ctx context.Context, params *TxRunnerParams) *TxRunner {
	r := &TxRunner{
		p: *params,
	}

	if r.p.WaitPollPeriod == 0 {
		r.p.WaitPollPeriod = 100 * time.Millisecond
	}
	if r.p.MaxWait == 0 {
		r.p.MaxWait = 10 * time.Second
	}

	signer := types.LatestSignerForChainID(params.ChainId)

	r.signerFn = func(address common.Address, tx *types.Transaction) (*types.Transaction, error) {
		if address != r.p.Wallet.Address {
			return nil, RiverError(Err_PERMISSION_DENIED, "Address mismatch")
		}
		signature, err := ethCrypto.Sign(signer.Hash(tx).Bytes(), r.p.Wallet.PrivateKeyStruct)
		if err != nil {
			return nil, err
		}
		return tx.WithSignature(signer, signature)
	}

	return r
}

func (tr *TxRunner) Submit(
	ctx context.Context,
	contract Transactor,
	method string,
	params ...any,
) (*types.Transaction, error) {
	tr.mu.Lock()
	defer tr.mu.Unlock()

	if tr.nonce == nil {
		n, err := tr.p.Client.PendingNonceAt(ctx, tr.p.Wallet.Address)
		if err != nil {
			return nil, AsRiverError(err, Err_CANNOT_CALL_CONTRACT).Func("Submit").Message("Cannot get nonce")
		}
		tr.nonce = &big.Int{}
		tr.nonce.SetUint64(n)
	}

	opts := &bind.TransactOpts{
		From:    tr.p.Wallet.Address,
		Nonce:   tr.nonce,
		Signer:  tr.signerFn,
		Context: ctx,
	}

	tx, err := contract.Transact(opts, method, params...)
	if err != nil {
		// TODO: on nonce error, reset nonce and retry
		return nil, AsRiverError(err, Err_CANNOT_CALL_CONTRACT).Func("Submit").Message("Transact failed")
	}

	tr.nonce.Add(tr.nonce, big.NewInt(1))

	return tx, nil
}

// TODO: this is very naive implementation. In reality it should wait for new block and notify
// waiters with matching hashes at once, instead of polling in parallel.
func (tr *TxRunner) SubmitAndWait(
	ctx context.Context,
	contract Transactor,
	method string,
	params ...any,
) (*types.Transaction, *types.Receipt, error) {
	tx, err := tr.Submit(ctx, contract, method, params...)
	if err != nil {
		return nil, nil, AsRiverError(err).Func("SubmitAndWait")
	}

	receipt, err := WaitMined(ctx, tr.p.Client, tx.Hash(), tr.p.WaitPollPeriod, tr.p.MaxWait)
	if err != nil {
		return nil, nil, AsRiverError(err).Func("SubmitAndWait")
	}
	return tx, receipt, nil
}
