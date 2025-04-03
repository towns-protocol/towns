package rpc

import (
	"context"
	"fmt"
	"slices"
	"testing"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/towns-protocol/towns/core/contracts/river"
	"github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/crypto"
	"github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/testutils/testfmt"
)

// eventuallyForAllNodesWithT is a helper function that ensures that a test eventually
// is true for all nodes in tt.nodes.
func eventuallyForAllNodesWithT(
	tt *serviceTester,
	testFunc func(c *assert.CollectT, node *testNodeRecord),
) {
	tt.require.EventuallyWithT(func(c *assert.CollectT) {
		for _, node := range tt.nodes {
			testFunc(c, node)
		}
	}, time.Second*20, time.Millisecond*100)
}

// randomPlacementNodes is a helper functiont to calculate the new set of nodes to place the stream on.
// it guarantees that the existing nodes the stream is placed on are part of the streams quorum set of nodes.
func randomPlacementNodes(
	t *testing.T,
	tt *serviceTester,
	channelId shared.StreamId,
	initialReplFactor int,
	newReplicationFactor int,
) []common.Address {
	stream, err := tt.btc.StreamRegistry.GetStream(nil, channelId)
	require.NoError(t, err)
	placementNodeAddresses := slices.Clone(stream.Nodes[:initialReplFactor])

	for _, node := range tt.nodes {
		if len(placementNodeAddresses) == newReplicationFactor {
			break
		}
		if !slices.Contains(placementNodeAddresses, node.address) {
			placementNodeAddresses = append(placementNodeAddresses, node.address)
		}
	}
	return placementNodeAddresses
}

// TestStreamPlacementUpdated runs the suite of tests related to stream replacement on nodes.
func TestStreamPlacementUpdated(t *testing.T) {
	t.Parallel()

	t.Run("ReplacedNodes", testStreamPlacedOnNodes)
	t.Run("ColdStream", testColdStreamPlacementUpdate)
	t.Run("HotStream", testHotStreamPlacementUpdate)
}

// testStreamPlacedOnNodes tests that when a stream is placed on extra nodes that these nodes
// integrate the stream into their stream cache and storage.
func testStreamPlacedOnNodes(t *testing.T) {
	const initialReplFactor = 1
	tt := newServiceTester(
		t,
		serviceTesterOpts{numNodes: 5, replicationFactor: initialReplFactor, start: true, btcParams: &crypto.TestParams{
			AutoMine: true,
		}},
	)

	alice := tt.newTestClient(0, testClientOpts{})
	_ = alice.createUserStream()
	spaceId, _ := alice.createSpace()
	channelId, _, _ := alice.createChannel(spaceId)

	// tests that the stream channelId eventually is replicated over the nodes consistently
	eventuallyStreamReplicatedOverNodes := func() {
		stream, err := tt.btc.StreamRegistry.GetStream(nil, channelId)
		require.NoError(t, err)

		streamReplFactor := stream.StreamReplicationFactor()
		quorumNodes := stream.Nodes[:streamReplFactor]
		syncNodes := stream.Nodes[streamReplFactor:]

		// ensure that nodes that take part in stream quorum have the stream in
		// their stream cache and storage
		eventuallyForAllNodesWithT(tt, func(c *assert.CollectT, node *testNodeRecord) {
			takesPartInQuorum := slices.Contains(quorumNodes, node.address)
			if takesPartInQuorum {
				stream, err := node.service.cache.GetStreamNoWait(tt.ctx, channelId)
				require.NoError(c, err)

				require.EqualValues(c, quorumNodes, stream.GetQuorumNodes(), "quorum nodes mismatch in quorum node")
				require.EqualValues(c, syncNodes, stream.GetSyncNodes(), "sync nodes mismatch in quorum node")
			}
		})

		// ensure that nodes that sync the node have it in their stream cache and storage
		eventuallyForAllNodesWithT(tt, func(c *assert.CollectT, node *testNodeRecord) {
			syncsStream := slices.Contains(syncNodes, node.address)
			if syncsStream {
				stream, err := node.service.cache.GetStreamNoWait(tt.ctx, channelId)
				require.NoError(c, err)

				require.EqualValues(
					c,
					quorumNodes,
					stream.GetQuorumNodes(),
					"quorum nodes mismatch in sync streams test",
				)
				require.EqualValues(c, syncNodes, stream.GetSyncNodes(), "sync nodes mismatch in sync streams test")
			}
		})

		// ensure that nodes that don't take part in stream quorum nor sync the stream don't
		// have it in their stream cache and storage
		eventuallyForAllNodesWithT(tt, func(c *assert.CollectT, node *testNodeRecord) {
			streamPlacedOnNode := slices.Contains(stream.Nodes, node.address)
			if !streamPlacedOnNode {
				stream, err := node.service.cache.GetStreamNoWait(tt.ctx, channelId)
				require.NoError(c, err)

				require.EqualValues(c, quorumNodes, stream.GetQuorumNodes(), "quorum nodes mismatch in unplaced node")
				require.EqualValues(c, syncNodes, stream.GetSyncNodes(), "sync nodes mismatch in unplaced node")

				view, err := stream.GetViewIfLocal(tt.ctx)
				require.NoError(c, err)
				require.Nil(c, view)
			}
		})
	}

	eventuallyStreamReplicatedOverNodes()

	// place stream on replicationFactor nodes and ensure that stream is quorum and sync replicated
	const newReplicationFactor = 3
	placementNodeAddresses := randomPlacementNodes(t, tt, channelId, initialReplFactor, newReplicationFactor)

	tt.btc.SetStreamReplicationFactor(
		t,
		tt.ctx,
		[]river.SetStreamReplicationFactor{
			{StreamId: channelId, Nodes: placementNodeAddresses, ReplicationFactor: uint8(len(placementNodeAddresses))},
		},
	)

	eventuallyStreamReplicatedOverNodes()
}

