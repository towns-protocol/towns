package events

import (
	"context"
	"fmt"
	"slices"
	"testing"

	"github.com/ethereum/go-ethereum/common"
	"github.com/stretchr/testify/assert"
	"google.golang.org/protobuf/proto"

	"github.com/towns-protocol/towns/core/config"
	"github.com/towns-protocol/towns/core/contracts/river"
	. "github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/crypto"
	. "github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/storage"
	"github.com/towns-protocol/towns/core/node/testutils"
	"github.com/towns-protocol/towns/core/node/testutils/testfmt"
)

func TestReconciler(t *testing.T) {
	cfg := config.GetDefaultConfig()
	cfg.StreamReconciliation.InitialWorkerPoolSize = 0
	cfg.StreamReconciliation.OnlineWorkerPoolSize = 0
	cfg.StreamReconciliation.GetMiniblocksPageSize = 8

	ctx, tc := makeCacheTestContext(
		t,
		testParams{
			config:                           cfg,
			replFactor:                       3,
			numInstances:                     3,
			disableStreamCacheCallbacks:      true,
			recencyConstraintsGenerations:    5,
			backwardsReconciliationThreshold: ptrUint64(20),
		},
	)
	require := tc.require

	tc.initCache(0, &MiniblockProducerOpts{TestDisableMbProdcutionOnBlock: true})
	tc.initCache(1, &MiniblockProducerOpts{TestDisableMbProdcutionOnBlock: true})

	streamId, streamNodes, prevMb := tc.allocateStream()

	// Sanity check: since worker pools and callback are disabled, there should be no streams in cache yet.
	for _, inst := range tc.instances[0:2] {
		_, ok := inst.cache.cache.Load(streamId)
		require.False(ok)
	}

	nodesWithStream := streamNodes[0:2]
	stream, err := tc.instances[0].cache.getStreamImpl(ctx, streamId, true)
	require.NoError(err)
	require.NotNil(stream)

	for range 52 {
		tc.addReplEvent(streamId, prevMb, nodesWithStream)
		prevMb = tc.makeMiniblockNoCallbacks(nodesWithStream, streamId, false)
	}

	// Add event to minipool, do not produce miniblock
	tc.addReplEvent(streamId, prevMb, nodesWithStream)

	tc.initCache(2, &MiniblockProducerOpts{TestDisableMbProdcutionOnBlock: true})

	// Sanity check: since worker pools and callback are disabled, last node should not have stream in cache still.
	inst := tc.instances[2]
	_, ok := inst.cache.cache.Load(streamId)
	require.False(ok)

	blockNum, err := inst.cache.params.Registry.Blockchain.GetBlockNumber(ctx)
	require.NoError(err)

	recordNoId, err := inst.cache.params.Registry.StreamRegistry.GetStreamOnBlock(ctx, streamId, blockNum)
	require.NoError(err)
	require.NotNil(recordNoId)
	record := river.NewStreamWithId(streamId, recordNoId)

	stream = inst.cache.insertEmptyLocalStream(record, blockNum, false)

	reconciler := newStreamReconciler(inst.cache, stream, record)
	err = reconciler.reconcile()
	require.NoError(err)
	testfmt.Logf(t, "Reconciler stats: %+v", reconciler.stats)
	require.True(reconciler.notFound)
	require.False(reconciler.stats.forwardCalled)
	require.True(reconciler.stats.backwardCalled)
	require.True(reconciler.stats.backfillCalled)
	require.Greater(reconciler.stats.backfillPagesSucceeded, 1)
	require.Equal(reconciler.stats.backfillPagesAttempted, reconciler.stats.backfillPagesSucceeded)
	require.Equal(reconciler.stats.forwardPagesAttempted, reconciler.stats.forwardPagesSucceeded)
	require.Equal(reconciler.stats.reinitializeAttempted, reconciler.stats.reinitializeSucceeded)

	stream, ok = tc.instances[2].cache.cache.Load(streamId)
	require.True(ok)
	view, _ := stream.tryGetView(false)
	require.NotNil(view)
	require.Equal(prevMb.Num, view.LastBlock().Ref.Num)

	testfmt.Logf(t, "Last block: %+v", view.LastBlock().Ref)

	// Add more events
	for range 10 {
		tc.addReplEvent(streamId, prevMb, streamNodes)
		prevMb = tc.makeMiniblockNoCallbacks(streamNodes, streamId, false)
	}
	tc.addReplEvent(streamId, prevMb, streamNodes)

	tc.compareStreamStorage(streamNodes, streamId, 0, true)
}

