package storage_test

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"strings"
	"testing"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/stretchr/testify/require"

	"github.com/towns-protocol/towns/core/config"
	"github.com/towns-protocol/towns/core/node/app_registry/types"
	"github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/base/test"
	"github.com/towns-protocol/towns/core/node/crypto"
	"github.com/towns-protocol/towns/core/node/infra"
	. "github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/storage"
	"github.com/towns-protocol/towns/core/node/testutils/dbtestutils"
)

var (
	testSecretHexString  = "000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f"
	testSecretHexString2 = "202122232425262728292a2b2c2d2e2f101112131415161718191a1b1c1d1e1f"
)

// Helper function to create test metadata
func testAppMetadataWithName(name string) types.AppMetadata {
	return types.AppMetadata{
		Username:    name,
		DisplayName: name + " Bot", // Add " Bot" suffix to display name for testing
		Description: "A test application",
		ImageUrl:    "https://example.com/image.png",
		ExternalUrl: "",
		AvatarUrl:   "https://example.com/avatar.png",
		SlashCommands: []types.SlashCommand{
			{Name: "help", Description: "Get help with bot commands"},
			{Name: "status", Description: "Check bot status"},
		},
	}
}

type testAppRegistryStoreParams struct {
	ctx                context.Context
	pgAppRegistryStore *storage.PostgresAppRegistryStore
	schema             string
	config             *config.DatabaseConfig
	exitSignal         chan error
}

func setupAppRegistryStorageTest(t *testing.T) *testAppRegistryStoreParams {
	require := require.New(t)
	ctx := test.NewTestContext(t)

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
	}

	t.Cleanup(func() {
		store.Close(ctx)
		dbCloser()
	})

	return params
}

func safeAddress(t *testing.T) common.Address {
	var addr common.Address
	_, err := rand.Read(addr[:])
	require.NoError(t, err)
	return addr
}

func TestGetSessionKey(t *testing.T) {
	params := setupAppRegistryStorageTest(t)

	require := require.New(t)
	store := params.pgAppRegistryStore

	owner := safeAddress(t)
	app := safeAddress(t)
	unregisteredApp := safeAddress(t)

	secretBytes, err := hex.DecodeString(testSecretHexString)
	require.NoError(err)
	secret := [32]byte(secretBytes)

	err = store.CreateApp(
		params.ctx,
		owner,
		app,
		types.AppSettings{ForwardSetting: ForwardSettingValue_FORWARD_SETTING_UNSPECIFIED},
		testAppMetadataWithName("app"),
		secret,
	)
	require.NoError(err)

	err = store.RegisterWebhook(params.ctx, app, "http://www.callme.com/webhook", "deviceKey", "fallbackKey")
	require.NoError(err)

	spaceId, err := shared.MakeSpaceId()
	require.NoError(err)
	channelId, err := shared.MakeChannelId(spaceId)
	require.NoError(err)

	envelope := []byte("encryption_envelope")

	sendable, err := store.PublishSessionKeys(
		params.ctx,
		channelId,
		"deviceKey",
		[]string{"sessionId1", "sessionId2"},
		envelope,
	)
	require.Nil(sendable)
	require.NoError(err)

	tests := map[string]struct {
		expectFound      bool
		expectedEnvelope []byte
		app              common.Address
		sessionId        string
	}{
		"found - app registered with session key": {
			expectFound:      true,
			app:              app,
			sessionId:        "sessionId1",
			expectedEnvelope: envelope,
		},
		"found - check 2nd session key": {
			expectFound:      true,
			app:              app,
			sessionId:        "sessionId2",
			expectedEnvelope: envelope,
		},
		"unfound - registered app without key": {
			app:       app,
			sessionId: "session3Id",
		},
		"unfound - unregistered app": {
			app: unregisteredApp,
		},
	}
	for name, tc := range tests {
		t.Run(name, func(t *testing.T) {
			envelope, err := store.GetSessionKey(params.ctx, tc.app, tc.sessionId)
			if tc.expectFound {
				require.NoError(err)
				require.Equal(tc.expectedEnvelope, envelope)
			} else {
				require.Error(err)
				require.True(base.IsRiverErrorCode(err, Err_NOT_FOUND))
			}
		})
	}
}

