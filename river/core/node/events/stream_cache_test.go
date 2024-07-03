package events

import (
	"context"
	"fmt"
	"testing"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/river-build/river/core/node/crypto"
	"github.com/river-build/river/core/node/protocol"
	"github.com/river-build/river/core/node/shared"
	"github.com/river-build/river/core/node/testutils"
	"github.com/stretchr/testify/require"
)

func TestStreamCacheViewEviction(t *testing.T) {
	t.Run("SingleBlockRegistration", func(t *testing.T) {
		testStreamCacheViewEviction(t, false)
	})

	t.Run("BatchBlockRegistration", func(t *testing.T) {
		testStreamCacheViewEviction(t, true)
	})
}

func TestCacheEvictionWithFilledMiniBlockPool(t *testing.T) {
	t.Run("SingleBlockRegistration", func(t *testing.T) {
		testCacheEvictionWithFilledMiniBlockPool(t, false)
	})

	t.Run("BatchBlockRegistration", func(t *testing.T) {
		testCacheEvictionWithFilledMiniBlockPool(t, true)
	})
}

// TestStreamMiniblockBatchProduction ensures that all mini-blocks are registered when mini-blocks are registered in
// batches.
func DisabledTestStreamMiniblockBatchProduction(t *testing.T) {
	t.Run("SingleBlockRegistration", func(t *testing.T) {
		testStreamMiniblockBatchProduction(t, false)
	})

	t.Run("BatchBlockRegistration", func(t *testing.T) {
		testStreamMiniblockBatchProduction(t, true)
	})
}

func testStreamCacheViewEviction(t *testing.T, useBatchRegistration bool) {
	require := require.New(t)
	ctx, tc := makeTestStreamParams(t, testParams{})
	defer tc.closer()

	// disable auto stream cache cleanup, do cleanup manually
	tc.bcTest.SetConfigValue(t, ctx, crypto.StreamCacheExpirationPollIntervalMsConfigKey, crypto.ABIEncodeUint64(0))

	streamCache := tc.initCache(ctx)
	streamCache.registerMiniBlocksBatched = useBatchRegistration

	streamCache.cache.Range(func(key, value any) bool {
		require.Fail("stream cache must be empty")
		return true
	})

	node := tc.getBC()
	streamID := testutils.FakeStreamId(shared.STREAM_SPACE_BIN)
	_, genesisMiniblock := makeTestSpaceStream(t, node.Wallet, streamID, nil)

	require.NoError(tc.createStreamNoCache(ctx, streamID, genesisMiniblock))

	streamSync, streamView, err := streamCache.GetStream(ctx, streamID)
	require.NoError(err, "loading stream record")

	// stream just loaded and should be with view in cache
	streamWithoutLoadedView := 0
	streamWithLoadedViewCount := 0
	streamCache.cache.Range(func(key, value any) bool {
		stream := value.(*streamImpl)
		if stream.view == nil {
			streamWithoutLoadedView++
		} else {
			streamWithLoadedViewCount++
		}
		return true
	})
	require.Equal(0, streamWithoutLoadedView, "stream cache must have no unloaded streams")
	require.Equal(1, streamWithLoadedViewCount, "stream cache must have one loaded stream")

	// views of inactive stream must be dropped, even if there are subscribers
	receiver := &testStreamCacheViewEvictionSub{}
	syncCookie := streamView.SyncCookie(node.Wallet.Address)

	err = streamSync.Sub(ctx, syncCookie, receiver)
	require.NoError(err, "subscribe to stream")

	time.Sleep(10 * time.Millisecond) // make sure we hit the cache expiration of 1 ms
	ctxShort, cancelShort := context.WithTimeout(ctx, 25*time.Millisecond)
	streamCache.cacheCleanup(ctxShort, true, time.Millisecond)
	cancelShort()

	// cache must have view dropped even there is a subscriber
	streamWithoutLoadedView = 0
	streamWithLoadedViewCount = 0
	streamCache.cache.Range(func(key, value any) bool {
		stream := value.(*streamImpl)
		if stream.view == nil {
			streamWithoutLoadedView++
		} else {
			streamWithLoadedViewCount++
		}
		return true
	})
	require.Equal(1, streamWithoutLoadedView, "stream cache must have 1 unloaded streams")
	require.Equal(0, streamWithLoadedViewCount, "stream cache must have no loaded stream")

	// unsubscribe from stream should not change which stream views are loaded/unloaded
	streamSync.Unsub(receiver)

	// no subscribers anymore so its view must be dropped from cache
	time.Sleep(10 * time.Millisecond) // make sure we hit the cache expiration of 1 ms
	ctxShort, cancelShort = context.WithTimeout(ctx, 25*time.Millisecond)
	streamCache.cacheCleanup(ctxShort, true, time.Millisecond)
	cancelShort()

	streamWithoutLoadedView = 0
	streamWithLoadedViewCount = 0
	streamCache.cache.Range(func(key, value any) bool {
		stream := value.(*streamImpl)
		if stream.view == nil {
			streamWithoutLoadedView++
		} else {
			streamWithLoadedViewCount++
		}
		return true
	})
	require.Equal(1, streamWithoutLoadedView, "stream cache must have 1 unloaded streams")
	require.Equal(0, streamWithLoadedViewCount, "stream cache must have ne loaded stream")

	// stream view must be loaded again in cache
	_, _, err = streamCache.GetStream(ctx, streamID)
	require.NoError(err, "loading stream record")
	streamWithoutLoadedView = 0
	streamWithLoadedViewCount = 0
	streamCache.cache.Range(func(key, value any) bool {
		stream := value.(*streamImpl)
		if stream.view == nil {
			streamWithoutLoadedView++
		} else {
			streamWithLoadedViewCount++
		}
		return true
	})
	require.Equal(0, streamWithoutLoadedView, "stream cache must have no unloaded streams")
	require.Equal(1, streamWithLoadedViewCount, "stream cache must have 1 loaded stream")
}