// When the gap to the expected last miniblock is small (<= threshold),
// reconciliation should go forward and then run a gap backfill pass.
func TestReconciler_SmallGapForward(t *testing.T) {
	cfg := config.GetDefaultConfig()
	cfg.StreamReconciliation.InitialWorkerPoolSize = 0
	cfg.StreamReconciliation.OnlineWorkerPoolSize = 0
	cfg.StreamReconciliation.GetMiniblocksPageSize = 8

	ctx, tc := makeCacheTestContext(
		t,
		testParams{
			config:                           cfg,
			replFactor:                       3,
			numInstances:                     3,
			disableStreamCacheCallbacks:      true,
			recencyConstraintsGenerations:    5,
			backwardsReconciliationThreshold: ptrUint64(20), // enable backward logic, but keep gap small
		},
	)
	require := tc.require

	// Initialize two replicas that will have the data
	tc.initCache(0, &MiniblockProducerOpts{TestDisableMbProdcutionOnBlock: true})
	tc.initCache(1, &MiniblockProducerOpts{TestDisableMbProdcutionOnBlock: true})

	streamId, streamNodes, prevMb := tc.allocateStream()
	nodesWithStream := streamNodes[0:2]

	// Produce a small number of miniblocks (gap from -1 to N where N+1 <= threshold)
	for range 6 { // creates 6 additional miniblocks (delta = 7 from -1 to 6)
		tc.addReplEvent(streamId, prevMb, nodesWithStream)
		prevMb = tc.makeMiniblockNoCallbacks(nodesWithStream, streamId, false)
	}
	// Add event to minipool, do not produce miniblock yet
	tc.addReplEvent(streamId, prevMb, nodesWithStream)

	// Initialize the third replica which is missing the stream locally
	tc.initCache(2, &MiniblockProducerOpts{TestDisableMbProdcutionOnBlock: true})
	inst := tc.instances[2]

	blockNum, err := inst.cache.params.Registry.Blockchain.GetBlockNumber(ctx)
	require.NoError(err)
	recordNoId, err := inst.cache.params.Registry.StreamRegistry.GetStreamOnBlock(ctx, streamId, blockNum)
	require.NoError(err)
	require.NotNil(recordNoId)
	record := river.NewStreamWithId(streamId, recordNoId)

	// Insert as empty local stream and reconcile — should pick forward path and then backfill
	stream := inst.cache.insertEmptyLocalStream(record, blockNum, false)
	reconciler := newStreamReconciler(inst.cache, stream, record)
	err = reconciler.reconcile()
	require.NoError(err)

	testfmt.Logf(t, "Small gap forward stats: %+v", reconciler.stats)
	require.True(reconciler.notFound)
	require.True(reconciler.stats.forwardCalled)
	require.False(reconciler.stats.backwardCalled)
	require.True(reconciler.stats.backfillCalled)
	require.Equal(0, reconciler.stats.reinitializeAttempted)
	require.Equal(reconciler.stats.forwardPagesAttempted, reconciler.stats.forwardPagesSucceeded)

	// View should be up-to-date with the last produced miniblock
	stream, ok := inst.cache.cache.Load(streamId)
	require.True(ok)
	view, _ := stream.tryGetView(false)
	require.NotNil(view)
	require.Equal(prevMb.Num, view.LastBlock().Ref.Num)
}

// Backfill-only: stream is up-to-date (expected == local) but storage has gaps
// in the middle/earlier ranges that need to be backfilled.
func TestReconciler_BackfillOnly(t *testing.T) {
	cfg := config.GetDefaultConfig()
	cfg.StreamReconciliation.InitialWorkerPoolSize = 0
	cfg.StreamReconciliation.OnlineWorkerPoolSize = 0
	cfg.StreamReconciliation.GetMiniblocksPageSize = 8

	ctx, tc := makeCacheTestContext(
		t,
		testParams{
			config:                           cfg,
			replFactor:                       3,
			numInstances:                     3,
			disableStreamCacheCallbacks:      true,
			recencyConstraintsGenerations:    5,
			backwardsReconciliationThreshold: ptrUint64(20),
		},
	)
	require := tc.require

	// Initialize two replicas that will produce miniblocks
	tc.initCache(0, &MiniblockProducerOpts{TestDisableMbProdcutionOnBlock: true})
	tc.initCache(1, &MiniblockProducerOpts{TestDisableMbProdcutionOnBlock: true})

	streamId, streamNodes, prevMb := tc.allocateStream()
	nodesWithStream := streamNodes[0:2]

	// Produce a fair number of miniblocks on two replicas only (third node lags completely)
	for range 24 {
		tc.addReplEvent(streamId, prevMb, nodesWithStream)
		prevMb = tc.makeMiniblockNoCallbacks(nodesWithStream, streamId, false)
	}
	tc.addReplEvent(streamId, prevMb, nodesWithStream)

	// Initialize the third replica now
	tc.initCache(2, &MiniblockProducerOpts{TestDisableMbProdcutionOnBlock: true})
	inst := tc.instances[2]

	// Obtain the latest registry record
	blockNum, err := inst.cache.params.Registry.Blockchain.GetBlockNumber(ctx)
	require.NoError(err)
	recordNoId, err := inst.cache.params.Registry.StreamRegistry.GetStreamOnBlock(ctx, streamId, blockNum)
	require.NoError(err)
	require.NotNil(recordNoId)
	record := river.NewStreamWithId(streamId, recordNoId)

	// Insert as empty local stream on the third node
	stream := inst.cache.insertEmptyLocalStream(record, blockNum, false)

	// Manually reinitialize the stream on node 3 with only a limited window of preceding miniblocks
	// so that local last == expected last, but earlier ranges are missing in storage.
	remotes, _ := stream.GetRemotesAndIsLocal()
	require.GreaterOrEqual(len(remotes), 1)

	resp, err := inst.cache.params.RemoteMiniblockProvider.GetStream(
		ctx,
		remotes[0],
		&GetStreamRequest{
			StreamId:                    streamId[:],
			NumberOfPrecedingMiniblocks: 5, // keep a very small window
		},
	)
	require.NoError(err)

	// Reinitialize storage and view from this partial window so local view is up-to-date
	err = stream.reinitialize(ctx, resp.GetStream(), false)
	require.NoError(err)

	// Now run reconciliation which should detect gaps and backfill only (no forward/backward)
	reconciler := newStreamReconciler(inst.cache, stream, record)
	err = reconciler.reconcile()
	require.NoError(err)

	testfmt.Logf(t, "Backfill-only stats: %+v", reconciler.stats)
	require.False(reconciler.notFound) // local storage/view existed before reconcile
	require.False(reconciler.stats.forwardCalled)
	require.False(reconciler.stats.backwardCalled)
	require.True(reconciler.stats.backfillCalled)
	require.Equal(0, reconciler.stats.reinitializeAttempted)
	require.Greater(reconciler.stats.backfillPagesSucceeded, 0)
	require.Equal(reconciler.stats.backfillPagesAttempted, reconciler.stats.backfillPagesSucceeded)

	// After backfill, storage on all nodes should be consistent
	tc.compareStreamStorage(streamNodes, streamId, 0, false)
}

