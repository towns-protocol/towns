package storage

import (
	"testing"
	"time"

	"github.com/stretchr/testify/require"

	. "github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/crypto"
	"github.com/towns-protocol/towns/core/node/infra"
	"github.com/towns-protocol/towns/core/node/testutils/mocks"
)

func TestMigrateExistingDb(t *testing.T) {
	require := require.New(t)

	testParams := setupStreamStorageTest(t)
	ctx := testParams.ctx

	// Tear down the store and defer remaining cleanup
	testParams.pgStreamStore.Close(ctx)

	pool, err := CreateAndValidatePgxPool(
		ctx,
		testParams.config,
		testParams.schema,
		nil,
	)
	require.NoError(err)

	instanceId2 := GenShortNanoid()
	exitSignal2 := make(chan error, 1)
	pgStreamStore2, err := NewPostgresStreamStore(
		ctx,
		pool,
		instanceId2,
		exitSignal2,
		infra.NewMetricsFactory(nil, "", ""),
		&mocks.MockOnChainCfg{
			Settings: &crypto.OnChainSettings{
				StreamEphemeralStreamTTL: time.Minute * 10,
				StreamHistoryMiniblocks:  crypto.StreamHistoryMiniblocks{},
			},
		},
		100,
	)
	require.NoError(err)
	defer pgStreamStore2.Close(ctx)
}