func testCacheEvictionWithFilledMiniBlockPool(t *testing.T, useBatchRegistration bool) {
	require := require.New(t)
	ctx, tc := makeTestStreamParams(t, testParams{})
	defer tc.closer()

	// disable auto stream cache cleanup, do cleanup manually
	tc.bcTest.SetConfigValue(t, ctx, crypto.StreamCacheExpirationPollIntervalMsConfigKey, crypto.ABIEncodeUint64(0))

	streamCache := tc.initCache(ctx)
	streamCache.registerMiniBlocksBatched = useBatchRegistration

	streamCache.cache.Range(func(key, value any) bool {
		require.Fail("stream cache must be empty")
		return true
	})

	node := tc.getBC()
	streamID := testutils.FakeStreamId(shared.STREAM_SPACE_BIN)
	_, genesisMiniblock := makeTestSpaceStream(t, node.Wallet, streamID, nil)

	require.NoError(tc.createStreamNoCache(ctx, streamID, genesisMiniblock))

	streamSync, _, err := streamCache.GetStream(ctx, streamID)
	require.NoError(err, "loading stream record")

	// stream just loaded and should have view loaded
	streamWithoutLoadedView := 0
	streamWithLoadedViewCount := 0
	streamCache.cache.Range(func(key, value any) bool {
		stream := value.(*streamImpl)
		if stream.view == nil {
			streamWithoutLoadedView++
		} else {
			streamWithLoadedViewCount++
		}
		return true
	})
	require.Equal(0, streamWithoutLoadedView, "stream cache must have no unloaded streams")
	require.Equal(1, streamWithLoadedViewCount, "stream cache must have one loaded stream")

	// ensure that view is dropped from cache
	time.Sleep(10 * time.Millisecond) // make sure we hit the cache expiration of 1 ms
	ctxShort, cancelShort := context.WithTimeout(ctx, 25*time.Millisecond)
	streamCache.cacheCleanup(ctxShort, true, time.Millisecond)
	cancelShort()
	loadedStream, _ := streamCache.cache.Load(streamID)
	require.Nil(loadedStream.(*streamImpl).view, "view not unloaded")

	// try to create a miniblock, pool is empty so it should not fail but also should not create a miniblock
	_, _, err = streamSync.TestMakeMiniblock(ctx, false, -1)
	require.NoError(err, "make miniblock")

	// add event to stream with unloaded view, view should be loaded in cache and minipool must contain event
	addEvent(t, ctx, tc.params, streamSync, "payload", common.BytesToHash(genesisMiniblock.Header.Hash))

	// with event in minipool ensure that view isn't evicted from cache
	time.Sleep(10 * time.Millisecond) // make sure we hit the cache expiration of 1 ms
	ctxShort, cancelShort = context.WithTimeout(ctx, 25*time.Millisecond)
	streamCache.cacheCleanup(ctxShort, true, time.Millisecond)
	cancelShort()
	loadedStream, _ = streamCache.cache.Load(streamID)
	require.NotNil(loadedStream.(*streamImpl).view, "view unloaded")

	// now it should be possible to create a miniblock
	blockHash, blockNum, err := streamSync.TestMakeMiniblock(ctx, false, -1)
	require.NoError(err)
	require.NotEqual(common.Hash{}, blockHash)
	require.Greater(blockNum, int64(0))

	// minipool should be empty now and view should be evicted from cache
	time.Sleep(10 * time.Millisecond) // make sure we hit the cache expiration of 1 ms
	ctxShort, cancelShort = context.WithTimeout(ctx, 25*time.Millisecond)
	streamCache.cacheCleanup(ctxShort, true, time.Millisecond)
	cancelShort()
	loadedStream, _ = streamCache.cache.Load(streamID)
	require.Nil(loadedStream.(*streamImpl).view, "view loaded in cache")
}