// Sealed stream handling: when the registry marks a stream as sealed (ephemeral),
// reconciler should normalize the ephemeral stream by fetching missing miniblocks
// via GetMiniblocksByIds and sealing it in local storage without forward/backward.
func TestReconciler_SealedEphemeral(t *testing.T) {
	cfg := config.GetDefaultConfig()
	cfg.StreamReconciliation.InitialWorkerPoolSize = 0
	cfg.StreamReconciliation.OnlineWorkerPoolSize = 0
	cfg.StreamReconciliation.GetMiniblocksPageSize = 8

	ctx, tc := makeCacheTestContext(
		t,
		testParams{
			config:                           cfg,
			replFactor:                       2,
			numInstances:                     2,
			disableStreamCacheCallbacks:      true,
			recencyConstraintsGenerations:    5,
			backwardsReconciliationThreshold: ptrUint64(20),
		},
	)
	require := tc.require

	// Initialize two instances: leader holds ephemeral data, target reconciles from registry
	tc.initCache(0, &MiniblockProducerOpts{TestDisableMbProdcutionOnBlock: true})
	tc.initCache(1, &MiniblockProducerOpts{TestDisableMbProdcutionOnBlock: true})

	leader := tc.instances[0]
	target := tc.instances[1]

	// Create a media stream ID and channel ID
	streamId := testutils.FakeStreamId(STREAM_MEDIA_BIN)
	spaceId := testutils.FakeStreamId(STREAM_SPACE_BIN)
	channelId := testutils.MakeChannelId(spaceId)

	const chunks = 6

	// Build media genesis miniblock and write ephemeral storage on leader
	genesis := MakeGenesisMiniblockForMediaStream(
		t,
		tc.clientWallet,
		leader.params.Wallet,
		&MediaPayload_Inception{StreamId: streamId[:], ChannelId: channelId[:], ChunkCount: chunks},
	)
	genesisStorage, err := genesis.AsStorageMb()
	require.NoError(err)
	err = leader.params.Storage.CreateEphemeralStreamStorage(ctx, streamId, genesisStorage)
	require.NoError(err)

	// Write ephemeral miniblocks [1..chunks] on leader
	mbRef := *genesis.Ref
	for i := 0; i < chunks; i++ {
		// Create media chunk event
		payload := Make_MediaPayload_Chunk([]byte("chunk "+fmt.Sprint(i)), int32(i), nil)
		envelope, err := MakeEnvelopeWithPayload(leader.params.Wallet, payload, &mbRef)
		require.NoError(err)

		header, err := MakeEnvelopeWithPayload(leader.params.Wallet, Make_MiniblockHeader(&MiniblockHeader{
			MiniblockNum:      mbRef.Num + 1,
			PrevMiniblockHash: mbRef.Hash[:],
			EventHashes:       [][]byte{envelope.Hash},
		}), &mbRef)
		require.NoError(err)

		mbBytes, err := proto.Marshal(&Miniblock{Events: []*Envelope{envelope}, Header: header})
		require.NoError(err)

		err = leader.params.Storage.WriteEphemeralMiniblock(ctx, streamId, &storage.MiniblockDescriptor{
			Number: mbRef.Num + 1,
			Hash:   common.BytesToHash(header.Hash),
			Data:   mbBytes,
		})
		require.NoError(err)

		mbRef.Num++
		mbRef.Hash = common.BytesToHash(header.Hash)
	}

	// Register the sealed stream in the registry with last miniblock equal to chunks
	addrs := []common.Address{leader.params.Wallet.Address, target.params.Wallet.Address}
	err = leader.params.Registry.AddStream(ctx, streamId, addrs, genesis.Ref.Hash, mbRef.Hash, mbRef.Num, true)
	require.NoError(err)

	// Create empty local stream on target and run reconciler
	blockNum, err := target.cache.params.Registry.Blockchain.GetBlockNumber(ctx)
	require.NoError(err)
	recordNoId, err := target.cache.params.Registry.StreamRegistry.GetStreamOnBlock(ctx, streamId, blockNum)
	require.NoError(err)
	require.True(recordNoId.IsSealed())
	require.EqualValues(chunks, recordNoId.LastMbNum())
	record := river.NewStreamWithId(streamId, recordNoId)

	stream := target.cache.insertEmptyLocalStream(record, blockNum, false)

	reconciler := newStreamReconciler(target.cache, stream, record)
	err = reconciler.reconcile()
	require.NoError(err)

	// Validate that only normalize path ran (no forward/backward/backfill)
	testfmt.Logf(t, "Sealed stream stats: %+v", reconciler.stats)
	require.False(reconciler.stats.forwardCalled)
	require.False(reconciler.stats.backwardCalled)
	require.False(reconciler.stats.backfillCalled)

	// Stream should be normalized (non-ephemeral) on target
	ephemeral, err := target.params.Storage.IsStreamEphemeral(ctx, streamId)
	require.NoError(err)
	require.False(ephemeral)

	// View should load and be at the last miniblock
	v, err := stream.GetView(ctx)
	require.NoError(err)
	require.NotNil(v)
	require.Equal(mbRef.Num, v.LastBlock().Ref.Num)

	// Storage should match across nodes
	tc.compareStreamStorage(addrs, streamId, 0, true)
}