func TestUpdateSettings(t *testing.T) {
	params := setupAppRegistryStorageTest(t)

	require := require.New(t)
	store := params.pgAppRegistryStore

	owner := safeAddress(t)
	app := safeAddress(t)
	unregisteredApp := safeAddress(t)

	secretBytes, err := hex.DecodeString(testSecretHexString)
	require.NoError(err)
	secret := [32]byte(secretBytes)

	err = store.CreateApp(
		params.ctx,
		owner,
		app,
		types.AppSettings{ForwardSetting: ForwardSettingValue_FORWARD_SETTING_UNSPECIFIED},
		testAppMetadataWithName("app"),
		secret,
	)
	require.NoError(err)

	info, err := store.GetAppInfo(params.ctx, app)
	require.NoError(err)
	require.Equal(
		&storage.AppInfo{
			App:             app,
			Owner:           owner,
			EncryptedSecret: secret,
			Metadata:        testAppMetadataWithName("app"),
		},
		info,
	)

	err = store.UpdateSettings(
		params.ctx,
		app,
		types.AppSettings{ForwardSetting: ForwardSettingValue_FORWARD_SETTING_ALL_MESSAGES},
	)
	require.NoError(err)

	info, err = store.GetAppInfo(params.ctx, app)
	require.NoError(err)
	require.Equal(
		&storage.AppInfo{
			App:             app,
			Owner:           owner,
			EncryptedSecret: secret,
			Metadata:        testAppMetadataWithName("app"),
			Settings:        types.AppSettings{ForwardSetting: ForwardSettingValue_FORWARD_SETTING_ALL_MESSAGES},
		},
		info,
	)

	err = store.UpdateSettings(
		params.ctx,
		unregisteredApp,
		types.AppSettings{ForwardSetting: ForwardSettingValue_FORWARD_SETTING_MENTIONS_REPLIES_REACTIONS},
	)
	require.ErrorContains(err, "app was not found in registry")
}

func TestRegisterWebhook(t *testing.T) {
	params := setupAppRegistryStorageTest(t)

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

	err = store.CreateApp(
		params.ctx,
		owner,
		app,
		types.AppSettings{ForwardSetting: ForwardSettingValue_FORWARD_SETTING_UNSPECIFIED},
		testAppMetadataWithName("app"),
		secret,
	)
	require.NoError(err)

	info, err := store.GetAppInfo(params.ctx, app)
	require.NoError(err)
	require.Equal(
		&storage.AppInfo{
			App:             app,
			Owner:           owner,
			EncryptedSecret: [32]byte(secretBytes),
			Metadata:        testAppMetadataWithName("app"),
		},
		info,
	)

	webhook := "https://webhook.com/callme"
	err = store.RegisterWebhook(params.ctx, app, webhook, deviceKey, fallbackKey)
	require.NoError(err)

	info, err = store.GetAppInfo(params.ctx, app)
	require.NoError(err)
	require.Equal(
		&storage.AppInfo{
			App:             app,
			Owner:           owner,
			EncryptedSecret: [32]byte(secretBytes),
			Metadata:        testAppMetadataWithName("app"),
			WebhookUrl:      webhook,
			EncryptionDevice: storage.EncryptionDevice{
				DeviceKey:   deviceKey,
				FallbackKey: fallbackKey,
			},
		},
		info,
	)

	webhook2 := "https://www.webhook.com/beepme"
	deviceKey2 := safeAddress(t).String()
	fallbackKey2 := safeAddress(t).String()
	err = store.RegisterWebhook(params.ctx, app, webhook2, deviceKey2, fallbackKey2)
	require.NoError(err)

	info, err = store.GetAppInfo(params.ctx, app)
	require.NoError(err)
	require.Equal(
		&storage.AppInfo{
			App:             app,
			Owner:           owner,
			EncryptedSecret: [32]byte(secretBytes),
			Metadata:        testAppMetadataWithName("app"),
			WebhookUrl:      webhook2,
			EncryptionDevice: storage.EncryptionDevice{
				DeviceKey:   deviceKey2,
				FallbackKey: fallbackKey2,
			},
		},
		info,
	)

	err = store.RegisterWebhook(params.ctx, unregisteredApp, webhook, deviceKey, fallbackKey)
	require.ErrorContains(err, "app was not found in registry")

	// Confirm that device keys must be unique.
	err = store.CreateApp(
		params.ctx,
		owner,
		app2,
		types.AppSettings{ForwardSetting: ForwardSettingValue_FORWARD_SETTING_UNSPECIFIED},
		testAppMetadataWithName("app2"),
		secret,
	)
	require.NoError(err)
	err = store.RegisterWebhook(params.ctx, app2, webhook, deviceKey2, fallbackKey)
	require.ErrorContains(err, "another app is using this device id")
	require.True(base.IsRiverErrorCode(err, Err_ALREADY_EXISTS))
}

