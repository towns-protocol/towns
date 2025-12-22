package events

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"google.golang.org/protobuf/proto"

	"github.com/towns-protocol/towns/core/node/crypto"
	"github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/shared"
)

// TestReplicatedMbProductionWithTooManyEvents ensures that the miniblock producer does not produce miniblocks
// with more events than the configured limit.
func TestReplicatedMbProductionWithTooManyEvents(t *testing.T) {
	t.Parallel()

	runTest := func(t *testing.T, replFactor int, numInstances int) {
		ctx, tc := makeCacheTestContext(t, testParams{replFactor: replFactor, numInstances: numInstances})
		require := tc.require

		const (
			maxEventsPerMiniblock = 3
			eventCount            = 7
		)

		tc.btc.SetConfigValue(
			t,
			ctx,
			crypto.StreamReplicationFactorConfigKey,
			crypto.ABIEncodeInt64(int64(replFactor)),
		)

		tc.btc.SetConfigValue(
			t,
			ctx,
			crypto.StreamMaxEventsPerMiniblockKey,
			crypto.ABIEncodeInt64(int64(maxEventsPerMiniblock)),
		)

		maxMiniblockEventsCount, maxMiniblockEventsSize := MiniblockEventLimits(tc.btc.OnChainConfig.Get())
		require.EqualValues(maxEventsPerMiniblock, maxMiniblockEventsCount)

		tc.initAllCaches(&MiniblockProducerOpts{TestDisableMbProdcutionOnBlock: true})

		streamId, streamNodes, prevMb := tc.createReplStream()

		// add several events and ensure that miniblocks contain maxEventsPerMiniblock events per miniblock
		for range eventCount {
			tc.addReplEvent(streamId, prevMb, streamNodes)
		}

		leaderAddr := streamNodes[0]
		leader := tc.instancesByAddr[leaderAddr]

		require.EventuallyWithT(func(collect *assert.CollectT) {
			mbProductionWithEventMaxSizeCheck(
				collect, leader, ctx, streamId, maxEventsPerMiniblock, maxMiniblockEventsSize, eventCount)
		}, 10*time.Second, 50*time.Millisecond)
	}

	t.Run("non-replicated", func(t *testing.T) { runTest(t, 1, 1) })
	t.Run("replicated", func(t *testing.T) { runTest(t, 3, 5) })
}

// TestReplicatedMbProductionWithTooBigEvents ensures that the miniblock producer does not produce miniblocks
// with a total event size greater than the configured limit.
func TestReplicatedMbProductionWithTooBigEvents(t *testing.T) {
	t.Parallel()

	runTest := func(t *testing.T, replFactor int, numInstances int) {
		ctx, tc := makeCacheTestContext(t, testParams{replFactor: replFactor, numInstances: numInstances})
		require := tc.require

		const (
			maxEventsPerMiniblock = 3
			eventCount            = 7
		)

		tc.initAllCaches(&MiniblockProducerOpts{TestDisableMbProdcutionOnBlock: true})

		streamId, streamNodes, prevMb := tc.createReplStream()

		eventSize := 0
		for range eventCount {
			ev := tc.addReplEvent(streamId, prevMb, streamNodes)
			eventSize = max(len(ev.Envelope.Event), eventSize)
		}

		// set the max event size times 3, this should result in max 3 events per miniblock
		maxMiniblockEventsSize := maxEventsPerMiniblock * eventSize

		tc.btc.SetConfigValue(
			t,
			ctx,
			crypto.StreamReplicationFactorConfigKey,
			crypto.ABIEncodeInt64(int64(replFactor)),
		)

		tc.btc.SetConfigValue(
			t,
			ctx,
			crypto.StreamMaxTotalEventsSizePerMiniblockKey,
			crypto.ABIEncodeInt64(int64(maxMiniblockEventsSize)),
		)
		require.EqualValues(maxMiniblockEventsSize, tc.btc.OnChainConfig.Get().StreamMaxTotalEventsSizePerMiniblock)

		leaderAddr := streamNodes[0]
		leader := tc.instancesByAddr[leaderAddr]

		require.EventuallyWithT(func(collect *assert.CollectT) {
			mbProductionWithEventMaxSizeCheck(
				collect, leader, ctx, streamId, maxEventsPerMiniblock, maxMiniblockEventsSize, eventCount)
		}, 10*time.Second, 50*time.Millisecond)
	}

	t.Run("non-replicated", func(t *testing.T) { runTest(t, 1, 1) })
	t.Run("replicated", func(t *testing.T) { runTest(t, 3, 5) })
}

func mbProductionWithEventMaxSizeCheck(
	collect *assert.CollectT,
	leader *cacheTestInstance,
	ctx context.Context,
	streamId shared.StreamId,
	maxEventsPerMiniblock int,
	maxMiniblockEventsSize int,
	eventCount int,
) {
	stream, err := leader.cache.getStreamImpl(ctx, streamId, true)
	if err != nil {
		collect.Errorf("get stream failed %s", err)
		return
	}
	if !stream.IsLocal() {
		collect.Errorf("stream not local")
		return
	}

	job := leader.cache.mbProducer.trySchedule(ctx, stream, 0)
	if job == nil {
		collect.Errorf("try schedule returned nil job")
		return
	}

	dbMiniblocks, terminus, err := leader.params.Storage.ReadMiniblocks(ctx, streamId, 1, 100, false)
	if err != nil {
		collect.Errorf("read miniblocks failed %s", err)
		return
	}
	if terminus {
		collect.Errorf("terminus should be false when reading from 1")
		return
	}

	includedEvents := 0
	for _, dbMiniblock := range dbMiniblocks {
		var mb protocol.Miniblock
		if err = proto.Unmarshal(dbMiniblock.Data, &mb); err != nil {
			collect.Errorf("unmarshal miniblock failed %s", err)
			return
		}
		if len(mb.GetEvents()) > maxEventsPerMiniblock {
			collect.Errorf(
				"got %d events in miniblock, expected <= %d events",
				len(mb.GetEvents()),
				maxEventsPerMiniblock,
			)
			return
		}

		totalEventsSize := 0
		for _, ev := range mb.GetEvents() {
			totalEventsSize += len(ev.Event)
		}

		if totalEventsSize > maxMiniblockEventsSize {
			collect.Errorf("got total events size %d, expected <= %d", totalEventsSize, maxMiniblockEventsSize)
			return
		}

		includedEvents += len(mb.GetEvents())
	}

	if includedEvents != eventCount {
		collect.Errorf("got %d events in miniblocks, expected %d events", includedEvents, eventCount)
		return
	}
}

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
	job := leader.cache.mbProducer.trySchedule(ctx, stream, 0)
	require.NotNil(job)
	require.Eventually(
		func() bool {
			return leader.cache.mbProducer.testCheckDone(job)
		},
		10*time.Second,
		10*time.Millisecond,
	)

	leaderMBs, terminus, err := leader.params.Storage.ReadMiniblocks(ctx, streamId, 0, 100, false)
	require.NoError(err)
	require.Len(leaderMBs, 2)
	require.True(terminus)

	for _, n := range streamNodes[1:] {
		require.EventuallyWithT(
			func(tt *assert.CollectT) {
				mbs, terminus, err := tc.instancesByAddr[n].params.Storage.ReadMiniblocks(ctx, streamId, 0, 100, false)
				_ = assert.NoError(tt, err) && assert.Len(tt, mbs, 2) && assert.EqualValues(tt, leaderMBs, mbs) &&
					assert.True(tt, terminus)
			},
			5*time.Second,
			10*time.Millisecond,
		)
	}
}