// Forward-only reconciliation when backward reconciliation is disabled.
func TestReconciler_ForwardOnly(t *testing.T) {
	cfg := config.GetDefaultConfig()
	cfg.StreamReconciliation.InitialWorkerPoolSize = 0
	cfg.StreamReconciliation.OnlineWorkerPoolSize = 0
	cfg.StreamReconciliation.GetMiniblocksPageSize = 8

	ctx, tc := makeCacheTestContext(
		t,
		testParams{
			config:                           cfg,
			replFactor:                       3,
			numInstances:                     3,
			disableStreamCacheCallbacks:      true,
			recencyConstraintsGenerations:    5,
			backwardsReconciliationThreshold: ptrUint64(0), // disable backward reconciliation
		},
	)
	require := tc.require

	// Initialize two replicas that will have the data
	tc.initCache(0, &MiniblockProducerOpts{TestDisableMbProdcutionOnBlock: true})
	tc.initCache(1, &MiniblockProducerOpts{TestDisableMbProdcutionOnBlock: true})

	streamId, streamNodes, prevMb := tc.allocateStream()
	nodesWithStream := streamNodes[0:2]

	// Produce some miniblocks on two replicas
	for range 16 {
		tc.addReplEvent(streamId, prevMb, nodesWithStream)
		prevMb = tc.makeMiniblockNoCallbacks(nodesWithStream, streamId, false)
	}
	// Add event to minipool, do not produce miniblock yet (not required for this test)
	tc.addReplEvent(streamId, prevMb, nodesWithStream)

	// Initialize the third replica which is missing the stream locally
	tc.initCache(2, &MiniblockProducerOpts{TestDisableMbProdcutionOnBlock: true})
	inst := tc.instances[2]

	blockNum, err := inst.cache.params.Registry.Blockchain.GetBlockNumber(ctx)
	require.NoError(err)
	recordNoId, err := inst.cache.params.Registry.StreamRegistry.GetStreamOnBlock(ctx, streamId, blockNum)
	require.NoError(err)
	require.NotNil(recordNoId)
	record := river.NewStreamWithId(streamId, recordNoId)

	// Insert as empty local stream and reconcile forward-only
	stream := inst.cache.insertEmptyLocalStream(record, blockNum, false)
	reconciler := newStreamReconciler(inst.cache, stream, record)
	err = reconciler.reconcile()
	require.NoError(err)

	testfmt.Logf(t, "Forward-only stats: %+v", reconciler.stats)
	require.True(reconciler.notFound)
	require.True(reconciler.stats.forwardCalled)
	require.False(reconciler.stats.backwardCalled)
	require.False(reconciler.stats.backfillCalled)

	stream, ok := inst.cache.cache.Load(streamId)
	require.True(ok)
	view, _ := stream.tryGetView(false)
	require.NotNil(view)
	require.Equal(prevMb.Num, view.LastBlock().Ref.Num)
}

// Reconciliation must fail with Err_UNAVAILABLE when there are no remotes (replication factor = 1 and running on the
// only node).
func TestReconciler_NoRemotes(t *testing.T) {
	cfg := config.GetDefaultConfig()
	cfg.StreamReconciliation.InitialWorkerPoolSize = 0
	cfg.StreamReconciliation.OnlineWorkerPoolSize = 0
	cfg.StreamReconciliation.GetMiniblocksPageSize = 8

	ctx, tc := makeCacheTestContext(
		t,
		testParams{
			config:                           cfg,
			replFactor:                       1,
			numInstances:                     1,
			disableStreamCacheCallbacks:      true,
			recencyConstraintsGenerations:    5,
			backwardsReconciliationThreshold: ptrUint64(20),
		},
	)
	require := tc.require

	tc.initCache(0, &MiniblockProducerOpts{TestDisableMbProdcutionOnBlock: true})
	streamId, _, _ := tc.allocateStream()

	inst := tc.instances[0]
	blockNum, err := inst.cache.params.Registry.Blockchain.GetBlockNumber(ctx)
	require.NoError(err)
	recordNoId, err := inst.cache.params.Registry.StreamRegistry.GetStreamOnBlock(ctx, streamId, blockNum)
	require.NoError(err)
	require.NotNil(recordNoId)
	record := river.NewStreamWithId(streamId, recordNoId)

	stream := inst.cache.insertEmptyLocalStream(record, blockNum, false)
	reconciler := newStreamReconciler(inst.cache, stream, record)
	err = reconciler.reconcile()
	require.Error(err)
	require.True(IsRiverErrorCode(err, Err_UNAVAILABLE))
}

// When expected last miniblock equals 0, reconciler imports the genesis miniblock directly from the registry.
func TestReconciler_ImportGenesisFromRegistry(t *testing.T) {
	cfg := config.GetDefaultConfig()
	cfg.StreamReconciliation.InitialWorkerPoolSize = 0
	cfg.StreamReconciliation.OnlineWorkerPoolSize = 0
	cfg.StreamReconciliation.GetMiniblocksPageSize = 8

	ctx, tc := makeCacheTestContext(
		t,
		testParams{
			config:                           cfg,
			replFactor:                       3,
			numInstances:                     3,
			disableStreamCacheCallbacks:      true,
			recencyConstraintsGenerations:    5,
			backwardsReconciliationThreshold: ptrUint64(20),
		},
	)
	require := tc.require

	// Only initialize the first two instances (which host the stream genesis)
	tc.initCache(0, &MiniblockProducerOpts{TestDisableMbProdcutionOnBlock: true})
	tc.initCache(1, &MiniblockProducerOpts{TestDisableMbProdcutionOnBlock: true})

	streamId, _, _ := tc.allocateStream()

	// Initialize the third replica which will import genesis from registry
	tc.initCache(2, &MiniblockProducerOpts{TestDisableMbProdcutionOnBlock: true})
	inst := tc.instances[2]

	// Read the genesis record (LastMbNum == 0)
	blockNum, err := inst.cache.params.Registry.Blockchain.GetBlockNumber(ctx)
	require.NoError(err)
	recordNoId, err := inst.cache.params.Registry.StreamRegistry.GetStreamOnBlock(ctx, streamId, blockNum)
	require.NoError(err)
	require.NotNil(recordNoId)
	record := river.NewStreamWithId(streamId, recordNoId)
	require.EqualValues(0, record.LastMbNum())

	// Insert as empty local stream and reconcile
	stream := inst.cache.insertEmptyLocalStream(record, blockNum, false)
	reconciler := newStreamReconciler(inst.cache, stream, record)
	err = reconciler.reconcile()
	require.NoError(err)

	// Validate that genesis was imported and no forward/backward paths were taken
	testfmt.Logf(t, "Genesis import stats: %+v", reconciler.stats)
	require.True(reconciler.notFound)
	require.False(reconciler.stats.forwardCalled)
	require.False(reconciler.stats.backwardCalled)
	require.False(reconciler.stats.backfillCalled)

	stream, ok := inst.cache.cache.Load(streamId)
	require.True(ok)
	view, _ := stream.tryGetView(false)
	require.NotNil(view)
	require.Equal(int64(0), view.LastBlock().Ref.Num)
}