func TestCreateApp(t *testing.T) {
	params := setupAppRegistryStorageTest(t)

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

	err = store.CreateApp(
		params.ctx,
		owner,
		app,
		types.AppSettings{ForwardSetting: ForwardSettingValue_FORWARD_SETTING_ALL_MESSAGES},
		testAppMetadataWithName("app"),
		secret,
	)
	require.NoError(err)

	// apps are uniquely keyed by address.
	err = store.CreateApp(
		params.ctx,
		owner2,
		app,
		types.AppSettings{ForwardSetting: ForwardSettingValue_FORWARD_SETTING_MENTIONS_REPLIES_REACTIONS},
		testAppMetadataWithName("app 2"),
		secret,
	)
	require.ErrorContains(err, "app already exists")
	require.True(base.IsRiverErrorCode(err, Err_ALREADY_EXISTS))

	// Fine to have multiple apps per owner, with different display names for each bot.
	err = store.CreateApp(
		params.ctx,
		owner,
		app2,
		types.AppSettings{ForwardSetting: ForwardSettingValue_FORWARD_SETTING_MENTIONS_REPLIES_REACTIONS},
		testAppMetadataWithName("app 2"),
		secret2,
	)
	require.NoError(err)

	// Test creating an app with duplicate username should fail
	app4 := safeAddress(t)
	err = store.CreateApp(
		params.ctx,
		owner,
		app4,
		types.AppSettings{ForwardSetting: ForwardSettingValue_FORWARD_SETTING_ALL_MESSAGES},
		testAppMetadataWithName("app"), // Same username as first app
		secret,
	)
	require.Error(err)
	require.True(base.IsRiverErrorCode(err, Err_ALREADY_EXISTS))
	require.ErrorContains(err, "another app with the same username already exists")

	// Test creating an app with duplicate display name but different username should succeed
	app5 := safeAddress(t)
	metadataWithDuplicateDisplayName := types.AppMetadata{
		Username:    "unique_username_5", // Different username
		DisplayName: "app Bot",           // Same display name as the first app
		Description: "Another test application",
		ImageUrl:    "https://example.com/image5.png",
		AvatarUrl:   "https://example.com/avatar5.png",
	}
	err = store.CreateApp(
		params.ctx,
		owner,
		app5,
		types.AppSettings{ForwardSetting: ForwardSettingValue_FORWARD_SETTING_ALL_MESSAGES},
		metadataWithDuplicateDisplayName,
		secret,
	)
	require.NoError(err, "Should be able to create app with duplicate display name but different username")

	// Verify the app was created successfully
	info5, err := store.GetAppInfo(params.ctx, app5)
	require.NoError(err)
	require.Equal(metadataWithDuplicateDisplayName.Username, info5.Metadata.Username)
	require.Equal(metadataWithDuplicateDisplayName.DisplayName, info5.Metadata.DisplayName)
	require.Equal("app Bot", info5.Metadata.DisplayName, "Display name should be the same as first app")

	info, err := store.GetAppInfo(params.ctx, app)
	require.NoError(err)
	require.Equal(
		&storage.AppInfo{
			App:             app,
			Owner:           owner,
			EncryptedSecret: secret,
			Metadata:        testAppMetadataWithName("app"),
			Settings: types.AppSettings{
				ForwardSetting: ForwardSettingValue_FORWARD_SETTING_ALL_MESSAGES,
			},
		},
		info,
	)

	info, err = store.GetAppInfo(params.ctx, app2)
	require.NoError(err)
	require.Equal(
		&storage.AppInfo{
			App:             app2,
			Owner:           owner,
			EncryptedSecret: secret2,
			Metadata:        testAppMetadataWithName("app 2"),
			Settings: types.AppSettings{
				ForwardSetting: ForwardSettingValue_FORWARD_SETTING_MENTIONS_REPLIES_REACTIONS,
			},
		},
		info,
	)

	info, err = store.GetAppInfo(params.ctx, app3)
	require.Nil(info)
	require.ErrorContains(err, "app is not registered")
	require.True(base.IsRiverErrorCode(err, Err_NOT_FOUND))
}

