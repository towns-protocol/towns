package events

import (
	"context"
	"testing"

	"github.com/ethereum/go-ethereum/common"
	"github.com/river-build/river/core/node/base/test"
	"github.com/river-build/river/core/node/crypto"
	"github.com/river-build/river/core/node/infra"
	. "github.com/river-build/river/core/node/nodes"
	. "github.com/river-build/river/core/node/protocol"
	"github.com/river-build/river/core/node/registries"
	. "github.com/river-build/river/core/node/shared"
	"github.com/river-build/river/core/node/storage"
	"google.golang.org/protobuf/proto"
)

type testContext struct {
	bcTest         *crypto.BlockchainTestContext
	params         *StreamCacheParams
	cache          StreamCache
	streamRegistry StreamRegistry
	closer         func()
}

type testParams struct {
	replFactor                    int
	mediaMaxChunkCount            int
	mediaMaxChunkSize             int
	recencyConstraintsGenerations int
	recencyConstraintsAgeSec      int
	defaultMinEventsPerSnapshot   int
}

// makeTestStreamParams creates a test context with a blockchain and a stream registry for stream cahe tests.
// It doesn't create a stream cache itself. Call initCache to create a stream cache.
func makeTestStreamParams(t *testing.T, p testParams) (context.Context, *testContext) {
	ctx, cancel := test.NewTestContext()
	btc, err := crypto.NewBlockchainTestContext(ctx, 1, true)
	if err != nil {
		panic(err)
	}

	err = btc.InitNodeRecord(ctx, 0, "fakeurl")
	if err != nil {
		panic(err)
	}

	bc := btc.GetBlockchain(ctx, 0)
	bc.StartChainMonitor(ctx)

	pg := storage.NewTestPgStore(ctx)

	cfg := btc.RegistryConfig()
	registry, err := registries.NewRiverRegistryContract(ctx, bc, &cfg)
	if err != nil {
		panic(err)
	}

	blockNumber := btc.BlockNum(ctx)

	nr, err := LoadNodeRegistry(ctx, registry, bc.Wallet.Address, blockNumber, bc.ChainMonitor)
	if err != nil {
		panic(err)
	}

	setOnChainStreamConfig(t, ctx, btc, p)

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

	return ctx,
		&testContext{
			bcTest:         btc,
			params:         params,
			streamRegistry: sr,
			closer: func() {
				btc.Close()
				pg.Close()
				cancel()
			},
		}
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

func (tt *testContext) initCache(ctx context.Context) *streamCacheImpl {
	streamCache, err := NewStreamCache(ctx, tt.params)
	if err != nil {
		panic(err)
	}
	tt.cache = streamCache
	return streamCache
}

func (tt *testContext) createStreamNoCache(
	ctx context.Context,
	streamId StreamId,
	genesisMiniblock *Miniblock,
) error {
	mbBytes, err := proto.Marshal(genesisMiniblock)
	if err != nil {
		return err
	}

	_, err = tt.streamRegistry.AllocateStream(ctx, streamId, common.BytesToHash(
		genesisMiniblock.Header.Hash), mbBytes)
	return err
}

func (tt *testContext) createStream(
	ctx context.Context,
	streamId StreamId,
	genesisMiniblock *Miniblock,
) (SyncStream, StreamView, error) {
	err := tt.createStreamNoCache(ctx, streamId, genesisMiniblock)
	if err != nil {
		return nil, nil, err
	}
	return tt.cache.CreateStream(ctx, streamId)
}

func (tt *testContext) getBC() *crypto.Blockchain {
	return tt.params.RiverChain
}
