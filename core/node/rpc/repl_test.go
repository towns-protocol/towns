package rpc

import (
	"slices"
	"testing"
	"time"

	"connectrpc.com/connect"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/google/go-cmp/cmp"
	"github.com/stretchr/testify/assert"

	"github.com/towns-protocol/towns/core/contracts/river"
	"github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/crypto"
	. "github.com/towns-protocol/towns/core/node/events"
	"github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/rpc/headers"
	. "github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/testutils/testfmt"
)

func TestReplCreate(t *testing.T) {
	tt := newServiceTester(t, serviceTesterOpts{numNodes: 5, replicationFactor: 5, start: true})
	ctx := tt.ctx
	require := tt.require

	client := tt.testClient(2)

	wallet, err := crypto.NewWallet(ctx)
	require.NoError(err)
	streamId, _, _, err := createUserSettingsStream(
		ctx,
		wallet,
		client,
		nil,
	)
	require.NoError(err)

	tt.eventuallyCompareStreamDataInStorage(streamId, 1, 0)
}

func TestReplAdd(t *testing.T) {
	tt := newServiceTester(t, serviceTesterOpts{numNodes: 5, replicationFactor: 5, start: true})
	ctx := tt.ctx
	require := tt.require

	client := tt.testClient(2)

	wallet, err := crypto.NewWallet(ctx)
	require.NoError(err)
	streamId, cookie, _, err := createUserSettingsStream(
		ctx,
		wallet,
		client,
		&protocol.StreamSettings{
			DisableMiniblockCreation: true,
		},
	)
	require.NoError(err)

	require.NoError(addUserBlockedFillerEvent(ctx, wallet, client, streamId, MiniblockRefFromCookie(cookie)))

	tt.eventuallyCompareStreamDataInStorage(streamId, 1, 1)
}

func TestReplMiniblock(t *testing.T) {
	tt := newServiceTester(t, serviceTesterOpts{numNodes: 5, replicationFactor: 5, start: true})
	ctx := tt.ctx
	require := tt.require

	client := tt.testClient(2)

	wallet, err := crypto.NewWallet(ctx)
	require.NoError(err)
	streamId, cookie, _, err := createUserSettingsStream(
		ctx,
		wallet,
		client,
		&protocol.StreamSettings{
			DisableMiniblockCreation: true,
		},
	)
	require.NoError(err)

	for range 100 {
		require.NoError(addUserBlockedFillerEvent(ctx, wallet, client, streamId, MiniblockRefFromCookie(cookie)))
	}

	tt.eventuallyCompareStreamDataInStorage(streamId, 1, 100)

	mbRef, err := tt.nodes[0].service.cache.TestMakeMiniblock(ctx, streamId, false)
	require.NoError(err)
	require.EqualValues(1, mbRef.Num)
	tt.eventuallyCompareStreamDataInStorage(streamId, 2, 0)
}

