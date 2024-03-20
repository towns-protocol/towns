package nodes

import (
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

func (n *nodeRegistryImpl) testWaitForBlock(blockNum crypto.BlockNumber) {
	for {
		n.mu.Lock()
		exit := n.appliedBlockNum >= blockNum
		n.mu.Unlock()
		if exit {
			return
		}

		time.Sleep(5 * time.Millisecond)
	}
}

func TestNodeRegistryUpdates(t *testing.T) {
	require := require.New(t)

	ctx := test.NewTestContext()

	btc, err := crypto.NewBlockchainTestContext(ctx, 1)
	require.NoError(err)
	defer btc.Close()

	btc.Commit()

	bc := btc.GetBlockchain(ctx, 0, true)
	defer bc.Close()

	rr, err := registries.NewRiverRegistryContract(ctx, bc, &config.ContractConfig{Address: btc.RiverRegistryAddress.Hex()})
	require.NoError(err)

	r, err := LoadNodeRegistry(ctx, rr, bc.Wallet.Address)
	require.Error(err)
	require.Nil(r)
	require.Equal(Err_UNKNOWN_NODE, AsRiverError(err).Code)

	owner := btc.DeployerBlockchain

	urls := []string{"https://river0.test", "https://river1.test", "https://river2.test"}
	addrs := []common.Address{btc.Wallets[0].Address, crypto.GetTestAddress(), crypto.GetTestAddress()}

	_, err = owner.TxRunner.Submit(ctx, func(opts *bind.TransactOpts) (*types.Transaction, error) {
		return btc.NodeRegistry.RegisterNode(opts, addrs[0], urls[0], contracts.NodeStatus_NotInitialized)
	})
	require.NoError(err)
	btc.Commit()

	r, err = LoadNodeRegistry(ctx, rr, bc.Wallet.Address)
	require.NoError(err)
	require.NotNil(r)
	require.Equal(1, r.NumNodes())

	record, err := r.GetNodeByIndex(0)
	require.NoError(err)
	require.Equal(btc.Wallets[0].Address, record.Address)
	require.Equal(urls[0], record.Url)
	require.True(record.Local)
	require.Equal(contracts.NodeStatus_NotInitialized, record.Status)

	_, err = owner.TxRunner.Submit(ctx, func(opts *bind.TransactOpts) (*types.Transaction, error) {
		return btc.NodeRegistry.RegisterNode(opts, addrs[1], urls[1], contracts.NodeStatus_Operational)
	})
	require.NoError(err)
	btc.Commit()
	blockNum := btc.BlockNum(ctx)
	r.testWaitForBlock(blockNum)

	require.Equal(2, r.NumNodes())

	record, err = r.GetNodeByAddress(addrs[1])
	require.NoError(err)
	require.Equal(addrs[1], record.Address)
	require.Equal(urls[1], record.Url)
	require.False(record.Local)
	require.Equal(contracts.NodeStatus_Operational, record.Status)

	const updatedUrl = "https://river1-updated.test"
	_, err = owner.TxRunner.Submit(ctx, func(opts *bind.TransactOpts) (*types.Transaction, error) {
		return btc.NodeRegistry.UpdateNodeUrl(opts, addrs[1], updatedUrl)
	})
	require.NoError(err)
	btc.Commit()
	blockNum = btc.BlockNum(ctx)
	r.testWaitForBlock(blockNum)

	record, err = r.GetNodeByAddress(addrs[1])
	require.NoError(err)
	require.Equal(addrs[1], record.Address)
	require.Equal(updatedUrl, record.Url)
	require.False(record.Local)
	require.Equal(contracts.NodeStatus_Operational, record.Status)

	_, err = owner.TxRunner.Submit(ctx, func(opts *bind.TransactOpts) (*types.Transaction, error) {
		return btc.NodeRegistry.UpdateNodeStatus(opts, addrs[1], contracts.NodeStatus_Departing)
	})
	require.NoError(err)
	btc.Commit()
	blockNum = btc.BlockNum(ctx)
	r.testWaitForBlock(blockNum)

	record, err = r.GetNodeByAddress(addrs[1])
	require.NoError(err)
	require.Equal(addrs[1], record.Address)
	require.Equal(updatedUrl, record.Url)
	require.False(record.Local)
	require.Equal(contracts.NodeStatus_Departing, record.Status)

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
	blockNum = btc.BlockNum(ctx)
	r.testWaitForBlock(blockNum)

	require.Equal(1, r.NumNodes())
	record, err = r.GetNodeByAddress(addrs[1])
	require.Error(err)
	require.Nil(record)
}
