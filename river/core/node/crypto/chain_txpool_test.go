package crypto_test

import (
	"fmt"
	"testing"
	"time"

	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/river-build/river/core/node/base/test"
	"github.com/river-build/river/core/node/crypto"
	"github.com/river-build/river/core/node/infra"
	"github.com/stretchr/testify/require"
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
				time.Sleep(time.Second)
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
