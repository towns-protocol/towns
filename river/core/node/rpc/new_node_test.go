package rpc_test

import (
	"context"
	"testing"

	"connectrpc.com/connect"
	"github.com/ethereum/go-ethereum/common"
	. "github.com/river-build/river/core/node/base"
	"github.com/river-build/river/core/node/contracts"
	"github.com/river-build/river/core/node/crypto"
	"github.com/river-build/river/core/node/dlog"
	. "github.com/river-build/river/core/node/protocol"
	"github.com/river-build/river/core/node/protocol/protocolconnect"
	. "github.com/river-build/river/core/node/shared"
	"github.com/river-build/river/core/node/testutils"
	"github.com/stretchr/testify/require"
)

func testCreate100Streams(
	ctx context.Context,
	require *require.Assertions,
	c protocolconnect.StreamServiceClient,
	streamSettings *StreamSettings,
) []StreamId {
	wallet, err := crypto.NewWallet(ctx)
	require.NoError(err)
	_, _, err = createUser(ctx, wallet, c, streamSettings)
	require.NoError(err)
	streamdIds := []StreamId{UserStreamIdFromAddr(wallet.Address)}
	for i := 0; i < 99; i++ {
		streamId := testutils.FakeStreamId(STREAM_SPACE_BIN)
		_, _, err = createSpace(ctx, wallet, c, streamId, streamSettings)
		require.NoError(err)
		streamdIds = append(streamdIds, streamId)
	}
	if streamSettings != nil && streamSettings.DisableMiniblockCreation {
		for _, streamId := range streamdIds {
			_, _, err := makeMiniblock(ctx, c, streamId, false, -1)
			require.NoError(err)
		}
	}
	return streamdIds
}

func TestAddingNewNodes(t *testing.T) {
	tester := newServiceTester(t, serviceTesterOpts{numNodes: 20})
	ctx := tester.ctx
	require := tester.require
	log := dlog.FromCtx(ctx)

	tester.initNodeRecords(0, 10, contracts.NodeStatus_Operational)
	tester.startNodes(0, 10)

	testMethodsWithClient(tester, tester.testClient(9))

	c0 := tester.testClient(0)
	streamdIds0 := testCreate100Streams(ctx, require, c0, nil)

	tester.initNodeRecords(10, 20, contracts.NodeStatus_NotInitialized)

	testMethodsWithClient(tester, tester.testClient(4))

	tester.startNodes(10, 20)
	tester.setNodesStatus(10, 20, contracts.NodeStatus_Operational)

	testMethodsWithClient(tester, tester.testClient(14))

	c1 := tester.testClient(18)
	streamdIds1 := testCreate100Streams(ctx, require, c1, nil)

	newNodes := make(map[common.Address]bool)
	for i := 10; i < 20; i++ {
		newNodes[tester.nodes[i].address] = true
	}
	// Read new streams through old client
	var oldNodeCount, newNodeCount int
	for _, streamId := range streamdIds1 {
		id := streamId[:]
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
	log.Info("Node count new streams through old client", "oldNodeCount", oldNodeCount, "newNodeCount", newNodeCount)
	require.NotZero(newNodeCount)
	require.NotZero(oldNodeCount)

	// Read old streams through new client
	oldNodeCount, newNodeCount = 0, 0
	for _, streamId := range streamdIds0 {
		id := streamId[:]
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
	log.Info("Node count old streams through new client", "oldNodeCount", oldNodeCount, "newNodeCount", newNodeCount)
	require.NotZero(oldNodeCount)
	require.Zero(newNodeCount)
}

func TestNoRecordNoStart(t *testing.T) {
	tester := newServiceTester(t, serviceTesterOpts{numNodes: 1})
	require := tester.require

	err := tester.startSingle(0)
	require.Error(err)
	require.Equal(Err_UNKNOWN_NODE, AsRiverError(err).Code)
}
