package metadata

import (
	"context"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/require"

	"github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/crypto"
	"github.com/towns-protocol/towns/core/node/infra"
	nodespkg "github.com/towns-protocol/towns/core/node/nodes"
	"github.com/towns-protocol/towns/core/node/storage"
	"github.com/towns-protocol/towns/core/node/testutils/dbtestutils"
	"github.com/towns-protocol/towns/core/node/testutils/mocks"
)

type metadataStoreSetup struct {
	streamStore *storage.PostgresStreamStore
	shardStore  *storage.PostgresMetadataShardStore
	cleanup     func()
}

func metadataTestOnChainCfg() *mocks.MockOnChainCfg {
	return &mocks.MockOnChainCfg{
		Settings: &crypto.OnChainSettings{
			StreamEphemeralStreamTTL: time.Minute * 10,
			StreamHistoryMiniblocks: crypto.StreamHistoryMiniblocks{
				Default:      0,
				Space:        5,
				UserSettings: 5,
			},
			MinSnapshotEvents: crypto.MinSnapshotEventsSettings{
				Default: 10,
			},
			StreamSnapshotIntervalInMiniblocks: 110,
			StreamTrimActivationFactor:         1,
		},
	}
}

func setupMetadataStore(
	t *testing.T,
	ctx context.Context,
	shardID uint64,
	registry nodespkg.NodeRegistry,
) metadataStoreSetup {
	t.Helper()

	dbCfg, dbSchema, dbCloser, err := dbtestutils.ConfigureDB(ctx)
	require.NoError(t, err)

	dbCfg.StartupDelay = 2 * time.Millisecond
	dbCfg.Extra = strings.Replace(dbCfg.Extra, "pool_max_conns=1000", "pool_max_conns=10", 1)

	poolInfo, err := storage.CreateAndValidatePgxPool(ctx, dbCfg, dbSchema, nil)
	require.NoError(t, err)

	exitSignal := make(chan error, 1)
	streamStore, err := storage.NewPostgresStreamStore(
		ctx,
		poolInfo,
		base.GenShortNanoid(),
		exitSignal,
		infra.NewMetricsFactory(nil, "", ""),
		metadataTestOnChainCfg(),
		nil,
		5,
	)
	require.NoError(t, err)

	store, err := storage.NewPostgresMetadataShardStore(
		ctx,
		&streamStore.PostgresEventStore,
		shardID,
		registry,
	)
	require.NoError(t, err)

	cleanup := func() {
		streamStore.Close(ctx)
		dbCloser()
	}

	return metadataStoreSetup{
		streamStore: streamStore,
		shardStore:  store,
		cleanup:     cleanup,
	}
}
