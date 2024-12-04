package events

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestReplicatedMbProduction(t *testing.T) {
	ctx, tc := makeCacheTestContext(t, testParams{replFactor: 5, numInstances: 5})
	require := tc.require

	tc.initAllCaches(&MiniblockProducerOpts{TestDisableMbProdcutionOnBlock: true})

	streamId, streamNodes, prevMb := tc.createReplStream()

	for range 20 {
		tc.addReplEvent(streamId, prevMb, streamNodes)
	}

	leaderAddr := streamNodes[0]
	leader := tc.instancesByAddr[leaderAddr]

	stream, err := leader.cache.getStreamImpl(ctx, streamId, true)
	require.NoError(err)
	require.True(stream.IsLocal())
	job := leader.mbProducer.trySchedule(ctx, stream)
	require.NotNil(job)
	require.Eventually(
		func() bool {
			return leader.mbProducer.testCheckDone(job)
		},
		10*time.Second,
		10*time.Millisecond,
	)

	leaderMBs, err := leader.params.Storage.ReadMiniblocks(ctx, streamId, 0, 100)
	require.NoError(err)
	require.Len(leaderMBs, 2)

	for _, n := range streamNodes[1:] {
		require.EventuallyWithT(
			func(tt *assert.CollectT) {
				mbs, err := tc.instancesByAddr[n].params.Storage.ReadMiniblocks(ctx, streamId, 0, 100)
				_ = assert.NoError(tt, err) && assert.Len(tt, mbs, 2) && assert.EqualValues(tt, leaderMBs, mbs)
			},
			5*time.Second,
			10*time.Millisecond,
		)
	}
}
