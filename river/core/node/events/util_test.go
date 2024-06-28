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
		Storage:     pg.Storage,
		Wallet:      bc.Wallet,
		RiverChain:  bc,
		Registry:    registry,
		ChainConfig: btc.OnChainConfig,
	}

	cache, err := NewStreamCache(ctx, params, blockNumber, bc.ChainMonitor, infra.NewMetrics("", ""))
	if err != nil {
		panic(err)
	}

	return ctx,
		&testContext{
			bcTest:         btc,
			params:         params,
			cache:          cache,
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
		btc.SetConfigValue(t, ctx, crypto.StreamReplicationFactorConfigKey, crypto.ABIEncodeUint64(uint64(p.replFactor)))
	}
	if p.mediaMaxChunkCount != 0 {
		btc.SetConfigValue(t, ctx, crypto.StreamMediaMaxChunkCountConfigKey, crypto.ABIEncodeUint64(uint64(p.mediaMaxChunkCount)))
	}
	if p.mediaMaxChunkSize != 0 {
		btc.SetConfigValue(t, ctx, crypto.StreamMediaMaxChunkSizeConfigKey, crypto.ABIEncodeUint64(uint64(p.mediaMaxChunkSize)))
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

func makeTestStreamCache(t *testing.T, p testParams) (context.Context, *testContext) {
	ctx, testContext := makeTestStreamParams(t, p)

	bc := testContext.bcTest.GetBlockchain(ctx, 0)

	blockNumber, err := bc.GetBlockNumber(ctx)
	if err != nil {
		testContext.closer()
		panic(err)
	}

	streamCache, err := NewStreamCache(ctx, testContext.params, blockNumber, bc.ChainMonitor, infra.NewMetrics("", ""))
	if err != nil {
		testContext.closer()
		panic(err)
	}
	testContext.cache = streamCache

	return ctx, testContext
}

func (tt *testContext) createStream(
	ctx context.Context,
	streamId StreamId,
	genesisMiniblock *Miniblock,
) (SyncStream, StreamView, error) {
	mbBytes, err := proto.Marshal(genesisMiniblock)
	if err != nil {
		return nil, nil, err
	}

	_, err = tt.streamRegistry.AllocateStream(ctx, streamId, common.BytesToHash(
		genesisMiniblock.Header.Hash), mbBytes)
	if err != nil {
		return nil, nil, err
	}

	return tt.cache.CreateStream(ctx, streamId)
}
