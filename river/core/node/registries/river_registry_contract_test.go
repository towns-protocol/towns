package registries

import (
	"testing"

	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/core/types"
	. "github.com/river-build/river/core/node/base"
	"github.com/river-build/river/core/node/base/test"
	"github.com/river-build/river/core/node/config"
	"github.com/river-build/river/core/node/contracts"
	"github.com/river-build/river/core/node/crypto"
	. "github.com/river-build/river/core/node/protocol"
	"github.com/stretchr/testify/require"
)

func TestNodeEvents(t *testing.T) {
	require := require.New(t)
	ctx, cancel := test.NewTestContext()
	defer cancel()
	tt, err := crypto.NewBlockchainTestContext(ctx, 1)
	require.NoError(err)

	owner := tt.DeployerBlockchain

	bc := tt.GetBlockchain(ctx, 0, false)

	rr, err := NewRiverRegistryContract(ctx, bc, &config.ContractConfig{Address: tt.RiverRegistryAddress})
	require.NoError(err)

	num, err := bc.GetBlockNumber(ctx)
	require.NoError(err)

	events, err := rr.GetNodeEventsForBlock(ctx, num)
	require.NoError(err)
	require.Len(events, 0)

	tt.Commit()

	//
	// Test RegisterNode
	//
	nodeAddr1 := crypto.GetTestAddress()
	nodeUrl1 := "http://node1.node"
	nodeUrl2 := "http://node2.node"
	_, err = owner.TxPool.Submit(ctx, "RegisterNode", func(opts *bind.TransactOpts) (*types.Transaction, error) {
		return tt.NodeRegistry.RegisterNode(opts, nodeAddr1, nodeUrl1, 2)
	})
	require.NoError(err)
	_, err = owner.TxPool.Submit(ctx, "RegisterNode", func(opts *bind.TransactOpts) (*types.Transaction, error) {
		return tt.NodeRegistry.RegisterNode(opts, crypto.GetTestAddress(), "url2", 0)
	})
	require.NoError(err)
	_, err = owner.TxPool.Submit(ctx, "RegisterNode", func(opts *bind.TransactOpts) (*types.Transaction, error) {
		return tt.NodeRegistry.RegisterNode(opts, crypto.GetTestAddress(), "url3", 0)
	})
	require.NoError(err)
	tt.Commit()

	num, err = bc.GetBlockNumber(ctx)
	require.NoError(err)

	events, err = rr.GetNodeEventsForBlock(ctx, num)
	require.NoError(err)
	require.Len(events, 3)

	added, ok := events[0].(*contracts.NodeRegistryV1NodeAdded)
	require.True(ok)
	require.Equal(nodeAddr1, added.NodeAddress)
	require.Equal(nodeUrl1, added.Url)
	require.Equal(uint8(2), added.Status)

	//
	// GetNode
	//
	node, err := rr.NodeRegistry.GetNode(&bind.CallOpts{BlockNumber: num.AsBigInt(), Context: ctx}, nodeAddr1)
	require.NoError(err)
	require.Equal(nodeAddr1, node.NodeAddress)
	require.Equal(nodeUrl1, node.Url)
	require.Equal(uint8(2), node.Status)
	require.Equal(owner.Wallet.Address, node.Operator)

	//
	// Test UpdateNodeUrl
	//
	_, err = owner.TxPool.Submit(ctx, "UpdateNodeUrl", func(opts *bind.TransactOpts) (*types.Transaction, error) {
		return tt.NodeRegistry.UpdateNodeUrl(opts, nodeAddr1, nodeUrl2)
	})
	require.NoError(err)

	tt.Commit()

	num, err = bc.GetBlockNumber(ctx)
	require.NoError(err)

	events, err = rr.GetNodeEventsForBlock(ctx, num)
	require.NoError(err)
	require.Len(events, 1)

	urlUpdated, ok := events[0].(*contracts.NodeRegistryV1NodeUrlUpdated)
	require.True(ok)
	require.Equal(nodeUrl2, urlUpdated.Url)
	require.Equal(nodeAddr1, urlUpdated.NodeAddress)

	//
	// Test UpdateNodeStatus to Departing
	//
	_, err = owner.TxPool.Submit(ctx, "UpdateNodeStatus", func(opts *bind.TransactOpts) (*types.Transaction, error) {
		return tt.NodeRegistry.UpdateNodeStatus(opts, nodeAddr1, 4)
	})
	require.NoError(err)

	tt.Commit()

	num, err = bc.GetBlockNumber(ctx)
	require.NoError(err)

	events, err = rr.GetNodeEventsForBlock(ctx, num)
	require.NoError(err)
	require.Len(events, 1)

	statusUpdated, ok := events[0].(*contracts.NodeRegistryV1NodeStatusUpdated)
	require.True(ok)
	require.Equal(uint8(4), statusUpdated.Status)
	require.Equal(nodeAddr1, statusUpdated.NodeAddress)

	//
	// Test UpdateNodeStatus to Deleted
	//
	_, err = owner.TxPool.Submit(ctx, "UpdateNodeStatus", func(opts *bind.TransactOpts) (*types.Transaction, error) {
		return tt.NodeRegistry.UpdateNodeStatus(opts, nodeAddr1, 5)
	})
	require.NoError(err)

	tt.Commit()

	num, err = bc.GetBlockNumber(ctx)
	require.NoError(err)

	events, err = rr.GetNodeEventsForBlock(ctx, num)
	require.NoError(err)
	require.Len(events, 1)

	statusUpdated, ok = events[0].(*contracts.NodeRegistryV1NodeStatusUpdated)
	require.True(ok)
	require.Equal(uint8(5), statusUpdated.Status)
	require.Equal(nodeAddr1, statusUpdated.NodeAddress)

	//
	// Test RemoveNode
	//
	_, err = owner.TxPool.Submit(ctx, "RemoveNode", func(opts *bind.TransactOpts) (*types.Transaction, error) {
		return tt.NodeRegistry.RemoveNode(opts, nodeAddr1)
	})
	require.NoError(err)

	tt.Commit()

	num, err = bc.GetBlockNumber(ctx)
	require.NoError(err)

	events, err = rr.GetNodeEventsForBlock(ctx, num)
	require.NoError(err)
	require.Len(events, 1)

	removed, ok := events[0].(*contracts.NodeRegistryV1NodeRemoved)
	require.True(ok)
	require.Equal(nodeAddr1, removed.NodeAddress)

	//
	// GetNode
	//
	node, err = rr.NodeRegistry.GetNode(&bind.CallOpts{BlockNumber: num.AsBigInt(), Context: ctx}, nodeAddr1)
	require.Error(err)
	e := AsRiverError(err)
	require.Equal(Err_UNKNOWN_NODE, e.Code, "Error: %v", e)
}