func TestRotateSecret(t *testing.T) {
	params := setupAppRegistryStorageTest(t)

	require := require.New(t)
	store := params.pgAppRegistryStore

	// Generate random addresses
	owner := safeAddress(t)
	app := safeAddress(t)

	secretBytes, err := hex.DecodeString(testSecretHexString)
	require.NoError(err)
	secret := [32]byte(secretBytes)

	secretBytes2, err := hex.DecodeString(testSecretHexString2)
	require.NoError(err)
	secret2 := [32]byte(secretBytes2)

	err = store.CreateApp(params.ctx, owner, app, types.AppSettings{
		ForwardSetting: ForwardSettingValue_FORWARD_SETTING_UNSPECIFIED,
	}, testAppMetadataWithName("app"), secret)
	require.NoError(err)

	info, err := store.GetAppInfo(params.ctx, app)
	require.NoError(err)
	require.Equal(secret, info.EncryptedSecret)

	err = store.RotateSecret(params.ctx, app, secret2)
	require.NoError(err)

	info, err = store.GetAppInfo(params.ctx, app)
	require.NoError(err)
	require.Equal(secret2, info.EncryptedSecret)

	err = store.RotateSecret(params.ctx, safeAddress(t), secret)
	require.ErrorContains(err, "app was not found in registry")
}

func requireSendableMessagesEqual(t *testing.T, expected *storage.SendableMessages, actual *storage.SendableMessages) {
	if expected == nil {
		require.Nil(t, actual, "Expected nil SendableMessages")
	} else {
		require.Equal(t, expected.AppId, actual.AppId)
		require.Equal(t, expected.EncryptedSharedSecret, actual.EncryptedSharedSecret)
		require.Equal(t, expected.WebhookUrl, actual.WebhookUrl)
		require.ElementsMatch(t, expected.MessageEnvelopes, actual.MessageEnvelopes)
	}
}

