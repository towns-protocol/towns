package events

import (
	"context"
	"testing"
	"time"

	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/river-build/river/core/node/base/test"
	"github.com/river-build/river/core/node/config"
	"github.com/river-build/river/core/node/crypto"
	"github.com/river-build/river/core/node/protocol"
	"github.com/river-build/river/core/node/registries"
	"github.com/river-build/river/core/node/shared"
	"github.com/river-build/river/core/node/storage"
	"github.com/river-build/river/core/node/testutils"
	"github.com/stretchr/testify/require"
	"google.golang.org/protobuf/proto"
)

func TestStreamCacheViewEviction(t *testing.T) {
	var (
		ctx, cancel  = test.NewTestContext()
		require      = require.New(t)
		chainMonitor = crypto.NewChainMonitor()
	)
	defer cancel()

	btc, err := crypto.NewBlockchainTestContext(ctx, 1)
	require.NoError(err, "instantiating blockchain test context")
	defer btc.Close()

	go chainMonitor.RunWithBlockPeriod(ctx, btc.Client(), 0, 10*time.Millisecond)

	btc.DeployerBlockchain.TxPool.SetOnSubmitHandler(func() {
		btc.Commit(ctx)
	})

	node := btc.GetBlockchain(ctx, 0, true)

	pendingTx, err := btc.DeployerBlockchain.TxPool.Submit(
		ctx,
		"RegisterNode",
		func(opts *bind.TransactOpts) (*types.Transaction, error) {
			return btc.NodeRegistry.RegisterNode(opts, node.Wallet.Address, "http://node.local:1234", 2)
		},
	)
	require.NoError(err, "register node")
	receipt := <-pendingTx.Wait()
	require.Equal(crypto.TransactionResultSuccess, receipt.Status, "register node transaction failed")

	riverRegistry, err := registries.NewRiverRegistryContract(ctx, node, &config.ContractConfig{
		Address: btc.RiverRegistryAddress,
	})
	require.NoError(err, "instantiating river registry contract")

	pg := storage.NewTestPgStore(ctx)
	defer pg.Close()

	streamCache, err := NewStreamCache(ctx, &StreamCacheParams{
		Storage:    pg.Storage,
		Wallet:     node.Wallet,
		Riverchain: node,
		Registry:   riverRegistry,
		StreamConfig: &config.StreamConfig{
			CacheExpiration: 0, // disable cache expiration, done manually
		},
	}, 0, chainMonitor)
	require.NoError(err, "instantiating stream cache")

	streamCache.cache.Range(func(key, value any) bool {
		require.Fail("stream cache should be empty")
		return true
	})

	var (
		nodes            = []common.Address{node.Wallet.Address}
		streamID         = testutils.FakeStreamId(shared.STREAM_SPACE_BIN)
		genesisMiniblock = MakeGenesisMiniblockForSpaceStream(t, node.Wallet, streamID)
	)

	genesisMiniblockBytes, err := proto.Marshal(genesisMiniblock)
	require.NoError(err, "marshalling genesis miniblock")

	pendingTx, err = node.TxPool.Submit(
		ctx,
		"AllocateStream",
		func(opts *bind.TransactOpts) (*types.Transaction, error) {
			return riverRegistry.StreamRegistry.AllocateStream(
				opts,
				streamID,
				nodes,
				[32]byte(genesisMiniblock.Header.Hash),
				genesisMiniblockBytes,
			)
		},
	)

	require.NoError(err, "allocate stream")
	receipt = <-pendingTx.Wait()
	require.Equal(crypto.TransactionResultSuccess, receipt.Status, "allocate stream transaction failed")

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

	// stream now has a subscriber and its view should not be evicted from cache
	receiver := testStreamCacheViewEvictionSub{}
	err = streamSync.Sub(ctx, streamView.SyncCookie(node.Wallet.Address), receiver)
	require.NoError(err, "subscribing to stream")
	time.Sleep(10 * time.Millisecond) // make sure we hit the cache expiration of 1 ms
	ctxShort, cancelShort := context.WithTimeout(ctx, 25*time.Millisecond)
	streamCache.cacheCleanup(ctxShort, time.Millisecond, time.Millisecond)
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
	require.Equal(0, streamWithoutLoadedView, "stream cache must have no unloaded streams")
	require.Equal(1, streamWithLoadedViewCount, "stream cache must have one loaded stream")

	// unsubscribe from stream and making it eligible to get dropped from cache
	streamSync.Unsub(receiver)

	// no subscribers anymore so its view must be dropped from cache
	time.Sleep(10 * time.Millisecond) // make sure we hit the cache expiration of 1 ms
	ctxShort, cancelShort = context.WithTimeout(ctx, 25*time.Millisecond)
	streamCache.cacheCleanup(ctxShort, time.Millisecond, time.Millisecond)
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
	require.Equal(1, streamWithoutLoadedView, "stream cache must have no unloaded streams")
	require.Equal(0, streamWithLoadedViewCount, "stream cache must have one loaded stream")

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
	require.Equal(1, streamWithLoadedViewCount, "stream cache must have one loaded stream")
}