// testColdStreamPlacementUpdate ensures that nodes bring their local state in the expected
// state when a stream that isn't receiving events anymore is migrated to a different set of nodes.
func testColdStreamPlacementUpdate(t *testing.T) {
	const nonReplFactor = 1
	const replReplicationFactor = 2

	tt := newServiceTester(
		t,
		serviceTesterOpts{numNodes: 2 * replReplicationFactor, start: true, btcParams: &crypto.TestParams{
			AutoMine: true,
		}},
	)

	// create a stream to migrate and ensure it has several miniblocks
	alice := tt.newTestClient(0, testClientOpts{})
	_ = alice.createUserStream()
	spaceId, _ := alice.createSpace()
	channelId, _, _ := alice.createChannel(spaceId)

	// get the node on which the stream is placed
	stream, err := tt.btc.StreamRegistry.GetStream(nil, channelId)
	require.NoError(t, err)

	var initialNonReplNode *testNodeRecord
	for _, node := range tt.nodes {
		if node.address == stream.Nodes[0] {
			initialNonReplNode = node
		}
	}

	// create several miniblocks
	tt.require.Eventually(func() bool {
		alice.say(channelId, "hello from Alice")
		stream, err := tt.btc.StreamRegistry.GetStream(nil, channelId)
		tt.require.NoError(err)
		return stream.LastMiniblockNum > 5
	}, time.Second*10, time.Millisecond*100)

	// make sure stream becomes cold
	stream, err = tt.btc.StreamRegistry.GetStream(nil, channelId)
	require.NoError(t, err)

	lastMiniblockNumUpdate := time.Now()
	lastMiniblockNum := stream.LastMiniblockNum

	tt.require.Eventually(func() bool {
		stream, err = tt.btc.StreamRegistry.GetStream(nil, channelId)
		tt.require.NoError(err)
		if stream.LastMiniblockNum > lastMiniblockNum {
			lastMiniblockNum = stream.LastMiniblockNum
			lastMiniblockNumUpdate = time.Now()
		}

		localStream, err := initialNonReplNode.service.cache.GetStreamNoWait(tt.ctx, channelId)
		tt.require.NoError(err)
		view, err := localStream.GetViewIfLocal(tt.ctx)
		tt.require.NoError(err)

		return time.Since(lastMiniblockNumUpdate) > 5*time.Second && len(view.MinipoolEvents()) == 0
	}, time.Second*20, time.Millisecond*100)

	testfmt.Logf(t, "stream %s is cold at miniblock %d", channelId, lastMiniblockNum)

	// migrate stream to replFactor nodes and ensure that all nodes bring their local state in the expected state
	replicatedNodesAddrs := randomPlacementNodes(t, tt, channelId, nonReplFactor, replReplicationFactor)
	testfmt.Logf(t, "migrate stream %s from %v to %v", channelId, initialNonReplNode.address, replicatedNodesAddrs)

	// initiate migration to replFactor nodes
	tt.btc.SetStreamReplicationFactor(
		t,
		tt.ctx,
		[]river.SetStreamReplicationFactor{
			{StreamId: channelId, Nodes: replicatedNodesAddrs, ReplicationFactor: uint8(1)},
		},
	)

	// make sure that all nodes brought their local state in the expected state
	eventuallyForAllNodesWithT(tt, func(c *assert.CollectT, node *testNodeRecord) {
		partOfStream := slices.Contains(replicatedNodesAddrs, node.address)
		if partOfStream {
			storedMiniblockNum, err := node.service.storage.GetLastMiniblockNumber(tt.ctx, channelId)
			require.NoError(c, err)
			require.EqualValues(c, lastMiniblockNum, storedMiniblockNum)
		} else {
			// ensure that node dropped the stream from storage
			_, err := node.service.storage.GetLastMiniblockNumber(tt.ctx, channelId)
			var riverErr *base.RiverErrorImpl
			require.ErrorAs(c, err, &riverErr)
			require.EqualValues(c, protocol.Err_NOT_FOUND, riverErr.Code)
		}
	})
}

