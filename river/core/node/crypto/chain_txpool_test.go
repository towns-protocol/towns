package crypto_test

import (
	"fmt"
	"testing"
	"time"

	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/river-build/river/core/node/base/test"
	"github.com/river-build/river/core/node/crypto"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewTransactionPoolWithReplaceTx(t *testing.T) {
	var (
		require        = require.New(t)
		assert         = assert.New(t)
		N              = 3
		ctx, cancel    = test.NewTestContext()
		resubmitPolicy = crypto.NewTransactionPoolDeadlinePolicy(250 * time.Millisecond)
		repricePolicy  = crypto.NewDefaultTransactionPricePolicy(0, 15_000_000_000, 0)
		tc, errTC      = crypto.NewBlockchainTestContext(ctx, 1)
		pendingTxs     []crypto.TransactionPoolPendingTransaction
	)
	defer cancel()

	require.NoError(errTC, "unable to construct block test context")

	tc.Commit()

	txPool, err := crypto.NewTransactionPoolWithPolicies(
		ctx, tc.Client(), tc.DeployerBlockchain.Wallet, resubmitPolicy, repricePolicy, tc.DeployerBlockchain.ChainMonitor)
	require.NoError(err, "unable to construct transaction pool")

	for i := 0; i < N; i++ {
		pendingTx, err := txPool.Submit(ctx, func(opts *bind.TransactOpts) (*types.Transaction, error) {
			nodeWallet, err := crypto.NewWallet(ctx)
			require.Nil(err, "generate node wallet")
			url := fmt.Sprintf("http://%d.node.test", i)
			return tc.NodeRegistry.RegisterNode(opts, nodeWallet.Address, url, 2)
		})
		require.NoError(err, "unable to send transaction")
		pendingTxs = append(pendingTxs, pendingTx)
	}

	for _, pendingTx := range pendingTxs {
		done := false
		for !done {
			select {
			case receipt := <-pendingTx.Wait():
				assert.NotNil(receipt, "transaction receipt is nil")
				assert.Equal(uint64(1), receipt.Status, "transaction status is not successful")
				done = true
			case <-ctx.Done():
				t.Fatal("test expired before all transactions were processed")
			case <-time.After(time.Second):
				if tc.IsSimulated() || (tc.IsAnvil() && !tc.AnvilAutoMineEnabled()) {
					tc.Commit()
				}
			}
		}
	}

	assert.EqualValues(0, txPool.PendingTransactionsCount(), "tx pool must have no pending tx")
}