func TestPublishSessionKeys(t *testing.T) {
	params := setupAppRegistryStorageTest(t)

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
		[]byte("ciphertexts"),
	)
	require.Nil(messages)
	require.ErrorContains(err, "app with device key is not registered")
	require.True(base.IsRiverErrorCode(err, Err_NOT_FOUND))

	// Create an app...
	owner := safeAddress(t)
	app := safeAddress(t)

	secretBytes, err := hex.DecodeString(testSecretHexString)
	require.NoError(err)
	secret := [32]byte(secretBytes)

	err = store.CreateApp(params.ctx, owner, app, types.AppSettings{
		ForwardSetting: ForwardSettingValue_FORWARD_SETTING_UNSPECIFIED,
	}, testAppMetadataWithName("app"), secret)
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
		[]byte("ciphertexts"),
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
		[]byte("ciphertexts2"),
	)
	require.Nil(messages)
	require.Nil(err)

	messages, err = store.PublishSessionKeys(
		params.ctx,
		shared.StreamId{},
		deviceKey,
		[]string{sessionId, sessionId2, sessionId3},
		[]byte("ciphertexts123"),
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

func TestGetSendableApps(t *testing.T) {
	params := setupAppRegistryStorageTest(t)

	require := require.New(t)
	store := params.pgAppRegistryStore

	// Generate random addresses
	owner := safeAddress(t)
	app := safeAddress(t)

	owner2 := safeAddress(t)
	app2 := safeAddress(t)

	secretBytes, err := hex.DecodeString(testSecretHexString)
	require.NoError(err)
	secret := [32]byte(secretBytes)

	secretBytes2, err := hex.DecodeString(testSecretHexString2)
	require.NoError(err)
	secret2 := [32]byte(secretBytes2)

	sApp := storage.SendableApp{
		AppId:      app,
		DeviceKey:  "deviceKey",
		WebhookUrl: "http://www.wh.com/path",
		SendMessageSecrets: storage.SendMessageSecrets{
			EncryptedSharedSecret: secret,
		},
	}
	sApp2 := storage.SendableApp{
		AppId:      app2,
		DeviceKey:  "deviceKey2",
		WebhookUrl: "http://www.wh.com/path2",
		SendMessageSecrets: storage.SendMessageSecrets{
			EncryptedSharedSecret: secret2,
		},
	}

	require.NoError(store.CreateApp(params.ctx, owner, app, types.AppSettings{
		ForwardSetting: ForwardSettingValue_FORWARD_SETTING_UNSPECIFIED,
	}, testAppMetadataWithName("app"), secret))
	require.NoError(store.RegisterWebhook(params.ctx, app, sApp.WebhookUrl, sApp.DeviceKey, "fallbackKey"))

	require.NoError(store.CreateApp(params.ctx, owner2, app2, types.AppSettings{
		ForwardSetting: ForwardSettingValue_FORWARD_SETTING_UNSPECIFIED,
	}, testAppMetadataWithName("app2"), secret2))
	require.NoError(store.RegisterWebhook(params.ctx, app2, sApp2.WebhookUrl, sApp2.DeviceKey, "fallbackKey2"))

	sendableApps, err := store.GetSendableApps(params.ctx, []common.Address{})
	require.Len(sendableApps, 0)
	require.NoError(err)

	sendableApps, err = store.GetSendableApps(params.ctx, []common.Address{safeAddress(t)})
	require.Len(sendableApps, 0)
	require.Error(err, "some apps were not found the registry")

	sendableApps, err = store.GetSendableApps(params.ctx, []common.Address{app})
	require.NoError(err)
	require.ElementsMatch(
		sendableApps,
		[]storage.SendableApp{
			sApp,
		},
	)

	sendableApps, err = store.GetSendableApps(params.ctx, []common.Address{app2})
	require.NoError(err)
	require.ElementsMatch(
		sendableApps,
		[]storage.SendableApp{
			sApp2,
		},
	)

	sendableApps, err = store.GetSendableApps(params.ctx, []common.Address{app, app2})
	require.NoError(err)
	require.ElementsMatch(
		sendableApps,
		[]storage.SendableApp{
			sApp,
			sApp2,
		},
	)
}

func TestEnqueueMessages(t *testing.T) {
	params := setupAppRegistryStorageTest(t)

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
	require.True(base.IsRiverErrorCode(err, Err_NOT_FOUND))

	err = store.CreateApp(
		params.ctx,
		owner.Address,
		apps[0].Address,
		types.AppSettings{
			ForwardSetting: ForwardSettingValue_FORWARD_SETTING_UNSPECIFIED,
		},
		testAppMetadataWithName("app0"),
		secrets[0],
	)
	require.NoError(err)

	webhook := "https://webhook.com/0"
	err = store.RegisterWebhook(params.ctx, apps[0].Address, webhook, deviceKeys[0], fallbackKey)
	require.NoError(err)

	// Registering a session key for a non-existent device fails the entire
	// transaction, even when the first key corresponds to a registered app.
	sendableApps, unsendableApps, err = store.EnqueueUnsendableMessages(
		params.ctx,
		[]common.Address{apps[0].Address, apps[1].Address},
		sessionId1,
		message1Bytes,
	)
	require.Nil(sendableApps)
	require.Nil(unsendableApps)
	require.ErrorContains(err, "some app ids were not registered")
	require.True(base.IsRiverErrorCode(err, Err_NOT_FOUND))

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
			MessageEnvelopes:      streamEvents,
		}
	}

	// Now, publish a key for this (device key, session id). We expect to get this
	// message back.
	messages, err := store.PublishSessionKeys(
		params.ctx,
		shared.StreamId{},
		deviceKeys[0],
		[]string{sessionId1, sessionId3},
		[]byte("ciphertextsDevice0Session1Session3"),
	)
	require.NoError(err)
	requireSendableMessagesEqual(
		t,
		sendableMessagesAtIndexWithEvents(0, [][]byte{message1Bytes}),
		messages,
	)

	// Register apps and webhooks for apps 2 through 5, to have all device keys registered
	for i := range 4 {
		appMetadata := testAppMetadataWithName(fmt.Sprintf("app %d", i+1))
		require.NoError(
			store.CreateApp(
				params.ctx,
				owner.Address,
				apps[i+1].Address,
				types.AppSettings{
					ForwardSetting: ForwardSettingValue_FORWARD_SETTING_UNSPECIFIED,
				},
				appMetadata,
				secrets[i+1],
			),
		)
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
		[]byte("ciphertextsDevice1Session2Session4"),
	)
	require.NotNil(messages)
	requireSendableMessagesEqual(
		t,
		sendableMessagesAtIndexWithEvents(1, [][]byte{message2Bytes}),
		messages,
	)
	require.NoError(err)

	sendableAppWithSessionsAndCiphertexts := func(i int, encryptionEnvelope []byte) storage.SendableApp {
		return storage.SendableApp{
			DeviceKey:  deviceKeys[i],
			AppId:      apps[i].Address,
			WebhookUrl: fmt.Sprintf("https://webhook.com/%d", i),
			SendMessageSecrets: storage.SendMessageSecrets{
				EncryptionEnvelope:    encryptionEnvelope,
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
				[]byte("ciphertextsDevice1Session2Session4"),
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
	messages, err = store.PublishSessionKeys(
		params.ctx,
		shared.StreamId{},
		deviceKeys[1],
		[]string{sessionId1, sessionId4},
		[]byte("ciphertextsDevice1Session1Session4"),
	)
	require.Nil(messages)
	require.NoError(err)

	// current session key state
	// device 0: [sessionId1, sessionId3]
	// device 1: [sessionId2, sessionId4], [sessionId1, sessionId4]

	// Enqueue another message. Expect 2 device to be sendable because device 0 and 1 have a key
	// for session 1.
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
				[]byte("ciphertextsDevice0Session1Session3"),
			),
			sendableAppWithSessionsAndCiphertexts(
				1,
				[]byte("ciphertextsDevice1Session1Session4"),
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
				[]byte("ciphertextsDevice0Session1Session3"),
			),
			sendableAppWithSessionsAndCiphertexts(
				1,
				[]byte("ciphertextsDevice1Session1Session4"),
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

	// Send a session 4 message to device 1. Validate that exactly one SendableApp is returned,
	// even though there are multiple key materials that could be used for device 1.
	sendable, unsendable, err = store.EnqueueUnsendableMessages(
		params.ctx,
		[]common.Address{apps[1].Address},
		sessionId4,
		message1Bytes,
	)
	require.Nil(err)
	require.Empty(unsendable)
	require.ElementsMatch(
		[]storage.SendableApp{
			sendableAppWithSessionsAndCiphertexts(
				1,
				[]byte("ciphertextsDevice1Session1Session4"),
			),
		},
		sendable,
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
				safeAddress(t).Bytes(),
			)
			require.NoError(err)
			if len(tc.messages) == 0 {
				require.Nil(messages)
			} else {
				requireSendableMessagesEqual(
					t,
					sendableMessagesAtIndexWithEvents(tc.deviceIndex, tc.messages),
					messages,
				)
			}
		})
	}
}