// TestStreamReconciliation ensures that a node reconciles local streams on boot
// that were created when the node was down.
func TestStreamReconciliationFromGenesis(t *testing.T) {
	var (
		opts    = serviceTesterOpts{numNodes: 5, replicationFactor: 5, start: false}
		tt      = newServiceTester(t, opts)
		client  = tt.testClient(2)
		ctx     = tt.ctx
		require = tt.require
	)

	tt.initNodeRecords(0, opts.numNodes, river.NodeStatus_Operational)
	tt.startNodes(0, 4)

	wallet, err := crypto.NewWallet(ctx)
	require.NoError(err)

	// create a stream, add some events and create a bunch of mini-blocks for the node to catch up to
	streamId, cookie, _, err := createUserSettingsStream(
		ctx,
		wallet,
		client,
		&protocol.StreamSettings{
			DisableMiniblockCreation: true,
		},
	)
	require.NoError(err)

	// create a bunch of mini-blocks and store them in mbChain for later comparison
	N := 25
	mbChain := map[int64]common.Hash{0: common.BytesToHash(cookie.PrevMiniblockHash)}
	latestMbNum := int64(0)

	mbRef := MiniblockRefFromCookie(cookie)
	for i := range N {
		require.NoError(addUserBlockedFillerEvent(ctx, wallet, client, streamId, mbRef))
		mbRef, err = tt.nodes[2].service.cache.TestMakeMiniblock(ctx, streamId, false)
		require.NoError(err, "Failed to make miniblock on round %d", i)

		if mbChain[latestMbNum] != mbRef.Hash {
			latestMbNum = mbRef.Num
			mbChain[mbRef.Num] = mbRef.Hash
		} else {
			N += 1
		}
	}

	// wait till the mini-block is set in the streams registry before booting up last node
	require.Eventuallyf(func() bool {
		stream, err := tt.btc.StreamRegistry.GetStreamOnLatestBlock(ctx, streamId)
		require.NoError(err)
		return stream.LastMiniblockNum == uint64(latestMbNum)
	}, 10*time.Second, 100*time.Millisecond, "expected to receive latest miniblock")

	// start up last node that must reconcile and load the created stream on boot
	tt.startNodes(opts.numNodes-1, opts.numNodes)
	lastStartedNode := tt.nodes[opts.numNodes-1]

	// make sure that node loaded the stream and synced up its local database with the stream registry.
	// this happens as a background task, therefore wait till all mini-blocks are imported.
	var stream *Stream
	require.Eventuallyf(func() bool {
		stream, err = lastStartedNode.service.cache.GetStreamNoWait(ctx, streamId)
		if err == nil {
			if miniBlocks, _, err := stream.GetMiniblocks(ctx, 0, latestMbNum+1, true); err == nil {
				return len(miniBlocks) == len(mbChain)
			}
		}
		return false
	}, 10*time.Second, 100*time.Millisecond, "catching up with stream failed within reasonable time")

	// verify that loaded miniblocks match with blocks in expected mbChain
	miniBlocks, _, err := stream.GetMiniblocks(ctx, 0, latestMbNum+1, true)
	require.NoError(err, "unable to get mini-blocks")
	fetchedMbChain := make(map[int64]common.Hash)
	for i, blk := range miniBlocks {
		fetchedMbChain[int64(i)] = common.BytesToHash(blk.Proto.GetHeader().GetHash())
	}

	require.Equal(mbChain, fetchedMbChain, "unexpected mini-block chain")

	view, err := stream.GetView(ctx)
	require.NoError(err, "get view")
	require.Equal(latestMbNum, view.LastBlock().Ref.Num, "unexpected last mini-block num")
	require.Equal(mbChain[latestMbNum], view.LastBlock().Ref.Hash, "unexpected last mini-block hash")
}

