package storage

import (
	"context"
	"strings"
	"testing"
	"time"

	"github.com/river-build/river/core/config"
	"github.com/river-build/river/core/node/base/test"
	"github.com/river-build/river/core/node/infra"
	"github.com/river-build/river/core/node/testutils/dbtestutils"

	"github.com/stretchr/testify/require"
)

type testParams struct {
	schema string
	config *config.DatabaseConfig
	closer func()
}

func setupTest() (context.Context, *PostgresEventStore, *testParams) {
	ctx, ctxCloser := test.NewTestContext()

	dbCfg, dbSchemaName, dbCloser, err := dbtestutils.ConfigureDB(ctx)
	if err != nil {
		panic(err)
	}

	dbCfg.StartupDelay = 2 * time.Millisecond
	dbCfg.Extra = strings.Replace(dbCfg.Extra, "pool_max_conns=1000", "pool_max_conns=10", 1)

	pool, err := CreateAndValidatePgxPool(
		ctx,
		dbCfg,
		dbSchemaName,
		nil,
	)
	if err != nil {
		panic(err)
	}

	store, err := newPostgresEventStore(
		ctx,
		pool,
		infra.NewMetricsFactory(nil, "", ""),
		migrationsDir,
	)
	if err != nil {
		panic(err)
	}

	params := &testParams{
		schema: dbSchemaName,
		config: dbCfg,
		closer: func() {
			store.Close(ctx)
			dbCloser()
			ctxCloser()
		},
	}

	return ctx, store, params
}

func TestPostgresAcquireConnections(t *testing.T) {
	tests := map[string]struct {
		acquire       func(t *testing.T, ctx context.Context, pgEventStore *PostgresEventStore) func()
		expectedSlots int
		tryAcquire    func(t *testing.T, ctx context.Context, pgEventStore *PostgresEventStore) bool
	}{
		"AcquireRegularConnection": {
			acquire: func(t *testing.T, ctx context.Context, pgEventStore *PostgresEventStore) func() {
				release, err := pgEventStore.acquireRegularConnection(ctx)
				require.NoError(t, err)
				return release
			},
			expectedSlots: 8,
			tryAcquire: func(t *testing.T, ctx context.Context, pgEventStore *PostgresEventStore) bool {
				return pgEventStore.regularConnections.TryAcquire(1)
			},
		},
		"AcquireStreamingConnection": {
			acquire: func(t *testing.T, ctx context.Context, pgEventStore *PostgresEventStore) func() {
				release, err := pgEventStore.acquireStreamingConnection(ctx)
				require.NoError(t, err)
				return release
			},
			expectedSlots: 1,
			tryAcquire: func(t *testing.T, ctx context.Context, pgEventStore *PostgresEventStore) bool {
				return pgEventStore.streamingConnections.TryAcquire(1)
			},
		},
	}

	for name, tc := range tests {
		t.Run(name, func(t *testing.T) {
			require := require.New(t)

			// dbUrl := strings.Replace(testDatabaseUrl, "pool_max_conns=1000", "pool_max_conns=10", 1)
			ctx, pgEventStore, testParams := setupTest()
			defer testParams.closer()

			// Test that we can acquire and release connections
			releaseConnections := make(chan func(), tc.expectedSlots+10)
			for i := 0; i < tc.expectedSlots; i++ {
				releaseConnections <- tc.acquire(t, ctx, pgEventStore)
			}

			// All acquires now blocked
			require.False(tc.tryAcquire(t, ctx, pgEventStore))

			for i := 0; i < 10; i++ {
				// One release frees up one acquire
				(<-releaseConnections)()
				releaseConnections <- tc.acquire(t, ctx, pgEventStore)
			}

			for i := 0; i < tc.expectedSlots; i++ {
				(<-releaseConnections)()
			}
		})
	}
}