// Backfill respects the StreamHistoryMiniblocks setting when determining the
// earliest miniblock that needs to be reconciled.
func TestReconciler_BackfillHistoryWindow(t *testing.T) {
	cfg := config.GetDefaultConfig()
	cfg.StreamReconciliation.InitialWorkerPoolSize = 0
	cfg.StreamReconciliation.OnlineWorkerPoolSize = 0
	cfg.StreamReconciliation.GetMiniblocksPageSize = 8

	const historyWindow uint64 = 12

	ctx, tc := makeCacheTestContext(
		t,
		testParams{
			config:                           cfg,
			replFactor:                       3,
			numInstances:                     3,
			disableStreamCacheCallbacks:      true,
			recencyConstraintsGenerations:    5,
			backwardsReconciliationThreshold: ptrUint64(20),
			streamHistoryMiniblocks: map[byte]uint64{
				STREAM_USER_SETTINGS_BIN: historyWindow,
			},
		},
	)
	require := tc.require

	require.Equal(
		historyWindow,
		tc.instances[0].params.ChainConfig.Get().StreamHistoryMiniblocks.ForType(STREAM_USER_SETTINGS_BIN),
	)

	tc.initCache(0, &MiniblockProducerOpts{TestDisableMbProdcutionOnBlock: true})
	tc.initCache(1, &MiniblockProducerOpts{TestDisableMbProdcutionOnBlock: true})

	streamId, streamNodes, prevMb := tc.allocateStream()
	nodesWithStream := streamNodes[0:2]

	for range 30 {
		tc.addReplEvent(streamId, prevMb, nodesWithStream)
		prevMb = tc.makeMiniblockNoCallbacks(nodesWithStream, streamId, false)
	}
	tc.addReplEvent(streamId, prevMb, nodesWithStream)

	tc.initCache(2, &MiniblockProducerOpts{TestDisableMbProdcutionOnBlock: true})
	inst := tc.instances[2]

	blockNum, err := inst.cache.params.Registry.Blockchain.GetBlockNumber(ctx)
	require.NoError(err)

	recordNoId, err := inst.cache.params.Registry.StreamRegistry.GetStreamOnBlock(ctx, streamId, blockNum)
	require.NoError(err)
	require.NotNil(recordNoId)
	record := river.NewStreamWithId(streamId, recordNoId)
	require.NoError(err)

	stream := inst.cache.insertEmptyLocalStream(record, blockNum, false)

	remotes, _ := stream.GetRemotesAndIsLocal()
	require.GreaterOrEqual(len(remotes), 1)

	resp, err := inst.cache.params.RemoteMiniblockProvider.GetStream(
		ctx,
		remotes[0],
		&GetStreamRequest{
			StreamId:                    streamId[:],
			NumberOfPrecedingMiniblocks: 0,
		},
	)
	require.NoError(err)

	err = stream.reinitialize(ctx, resp.GetStream(), false)
	require.NoError(err)

	reconciler := newStreamReconciler(inst.cache, stream, record)
	err = reconciler.reconcile()
	require.NoError(err)

	expectedStart := int64(record.LastMbNum()) - int64(historyWindow)
	if expectedStart < 0 {
		expectedStart = 0
	}

	require.True(reconciler.stats.backfillCalled)
	require.Equal(expectedStart, reconciler.localStartMbInclusive)
}

// Backfill prefers per-stream trim targets over per-type history windows.
func TestReconciler_BackfillUsesStreamTrimTarget(t *testing.T) {
	cfg := config.GetDefaultConfig()
	cfg.StreamReconciliation.InitialWorkerPoolSize = 0
	cfg.StreamReconciliation.OnlineWorkerPoolSize = 0
	cfg.StreamReconciliation.GetMiniblocksPageSize = 8

	const (
		historyWindow   uint64 = 12
		perStreamTarget int64  = 17
	)

	ctx, tc := makeCacheTestContext(
		t,
		testParams{
			config:                           cfg,
			replFactor:                       3,
			numInstances:                     3,
			disableStreamCacheCallbacks:      true,
			recencyConstraintsGenerations:    5,
			backwardsReconciliationThreshold: ptrUint64(20),
			streamHistoryMiniblocks: map[byte]uint64{
				STREAM_USER_SETTINGS_BIN: historyWindow,
			},
		},
	)
	require := tc.require

	tc.initCache(0, &MiniblockProducerOpts{TestDisableMbProdcutionOnBlock: true})
	tc.initCache(1, &MiniblockProducerOpts{TestDisableMbProdcutionOnBlock: true})

	streamId, streamNodes, prevMb := tc.allocateStream()
	nodesWithStream := streamNodes[0:2]

	for range 45 {
		tc.addReplEvent(streamId, prevMb, nodesWithStream)
		prevMb = tc.makeMiniblockNoCallbacks(nodesWithStream, streamId, false)
	}
	tc.addReplEvent(streamId, prevMb, nodesWithStream)

	tc.btc.SetConfigValue(
		t,
		ctx,
		crypto.StreamTrimByStreamIdConfigKey,
		crypto.ABIEncodeStreamIdMiniblockArray([]crypto.StreamIdMiniblock{
			{StreamId: streamId, MiniblockNum: perStreamTarget},
		}),
	)

	tc.initCache(2, &MiniblockProducerOpts{TestDisableMbProdcutionOnBlock: true})
	inst := tc.instances[2]

	blockNum, err := inst.cache.params.Registry.Blockchain.GetBlockNumber(ctx)
	require.NoError(err)

	recordNoId, err := inst.cache.params.Registry.StreamRegistry.GetStreamOnBlock(ctx, streamId, blockNum)
	require.NoError(err)
	require.NotNil(recordNoId)
	record := river.NewStreamWithId(streamId, recordNoId)

	stream := inst.cache.insertEmptyLocalStream(record, blockNum, false)

	remotes, _ := stream.GetRemotesAndIsLocal()
	require.GreaterOrEqual(len(remotes), 1)

	resp, err := inst.cache.params.RemoteMiniblockProvider.GetStream(
		ctx,
		remotes[0],
		&GetStreamRequest{
			StreamId:                    streamId[:],
			NumberOfPrecedingMiniblocks: 5,
		},
	)
	require.NoError(err)

	err = stream.reinitialize(ctx, resp.GetStream(), false)
	require.NoError(err)

	reconciler := newStreamReconciler(inst.cache, stream, record)
	err = reconciler.reconcile()
	require.NoError(err)

	require.True(reconciler.stats.backfillCalled)
	require.NotEmpty(reconciler.presentRanges)

	expectedStart := storage.FindClosestSnapshotMiniblock(reconciler.presentRanges, perStreamTarget)
	require.Equal(expectedStart, reconciler.localStartMbInclusive)

	historyStart := record.LastMbNum() - int64(historyWindow)
	if historyStart < 0 {
		historyStart = 0
	}
	require.NotEqual(historyStart, reconciler.localStartMbInclusive)
}

