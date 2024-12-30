package events

import (
	"context"
	"fmt"
	"sync"
	"testing"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/stretchr/testify/require"

	"github.com/river-build/river/core/node/crypto"
	. "github.com/river-build/river/core/node/protocol"
	. "github.com/river-build/river/core/node/shared"
	"github.com/river-build/river/core/node/testutils"
)

func TestStreamCacheViewEviction(t *testing.T) {
	require := require.New(t)
	ctx, tc := makeCacheTestContext(t, testParams{})

	// disable auto stream cache cleanup, do cleanup manually
	tc.btc.SetConfigValue(t, ctx, crypto.StreamCacheExpirationPollIntervalMsConfigKey, crypto.ABIEncodeUint64(0))

	streamCache := tc.initCache(0, nil)

	require.Zero(streamCache.cache.Size(), "stream cache must be empty")

	node := tc.getBC()
	streamID := testutils.FakeStreamId(STREAM_SPACE_BIN)
	_, genesisMiniblock := makeTestSpaceStream(t, node.Wallet, streamID, nil)

	tc.createStreamNoCache(streamID, genesisMiniblock)

	streamSync, err := streamCache.GetStreamWaitForLocal(ctx, streamID)
	require.NoError(err, "loading stream record")
	streamView, err := streamSync.GetView(ctx)
	require.NoError(err)

	// stream just loaded and should be with view in cache
	streamWithoutLoadedView := 0
	streamWithLoadedViewCount := 0
	streamCache.cache.Range(func(key StreamId, value *streamImpl) bool {
		if value.view() == nil {
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
	streamCache.CacheCleanup(ctxShort, true, time.Millisecond)
	cancelShort()

	// cache must have view dropped even there is a subscriber
	streamWithoutLoadedView = 0
	streamWithLoadedViewCount = 0
	streamCache.cache.Range(func(key StreamId, value *streamImpl) bool {
		if value.view() == nil {
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
	streamCache.CacheCleanup(ctxShort, true, time.Millisecond)
	cancelShort()

	streamWithoutLoadedView = 0
	streamWithLoadedViewCount = 0
	streamCache.cache.Range(func(key StreamId, value *streamImpl) bool {
		if value.view() == nil {
			streamWithoutLoadedView++
		} else {
			streamWithLoadedViewCount++
		}
		return true
	})
	require.Equal(1, streamWithoutLoadedView, "stream cache must have 1 unloaded streams")
	require.Equal(0, streamWithLoadedViewCount, "stream cache must have ne loaded stream")

	// stream view must be loaded again in cache
	stream, err := streamCache.GetStreamWaitForLocal(ctx, streamID)
	require.NoError(err, "loading stream record")
	_, err = stream.GetView(ctx)
	require.NoError(err, "get view")
	streamWithoutLoadedView = 0
	streamWithLoadedViewCount = 0
	streamCache.cache.Range(func(key StreamId, value *streamImpl) bool {
		if value.view() == nil {
			streamWithoutLoadedView++
		} else {
			streamWithLoadedViewCount++
		}
		return true
	})
	require.Equal(0, streamWithoutLoadedView, "stream cache must have no unloaded streams")
	require.Equal(1, streamWithLoadedViewCount, "stream cache must have 1 loaded stream")
}

func TestCacheEvictionWithFilledMiniBlockPool(t *testing.T) {
	require := require.New(t)
	ctx, tc := makeCacheTestContext(t, testParams{})

	// disable auto stream cache cleanup, do cleanup manually
	tc.btc.SetConfigValue(t, ctx, crypto.StreamCacheExpirationPollIntervalMsConfigKey, crypto.ABIEncodeUint64(0))

	streamCache := tc.initCache(0, nil)

	require.Zero(streamCache.cache.Size(), "stream cache must be empty")

	node := tc.getBC()
	streamID := testutils.FakeStreamId(STREAM_SPACE_BIN)
	_, genesisMiniblock := makeTestSpaceStream(t, node.Wallet, streamID, nil)

	tc.createStreamNoCache(streamID, genesisMiniblock)

	streamSync, err := streamCache.GetStreamWaitForLocal(ctx, streamID)
	require.NoError(err, "loading stream record")
	_, err = streamSync.GetView(ctx)
	require.NoError(err, "get view")

	// stream just loaded and should have view loaded
	streamWithoutLoadedView := 0
	streamWithLoadedViewCount := 0
	streamCache.cache.Range(func(key StreamId, value *streamImpl) bool {
		if value.view() == nil {
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
	streamCache.CacheCleanup(ctxShort, true, time.Millisecond)
	cancelShort()
	loadedStream, _ := streamCache.cache.Load(streamID)
	require.Nil(loadedStream.view(), "view not unloaded")

	// try to create a miniblock, pool is empty so it should not fail but also should not create a miniblock
	_ = tc.makeMiniblock(0, streamID, false)

	// add event to stream with unloaded view, view should be loaded in cache and minipool must contain event
	addEventToStream(
		t,
		ctx,
		tc.instances[0].params,
		streamSync,
		"payload",
		&MiniblockRef{Hash: common.BytesToHash(genesisMiniblock.Header.Hash), Num: 0},
	)

	// with event in minipool ensure that view isn't evicted from cache
	time.Sleep(10 * time.Millisecond) // make sure we hit the cache expiration of 1 ms
	ctxShort, cancelShort = context.WithTimeout(ctx, 25*time.Millisecond)
	streamCache.CacheCleanup(ctxShort, true, time.Millisecond)
	cancelShort()
	loadedStream, _ = streamCache.cache.Load(streamID)
	require.NotNil(loadedStream.view(), "view unloaded")

	// now it should be possible to create a miniblock
	mbRef := tc.makeMiniblock(0, streamID, false)
	require.NotEqual(common.Hash{}, mbRef.Hash)
	require.Greater(mbRef.Num, int64(0))

	// minipool should be empty now and view should be evicted from cache
	time.Sleep(10 * time.Millisecond) // make sure we hit the cache expiration of 1 ms
	ctxShort, cancelShort = context.WithTimeout(ctx, 25*time.Millisecond)
	streamCache.CacheCleanup(ctxShort, true, time.Millisecond)
	cancelShort()
	loadedStream, _ = streamCache.cache.Load(streamID)
	require.Nil(loadedStream.view(), "view loaded in cache")
}

type testStreamCacheViewEvictionSub struct {
	receivedStreamAndCookies []*StreamAndCookie
	receivedErrors           []error
	streamErrors             []StreamId
}

func (sub *testStreamCacheViewEvictionSub) OnUpdate(sac *StreamAndCookie) {
	sub.receivedStreamAndCookies = append(sub.receivedStreamAndCookies, sac)
}

func (sub *testStreamCacheViewEvictionSub) OnSyncError(err error) {
	sub.receivedErrors = append(sub.receivedErrors, err)
}

func (sub *testStreamCacheViewEvictionSub) OnStreamSyncDown(streamID StreamId) {
	sub.streamErrors = append(sub.streamErrors, streamID)
}

func (sub *testStreamCacheViewEvictionSub) eventsReceived() int {
	count := 0
	for _, sac := range sub.receivedStreamAndCookies {
		count += len(sac.Events)
	}
	return count
}

// TODO: it seems this test takes at least 60 seconds, why?
func TestStreamMiniblockBatchProduction(t *testing.T) {
	require := require.New(t)
	ctx, tc := makeCacheTestContext(t, testParams{disableMineOnTx: true})
	btc := tc.btc

	// disable auto stream cache cleanup, do cleanup manually
	tc.btc.SetConfigValue(t, ctx, crypto.StreamCacheExpirationPollIntervalMsConfigKey, crypto.ABIEncodeUint64(0))

	streamCache := tc.initCache(0, nil)

	streamCache.cache.Range(func(key StreamId, value *streamImpl) bool {
		require.Fail("stream cache must be empty")
		return true
	})

	// the stream cache uses the chain block production as a ticker to create new mini-blocks.
	// after initialization take back control when to create new chain blocks.
	streamsCount := 4*MiniblockCandidateBatchSize - 5
	genesisBlocks := tc.allocateStreams(streamsCount)

	// add events to ~50% of the streams
	streamsWithEvents := make(map[StreamId]int)
	var mu sync.Mutex
	var wg sync.WaitGroup
	for streamID, genesis := range genesisBlocks {
		wg.Add(1)
		go func(streamID StreamId, genesis *Miniblock) {
			defer wg.Done()

			streamSync, err := streamCache.getStreamImpl(ctx, streamID, true)
			require.NoError(err, "get stream")

			// unload view for half of the streams
			if streamID[1]%2 == 1 {
				ss := streamSync
				ss.tryCleanup(time.Duration(0))
			}

			// only add events to half of the streams
			if streamID[2]%2 == 1 {
				return
			}

			// add several events to the stream
			numToAdd := 1 + int(streamID[3]%50)
			for i := range numToAdd {
				addEventToStream(t, ctx, streamCache.params, streamSync,
					fmt.Sprintf("msg# %d", i), &MiniblockRef{Hash: common.BytesToHash(genesis.Header.Hash), Num: 0})
			}

			mu.Lock()
			defer mu.Unlock()
			streamsWithEvents[streamID] = numToAdd
		}(streamID, genesis)
	}
	wg.Wait()

	if t.Failed() {
		t.FailNow()
	}

	require.Eventually(
		func() bool {
			// on block makes the stream cache to walk over streams and create miniblocks for those that are eligible
			btc.Commit(ctx)

			// quit loop when all added events are included in mini-blocks
			miniblocksProduced := 0
			for streamID := range genesisBlocks {
				stream, err := streamCache.GetStreamWaitForLocal(ctx, streamID)
				require.NoError(err, "get stream")
				view, err := stream.GetView(ctx)
				require.NoError(err, "get view")

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
			return miniblocksProduced == len(genesisBlocks)
		},
		240*time.Second,
		100*time.Millisecond,
	)
}

func isCacheEmpty(streamCache *streamCacheImpl) bool {
	return streamCache.cache.Size() == 0
}

func cleanUpCache(streamCache *streamCacheImpl) bool {
	cleanedUp := true
	streamCache.cache.Range(func(key StreamId, streamVal *streamImpl) bool {
		cleanedUp = cleanedUp && streamVal.tryCleanup(0)
		return true
	})
	return cleanedUp
}

func areAllViewsDropped(streamCache *streamCacheImpl) bool {
	allDropped := true
	streamCache.cache.Range(func(key StreamId, streamVal *streamImpl) bool {
		st := streamVal.getStatus()
		allDropped = allDropped && !st.loaded
		return true
	})
	return allDropped
}

// TODO: temp disable flaky test. Passes locally, often fails on CI.
func Disabled_TestStreamUnloadWithSubscribers(t *testing.T) {
	require := require.New(t)
	ctx, tc := makeCacheTestContext(t, testParams{})

	// disable auto stream cache cleanup, do cleanup manually
	tc.btc.SetConfigValue(t, ctx, crypto.StreamCacheExpirationPollIntervalMsConfigKey, crypto.ABIEncodeUint64(0))

	// replace the default chain monitor to disable automatic mini-block production on new blocks in the stream cache
	// TODO: use options on MiniblockProducer instead
	tc.instances[0].params.ChainMonitor = crypto.NoopChainMonitor{}

	streamCache := tc.initCache(0, nil)

	require.True(isCacheEmpty(streamCache), "stream cache must be empty")

	const streamsCount = 5

	var (
		node                  = tc.getBC()
		genesisBlocks         = tc.allocateStreams(streamsCount)
		syncCookies           = make(map[StreamId]*SyncCookie)
		subscriptionReceivers = make(map[StreamId]*testStreamCacheViewEvictionSub)
	)

	// obtain sync cookies for allocated streams
	for streamID := range genesisBlocks {
		// get sync cookies so we can start from somewhere
		stream, err := streamCache.GetStreamWaitForLocal(ctx, streamID)
		require.NoError(err, "get stream")
		streamView, err := stream.GetView(ctx)
		require.NoError(err, "get view")
		syncCookies[streamID] = streamView.SyncCookie(node.Wallet.Address)
	}

	blockNum, err := node.GetBlockNumber(ctx)
	require.NoError(err, "get block number")
	tc.instances[0].params.AppliedBlockNum = blockNum

	// create fresh stream cache and subscribe
	streamCache = NewStreamCache(ctx, tc.instances[0].params)
	err = streamCache.Start(ctx)
	require.NoError(err, "instantiating stream cache")
	mpProducer := NewMiniblockProducer(ctx, streamCache, tc.btc.OnChainConfig, &MiniblockProducerOpts{TestDisableMbProdcutionOnBlock: true})

	for streamID, syncCookie := range syncCookies {
		streamSync, err := streamCache.GetStreamWaitForLocal(ctx, streamID)
		require.NoError(err, "get sync stream")
		subscriptionReceivers[streamID] = new(testStreamCacheViewEvictionSub)
		err = streamSync.Sub(ctx, syncCookie, subscriptionReceivers[streamID])
		require.NoError(err, "sub stream")
	}

	// when subscribing to a stream the view is loaded to validate the request. It can be dropped afterward.
	require.True(cleanUpCache(streamCache))
	require.True(areAllViewsDropped(streamCache))

	// add events to the first 2 streams and ensure that the receiver is notified even when the stream view is dropped.
	var (
		count                = 0
		streamsWithEvents    = make(map[StreamId]int)
		streamsWithoutEvents = make(map[StreamId]int)
	)

	for streamID, genesis := range genesisBlocks {
		count++
		if count < 2 {
			streamSync, err := streamCache.GetStreamWaitForLocal(ctx, streamID)
			require.NoError(err, "get sync stream")
			for i := 0; i < 1+int(streamID[3]%50); i++ {
				addEventToStream(t, ctx, streamCache.params, streamSync,
					fmt.Sprintf("msg# %d", i), &MiniblockRef{Hash: common.BytesToHash(genesis.Header.Hash), Num: 0})
			}
			streamsWithEvents[streamID] = 1 + int(streamID[3]%50)
		} else {
			streamsWithoutEvents[streamID] = 0
		}
	}

	// ensure that subscribers received events even when their view is dropped
	for streamID, expectedEventCount := range streamsWithEvents {
		subscriber := subscriptionReceivers[streamID]
		gotEventCount := subscriber.eventsReceived()
		require.Nilf(subscriber.receivedErrors, "subscriber received error: %s", subscriber.receivedErrors)
		require.Equal(expectedEventCount, gotEventCount, "subscriber unexpected event count")
	}

	// make all mini-blocks to process all events in minipool
	jobs := mpProducer.scheduleCandidates(ctx, blockNum)
	require.Eventually(
		func() bool { return mpProducer.testCheckAllDone(jobs) },
		240*time.Second,
		10*time.Millisecond,
	)

	// ensure that streams can be dropped again
	require.True(cleanUpCache(streamCache))

	// make sure that all views are dropped
	require.True(areAllViewsDropped(streamCache))
}
