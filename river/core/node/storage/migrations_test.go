package storage

import (
	"testing"

	. "github.com/river-build/river/core/node/base"
	"github.com/river-build/river/core/node/infra"

	"github.com/stretchr/testify/require"
)

func TestMigrateExistingDb(t *testing.T) {
	require := require.New(t)

	ctx, _, testParams := setupTest()
	defer testParams.closer()

	pool, err := CreateAndValidatePgxPool(
		ctx,
		testParams.config,
		testParams.schema,
	)
	require.NoError(err)

	instanceId2 := GenShortNanoid()
	exitSignal2 := make(chan error, 1)
	pgEventStore2, err := newPostgresEventStore(
		ctx,
		pool,
		instanceId2,
		exitSignal2,
		infra.NewMetricsFactory("", ""),
		migrationsDir,
	)
	require.NoError(err)
	defer pgEventStore2.Close(ctx)
}