func TestReconciler_BackwardUsesHistoryWindowForRanges(t *testing.T) {
	cfg := config.GetDefaultConfig()
	cfg.StreamReconciliation.InitialWorkerPoolSize = 0
	cfg.StreamReconciliation.OnlineWorkerPoolSize = 0
	cfg.StreamReconciliation.GetMiniblocksPageSize = 8

	const (
		historyWindow        uint64 = 12
		backwardThreshold    uint64 = 5
		reconciledMiniblocks        = 30
	)

	ctx, tc := makeCacheTestContext(
		t,
		testParams{
			config:                           cfg,
			replFactor:                       3,
			numInstances:                     3,
			disableStreamCacheCallbacks:      true,
			recencyConstraintsGenerations:    5,
			backwardsReconciliationThreshold: ptrUint64(backwardThreshold),
			streamHistoryMiniblocks: map[byte]uint64{
				STREAM_USER_SETTINGS_BIN: historyWindow,
			},
		},
	)
	require := tc.require

	require.Equal(
		historyWindow,
		tc.instances[0].params.ChainConfig.Get().StreamHistoryMiniblocks.ForType(STREAM_USER_SETTINGS_BIN),
	)

	tc.initCache(0, &MiniblockProducerOpts{TestDisableMbProdcutionOnBlock: true})
	tc.initCache(1, &MiniblockProducerOpts{TestDisableMbProdcutionOnBlock: true})

	streamId, streamNodes, prevMb := tc.allocateStream()
	nodesWithStream := streamNodes[0:2]

	for range reconciledMiniblocks {
		tc.addReplEvent(streamId, prevMb, nodesWithStream)
		prevMb = tc.makeMiniblockNoCallbacks(nodesWithStream, streamId, false)
	}
	tc.addReplEvent(streamId, prevMb, nodesWithStream)

	tc.initCache(2, &MiniblockProducerOpts{TestDisableMbProdcutionOnBlock: true})
	inst := tc.instances[2]

	blockNum, err := inst.cache.params.Registry.Blockchain.GetBlockNumber(ctx)
	require.NoError(err)
	recordNoId, err := inst.cache.params.Registry.StreamRegistry.GetStreamOnBlock(ctx, streamId, blockNum)
	require.NoError(err)
	require.NotNil(recordNoId)
	record := river.NewStreamWithId(streamId, recordNoId)

	stream := inst.cache.insertEmptyLocalStream(record, blockNum, false)

	reconciler := newStreamReconciler(inst.cache, stream, record)
	err = reconciler.reconcile()
	require.NoError(err)

	require.True(reconciler.stats.backwardCalled)

	desiredStart := int64(record.LastMbNum()) - int64(historyWindow)
	if desiredStart < 0 {
		desiredStart = 0
	}

	require.NotEmpty(reconciler.presentRanges)
	expectedStart := storage.FindClosestSnapshotMiniblock(reconciler.presentRanges, desiredStart)
	require.Equal(expectedStart, reconciler.localStartMbInclusive)
}

type trimTestEnv struct {
	ctx              context.Context
	tc               *cacheTestContext
	inst             *cacheTestInstance
	streamID         StreamId
	reconciler       *streamReconciler
	historyWindow    uint64
	snapshotInterval uint64
	producedBlocks   int
}

