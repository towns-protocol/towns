package crypto_test

import (
	"context"
	"errors"
	"fmt"
	"math/big"
	"testing"
	"time"

	"github.com/ethereum/go-ethereum"

	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/stretchr/testify/require"

	"github.com/river-build/river/core/node/base/test"
	"github.com/river-build/river/core/node/crypto"
	"github.com/river-build/river/core/node/infra"
)

func TestNewTransactionPoolWithReplaceTx(t *testing.T) {
	var (
		require        = require.New(t)
		N              = 3
		ctx, cancel    = test.NewTestContext()
		resubmitPolicy = crypto.NewTransactionPoolDeadlinePolicy(250 * time.Millisecond)
		repricePolicy  = crypto.NewDefaultTransactionPricePolicy(0, 15_000_000_000, 0)
		tc, errTC      = crypto.NewBlockchainTestContext(ctx, crypto.TestParams{NumKeys: 1})
		pendingTxs     []crypto.TransactionPoolPendingTransaction
	)
	defer cancel()

	require.NoError(errTC, "unable to construct block test context")

	tc.Commit(ctx)

	txPool, err := crypto.NewTransactionPoolWithPolicies(
		ctx,
		tc.Client(),
		tc.DeployerBlockchain.Wallet,
		resubmitPolicy,
		repricePolicy,
		tc.DeployerBlockchain.ChainMonitor,
		tc.DeployerBlockchain.InitialBlockNum,
		true,
		infra.NewMetricsFactory(nil, "", ""),
		nil,
	)
	require.NoError(err, "unable to construct transaction pool")

	for i := 0; i < N; i++ {
		pendingTx, err := txPool.Submit(
			ctx,
			"RegisterNode",
			func(opts *bind.TransactOpts) (*types.Transaction, error) {
				nodeWallet, err := crypto.NewWallet(ctx)
				require.Nil(err, "generate node wallet")
				url := fmt.Sprintf("http://%d.node.test", i)
				return tc.NodeRegistry.RegisterNode(opts, nodeWallet.Address, url, 2)
			},
		)
		require.NoError(err, "unable to send transaction")
		pendingTxs = append(pendingTxs, pendingTx)
	}

	if tc.IsSimulated() || (tc.IsAnvil() && !tc.AnvilAutoMineEnabled()) {
		go func() {
			for {
				tc.Commit(ctx)
				select {
				case <-ctx.Done():
					return
				case <-time.After(time.Second):
				}
			}
		}()
	}

	for _, pendingTx := range pendingTxs {
		receipt, err := pendingTx.Wait(ctx)
		require.NoError(err)
		require.Equal(types.ReceiptStatusSuccessful, receipt.Status)
	}

	require.Eventually(func() bool {
		return txPool.PendingTransactionsCount() == 0
	}, 20*time.Second, 100*time.Millisecond, "tx pool must have no pending tx")
}

