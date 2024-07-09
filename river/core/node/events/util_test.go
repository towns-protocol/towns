package events

import (
	"context"
	"sync"
	"testing"

	"github.com/ethereum/go-ethereum/common"
	"github.com/stretchr/testify/require"
	"google.golang.org/protobuf/proto"

	"github.com/river-build/river/core/node/base/test"
	"github.com/river-build/river/core/node/crypto"
	"github.com/river-build/river/core/node/infra"
	. "github.com/river-build/river/core/node/nodes"
	. "github.com/river-build/river/core/node/protocol"
	"github.com/river-build/river/core/node/registries"
	. "github.com/river-build/river/core/node/shared"
	"github.com/river-build/river/core/node/storage"
	"github.com/river-build/river/core/node/testutils"
)

type cacheTestContext struct {
	testParams testParams
	t          *testing.T
	ctx        context.Context
	require    *require.Assertions
	btc        *crypto.BlockchainTestContext

	instances []*cacheTestInstance
}

type cacheTestInstance struct {
	params         *StreamCacheParams
	streamRegistry StreamRegistry
	cache          StreamCache
	mbProducer     MiniblockProducer
}

type testParams struct {
	replFactor                    int
	mediaMaxChunkCount            int
	mediaMaxChunkSize             int
	recencyConstraintsGenerations int
	recencyConstraintsAgeSec      int
	defaultMinEventsPerSnapshot   int

	disableMineOnTx bool
	numInstances    int
}

// makeCacheTestContext creates a test context with a blockchain and a stream registry for stream cache tests.
// It doesn't create a stream cache itself. Call initCache to create a stream cache.
func makeCacheTestContext(t *testing.T, p testParams) (context.Context, *cacheTestContext) {
	t.Parallel()

	if p.numInstances <= 0 {
		p.numInstances = 1
	}

	ctx, cancel := test.NewTestContext()
	t.Cleanup(cancel)

	ctc := &cacheTestContext{
		testParams: p,
		t:          t,
		ctx:        ctx,
		require:    require.New(t),
	}

	btc, err := crypto.NewBlockchainTestContext(
		ctx,
		crypto.TestParams{NumKeys: p.numInstances, MineOnTx: !p.disableMineOnTx, AutoMine: true},
	)
	ctc.require.NoError(err)
	ctc.btc = btc
	t.Cleanup(btc.Close)

	setOnChainStreamConfig(t, ctx, btc, p)

	for i := range p.numInstances {
		ctc.require.NoError(btc.InitNodeRecord(ctx, i, "fakeurl"))

		bc := btc.GetBlockchain(ctx, i)
		bc.StartChainMonitor(ctx)

		pg := storage.NewTestPgStore(ctx)
		t.Cleanup(pg.Close)

		cfg := btc.RegistryConfig()
		registry, err := registries.NewRiverRegistryContract(ctx, bc, &cfg)
		ctc.require.NoError(err)

		blockNumber := btc.BlockNum(ctx)

		nr, err := LoadNodeRegistry(ctx, registry, bc.Wallet.Address, blockNumber, bc.ChainMonitor)
		ctc.require.NoError(err)

		sr := NewStreamRegistry(bc.Wallet.Address, nr, registry, btc.OnChainConfig)

		params := &StreamCacheParams{
			Storage:         pg.Storage,
			Wallet:          bc.Wallet,
			RiverChain:      bc,
			Registry:        registry,
			ChainConfig:     btc.OnChainConfig,
			AppliedBlockNum: blockNumber,
			ChainMonitor:    bc.ChainMonitor,
			Metrics:         infra.NewMetrics("", ""),
		}

		ctc.instances = append(ctc.instances, &cacheTestInstance{
			params:         params,
			streamRegistry: sr,
		})
	}

	return ctx, ctc
}

func (ctc *cacheTestContext) initCache(n int, opts *MiniblockProducerOpts) *streamCacheImpl {
	streamCache, err := NewStreamCache(ctc.ctx, ctc.instances[n].params)
	ctc.require.NoError(err)
	ctc.instances[n].cache = streamCache
	ctc.instances[n].mbProducer = NewMiniblockProducer(ctc.ctx, streamCache, opts)
	return streamCache
}

