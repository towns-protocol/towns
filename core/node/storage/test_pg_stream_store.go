package storage

import (
	"context"
	"time"

	. "github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/infra"
	"github.com/towns-protocol/towns/core/node/testutils/dbtestutils"
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
		time.Minute*10,
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
