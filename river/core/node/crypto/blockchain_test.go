package crypto

import (
	"context"
	"github.com/river-build/river/core/node/contracts"
	"math/big"
	"testing"

	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	. "github.com/river-build/river/core/node/base"
	"github.com/river-build/river/core/node/base/test"
	. "github.com/river-build/river/core/node/protocol"
	. "github.com/river-build/river/core/node/shared"
	"github.com/river-build/river/core/node/testutils"
)

func TestBlockchain(t *testing.T) {
	ctx, cancel := test.NewTestContext()
	defer cancel()
	require := require.New(t)
	assert := assert.New(t)

	tc, err := NewBlockchainTestContext(ctx, 2, false)
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

	firstBlockNum, err := tc.Client().BlockNumber(ctx)
	require.NoError(err)

	tc.Commit(ctx)

	secondBlockNum, err := tc.Client().BlockNumber(ctx)
	require.NoError(err)
	if tc.IsSimulated() {
		assert.Equal(firstBlockNum+1, secondBlockNum)
	}

	receipt1 := <-tx1.Wait()
	require.Equal(uint64(1), receipt1.Status)
	receipt2 := <-tx2.Wait()
	require.Equal(uint64(1), receipt2.Status)

	nodes, err := tc.NodeRegistry.GetAllNodes(nil)
	require.NoError(err)
	assert.Len(nodes, 2)
	assert.Equal(nodeAddr1, nodes[0].NodeAddress)
	assert.Equal(nodeUrl1, nodes[0].Url)
	assert.Equal(nodeAddr2, nodes[1].NodeAddress)
	assert.Equal(nodeUrl2, nodes[1].Url)

	// Can't add the same node twice
	tx1, err = owner.TxPool.Submit(ctx, "RegisterNode", func(opts *bind.TransactOpts) (*types.Transaction, error) {
		return tc.NodeRegistry.RegisterNode(opts, nodeAddr1, nodeUrl1, 2)
	})
	// Looks like this is a difference for simulated backend:
	// this error should be know only after the transaction is mined - i.e. after Commit call.
	require.Nil(tx1)
	require.Equal(Err_ALREADY_EXISTS, AsRiverError(err).Code)

	currentBlockNum, err := tc.Client().BlockNumber(ctx)
	require.NoError(err)
	if tc.IsSimulated() {
		assert.Equal(secondBlockNum, currentBlockNum)
	}

	allIds := make(map[StreamId]bool)
	streamId := testutils.StreamIdFromBytes([]byte{0xa1, 0x02, 0x03})
	allIds[streamId] = true
	addrs := []common.Address{nodeAddr1, nodeAddr2}

	genesisHash := common.HexToHash("0x123")
	genesisMiniblock := []byte("genesis")

	tx1, err = bc1.TxPool.Submit(
		ctx,
		"AllocateStream",
		func(opts *bind.TransactOpts) (*types.Transaction, error) {
			return tc.StreamRegistry.AllocateStream(opts, streamId, addrs, genesisHash, genesisMiniblock)
		},
	)
	require.NoError(err)

	tc.Commit(ctx)

	receipt := <-tx1.Wait()
	require.Equal(uint64(1), receipt.Status)

	stream, mbHash, mb, err := tc.StreamRegistry.GetStreamWithGenesis(nil, streamId)
	require.NoError(err)
	assert.Equal(addrs, stream.Nodes)
	assert.Equal(genesisHash, common.Hash(mbHash))
	assert.Equal(genesisMiniblock, mb)
	assert.Equal(genesisHash, common.Hash(stream.LastMiniblockHash))
	assert.Equal(uint64(0), stream.LastMiniblockNum)

	// Can't allocate the same stream twice
	tx1, err = bc1.TxPool.Submit(
		ctx,
		"AllocateStream",
		func(opts *bind.TransactOpts) (*types.Transaction, error) {
			return tc.StreamRegistry.AllocateStream(opts, streamId, addrs, genesisHash, genesisMiniblock)
		},
	)
	require.Nil(tx1)
	require.Equal(Err_ALREADY_EXISTS, AsRiverError(err).Code)

	// Can't allocate with unknown node
	tx1, err = bc1.TxPool.Submit(
		ctx,
		"AllocateStream",
		func(opts *bind.TransactOpts) (*types.Transaction, error) {
			streamId := testutils.StreamIdFromBytes([]byte{0x10, 0x22, 0x33})
			return tc.StreamRegistry.AllocateStream(
				opts,
				streamId,
				[]common.Address{common.HexToAddress("0x123")},
				genesisHash,
				genesisMiniblock,
			)
		},
	)
	require.Nil(tx1)
	require.Equal(Err_UNKNOWN_NODE, AsRiverError(err).Code, "Error: %v", err)

	var lastPendingTx TransactionPoolPendingTransaction
	// Allocate 20 more streams
	for i := 0; i < 20; i++ {
		streamId := testutils.StreamIdFromBytes([]byte{0xa1, byte(i), 0x22, 0x33, 0x44, 0x55})
		allIds[streamId] = true
		lastPendingTx, err = bc1.TxPool.Submit(
			ctx,
			"AllocateStream",
			func(opts *bind.TransactOpts) (*types.Transaction, error) {
				return tc.StreamRegistry.AllocateStream(
					opts,
					streamId,
					addrs,
					genesisHash,
					genesisMiniblock,
				)
			},
		)
		require.NoError(err)
	}

	tc.Commit(ctx)

	// wait for the last transaction to finish
	<-lastPendingTx.Wait()

	// Read with pagination
	const pageSize int64 = 4
	var count int
	var lastPageSeen bool
	seenIds := make(map[StreamId]bool)
	for i := int64(0); i < 30; i += pageSize {
		streams, lastPage, err := tc.StreamRegistry.GetPaginatedStreams(nil, big.NewInt(i), big.NewInt(i+pageSize))
		require.NoError(err)
		for _, stream := range streams {
			if stream.Id != [32]byte{} {
				seenIds[testutils.StreamIdFromBytes(stream.Id[:])] = true
				count++
			}
		}
		if lastPage {
			require.Equal(len(allIds), count)
			lastPageSeen = true
			break
		}
	}
	require.True(lastPageSeen)
	require.Equal(allIds, seenIds, "allIds: %v, seenIds: %v", allIds, seenIds)
}

