package app_registry

import (
	"context"
	"strings"
	"testing"
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/stretchr/testify/require"

	"github.com/towns-protocol/towns/core/config"
	"github.com/towns-protocol/towns/core/node/base/test"
	"github.com/towns-protocol/towns/core/node/infra"
	"github.com/towns-protocol/towns/core/node/storage"
	"github.com/towns-protocol/towns/core/node/testutils/dbtestutils"
)

type cleanupTestParams struct {
	ctx    context.Context
	store  *storage.PostgresAppRegistryStore
	closer func()
}

func setupCleanupTest(t *testing.T) *cleanupTestParams {
	require := require.New(t)
	ctx := test.NewTestContext(t)

	dbCfg, dbSchemaName, dbCloser, err := dbtestutils.ConfigureDbWithPrefix(ctx, "cleanup_")
	require.NoError(err, "Error configuring db for test")

	dbCfg.StartupDelay = 2 * time.Millisecond
	dbCfg.Extra = strings.Replace(dbCfg.Extra, "pool_max_conns=1000", "pool_max_conns=10", 1)

	pool, err := storage.CreateAndValidatePgxPool(ctx, dbCfg, dbSchemaName, nil)
	require.NoError(err, "Error creating pgx pool for test")

	exitSignal := make(chan error, 1)
	store, err := storage.NewPostgresAppRegistryStore(ctx, pool, exitSignal, infra.NewMetricsFactory(nil, "", ""))
	require.NoError(err, "Error creating new postgres app registry store")

	params := &cleanupTestParams{
		ctx:   ctx,
		store: store,
		closer: func() {
			store.Close(ctx)
			dbCloser()
		},
	}

	t.Cleanup(params.closer)
	return params
}

func TestEnqueuedMessagesCleaner_Cleanup(t *testing.T) {
	require := require.New(t)
	params := setupCleanupTest(t)
	metricsFactory := infra.NewMetricsFactory(prometheus.NewRegistry(), "", "")

	cfg := config.EnqueuedMessageRetentionConfig{
		TTL:               7 * 24 * time.Hour,
		MaxMessagesPerBot: 1000,
		CleanupInterval:   5 * time.Minute,
	}

	cleaner := NewEnqueuedMessagesCleaner(params.store, cfg, metricsFactory)

	// Call cleanup directly - with empty DB, no errors should occur
	cleaner.cleanup(params.ctx)

	// Verify no messages were deleted (empty DB)
	count, err := params.store.GetEnqueuedMessagesCountAprox(params.ctx)
	require.NoError(err)
	require.Equal(int64(0), count)
}

func TestEnqueuedMessagesCleaner_Run_StopsOnContextCancel(t *testing.T) {
	require := require.New(t)
	params := setupCleanupTest(t)
	metricsFactory := infra.NewMetricsFactory(prometheus.NewRegistry(), "", "")

	cfg := config.EnqueuedMessageRetentionConfig{
		TTL:               1 * time.Hour,
		MaxMessagesPerBot: 100,
		CleanupInterval:   100 * time.Millisecond, // Short interval for testing
	}

	cleaner := NewEnqueuedMessagesCleaner(params.store, cfg, metricsFactory)

	runCtx, runCancel := context.WithCancel(context.Background())

	// Start the cleaner in a goroutine
	done := make(chan struct{})
	go func() {
		cleaner.Run(runCtx)
		close(done)
	}()

	// Wait a bit for at least one cleanup cycle
	time.Sleep(250 * time.Millisecond)

	// Cancel the context
	runCancel()

	// Wait for the cleaner to stop
	select {
	case <-done:
		// Success - cleaner stopped
	case <-time.After(1 * time.Second):
		require.Fail("Cleaner did not stop after context cancellation")
	}
}