// TestStreamReconciliationForKnownStreams ensures that a node reconciles local streams that it already knows
// but advanced when the node was down.
func TestStreamReconciliationForKnownStreams(t *testing.T) {
	var (
		opts    = serviceTesterOpts{numNodes: 5, replicationFactor: 5, start: true}
		tt      = newServiceTester(t, opts)
		client  = tt.testClient(2)
		ctx     = tt.ctx
		require = tt.require
	)

	wallet, err := crypto.NewWallet(ctx)
	require.NoError(err)

	// create a stream, add some events and create a bunch of mini-blocks for the node to catch up to
	streamId, cookie, _, err := createUserSettingsStream(
		ctx,
		wallet,
		client,
		&protocol.StreamSettings{
			DisableMiniblockCreation: true,
		},
	)
	require.NoError(err)

	// create a bunch of mini-blocks and store them in mbChain for later comparison
	N := 10
	mbChain := map[int64]common.Hash{0: common.BytesToHash(cookie.PrevMiniblockHash)}
	latestMbNum := int64(0)

	for range N {
		require.NoError(addUserBlockedFillerEvent(ctx, wallet, client, streamId, MiniblockRefFromCookie(cookie)))
		mbRef, err := tt.nodes[2].service.cache.TestMakeMiniblock(ctx, streamId, false)
		require.NoError(err)

		if mbChain[latestMbNum] != mbRef.Hash {
			latestMbNum = mbRef.Num
			mbChain[mbRef.Num] = mbRef.Hash
		} else {
			N += 1
		}
	}

	// ensure that the node we bring down has at least 1 mini-block for the test stream
	require.Eventuallyf(func() bool {
		stream, err := tt.nodes[opts.numNodes-1].service.cache.GetStreamNoWait(ctx, streamId)
		require.NoError(err)
		view, err := stream.GetView(ctx)
		require.NoError(err)
		return view.LastBlock().Ref.Num >= 1
	}, 20*time.Second, 100*time.Millisecond, "expected to receive latest miniblock")

	// bring node down
	nodeAddress := tt.nodes[opts.numNodes-1].address
	tt.nodes[opts.numNodes-1].address = common.Address{}
	tt.nodes[opts.numNodes-1].Close(ctx, tt.dbUrl)
	tt.nodes[opts.numNodes-1].address = nodeAddress

	// create extra mini-blocks
	N = 10
	for range N {
		require.NoError(addUserBlockedFillerEvent(ctx, wallet, client, streamId, &MiniblockRef{
			Hash: mbChain[latestMbNum],
			Num:  latestMbNum,
		}))
		mbRef, err := tt.nodes[2].service.cache.TestMakeMiniblock(ctx, streamId, false)
		require.NoError(err)

		if mbChain[latestMbNum] != mbRef.Hash {
			latestMbNum = mbRef.Num
			mbChain[mbRef.Num] = mbRef.Hash
		} else {
			N += 1
		}
	}

	// ensure that the stream has the new blocks
	require.Eventuallyf(func() bool {
		stream, err := tt.btc.StreamRegistry.GetStreamOnLatestBlock(ctx, streamId)
		require.NoError(err)
		return stream.LastMiniblockNum == uint64(latestMbNum)
	}, 20*time.Second, 100*time.Millisecond, "last miniblock not registered")

	require.NoError(tt.startSingle(len(tt.nodes) - 1))
	restartedNode := tt.nodes[opts.numNodes-1]

	_, err = restartedNode.service.cache.GetStreamWaitForLocal(ctx, streamId)
	require.NoError(err)

	// create a new instance of a stream cache for the last node and ensure that when it is created it syncs stream
	// that advanced several mini-blocks.
	streamCache := restartedNode.service.cache

	// wait till stream cache has finish reconciliation for the stream
	var (
		stream             *Stream
		receivedMiniblocks []*MiniblockInfo
	)

	// grab mini-blocks from node that is already up and running and ensure that the just restarted node has the
	// same miniblocks after it catches up.
	stream, err = tt.nodes[opts.numNodes-2].service.cache.GetStreamWaitForLocal(ctx, streamId)
	require.NoError(err)
	expectedMiniblocks, _, err := stream.GetMiniblocks(ctx, 0, latestMbNum+1, true)
	require.NoError(err)

	require.Eventuallyf(func() bool {
		syncStream, err := streamCache.GetStreamNoWait(ctx, streamId)
		if err != nil {
			return false
		}

		if receivedMiniblocks, _, err = syncStream.GetMiniblocks(ctx, 0, latestMbNum+1, true); err == nil {
			return len(receivedMiniblocks) == len(expectedMiniblocks)
		}
		return false
	}, 20*time.Second, 100*time.Millisecond, "expected to sync stream")

	// make sure that node loaded the stream and synced up its local database with the streams registry
	// miniBlocks, _, err := stream.GetMiniblocks(ctx, 0, latestMbNum+1)
	// require.NoError(err, "unable to get mini-blocks")
	fetchedMbChain := make(map[int64]common.Hash)
	for i, blk := range receivedMiniblocks {
		fetchedMbChain[int64(i)] = common.BytesToHash(blk.Proto.GetHeader().GetHash())
	}

	stream, err = streamCache.GetStreamNoWait(ctx, streamId)
	require.NoError(err)
	view, err := stream.GetView(ctx)
	require.NoError(err)

	require.Equal(mbChain, fetchedMbChain, "unexpected mini-block chain")
	require.Equal(latestMbNum, view.LastBlock().Ref.Num, "unexpected last mini-block num")
	require.Equal(mbChain[latestMbNum], view.LastBlock().Ref.Hash, "unexpected last mini-block hash")
}