func TestBlockchainMultiMonitor(t *testing.T) {
	ctx, cancel := test.NewTestContext()
	defer cancel()
	require := require.New(t)
	assert := assert.New(t)

	tc, err := NewBlockchainTestContext(ctx, 3, true)
	require.NoError(err)
	defer tc.Close()

	abi, err := contracts.NodeRegistryV1MetaData.GetAbi()
	require.NoError(err, "node registry abi")

	var (
		deployer        = tc.DeployerBlockchain
		node            = tc.GetBlockchain(ctx, 0)
		chain0          = tc.GetBlockchain(ctx, 1)
		chain1          = tc.GetBlockchain(ctx, 2)
		collectedEvents = make(chan types.Log, 10)
		nodeAddedTopic  = abi.Events["NodeAdded"].ID
		bindLogCallback = func(ctx context.Context, log types.Log) { collectedEvents <- log }
	)

	tc.Commit(ctx)

	// ensure that all chain monitor capture the node added event
	deployer.ChainMonitor.OnContractWithTopicsEvent(
		tc.RiverRegistryAddress, [][]common.Hash{{nodeAddedTopic}}, bindLogCallback)
	chain0.ChainMonitor.OnContractWithTopicsEvent(
		tc.RiverRegistryAddress, [][]common.Hash{{nodeAddedTopic}}, bindLogCallback)
	chain1.ChainMonitor.OnContractWithTopicsEvent(
		tc.RiverRegistryAddress, [][]common.Hash{{nodeAddedTopic}}, bindLogCallback)

	// register node that triggers the above registered callbacks
	pendingTx, err := deployer.TxPool.Submit(ctx, "", func(opts *bind.TransactOpts) (*types.Transaction, error) {
		return tc.NodeRegistry.RegisterNode(
			opts, node.Wallet.Address,
			"http://TestBlockchainMultiMonitor.test",
			contracts.NodeStatus_NotInitialized)
	})

	require.NoError(err, "submit RegisterNode tx")
	receipt := <-pendingTx.Wait()
	require.Equal(TransactionResultSuccess, receipt.Status, "RegisterNode tx failed")

	// make sure that all chain monitor received the event
	for i := 0; i < 3; i++ {
		event := <-collectedEvents
		assert.Equal(nodeAddedTopic, event.Topics[0], "unexpected event")
	}

	require.Equal(0, len(collectedEvents), "more pending events than expected")
}
