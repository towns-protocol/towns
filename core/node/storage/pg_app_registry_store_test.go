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

	// Registering a session key for a non-existent device fails
	messages, err := store.PublishSessionKey(
		params.ctx,
		deviceKey,
		sessionId,
		"ciphertext",
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
	messages, err = store.PublishSessionKey(
		params.ctx,
		deviceKey,
		sessionId,
		"ciphertext",
	)
	require.Empty(messages)
	require.NoError(err)

	// Publishing a session key that has already been registered will fail
	// with the appropriate error code (Err_ALREADY_EXISTS)
	messages, err = store.PublishSessionKey(
		params.ctx,
		deviceKey,
		sessionId,
		"ciphertext2",
	)
	require.Nil(messages)
	require.ErrorContains(err, "session key for device already exists")
	require.True(base.IsRiverErrorCode(err, protocol.Err_ALREADY_EXISTS))
}

func TestIsRegistered(t *testing.T) {
	params := setupAppRegistryStorageTest(t)
	t.Cleanup(params.closer)

	require := require.New(t)
	store := params.pgAppRegistryStore

	// Generate random addresses
	app := safeAddress(t)

	secretBytes, err := hex.DecodeString(testSecretHexString)
	require.NoError(err)
	secret := [32]byte(secretBytes)

	err = store.CreateApp(params.ctx, safeAddress(t), app, secret)
	require.NoError(err)
	err = store.RegisterWebhook(params.ctx, app, "webhookUrl", "deviceKey", "fallbackKey")
	require.NoError(err)

	isRegistered, err := store.IsRegistered(params.ctx, "deviceKey")
	require.NoError(err)
	require.True(isRegistered)

	isRegistered, err = store.IsRegistered(params.ctx, "unregisteredDeviceKey")
	require.NoError(err)
	require.False(isRegistered)
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

func requireSendableMessagesEqual(t *testing.T, expected *storage.SendableMessages, actual *storage.SendableMessages) {
	if expected == nil {
		require.Nil(t, actual, "Expected no messages to become sendable")
	} else {
		require.NotNil(t, actual, "Expected some messages to become sendable")
		require.Equal(t, expected.AppId, actual.AppId, "Unexpected app id")
		require.Equal(t, expected.EncryptedSharedSecret, actual.EncryptedSharedSecret, "Unexpected encrypted shared secret")
		require.Equal(t, expected.WebhookUrl, actual.WebhookUrl, "Unexpected webhook url")
		require.Len(t, actual.StreamEvents, len(expected.StreamEvents), "Unexpected count of sendable messages")
		for i, message := range expected.StreamEvents {
			require.Equal(t, message, expected.StreamEvents[i], "Message %d does not match", i)
		}
	}
}

func requireSendableDevicesEqual(t *testing.T, expected []storage.SendableDevice, actual []storage.SendableDevice) {
	if expected == nil {
		require.Nil(t, actual, "Expected no devices would be sendable")
	} else {
		require.NotNil(t, actual, "Expected some devices would be sendable")
		require.Len(t, actual, len(expected), "Unexpected count of sendable devices")
		for i, device := range expected {
			require.Equal(t, device.DeviceKey, actual[i].DeviceKey, "Mismatched device keys")
			require.Equal(t, device.AppId, actual[i].AppId, "Mismatched app ids")
			require.Equal(t, device.SendMessageSecrets.CipherText, actual[i].SendMessageSecrets.CipherText, "Mismatched ciphertexts")
			require.Equal(t, device.SendMessageSecrets.EncryptedSharedSecret, actual[i].SendMessageSecrets.EncryptedSharedSecret, "Mismatched encrypted shared secrets")
		}
	}
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

	message1Bytes := []byte("message1")
	message2Bytes := []byte("message2")
	message3Bytes := []byte("message3")
	message4Bytes := []byte("message4")
	message5Bytes := []byte("message5")

	// Registering a session key for a non-existent device fails
	sendableDevices, numEnqueued, err := store.EnqueueUnsendableMessages(
		params.ctx,
		[]string{deviceKeys[0]},
		sessionId1,
		message1Bytes,
	)
	require.Nil(sendableDevices)
	require.Zero(numEnqueued)

	require.ErrorContains(err, "app with device key is not registered")
	require.True(base.IsRiverErrorCode(err, protocol.Err_NOT_FOUND))
	require.Equal(deviceKeys[0], base.AsRiverError(err).GetTag("deviceKey"))

	err = store.CreateApp(params.ctx, owner.Address, apps[0].Address, secrets[0])
	require.NoError(err)

	webhook := "https://webhook.com/0"
	err = store.RegisterWebhook(params.ctx, apps[0].Address, webhook, deviceKeys[0], fallbackKey)
	require.NoError(err)

	// Registering a session key for a non-existent device fails the entire
	// transaction, even when the first key corresponds to a registered app.
	// The tag on the error identifies the specific device key that failed.
	sendableDevices, numEnqueued, err = store.EnqueueUnsendableMessages(
		params.ctx,
		[]string{deviceKeys[0], deviceKeys[1]},
		sessionId1,
		message1Bytes,
	)
	require.Nil(sendableDevices)
	require.Zero(numEnqueued)
	require.ErrorContains(err, "app with device key is not registered")
	require.True(base.IsRiverErrorCode(err, protocol.Err_NOT_FOUND))
	require.Equal(deviceKeys[1], base.AsRiverError(err).GetTag("deviceKey"))

	// Enqueue a message for device 1 with a key that has not yet been published
	sendableDevices, numEnqueued, err = store.EnqueueUnsendableMessages(
		params.ctx,
		[]string{deviceKeys[0]},
		sessionId1,
		message1Bytes,
	)
	require.NoError(err)
	require.Len(sendableDevices, 0)
	require.Equal(1, numEnqueued)

	// Now, publish a key for this (device key, session id). We expect to get this
	// message back.
	messages, err := store.PublishSessionKey(
		params.ctx,
		deviceKeys[0],
		sessionId1,
		"ciphertext-device0-session1",
	)
	require.NoError(err)
	require.EqualValues(secrets[0], messages.EncryptedSharedSecret)
	require.Len(messages.StreamEvents, 1)
	require.Equal(message1Bytes, messages.StreamEvents[0])

	// Register apps and webhooks for apps 2 through 5, to have all device keys registered
	for i := range 4 {
		err = store.CreateApp(params.ctx, owner.Address, apps[i+1].Address, secrets[i+1])
		require.NoError(err)

		webhook := fmt.Sprintf("https://webhook.com/%d", i+1)
		err = store.RegisterWebhook(params.ctx, apps[i+1].Address, webhook, deviceKeys[i+1], fallbackKey)
		require.NoError(err)
	}

	// Enqueue all messages (no devices have no session keys)
	sendable, enqueued, err := store.EnqueueUnsendableMessages(
		params.ctx,
		[]string{deviceKeys[1], deviceKeys[3], deviceKeys[4]},
		sessionId2,
		message2Bytes,
	)
	require.NoError(err)
	require.Equal(3, enqueued)
	require.Empty(sendable)

	// current session key state
	// device 0: session id 1

	// Current enqueued message state
	// device 1 - (session key 2, message 2)
	// device 3 - (session key 2, message 2)
	// device 4 - (session key 2, message 2)

	// Publish session keys for session 2 for device 1.
	// Expect 1 message to become sendable.
	messages, err = store.PublishSessionKey(
		params.ctx,
		deviceKeys[1],
		sessionId2,
		"ciphertext-device1-session2",
	)
	require.NotNil(messages)
	requireSendableMessagesEqual(
		t,
		&storage.SendableMessages{
			AppId:                 apps[1].Address,
			EncryptedSharedSecret: secrets[1],
			WebhookUrl:            "https://webhook.com/1",
			StreamEvents: [][]byte{
				message2Bytes,
			},
		},
		messages,
	)
	require.NoError(err)

	// current session key state
	// device 0: session id 1
	// device 1: session id 2

	// Current enqueued message state
	// device 3 - (session id 2: message 2)
	// device 4 - (session id 2: message 2)

	// Enqueue more messages
	// Expect 1 sendable message because device 1 already has session id 2 key
	sendable, enqueued, err = store.EnqueueUnsendableMessages(
		params.ctx,
		[]string{deviceKeys[0], deviceKeys[1], deviceKeys[2], deviceKeys[3]},
		sessionId2,
		message3Bytes,
	)
	require.NoError(err)
	require.Equal(3, enqueued)
	requireSendableDevicesEqual(
		t,
		[]storage.SendableDevice{
			{
				DeviceKey: deviceKeys[1],
				AppId:     apps[1].Address,
				SendMessageSecrets: storage.SendMessageSecrets{
					CipherText:            "ciphertext-device1-session2",
					EncryptedSharedSecret: secrets[1],
				},
			},
		},
		sendable,
	)

	// current session key state
	// device 0: session id 1
	// device 1: session id 2

	// Current enqueued message state
	// device 0 - (session id 2: message 3)
	// device 2 - (session id 2: message 3)
	// device 3 - (session id 2: message 2, message 3)
	// device 4 - (session id 2: message 2)

	// Add key for session 1 to device 1.
	// Enqueue another message. Expect 2 device to be sendable because device 0 and 1 have a key
	// for session 1.
	messages, err = store.PublishSessionKey(
		params.ctx,
		deviceKeys[1],
		sessionId1,
		"ciphertext-device1-session1",
	)
	require.Nil(messages)
	require.NoError(err)

	// current session key state
	// device 0: session id 1
	// device 1: session id 1, session id 2

	sendable, enqueued, err = store.EnqueueUnsendableMessages(
		params.ctx,
		[]string{deviceKeys[0], deviceKeys[1], deviceKeys[3], deviceKeys[4]},
		sessionId1,
		message4Bytes,
	)
	require.NoError(err)
	require.Equal(2, enqueued)
	requireSendableDevicesEqual(
		t,
		[]storage.SendableDevice{
			{
				DeviceKey: deviceKeys[0],
				AppId:     apps[0].Address,
				SendMessageSecrets: storage.SendMessageSecrets{
					CipherText:            "ciphertext-device0-session1",
					EncryptedSharedSecret: secrets[0],
				},
			},
			{
				DeviceKey: deviceKeys[1],
				AppId:     apps[1].Address,
				SendMessageSecrets: storage.SendMessageSecrets{
					CipherText:            "ciphertext-device1-session1",
					EncryptedSharedSecret: secrets[1],
				},
			},
		},
		sendable,
	)
	// current session key state (unchanged)
	// device 0: session id 1
	// device 1: session id 1, session id 2

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
	sendable, enqueued, err = store.EnqueueUnsendableMessages(
		params.ctx,
		[]string{deviceKeys[0], deviceKeys[1], deviceKeys[3], deviceKeys[4]},
		sessionId1,
		message5Bytes,
	)
	require.NoError(err)
	require.Equal(2, enqueued)
	requireSendableDevicesEqual(
		t,
		[]storage.SendableDevice{
			{
				DeviceKey: deviceKeys[0],
				AppId:     apps[0].Address,
				SendMessageSecrets: storage.SendMessageSecrets{
					CipherText:            "ciphertext-device0-session1",
					EncryptedSharedSecret: secrets[0],
				},
			},
			{
				DeviceKey: deviceKeys[1],
				AppId:     apps[1].Address,
				SendMessageSecrets: storage.SendMessageSecrets{
					CipherText:            "ciphertext-device1-session1",
					EncryptedSharedSecret: secrets[1],
				},
			},
		},
		sendable,
	)

	// current session key state (unchanged)
	// device 0: session id 1
	// device 1: session 1, session id 2

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

	// Drain remaining messages
	publishKeyTests := map[string]struct {
		deviceIndex int
		sessionKey  string
		ciphertext  string
		messages    [][]byte
	}{
		"drain device 0": {
			deviceIndex: 0,
			sessionKey:  sessionId2,
			messages:    [][]byte{message3Bytes},
		},
		"drain device 2": {
			deviceIndex: 2,
			sessionKey:  sessionId2,
			messages:    [][]byte{message3Bytes},
		},
		"drain device 3 session 1": {
			deviceIndex: 3,
			sessionKey:  sessionId1,
			messages:    [][]byte{message4Bytes, message5Bytes},
		},
		"drain device 3 session 2": {
			deviceIndex: 3,
			sessionKey:  sessionId2,
			messages:    [][]byte{message2Bytes, message3Bytes},
		},
		"drain device 4 session 1": {
			deviceIndex: 4,
			sessionKey:  sessionId1,
			messages:    [][]byte{message4Bytes, message5Bytes},
		},
		"drain device 4 session 2": {
			deviceIndex: 4,
			sessionKey:  sessionId2,
			messages:    [][]byte{message2Bytes},
		},
	}
	for name, tc := range publishKeyTests {
		t.Run(name, func(t *testing.T) {
			messages, err := store.PublishSessionKey(
				params.ctx,
				deviceKeys[tc.deviceIndex],
				tc.sessionKey,
				tc.ciphertext,
			)
			require.NoError(err)
			if len(tc.messages) == 0 {
				require.Nil(messages)
			} else {
				requireSendableMessagesEqual(
					t,
					&storage.SendableMessages{
						AppId:                 apps[tc.deviceIndex].Address,
						EncryptedSharedSecret: secrets[tc.deviceIndex],
						WebhookUrl:            fmt.Sprintf("https://webhook.com/%d", tc.deviceIndex),
						StreamEvents:          tc.messages,
					},
					messages,
				)
			}
		})
	}
}