func TestSetAppMetadata(t *testing.T) {
	params := setupAppRegistryStorageTest(t)

	require := require.New(t)
	store := params.pgAppRegistryStore

	owner := safeAddress(t)
	app := safeAddress(t)
	unregisteredApp := safeAddress(t)

	secretBytes, err := hex.DecodeString(testSecretHexString)
	require.NoError(err)
	secret := [32]byte(secretBytes)

	// Create an app with initial metadata
	initialMetadata := testAppMetadataWithName("app")
	err = store.CreateApp(
		params.ctx,
		owner,
		app,
		types.AppSettings{ForwardSetting: ForwardSettingValue_FORWARD_SETTING_UNSPECIFIED},
		initialMetadata,
		secret,
	)
	require.NoError(err)

	// Verify initial metadata
	appInfo, err := store.GetAppInfo(params.ctx, app)
	require.NoError(err)
	require.Equal(initialMetadata, appInfo.Metadata)

	// Update metadata
	updatedMetadata := types.AppMetadata{
		Username:    "updated_app",
		DisplayName: "Updated App Display",
		Description: "Updated description for the app",
		ImageUrl:    "https://example.com/updated-image.png",
		AvatarUrl:   "https://example.com/updated-avatar.png",
		ExternalUrl: "https://external.example.com",
		SlashCommands: []types.SlashCommand{
			{Name: "help", Description: "Updated help command"},
			{Name: "search", Description: "Search for content"},
			{Name: "config", Description: "Configure settings"},
		},
	}

	err = store.SetAppMetadata(params.ctx, app, updatedMetadata)
	require.NoError(err)

	// Verify updated metadata
	appInfo, err = store.GetAppInfo(params.ctx, app)
	require.NoError(err)
	require.Equal(updatedMetadata, appInfo.Metadata)

	// Test setting metadata for non-existent app
	err = store.SetAppMetadata(params.ctx, unregisteredApp, updatedMetadata)
	require.Error(err)
	require.True(base.IsRiverErrorCode(err, Err_NOT_FOUND))
	require.ErrorContains(err, "app was not found in registry")

	// Test that duplicate usernames are not allowed but duplicate display names ARE allowed
	// First, create another app.
	app2 := safeAddress(t)
	app2Metadata := types.AppMetadata{
		Username:    "app2",
		DisplayName: "App 2 Display",
		Description: "A second test application",
		ImageUrl:    "https://example.com/second-image.png",
		AvatarUrl:   "https://example.com/second-avatar.png",
		ExternalUrl: "https://second.example.com",
	}
	err = store.CreateApp(
		params.ctx,
		owner,
		app2,
		types.AppSettings{ForwardSetting: ForwardSettingValue_FORWARD_SETTING_ALL_MESSAGES},
		app2Metadata,
		secret,
	)
	require.NoError(err)

	// Test 1: Try to update app2's username to match app's username - should fail
	app2Metadata.Username = updatedMetadata.Username
	err = store.SetAppMetadata(params.ctx, app2, app2Metadata)
	require.Error(err)
	require.True(base.IsRiverErrorCode(err, Err_ALREADY_EXISTS))
	require.ErrorContains(err, "another app with the same username already exists")

	// Test 2: Update app2's display name to match app's display name - should succeed
	app2Metadata.Username = "app2"                         // Reset to original username
	app2Metadata.DisplayName = updatedMetadata.DisplayName // Same display name as app
	err = store.SetAppMetadata(params.ctx, app2, app2Metadata)
	require.NoError(err, "Should be able to set duplicate display name")

	// Verify both apps have the same display name but different usernames
	appInfo1, err := store.GetAppInfo(params.ctx, app)
	require.NoError(err)
	appInfo2, err := store.GetAppInfo(params.ctx, app2)
	require.NoError(err)
	require.Equal(
		appInfo1.Metadata.DisplayName,
		appInfo2.Metadata.DisplayName,
		"Both apps should have the same display name",
	)
	require.NotEqual(appInfo1.Metadata.Username, appInfo2.Metadata.Username, "Apps should have different usernames")

	// Test updating slash commands - remove all commands
	metadataNoCommands := updatedMetadata
	metadataNoCommands.SlashCommands = []types.SlashCommand{}
	err = store.SetAppMetadata(params.ctx, app, metadataNoCommands)
	require.NoError(err)

	// Verify no slash commands
	appInfo, err = store.GetAppInfo(params.ctx, app)
	require.NoError(err)
	require.Empty(appInfo.Metadata.SlashCommands)

	// Test updating with many slash commands (storage layer doesn't validate count)
	manyCommands := make([]types.SlashCommand, 30)
	for i := 0; i < 30; i++ {
		manyCommands[i] = types.SlashCommand{
			Name:        fmt.Sprintf("command%d", i),
			Description: fmt.Sprintf("Description for command %d", i),
		}
	}
	metadataWithManyCommands := updatedMetadata
	metadataWithManyCommands.SlashCommands = manyCommands
	err = store.SetAppMetadata(params.ctx, app, metadataWithManyCommands)
	require.NoError(err) // Storage layer doesn't validate, just stores

	// Verify all commands were stored
	appInfo, err = store.GetAppInfo(params.ctx, app)
	require.NoError(err)
	require.Len(appInfo.Metadata.SlashCommands, 30)
}