func (ctc *cacheTestContext) createStreamNoCache(
	streamId StreamId,
	genesisMiniblock *Miniblock,
) {
	mbBytes, err := proto.Marshal(genesisMiniblock)
	ctc.require.NoError(err)

	_, err = ctc.instances[0].streamRegistry.AllocateStream(
		ctc.ctx,
		streamId,
		common.BytesToHash(genesisMiniblock.Header.Hash),
		mbBytes,
	)
	ctc.require.NoError(err)
}

func (ctc *cacheTestContext) createStream(
	streamId StreamId,
	genesisMiniblock *Miniblock,
) (SyncStream, StreamView) {
	ctc.createStreamNoCache(streamId, genesisMiniblock)
	s, v, err := ctc.instances[0].cache.CreateStream(ctc.ctx, streamId)
	ctc.require.NoError(err)
	return s, v
}

func (ctc *cacheTestContext) getBC() *crypto.Blockchain {
	return ctc.instances[0].params.RiverChain
}

func (ctc *cacheTestContext) allocateStreams(count int) map[StreamId]*Miniblock {
	genesisBlocks := make(map[StreamId]*Miniblock)
	var mu sync.Mutex

	var wg sync.WaitGroup
	wg.Add(count)
	for range count {
		go func() {
			defer wg.Done()

			streamID := testutils.FakeStreamId(STREAM_SPACE_BIN)
			mb := MakeGenesisMiniblockForSpaceStream(ctc.t, ctc.getBC().Wallet, streamID)
			ctc.createStreamNoCache(streamID, mb)

			mu.Lock()
			defer mu.Unlock()
			genesisBlocks[streamID] = mb
		}()
	}
	wg.Wait()
	return genesisBlocks
}

func (ctc *cacheTestContext) makeMiniblock(inst int, streamId StreamId, forceSnapshot bool) (common.Hash, int64) {
	h, n, err := ctc.instances[inst].mbProducer.TestMakeMiniblock(ctc.ctx, streamId, forceSnapshot)
	ctc.require.NoError(err)
	return h, n
}

func setOnChainStreamConfig(t *testing.T, ctx context.Context, btc *crypto.BlockchainTestContext, p testParams) {
	if p.replFactor != 0 {
		btc.SetConfigValue(
			t,
			ctx,
			crypto.StreamReplicationFactorConfigKey,
			crypto.ABIEncodeUint64(uint64(p.replFactor)),
		)
	}
	if p.mediaMaxChunkCount != 0 {
		btc.SetConfigValue(
			t,
			ctx,
			crypto.StreamMediaMaxChunkCountConfigKey,
			crypto.ABIEncodeUint64(uint64(p.mediaMaxChunkCount)),
		)
	}
	if p.mediaMaxChunkSize != 0 {
		btc.SetConfigValue(
			t,
			ctx,
			crypto.StreamMediaMaxChunkSizeConfigKey,
			crypto.ABIEncodeUint64(uint64(p.mediaMaxChunkSize)),
		)
	}
	if p.recencyConstraintsGenerations != 0 {
		btc.SetConfigValue(t, ctx,
			crypto.StreamRecencyConstraintsGenerationsConfigKey,
			crypto.ABIEncodeUint64(uint64(p.recencyConstraintsGenerations)),
		)
	}
	if p.recencyConstraintsAgeSec != 0 {
		btc.SetConfigValue(t, ctx,
			crypto.StreamRecencyConstraintsAgeSecConfigKey,
			crypto.ABIEncodeUint64(uint64(p.recencyConstraintsAgeSec)),
		)
	}
	if p.defaultMinEventsPerSnapshot != 0 {
		btc.SetConfigValue(t, ctx,
			crypto.StreamDefaultMinEventsPerSnapshotConfigKey,
			crypto.ABIEncodeUint64(uint64(p.defaultMinEventsPerSnapshot)),
		)
	}
}