func TestStreamAllocatedAcrossOperators(t *testing.T) {
	tt := newServiceTester(t, serviceTesterOpts{numNodes: 6, replicationFactor: 3, numOperators: 3, start: true})
	ctx := tt.ctx
	require := tt.require

	for i := range 10 {
		alice := tt.newTestClient(i%tt.opts.numNodes, testClientOpts{})
		cookie := alice.createUserStreamGetCookie()
		streamId, _ := StreamIdFromBytes(cookie.StreamId)

		node := tt.nodes[(i+5)%tt.opts.numNodes]
		stream, err := node.service.registryContract.StreamRegistry.GetStreamOnLatestBlock(ctx, streamId)
		require.NoError(err)
		require.Len(stream.Nodes, 3)

		operators := make(map[common.Address]bool)
		for _, nodeAddr := range stream.Nodes {
			n, err := node.service.nodeRegistry.GetNode(nodeAddr)
			require.NoError(err)
			require.False(operators[n.Operator()])
			operators[n.Operator()] = true
		}
		require.Len(operators, 3)
	}
}

// TestStreamReconciliationTaskRescheduling ensures that when a node isn't able to reconcile a stream because
// none of the stream nodes could provide the stream data, the node will reschedule the reconciliation task.
//
// Scenario:
// - create stream
// - updates the url endpoints of all nodes participating in the stream to an invalid unreachable url
// - adds a new node to the stream and ensure that it can't reconcile the stream within reasonable time
// - then restore the invalid endpoints and ensures that the node can reconcile the stream within reasonable time.
func TestStreamReconciliationTaskRescheduling(t *testing.T) {
	opts := serviceTesterOpts{numNodes: 5, replicationFactor: 3, start: false}
	tt := newServiceTester(t, opts)

	tt.initNodeRecords(0, opts.numNodes, river.NodeStatus_Operational)
	tt.startNodes(0, opts.numNodes)

	ctx := tt.ctx
	require := tt.require

	client := tt.testClient(2)

	wallet, err := crypto.NewWallet(ctx)
	require.NoError(err)

	// create a stream, add some events and create a bunch of mini-blocks for the node to catch up to
	streamId, cookie, _, err := createUserSettingsStream(
		ctx,
		wallet,
		client,
		&protocol.StreamSettings{DisableMiniblockCreation: true},
	)
	require.NoError(err)
	require.NotNil(cookie)

	testfmt.Printf(t, "created stream %s", streamId)

	// get stream record to determine which nodes are participating in the stream and which one are not
	stream, err := tt.btc.StreamRegistry.GetStreamOnLatestBlock(ctx, streamId)
	require.NoError(err)
	allNodes, err := tt.btc.NodeRegistry.GetAllNodes(nil)
	require.NoError(err)

	var (
		participatingNodes    []river.Node
		notParticipatingNodes []river.Node
	)

	for _, node := range allNodes {
		if slices.Contains(stream.Nodes, node.NodeAddress) {
			participatingNodes = append(participatingNodes, node)
		} else {
			notParticipatingNodes = append(notParticipatingNodes, node)
		}
	}

	// create a bunch of mini-blocks that needs to be synced
	mbRef := MiniblockRefFromCookie(cookie)
	mbMinterNode := tt.nodes[0]
	for _, node := range tt.nodes {
		if node.address == participatingNodes[0].NodeAddress {
			mbMinterNode = node
		}
	}

	for range 15 {
		require.NoError(addUserBlockedFillerEvent(ctx, wallet, client, streamId, mbRef))
		mbRef, err = mbMinterNode.service.cache.TestMakeMiniblock(ctx, streamId, false)
		require.NoError(err)
	}

	// update the node urls of the participating nodes to ensure that the node this stream will be newly
	// assigned to can't reconcile the stream because it can't reach any of the existing participating nodes.
	invalidURL := "http://localhost:0"
	participatingOrigUrls := make(map[common.Address]string)
	for _, node := range participatingNodes {
		index := -1
		for i, n := range tt.nodes {
			if n.address == node.NodeAddress {
				index = i
				participatingOrigUrls[n.address] = n.url
			}
		}

		if index != -1 {
			require.NoError(tt.btc.UpdateNodeUrl(ctx, index, invalidURL))
			testfmt.Printf(t, "invalidated node %s url to %s", node.NodeAddress, invalidURL)
		}
	}

	expNodesURLS := map[common.Address]string{
		participatingNodes[0].NodeAddress:    invalidURL,
		participatingNodes[1].NodeAddress:    invalidURL,
		participatingNodes[2].NodeAddress:    invalidURL,
		notParticipatingNodes[0].NodeAddress: notParticipatingNodes[0].Url,
		notParticipatingNodes[1].NodeAddress: notParticipatingNodes[1].Url,
	}

	// ensure that all nodes updated their local node registry with the new node urls
	tt.require.EventuallyWithT(func(collect *assert.CollectT) {
		for _, node := range tt.nodes {
			got := make(map[common.Address]string)

			for _, nodeRecord := range node.service.nodeRegistry.GetAllNodes() {
				got[nodeRecord.Address()] = nodeRecord.Url()
			}

			if !cmp.Equal(expNodesURLS, got) {
				collect.Errorf("expected node urls to be %v, got %v", expNodesURLS, got)
			}
		}
	}, 10*time.Second, 100*time.Millisecond)

	// mark the first node that isn't participating as a sync node in the stream registry forcing it to reconcile
	// the stream. This should fail because the node can't reach any of the participating nodes due to an invalid
	// node url.
	newlyAssignedNodeRecord := notParticipatingNodes[0]
	newlyAssignedNode := tt.nodes[slices.IndexFunc(tt.nodes, func(record *testNodeRecord) bool {
		return record.address == newlyAssignedNodeRecord.NodeAddress
	})]

	pendingTx, err := tt.btc.DeployerBlockchain.TxPool.SubmitTx(
		tt.ctx,
		"SetStreamReplicationFactor",
		tt.btc.StreamRegistry.BoundContract,
		func() ([]byte, error) {
			nodeNodeSet := append(stream.Nodes, newlyAssignedNodeRecord.NodeAddress)
			return river.StreamRegistry.TryPackSetStreamReplicationFactor([]river.SetStreamReplicationFactor{
				{
					StreamId:          streamId,
					Nodes:             nodeNodeSet,
					ReplicationFactor: uint8(len(stream.Nodes)),
				},
			})
		})

	require.NoError(err)
	receipt, err := pendingTx.Wait(tt.ctx)
	require.NoError(err)
	require.Equal(types.ReceiptStatusSuccessful, receipt.Status, "failed to set stream replication factor")

	getStream, err := tt.btc.StreamRegistry.GetStreamOnLatestBlock(ctx, streamId)
	tt.require.NoError(err)
	testfmt.Printf(t, "getStream: %d", getStream.LastMiniblockNum)

	// ensure that the node can't reconcile the stream
	tt.require.Never(func() bool {
		_, err := newlyAssignedNode.service.storage.GetLastMiniblockNumber(ctx, streamId)
		return !base.IsRiverErrorCode(err, protocol.Err_NOT_FOUND)
	}, 5*time.Second, 50*time.Millisecond)

	// restore node endpoints and ensure that the newly added node can reconcile the stream
	for nodeAddr, origURL := range participatingOrigUrls {
		for index, n := range tt.nodes {
			if n.address == nodeAddr {
				require.NoError(tt.btc.UpdateNodeUrl(ctx, index, origURL))
				testfmt.Printf(t, "restored node %s url to %s", nodeAddr, origURL)
			}
		}
	}

	// ensure that the stream is able to reconcile the stream now it can connect to the participating nodes.
	expMbNum := int64(getStream.LastMiniblockNum)
	tt.require.EventuallyWithT(func(collect *assert.CollectT) {
		mbNum, err := newlyAssignedNode.service.storage.GetLastMiniblockNumber(ctx, streamId)
		if err != nil {
			collect.Errorf("failed to get last miniblock number: %v", err)
		}
		if mbNum != expMbNum {
			collect.Errorf("mb num %d != exp mbnum %d", mbNum, expMbNum)
		}
		testfmt.Printf(t, "%s@%s) mb num %d", streamId, newlyAssignedNode.address, mbNum)
	}, 30*time.Second, 250*time.Millisecond, "Unable to reconcile stream")
}

