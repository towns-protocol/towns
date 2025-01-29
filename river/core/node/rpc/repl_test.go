package rpc

import (
	"testing"
	"time"

	"github.com/ethereum/go-ethereum/common"

	"github.com/river-build/river/core/contracts/river"
	"github.com/river-build/river/core/node/crypto"
	. "github.com/river-build/river/core/node/events"
	"github.com/river-build/river/core/node/protocol"
	. "github.com/river-build/river/core/node/shared"
	"github.com/river-build/river/core/node/testutils"
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
	testutils.SkipFlackyTest(t)

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

	mbRef, err := tt.nodes[0].service.mbProducer.TestMakeMiniblock(ctx, streamId, false)
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
		mbRef, err = tt.nodes[2].service.mbProducer.TestMakeMiniblock(ctx, streamId, false)
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
		stream, err := tt.btc.StreamRegistry.GetStream(nil, streamId)
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
			if miniBlocks, _, err := stream.GetMiniblocks(ctx, 0, latestMbNum+1); err == nil {
				return len(miniBlocks) == len(mbChain)
			}
		}
		return false
	}, 10*time.Second, 100*time.Millisecond, "catching up with stream failed within reasonable time")

	// verify that loaded miniblocks match with blocks in expected mbChain
	miniBlocks, _, err := stream.GetMiniblocks(ctx, 0, latestMbNum+1)
	require.NoError(err, "unable to get mini-blocks")
	fetchedMbChain := make(map[int64]common.Hash)
	for i, blk := range miniBlocks {
		fetchedMbChain[int64(i)] = common.BytesToHash(blk.GetHeader().GetHash())
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
	//	t.Skip("SKIPPED: TODO: REPLICATION: fix")

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
		mbRef, err := tt.nodes[2].service.mbProducer.TestMakeMiniblock(ctx, streamId, false)
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
		mbRef, err := tt.nodes[2].service.mbProducer.TestMakeMiniblock(ctx, streamId, false)
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
		stream, err := tt.btc.StreamRegistry.GetStream(nil, streamId)
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
		receivedMiniblocks []*protocol.Miniblock
	)

	// grab mini-blocks from node that is already up and running and ensure that the just restarted node has the
	// same miniblocks after it catches up.
	stream, err = tt.nodes[opts.numNodes-2].service.cache.GetStreamWaitForLocal(ctx, streamId)
	require.NoError(err)
	expectedMiniblocks, _, err := stream.GetMiniblocks(ctx, 0, latestMbNum+1)
	require.NoError(err)

	require.Eventuallyf(func() bool {
		syncStream, err := streamCache.GetStreamNoWait(ctx, streamId)
		if err != nil {
			return false
		}

		if receivedMiniblocks, _, err = syncStream.GetMiniblocks(ctx, 0, latestMbNum+1); err == nil {
			return len(receivedMiniblocks) == len(expectedMiniblocks)
		}
		return false
	}, 20*time.Second, 100*time.Millisecond, "expected to sync stream")

	// make sure that node loaded the stream and synced up its local database with the streams registry
	// miniBlocks, _, err := stream.GetMiniblocks(ctx, 0, latestMbNum+1)
	// require.NoError(err, "unable to get mini-blocks")
	fetchedMbChain := make(map[int64]common.Hash)
	for i, blk := range receivedMiniblocks {
		fetchedMbChain[int64(i)] = common.BytesToHash(blk.GetHeader().GetHash())
	}

	stream, err = streamCache.GetStreamNoWait(ctx, streamId)
	require.NoError(err)
	view, err := stream.GetView(ctx)
	require.NoError(err)

	require.Equal(mbChain, fetchedMbChain, "unexpected mini-block chain")
	require.Equal(latestMbNum, view.LastBlock().Ref.Num, "unexpected last mini-block num")
	require.Equal(mbChain[latestMbNum], view.LastBlock().Ref.Hash, "unexpected last mini-block hash")
}
