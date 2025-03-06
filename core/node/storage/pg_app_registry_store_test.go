package storage_test

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/stretchr/testify/require"

	"github.com/towns-protocol/towns/core/config"
	"github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/base/test"
	"github.com/towns-protocol/towns/core/node/crypto"
	"github.com/towns-protocol/towns/core/node/infra"
	"github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/storage"
	"github.com/towns-protocol/towns/core/node/testutils/dbtestutils"
)

var (
	testSecretHexString  = "000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f"
	testSecretHexString2 = "202122232425262728292a2b2c2d2e2f101112131415161718191a1b1c1d1e1f"
)

type testAppRegistryStoreParams struct {
	ctx                context.Context
	pgAppRegistryStore *storage.PostgresAppRegistryStore
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

	pool, err := storage.CreateAndValidatePgxPool(
		ctx,
		dbCfg,
		dbSchemaName,
		nil,
	)
	require.NoError(err, "Error creating pgx pool for test")

	exitSignal := make(chan error, 1)
	store, err := storage.NewPostgresAppRegistryStore(
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

func safeAddress(t *testing.T) common.Address {
	var addr common.Address
	_, err := rand.Read(addr[:])
	require.NoError(t, err)
	return addr
}

func TestRegisterWebhook(t *testing.T) {
	params := setupAppRegistryStorageTest(t)
	t.Cleanup(params.closer)

	require := require.New(t)
	store := params.pgAppRegistryStore

	owner := safeAddress(t)
	app := safeAddress(t)
	app2 := safeAddress(t)
	unregisteredApp := safeAddress(t)
	deviceKey := safeAddress(t).String()
	fallbackKey := safeAddress(t).String()

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
	require.Equal("", info.EncryptionDevice.DeviceKey)
	require.Equal("", info.EncryptionDevice.FallbackKey)

	webhook := "https://webhook.com/callme"
	err = store.RegisterWebhook(params.ctx, app, webhook, deviceKey, fallbackKey)
	require.NoError(err)

	info, err = store.GetAppInfo(params.ctx, app)
	require.NoError(err)
	require.Equal(app, info.App)
	require.Equal(owner, info.Owner)
	require.Equal([32]byte(secretBytes), info.EncryptedSecret)
	require.Equal(webhook, info.WebhookUrl)
	require.Equal(deviceKey, info.EncryptionDevice.DeviceKey)
	require.Equal(fallbackKey, info.EncryptionDevice.FallbackKey)

	webhook2 := "https://www.webhook.com/beepme"
	deviceKey2 := safeAddress(t).String()
	fallbackKey2 := safeAddress(t).String()
	err = store.RegisterWebhook(params.ctx, app, webhook2, deviceKey2, fallbackKey2)
	require.NoError(err)

	info, err = store.GetAppInfo(params.ctx, app)
	require.NoError(err)
	require.Equal(app, info.App)
	require.Equal(owner, info.Owner)
	require.Equal([32]byte(secretBytes), info.EncryptedSecret)
	require.Equal(webhook2, info.WebhookUrl)
	require.Equal(deviceKey2, info.EncryptionDevice.DeviceKey)
	require.Equal(fallbackKey2, info.EncryptionDevice.FallbackKey)

	err = store.RegisterWebhook(params.ctx, unregisteredApp, webhook, deviceKey, fallbackKey)
	require.ErrorContains(err, "app was not found in registry")

	err = store.CreateApp(params.ctx, owner, app2, secret)
	require.NoError(err)
	err = store.RegisterWebhook(params.ctx, app2, webhook, deviceKey2, fallbackKey)
	require.ErrorContains(err, "another app is using this device id")
	require.True(base.IsRiverErrorCode(err, protocol.Err_ALREADY_EXISTS))
}

func TestCreateApp(t *testing.T) {
	params := setupAppRegistryStorageTest(t)
	t.Cleanup(params.closer)

	require := require.New(t)
	store := params.pgAppRegistryStore

	// Generate random addresses
	owner := safeAddress(t)
	owner2 := safeAddress(t)
	app := safeAddress(t)
	app2 := safeAddress(t)
	app3 := safeAddress(t)

	secretBytes, err := hex.DecodeString(testSecretHexString)
	require.NoError(err)
	secret := [32]byte(secretBytes)

	secretBytes2, err := hex.DecodeString(testSecretHexString2)
	require.NoError(err)
	secret2 := [32]byte(secretBytes2)

	err = store.CreateApp(params.ctx, owner, app, secret)
	require.NoError(err)

	err = store.CreateApp(params.ctx, owner2, app, secret)
	require.ErrorContains(err, "app already exists")
	require.True(base.IsRiverErrorCode(err, protocol.Err_ALREADY_EXISTS))

	// Fine to have multiple apps per owner
	err = store.CreateApp(params.ctx, owner, app2, secret2)
	require.NoError(err)

	info, err := store.GetAppInfo(params.ctx, app)
	require.NoError(err)
	require.Equal(app, info.App)
	require.Equal(owner, info.Owner)
	require.Equal("", info.WebhookUrl)
	require.Equal("", info.EncryptionDevice.DeviceKey)
	require.Equal("", info.EncryptionDevice.FallbackKey)

	info, err = store.GetAppInfo(params.ctx, app2)
	require.NoError(err)
	require.Equal(app2, info.App)
	require.Equal(owner, info.Owner)
	require.Equal("", info.WebhookUrl)
	require.Equal("", info.EncryptionDevice.DeviceKey)
	require.Equal("", info.EncryptionDevice.FallbackKey)

	info, err = store.GetAppInfo(params.ctx, app3)
	require.Nil(info)
	require.ErrorContains(err, "app does not exist")
	require.True(base.IsRiverErrorCode(err, protocol.Err_NOT_FOUND))
}

func TestPublishSessionKeys(t *testing.T) {
	params := setupAppRegistryStorageTest(t)
	t.Cleanup(params.closer)

	require := require.New(t)
	store := params.pgAppRegistryStore

	deviceKey := "deviceKey"
	fallbackKey := "fallbackKey"
	sessionId := "sessionId"
	sessionId2 := "sessionId2"
	sessionId3 := "sessionId3"

	// Registering a session key for a non-existent device fails
	messages, err := store.PublishSessionKeys(
		params.ctx,
		shared.StreamId{},
		deviceKey,
		[]string{sessionId},
		"ciphertexts-devicekey-sessionId",
	)
	require.Nil(messages)
	require.ErrorContains(err, "app with device key is not registered")
	require.True(base.IsRiverErrorCode(err, protocol.Err_NOT_FOUND))

	// Create an app...
	owner := safeAddress(t)
	app := safeAddress(t)

	secretBytes, err := hex.DecodeString(testSecretHexString)
	require.NoError(err)
	secret := [32]byte(secretBytes)

	err = store.CreateApp(params.ctx, owner, app, secret)
	require.NoError(err)

	webhook := "https://webhook.com/callme"
	err = store.RegisterWebhook(params.ctx, app, webhook, deviceKey, fallbackKey)
	require.NoError(err)

	// Now that an app is registered with the device key, publishing a session key
	// should succeed
	messages, err = store.PublishSessionKeys(
		params.ctx,
		shared.StreamId{},
		deviceKey,
		[]string{sessionId},
		"ciphertexts-devicekey-sessionId",
	)
	require.Empty(messages)
	require.NoError(err)

	// Publishing a session key that has already been registered should be fine,
	// as in reality a session key may come in multiple times
	messages, err = store.PublishSessionKeys(
		params.ctx,
		shared.StreamId{},
		deviceKey,
		[]string{sessionId},
		"ciphertext2",
	)
	require.Nil(messages)
	require.Nil(err)

	messages, err = store.PublishSessionKeys(
		params.ctx,
		shared.StreamId{},
		deviceKey,
		[]string{sessionId, sessionId2, sessionId3},
		"ciphertext123",
	)
	require.Nil(messages)
	require.Nil(err)
}

func nSafeWallets(t *testing.T, ctx context.Context, n int) []*crypto.Wallet {
	wallets := make([]*crypto.Wallet, n)
	for i := range n {
		wallet, err := crypto.NewWallet(ctx)
		require.NoError(t, err)
		wallets[i] = wallet
	}
	return wallets
}

func TestEnqueueMessages(t *testing.T) {
	params := setupAppRegistryStorageTest(t)
	t.Cleanup(params.closer)

	require := require.New(t)
	store := params.pgAppRegistryStore

	apps := nSafeWallets(t, params.ctx, 5)
	owner, _ := crypto.NewWallet(params.ctx)

	deviceKeys := []string{
		"deviceKey0",
		"deviceKey1",
		"deviceKey2",
		"deviceKey3",
		"deviceKey4",
	}
	secrets := [5][32]byte{
		common.HexToHash("00000"),
		common.HexToHash("11111"),
		common.HexToHash("22222"),
		common.HexToHash("33333"),
		common.HexToHash("44444"),
	}
	fallbackKey := "fallbackKey"

	sessionId1 := "sessionId1"
	sessionId2 := "sessionId2"
	sessionId3 := "sessionId3"
	sessionId4 := "sessionId4"
	sessionId5 := "sessionId5"

	message1Bytes := []byte("message1")
	message2Bytes := []byte("message2")
	message3Bytes := []byte("message3")
	message4Bytes := []byte("message4")
	message5Bytes := []byte("message5")
	message6Bytes := []byte("message6")

	// Registering a session key for a non-existent device fails
	sendableApps, unsendableApps, err := store.EnqueueUnsendableMessages(
		params.ctx,
		[]common.Address{apps[0].Address},
		sessionId1,
		message1Bytes,
	)
	require.Nil(sendableApps)
	require.Nil(unsendableApps)

	require.ErrorContains(err, "some app ids were not registered")
	require.True(base.IsRiverErrorCode(err, protocol.Err_NOT_FOUND))

	err = store.CreateApp(params.ctx, owner.Address, apps[0].Address, secrets[0])
	require.NoError(err)

	webhook := "https://webhook.com/0"
	err = store.RegisterWebhook(params.ctx, apps[0].Address, webhook, deviceKeys[0], fallbackKey)
	require.NoError(err)

	// Registering a session key for a non-existent device fails the entire
	// transaction, even when the first key corresponds to a registered app.
	// The tag on the error identifies the specific device key that failed.
	sendableApps, unsendableApps, err = store.EnqueueUnsendableMessages(
		params.ctx,
		[]common.Address{apps[0].Address, apps[1].Address},
		sessionId1,
		message1Bytes,
	)
	require.Nil(sendableApps)
	require.Nil(unsendableApps)
	require.ErrorContains(err, "some app ids were not registered")
	require.True(base.IsRiverErrorCode(err, protocol.Err_NOT_FOUND))

	unsendableAppAtIndex := func(i int) storage.UnsendableApp {
		return storage.UnsendableApp{
			AppId:                 apps[i].Address,
			DeviceKey:             deviceKeys[i],
			WebhookUrl:            fmt.Sprintf("https://webhook.com/%d", i),
			EncryptedSharedSecret: secrets[i],
		}
	}

	// Enqueue a message for device 1 with a key that has not yet been published
	sendableApps, unsendableApps, err = store.EnqueueUnsendableMessages(
		params.ctx,
		[]common.Address{apps[0].Address},
		sessionId1,
		message1Bytes,
	)

	require.NoError(err)
	require.Len(sendableApps, 0)
	require.ElementsMatch(
		[]storage.UnsendableApp{
			unsendableAppAtIndex(0),
		},
		unsendableApps,
	)

	sendableMessagesAtIndexWithEvents := func(i int, streamEvents [][]byte) *storage.SendableMessages {
		return &storage.SendableMessages{
			AppId:                 apps[i].Address,
			EncryptedSharedSecret: secrets[i],
			WebhookUrl:            fmt.Sprintf("https://webhook.com/%d", i),
			StreamEvents:          streamEvents,
		}
	}

	// Now, publish a key for this (device key, session id). We expect to get this
	// message back.
	messages, err := store.PublishSessionKeys(
		params.ctx,
		shared.StreamId{},
		deviceKeys[0],
		[]string{sessionId1, sessionId3},
		"ciphertexts-device0-session1-session3",
	)
	require.NoError(err)
	require.Equal(sendableMessagesAtIndexWithEvents(0, [][]byte{message1Bytes}), messages)

	// Register apps and webhooks for apps 2 through 5, to have all device keys registered
	for i := range 4 {
		require.NoError(store.CreateApp(params.ctx, owner.Address, apps[i+1].Address, secrets[i+1]))
		webhook := fmt.Sprintf("https://webhook.com/%d", i+1)
		require.NoError(store.RegisterWebhook(params.ctx, apps[i+1].Address, webhook, deviceKeys[i+1], fallbackKey))
	}

	// Enqueue all messages (no devices have no session keys)
	sendable, unsendable, err := store.EnqueueUnsendableMessages(
		params.ctx,
		[]common.Address{apps[1].Address, apps[3].Address, apps[4].Address},
		sessionId2,
		message2Bytes,
	)
	require.NoError(err)
	require.ElementsMatch(
		[]storage.UnsendableApp{
			unsendableAppAtIndex(1),
			unsendableAppAtIndex(3),
			unsendableAppAtIndex(4),
		},
		unsendable,
	)
	require.Empty(sendable)

	// current session key state
	// device 0: [sessionId1, sessionId3]

	// Current enqueued message state
	// device 1 - (session key 2, message 2)
	// device 3 - (session key 2, message 2)
	// device 4 - (session key 2, message 2)

	// Publish session keys for session 2 for device 1.
	// Expect 1 message to become sendable.
	messages, err = store.PublishSessionKeys(
		params.ctx,
		shared.StreamId{},
		deviceKeys[1],
		[]string{sessionId2, sessionId4},
		"ciphertexts-device1-session2-session4",
	)
	require.NotNil(messages)
	require.Equal(
		sendableMessagesAtIndexWithEvents(1, [][]byte{message2Bytes}),
		messages,
	)
	require.NoError(err)

	sendableAppWithSessionsAndCiphertexts := func(i int, sessionIds []string, ciphertexts string) storage.SendableApp {
		return storage.SendableApp{
			DeviceKey:  deviceKeys[i],
			AppId:      apps[i].Address,
			WebhookUrl: fmt.Sprintf("https://webhook.com/%d", i),
			SendMessageSecrets: storage.SendMessageSecrets{
				SessionIds:            sessionIds,
				CipherTexts:           ciphertexts,
				EncryptedSharedSecret: secrets[i],
			},
		}
	}

	// current session key state
	// device 0: [sessionId1, sessionId3]
	// device 1: [sessionId2, sessionId4]

	// Current enqueued message state
	// device 3 - (session id 2: message 2)
	// device 4 - (session id 2: message 2)

	// Enqueue more messages
	// Expect 1 sendable message because device 1 already has session id 2 key
	sendable, unsendable, err = store.EnqueueUnsendableMessages(
		params.ctx,
		[]common.Address{apps[0].Address, apps[1].Address, apps[2].Address, apps[3].Address},
		sessionId2,
		message3Bytes,
	)
	require.NoError(err)
	require.ElementsMatch(
		[]storage.SendableApp{
			sendableAppWithSessionsAndCiphertexts(
				1,
				[]string{sessionId2, sessionId4},
				"ciphertexts-device1-session2-session4",
			),
		},
		sendable,
	)
	require.ElementsMatch(
		[]storage.UnsendableApp{
			unsendableAppAtIndex(0),
			unsendableAppAtIndex(2),
			unsendableAppAtIndex(3),
		},
		unsendable,
	)

	// current session key state
	// device 0: [sessionId1, sessionId3]
	// device 1: [sessionId2, sessionId4]

	// Current enqueued message state
	// device 0 - (session id 2: message 3)
	// device 2 - (session id 2: message 3)
	// device 3 - (session id 2: message 2, message 3)
	// device 4 - (session id 2: message 2)

	// Add key for session 1 to device 1.
	// Enqueue another message. Expect 2 device to be sendable because device 0 and 1 have a key
	// for session 1.
	messages, err = store.PublishSessionKeys(
		params.ctx,
		shared.StreamId{},
		deviceKeys[1],
		[]string{sessionId1, sessionId4},
		"ciphertexts-device1-session1-session4",
	)
	require.Nil(messages)
	require.NoError(err)

	// current session key state
	// device 0: [sessionId1, sessionId3]
	// device 1: [sessionId2, sessionId4], [sessionId1, sessionId4]

	sendable, unsendable, err = store.EnqueueUnsendableMessages(
		params.ctx,
		[]common.Address{apps[0].Address, apps[1].Address, apps[3].Address, apps[4].Address},
		sessionId1,
		message4Bytes,
	)
	require.NoError(err)
	require.ElementsMatch(
		[]storage.SendableApp{
			sendableAppWithSessionsAndCiphertexts(
				0,
				[]string{sessionId1, sessionId3},
				"ciphertexts-device0-session1-session3",
			),
			sendableAppWithSessionsAndCiphertexts(
				1,
				[]string{sessionId1, sessionId4},
				"ciphertexts-device1-session1-session4",
			),
		},
		sendable,
	)
	require.ElementsMatch(
		[]storage.UnsendableApp{
			unsendableAppAtIndex(3),
			unsendableAppAtIndex(4),
		},
		unsendable,
	)

	// current session key state (unchanged)
	// device 0: [sessionId1, sessionId3]
	// device 1: [sessionId2, sessionId4], [sessionId1, sessionId4]

	// Current enqueued message state
	// device 0 - (session id 2: message 3)
	// device 1 - ()
	// device 2 - (session id 2: message 3)
	// device 3 - (
	//     session id 1: message 4
	//     session id 2: message 2, message 3
	// )
	// device 4 - (
	//     session id 1: message 4
	//     session id 2: message 2
	// )

	// Enqueue another message. Expect 1 device to be sendable because only device 0 has a key
	// for session 1.
	sendable, unsendable, err = store.EnqueueUnsendableMessages(
		params.ctx,
		[]common.Address{apps[0].Address, apps[1].Address, apps[3].Address, apps[4].Address},
		sessionId1,
		message5Bytes,
	)
	require.NoError(err)
	require.ElementsMatch(
		[]storage.SendableApp{
			sendableAppWithSessionsAndCiphertexts(
				0,
				[]string{sessionId1, sessionId3},
				"ciphertexts-device0-session1-session3",
			),
			sendableAppWithSessionsAndCiphertexts(
				1,
				[]string{sessionId1, sessionId4},
				"ciphertexts-device1-session1-session4",
			),
		},
		sendable,
	)
	require.ElementsMatch(
		[]storage.UnsendableApp{
			unsendableAppAtIndex(3),
			unsendableAppAtIndex(4),
		},
		unsendable,
	)

	// current session key state (unchanged)
	// device 0: [sessionId1, sessionId3]
	// device 1: [sessionId2, sessionId4], [sessionId1, sessionId4]

	// Current enqueued message state
	// device 0 - (session id 2: message 3)
	// device 1 - ()
	// device 2 - (session id 2: message 3)
	// device 3 - (
	//     session id 1: message 4, message 5
	//     session id 2: message 2, message 3
	// )
	// device 4 - (
	//     session id 1: message 4, message 5
	//     session id 2: message 2
	// )

	// Enqueue message 6 for devices 3 under session 5
	sendable, unsendable, err = store.EnqueueUnsendableMessages(
		params.ctx,
		[]common.Address{apps[3].Address},
		sessionId5,
		message6Bytes,
	)
	require.Empty(sendable)
	require.ElementsMatch(
		[]storage.UnsendableApp{
			unsendableAppAtIndex(3),
		},
		unsendable,
	)
	require.NoError(err)

	// current session key state (unchanged)
	// device 0: [sessionId1, sessionId3]
	// device 1: [sessionId2, sessionId4], [sessionId1, sessionId4]

	// Current enqueued message state
	// device 0 - (session id 2: message 3)
	// device 1 - ()
	// device 2 - (session id 2: message 3)
	// device 3 - (
	//     session id 1: message 4, message 5
	//     session id 2: message 2, message 3
	//     session id 5: message 6
	// )
	// device 4 - (
	//     session id 1: message 4, message 5
	//     session id 2: message 2
	// )

	// Drain remaining messages
	publishKeyTests := map[string]struct {
		deviceIndex int
		sessionKeys []string
		messages    [][]byte
	}{
		"drain device 0": {
			deviceIndex: 0,
			sessionKeys: []string{sessionId2, sessionId5},
			messages:    [][]byte{message3Bytes},
		},
		"drain device 2": {
			deviceIndex: 2,
			sessionKeys: []string{sessionId2},
			messages:    [][]byte{message3Bytes},
		},
		"drain device 3 pt 1": {
			deviceIndex: 3,
			sessionKeys: []string{sessionId1, sessionId5},
			messages:    [][]byte{message4Bytes, message5Bytes, message6Bytes},
		},
		"drain device 3 pt 2": {
			deviceIndex: 3,
			sessionKeys: []string{sessionId2},
			messages:    [][]byte{message2Bytes, message3Bytes},
		},
		"drain device 4": {
			deviceIndex: 4,
			sessionKeys: []string{sessionId1, sessionId2},
			messages:    [][]byte{message2Bytes, message4Bytes, message5Bytes},
		},
	}
	for name, tc := range publishKeyTests {
		t.Run(name, func(t *testing.T) {
			messages, err := store.PublishSessionKeys(
				params.ctx,
				shared.StreamId{},
				deviceKeys[tc.deviceIndex],
				tc.sessionKeys,
				hex.EncodeToString(safeAddress(t).Bytes()),
			)
			require.NoError(err)
			if len(tc.messages) == 0 {
				require.Nil(messages)
			} else {
				require.Equal(
					sendableMessagesAtIndexWithEvents(tc.deviceIndex, tc.messages),
					messages,
				)
			}
		})
	}
}