// TestStreamReconciliationFromRegistryGenesisBlock tests stream reconciliation when the stream
// hasn't moved beyond the genesis block. This is a special case because the node must reconcile
// the stream from the stream registry instead of a peer.
func TestStreamReconciliationFromRegistryGenesisBlock(t *testing.T) {
	tt := newServiceTester(t, serviceTesterOpts{numNodes: 3, replicationFactor: 1, start: true})
	require := tt.require

	alice := tt.newTestClient(0, testClientOpts{})
	_ = alice.createUserStream()
	spaceId, _ := alice.createSpace()
	channelId, channelMbRef, _ := alice.createChannel(spaceId)

	streamWithGenesis, _, genesisBlock, err := tt.btc.StreamRegistry.GetStreamWithGenesis(tt.ctx, channelId, 0)
	require.NoError(err)
	require.EqualValues(0, streamWithGenesis.LastMiniblockNum)
	require.True(len(genesisBlock) > 0)
	require.Equal(1, len(streamWithGenesis.Nodes))

	// assign the stream to a new node that will reconcile the stream from the stream record in the stream registry.
	newNode := tt.nodes[0]
	if newNode.address == streamWithGenesis.Nodes[0] {
		newNode = tt.nodes[1]
	}

	// mark the new node as a sync node to ensure that it will schedule a reconciliation task for the stream
	tt.btc.SetStreamReplicationFactor(
		t,
		tt.ctx,
		[]river.SetStreamReplicationFactor{
			{StreamId: channelId, Nodes: append(streamWithGenesis.Nodes, newNode.address), ReplicationFactor: uint8(1)},
		},
	)

	// ensure that the new node reconciles the stream from the genesis block in the stream registry
	require.EventuallyWithT(func(collect *assert.CollectT) {
		request := connect.NewRequest(&protocol.GetMiniblocksRequest{
			StreamId:      channelId[:],
			FromInclusive: 0,
			ToExclusive:   10,
		})

		request.Header().Set(headers.RiverNoForwardHeader, headers.RiverHeaderTrueValue)
		request.Header().Set(headers.RiverAllowNoQuorumHeader, headers.RiverHeaderTrueValue)

		response, err := newNode.service.GetMiniblocks(tt.ctx, request)
		if err != nil {
			collect.Errorf("failed to get miniblocks: %v", err)
			return
		}

		miniblocks := response.Msg.GetMiniblocks()
		if len(miniblocks) != 1 {
			collect.Errorf("expected to get 1 miniblock, got %d", len(miniblocks))
			return
		}

		genesisBlock, err := NewMiniblockInfoFromProto(
			miniblocks[0], response.Msg.GetMiniblockSnapshot(0),
			NewParsedMiniblockInfoOpts().
				WithExpectedBlockNumber(0),
		)
		if err != nil {
			t.Errorf("unable to parse genesis miniblock %v", err)
			return
		}

		if channelMbRef.Hash != genesisBlock.Ref.Hash {
			t.Errorf("unexpected genesis miniblock ref, expected %s, got %s", channelMbRef, genesisBlock.Ref)
		}
	}, 20*time.Second, 100*time.Millisecond, "expected to get stream from new node")
}