func TestCacheEvictionWithFilledMiniBlockPool(t *testing.T) {
	var (
		ctx, cancel  = test.NewTestContext()
		require      = require.New(t)
		chainMonitor = crypto.NewChainMonitor()
	)
	defer cancel()

	btc, err := crypto.NewBlockchainTestContext(ctx, 1)
	require.NoError(err, "instantiating blockchain test context")
	defer btc.Close()

	go chainMonitor.RunWithBlockPeriod(ctx, btc.Client(), 0, 10*time.Millisecond)

	btc.DeployerBlockchain.TxPool.SetOnSubmitHandler(func() {
		btc.Commit(ctx)
	})

	node := btc.GetBlockchain(ctx, 0, true)

	pendingTx, err := btc.DeployerBlockchain.TxPool.Submit(
		ctx,
		"RegisterNode",
		func(opts *bind.TransactOpts) (*types.Transaction, error) {
			return btc.NodeRegistry.RegisterNode(opts, node.Wallet.Address, "http://node.local:1234", 2)
		},
	)
	require.NoError(err, "register node")
	receipt := <-pendingTx.Wait()
	require.Equal(crypto.TransactionResultSuccess, receipt.Status, "register node transaction failed")

	riverRegistry, err := registries.NewRiverRegistryContract(ctx, node, &config.ContractConfig{
		Address: btc.RiverRegistryAddress,
	})
	require.NoError(err, "instantiating river registry contract")

	pg := storage.NewTestPgStore(ctx)
	defer pg.Close()

	streamCacheParams := &StreamCacheParams{
		Storage:    pg.Storage,
		Wallet:     node.Wallet,
		Riverchain: node,
		Registry:   riverRegistry,
		StreamConfig: &config.StreamConfig{
			CacheExpiration: 0, // disable cache expiration, done manually
		},
	}

	streamCache, err := NewStreamCache(ctx, streamCacheParams, 0, chainMonitor)
	require.NoError(err, "instantiating stream cache")

	streamCache.cache.Range(func(key, value any) bool {
		require.Fail("stream cache should be empty")
		return true
	})

	var (
		nodes            = []common.Address{node.Wallet.Address}
		streamID         = testutils.FakeStreamId(shared.STREAM_SPACE_BIN)
		genesisMiniblock = MakeGenesisMiniblockForSpaceStream(t, node.Wallet, streamID)
	)

	genesisMiniblockBytes, err := proto.Marshal(genesisMiniblock)
	require.NoError(err, "marshalling genesis miniblock")

	pendingTx, err = node.TxPool.Submit(
		ctx,
		"AllocateStream",
		func(opts *bind.TransactOpts) (*types.Transaction, error) {
			return riverRegistry.StreamRegistry.AllocateStream(
				opts,
				streamID,
				nodes,
				[32]byte(genesisMiniblock.Header.Hash),
				genesisMiniblockBytes,
			)
		},
	)

	require.NoError(err, "allocate stream")
	receipt = <-pendingTx.Wait()
	require.Equal(crypto.TransactionResultSuccess, receipt.Status, "allocate stream transaction failed")

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
	streamCache.cacheCleanup(ctxShort, time.Millisecond, time.Millisecond)
	cancelShort()
	loadedStream, _ := streamCache.cache.Load(streamID)
	require.Nil(loadedStream.(*streamImpl).view, "view not unloaded")

	// try to create a miniblock, pool is empty so it should not fail but also should not create a miniblock
	blockHash, err := streamSync.MakeMiniblock(ctx, false)
	require.NoError(err, "make miniblock")
	require.Nil(blockHash, "miniblock created")

	// add event to stream with unloaded view, view should be loaded in cache and minipool must contain event
	addEvent(t, ctx, streamCacheParams, streamSync, "payload", common.BytesToHash(genesisMiniblock.Header.Hash))

	// with event in minipool ensure that view isn't evicted from cache
	time.Sleep(10 * time.Millisecond) // make sure we hit the cache expiration of 1 ms
	ctxShort, cancelShort = context.WithTimeout(ctx, 25*time.Millisecond)
	streamCache.cacheCleanup(ctxShort, time.Millisecond, time.Millisecond)
	cancelShort()
	loadedStream, _ = streamCache.cache.Load(streamID)
	require.NotNil(loadedStream.(*streamImpl).view, "view unloaded")

	// now it should be possible to create a miniblock
	blockHash, err = streamSync.MakeMiniblock(ctx, false)
	require.NoError(err, "make miniblock")
	require.NotNil(blockHash, "miniblock not created")

	// minipool should be empty now and view should be evicted from cache
	time.Sleep(10 * time.Millisecond) // make sure we hit the cache expiration of 1 ms
	ctxShort, cancelShort = context.WithTimeout(ctx, 25*time.Millisecond)
	streamCache.cacheCleanup(ctxShort, time.Millisecond, time.Millisecond)
	cancelShort()
	loadedStream, _ = streamCache.cache.Load(streamID)
	require.Nil(loadedStream.(*streamImpl).view, "view loaded in cache")
}

type testStreamCacheViewEvictionSub struct{}

func (testStreamCacheViewEvictionSub) OnUpdate(r *protocol.StreamAndCookie) {}
func (testStreamCacheViewEvictionSub) OnSyncError(err error)                {}
