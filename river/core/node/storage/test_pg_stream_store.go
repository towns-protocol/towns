package storage

import (
	"context"

	. "github.com/river-build/river/core/node/base"
	"github.com/river-build/river/core/node/infra"
	"github.com/river-build/river/core/node/testutils/dbtestutils"
)

type TestStreamStore struct {
	Storage     *PostgresStreamStore
	ExitChannel chan error
	Close       func()
}

func NewTestStreamStore(ctx context.Context) *TestStreamStore {
	dbCfg, schema, schemaDeleter, err := dbtestutils.ConfigureDB(ctx)
	if err != nil {
		panic(err)
	}

	pool, err := CreateAndValidatePgxPool(ctx, dbCfg, schema, nil)
	if err != nil {
		panic(err)
	}

	exitChan := make(chan error, 1)
	streamStorage, err := NewPostgresStreamStore(
		ctx,
		pool,
		GenShortNanoid(),
		exitChan,
		infra.NewMetricsFactory(nil, "", ""),
	)
	if err != nil {
		panic(err)
	}

	return &TestStreamStore{
		Storage:     streamStorage,
		ExitChannel: exitChan,
		Close: func() {
			streamStorage.Close(ctx)
			schemaDeleter()
		},
	}
}
