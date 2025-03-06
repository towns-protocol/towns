package rpc

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/hex"
	"sync"
	"testing"
	"time"

	mapset "github.com/deckarep/golang-set/v2"
	"go.uber.org/zap/zapcore"

	"connectrpc.com/connect"

	"github.com/ethereum/go-ethereum/common"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/towns-protocol/towns/core/node/app_registry"
	"github.com/towns-protocol/towns/core/node/app_registry/app_client"
	"github.com/towns-protocol/towns/core/node/authentication"
	"github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/crypto"
	"github.com/towns-protocol/towns/core/node/events"
	"github.com/towns-protocol/towns/core/node/logging"
	"github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/protocol/protocolconnect"
	. "github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/storage"
	"github.com/towns-protocol/towns/core/node/testutils"
	"github.com/towns-protocol/towns/core/node/testutils/dbtestutils"
	"github.com/towns-protocol/towns/core/node/testutils/testcert"
	"github.com/towns-protocol/towns/core/node/track_streams"
)

var testEncryptionDevice = app_client.EncryptionDevice{
	DeviceKey:   "deviceKey",
	FallbackKey: "fallbackKey",
}

func authenticateBS[T any](
	ctx context.Context,
	req *require.Assertions,
	authClient protocolconnect.AuthenticationServiceClient,
	primaryWallet *crypto.Wallet,
	request *connect.Request[T],
) {
	authentication.Authenticate(
		ctx,
		"AS_AUTH:",
		req,
		authClient,
		primaryWallet,
		request,
	)
}

type messageEventRecord struct {
	streamId       StreamId
	parentStreamId *StreamId
	apps           mapset.Set[string]
	event          *events.ParsedEvent
}

type MockStreamEventListener struct {
	mu                  sync.Mutex
	messageEventRecords []messageEventRecord
}

func (m *MockStreamEventListener) OnMessageEvent(
	ctx context.Context,
	streamId StreamId,
	parentStreamId *StreamId, // nil for dms and gdms
	apps mapset.Set[string],
	event *events.ParsedEvent,
) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.messageEventRecords = append(m.messageEventRecords, messageEventRecord{
		streamId,
		parentStreamId,
		apps,
		event,
	})
}

func (m *MockStreamEventListener) MessageEventRecords() []messageEventRecord {
	m.mu.Lock()
	defer m.mu.Unlock()

	return m.messageEventRecords
}

var _ track_streams.StreamEventListener = (*MockStreamEventListener)(nil)

func initAppRegistryService(
	ctx context.Context,
	tester *serviceTester,
) (AppRegistry *Service, streamEventListener *MockStreamEventListener) {
	bc := tester.btc.NewWalletAndBlockchain(tester.ctx)
	listener, _ := makeTestListener(tester.t)

	config := tester.getConfig()
	config.AppRegistry.AppRegistryId = base.GenShortNanoid()

	var key [32]byte
	_, err := rand.Read(key[:])
	tester.require.NoError(err)
	config.AppRegistry.SharedSecretDataEncryptionKey = hex.EncodeToString(key[:])

	_, err = rand.Read(key[:])
	tester.require.NoError(err)
	config.AppRegistry.Authentication.SessionToken.Key.Algorithm = "HS256"
	config.AppRegistry.Authentication.SessionToken.Key.Key = hex.EncodeToString(key[:])

	// Allow loopback webhooks for local testing
	config.AppRegistry.AllowInsecureWebhooks = true

	ctx = logging.CtxWithLog(ctx, logging.FromCtx(ctx).With("service", "app-registry"))
	streamEventListener = &MockStreamEventListener{}
	AppRegistry, err = StartServerInAppRegistryMode(
		ctx,
		config,
		&ServerStartOpts{
			RiverChain:          bc,
			Listener:            listener,
			HttpClientMaker:     testcert.GetHttp2LocalhostTLSClient,
			StreamEventListener: streamEventListener,
		},
	)
	tester.require.NoError(err)

	// Clean up schema
	tester.cleanup(func() {
		err := dbtestutils.DeleteTestSchema(
			context.Background(),
			tester.dbUrl,
			storage.DbSchemaNameForAppRegistryService(config.AppRegistry.AppRegistryId),
		)
		tester.require.NoError(err)
	})
	tester.cleanup(AppRegistry.Close)

	return AppRegistry, streamEventListener
}