type testStreamCacheViewEvictionSub struct {
	receivedStreamAndCookies []*protocol.StreamAndCookie
	receivedErrors           []error
}

func (sub *testStreamCacheViewEvictionSub) OnUpdate(sac *protocol.StreamAndCookie) {
	sub.receivedStreamAndCookies = append(sub.receivedStreamAndCookies, sac)
}

func (sub *testStreamCacheViewEvictionSub) OnSyncError(err error) {
	sub.receivedErrors = append(sub.receivedErrors, err)
}

func testStreamMiniblockBatchProduction(t *testing.T, useBatchRegistration bool) {
	require := require.New(t)
	ctx, tc := makeTestStreamParams(t, testParams{})
	defer tc.closer()
	btc := tc.bcTest

	// disable auto stream cache cleanup, do cleanup manually
	tc.bcTest.SetConfigValue(t, ctx, crypto.StreamCacheExpirationPollIntervalMsConfigKey, crypto.ABIEncodeUint64(0))

	streamCache := tc.initCache(ctx)
	streamCache.registerMiniBlocksBatched = useBatchRegistration

	streamCache.cache.Range(func(key, value any) bool {
		require.Fail("stream cache must be empty")
		return true
	})

	// the stream cache uses the chain block production as a ticker to create new mini-blocks.
	// after initialization take back control when to create new chain blocks.
	// TODO: this handler is gone, refactor
	// btc.DeployerBlockchain.TxPool.SetOnSubmitHandler(nil)
	streamsCount := 10*MiniblockCandidateBatchSize - 1
	genesisBlocks := allocateStreams(t, ctx, tc, streamsCount)
	streamsWithEvents := make(map[shared.StreamId]int)

	// add events to ~50% of the streams
	for streamID, genesis := range genesisBlocks {
		streamSync, err := streamCache.GetSyncStream(ctx, streamID)
		require.NoError(err, "get stream")

		// unload view for half of the streams
		if streamID[1]%2 == 1 {
			ss := streamSync.(*streamImpl)
			ss.tryCleanup(time.Duration(0))
		}

		// only add events to half of the streams
		if streamID[2]%2 == 1 {
			continue
		}

		// add several events to the stream
		for i := 0; i < 1+int(streamID[3]%50); i++ {
			addEvent(t, ctx, streamCache.params, streamSync,
				fmt.Sprintf("msg# %d", i), common.BytesToHash(genesis.Header.Hash))
		}
		streamsWithEvents[streamID] = 1 + int(streamID[3]%50)
	}

	for {
		// on block makes the stream cache to walk over streams and create miniblocks for those that are eligible
		btc.Commit(ctx)

		// quit loop when all added events are included in mini-blocks
		miniblocksProduced := 0
		for streamID := range genesisBlocks {
			stream, view, err := streamCache.GetStream(ctx, streamID)
			require.NoError(err, "get stream")

			var (
				expStreamEventsCount = len(genesisBlocks[streamID].Events) + streamsWithEvents[streamID]
				gotStreamEventsCount = 0
			)

			syncCookie := view.SyncCookie(tc.getBC().Wallet.Address)
			require.NotNil(syncCookie, "sync cookie")

			miniblocks, _, err := stream.GetMiniblocks(ctx, 0, syncCookie.MinipoolGen)
			require.NoError(err, "get miniblocks")

			for _, mb := range miniblocks {
				gotStreamEventsCount += len(mb.Events)
			}

			if expStreamEventsCount == gotStreamEventsCount {
				miniblocksProduced++
			}
		}

		// all streams with events added have a new block after genesis
		if miniblocksProduced == len(genesisBlocks) {
			break
		}

		<-time.After(time.Second)
	}
}

