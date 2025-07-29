package events

import (
	"testing"

	"github.com/towns-protocol/towns/core/config"
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
			enableNewSnapshotFormat:          1,
			recencyConstraintsGenerations:    5,
			backwardsReconciliationThreshold: 20,
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

	record, err := inst.cache.params.Registry.GetStream(ctx, streamId, blockNum)
	require.NoError(err)
	require.NotNil(record)

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

	// Add more events
	for range 10 {
		tc.addReplEvent(streamId, prevMb, streamNodes)
		prevMb = tc.makeMiniblockNoCallbacks(streamNodes, streamId, false)
	}
	tc.addReplEvent(streamId, prevMb, streamNodes)

	tc.compareStreamStorage(streamNodes, streamId, 0)
}
