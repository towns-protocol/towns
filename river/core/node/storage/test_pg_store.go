package storage

import (
	"context"

	. "github.com/river-build/river/core/node/base"
	"github.com/river-build/river/core/node/infra"
	"github.com/river-build/river/core/node/testutils/dbtestutils"
)

type TestPgStore struct {
	Storage     *PostgresEventStore
	ExitChannel chan error
	Close       func()
}

func NewTestPgStore(ctx context.Context) *TestPgStore {
	dbCfg, schema, schemaDeleter, err := dbtestutils.StartDB(ctx)
	if err != nil {
		panic(err)
	}

	pool, err := CreateAndValidatePgxPool(ctx, dbCfg, schema)
	if err != nil {
		panic(err)
	}

	exitChan := make(chan error, 1)
	streamStorage, err := NewPostgresEventStore(
		ctx,
		pool,
		GenShortNanoid(),
		exitChan,
		infra.NewMetricsFactory("", ""),
	)
	if err != nil {
		panic(err)
	}

	return &TestPgStore{
		Storage:     streamStorage,
		ExitChannel: exitChan,
		Close: func() {
			streamStorage.Close(ctx)
			schemaDeleter()
		},
	}
}