func TestStreamUnloadWithSubscribers(t *testing.T) {
	t.Parallel()

	require := require.New(t)
	ctx, tc := makeTestStreamParams(t, testParams{})
	defer tc.closer()

	// disable auto stream cache cleanup, do cleanup manually
	tc.bcTest.SetConfigValue(t, ctx, crypto.StreamCacheExpirationPollIntervalMsConfigKey, crypto.ABIEncodeUint64(0))

	// replace the default chain monitor to disable automatic mini-block production on new blocks in the stream cache
	tc.params.ChainMonitor = crypto.NoopChainMonitor{}

	streamCache := tc.initCache(ctx)
	streamCache.registerMiniBlocksBatched = true

	streamCache.cache.Range(func(key, value any) bool {
		require.Fail("stream cache must be empty")
		return true
	})

	var (
		streamsCount = 5
		cleanUpCache = func(streamCache *streamCacheImpl, expOutcome bool) {
			streamCache.cache.Range(func(key, streamVal any) bool {
				stream := streamVal.(*streamImpl)
				require.Equal(expOutcome, stream.tryCleanup(0), "stream cleanup")
				return true
			})
		}
		ensureAllViewsAreDropped = func(streamCache *streamCacheImpl) {
			// make sure that for no view is loaded for any of the streams
			streamCache.cache.Range(func(key, value any) bool {
				stream := value.(*streamImpl)
				require.Nil(stream.view, "stream view loaded")
				return true
			})
		}
	)

	// the stream cache uses the chain block production as a ticker to create new mini-blocks.
	// after initialization take back control when to create new chain blocks.
	// TODO: this handler is gone, refactor
	// btc.DeployerBlockchain.TxPool.SetOnSubmitHandler(nil)

	var (
		node                  = tc.getBC()
		genesisBlocks         = allocateStreams(t, ctx, tc, streamsCount)
		syncCookies           = make(map[shared.StreamId]*protocol.SyncCookie)
		subscriptionReceivers = make(map[shared.StreamId]*testStreamCacheViewEvictionSub)
		eventsReceived        = func(sub *testStreamCacheViewEvictionSub) int {
			count := 0
			for _, sac := range sub.receivedStreamAndCookies {
				count += len(sac.Events)
			}
			return count
		}
	)

	// obtain sync cookies for allocated streams
	for streamID := range genesisBlocks {
		// get sync cookies so we can start from somewhere
		_, streamView, err := streamCache.GetStream(ctx, streamID)
		require.NoError(err, "get stream")
		syncCookies[streamID] = streamView.SyncCookie(node.Wallet.Address)
	}

	blockNum, err := node.GetBlockNumber(ctx)
	require.NoError(err, "get block number")
	tc.params.AppliedBlockNum = blockNum

	// create fresh stream cache and subscribe
	streamCache, err = NewStreamCache(ctx, tc.params)
	require.NoError(err, "instantiating stream cache")
	streamCache.registerMiniBlocksBatched = true

	for streamID, syncCookie := range syncCookies {
		streamSync, err := streamCache.GetSyncStream(ctx, streamID)
		require.NoError(err, "get sync stream")
		subscriptionReceivers[streamID] = new(testStreamCacheViewEvictionSub)
		err = streamSync.Sub(ctx, syncCookie, subscriptionReceivers[streamID])
		require.NoError(err, "sub stream")
	}

	// when subscribing to a stream the view is loaded to validate the request. It can be dropped afterward.
	cleanUpCache(streamCache, true)
	ensureAllViewsAreDropped(streamCache)

	// add events to the first 2 streams and ensure that the receiver is notified even when the stream view is dropped.
	var (
		count                = 0
		streamsWithEvents    = make(map[shared.StreamId]int)
		streamsWithoutEvents = make(map[shared.StreamId]int)
	)

	for streamID, genesis := range genesisBlocks {
		count++
		if count < 2 {
			streamSync, err := streamCache.GetSyncStream(ctx, streamID)
			require.NoError(err, "get sync stream")
			for i := 0; i < 1+int(streamID[3]%50); i++ {
				addEvent(t, ctx, streamCache.params, streamSync,
					fmt.Sprintf("msg# %d", i), common.BytesToHash(genesis.Header.Hash))
			}
			streamsWithEvents[streamID] = 1 + int(streamID[3]%50)
		} else {
			streamsWithoutEvents[streamID] = 0
		}
	}

	// ensure that subscribers received events even when their view is dropped
	for streamID, expectedEventCount := range streamsWithEvents {
		subscriber := subscriptionReceivers[streamID]
		gotEventCount := eventsReceived(subscriber)
		require.Nilf(subscriber.receivedErrors, "subscriber received error: %s", subscriber.receivedErrors)
		require.Equal(expectedEventCount, gotEventCount, "subscriber unexpected event count")
	}

	// make all mini-blocks to process all events in minipool
	streamCache.onNewBlockBatch(ctx)

	// ensure that streams can be dropped again
	streamCache.cache.Range(func(streamID, streamVal any) bool {
		stream := streamVal.(*streamImpl)
		stream.tryCleanup(0)
		return true
	})

	// make sure that all views are dropped
	ensureAllViewsAreDropped(streamCache)
}

func allocateStreams(
	t *testing.T,
	ctx context.Context,
	tt *testContext,
	count int,
) map[shared.StreamId]*protocol.Miniblock {
	var (
		require       = require.New(t)
		genesisBlocks = make(map[shared.StreamId]*protocol.Miniblock)
	)

	for i := 0; i < count; i++ {
		streamID := testutils.FakeStreamId(shared.STREAM_SPACE_BIN)
		mb := MakeGenesisMiniblockForSpaceStream(t, tt.getBC().Wallet, streamID)
		err := tt.createStreamNoCache(ctx, streamID, mb)
		require.NoError(err, "create stream")
		genesisBlocks[streamID] = mb
	}

	return genesisBlocks
}