func TestGetAppMetadata(t *testing.T) {
	params := setupAppRegistryStorageTest(t)

	require := require.New(t)
	store := params.pgAppRegistryStore

	owner := safeAddress(t)
	app := safeAddress(t)
	unregisteredApp := safeAddress(t)

	secretBytes, err := hex.DecodeString(testSecretHexString)
	require.NoError(err)
	secret := [32]byte(secretBytes)

	// Create an app with metadata
	originalMetadata := types.AppMetadata{
		Username:    "my_test_app",
		DisplayName: "My Test App Display",
		Description: "This is a test application for unit testing",
		ImageUrl:    "https://example.com/my-image.png",
		AvatarUrl:   "https://example.com/my-avatar.png",
		ExternalUrl: "https://my-external-site.com",
	}

	err = store.CreateApp(
		params.ctx,
		owner,
		app,
		types.AppSettings{ForwardSetting: ForwardSettingValue_FORWARD_SETTING_ALL_MESSAGES},
		originalMetadata,
		secret,
	)
	require.NoError(err)

	// Test getting metadata for existing app
	metadata, err := store.GetAppMetadata(params.ctx, app)
	require.NoError(err)
	require.NotNil(metadata)
	require.Equal(originalMetadata, *metadata)

	// Test getting metadata for non-existent app
	metadata, err = store.GetAppMetadata(params.ctx, unregisteredApp)
	require.Error(err)
	require.Nil(metadata)
	require.True(base.IsRiverErrorCode(err, Err_NOT_FOUND))
	require.ErrorContains(err, "app is not registered")
}

