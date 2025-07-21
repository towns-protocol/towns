package registries

import (
	"context"
	"testing"

	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/stretchr/testify/require"

	"github.com/towns-protocol/towns/core/config"
	"github.com/towns-protocol/towns/core/contracts/river"
	. "github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/base/test"
	"github.com/towns-protocol/towns/core/node/crypto"
	. "github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/testutils"
)

func TestNodeEvents(t *testing.T) {
	require := require.New(t)
	ctx := test.NewTestContext(t)
	tt, err := crypto.NewBlockchainTestContext(ctx, crypto.TestParams{NumKeys: 1})
	require.NoError(err)

	owner := tt.DeployerBlockchain

	bc := tt.GetBlockchain(ctx, 0)

	rr, err := NewRiverRegistryContract(
		ctx,
		bc,
		&config.ContractConfig{Address: tt.RiverRegistryAddress},
		&config.GetDefaultConfig().RiverRegistry,
	)
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

	added, ok := events[0].(*river.NodeRegistryV1NodeAdded)
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

	urlUpdated, ok := events[0].(*river.NodeRegistryV1NodeUrlUpdated)
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

	statusUpdated, ok := events[0].(*river.NodeRegistryV1NodeStatusUpdated)
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

	statusUpdated, ok = events[0].(*river.NodeRegistryV1NodeStatusUpdated)
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

	removed, ok := events[0].(*river.NodeRegistryV1NodeRemoved)
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
	ctx := test.NewTestContext(t)
	require := require.New(t)

	tc, err := crypto.NewBlockchainTestContext(ctx, crypto.TestParams{NumKeys: 2, MineOnTx: true, AutoMine: true})
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

	receipt1, err := tx1.Wait(ctx)
	require.NoError(err)
	require.Equal(crypto.TransactionResultSuccess, receipt1.Status)
	require.NoError(err)
	receipt2, err := tx2.Wait(ctx)
	require.NoError(err)
	require.Equal(crypto.TransactionResultSuccess, receipt2.Status)

	rr1, err := NewRiverRegistryContract(
		ctx,
		bc1,
		&config.ContractConfig{Address: tc.RiverRegistryAddress},
		&config.GetDefaultConfig().RiverRegistry,
	)
	require.NoError(err)

	allocatedC := make(chan *river.StreamState, 10)
	addedC := make(chan *river.StreamState, 10)
	lastMBC := make(chan *river.StreamMiniblockUpdate, 10)
	placementC := make(chan *river.StreamState, 10)

	err = rr1.OnStreamEvent(
		ctx,
		bc1.InitialBlockNum+1,
		func(ctx context.Context, event *river.StreamState) {
			allocatedC <- event
		},
		func(ctx context.Context, event *river.StreamState) {
			addedC <- event
		},
		func(ctx context.Context, event *river.StreamMiniblockUpdate) {
			lastMBC <- event
		},
		func(ctx context.Context, event *river.StreamState) {
			placementC <- event
		},
	)
	require.NoError(err)

	// Allocate stream
	streamId := testutils.StreamIdFromBytes([]byte{0xa1, 0x02, 0x03})
	addrs := []common.Address{nodeAddr1}
	genesisHash := common.HexToHash("0x123")
	genesisMiniblock := []byte("genesis1")
	err = rr1.AllocateStream(ctx, streamId, addrs, genesisHash, genesisMiniblock)
	require.NoError(err)

	allocated := <-allocatedC
	require.Empty(allocatedC)
	require.Empty(addedC)
	require.Empty(lastMBC)
	require.Empty(placementC)

	require.NotNil(allocated)
	require.Equal(streamId, allocated.GetStreamId())
	require.EqualValues(river.StreamUpdatedEventTypeAllocate, allocated.Reason())
	require.Equal(genesisHash, allocated.Stream.LastMbHash())
	require.EqualValues(0, allocated.Stream.LastMbNum())
	require.Equal(addrs, allocated.Stream.Nodes())
	require.EqualValues(false, allocated.Stream.IsSealed())

	// Update stream placement
	tx, err := bc1.TxPool.Submit(ctx, "UpdateStreamPlacement",
		func(opts *bind.TransactOpts) (*types.Transaction, error) {
			return tc.StreamRegistry.PlaceStreamOnNode(opts, streamId, nodeAddr2)
		},
	)
	require.NoError(err)
	tc.Commit(ctx)
	receipt, err := tx.Wait(ctx)
	require.NoError(err)
	require.Equal(crypto.TransactionResultSuccess, receipt.Status)

	placement := <-placementC
	require.Empty(allocatedC)
	require.Empty(addedC)
	require.Empty(lastMBC)
	require.Empty(placementC)

	require.NotNil(placement)
	require.Equal(streamId, placement.GetStreamId())
	require.EqualValues(river.StreamUpdatedEventTypePlacementUpdated, placement.Reason())
	require.EqualValues(genesisHash, placement.Stream.LastMbHash())
	require.EqualValues(0, placement.Stream.LastMbNum())
	require.Equal(append(addrs, nodeAddr2), placement.Stream.Nodes())
	require.EqualValues(false, placement.Stream.IsSealed())

	// Update last miniblock
	newMBHash := common.HexToHash("0x456")
	succeeded, invalidMiniblocks, failed, err := rr1.SetStreamLastMiniblockBatch(
		ctx,
		[]river.SetMiniblock{{
			StreamId:          streamId,
			PrevMiniBlockHash: genesisHash,
			LastMiniblockHash: newMBHash,
			LastMiniblockNum:  1,
			IsSealed:          false,
		}},
	)
	require.NoError(err)
	require.Len(succeeded, 1)
	require.Empty(invalidMiniblocks)
	require.Empty(failed)

	lastMB := <-lastMBC
	require.Empty(allocatedC)
	require.Empty(addedC)
	require.Empty(lastMBC)
	require.Empty(placementC)

	require.NotNil(lastMB)
	require.Equal(streamId, lastMB.GetStreamId())
	require.EqualValues(newMBHash, lastMB.LastMiniblockHash)
	require.EqualValues(1, lastMB.LastMiniblockNum)
	require.EqualValues(genesisHash, lastMB.PrevMiniBlockHash)
	require.EqualValues(river.StreamUpdatedEventTypeLastMiniblockBatchUpdated, lastMB.Reason())
	require.False(lastMB.IsSealed)

	newMBHash2 := common.HexToHash("0x789")
	succeeded, invalidMiniblocks, failed, err = rr1.SetStreamLastMiniblockBatch(
		ctx,
		[]river.SetMiniblock{{
			StreamId:          streamId,
			PrevMiniBlockHash: newMBHash,
			LastMiniblockHash: newMBHash2,
			LastMiniblockNum:  2,
			IsSealed:          false,
		}},
	)
	require.NoError(err)
	require.Len(succeeded, 1)
	require.Empty(invalidMiniblocks)
	require.Empty(failed)

	lastMB = <-lastMBC
	require.Empty(allocatedC)
	require.Empty(addedC)
	require.Empty(lastMBC)
	require.Empty(placementC)

	require.NotNil(lastMB)
	require.Equal(streamId, lastMB.GetStreamId())
	require.EqualValues(river.StreamUpdatedEventTypeLastMiniblockBatchUpdated, lastMB.Reason())
	require.EqualValues(newMBHash, lastMB.PrevMiniBlockHash)
	require.Equal(newMBHash2, common.Hash(lastMB.LastMiniblockHash))
	require.EqualValues(2, lastMB.LastMiniblockNum)
	require.False(lastMB.IsSealed)

	// Add stream
	streamId = testutils.StreamIdFromBytes([]byte{0xa1, 0x02, 0x04})
	addrs = []common.Address{nodeAddr1}
	genesisHash = common.HexToHash("0x12345")
	lastMiniblockHash := common.HexToHash("0x56789")
	lastMiniblockNum := int64(1)
	err = rr1.AddStream(ctx, streamId, addrs, genesisHash, lastMiniblockHash, lastMiniblockNum, true)
	require.NoError(err)

	added := <-addedC
	require.Empty(allocatedC)
	require.Empty(addedC)
	require.Empty(lastMBC)
	require.Empty(placementC)

	require.NotNil(added)

	require.Equal(streamId, added.GetStreamId())
	require.Equal(addrs, added.Stream.Nodes())
	require.EqualValues(river.StreamUpdatedEventTypeCreate, added.Reason())
	require.EqualValues(lastMiniblockHash, added.Stream.LastMbHash())
	require.EqualValues(lastMiniblockNum, added.Stream.LastMbNum())
	require.EqualValues(true, added.Stream.IsSealed())
}