func TestAppRegistry_ForwardsChannelEvents(t *testing.T) {
	tester := newServiceTester(t, serviceTesterOpts{numNodes: 1, start: true})
	loggingCtx := logging.CtxWithLog(tester.ctx, logging.DefaultZapLogger(zapcore.DebugLevel))
	service, listener := initAppRegistryService(
		loggingCtx,
		tester,
	)

	require := tester.require
	client := tester.testClient(0)

	wallet := safeNewWallet(tester.ctx, require)
	owner := safeNewWallet(tester.ctx, require)

	// Set up app service clients
	httpClient, _ := testcert.GetHttp2LocalhostTLSClient(tester.ctx, tester.getConfig())
	serviceAddr := "https://" + service.listener.Addr().String()
	authClient := protocolconnect.NewAuthenticationServiceClient(
		httpClient, serviceAddr,
	)
	appRegistryClient := protocolconnect.NewAppRegistryServiceClient(
		httpClient, serviceAddr,
	)

	// Start a test app service that serves webhook responses
	appServer := app_registry.NewTestAppServer(t, wallet, client)
	defer appServer.Close()
	go func() {
		if err := appServer.Serve(tester.ctx); err != nil {
			t.Errorf("Error starting app service: %v", err)
		}
	}()

	// Create user_* streams for app and register the app and webhook
	safeCreateStreamsForApp(t, tester.ctx, wallet, client, &testEncryptionDevice)
	sharedSecret := register(
		tester.ctx,
		require,
		wallet.Address[:],
		owner.Address[:],
		owner,
		authClient,
		appRegistryClient,
	)
	registerWebhook(
		tester.ctx,
		require,
		wallet,
		sharedSecret,
		testEncryptionDevice,
		authClient,
		appRegistryClient,
		appServer,
	)

	// Create a space
	spaceId := testutils.FakeStreamId(STREAM_SPACE_BIN)
	_, _, err := createSpace(tester.ctx, wallet, client, spaceId, nil)
	require.NoError(err)

	// Create the space's default / general channel
	channelId := StreamId{STREAM_CHANNEL_BIN}
	copy(channelId[1:21], spaceId[1:21])
	_, err = rand.Read(channelId[21:])
	require.NoError(err)

	channel, _, err := createChannel(tester.ctx, wallet, client, spaceId, channelId, nil)
	require.NoError(err)
	require.NotNil(channel)

	// Build a test message to send to the channel
	testMessageText := "abc"
	event, err := events.MakeEnvelopeWithPayloadAndTags(
		wallet,
		events.Make_ChannelPayload_Message(testMessageText),
		&MiniblockRef{
			Num:  channel.GetMinipoolGen() - 1,
			Hash: common.Hash(channel.GetPrevMiniblockHash()),
		},
		nil,
	)
	require.NoError(err)

	log := logging.FromCtx(loggingCtx)
	log.Info("About to add event")
	_, err = client.AddEvent(tester.ctx, connect.NewRequest(&protocol.AddEventRequest{
		StreamId: channelId[:],
		Event:    event,
		Optional: false,
	}))
	log.Info("Added event")
	require.NoError(err)

	require.EventuallyWithT(func(c *assert.CollectT) {
		records := listener.MessageEventRecords()
		assert.GreaterOrEqual(c, len(records), 1, "No messages were forwarded")
		found := false
		for _, record := range records {
			assert.Equal(c, channelId, record.streamId, "Forwarded message from wrong stream")
			assert.Equal(
				c,
				spaceId,
				*record.parentStreamId,
				"SpaceId incorrectly populated for forwarded message %v",
				record,
			)

			channelPayload := record.event.GetChannelMessage()
			if channelPayload != nil && channelPayload.Message.Ciphertext == testMessageText {
				found = true
			}
		}
		assert.True(c, found, "Message not found %v", records)
	}, 10*time.Second, 100*time.Millisecond, "App registry service did not forward channel event")
	log.Info("Done!")
}

// invalidAddressBytes is a slice of bytes that cannot be parsed into an address, because
// it is too long. Valid addresses are 20 bytes.
var invalidAddressBytes = bytes.Repeat([]byte("a"), 21)

func safeNewWallet(ctx context.Context, require *require.Assertions) *crypto.Wallet {
	wallet, err := crypto.NewWallet(ctx)
	require.NoError(err)
	return wallet
}

func register(
	ctx context.Context,
	require *require.Assertions,
	appAddress []byte,
	ownerAddress []byte,
	signer *crypto.Wallet,
	authClient protocolconnect.AuthenticationServiceClient,
	appRegistryClient protocolconnect.AppRegistryServiceClient,
) (sharedSecret []byte) {
	req := &connect.Request[protocol.RegisterRequest]{
		Msg: &protocol.RegisterRequest{
			AppId:      appAddress,
			AppOwnerId: ownerAddress,
		},
	}
	authenticateBS(ctx, require, authClient, signer, req)
	resp, err := appRegistryClient.Register(
		ctx,
		req,
	)
	require.NoError(err)
	require.NotNil(resp)
	require.Len(resp.Msg.Hs256SharedSecret, 32, "Shared secret length should be 32 bytes")
	return resp.Msg.GetHs256SharedSecret()
}