func newTrimTestEnv(
	t *testing.T,
	historyWindow uint64,
	snapshotInterval uint64,
	producedBlocks int,
	forceSnapshot bool,
) *trimTestEnv {
	t.Helper()

	cfg := config.GetDefaultConfig()
	cfg.StreamReconciliation.InitialWorkerPoolSize = 0
	cfg.StreamReconciliation.OnlineWorkerPoolSize = 0
	cfg.StreamReconciliation.GetMiniblocksPageSize = 8

	ctx, tc := makeCacheTestContext(
		t,
		testParams{
			config:                           cfg,
			replFactor:                       3,
			numInstances:                     3,
			disableStreamCacheCallbacks:      true,
			recencyConstraintsGenerations:    5,
			defaultMinEventsPerSnapshot:      1,
			backwardsReconciliationThreshold: ptrUint64(20),
			streamHistoryMiniblocks: map[byte]uint64{
				STREAM_USER_SETTINGS_BIN: historyWindow,
			},
			streamSnapshotIntervalInMbs: &snapshotInterval,
			streamTrimActivationFactor:  ptrUint64(0),
		},
	)

	tc.initCache(0, &MiniblockProducerOpts{TestDisableMbProdcutionOnBlock: true})
	tc.initCache(1, &MiniblockProducerOpts{TestDisableMbProdcutionOnBlock: true})

	streamID, streamNodes, prevMb := tc.allocateStream()
	nodesWithStream := streamNodes[0:2]

	for i := 0; i < producedBlocks; i++ {
		tc.addReplEvent(streamID, prevMb, nodesWithStream)
		prevMb = tc.makeMiniblockNoCallbacks(nodesWithStream, streamID, forceSnapshot)
	}
	tc.addReplEvent(streamID, prevMb, nodesWithStream)

	tc.initCache(2, &MiniblockProducerOpts{TestDisableMbProdcutionOnBlock: true})
	inst := tc.instances[2]

	blockNum, err := inst.cache.params.Registry.Blockchain.GetBlockNumber(ctx)
	tc.require.NoError(err)
	recordNoId, err := inst.cache.params.Registry.StreamRegistry.GetStreamOnBlock(ctx, streamID, blockNum)
	tc.require.NoError(err)
	tc.require.NotNil(recordNoId)
	record := river.NewStreamWithId(streamID, recordNoId)

	stream := inst.cache.insertEmptyLocalStream(record, blockNum, false)
	reconciler := newStreamReconciler(inst.cache, stream, record)
	tc.require.NoError(reconciler.reconcile())

	return &trimTestEnv{
		ctx:              ctx,
		tc:               tc,
		inst:             inst,
		streamID:         streamID,
		reconciler:       reconciler,
		historyWindow:    historyWindow,
		snapshotInterval: snapshotInterval,
		producedBlocks:   producedBlocks,
	}
}

func flattenMiniblockSeqs(ranges []storage.MiniblockRange) []int64 {
	seqs := make([]int64, 0)
	for _, r := range ranges {
		for n := r.StartInclusive; n <= r.EndInclusive; n++ {
			seqs = append(seqs, n)
		}
	}
	return seqs
}

func flattenSnapshotSeqs(ranges []storage.MiniblockRange) []int64 {
	snaps := make([]int64, 0)
	for _, r := range ranges {
		snaps = append(snaps, r.SnapshotSeqNums...)
	}
	slices.Sort(snaps)
	snaps = slices.Compact(snaps)
	return snaps
}

func TestReconciler_TrimRejectsMultipleGaps(t *testing.T) {
	env := newTrimTestEnv(t, 0, 1, 40, false)
	store := env.inst.cache.params.Storage
	require := env.tc.require

	require.NoError(store.DebugDeleteMiniblocks(env.ctx, env.streamID, 5, 10))
	require.NoError(store.DebugDeleteMiniblocks(env.ctx, env.streamID, 15, 20))
	require.NoError(
		store.DebugDeleteMiniblocks(env.ctx, env.streamID, int64(env.producedBlocks-6), int64(env.producedBlocks-4)),
	)

	rangesAfterDeletion, err := store.GetMiniblockNumberRanges(env.ctx, env.streamID)
	require.NoError(err)
	require.Len(rangesAfterDeletion, 4)
	seqsAfterDeletion := flattenMiniblockSeqs(rangesAfterDeletion)
	snapsAfterDeletion := flattenSnapshotSeqs(rangesAfterDeletion)

	err = env.reconciler.trim()
	require.Error(err)
	require.True(IsRiverErrorCode(err, Err_INTERNAL))

	rangesAfter, err := store.GetMiniblockNumberRanges(env.ctx, env.streamID)
	require.NoError(err)
	assert.Equal(t, seqsAfterDeletion, flattenMiniblockSeqs(rangesAfter))
	assert.Equal(t, snapsAfterDeletion, flattenSnapshotSeqs(rangesAfter))
}

func TestReconciler_TrimRejectsInvalidTwoRangeLayout(t *testing.T) {
	env := newTrimTestEnv(t, 0, 1, 40, false)
	store := env.inst.cache.params.Storage
	require := env.tc.require

	require.NoError(store.DebugDeleteMiniblocks(env.ctx, env.streamID, 0, 1))
	require.NoError(
		store.DebugDeleteMiniblocks(env.ctx, env.streamID, int64(env.producedBlocks-12), int64(env.producedBlocks-6)),
	)
	require.NoError(
		store.DebugDeleteMiniblocks(env.ctx, env.streamID, int64(env.producedBlocks-2), int64(env.producedBlocks)),
	)

	rangesAfterDeletion, err := store.GetMiniblockNumberRanges(env.ctx, env.streamID)
	require.NoError(err)
	require.Len(rangesAfterDeletion, 3)
	require.NotEqual(int64(0), rangesAfterDeletion[0].StartInclusive)
	require.NotEqual(int64(0), rangesAfterDeletion[0].EndInclusive)
	seqsAfterDeletion := flattenMiniblockSeqs(rangesAfterDeletion)
	snapsAfterDeletion := flattenSnapshotSeqs(rangesAfterDeletion)

	err = env.reconciler.trim()
	require.Error(err)
	require.True(IsRiverErrorCode(err, Err_INTERNAL))

	rangesAfter, err := store.GetMiniblockNumberRanges(env.ctx, env.streamID)
	require.NoError(err)
	assert.Equal(t, seqsAfterDeletion, flattenMiniblockSeqs(rangesAfter))
	assert.Equal(t, snapsAfterDeletion, flattenSnapshotSeqs(rangesAfter))
}

