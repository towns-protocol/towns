package events

import (
	"context"
	"fmt"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/stretchr/testify/require"
	"google.golang.org/protobuf/types/known/emptypb"

	"github.com/towns-protocol/towns/core/blockchain"
	"github.com/towns-protocol/towns/core/contracts/river"
	"github.com/towns-protocol/towns/core/node/crypto"
	. "github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/testutils"
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
	streamCache.cache.Range(func(key StreamId, value *Stream) bool {
		if value.getViewLocked() == nil {
			streamWithoutLoadedView++
		} else {
			streamWithLoadedViewCount++
		}
		return true
	})
	require.Equal(0, streamWithoutLoadedView, "stream cache must have no unloaded streams")
	require.Equal(1, streamWithLoadedViewCount, "stream cache must have one loaded stream")

	// views of inactive stream must be dropped, even if there are subscribers
	receiver := &testSubscriber{}
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
	streamCache.cache.Range(func(key StreamId, value *Stream) bool {
		if value.getViewLocked() == nil {
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
	streamCache.cache.Range(func(key StreamId, value *Stream) bool {
		if value.getViewLocked() == nil {
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
	streamCache.cache.Range(func(key StreamId, value *Stream) bool {
		if value.getViewLocked() == nil {
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
	streamCache.cache.Range(func(key StreamId, value *Stream) bool {
		if value.getViewLocked() == nil {
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
	require.Nil(loadedStream.getViewLocked(), "view not unloaded")

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
		false,
	)

	// with event in minipool ensure that view isn't evicted from cache
	time.Sleep(10 * time.Millisecond) // make sure we hit the cache expiration of 1 ms
	ctxShort, cancelShort = context.WithTimeout(ctx, 25*time.Millisecond)
	streamCache.CacheCleanup(ctxShort, true, time.Millisecond)
	cancelShort()
	loadedStream, _ = streamCache.cache.Load(streamID)
	require.NotNil(loadedStream.getViewLocked(), "view unloaded")

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
	require.Nil(loadedStream.getViewLocked(), "view loaded in cache")
}

// TODO: it seems this test takes at least 60 seconds, why?
func TestStreamMiniblockBatchProduction(t *testing.T) {
	require := require.New(t)
	ctx, tc := makeCacheTestContext(t, testParams{disableMineOnTx: true})
	btc := tc.btc

	// disable auto stream cache cleanup, do cleanup manually
	tc.btc.SetConfigValue(t, ctx, crypto.StreamCacheExpirationPollIntervalMsConfigKey, crypto.ABIEncodeUint64(0))

	streamCache := tc.initCache(0, nil)

	streamCache.cache.Range(func(key StreamId, value *Stream) bool {
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
				addEventToStream(
					t,
					ctx,
					streamCache.params,
					streamSync,
					fmt.Sprintf(
						"msg# %d",
						i,
					),
					&MiniblockRef{Hash: common.BytesToHash(genesis.Header.Hash), Num: 0},
					false,
				)
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

				miniblocks, _, err := stream.GetMiniblocks(ctx, 0, syncCookie.MinipoolGen, true)
				require.NoError(err, "get miniblocks")

				for _, mb := range miniblocks {
					gotStreamEventsCount += len(mb.Proto.Events)
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

func isCacheEmpty(streamCache *StreamCache) bool {
	return streamCache.cache.Size() == 0
}

func cleanUpCache(streamCache *StreamCache) bool {
	cleanedUp := true
	streamCache.cache.Range(func(key StreamId, streamVal *Stream) bool {
		cleanedUp = cleanedUp && streamVal.tryCleanup(0)
		return true
	})
	return cleanedUp
}

func areAllViewsDropped(streamCache *StreamCache) bool {
	allDropped := true
	streamCache.cache.Range(func(key StreamId, streamVal *Stream) bool {
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
		subscriptionReceivers = make(map[StreamId]*testSubscriber)
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
	streamCache = NewStreamCache(tc.instances[0].params)
	err = streamCache.Start(ctx, &MiniblockProducerOpts{TestDisableMbProdcutionOnBlock: true})
	require.NoError(err, "instantiating stream cache")

	for streamID, syncCookie := range syncCookies {
		streamSync, err := streamCache.GetStreamWaitForLocal(ctx, streamID)
		require.NoError(err, "get sync stream")
		subscriptionReceivers[streamID] = new(testSubscriber)
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
				addEventToStream(
					t,
					ctx,
					streamCache.params,
					streamSync,
					fmt.Sprintf(
						"msg# %d",
						i,
					),
					&MiniblockRef{Hash: common.BytesToHash(genesis.Header.Hash), Num: 0},
					false,
				)
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
		require.Nilf(subscriber.streamErrors, "subscriber received error: %s", subscriber.streamErrors)
		require.Equal(expectedEventCount, gotEventCount, "subscriber unexpected event count")
	}

	// make all mini-blocks to process all events in minipool
	jobs := streamCache.mbProducer.scheduleCandidates(ctx, blockNum)
	require.Eventually(
		func() bool { return streamCache.mbProducer.testCheckAllDone(jobs) },
		240*time.Second,
		10*time.Millisecond,
	)

	// ensure that streams can be dropped again
	require.True(cleanUpCache(streamCache))

	// make sure that all views are dropped
	require.True(areAllViewsDropped(streamCache))
}

// TestMiniblockRegistrationWithPendingLocalCandidate tests that the node can recover from a situation where it tries to
// register a miniblock candidate but fails because the candidate was already registered but the confirmation receipt
// was
// missed before and therefore the candidate was never promoted.
func TestMiniblockRegistrationWithPendingLocalCandidate(t *testing.T) {
	ctx, tt := makeCacheTestContext(t, testParams{replFactor: 1, disableStreamCacheCallbacks: true})
	_ = tt.initCache(0, &MiniblockProducerOpts{TestDisableMbProdcutionOnBlock: true})
	require := require.New(t)
	instance := tt.instances[0]
	mbProducer := instance.cache.mbProducer

	// through disableCallback the test can control if the stream cache witnesses river chain events.
	var disableCallbacks atomic.Bool
	instance.params.ChainMonitor.OnBlockWithLogs(instance.params.AppliedBlockNum+1,
		func(ctx context.Context, blockNumber blockchain.BlockNumber, logs []*types.Log) {
			if !disableCallbacks.Load() {
				mbProducer.onNewBlock(ctx, blockNumber)
				instance.cache.onBlockWithLogs(ctx, blockNumber, logs)
			}
		})

	spaceStreamId := testutils.FakeStreamId(STREAM_SPACE_BIN)
	genesisMb := MakeGenesisMiniblockForSpaceStream(
		t,
		instance.params.Wallet,
		instance.params.Wallet,
		spaceStreamId,
		nil,
	)
	stream, view := tt.createStream(spaceStreamId, genesisMb.Proto)

	// advance the stream with some miniblocks
	var producedMiniBlockRef *MiniblockRef
	for i := range 2 {
		addEventToStream(t, ctx, instance.params, stream, fmt.Sprintf("%d", i*2), view.LastBlock().Ref, false)
		addEventToStream(t, ctx, instance.params, stream, fmt.Sprintf("%d", 1+(i*2)), view.LastBlock().Ref, false)

		var err error
		producedMiniBlockRef, err = mbProducer.TestMakeMiniblock(ctx, spaceStreamId, false)
		require.NoError(err)
		require.Equal(int64(i+1), producedMiniBlockRef.Num)
	}

	// make sure that the stream is on the latest mini-block and the mb producer hasn't got pending candidates.
	require.Eventually(func() bool {
		view, err := stream.GetView(ctx)
		require.NoError(err)
		lastBlock := view.LastBlock()

		mbProducer.candidates.mu.Lock()
		nCandidates := len(mbProducer.candidates.candidates)
		mbProducer.candidates.mu.Unlock()

		return nCandidates == 0 && lastBlock.Ref.Hash == producedMiniBlockRef.Hash
	}, 10*time.Second, 100*time.Millisecond)

	// disable the event callback to simulate the scenario where the mb producer misses river chain events.
	disableCallbacks.Store(true)

	// create a new candidate with 2 events in it and store it in the node storage.
	view, err := stream.GetView(ctx)
	require.NoError(err)
	lastBlock := view.LastBlock()

	event1 := MakeEvent(
		t, instance.params.Wallet, Make_MemberPayload_Username(&EncryptedData{Ciphertext: "A"}), false, lastBlock.Ref)

	event2 := MakeEvent(
		t, instance.params.Wallet, Make_MemberPayload_Username(&EncryptedData{Ciphertext: "B"}), false, lastBlock.Ref)

	candidateHeader := &MiniblockHeader{
		MiniblockNum:             lastBlock.Ref.Num + 1,
		Timestamp:                NextMiniblockTimestamp(lastBlock.Header().Timestamp),
		EventHashes:              [][]byte{event1.Hash.Bytes(), event2.Hash.Bytes()},
		PrevMiniblockHash:        lastBlock.headerEvent.Hash[:],
		EventNumOffset:           0,
		PrevSnapshotMiniblockNum: view.LastBlock().Header().GetPrevSnapshotMiniblockNum(),
		Content: &MiniblockHeader_None{
			None: &emptypb.Empty{},
		},
	}

	candidate, err := NewMiniblockInfoFromHeaderAndParsed(
		instance.params.Wallet, candidateHeader, []*ParsedEvent{event1, event2}, nil,
	)
	require.NoError(err)

	storageMb, err := candidate.AsStorageMb()
	require.NoError(err)

	err = instance.params.Storage.WriteMiniblockCandidate(ctx, spaceStreamId, storageMb)
	require.NoError(err)

	// bypass the mini-block producer and register candidate in the stream facet
	req := []river.SetMiniblock{{
		StreamId:          spaceStreamId,
		PrevMiniBlockHash: common.BytesToHash(candidateHeader.GetPrevMiniblockHash()),
		LastMiniblockHash: candidate.Ref.Hash,
		LastMiniblockNum:  uint64(candidate.Ref.Num),
		IsSealed:          false,
	}}

	success, invalidMiniBlocks, failed, err := instance.params.Registry.SetStreamLastMiniblockBatch(ctx, req)
	require.NoError(err)
	require.Equal([]StreamId{spaceStreamId}, success)
	require.Empty(invalidMiniBlocks)
	require.Empty(failed)

	// makes sure that stream advanced in stream facet to candidate but local stream is still on the prev mini-block
	// because the candidate was not promoted because the node never witnessed the set stream event.
	riverChainBlockNum, err := instance.params.RiverChain.Client.BlockNumber(ctx)
	require.NoError(err)
	getStream, err := instance.params.Registry.StreamRegistry.GetStreamOnBlock(
		ctx,
		spaceStreamId,
		blockchain.BlockNumber(riverChainBlockNum),
	)
	require.NoError(err)

	require.Equal(getStream.LastMbNum(), candidate.Ref.Num)
	require.Equal(getStream.LastMbHash(), candidate.Ref.Hash)

	view, err = stream.GetView(ctx)
	require.NoError(err)
	lastBlock = view.LastBlock()
	require.Equal(lastBlock.Ref.Num+1, getStream.LastMbNum())

	// Add some events to the stream and try produce a mini-block. This must fail because the
	// stream facet already progressed by the just registered candidate. The node must detect this
	// scenario and load the candidate from its storage and apply/promote it. The node must be able
	// to produce a new mini-block with the events in the mini-pool.
	addEventToStream(t, ctx, instance.params, stream, "A", view.LastBlock().Ref, false)
	addEventToStream(t, ctx, instance.params, stream, "B", view.LastBlock().Ref, false)
	addEventToStream(t, ctx, instance.params, stream, "C", view.LastBlock().Ref, false)

	mb, err := mbProducer.TestMakeMiniblock(ctx, spaceStreamId, false)
	require.NoError(err)
	require.Equal(candidate.Ref.Num, mb.Num) // candidate was promoted
	require.Equal(candidate.Ref.Hash, mb.Hash)

	// make sure that there are still 3 events in the mini-pool because the candidate was promoted
	// and no new mini-block was produced.
	view, err = stream.GetView(ctx)
	require.NoError(err)
	require.Equal(3, view.GetStats().EventsInMinipool)

	// make mini-block and ensure that this time the 3 events are included in the mini-block,
	// the mini-pool is empty and that the new mini-block is build on top of the promoted candidate.
	mb, err = mbProducer.TestMakeMiniblock(ctx, spaceStreamId, false)
	require.NoError(err)

	view, err = stream.GetView(ctx)
	require.NoError(err)
	lastBlock = view.LastBlock()

	require.Equal(candidateHeader.MiniblockNum+1, mb.Num)
	require.Equal(candidate.Ref.Hash, common.BytesToHash(view.LastBlock().Header().PrevMiniblockHash))
	require.Equal(3, len(lastBlock.Events()))
	require.Equal([]*ParsedEvent{}, view.MinipoolEvents())
}