func registerWebhook(
	ctx context.Context,
	require *require.Assertions,
	appWallet *crypto.Wallet,
	appSharedSecret []byte,
	encryptionDevice app_client.EncryptionDevice,
	authClient protocolconnect.AuthenticationServiceClient,
	appRegistryClient protocolconnect.AppRegistryServiceClient,
	appServer *app_registry.TestAppServer,
) {
	appServer.SetHS256SecretKey(appSharedSecret)
	appServer.SetEncryptionDevice(encryptionDevice)

	req := &connect.Request[protocol.RegisterWebhookRequest]{
		Msg: &protocol.RegisterWebhookRequest{
			AppId:      appWallet.Address[:],
			WebhookUrl: appServer.Url(),
		},
	}

	// Unauthenticated requests should fail
	authenticateBS(ctx, require, authClient, appWallet, req)

	resp, err := appRegistryClient.RegisterWebhook(
		ctx,
		req,
	)
	require.NoError(err)
	require.NotNil(resp)
}

func safeCreateStreamsForApp(
	t *testing.T,
	ctx context.Context,
	appWallet *crypto.Wallet,
	client protocolconnect.StreamServiceClient,
	encryptionDevice *app_client.EncryptionDevice,
) {
	_, _, err := createUser(ctx, appWallet, client, nil)
	require.NoError(t, err)

	_, _, err = createUserInboxStream(ctx, appWallet, client, nil)
	require.NoError(t, err)

	cookie, _, err := createUserMetadataStream(ctx, appWallet, client, nil)
	require.NoError(t, err)

	event, err := events.MakeEnvelopeWithPayloadAndTags(
		appWallet,
		events.Make_UserMetadataPayload_EncryptionDevice(
			encryptionDevice.DeviceKey,
			encryptionDevice.FallbackKey,
		),
		&MiniblockRef{
			Num:  cookie.GetMinipoolGen() - 1,
			Hash: common.Hash(cookie.GetPrevMiniblockHash()),
		},
		nil,
	)
	require.NoError(t, err)

	addEventResp, err := client.AddEvent(
		ctx,
		&connect.Request[protocol.AddEventRequest]{
			Msg: &protocol.AddEventRequest{
				StreamId: cookie.StreamId,
				Event:    event,
			},
		},
	)
	require.NoError(t, err)
	require.Nil(t, addEventResp.Msg.GetError())
}

