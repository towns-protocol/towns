package rpc_test

import (
	"fmt"
	"testing"

	"connectrpc.com/connect"
	"github.com/ethereum/go-ethereum/common"
	. "github.com/river-build/river/core/node/base"
	"github.com/river-build/river/core/node/contracts"
	"github.com/river-build/river/core/node/crypto"
	. "github.com/river-build/river/core/node/protocol"
	. "github.com/river-build/river/core/node/shared"
	"github.com/river-build/river/core/node/testutils"
	"github.com/stretchr/testify/require"
)

func TestAddingNewNodes(t *testing.T) {
	require := require.New(t)
	tester := newServiceTester(20, require)
	defer tester.Close()
	ctx := tester.ctx

	tester.initNodeRecords(0, 10, contracts.NodeStatus_Operational)
	tester.startNodes(0, 10)

	testMethods(t, tester.testClient(9), tester.nodes[9].url)

	c0 := tester.testClient(0)

	// Create 100 streams
	bobWallet, err := crypto.NewWallet(ctx)
	require.NoError(err)
	_, _, err = createUser(ctx, bobWallet, c0)
	require.NoError(err)
	var streamdIds0 []StreamId
	for i := 0; i < 100; i++ {
		streamId := testutils.FakeStreamId(STREAM_SPACE_BIN)
		_, _, err = createSpace(ctx, bobWallet, c0, streamId)
		require.NoError(err)
		streamdIds0 = append(streamdIds0, streamId)
	}

	tester.initNodeRecords(10, 20, contracts.NodeStatus_NotInitialized)

	testMethods(t, tester.testClient(4), tester.nodes[4].url)

	tester.startNodes(10, 20)
	tester.setNodesStatus(10, 20, contracts.NodeStatus_Operational)

	testMethods(t, tester.testClient(14), tester.nodes[14].url)

	c1 := tester.testClient(18)

	// Create 100 streams
	aliceWallet, err := crypto.NewWallet(ctx)
	require.NoError(err)
	_, _, err = createUser(ctx, aliceWallet, c1)
	require.NoError(err)
	var streamdIds1 []StreamId
	for i := 0; i < 100; i++ {
		streamId := testutils.FakeStreamId(STREAM_SPACE_BIN)
		_, _, err = createSpace(ctx, aliceWallet, c1, streamId)
		require.NoError(err)
		streamdIds1 = append(streamdIds1, streamId)
	}

	newNodes := make(map[common.Address]bool)
	for i := 10; i < 20; i++ {
		newNodes[tester.nodes[i].address] = true
	}
	// Read new streams through old client
	var oldNodeCount, newNodeCount int
	for _, streamId := range streamdIds1 {
		id := streamId.Bytes()
		r, err := c0.GetStream(ctx, connect.NewRequest(&GetStreamRequest{
			StreamId: id,
		}))
		require.NoError(err)
		require.NotNil(r)
		require.Equal(id, r.Msg.Stream.NextSyncCookie.StreamId)
		if newNodes[common.BytesToAddress(r.Msg.Stream.NextSyncCookie.NodeAddress)] {
			newNodeCount++
		} else {
			oldNodeCount++
		}
	}
	fmt.Println("oldNodeCount", oldNodeCount, "newNodeCount", newNodeCount)
	require.NotZero(newNodeCount)
	require.NotZero(oldNodeCount)

	// Read old streams through new client
	oldNodeCount, newNodeCount = 0, 0
	for _, streamId := range streamdIds0 {
		id := streamId.Bytes()
		r, err := c1.GetStream(ctx, connect.NewRequest(&GetStreamRequest{
			StreamId: id,
		}))
		require.NoError(err)
		require.NotNil(r)
		require.Equal(id, r.Msg.Stream.NextSyncCookie.StreamId)
		if newNodes[common.BytesToAddress(r.Msg.Stream.NextSyncCookie.NodeAddress)] {
			newNodeCount++
		} else {
			oldNodeCount++
		}
	}
	fmt.Println("oldNodeCount", oldNodeCount, "newNodeCount", newNodeCount)
	require.NotZero(oldNodeCount)
	require.Zero(newNodeCount)
}

func TestNoRecordNoStart(t *testing.T) {
	require := require.New(t)
	tester := newServiceTester(1, require)
	defer tester.Close()

	err := tester.startSingle(0)
	require.Error(err)
	require.Equal(Err_UNKNOWN_NODE, AsRiverError(err).Code)
}