func TestAppMetadataInGetAppInfo(t *testing.T) {
	params := setupAppRegistryStorageTest(t)

	require := require.New(t)
	store := params.pgAppRegistryStore

	owner := safeAddress(t)
	app := safeAddress(t)

	secretBytes, err := hex.DecodeString(testSecretHexString)
	require.NoError(err)
	secret := [32]byte(secretBytes)

	// Create an app with comprehensive metadata
	metadata := types.AppMetadata{
		Username:    "comprehensive_test_app",
		DisplayName: "Comprehensive Test App Display",
		Description: "This app tests all metadata fields integration with AppInfo",
		ImageUrl:    "https://example.com/comprehensive-image.jpg",
		AvatarUrl:   "https://example.com/comprehensive-avatar.jpg",
		ExternalUrl: "https://comprehensive-test.com",
	}

	err = store.CreateApp(
		params.ctx,
		owner,
		app,
		types.AppSettings{ForwardSetting: ForwardSettingValue_FORWARD_SETTING_MENTIONS_REPLIES_REACTIONS},
		metadata,
		secret,
	)
	require.NoError(err)

	// Register a webhook to have full AppInfo
	deviceKey := "comprehensive-device-key"
	fallbackKey := "comprehensive-fallback-key"
	webhookUrl := "https://webhook.example.com/comprehensive"

	err = store.RegisterWebhook(params.ctx, app, webhookUrl, deviceKey, fallbackKey)
	require.NoError(err)

	// Get full app info and verify all fields including metadata
	appInfo, err := store.GetAppInfo(params.ctx, app)
	require.NoError(err)
	require.Equal(
		&storage.AppInfo{
			App:             app,
			Owner:           owner,
			EncryptedSecret: secret,
			Settings: types.AppSettings{
				ForwardSetting: ForwardSettingValue_FORWARD_SETTING_MENTIONS_REPLIES_REACTIONS,
			},
			Metadata:   metadata,
			WebhookUrl: webhookUrl,
			EncryptionDevice: storage.EncryptionDevice{
				DeviceKey:   deviceKey,
				FallbackKey: fallbackKey,
			},
		},
		appInfo,
	)
}

func TestIsUsernameAvailable(t *testing.T) {
	params := setupAppRegistryStorageTest(t)

	require := require.New(t)
	store := params.pgAppRegistryStore

	owner := safeAddress(t)
	app1 := safeAddress(t)
	app2 := safeAddress(t)

	secretBytes, err := hex.DecodeString(testSecretHexString)
	require.NoError(err)
	secret := [32]byte(secretBytes)

	// Test that a username is available before any app is created
	available, err := store.IsUsernameAvailable(params.ctx, "unique_bot_name")
	require.NoError(err)
	require.True(available, "Username should be available when no apps exist")

	// Create an app with a specific username
	metadata1 := types.AppMetadata{
		Username:    "existing_bot",
		DisplayName: "Existing Bot Display",
		Description: "First bot",
		ImageUrl:    "https://example.com/bot1.png",
		AvatarUrl:   "https://example.com/avatar1.png",
	}

	err = store.CreateApp(
		params.ctx,
		owner,
		app1,
		types.AppSettings{ForwardSetting: ForwardSettingValue_FORWARD_SETTING_ALL_MESSAGES},
		metadata1,
		secret,
	)
	require.NoError(err)

	// Test that the same username is not available
	available, err = store.IsUsernameAvailable(params.ctx, "existing_bot")
	require.NoError(err)
	require.False(available, "Username should not be available when already taken")

	// Test that a different username is available
	available, err = store.IsUsernameAvailable(params.ctx, "different_bot")
	require.NoError(err)
	require.True(available, "Different username should be available")

	// Create another app with a different username
	metadata2 := types.AppMetadata{
		Username:    "second_bot",
		DisplayName: "Second Bot Display",
		Description: "Second bot",
		ImageUrl:    "https://example.com/bot2.png",
		AvatarUrl:   "https://example.com/avatar2.png",
	}

	err = store.CreateApp(
		params.ctx,
		owner,
		app2,
		types.AppSettings{ForwardSetting: ForwardSettingValue_FORWARD_SETTING_MENTIONS_REPLIES_REACTIONS},
		metadata2,
		secret,
	)
	require.NoError(err)

	// Verify both usernames are not available
	available, err = store.IsUsernameAvailable(params.ctx, "existing_bot")
	require.NoError(err)
	require.False(available)

	available, err = store.IsUsernameAvailable(params.ctx, "second_bot")
	require.NoError(err)
	require.False(available)

	// Test empty username - storage layer just checks DB, returns true since no app has empty username
	// The service layer is responsible for validating that empty usernames are not acceptable
	available, err = store.IsUsernameAvailable(params.ctx, "")
	require.NoError(err)
	require.True(
		available,
		"Storage layer returns true for empty username (no DB entry), service layer handles validation",
	)

	// Test case sensitivity (assuming the implementation is case-sensitive based on the unique constraint)
	available, err = store.IsUsernameAvailable(params.ctx, "existingbot")
	require.NoError(err)
	require.True(available, "Lowercase version should be available if implementation is case-sensitive")

	available, err = store.IsUsernameAvailable(params.ctx, "EXISTINGBOT")
	require.NoError(err)
	require.True(available, "Uppercase version should be available if implementation is case-sensitive")
}
