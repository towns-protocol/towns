package nodes

import (
	"sync"
	"testing"
	"time"

	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	. "github.com/river-build/river/core/node/base"
	"github.com/river-build/river/core/node/base/test"
	"github.com/river-build/river/core/node/config"
	"github.com/river-build/river/core/node/contracts"
	"github.com/river-build/river/core/node/crypto"
	. "github.com/river-build/river/core/node/protocol"
	"github.com/river-build/river/core/node/registries"
	"github.com/stretchr/testify/require"
)

func TestNodeRegistryUpdates(t *testing.T) {
	require := require.New(t)

	ctx := test.NewTestContext()

	btc, err := crypto.NewBlockchainTestContext(ctx, 1)
	require.NoError(err)
	defer btc.Close()

	btc.Commit()

	bc := btc.GetBlockchain(ctx, 0, true)
	defer bc.Close()

	rr, err := registries.NewRiverRegistryContract(
		ctx,
		bc,
		&config.ContractConfig{Address: btc.RiverRegistryAddress},
	)
	require.NoError(err)

	var (
		chainBlockNum        = btc.BlockNum(ctx)
		confirmedTransaction = new(sync.Map)
		chainMonitor         = crypto.NewChainMonitorBuilder(crypto.BlockNumber(chainBlockNum+1)).
					OnContractEvent(rr.Address, func(event types.Log) {
				confirmedTransaction.Store(event.TxHash, struct{}{})
			})

		waitForTx = func(tx *types.Transaction) {
			for {
				time.Sleep(time.Second)
				if _, ok := confirmedTransaction.Load(tx.Hash()); ok {
					return
				}
				time.Sleep(10 * time.Millisecond)
			}
		}
	)

	r, err := LoadNodeRegistry(ctx, rr, bc.Wallet.Address, chainBlockNum, chainMonitor)
	require.Error(err)
	require.Nil(r)
	require.Equal(Err_UNKNOWN_NODE, AsRiverError(err).Code)

	owner := btc.DeployerBlockchain

	go chainMonitor.Build(10*time.Millisecond).Run(ctx, bc.Client)

	urls := []string{"https://river0.test", "https://river1.test", "https://river2.test"}
	addrs := []common.Address{btc.Wallets[0].Address, crypto.GetTestAddress(), crypto.GetTestAddress()}

	tx, err := owner.TxRunner.Submit(ctx, func(opts *bind.TransactOpts) (*types.Transaction, error) {
		return btc.NodeRegistry.RegisterNode(opts, addrs[0], urls[0], contracts.NodeStatus_NotInitialized)
	})
	require.NoError(err)
	btc.Commit()
	waitForTx(tx)

	chainBlockNum = btc.BlockNum(ctx)

	r, err = LoadNodeRegistry(ctx, rr, bc.Wallet.Address, chainBlockNum, chainMonitor)
	require.NoError(err)
	require.NotNil(r)
	nodes := r.GetAllNodes()
	require.Len(nodes, 1)

	go chainMonitor.Build(10*time.Millisecond).Run(ctx, bc.Client)

	record := nodes[0]
	require.NoError(err)
	require.Equal(btc.Wallets[0].Address, record.address)
	require.Equal(urls[0], record.url)
	require.True(record.local)
	require.Equal(contracts.NodeStatus_NotInitialized, record.status)

	tx, err = owner.TxRunner.Submit(ctx, func(opts *bind.TransactOpts) (*types.Transaction, error) {
		return btc.NodeRegistry.RegisterNode(opts, addrs[1], urls[1], contracts.NodeStatus_Operational)
	})
	require.NoError(err)
	btc.Commit()
	waitForTx(tx)

	nodes = r.GetAllNodes()
	require.Len(nodes, 2)

	record, err = r.GetNode(addrs[1])
	require.NoError(err)
	require.Equal(addrs[1], record.address)
	require.Equal(urls[1], record.url)
	require.False(record.local)
	require.Equal(contracts.NodeStatus_Operational, record.status)

	const updatedUrl = "https://river1-updated.test"
	_, err = owner.TxRunner.Submit(ctx, func(opts *bind.TransactOpts) (*types.Transaction, error) {
		return btc.NodeRegistry.UpdateNodeUrl(opts, addrs[1], updatedUrl)
	})
	require.NoError(err)
	btc.Commit()
	waitForTx(tx)

	record, err = r.GetNode(addrs[1])
	require.NoError(err)
	require.Equal(addrs[1], record.address)
	require.Equal(updatedUrl, record.url)
	require.False(record.local)
	require.Equal(contracts.NodeStatus_Operational, record.status)

	_, err = owner.TxRunner.Submit(ctx, func(opts *bind.TransactOpts) (*types.Transaction, error) {
		return btc.NodeRegistry.UpdateNodeStatus(opts, addrs[1], contracts.NodeStatus_Departing)
	})
	require.NoError(err)
	btc.Commit()
	waitForTx(tx)

	record, err = r.GetNode(addrs[1])
	require.NoError(err)
	require.Equal(addrs[1], record.address)
	require.Equal(updatedUrl, record.url)
	require.False(record.local)
	require.Equal(contracts.NodeStatus_Departing, record.status)

	_, err = owner.TxRunner.Submit(ctx, func(opts *bind.TransactOpts) (*types.Transaction, error) {
		tx, err := btc.NodeRegistry.RemoveNode(opts, addrs[1])
		require.Error(err)
		require.Contains(err.Error(), "NODE_STATE_NOT_ALLOWED")
		return tx, err
	})
	require.Error(err)
	btc.Commit()

	_, err = owner.TxRunner.Submit(ctx, func(opts *bind.TransactOpts) (*types.Transaction, error) {
		return btc.NodeRegistry.UpdateNodeStatus(opts, addrs[1], contracts.NodeStatus_Deleted)
	})
	require.NoError(err)
	btc.Commit()

	_, err = owner.TxRunner.Submit(ctx, func(opts *bind.TransactOpts) (*types.Transaction, error) {
		return btc.NodeRegistry.RemoveNode(opts, addrs[1])
	})
	require.NoError(err)
	btc.Commit()
	waitForTx(tx)

	nodes = r.GetAllNodes()
	require.Len(nodes, 1)
	record, err = r.GetNode(addrs[1])
	require.Error(err)
	require.Nil(record)
}