func TestReconciler_TrimHistoryAlignment(t *testing.T) {
	env := newTrimTestEnv(t, 10, 1, 45, false)
	require := env.tc.require

	require.NoError(env.reconciler.trim())

	ranges, err := env.inst.cache.params.Storage.GetMiniblockNumberRanges(env.ctx, env.streamID)
	require.NoError(err)
	require.Len(ranges, 1)

	expectedStart := int64(env.producedBlocks) - int64(env.historyWindow)
	if expectedStart < 0 {
		expectedStart = 0
	}
	expectedLast := int64(env.producedBlocks)

	latestRange := ranges[0]
	require.Equal(expectedStart, latestRange.StartInclusive)
	require.Equal(expectedLast, latestRange.EndInclusive)

	require.NotEmpty(latestRange.SnapshotSeqNums)
	firstSnapshot := latestRange.SnapshotSeqNums[0]
	lastSnapshot := latestRange.SnapshotSeqNums[len(latestRange.SnapshotSeqNums)-1]
	assert.GreaterOrEqual(t, firstSnapshot, expectedStart)
	assert.LessOrEqual(t, lastSnapshot, expectedLast)

	seqs := flattenMiniblockSeqs(ranges)
	expectedSeqs := make([]int64, 0, env.historyWindow+1)
	for seq := expectedStart; seq <= expectedLast; seq++ {
		expectedSeqs = append(expectedSeqs, seq)
	}
	assert.Equal(t, expectedSeqs, seqs)
}

func TestReconciler_TrimNoRetentionPolicies(t *testing.T) {
	env := newTrimTestEnv(t, 0, 0, 20, false)
	require := env.tc.require

	rangesBefore, err := env.inst.cache.params.Storage.GetMiniblockNumberRanges(env.ctx, env.streamID)
	require.NoError(err)

	require.NoError(env.reconciler.trim())

	rangesAfter, err := env.inst.cache.params.Storage.GetMiniblockNumberRanges(env.ctx, env.streamID)
	require.NoError(err)
	assert.Equal(t, rangesBefore, rangesAfter)
}

func TestReconciler_ReconcileAndTrimEndToEnd(t *testing.T) {
	env := newTrimTestEnv(t, 5, 1, 32, false)
	require := env.tc.require

	require.NoError(env.reconciler.reconcileAndTrim())

	ranges, err := env.inst.cache.params.Storage.GetMiniblockNumberRanges(env.ctx, env.streamID)
	require.NoError(err)
	require.Len(ranges, 1)

	expectedStart := int64(env.producedBlocks) - int64(env.historyWindow)
	if expectedStart < 0 {
		expectedStart = 0
	}
	expectedLast := int64(env.producedBlocks)

	keptRange := ranges[0]
	require.Equal(expectedStart, keptRange.StartInclusive)
	require.Equal(expectedLast, keptRange.EndInclusive)

	require.NotEmpty(keptRange.SnapshotSeqNums)
	firstSnapshot := keptRange.SnapshotSeqNums[0]
	lastSnapshot := keptRange.SnapshotSeqNums[len(keptRange.SnapshotSeqNums)-1]
	assert.GreaterOrEqual(t, firstSnapshot, expectedStart)
	assert.LessOrEqual(t, lastSnapshot, expectedLast)

	seqs := flattenMiniblockSeqs(ranges)
	expectedSeqs := make([]int64, 0, env.historyWindow+1)
	for seq := expectedStart; seq <= expectedLast; seq++ {
		expectedSeqs = append(expectedSeqs, seq)
	}
	assert.Equal(t, expectedSeqs, seqs)
}

// TestReconciler_NoRemotesNoCandidateFails verifies that when a non-replicated stream
// has no remotes and no local candidate, and the DB is out of sync with the registry,
// reconciliation fails gracefully.
// This test ensures the error handling path in tryPromoteLocalCandidate works correctly.
func TestReconciler_NoRemotesNoCandidateFails(t *testing.T) {
	cfg := config.GetDefaultConfig()
	cfg.StreamReconciliation.InitialWorkerPoolSize = 0
	cfg.StreamReconciliation.OnlineWorkerPoolSize = 0

	ctx, tc := makeCacheTestContext(
		t,
		testParams{
			config:                           cfg,
			replFactor:                       1, // Non-replicated stream
			numInstances:                     1,
			disableStreamCacheCallbacks:      true,
			recencyConstraintsGenerations:    5,
			backwardsReconciliationThreshold: ptrUint64(20),
		},
	)
	require := tc.require

	tc.initCache(0, &MiniblockProducerOpts{TestDisableMbProdcutionOnBlock: true})
	streamId, _, _ := tc.allocateStream()

	inst := tc.instances[0]

	// Get stream record
	blockNum, err := inst.cache.params.Registry.Blockchain.GetBlockNumber(ctx)
	require.NoError(err)
	recordNoId, err := inst.cache.params.Registry.StreamRegistry.GetStreamOnBlock(ctx, streamId, blockNum)
	require.NoError(err)

	// Create a modified stream record with a higher LastMiniblockNum than what's in the DB.
	// This simulates a scenario where the registry indicates a newer miniblock exists,
	// but the local DB hasn't caught up and there's no candidate to promote.
	modifiedStream := &river.Stream{
		LastMiniblockHash: recordNoId.LastMiniblockHash,
		LastMiniblockNum:  recordNoId.LastMiniblockNum + 5, // DB is behind by 5 miniblocks
		Reserved0:         recordNoId.Reserved0,
		Flags:             recordNoId.Flags,
		Nodes:             recordNoId.Nodes,
	}
	record := river.NewStreamWithId(streamId, modifiedStream)

	stream, err := inst.cache.getStreamImpl(ctx, streamId, true)
	require.NoError(err)

	// Reconciliation should fail because:
	// 1. No remotes to fetch from
	// 2. No local candidate to promote
	// 3. DB miniblock (0) != registry miniblock (5), so not in sync
	reconciler := newStreamReconciler(inst.cache, stream, record)
	err = reconciler.reconcile()
	require.Error(err)
	require.True(IsRiverErrorCode(err, Err_UNAVAILABLE))

	testfmt.Logf(t, "Correctly failed reconciliation with no remotes and no candidate")
}