func TestAppRegistry_RegisterWebhook(t *testing.T) {
	tester := newServiceTester(t, serviceTesterOpts{numNodes: 1, start: true})
	service, _ := initAppRegistryService(tester.ctx, tester)

	httpClient, _ := testcert.GetHttp2LocalhostTLSClient(tester.ctx, tester.getConfig())
	serviceAddr := "https://" + service.listener.Addr().String()
	authClient := protocolconnect.NewAuthenticationServiceClient(
		httpClient, serviceAddr,
	)
	AppRegistryClient := protocolconnect.NewAppRegistryServiceClient(
		httpClient, serviceAddr,
	)

	unregisteredAppWallet := safeNewWallet(tester.ctx, tester.require)
	appWallet := safeNewWallet(tester.ctx, tester.require)
	ownerWallet := safeNewWallet(tester.ctx, tester.require)
	app2Wallet := safeNewWallet(tester.ctx, tester.require)

	// Create needed streams and add an encryption device to the user metadata stream for the app service.
	tc := tester.newTestClient(0)
	safeCreateStreamsForApp(t, tester.ctx, appWallet, tc.client, &testEncryptionDevice)
	// No user metadata stream for app 2
	_, _, err := createUserInboxStream(tester.ctx, app2Wallet, tc.client, nil)
	require.NoError(t, err)

	// Register 2 apps. One will have a user metadata stream created with an ecryption device populated,
	// and one will not.
	appSharedSecret := register(
		tester.ctx,
		tester.require,
		appWallet.Address.Bytes(),
		ownerWallet.Address.Bytes(),
		ownerWallet,
		authClient,
		AppRegistryClient,
	)

	app2SharedSecret := register(
		tester.ctx,
		tester.require,
		app2Wallet.Address.Bytes(),
		ownerWallet.Address.Bytes(),
		ownerWallet,
		authClient,
		AppRegistryClient,
	)

	appServer := app_registry.NewTestAppServer(
		t,
		appWallet,
		tc.client,
	)
	defer appServer.Close()

	go func() {
		if err := appServer.Serve(tester.ctx); err != nil {
			t.Errorf("Error starting app service: %v", err)
		}
	}()

	tests := map[string]struct {
		appId                    []byte
		authenticatingWallet     *crypto.Wallet
		webhookUrl               string
		expectedErr              string
		overrideEncryptionDevice app_client.EncryptionDevice
		overrideSharedSecret     []byte
	}{
		"Success (app wallet signer)": {
			appId:                appWallet.Address[:],
			authenticatingWallet: appWallet,
			webhookUrl:           appServer.Url(),
		},
		"Success (owner wallet signer)": {
			appId:                appWallet.Address[:],
			authenticatingWallet: ownerWallet,
			webhookUrl:           appServer.Url(),
		},
		"Failure: unregistered app": {
			appId:                unregisteredAppWallet.Address[:],
			authenticatingWallet: unregisteredAppWallet,
			webhookUrl:           "http://www.test.com/callme",
			expectedErr:          "app does not exist",
		},
		"Failure: missing authentication": {
			appId:       appWallet.Address[:],
			webhookUrl:  "http://www.test.com/callme",
			expectedErr: "missing session token",
		},
		"Failure: unauthorized user": {
			appId:                appWallet.Address[:],
			authenticatingWallet: unregisteredAppWallet,
			webhookUrl:           "http://www.test.com/callme",
			expectedErr:          "authenticated user must be either app or owner",
		},
		"Failure: webhook returns incorrect encryption device": {
			appId:                appWallet.Address[:],
			authenticatingWallet: appWallet,
			webhookUrl:           appServer.Url(),
			overrideEncryptionDevice: app_client.EncryptionDevice{
				DeviceKey:   "wrongDeviceKey",
				FallbackKey: "wrongFallbackKey",
			},
			expectedErr: "webhook encryption device does not match default device detected by app registy service",
		},
		"Failure: bad webhook response": {
			appId:                appWallet.Address[:],
			authenticatingWallet: appWallet,
			webhookUrl:           appServer.Url(),
			// Bork the test app server response by providing a mistmached shared secret
			overrideSharedSecret: safeNewWallet(tester.ctx, tester.require).Address.Bytes(),
			expectedErr:          "webhook response non-OK status",
		},
		"Failure: missing user metadata stream for app": {
			appId:                app2Wallet.Address[:],
			authenticatingWallet: app2Wallet,
			webhookUrl:           appServer.Url(),
			overrideSharedSecret: app2SharedSecret,
			expectedErr:          "encryption device for app not found",
		},
	}

	for name, tc := range tests {
		t.Run(name, func(t *testing.T) {
			if tc.overrideSharedSecret == nil {
				appServer.SetHS256SecretKey(appSharedSecret)
			} else {
				appServer.SetHS256SecretKey(tc.overrideSharedSecret)
			}

			if tc.overrideEncryptionDevice == (app_client.EncryptionDevice{}) {
				appServer.SetEncryptionDevice(testEncryptionDevice)
			} else {
				appServer.SetEncryptionDevice(tc.overrideEncryptionDevice)
			}

			req := &connect.Request[protocol.RegisterWebhookRequest]{
				Msg: &protocol.RegisterWebhookRequest{
					AppId:      tc.appId,
					WebhookUrl: tc.webhookUrl,
				},
			}

			// Unauthenticated requests should fail
			if tc.authenticatingWallet != nil {
				authenticateBS(tester.ctx, tester.require, authClient, tc.authenticatingWallet, req)
			}

			resp, err := AppRegistryClient.RegisterWebhook(
				tester.ctx,
				req,
			)

			if tc.expectedErr == "" {
				tester.require.NoError(err)
				tester.require.NotNil(resp)
			} else {
				tester.require.Nil(resp)
				tester.require.ErrorContains(err, tc.expectedErr)
			}
		})
	}
}