// testHotStreamPlacementUpdate ensures that nodes bring their local state in the expected
// state when a stream that is still receiving events is migrated to a different set of nodes.
func testHotStreamPlacementUpdate(t *testing.T) {
	const nonReplFactor = 1
	const replReplicationFactor = 3

	tt := newServiceTester(
		t,
		serviceTesterOpts{numNodes: 2 * replReplicationFactor, start: true, btcParams: &crypto.TestParams{
			AutoMine: true,
		}},
	)

	// create a stream to migrate and ensure it has several miniblocks
	alice := tt.newTestClient(0, testClientOpts{})
	_ = alice.createUserStream()
	spaceId, _ := alice.createSpace()
	channelId, _, _ := alice.createChannel(spaceId)

	stream, err := tt.btc.StreamRegistry.GetStream(nil, channelId)
	tt.require.NoError(err)

	initialNodeAddress := stream.Nodes[0]

	// keep adding events to the stream to ensure it is hot/active
	atLeastMBNum := stream.LastMiniblockNum + 20
	mbProdCtx, mbProdCancel := context.WithCancel(tt.ctx)
	mbProdDone := make(chan struct{})
	go func() {
		for i := 1; true; i++ {
			select {
			case <-time.After(50 * time.Millisecond):
				stream, err := tt.btc.StreamRegistry.GetStream(nil, channelId)
				tt.require.NoError(err)
				if stream.LastMiniblockNum >= atLeastMBNum+10 { // produced enough miniblocks
					return
				}

				alice.say(channelId, fmt.Sprintf("hello from Alice %d times", i))
			case <-mbProdCtx.Done():
				close(mbProdDone)
				return
			}
		}
	}()

	// place stream on extra nodes
	replicatedNodesAddrs := randomPlacementNodes(t, tt, channelId, nonReplFactor, replReplicationFactor)
	tt.btc.SetStreamReplicationFactor(
		t,
		tt.ctx,
		[]river.SetStreamReplicationFactor{
			{StreamId: channelId, Nodes: replicatedNodesAddrs, ReplicationFactor: uint8(1)},
		},
	)

	testfmt.Logf(t, "stream %s migrated from node %s to nodes %v", channelId, initialNodeAddress, replicatedNodesAddrs)

	// make sure that nodes participating in the stream sync the stream into their local storage and cache
	eventuallyForAllNodesWithT(tt, func(c *assert.CollectT, node *testNodeRecord) {
		stream, err := tt.btc.StreamRegistry.GetStream(nil, channelId)
		require.NoError(c, err)
		require.EqualValues(c, len(replicatedNodesAddrs), len(stream.Nodes))

		// make sure that stream has progressed enough to be considered hot
		require.GreaterOrEqual(c, stream.LastMiniblockNum, atLeastMBNum)

		participatesInStream := slices.Contains(replicatedNodesAddrs, node.address)
		if participatesInStream {
			// make sure cache is up to date
			stream, err := node.service.cache.GetStreamNoWait(tt.ctx, channelId)
			require.NoError(c, err)
			require.Truef(c, stream.IsLocal(), "node %s is not local for stream %s", node.address, channelId)

			view, err := stream.GetViewIfLocal(tt.ctx)
			require.NoErrorf(c, err, "node %s can't fetch view for stream %s", node.address, channelId)
			require.NotNilf(c, view, "node %s has no view for stream %s", node.address, channelId)
			require.GreaterOrEqualf(
				c,
				view.GetStats().LastMiniblockNum,
				int64(atLeastMBNum),
				"node %s has outdated view for stream %s",
				node.address,
				channelId,
			)

			// make sure storage is up to date
			storedMiniblockNum, err := node.service.storage.GetLastMiniblockNumber(tt.ctx, channelId)
			require.NoError(c, err)

			require.GreaterOrEqualf(
				c,
				storedMiniblockNum,
				int64(atLeastMBNum),
				"node %s not synced to at least %d",
				node.address,
				atLeastMBNum,
			)
		} else {
			stream, err := node.service.cache.GetStreamNoWait(tt.ctx, channelId)
			require.NoError(c, err)

			view, err := stream.GetViewIfLocal(tt.ctx)
			require.NoError(c, err)
			require.Nil(c, view)
		}
	})

	mbProdCancel()
	<-mbProdDone
}
