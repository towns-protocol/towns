package registries

import (
	"context"
	"testing"

	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	. "github.com/river-build/river/core/node/base"
	"github.com/river-build/river/core/node/base/test"
	"github.com/river-build/river/core/node/config"
	"github.com/river-build/river/core/node/contracts"
	"github.com/river-build/river/core/node/crypto"
	. "github.com/river-build/river/core/node/protocol"
	. "github.com/river-build/river/core/node/shared"
	"github.com/river-build/river/core/node/testutils"
	"github.com/stretchr/testify/require"
)

func TestNodeEvents(t *testing.T) {
	require := require.New(t)
	ctx, cancel := test.NewTestContext()
	defer cancel()
	tt, err := crypto.NewBlockchainTestContext(ctx, 1, false)
	require.NoError(err)

	owner := tt.DeployerBlockchain

	bc := tt.GetBlockchain(ctx, 0)

	rr, err := NewRiverRegistryContract(ctx, bc, &config.ContractConfig{Address: tt.RiverRegistryAddress})
	require.NoError(err)

	num, err := bc.GetBlockNumber(ctx)
	require.NoError(err)

	events, err := rr.GetNodeEventsForBlock(ctx, num)
	require.NoError(err)
	require.Len(events, 0)

	tt.Commit(ctx)

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
	tt.Commit(ctx)

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

	tt.Commit(ctx)

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

	tt.Commit(ctx)

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

	tt.Commit(ctx)

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

	tt.Commit(ctx)

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

func TestStreamEvents(t *testing.T) {
	ctx, cancel := test.NewTestContext()
	defer cancel()
	require := require.New(t)

	tc, err := crypto.NewBlockchainTestContext(ctx, 2, true)
	require.NoError(err)
	defer tc.Close()

	owner := tc.DeployerBlockchain
	tc.Commit(ctx)

	bc1 := tc.GetBlockchain(ctx, 0)
	defer bc1.Close()
	bc2 := tc.GetBlockchain(ctx, 1)
	defer bc2.Close()

	nodeAddr1 := bc1.Wallet.Address
	nodeUrl1 := "http://node1.node"
	nodeAddr2 := bc2.Wallet.Address
	nodeUrl2 := "http://node2.node"

	tx1, err := owner.TxPool.Submit(ctx, "RegisterNode", func(opts *bind.TransactOpts) (*types.Transaction, error) {
		return tc.NodeRegistry.RegisterNode(opts, nodeAddr1, nodeUrl1, 2)
	})
	require.NoError(err)

	tx2, err := owner.TxPool.Submit(ctx, "RegisterNode", func(opts *bind.TransactOpts) (*types.Transaction, error) {
		return tc.NodeRegistry.RegisterNode(opts, nodeAddr2, nodeUrl2, 2)
	})
	require.NoError(err)

	tc.Commit(ctx)

	receipt1 := <-tx1.Wait()
	require.Equal(crypto.TransactionResultSuccess, receipt1.Status)
	receipt2 := <-tx2.Wait()
	require.Equal(crypto.TransactionResultSuccess, receipt2.Status)

	rr1, err := NewRiverRegistryContract(ctx, bc1, &config.ContractConfig{Address: tc.RiverRegistryAddress})
	require.NoError(err)

	allocatedC := make(chan *contracts.StreamRegistryV1StreamAllocated, 10)
	lastMBC := make(chan *contracts.StreamRegistryV1StreamLastMiniblockUpdated, 10)
	placementC := make(chan *contracts.StreamRegistryV1StreamPlacementUpdated, 10)

	err = rr1.OnStreamEvent(
		ctx,
		bc1.InitialBlockNum+1,
		func(ctx context.Context, event *contracts.StreamRegistryV1StreamAllocated) {
			allocatedC <- event
		},
		func(ctx context.Context, event *contracts.StreamRegistryV1StreamLastMiniblockUpdated) {
			lastMBC <- event
		},
		func(ctx context.Context, event *contracts.StreamRegistryV1StreamPlacementUpdated) {
			placementC <- event
		},
	)
	require.NoError(err)

	// Allocate stream
	streamId := testutils.StreamIdFromBytes([]byte{0xa1, 0x02, 0x03})
	addrs := []common.Address{nodeAddr1}
	genesisHash := common.HexToHash("0x123")
	genesisMiniblock := []byte("genesis")
	err = rr1.AllocateStream(ctx, streamId, addrs, genesisHash, genesisMiniblock)
	require.NoError(err)

	allocated := <-allocatedC
	require.NotNil(allocated)
	require.Equal(streamId, StreamId(allocated.StreamId))
	require.Equal(addrs, allocated.Nodes)
	require.Equal(genesisHash, common.Hash(allocated.GenesisMiniblockHash))
	require.Equal(genesisMiniblock, allocated.GenesisMiniblock)
	require.Len(lastMBC, 0)
	require.Len(placementC, 0)

	// Update stream placement
	tx, err := owner.TxPool.Submit(ctx, "UpdateStreamPlacement",
		func(opts *bind.TransactOpts) (*types.Transaction, error) {
			return tc.StreamRegistry.PlaceStreamOnNode(opts, streamId, nodeAddr2)
		},
	)
	require.NoError(err)
	tc.Commit(ctx)
	receipt := <-tx.Wait()
	require.Equal(crypto.TransactionResultSuccess, receipt.Status)

	placement := <-placementC
	require.NotNil(placement)
	require.Equal(streamId, StreamId(placement.StreamId))
	require.Equal(nodeAddr2, placement.NodeAddress)
	require.True(placement.IsAdded)
	require.Len(allocatedC, 0)
	require.Len(lastMBC, 0)

	// Update last miniblock
	newMBHash := common.HexToHash("0x456")
	err = rr1.SetStreamLastMiniblock(
		ctx,
		streamId,
		genesisHash,
		newMBHash,
		1,
		false,
	)
	require.NoError(err)

	lastMB := <-lastMBC
	require.NotNil(lastMB)
	require.Equal(streamId, StreamId(lastMB.StreamId))
	require.Equal(newMBHash, common.Hash(lastMB.LastMiniblockHash))
	require.Equal(uint64(1), lastMB.LastMiniblockNum)
	require.False(lastMB.IsSealed)
	require.Len(allocatedC, 0)
	require.Len(placementC, 0)

	newMBHash2 := common.HexToHash("0x789")
	succeeded, failed, err := rr1.SetStreamLastMiniblockBatch(
		ctx,
		[]contracts.SetMiniblock{{
			StreamId:          streamId,
			PrevMiniBlockHash: newMBHash,
			LastMiniblockHash: newMBHash2,
			LastMiniblockNum:  2,
			IsSealed:          false,
		}},
	)
	require.NoError(err)
	require.Len(succeeded, 1)
	require.Empty(failed)

	lastMB = <-lastMBC
	require.NotNil(lastMB)
	require.Equal(streamId, StreamId(lastMB.StreamId))
	require.Equal(newMBHash2, common.Hash(lastMB.LastMiniblockHash))
	require.Equal(uint64(2), lastMB.LastMiniblockNum)
	require.False(lastMB.IsSealed)
	require.Len(allocatedC, 0)
	require.Len(placementC, 0)
}