func TestAppRegistry_Status(t *testing.T) {
	tester := newServiceTester(t, serviceTesterOpts{numNodes: 1, start: true})
	service, _ := initAppRegistryService(tester.ctx, tester)

	httpClient, _ := testcert.GetHttp2LocalhostTLSClient(tester.ctx, tester.getConfig())
	serviceAddr := "https://" + service.listener.Addr().String()
	authClient := protocolconnect.NewAuthenticationServiceClient(
		httpClient, serviceAddr,
	)
	AppRegistryClient := protocolconnect.NewAppRegistryServiceClient(
		httpClient, serviceAddr,
	)

	var unregisteredApp common.Address
	_, err := rand.Read(unregisteredApp[:])
	tester.require.NoError(err)

	appWallet, err := crypto.NewWallet(tester.ctx)
	tester.require.NoError(err)

	ownerWallet, err := crypto.NewWallet(tester.ctx)
	tester.require.NoError(err)

	req := &connect.Request[protocol.RegisterRequest]{
		Msg: &protocol.RegisterRequest{
			AppId:      appWallet.Address[:],
			AppOwnerId: ownerWallet.Address[:],
		},
	}
	authenticateBS(tester.ctx, tester.require, authClient, ownerWallet, req)
	resp, err := AppRegistryClient.Register(
		tester.ctx,
		req,
	)

	tester.require.NotNil(resp)
	tester.require.NoError(err)
	statusTests := map[string]struct {
		appId                []byte
		expectedIsRegistered bool
	}{
		"Registered app": {
			appId:                appWallet.Address[:],
			expectedIsRegistered: true,
		},
		"Unregistered app": {
			appId:                unregisteredApp[:],
			expectedIsRegistered: false,
		},
	}

	for name, tc := range statusTests {
		t.Run(name, func(t *testing.T) {
			status, err := AppRegistryClient.GetStatus(
				tester.ctx,
				&connect.Request[protocol.GetStatusRequest]{
					Msg: &protocol.GetStatusRequest{
						AppId: tc.appId,
					},
				},
			)
			tester.require.NoError(err)
			tester.require.NotNil(status)
			tester.require.Equal(tc.expectedIsRegistered, status.Msg.IsRegistered)
		})
	}
}

func TestAppRegistry_Register(t *testing.T) {
	tester := newServiceTester(t, serviceTesterOpts{numNodes: 1, start: true})
	service, _ := initAppRegistryService(tester.ctx, tester)

	httpClient, _ := testcert.GetHttp2LocalhostTLSClient(tester.ctx, tester.getConfig())
	serviceAddr := "https://" + service.listener.Addr().String()
	authClient := protocolconnect.NewAuthenticationServiceClient(
		httpClient, serviceAddr,
	)
	appRegistryClient := protocolconnect.NewAppRegistryServiceClient(
		httpClient, serviceAddr,
	)

	var unregisteredApp common.Address
	_, err := rand.Read(unregisteredApp[:])
	tester.require.NoError(err)

	appWallet := safeNewWallet(tester.ctx, tester.require)
	ownerWallet := safeNewWallet(tester.ctx, tester.require)

	// Create required streams so that the app can be registered.
	// The app requires the user inbox stream to exist for successful registration.
	safeCreateStreamsForApp(t, tester.ctx, appWallet, tester.testClient(0), &testEncryptionDevice)

	tests := map[string]struct {
		appId                []byte
		ownerId              []byte
		authenticatingWallet *crypto.Wallet
		expectedErr          string
	}{
		"Success": {
			appId:                appWallet.Address[:],
			ownerId:              ownerWallet.Address[:],
			authenticatingWallet: ownerWallet,
		},
		"Invalid app id": {
			appId:                invalidAddressBytes,
			ownerId:              ownerWallet.Address[:],
			authenticatingWallet: ownerWallet,
			expectedErr:          "invalid app id",
		},
		"Invalid owner id": {
			appId:                appWallet.Address[:],
			ownerId:              invalidAddressBytes,
			authenticatingWallet: ownerWallet,
			expectedErr:          "invalid owner id",
		},
		"Invalid authorization": {
			appId:                appWallet.Address[:],
			ownerId:              ownerWallet.Address[:],
			authenticatingWallet: appWallet,
			expectedErr:          "authenticated user must be app owner",
		},
		"Missing authorization": {
			appId:       appWallet.Address[:],
			ownerId:     ownerWallet.Address[:],
			expectedErr: "missing session token",
		},
	}
	for name, tc := range tests {
		t.Run(name, func(t *testing.T) {
			req := &connect.Request[protocol.RegisterRequest]{
				Msg: &protocol.RegisterRequest{
					AppId:      tc.appId,
					AppOwnerId: tc.ownerId,
				},
			}

			if tc.authenticatingWallet != nil {
				authenticateBS(tester.ctx, tester.require, authClient, tc.authenticatingWallet, req)
			}

			resp, err := appRegistryClient.Register(
				tester.ctx,
				req,
			)

			if tc.expectedErr == "" {
				tester.require.NoError(err)
				tester.require.NotNil(resp)
				tester.require.Len(resp.Msg.GetHs256SharedSecret(), 32)
			} else {
				tester.require.Nil(resp)
				tester.require.ErrorContains(err, tc.expectedErr)
			}
		})
	}
}
