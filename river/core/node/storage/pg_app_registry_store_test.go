package storage

import (
	"context"
	"crypto/rand"
	"encoding/hex"
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

var (
	testSecretHexString  = "000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f"
	testSecretHexString2 = "202122232425262728292a2b2c2d2e2f101112131415161718191a1b1c1d1e1f"
)

type testAppRegistryStoreParams struct {
	ctx                context.Context
	pgAppRegistryStore *PostgresAppRegistryStore
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

func setupAppRegistryStorageTest(t *testing.T) *testAppRegistryStoreParams {
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
	store, err := NewPostgresAppRegistryStore(
		ctx,
		pool,
		exitSignal,
		infra.NewMetricsFactory(nil, "", ""),
	)
	require.NoError(err, "Error creating new postgres stream store")

	params := &testAppRegistryStoreParams{
		ctx:                ctx,
		pgAppRegistryStore: store,
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

func TestAppRegistryStorage_RegisterWebhook(t *testing.T) {
	params := setupAppRegistryStorageTest(t)
	t.Cleanup(params.closer)

	require := require.New(t)
	store := params.pgAppRegistryStore

	var owner, app, unregisteredApp common.Address
	_, err := rand.Read(owner[:])
	require.NoError(err)
	_, err = rand.Read(app[:])
	require.NoError(err)

	_, err = rand.Read(unregisteredApp[:])
	require.NoError(err)

	secretBytes, err := hex.DecodeString(testSecretHexString)
	require.NoError(err)
	secret := [32]byte(secretBytes)

	err = store.CreateApp(params.ctx, owner, app, secret)
	require.NoError(err)

	info, err := store.GetAppInfo(params.ctx, app)
	require.NoError(err)
	require.Equal(app, info.App)
	require.Equal(owner, info.Owner)
	require.Equal([32]byte(secretBytes), info.EncryptedSecret)
	require.Equal("", info.WebhookUrl)

	webhook := "https://webhook.com/callme"
	webhook2 := "http://api.org/textme"
	err = store.RegisterWebhook(params.ctx, app, webhook)
	require.NoError(err)

	info, err = store.GetAppInfo(params.ctx, app)
	require.NoError(err)
	require.Equal(app, info.App)
	require.Equal(owner, info.Owner)
	require.Equal([32]byte(secretBytes), info.EncryptedSecret)
	require.Equal(webhook, info.WebhookUrl)

	err = store.RegisterWebhook(params.ctx, app, webhook2)
	require.NoError(err)

	info, err = store.GetAppInfo(params.ctx, app)
	require.NoError(err)
	require.Equal(app, info.App)
	require.Equal(owner, info.Owner)
	require.Equal([32]byte(secretBytes), info.EncryptedSecret)
	require.Equal(webhook2, info.WebhookUrl)

	err = store.RegisterWebhook(params.ctx, unregisteredApp, webhook)
	require.ErrorContains(err, "app was not found in registry")
}

func TestAppRegistryStorage(t *testing.T) {
	params := setupAppRegistryStorageTest(t)
	t.Cleanup(params.closer)

	require := require.New(t)
	store := params.pgAppRegistryStore

	// Generate random addresses
	var owner, owner2, app, app2, app3 common.Address
	_, err := rand.Read(owner[:])
	require.NoError(err)
	_, err = rand.Read(owner2[:])
	require.NoError(err)
	_, err = rand.Read(app[:])
	require.NoError(err)
	_, err = rand.Read(app2[:])
	require.NoError(err)
	_, err = rand.Read(app3[:])
	require.NoError(err)

	secretBytes, err := hex.DecodeString(testSecretHexString)
	require.NoError(err)
	secret := [32]byte(secretBytes)

	secretBytes2, err := hex.DecodeString(testSecretHexString2)
	require.NoError(err)
	secret2 := [32]byte(secretBytes2)

	err = store.CreateApp(params.ctx, owner, app, secret)
	require.NoError(err)

	err = store.CreateApp(params.ctx, owner2, app, secret)
	require.ErrorContains(err, "App already exists")
	require.True(base.IsRiverErrorCode(err, protocol.Err_ALREADY_EXISTS))

	// Fine to have multiple apps per owner
	err = store.CreateApp(params.ctx, owner, app2, secret2)
	require.NoError(err)

	info, err := store.GetAppInfo(params.ctx, app)
	require.NoError(err)
	require.Equal(app, info.App)
	require.Equal(owner, info.Owner)
	require.Equal("", info.WebhookUrl)

	info, err = store.GetAppInfo(params.ctx, app2)
	require.NoError(err)
	require.Equal(app2, info.App)
	require.Equal(owner, info.Owner)
	require.Equal("", info.WebhookUrl)

	info, err = store.GetAppInfo(params.ctx, app3)
	require.Nil(info)
	require.ErrorContains(err, "app does not exist")
	require.True(base.IsRiverErrorCode(err, protocol.Err_NOT_FOUND))
}
