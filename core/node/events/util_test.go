package events

import (
	"context"

	. "github.com/river-build/river/core/node/base"
	"github.com/river-build/river/core/node/base/test"
	"github.com/river-build/river/core/node/crypto"
	. "github.com/river-build/river/core/node/nodes"
	. "github.com/river-build/river/core/node/protocol"
	"github.com/river-build/river/core/node/registries"
	"github.com/river-build/river/core/node/storage"
	"github.com/river-build/river/core/node/testutils/dbtestutils"
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
	usePostgres bool
	replFactor  int
}

func makeTestStreamParams(p testParams) (context.Context, *testContext) {
	ctx := test.NewTestContext()
	btc, err := crypto.NewBlockchainTestContext(ctx, 1)
	if err != nil {
		panic(err)
	}

	bc := btc.GetBlockchain(ctx, 0, true)

	var streamStorage storage.StreamStorage
	var schemaDeleter func()
	if p.usePostgres {
		var url, schema string
		url, schema, schemaDeleter, err = dbtestutils.StartDB(ctx)
		if err != nil {
			panic(err)
		}

		streamStorage, err = storage.NewPostgresEventStore(
			ctx,
			url,
			schema,
			GenShortNanoid(),
			make(chan error, 1),
		)
		if err != nil {
			panic(err)
		}
	} else {
		streamStorage = storage.NewMemStorage()
	}

	err = btc.InitNodeRecord(ctx, 0, "fakeurl")
	if err != nil {
		panic(err)
	}

	cfg := btc.RegistryConfig()
	registry, err := registries.NewRiverRegistryContract(ctx, bc, &cfg)
	if err != nil {
		panic(err)
	}

	nr, err := LoadNodeRegistry(ctx, registry, bc.Wallet.AddressStr)
	if err != nil {
		panic(err)
	}

	sr := NewStreamRegistry(bc.Wallet.AddressStr, nr, registry, p.replFactor)

	params := &StreamCacheParams{
		Storage:      streamStorage,
		Wallet:       bc.Wallet,
		Riverchain:   bc,
		Registry:     registry,
		StreamConfig: &streamConfig_viewstate_space_t,
	}

	cache, err := NewStreamCache(ctx, params)
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
				streamStorage.Close(ctx)
				if schemaDeleter != nil {
					schemaDeleter()
				}
			},
		}
}

func makeTestStreamCache(p testParams) (context.Context, *testContext) {
	ctx, testContext := makeTestStreamParams(p)

	streamCache, err := NewStreamCache(ctx, testContext.params)
	if err != nil {
		testContext.closer()
		panic(err)
	}
	testContext.cache = streamCache

	return ctx, testContext
}

func (tt *testContext) createStream(
	ctx context.Context,
	streamId string,
	genesisMiniblock *Miniblock,
) (SyncStream, StreamView, error) {
	mbBytes, err := proto.Marshal(genesisMiniblock)
	if err != nil {
		return nil, nil, err
	}

	_, err = tt.streamRegistry.AllocateStream(ctx, streamId, genesisMiniblock.Header.Hash, mbBytes)
	if err != nil {
		return nil, nil, err
	}

	return tt.cache.CreateStream(ctx, streamId)
}
