package events

import (
	"testing"

	"github.com/towns-protocol/towns/core/config"
	. "github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/shared"
)

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
			enableNewSnapshotFormat:          1,
			recencyConstraintsGenerations:    5,
			backwardsReconciliationThreshold: 20,
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

	record, err := inst.cache.params.Registry.GetStream(ctx, streamId, blockNum)
	require.NoError(err)

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

	expectedStart := int64(record.LastMbNum()) - int64(historyWindow)
	if expectedStart < 0 {
		expectedStart = 0
	}

	require.True(reconciler.stats.backfillCalled)
	require.Equal(expectedStart, reconciler.localStartMbInclusive)
}
