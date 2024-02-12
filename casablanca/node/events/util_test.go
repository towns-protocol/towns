package events

import (
	"context"

	. "github.com/river-build/river/base"
	"github.com/river-build/river/base/test"
	"github.com/river-build/river/crypto"
	"github.com/river-build/river/registries"
	"github.com/river-build/river/storage"
	"github.com/river-build/river/testutils/dbtestutils"
)

type testParams struct {
	usePostgres bool
}

func makeTestStreamParams(p testParams) (context.Context, *StreamCacheParams, func()) {
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

	return ctx,
		&StreamCacheParams{
			Storage:      streamStorage,
			Wallet:       bc.Wallet,
			Riverchain:   bc,
			Registry:     registry,
			StreamConfig: &streamConfig_viewstate_space_t,
		},
		func() {
			btc.Close()
			streamStorage.Close()
			if schemaDeleter != nil {
				schemaDeleter()
			}
		}
}

func makeTestSreamCache(p testParams) (context.Context, StreamCache, func()) {
	ctx, params, closer := makeTestStreamParams(p)

	streamCache, err := NewStreamCache(ctx, params)
	if err != nil {
		closer()
		panic(err)
	}

	return ctx, streamCache, closer
}