func TestReplacementTxOnBoot(t *testing.T) {
	var (
		require             = require.New(t)
		ctx, cancel         = test.NewTestContext()
		rootCtx, rootCancel = context.WithCancel(ctx)
		tc, errTC           = crypto.NewBlockchainTestContext(
			rootCtx,
			crypto.TestParams{MineOnTx: false, AutoMine: false, NumKeys: 1},
		)
	)
	defer cancel()
	defer rootCancel()

	require.NoError(errTC, "unable to construct block test context")

	tc.Commit(rootCtx)

	// this test can only run with full control over block production
	if !tc.IsSimulated() || (tc.IsAnvil() && tc.AnvilAutoMineEnabled()) {
		t.Skip()
	}

	// submit some transactions and don't mint any new blocks -> "pending stuck"
	bc := tc.GetBlockchain(rootCtx, 0)
	require.NotNil(bc)

	testWallet, err := crypto.NewWallet(ctx)
	require.NoError(err, "unable to create test wallet")

	fundTx, err := bc.TxPool.Submit(ctx, "FundWallet", func(opts *bind.TransactOpts) (*types.Transaction, error) {
		signer := types.LatestSignerForChainID(bc.ChainId)

		head, err := bc.Client.HeaderByNumber(ctx, nil)
		if err != nil {
			return nil, err
		}

		gasTipCap, err := bc.Client.SuggestGasTipCap(ctx)
		if err != nil {
			return nil, err
		}

		gasFeeCap := new(big.Int).Add(
			gasTipCap,
			new(big.Int).Mul(head.BaseFee, big.NewInt(3)))

		return types.SignNewTx(bc.Wallet.PrivateKeyStruct, signer, &types.DynamicFeeTx{
			ChainID:   bc.ChainId,
			Nonce:     opts.Nonce.Uint64(),
			GasTipCap: gasTipCap,
			GasFeeCap: gasFeeCap,
			Gas:       25_000,
			To:        &testWallet.Address,
			Value:     crypto.Eth_10,
		})
	})
	require.NoError(err)

	tc.Commit(ctx)

	fundReceipt, err := fundTx.Wait(ctx)
	require.NoError(err)
	require.Equal(types.ReceiptStatusSuccessful, fundReceipt.Status)

	// submit several transactions and ensure that these aren't commited
	var pendingTxs []crypto.TransactionPoolPendingTransaction
	for range 5 {
		pendingTx, err := bc.TxPool.Submit(rootCtx, "TestReplacementTxOnRestart",
			func(opts *bind.TransactOpts) (*types.Transaction, error) {
				signer := types.LatestSignerForChainID(bc.ChainId)

				head, err := bc.Client.HeaderByNumber(ctx, nil)
				if err != nil {
					return nil, err
				}

				gasTipCap, err := bc.Client.SuggestGasTipCap(ctx)
				if err != nil {
					return nil, err
				}

				gasFeeCap := new(big.Int).Add(gasTipCap, head.BaseFee)

				return types.SignNewTx(bc.Wallet.PrivateKeyStruct, signer, &types.DynamicFeeTx{
					ChainID:   bc.ChainId,
					Nonce:     opts.Nonce.Uint64(),
					GasTipCap: gasTipCap,
					GasFeeCap: gasFeeCap,
					Gas:       25_000,
					To:        &bc.Wallet.Address,
					Value:     big.NewInt(1),
				})
			})
		require.NoError(err, "unable to submit transaction")
		pendingTxs = append(pendingTxs, pendingTx)
	}

	// make sure none of the transactions are included in the block
	require.Never(func() bool {
		txHash := pendingTxs[0].TransactionHash()
		_, err := bc.Client.TransactionReceipt(ctx, txHash)
		return !errors.Is(err, ethereum.NotFound)
	}, 5*time.Second, 100*time.Millisecond)

	// instantiate tx pool that must replace the stuck transactions on creation
	monitor := crypto.NewChainMonitor()
	blockNum, err := bc.Client.BlockNumber(ctx)
	require.NoError(err, "unable to get block number")
	go monitor.RunWithBlockPeriod(
		ctx, bc.Client, crypto.BlockNumber(blockNum), 100*time.Millisecond,
		infra.NewMetricsFactory(nil, "", ""))

	resubmitPolicy := crypto.NewTransactionPoolDeadlinePolicy(250 * time.Millisecond)
	repricePolicy := crypto.NewDefaultTransactionPricePolicy(
		0,
		15_000_000_000,
		0,
	) // mint block and make sure that stuck transactions are replaced
	go func() {
		<-time.After(3 * time.Second)
		for {
			select {
			case <-time.After(100 * time.Millisecond):
				tc.Commit(ctx)
			case <-ctx.Done():
				return
			}
		}
	}()

	disableReplacePendingTransactionOnBoot := false
	txPool, err := crypto.NewTransactionPoolWithPolicies(
		ctx,
		bc.Client,
		bc.Wallet,
		resubmitPolicy,
		repricePolicy,
		monitor,
		crypto.BlockNumber(blockNum),
		disableReplacePendingTransactionOnBoot,
		infra.NewMetricsFactory(nil, "", ""),
		nil)

	require.NoError(err, "unable to create transaction pool")

	// make sure that all transactions are included
	require.Eventually(func() bool {
		count := txPool.ReplacementTransactionsCount()

		if int(count) < len(pendingTxs) {
			return false
		}

		txCount, err := bc.Client.NonceAt(ctx, bc.Wallet.Address, nil)
		require.NoError(err)

		return uint64(len(pendingTxs)+1) <= txCount
	}, 20*time.Second, 100*time.Millisecond)

	// make sure that none of the pending transactions was included in the chain
	// (all must have been replaced)
	for _, pendingTx := range pendingTxs {
		_, err := bc.Client.TransactionReceipt(ctx, pendingTx.TransactionHash())
		require.ErrorIs(err, ethereum.NotFound, "pending tx executed")
	}
}
