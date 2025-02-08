package storage

import (
	"context"
	"crypto/rand"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/stretchr/testify/require"

	"github.com/towns-protocol/towns/core/config"
	"github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/base/test"
	"github.com/towns-protocol/towns/core/node/infra"
	"github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/testutils/dbtestutils"
)

type testBotRegistryStoreParams struct {
	ctx                context.Context
	pgBotRegistryStore *PostgresBotRegistryStore
	schema             string
	config             *config.DatabaseConfig
	closer             func()
	// For retaining schema and manually closing the store, use
	// the following two cleanup functions to manually delete the
	// schema and cancel the test context.
	schemaDeleter func()
	ctxCloser     func()
	exitSignal    chan error
}

func setupBotRegistryStorageTest(t *testing.T) *testBotRegistryStoreParams {
	require := require.New(t)
	ctx, ctxCloser := test.NewTestContext()

	dbCfg, dbSchemaName, dbCloser, err := dbtestutils.ConfigureDbWithPrefix(ctx, "b_")
	require.NoError(err, "Error configuring db for test")

	dbCfg.StartupDelay = 2 * time.Millisecond
	dbCfg.Extra = strings.Replace(dbCfg.Extra, "pool_max_conns=1000", "pool_max_conns=10", 1)

	pool, err := CreateAndValidatePgxPool(
		ctx,
		dbCfg,
		dbSchemaName,
		nil,
	)
	require.NoError(err, "Error creating pgx pool for test")

	exitSignal := make(chan error, 1)
	store, err := NewPostgresBotRegistryStore(
		ctx,
		pool,
		exitSignal,
		infra.NewMetricsFactory(nil, "", ""),
	)
	require.NoError(err, "Error creating new postgres stream store")

	params := &testBotRegistryStoreParams{
		ctx:                ctx,
		pgBotRegistryStore: store,
		schema:             dbSchemaName,
		config:             dbCfg,
		exitSignal:         exitSignal,
		closer: sync.OnceFunc(func() {
			store.Close(ctx)
			// dbCloser()
			ctxCloser()
		}),
		schemaDeleter: dbCloser,
		ctxCloser:     ctxCloser,
	}

	return params
}

func TestBotRegistryStorage(t *testing.T) {
	params := setupBotRegistryStorageTest(t)
	t.Cleanup(params.closer)

	require := require.New(t)
	store := params.pgBotRegistryStore

	// Generate random addresses
	var owner, owner2, bot, bot2, bot3 common.Address
	_, err := rand.Read(owner[:])
	require.NoError(err)
	_, err = rand.Read(owner2[:])
	require.NoError(err)
	_, err = rand.Read(bot[:])
	require.NoError(err)
	_, err = rand.Read(bot2[:])
	require.NoError(err)
	_, err = rand.Read(bot3[:])
	require.NoError(err)

	hook := "http://www.abc.com/hook"
	hook2 := "http://www.abc.com/hook2"

	err = store.CreateBot(params.ctx, owner, bot, hook)
	require.NoError(err)

	err = store.CreateBot(params.ctx, owner2, bot, hook)
	require.ErrorContains(err, "Bot already exists")
	require.True(base.IsRiverErrorCode(err, protocol.Err_ALREADY_EXISTS))

	// Fine to have multiple bots per owner
	err = store.CreateBot(params.ctx, owner, bot2, hook2)
	require.NoError(err)

	info, err := store.GetBotInfo(params.ctx, bot)
	require.NoError(err)
	require.Equal(bot, info.Bot)
	require.Equal(owner, info.Owner)
	require.Equal(hook, info.WebhookUrl)

	info, err = store.GetBotInfo(params.ctx, bot2)
	require.NoError(err)
	require.Equal(info.Bot, bot2)
	require.Equal(info.Owner, owner)
	require.Equal(info.WebhookUrl, hook2)

	info, err = store.GetBotInfo(params.ctx, bot3)
	require.Nil(info)
	require.ErrorContains(err, "Bot does not exist")
	require.True(base.IsRiverErrorCode(err, protocol.Err_NOT_FOUND))
}
