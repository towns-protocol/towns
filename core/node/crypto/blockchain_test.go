package crypto

import (
	"testing"
	"time"

	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	. "github.com/river-build/river/core/node/base"
	"github.com/river-build/river/core/node/base/test"
	. "github.com/river-build/river/core/node/protocol"
	. "github.com/river-build/river/core/node/shared"
)

func TestBlockchain(t *testing.T) {
	ctx := test.NewTestContext()
	require := require.New(t)
	assert := assert.New(t)

	tc, err := NewBlockchainTestContext(ctx, 2)
	require.NoError(err)
	defer tc.Close()

	owner := tc.DeployerBlockchain

	bc1 := tc.GetBlockchain(ctx, 0, false)
	bc2 := tc.GetBlockchain(ctx, 1, false)

	nodeAddr1 := bc1.Wallet.Address
	nodeUrl1 := "http://node1.node"
	nodeAddr2 := bc2.Wallet.Address
	nodeUrl2 := "http://node2.node"

	tx1, err := owner.TxRunner.Submit(
		ctx,
		func(opts *bind.TransactOpts) (*types.Transaction, error) {
			return tc.RiverRegistry.RegisterNode(opts, nodeAddr1, nodeUrl1)
		},
	)
	require.NoError(err)

	tx2, err := owner.TxRunner.Submit(
		ctx,
		func(opts *bind.TransactOpts) (*types.Transaction, error) {
			return tc.RiverRegistry.RegisterNode(opts, nodeAddr2, nodeUrl2)
		},
	)
	require.NoError(err)

	firstBlockNum, err := tc.Client().BlockNumber(ctx)
	require.NoError(err)

	tc.Commit()

	secondBlockNum, err := tc.Client().BlockNumber(ctx)
	require.NoError(err)
	if tc.IsSimulated() {
		assert.Equal(firstBlockNum+1, secondBlockNum)
	}

	_, err = WaitMined(ctx, owner.Client, tx1.Hash(), time.Millisecond, time.Second*10)
	require.NoError(err)
	_, err = WaitMined(ctx, owner.Client, tx2.Hash(), time.Millisecond, time.Second*10)
	require.NoError(err)

	nodes, err := tc.RiverRegistry.GetAllNodes(nil)
	require.NoError(err)
	assert.Len(nodes, 2)
	assert.Equal(nodeAddr1, nodes[0].NodeAddress)
	assert.Equal(nodeUrl1, nodes[0].Url)
	assert.Equal(nodeAddr2, nodes[1].NodeAddress)
	assert.Equal(nodeUrl2, nodes[1].Url)

	// Can't add the same node twice
	tx1, err = owner.TxRunner.Submit(
		ctx,
		func(opts *bind.TransactOpts) (*types.Transaction, error) {
			return tc.RiverRegistry.RegisterNode(opts, nodeAddr1, nodeUrl1)
		},
	)
	// Looks like this is a difference for simulated backend:
	// this error should be know only after the transaction is mined - i.e. after Commit call.
	require.Nil(tx1)
	require.Equal(Err_ALREADY_EXISTS, AsRiverError(err).Code)

	currentBlockNum, err := tc.Client().BlockNumber(ctx)
	require.NoError(err)
	assert.Equal(secondBlockNum, currentBlockNum)

	streamId := StreamId{0x01, 0x02, 0x03}
	addrs := []common.Address{nodeAddr1, nodeAddr2}

	genesisHash := common.HexToHash("0x123")
	genesisMiniblock := []byte("genesis")

	tx1, err = bc1.TxRunner.Submit(
		ctx,
		func(opts *bind.TransactOpts) (*types.Transaction, error) {
			return tc.RiverRegistry.AllocateStream(opts, streamId, addrs, genesisHash, genesisMiniblock)
		},
	)
	require.NoError(err)

	tc.Commit()

	_, err = WaitMined(ctx, bc1.Client, tx1.Hash(), time.Millisecond, time.Second*10)
	require.NoError(err)

	stream, mbHash, mb, err := tc.RiverRegistry.GetStreamWithGenesis(nil, streamId)
	require.NoError(err)
	assert.Equal(addrs, stream.Nodes)
	assert.Equal(genesisHash, common.Hash(mbHash))
	assert.Equal(genesisMiniblock, mb)
	assert.Equal(genesisHash, common.Hash(stream.LastMiniblockHash))
	assert.Equal(uint64(0), stream.LastMiniblockNum)

	// Can't allocate the same stream twice
	tx1, err = bc1.TxRunner.Submit(
		ctx,
		func(opts *bind.TransactOpts) (*types.Transaction, error) {
			return tc.RiverRegistry.AllocateStream(opts, streamId, addrs, genesisHash, genesisMiniblock)
		},
	)
	require.Nil(tx1)
	require.Equal(Err_ALREADY_EXISTS, AsRiverError(err).Code)

	// Can't allocate with unknown node
	tx1, err = bc1.TxRunner.Submit(
		ctx,
		func(opts *bind.TransactOpts) (*types.Transaction, error) {
			return tc.RiverRegistry.AllocateStream(opts, StreamId{0x11, 0x22}, []common.Address{common.HexToAddress("0x123")}, genesisHash, genesisMiniblock)
		},
	)
	require.Nil(tx1)
	require.Equal(Err_CANNOT_CALL_CONTRACT, AsRiverError(err).Code)
}
