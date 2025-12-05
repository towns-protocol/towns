package rpc

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"strings"
	"sync"
	"testing"
	"time"

	"connectrpc.com/connect"
	"github.com/ethereum/go-ethereum/common"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"google.golang.org/protobuf/proto"

	"github.com/towns-protocol/towns/core/node/app_registry"
	"github.com/towns-protocol/towns/core/node/app_registry/app_client"
	"github.com/towns-protocol/towns/core/node/authentication"
	"github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/base/test"
	"github.com/towns-protocol/towns/core/node/crypto"
	"github.com/towns-protocol/towns/core/node/events"
	"github.com/towns-protocol/towns/core/node/logging"
	"github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/protocol/protocolconnect"
	. "github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/storage"
	"github.com/towns-protocol/towns/core/node/testutils/dbtestutils"
	"github.com/towns-protocol/towns/core/node/testutils/testcert"
)

func testBotEncryptionDevice(botIndex int) app_client.EncryptionDevice {
	return app_client.EncryptionDevice{
		DeviceKey:   fmt.Sprintf("botDeviceKey%d", botIndex),
		FallbackKey: fmt.Sprintf("botFallbackKey%d", botIndex),
	}
}

type appRegistryServiceTester struct {
	serviceTester      *serviceTester
	t                  *testing.T
	ctx                context.Context
	require            *require.Assertions
	appRegistryService *Service

	botCredentials []testBotCredentials

	appServer *app_registry.TestAppServer

	authClient        protocolconnect.AuthenticationServiceClient
	appRegistryClient protocolconnect.AppRegistryServiceClient
}

func (ar *appRegistryServiceTester) BotWallets(botIndex int) (*crypto.Wallet, *crypto.Wallet) {
	ar.botIndexCheck(botIndex)
	return ar.botCredentials[botIndex].botWallet, ar.botCredentials[botIndex].ownerWallet
}

func (ar *appRegistryServiceTester) Owner(botIndex int) *crypto.Wallet {
	ar.botIndexCheck(botIndex)
	return ar.botCredentials[botIndex].ownerWallet
}

func (ar *appRegistryServiceTester) newTestClients(numClients int, opts testClientOpts) testClients {
	return ar.serviceTester.newTestClients(numClients, opts)
}

func appMetadataForBot(address []byte) *protocol.AppMetadata {
	return &protocol.AppMetadata{
		Username:    fmt.Sprintf("app_%x", address),
		DisplayName: fmt.Sprintf("App %x Bot", address),
		Description: fmt.Sprintf("Bot description - %x", address),
		ImageUrl:    fmt.Sprintf("http://image.com/%x/image.png", address),
		AvatarUrl:   fmt.Sprintf("http://image.com/%x/avatar.png", address),
		SlashCommands: []*protocol.SlashCommand{
			{Name: "help", Description: "Get help with bot commands"},
			{Name: "status", Description: "Check bot status"},
		},
	}
}

// assertAppMetadataEqual compares two AppMetadata instances and asserts they are equal
func assertAppMetadataEqual(t *testing.T, expected, actual *protocol.AppMetadata) {
	require := require.New(t)
	require.NotNil(actual, "actual metadata should not be nil")
	require.NotNil(expected, "expected metadata should not be nil")

	require.Equal(expected.GetUsername(), actual.GetUsername(), "metadata username mismatch")
	require.Equal(expected.GetDisplayName(), actual.GetDisplayName(), "metadata display_name mismatch")
	require.Equal(expected.GetDescription(), actual.GetDescription(), "metadata description mismatch")
	require.Equal(expected.GetImageUrl(), actual.GetImageUrl(), "metadata image_url mismatch")
	require.Equal(expected.GetAvatarUrl(), actual.GetAvatarUrl(), "metadata avatar_url mismatch")
	require.Equal(expected.GetExternalUrl(), actual.GetExternalUrl(), "metadata external_url mismatch")

	// Compare slash commands
	require.Equal(len(expected.GetSlashCommands()), len(actual.GetSlashCommands()), "slash command count mismatch")
	for i, expectedCmd := range expected.GetSlashCommands() {
		actualCmd := actual.GetSlashCommands()[i]
		require.Equal(expectedCmd.GetName(), actualCmd.GetName(), "slash command name mismatch at index %d", i)
		require.Equal(
			expectedCmd.GetDescription(),
			actualCmd.GetDescription(),
			"slash command description mismatch at index %d",
			i,
		)
	}
}

func (ar *appRegistryServiceTester) RegisterApp(
	appWallet *crypto.Wallet,
	ownerWallet *crypto.Wallet,
	forwardSetting protocol.ForwardSettingValue,
) (sharedSecret []byte) {
	req := &connect.Request[protocol.RegisterRequest]{
		Msg: &protocol.RegisterRequest{
			AppId:      appWallet.Address[:],
			AppOwnerId: ownerWallet.Address[:],
			Settings: &protocol.AppSettings{
				ForwardSetting: forwardSetting,
			},
			Metadata: appMetadataForBot(appWallet.Address[:]),
		},
	}
	authenticateBS(ar.ctx, ar.require, ar.authClient, ownerWallet, req)
	resp, err := ar.appRegistryClient.Register(
		ar.ctx,
		req,
	)
	ar.require.NoError(err)
	ar.require.NotNil(resp)
	ar.require.Len(resp.Msg.Hs256SharedSecret, 32, "Shared secret length should be 32 bytes")
	return resp.Msg.GetHs256SharedSecret()
}

func (ar *appRegistryServiceTester) RegisterBotServices(
	forwardSetting protocol.ForwardSettingValue,
) {
	var wg sync.WaitGroup
	wg.Add(len(ar.botCredentials))
	for i := range ar.botCredentials {
		go func() {
			ar.RegisterBotService(i, forwardSetting)
			wg.Done()
		}()
	}
	wg.Wait()
}

func (ar *appRegistryServiceTester) RegisterBotService(
	botIndex int,
	forwardSetting protocol.ForwardSettingValue,
) (sharedSecret []byte, mbRef *MiniblockRef) {
	sharedSecret, mbRef = ar.RegisterBotServiceNoWebHook(botIndex, forwardSetting)
	appWallet := ar.botCredentials[botIndex].botWallet

	req := &connect.Request[protocol.RegisterWebhookRequest]{
		Msg: &protocol.RegisterWebhookRequest{
			AppId:      appWallet.Address[:],
			WebhookUrl: ar.appServer.Url(botIndex),
		},
	}

	// Unauthenticated requests should fail
	authenticateBS(ar.ctx, ar.require, ar.authClient, appWallet, req)

	resp, err := ar.appRegistryClient.RegisterWebhook(
		ar.ctx,
		req,
	)
	ar.require.NoError(err)
	ar.require.NotNil(resp)

	return sharedSecret, mbRef
}

func (ar *appRegistryServiceTester) RegisterBotServiceNoWebHook(
	botIndex int,
	forwardSetting protocol.ForwardSettingValue,
) (sharedSecret []byte, mbRef *MiniblockRef) {
	ar.botIndexCheck(botIndex)
	botClient := ar.BotNodeClient(botIndex, testClientOpts{})
	mbRef = botClient.createUserStreamsWithEncryptionDevice()
	appWallet := ar.botCredentials[botIndex].botWallet
	sharedSecret = ar.RegisterApp(
		appWallet,
		ar.botCredentials[botIndex].ownerWallet,
		forwardSetting,
	)

	ar.appServer.SetHS256SecretKey(botIndex, sharedSecret)
	ar.appServer.SetEncryptionDevice(botIndex, botClient.DefaultEncryptionDevice())

	return sharedSecret, mbRef
}

func (ar *appRegistryServiceTester) StartBotServices() {
	go func() {
		if err := ar.appServer.Serve(ar.ctx); err != nil {
			ar.serviceTester.t.Errorf("Error starting bot service: %v", err)
		}
	}()

	go func() {
		for {
			select {
			case <-ar.ctx.Done():
				return
			case err := <-ar.appServer.ExitSignal():
				ar.require.NoError(err, "TestAppServer encountered a fatal error")
			}
		}
	}()
}

func (ar *appRegistryServiceTester) botIndexCheck(botIndex int) {
	ar.require.GreaterOrEqual(botIndex, 0, "botIndex must be nonnegative")
	ar.require.Less(botIndex, len(ar.botCredentials), "botIndex is out of range")
}

func (ar *appRegistryServiceTester) BotNodeClient(botIndex int, opts testClientOpts) *testClient {
	ar.botIndexCheck(botIndex)

	// Assign a bot-specific encryption device if the encryption device settings are undefined.
	// This human-readable set of keys makes it easier to debug the origination of events in flight.
	if opts.deviceKey == "" && opts.fallbackKey == "" {
		defaultEncryptionDevice := testBotEncryptionDevice(botIndex)
		opts.deviceKey = defaultEncryptionDevice.DeviceKey
		opts.fallbackKey = defaultEncryptionDevice.FallbackKey
	}

	return ar.serviceTester.newTestClientWithWallet(0, opts, ar.botCredentials[botIndex].botWallet)
}

func (ar *appRegistryServiceTester) BotNodeTestClients(opts testClientOpts) testClients {
	clients := make([]*testClient, len(ar.botCredentials))
	for i := range ar.botCredentials {
		clients[i] = ar.BotNodeClient(i, opts)
		if opts.enableSync {
			clients[i].startSync()
		}
	}
	return clients
}

func (ar *appRegistryServiceTester) NodeClient(i int, opts testClientOpts) *testClient {
	if i >= ar.serviceTester.opts.numNodes {
		ar.t.Fatalf("Node index does not exist; have %d nodes, asked for node %d", ar.serviceTester.opts.numNodes, i)
	}
	return ar.serviceTester.newTestClient(i, opts)
}

type testBotCredentials struct {
	botWallet   *crypto.Wallet
	ownerWallet *crypto.Wallet
}

type appRegistryTesterOpts struct {
	numNodes            int
	numBots             int
	botCredentials      []testBotCredentials
	enableAppServerLogs bool
}

func NewAppRegistryServiceTester(t *testing.T, opts *appRegistryTesterOpts) *appRegistryServiceTester {
	numNodes := int(1)
	if opts != nil && opts.numNodes > 0 {
		numNodes = opts.numNodes
	}
	tester := newServiceTester(t, serviceTesterOpts{numNodes: numNodes, start: true})
	ctx := tester.ctx
	// Uncomment to force logging only for the app registry service
	service := initAppRegistryService(ctx, tester)

	require := tester.require
	client := tester.testClient(0)

	numBots := 1
	if opts != nil && opts.numBots > 1 {
		numBots = opts.numBots
	}
	botCredentials := make([]testBotCredentials, numBots)

	for i := range numBots {
		if opts != nil && i < len(opts.botCredentials) {
			botCredentials[i] = opts.botCredentials[i]
		} else {
			botCredentials[i] = testBotCredentials{
				botWallet:   safeNewWallet(ctx, require),
				ownerWallet: safeNewWallet(ctx, require),
			}
		}
	}

	// Set up app service clients
	httpClient, _ := testcert.GetHttp2LocalhostTLSClient(tester.ctx, tester.getConfig())
	serviceAddr := "https://" + service.listener.Addr().String()
	authClient := protocolconnect.NewAuthenticationServiceClient(
		httpClient, serviceAddr,
	)
	appRegistryClient := protocolconnect.NewAppRegistryServiceClient(
		httpClient, serviceAddr,
	)

	botWallets := make([]*crypto.Wallet, numBots)
	for i, credentials := range botCredentials {
		botWallets[i] = credentials.botWallet
	}

	enableAppServerLogs := opts != nil && opts.enableAppServerLogs
	// Start a test app service that serves webhook responses
	appServer := app_registry.NewTestAppServer(
		t,
		ctx,
		app_registry.TestAppServerOpts{
			NumBots:    numBots,
			AppWallets: botWallets,
		},
		client,
		enableAppServerLogs,
	)
	tester.t.Cleanup(appServer.Close)

	return &appRegistryServiceTester{
		serviceTester:      tester,
		t:                  t,
		ctx:                ctx,
		require:            require,
		appRegistryService: service,
		authClient:         authClient,
		appRegistryClient:  appRegistryClient,
		botCredentials:     botCredentials,
		appServer:          appServer,
	}
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

func initAppRegistryService(
	ctx context.Context,
	tester *serviceTester,
) *Service {
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
	service, err := StartServerInAppRegistryMode(
		ctx,
		config,
		&ServerStartOpts{
			RiverChain:      bc,
			Listener:        listener,
			HttpClientMaker: testcert.GetHttp2LocalhostTLSClient,
		},
	)
	tester.require.NoError(err)

	// Clean up schema
	tester.t.Cleanup(func() {
		err := dbtestutils.DeleteTestSchema(
			context.Background(),
			tester.dbUrl,
			storage.DbSchemaNameForAppRegistryService(config.AppRegistry.AppRegistryId),
		)
		tester.require.NoError(err)
	})
	tester.t.Cleanup(service.Close)

	return service
}

func generateRandomSession(require *require.Assertions) ([]byte, string) {
	var session [8]byte
	_, err := rand.Read(session[:])
	require.NoError(err)
	return session[:], hex.EncodeToString(session[:])
}

func generateSessionKeys(deviceKey string, sessionIds []string) string {
	var sb strings.Builder
	sb.WriteString(deviceKey)
	sb.WriteString(":")
	for i, sessionId := range sessionIds {
		if i != 0 {
			sb.WriteString("-")
		}
		sb.WriteString(sessionId)
	}
	return sb.String()
}

func TestAppRegistry_ForwardsChannelEvents(t *testing.T) {
	tester := NewAppRegistryServiceTester(t, nil)

	tester.StartBotServices()

	participantClient := tester.NodeClient(0, testClientOpts{
		deviceKey:   "participantDeviceKey",
		fallbackKey: "participantFallbackKey",
	})
	participantClient.createUserStreamsWithEncryptionDevice()

	// The participant creates a space and a channel.
	spaceId, _ := participantClient.createSpace()
	channelId, _, _ := participantClient.createChannel(spaceId)

	// Create user streams for bot and add to channel
	_, userStreamMbRef := tester.RegisterBotService(0, protocol.ForwardSettingValue_FORWARD_SETTING_ALL_MESSAGES)
	botClient := tester.BotNodeClient(0, testClientOpts{})

	// Note: if this fails, recall the previous implementation had the participant sign this transaction
	membership := botClient.joinChannel(spaceId, channelId, userStreamMbRef)
	botClient.requireMembership(channelId, []common.Address{botClient.wallet.Address, participantClient.wallet.Address})

	// The participant sends a message to the channel with a novel session id. The bot does not have
	// decryption material for this session; this added event should provoke a key solicitation from the
	// bot for the session id used here.
	testMessageText := "xyz"
	testSessionBytes, testSession := generateRandomSession(tester.require)
	participantClient.sayWithSessionAndTags(
		channelId,
		testMessageText,
		nil,
		testSessionBytes,
		participantClient.deviceKey,
	)

	// Expect the bot to solicit keys to decrypt the message the participant just sent.
	participantClient.requireKeySolicitation(channelId, testBotEncryptionDevice(0).DeviceKey, testSession)

	// Let's have the participant send the solicitation response directly to the bot's user inbox stream.
	testCiphertexts := generateSessionKeys(testBotEncryptionDevice(0).DeviceKey, []string{testSession})
	botWallet, _ := tester.BotWallets(0)
	participantClient.sendSolicitationResponse(
		botWallet.Address,
		channelId,
		testBotEncryptionDevice(0).DeviceKey,
		[]string{testSession},
		testCiphertexts,
	)

	// Once the key material is sent, the app service can forward the undelivered message to the
	// bot and this is the reply message we expect it to make in-channel.
	replyText := app_registry.FormatTestAppMessageReply(
		testSession,
		testMessageText,
		testCiphertexts,
	)

	// Final channel content should include original message as well as the reply.
	participantClient.listen(
		channelId,
		[]common.Address{participantClient.userId, botClient.userId},
		[][]string{
			{testMessageText, ""},
			{"", app_registry.FormatMembershipReply(membership)},
			{"", replyText},
		},
	)
}

// invalidAddressBytes is a slice of bytes that cannot be parsed into an address, because
// it is too long. Valid addresses are 20 bytes.
var invalidAddressBytes = bytes.Repeat([]byte("a"), 21)

// safeNewWallet is a convenience method to make wallet creation with error checking a 1-liner.
// Hopefully this makes the test logic more readable.
func safeNewWallet(ctx context.Context, require *require.Assertions) *crypto.Wallet {
	wallet, err := crypto.NewWallet(ctx)
	require.NoError(err)
	return wallet
}

// Helper function to create test metadata
func testAppMetadata() *protocol.AppMetadata {
	return &protocol.AppMetadata{
		Username:    "test_bot_app",
		DisplayName: "Test Bot App Display",
		Description: "A test bot application for integration testing",
		ImageUrl:    "https://example.com/test-image.png",
		AvatarUrl:   "https://example.com/test-avatar.png",
		ExternalUrl: stringPtr("https://example.com/test-app"),
	}
}

func stringPtr(s string) *string {
	return &s
}

// contains checks if a string slice contains a specific string
func contains(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}

func TestAppRegistry_SetGetAppMetadata(t *testing.T) {
	tester := NewAppRegistryServiceTester(t, &appRegistryTesterOpts{numBots: 3})
	tester.StartBotServices()
	_, _ = tester.RegisterBotService(0, protocol.ForwardSettingValue_FORWARD_SETTING_UNSPECIFIED)

	appWallet, ownerWallet := tester.BotWallets(0)
	unregisteredAppWallet := safeNewWallet(tester.ctx, tester.require)

	// Test valid metadata
	validMetadata := &protocol.AppMetadata{
		Username:    "updated_test_app",
		DisplayName: "Updated Test App Display",
		Description: "Updated description for testing",
		ImageUrl:    "https://example.com/updated-image.jpg",
		AvatarUrl:   "https://example.com/updated-avatar.jpg",
		ExternalUrl: stringPtr("https://updated.example.com"),
	}

	tests := map[string]struct {
		appId                []byte
		authenticatingWallet *crypto.Wallet
		metadata             *protocol.AppMetadataUpdate
		updateMask           []string
		expectedErr          string
	}{
		"Update Success (app wallet signer)": {
			appId:                appWallet.Address[:],
			authenticatingWallet: appWallet,
			metadata: &protocol.AppMetadataUpdate{
				Username:    proto.String("updated_test_app_1"),
				DisplayName: proto.String("Updated Test App 1"),
				Description: proto.String(validMetadata.Description),
				ImageUrl:    proto.String(validMetadata.ImageUrl),
				AvatarUrl:   proto.String(validMetadata.AvatarUrl),
				ExternalUrl: validMetadata.ExternalUrl,
			},
			updateMask: []string{"username", "display_name", "description", "image_url", "avatar_url", "external_url"},
		},
		"Update Success (owner wallet signer)": {
			appId:                appWallet.Address[:],
			authenticatingWallet: ownerWallet,
			metadata: &protocol.AppMetadataUpdate{
				Username:    proto.String("owner_updated_app_2"),
				DisplayName: proto.String("Owner Updated App 2"),
				Description: proto.String("Updated by owner wallet"),
				ImageUrl:    proto.String("https://owner.example.com/image.png"),
				AvatarUrl:   proto.String("https://owner.example.com/avatar.png"),
				ExternalUrl: proto.String("https://owner.example.com"),
			},
			updateMask: []string{"username", "display_name", "description", "image_url", "avatar_url", "external_url"},
		},
		"Update Success (empty optional fields)": {
			appId:                appWallet.Address[:],
			authenticatingWallet: appWallet,
			metadata: &protocol.AppMetadataUpdate{
				Username:    proto.String("minimal_app"),
				DisplayName: proto.String("Minimal App"),
				Description: proto.String("App with minimal metadata"),
				ImageUrl:    proto.String("https://example.com/minimal-image.png"),
				AvatarUrl:   proto.String("https://example.com/minimal-avatar.png"),
			},
			updateMask: []string{"username", "display_name", "description", "image_url", "avatar_url"},
		},
		"Failure: missing username": {
			appId:                appWallet.Address[:],
			authenticatingWallet: appWallet,
			metadata: &protocol.AppMetadataUpdate{
				Username: proto.String(""),
			},
			updateMask:  []string{"username"},
			expectedErr: "username cannot be empty",
		},
		"Failure: empty display name": {
			appId:                appWallet.Address[:],
			authenticatingWallet: appWallet,
			metadata: &protocol.AppMetadataUpdate{
				DisplayName: proto.String(""),
			},
			updateMask:  []string{"display_name"},
			expectedErr: "display_name cannot be empty",
		},
		"Failure: missing description": {
			appId:                appWallet.Address[:],
			authenticatingWallet: appWallet,
			metadata: &protocol.AppMetadataUpdate{
				Description: proto.String(""),
			},
			updateMask:  []string{"description"},
			expectedErr: "description cannot be empty",
		},
		"Failure: nil field in update_mask": {
			appId:                appWallet.Address[:],
			authenticatingWallet: appWallet,
			metadata: &protocol.AppMetadataUpdate{
				// Intentionally not setting Username field, so it remains nil
				DisplayName: proto.String("Valid Display Name"),
				Description: proto.String("Valid description"),
			},
			updateMask:  []string{"username", "display_name", "description"}, // username is in mask but nil
			expectedErr: "username cannot be empty",
		},
		"Failure: missing image URL": {
			appId:                appWallet.Address[:],
			authenticatingWallet: appWallet,
			metadata: &protocol.AppMetadataUpdate{
				ImageUrl: proto.String(""),
			},
			updateMask:  []string{"image_url"},
			expectedErr: "image_url cannot be empty",
		},
		"Failure: invalid image URL": {
			appId:                appWallet.Address[:],
			authenticatingWallet: appWallet,
			metadata: &protocol.AppMetadataUpdate{
				ImageUrl: proto.String("invalid-url"),
			},
			updateMask:  []string{"image_url"},
			expectedErr: "image_url validation failed",
		},
		"Failure: missing avatar URL": {
			appId:                appWallet.Address[:],
			authenticatingWallet: appWallet,
			metadata: &protocol.AppMetadataUpdate{
				AvatarUrl: proto.String(""),
			},
			updateMask:  []string{"avatar_url"},
			expectedErr: "avatar_url cannot be empty",
		},
		"Failure: invalid avatar URL format": {
			appId:                appWallet.Address[:],
			authenticatingWallet: appWallet,
			metadata: &protocol.AppMetadataUpdate{
				AvatarUrl: proto.String("not-a-url"),
			},
			updateMask:  []string{"avatar_url"},
			expectedErr: "avatar_url validation failed",
		},
		"Failure: avatar URL invalid scheme": {
			appId:                appWallet.Address[:],
			authenticatingWallet: appWallet,
			metadata: &protocol.AppMetadataUpdate{
				AvatarUrl: proto.String("ftp://example.com/avatar.png"),
			},
			updateMask:  []string{"avatar_url"},
			expectedErr: "avatar_url validation failed",
		},
		"Failure: image URL invalid scheme": {
			appId:                appWallet.Address[:],
			authenticatingWallet: appWallet,
			metadata: &protocol.AppMetadataUpdate{
				ImageUrl: proto.String("ftp://example.com/image.png"),
			},
			updateMask:  []string{"image_url"},
			expectedErr: "image_url validation failed",
		},
		"Success: IPFS scheme avatar": {
			appId:                appWallet.Address[:],
			authenticatingWallet: appWallet,
			metadata: &protocol.AppMetadataUpdate{
				Username:    proto.String("ipfs_avatar_app_1"),
				DisplayName: proto.String("IPFS Avatar App 1"),
				Description: proto.String("App with IPFS avatar"),
				ImageUrl:    proto.String("https://example.com/image.png"),
				AvatarUrl:   proto.String("ipfs://QmHashExample/avatar.png"),
			},
			updateMask: []string{"username", "display_name", "description", "image_url", "avatar_url"},
		},
		"Success: IPFS scheme image": {
			appId:                appWallet.Address[:],
			authenticatingWallet: appWallet,
			metadata: &protocol.AppMetadataUpdate{
				Username:    proto.String("ipfs_image_app_1"),
				DisplayName: proto.String("IPFS Image App 1"),
				Description: proto.String("App with IPFS image"),
				ImageUrl:    proto.String("ipfs://QmHashExample/image.jpg"),
				AvatarUrl:   proto.String("https://example.com/avatar.png"),
			},
			updateMask: []string{"username", "display_name", "description", "image_url", "avatar_url"},
		},
		"Success: HTTP scheme URLs": {
			appId:                appWallet.Address[:],
			authenticatingWallet: appWallet,
			metadata: &protocol.AppMetadataUpdate{
				Username:    proto.String("http_urls_app"),
				DisplayName: proto.String("HTTP URLs App"),
				Description: proto.String("App with HTTP URLs"),
				ImageUrl:    proto.String("http://example.com/image.jpeg"),
				AvatarUrl:   proto.String("http://example.com/avatar.gif"),
			},
			updateMask: []string{"username", "display_name", "description", "image_url", "avatar_url"},
		},
		"Success: various file extensions": {
			appId:                appWallet.Address[:],
			authenticatingWallet: appWallet,
			metadata: &protocol.AppMetadataUpdate{
				Username:    proto.String("various_extensions_app"),
				DisplayName: proto.String("Various Extensions App"),
				Description: proto.String("App with various supported extensions"),
				ImageUrl:    proto.String("https://example.com/image.webp"),
				AvatarUrl:   proto.String("https://example.com/avatar.svg"),
			},
			updateMask: []string{"username", "display_name", "description", "image_url", "avatar_url"},
		},
		"Failure: invalid external URL": {
			appId:                appWallet.Address[:],
			authenticatingWallet: appWallet,
			metadata: &protocol.AppMetadataUpdate{
				Username:    proto.String("test_app"),
				DisplayName: proto.String("Test App"),
				Description: proto.String("Invalid external URL"),
				ImageUrl:    proto.String("https://example.com/image.png"),
				AvatarUrl:   proto.String("https://example.com/avatar.png"),
				ExternalUrl: proto.String("not-valid-url"),
			},
			updateMask:  []string{"username", "display_name", "description", "image_url", "avatar_url", "external_url"},
			expectedErr: "URL must have a valid external URL scheme",
		},
		"Failure: invalid external URL schema": {
			appId:                appWallet.Address[:],
			authenticatingWallet: appWallet,
			metadata: &protocol.AppMetadataUpdate{
				Username:    proto.String("test_app"),
				DisplayName: proto.String("Test App"),
				Description: proto.String("Invalid external URL"),
				ImageUrl:    proto.String("https://example.com/image.png"),
				AvatarUrl:   proto.String("https://example.com/avatar.png"),
				ExternalUrl: proto.String("ssh://external-url"),
			},
			updateMask:  []string{"username", "display_name", "description", "image_url", "avatar_url", "external_url"},
			expectedErr: "URL must have a valid external URL scheme",
		},
		"Failure: unregistered app": {
			appId:                unregisteredAppWallet.Address[:],
			authenticatingWallet: unregisteredAppWallet,
			metadata: &protocol.AppMetadataUpdate{
				Username:    proto.String(validMetadata.Username),
				DisplayName: proto.String(validMetadata.DisplayName),
				Description: proto.String(validMetadata.Description),
				ImageUrl:    proto.String(validMetadata.ImageUrl),
				AvatarUrl:   proto.String(validMetadata.AvatarUrl),
				ExternalUrl: validMetadata.ExternalUrl,
			},
			updateMask:  []string{"username", "display_name", "description", "image_url", "avatar_url", "external_url"},
			expectedErr: "app was not found in registry",
		},
		"Failure: missing authentication": {
			appId: appWallet.Address[:],
			metadata: &protocol.AppMetadataUpdate{
				Username:    proto.String(validMetadata.Username),
				DisplayName: proto.String(validMetadata.DisplayName),
				Description: proto.String(validMetadata.Description),
				ImageUrl:    proto.String(validMetadata.ImageUrl),
				AvatarUrl:   proto.String(validMetadata.AvatarUrl),
				ExternalUrl: validMetadata.ExternalUrl,
			},
			updateMask:  []string{"username", "display_name", "description", "image_url", "avatar_url", "external_url"},
			expectedErr: "missing session token",
		},
		"Failure: unauthorized user": {
			appId:                appWallet.Address[:],
			authenticatingWallet: unregisteredAppWallet,
			metadata: &protocol.AppMetadataUpdate{
				Username:    proto.String(validMetadata.Username),
				DisplayName: proto.String(validMetadata.DisplayName),
				Description: proto.String(validMetadata.Description),
				ImageUrl:    proto.String(validMetadata.ImageUrl),
				AvatarUrl:   proto.String(validMetadata.AvatarUrl),
				ExternalUrl: validMetadata.ExternalUrl,
			},
			updateMask:  []string{"username", "display_name", "description", "image_url", "avatar_url", "external_url"},
			expectedErr: "authenticated user must be app or owner",
		},
		"Success: valid slash commands": {
			appId:                appWallet.Address[:],
			authenticatingWallet: appWallet,
			metadata: &protocol.AppMetadataUpdate{
				Username:    proto.String("app_with_commands"),
				DisplayName: proto.String("App with Commands"),
				Description: proto.String("App with valid slash commands"),
				ImageUrl:    proto.String("https://example.com/image.png"),
				AvatarUrl:   proto.String("https://example.com/avatar.png"),
				SlashCommands: []*protocol.SlashCommand{
					{Name: "help", Description: "Get help with bot commands"},
					{Name: "search", Description: "Search for content"},
					{Name: "config", Description: "Configure settings"},
				},
			},
			updateMask: []string{
				"username",
				"display_name",
				"description",
				"image_url",
				"avatar_url",
				"slash_commands",
			},
		},
		"Failure: invalid command name with special characters": {
			appId:                appWallet.Address[:],
			authenticatingWallet: appWallet,
			metadata: &protocol.AppMetadataUpdate{
				Username:    proto.String("app_with_invalid_command"),
				DisplayName: proto.String("App with Invalid Command"),
				Description: proto.String("App with invalid command name"),
				ImageUrl:    proto.String("https://example.com/image.png"),
				AvatarUrl:   proto.String("https://example.com/avatar.png"),
				SlashCommands: []*protocol.SlashCommand{
					{Name: "help-me", Description: "Invalid name with hyphen"},
				},
			},
			updateMask: []string{
				"username",
				"display_name",
				"description",
				"image_url",
				"avatar_url",
				"slash_commands",
			},
			expectedErr: "command name must contain only letters, numbers, and underscores",
		},
		"Failure: duplicate command names": {
			appId:                appWallet.Address[:],
			authenticatingWallet: appWallet,
			metadata: &protocol.AppMetadataUpdate{
				Username:    proto.String("app_with_duplicate_commands"),
				DisplayName: proto.String("App with Duplicate Commands"),
				Description: proto.String("App with duplicate command names"),
				ImageUrl:    proto.String("https://example.com/image.png"),
				AvatarUrl:   proto.String("https://example.com/avatar.png"),
				SlashCommands: []*protocol.SlashCommand{
					{Name: "help", Description: "Get help"},
					{Name: "help", Description: "Also get help"},
				},
			},
			updateMask: []string{
				"username",
				"display_name",
				"description",
				"image_url",
				"avatar_url",
				"slash_commands",
			},
			expectedErr: "duplicate command name",
		},
		"Failure: too many commands": {
			appId:                appWallet.Address[:],
			authenticatingWallet: appWallet,
			metadata: &protocol.AppMetadataUpdate{
				Username:    proto.String("app_with_too_many_commands"),
				DisplayName: proto.String("App with Too Many Commands"),
				Description: proto.String("App exceeding command limit"),
				ImageUrl:    proto.String("https://example.com/image.png"),
				AvatarUrl:   proto.String("https://example.com/avatar.png"),
				SlashCommands: func() []*protocol.SlashCommand {
					commands := make([]*protocol.SlashCommand, 26)
					for i := 0; i < 26; i++ {
						commands[i] = &protocol.SlashCommand{
							Name:        fmt.Sprintf("command%d", i),
							Description: fmt.Sprintf("Description for command %d", i),
						}
					}
					return commands
				}(),
			},
			updateMask: []string{
				"username",
				"display_name",
				"description",
				"image_url",
				"avatar_url",
				"slash_commands",
			},
			expectedErr: "slash command count exceeds maximum",
		},
		"Failure: empty command description": {
			appId:                appWallet.Address[:],
			authenticatingWallet: appWallet,
			metadata: &protocol.AppMetadataUpdate{
				Username:    proto.String("app_with_empty_description"),
				DisplayName: proto.String("App with Empty Description"),
				Description: proto.String("App with command missing description"),
				ImageUrl:    proto.String("https://example.com/image.png"),
				AvatarUrl:   proto.String("https://example.com/avatar.png"),
				SlashCommands: []*protocol.SlashCommand{
					{Name: "help", Description: ""},
				},
			},
			updateMask: []string{
				"username",
				"display_name",
				"description",
				"image_url",
				"avatar_url",
				"slash_commands",
			},
			expectedErr: "command description is required",
		},
		"Failure: command name too long": {
			appId:                appWallet.Address[:],
			authenticatingWallet: appWallet,
			metadata: &protocol.AppMetadataUpdate{
				Username:    proto.String("app_with_long_command_name"),
				DisplayName: proto.String("App with Long Command Name"),
				Description: proto.String("App with command name exceeding limit"),
				ImageUrl:    proto.String("https://example.com/image.png"),
				AvatarUrl:   proto.String("https://example.com/avatar.png"),
				SlashCommands: []*protocol.SlashCommand{
					{Name: "thiscommandnameiswaytoolongandexceedsthemaximumlength", Description: "Too long"},
				},
			},
			updateMask: []string{
				"username",
				"display_name",
				"description",
				"image_url",
				"avatar_url",
				"slash_commands",
			},
			expectedErr: "command name must not exceed 32 characters",
		},
		"Failure: command name starts with number": {
			appId:                appWallet.Address[:],
			authenticatingWallet: appWallet,
			metadata: &protocol.AppMetadataUpdate{
				Username:    proto.String("app_with_invalid_command_start"),
				DisplayName: proto.String("App with Invalid Command Start"),
				Description: proto.String("App with command starting with number"),
				ImageUrl:    proto.String("https://example.com/image.png"),
				AvatarUrl:   proto.String("https://example.com/avatar.png"),
				SlashCommands: []*protocol.SlashCommand{
					{Name: "1help", Description: "Starts with number"},
				},
			},
			updateMask: []string{
				"username",
				"display_name",
				"description",
				"image_url",
				"avatar_url",
				"slash_commands",
			},
			expectedErr: "command name must start with a letter",
		},
		"Success: empty slash commands array": {
			appId:                appWallet.Address[:],
			authenticatingWallet: appWallet,
			metadata: &protocol.AppMetadataUpdate{
				Username:      proto.String("app_without_commands"),
				DisplayName:   proto.String("App without Commands"),
				Description:   proto.String("App with no slash commands"),
				ImageUrl:      proto.String("https://example.com/image.png"),
				AvatarUrl:     proto.String("https://example.com/avatar.png"),
				SlashCommands: []*protocol.SlashCommand{},
			},
			updateMask: []string{
				"username",
				"display_name",
				"description",
				"image_url",
				"avatar_url",
				"slash_commands",
			},
		},
		"Success: maximum length command name and description": {
			appId:                appWallet.Address[:],
			authenticatingWallet: appWallet,
			metadata: &protocol.AppMetadataUpdate{
				Username:    proto.String("app_with_max_length_commands"),
				DisplayName: proto.String("App with Max Length Commands"),
				Description: proto.String("Testing maximum lengths"),
				ImageUrl:    proto.String("https://example.com/image.png"),
				AvatarUrl:   proto.String("https://example.com/avatar.png"),
				SlashCommands: []*protocol.SlashCommand{
					{
						Name:        strings.Repeat("a", 32),  // Exactly 32 characters
						Description: strings.Repeat("b", 256), // Exactly 256 characters
					},
				},
			},
			updateMask: []string{
				"username",
				"display_name",
				"description",
				"image_url",
				"avatar_url",
				"slash_commands",
			},
		},
		"Success: unicode in command descriptions": {
			appId:                appWallet.Address[:],
			authenticatingWallet: appWallet,
			metadata: &protocol.AppMetadataUpdate{
				Username:    proto.String("app_with_unicode_commands"),
				DisplayName: proto.String("App with Unicode Commands"),
				Description: proto.String("Testing unicode in descriptions"),
				ImageUrl:    proto.String("https://example.com/image.png"),
				AvatarUrl:   proto.String("https://example.com/avatar.png"),
				SlashCommands: []*protocol.SlashCommand{
					{Name: "help", Description: "Get help 🚀 with émojis and 中文"},
					{Name: "status", Description: "Check status 📊 with various symbols ♠♣♥♦"},
				},
			},
			updateMask: []string{
				"username",
				"display_name",
				"description",
				"image_url",
				"avatar_url",
				"slash_commands",
			},
		},
		"Success: case-sensitive command names": {
			appId:                appWallet.Address[:],
			authenticatingWallet: appWallet,
			metadata: &protocol.AppMetadataUpdate{
				Username:    proto.String("app_with_case_sensitive_commands"),
				DisplayName: proto.String("App with Case Sensitive Commands"),
				Description: proto.String("Testing case sensitivity"),
				ImageUrl:    proto.String("https://example.com/image.png"),
				AvatarUrl:   proto.String("https://example.com/avatar.png"),
				SlashCommands: []*protocol.SlashCommand{
					{Name: "help", Description: "Lowercase help"},
					{Name: "Help", Description: "Uppercase Help"},
					{Name: "HELP", Description: "All caps HELP"},
				},
			},
			updateMask: []string{
				"username",
				"display_name",
				"description",
				"image_url",
				"avatar_url",
				"slash_commands",
			},
		},
		"Success: valid alphanumeric command names": {
			appId:                appWallet.Address[:],
			authenticatingWallet: appWallet,
			metadata: &protocol.AppMetadataUpdate{
				Username:    proto.String("app_with_alphanumeric_commands"),
				DisplayName: proto.String("App with Alphanumeric Commands"),
				Description: proto.String("Testing valid command names"),
				ImageUrl:    proto.String("https://example.com/image.png"),
				AvatarUrl:   proto.String("https://example.com/avatar.png"),
				SlashCommands: []*protocol.SlashCommand{
					{Name: "help123", Description: "Command with numbers"},
					{Name: "test_command_2", Description: "Command with underscores and numbers"},
					{Name: "UPPERCASE", Description: "All uppercase command"},
					{Name: "mixedCase123", Description: "Mixed case with numbers"},
				},
			},
			updateMask: []string{
				"username",
				"display_name",
				"description",
				"image_url",
				"avatar_url",
				"slash_commands",
			},
		},
		"Failure: command description too long": {
			appId:                appWallet.Address[:],
			authenticatingWallet: appWallet,
			metadata: &protocol.AppMetadataUpdate{
				Username:    proto.String("app_with_too_long_description"),
				DisplayName: proto.String("App with Too Long Description"),
				Description: proto.String("Testing description length limit"),
				ImageUrl:    proto.String("https://example.com/image.png"),
				AvatarUrl:   proto.String("https://example.com/avatar.png"),
				SlashCommands: []*protocol.SlashCommand{
					{Name: "test", Description: strings.Repeat("x", 257)}, // One over the limit
				},
			},
			updateMask: []string{
				"username",
				"display_name",
				"description",
				"image_url",
				"avatar_url",
				"slash_commands",
			},
			expectedErr: "command description must not exceed 256 characters",
		},
		"Failure: command name with underscore prefix": {
			appId:                appWallet.Address[:],
			authenticatingWallet: appWallet,
			metadata: &protocol.AppMetadataUpdate{
				Username:    proto.String("app_with_underscore_prefix"),
				DisplayName: proto.String("App with Underscore Prefix"),
				Description: proto.String("Testing invalid underscore prefix"),
				ImageUrl:    proto.String("https://example.com/image.png"),
				AvatarUrl:   proto.String("https://example.com/avatar.png"),
				SlashCommands: []*protocol.SlashCommand{
					{Name: "_private", Description: "Command starting with underscore"},
				},
			},
			updateMask: []string{
				"username",
				"display_name",
				"description",
				"image_url",
				"avatar_url",
				"slash_commands",
			},
			expectedErr: "command name must start with a letter",
		},
		"Success: clear external_url (nil value)": {
			appId:                appWallet.Address[:],
			authenticatingWallet: appWallet,
			metadata: &protocol.AppMetadataUpdate{
				ExternalUrl: nil, // This should clear the external_url field
			},
			updateMask: []string{"external_url"},
		},
		"Success: clear slash_commands (nil value)": {
			appId:                appWallet.Address[:],
			authenticatingWallet: appWallet,
			metadata: &protocol.AppMetadataUpdate{
				SlashCommands: nil, // This should clear the slash_commands field
			},
			updateMask: []string{"slash_commands"},
		},
	}

	for name, tc := range tests {
		t.Run(name, func(t *testing.T) {
			req := &connect.Request[protocol.UpdateAppMetadataRequest]{
				Msg: &protocol.UpdateAppMetadataRequest{
					AppId:      tc.appId,
					Metadata:   tc.metadata,
					UpdateMask: tc.updateMask,
				},
			}
			if tc.authenticatingWallet != nil {
				authenticateBS(tester.ctx, tester.require, tester.authClient, tc.authenticatingWallet, req)
			}

			resp, err := tester.appRegistryClient.UpdateAppMetadata(tester.ctx, req)

			if tc.expectedErr == "" {
				tester.require.NoError(err)
				tester.require.NotNil(resp)

				// Test GetAppMetadata - should work without authentication (publicly readable)
				getReq := &connect.Request[protocol.GetAppMetadataRequest]{
					Msg: &protocol.GetAppMetadataRequest{
						AppId: tc.appId,
					},
				}
				getResp, err := tester.appRegistryClient.GetAppMetadata(tester.ctx, getReq)
				tester.require.NoError(err)
				tester.require.NotNil(getResp)

				// Note: We can't directly compare AppMetadataUpdate with AppMetadata
				// Instead, verify that specific fields were updated correctly based on updateMask
				retrievedMetadata := getResp.Msg.GetMetadata()

				// Mandatory fields - these should never be nil when in update mask
				if contains(tc.updateMask, "username") {
					if tc.metadata.Username != nil {
						tester.require.Equal(*tc.metadata.Username, retrievedMetadata.GetUsername())
					} else {
						tester.require.Equal("", retrievedMetadata.GetUsername())
					}
				}
				if contains(tc.updateMask, "display_name") {
					if tc.metadata.DisplayName != nil {
						tester.require.Equal(*tc.metadata.DisplayName, retrievedMetadata.GetDisplayName())
					} else {
						tester.require.Equal("", retrievedMetadata.GetDisplayName())
					}
				}
				if contains(tc.updateMask, "description") {
					if tc.metadata.Description != nil {
						tester.require.Equal(*tc.metadata.Description, retrievedMetadata.GetDescription())
					} else {
						tester.require.Equal("", retrievedMetadata.GetDescription())
					}
				}
				if contains(tc.updateMask, "image_url") {
					if tc.metadata.ImageUrl != nil {
						tester.require.Equal(*tc.metadata.ImageUrl, retrievedMetadata.GetImageUrl())
					} else {
						tester.require.Equal("", retrievedMetadata.GetImageUrl())
					}
				}
				if contains(tc.updateMask, "avatar_url") {
					if tc.metadata.AvatarUrl != nil {
						tester.require.Equal(*tc.metadata.AvatarUrl, retrievedMetadata.GetAvatarUrl())
					} else {
						tester.require.Equal("", retrievedMetadata.GetAvatarUrl())
					}
				}

				// Optional fields - can be nil to clear the field
				if contains(tc.updateMask, "external_url") {
					if tc.metadata.ExternalUrl != nil {
						tester.require.Equal(*tc.metadata.ExternalUrl, retrievedMetadata.GetExternalUrl())
					} else {
						// When ExternalUrl is nil, it should clear the field (empty string)
						tester.require.Equal("", retrievedMetadata.GetExternalUrl())
					}
				}
				if contains(tc.updateMask, "slash_commands") {
					if tc.metadata.SlashCommands != nil {
						// Verify slash commands match
						retrievedCommands := retrievedMetadata.GetSlashCommands()
						tester.require.Len(retrievedCommands, len(tc.metadata.SlashCommands))
						for i, expectedCmd := range tc.metadata.SlashCommands {
							tester.require.Equal(expectedCmd.GetName(), retrievedCommands[i].GetName())
							tester.require.Equal(expectedCmd.GetDescription(), retrievedCommands[i].GetDescription())
						}
					} else {
						// When SlashCommands is nil, it should clear the field (empty array)
						tester.require.Empty(retrievedMetadata.GetSlashCommands())
					}
				}
			} else {
				tester.require.Nil(resp)
				tester.require.ErrorContains(err, tc.expectedErr)
			}
		})
	}

	// Test GetAppMetadata for unregistered app
	t.Run("GetAppMetadata_UnregisteredApp", func(t *testing.T) {
		getReq := &connect.Request[protocol.GetAppMetadataRequest]{
			Msg: &protocol.GetAppMetadataRequest{
				AppId: unregisteredAppWallet.Address[:],
			},
		}
		getResp, err := tester.appRegistryClient.GetAppMetadata(tester.ctx, getReq)
		tester.require.Nil(getResp)
		tester.require.ErrorContains(err, "app was not found in registry")
	})

	// Test duplicate username (not display name)
	t.Run("Failure_DuplicateUsername", func(t *testing.T) {
		// Create two more apps with distinct names.
		tester.RegisterBotService(1, protocol.ForwardSettingValue_FORWARD_SETTING_UNSPECIFIED)
		tester.RegisterBotService(2, protocol.ForwardSettingValue_FORWARD_SETTING_UNSPECIFIED)
		firstAppWallet, _ := tester.BotWallets(1)
		secondAppWallet, _ := tester.BotWallets(2)

		// Get the username of the first app to use in the duplicate test
		firstAppUsername := appMetadataForBot(firstAppWallet.Address[:]).Username

		// Update the username of app2 to match the username of the other app, and expect a failure to update
		// the app's metadata.
		req := &connect.Request[protocol.UpdateAppMetadataRequest]{
			Msg: &protocol.UpdateAppMetadataRequest{
				AppId: secondAppWallet.Address[:],
				Metadata: &protocol.AppMetadataUpdate{
					Username: proto.String(firstAppUsername),
				},
				UpdateMask: []string{"username"},
			},
		}
		authenticateBS(tester.ctx, tester.require, tester.authClient, secondAppWallet, req)

		resp, err := tester.appRegistryClient.UpdateAppMetadata(tester.ctx, req)
		tester.require.Nil(resp)
		tester.require.Error(err)
		tester.require.ErrorContains(err, "another app with the same username already exists")
	})
}

func TestAppRegistry_SetGetSettings(t *testing.T) {
	tester := NewAppRegistryServiceTester(t, nil)
	tester.StartBotServices()
	_, _ = tester.RegisterBotService(0, protocol.ForwardSettingValue_FORWARD_SETTING_UNSPECIFIED)

	appWallet, ownerWallet := tester.BotWallets(0)
	unregisteredAppWallet := safeNewWallet(tester.ctx, tester.require)

	tests := map[string]struct {
		appId                []byte
		authenticatingWallet *crypto.Wallet
		forwardSetting       protocol.ForwardSettingValue
		expectedErr          string
	}{
		"Update Success (app wallet signer)": {
			appId:                appWallet.Address[:],
			authenticatingWallet: appWallet,
			forwardSetting:       protocol.ForwardSettingValue_FORWARD_SETTING_MENTIONS_REPLIES_REACTIONS,
		},
		"Update Success (owner wallet signer)": {
			appId:                appWallet.Address[:],
			authenticatingWallet: ownerWallet,
			forwardSetting:       protocol.ForwardSettingValue_FORWARD_SETTING_ALL_MESSAGES,
		},
		"Failure: unregistered app": {
			appId:                unregisteredAppWallet.Address[:],
			authenticatingWallet: unregisteredAppWallet,
			expectedErr:          "app was not found in registry",
		},
		"Failure: missing authentication": {
			appId:       appWallet.Address[:],
			expectedErr: "missing session token",
		},
		"Failure: unauthorized user": {
			appId:                appWallet.Address[:],
			authenticatingWallet: unregisteredAppWallet,
			expectedErr:          "authenticated user must be app or owner",
		},
	}
	for name, tc := range tests {
		t.Run(name, func(t *testing.T) {
			req := &connect.Request[protocol.SetAppSettingsRequest]{
				Msg: &protocol.SetAppSettingsRequest{
					AppId: tc.appId,
					Settings: &protocol.AppSettings{
						ForwardSetting: tc.forwardSetting,
					},
				},
			}
			if tc.authenticatingWallet != nil {
				authenticateBS(tester.ctx, tester.require, tester.authClient, tc.authenticatingWallet, req)
			}

			resp, err := tester.appRegistryClient.SetAppSettings(tester.ctx, req)

			if tc.expectedErr == "" {
				tester.require.NoError(err)
				tester.require.NotNil(resp)

				getReq := &connect.Request[protocol.GetAppSettingsRequest]{
					Msg: &protocol.GetAppSettingsRequest{
						AppId: tc.appId,
					},
				}
				authenticateBS(tester.ctx, tester.require, tester.authClient, tc.authenticatingWallet, getReq)
				getResp, err := tester.appRegistryClient.GetAppSettings(tester.ctx, getReq)
				tester.require.NoError(err)
				tester.require.NotNil(getResp)
				tester.require.Equal(getResp.Msg.GetSettings().GetForwardSetting(), tc.forwardSetting)
			} else {
				tester.require.Nil(resp)
				tester.require.ErrorContains(err, tc.expectedErr)

				// The get request should fail for the same reason
				getReq := &connect.Request[protocol.GetAppSettingsRequest]{
					Msg: &protocol.GetAppSettingsRequest{
						AppId: tc.appId,
					},
				}
				if tc.authenticatingWallet != nil {
					authenticateBS(tester.ctx, tester.require, tester.authClient, tc.authenticatingWallet, getReq)
				}
				getResp, err := tester.appRegistryClient.GetAppSettings(tester.ctx, getReq)
				tester.require.Nil(getResp)
				tester.require.ErrorContains(err, tc.expectedErr)
			}
		})
	}
}

func TestAppRegistry_GetSettingsWithWebhookUrl(t *testing.T) {
	tester := NewAppRegistryServiceTester(t, nil)
	tester.StartBotServices()

	_, _ = tester.RegisterBotServiceNoWebHook(0, protocol.ForwardSettingValue_FORWARD_SETTING_ALL_MESSAGES)
	appWallet, ownerWallet := tester.BotWallets(0)

	// Get settings before webhook registration - should not have webhook URL
	getReq := &connect.Request[protocol.GetAppSettingsRequest]{
		Msg: &protocol.GetAppSettingsRequest{
			AppId: appWallet.Address[:],
		},
	}
	authenticateBS(tester.ctx, tester.require, tester.authClient, ownerWallet, getReq)

	getResp, err := tester.appRegistryClient.GetAppSettings(tester.ctx, getReq)
	tester.require.NoError(err)
	tester.require.NotNil(getResp)
	tester.require.Equal(
		protocol.ForwardSettingValue_FORWARD_SETTING_ALL_MESSAGES,
		getResp.Msg.GetSettings().GetForwardSetting(),
	)
	tester.require.Nil(getResp.Msg.WebhookUrl, "webhook URL should be nil before registration")

	// Register webhook
	regWebhookReq := &connect.Request[protocol.RegisterWebhookRequest]{
		Msg: &protocol.RegisterWebhookRequest{
			AppId:      appWallet.Address[:],
			WebhookUrl: tester.appServer.Url(0),
		},
	}
	authenticateBS(tester.ctx, tester.require, tester.authClient, ownerWallet, regWebhookReq)

	_, err = tester.appRegistryClient.RegisterWebhook(tester.ctx, regWebhookReq)
	tester.require.NoError(err)

	// Get settings after webhook registration - should include webhook URL
	getReq2 := &connect.Request[protocol.GetAppSettingsRequest]{
		Msg: &protocol.GetAppSettingsRequest{
			AppId: appWallet.Address[:],
		},
	}
	authenticateBS(tester.ctx, tester.require, tester.authClient, appWallet, getReq2)

	getResp2, err := tester.appRegistryClient.GetAppSettings(tester.ctx, getReq2)
	tester.require.NoError(err)
	tester.require.NotNil(getResp2)
	tester.require.NotNil(getResp2.Msg.WebhookUrl, "webhook URL should be present after registration")
	tester.require.Equal(tester.appServer.Url(0), *getResp2.Msg.WebhookUrl)
}

func TestAppRegistry_MessageForwardSettings(t *testing.T) {
	ctx := test.NewTestContext(t)
	require := require.New(t)
	botWallet := safeNewWallet(ctx, require)
	ownerWallet := safeNewWallet(ctx, require)
	differentBotWallet := safeNewWallet(ctx, require) // Another bot's address

	uniqueTestMessages := map[string]struct {
		tags             *protocol.Tags
		expectedForwards map[protocol.ForwardSettingValue]bool
	}{
		"plain_message_no_tags": {
			expectedForwards: map[protocol.ForwardSettingValue]bool{
				protocol.ForwardSettingValue_FORWARD_SETTING_ALL_MESSAGES:               true,
				protocol.ForwardSettingValue_FORWARD_SETTING_UNSPECIFIED:                false,
				protocol.ForwardSettingValue_FORWARD_SETTING_MENTIONS_REPLIES_REACTIONS: false,
				protocol.ForwardSettingValue_FORWARD_SETTING_NO_MESSAGES:                false,
			},
		},
		"@mention": {
			tags: &protocol.Tags{
				MentionedUserAddresses: [][]byte{botWallet.Address[:]},
			},
			expectedForwards: map[protocol.ForwardSettingValue]bool{
				protocol.ForwardSettingValue_FORWARD_SETTING_ALL_MESSAGES:               true,
				protocol.ForwardSettingValue_FORWARD_SETTING_UNSPECIFIED:                true,
				protocol.ForwardSettingValue_FORWARD_SETTING_MENTIONS_REPLIES_REACTIONS: true,
				protocol.ForwardSettingValue_FORWARD_SETTING_NO_MESSAGES:                false,
			},
		},
		"@channel": {
			tags: &protocol.Tags{
				GroupMentionTypes: []protocol.GroupMentionType{protocol.GroupMentionType_GROUP_MENTION_TYPE_AT_CHANNEL},
			},
			expectedForwards: map[protocol.ForwardSettingValue]bool{
				protocol.ForwardSettingValue_FORWARD_SETTING_ALL_MESSAGES:               true,
				protocol.ForwardSettingValue_FORWARD_SETTING_UNSPECIFIED:                true,
				protocol.ForwardSettingValue_FORWARD_SETTING_MENTIONS_REPLIES_REACTIONS: true,
				protocol.ForwardSettingValue_FORWARD_SETTING_NO_MESSAGES:                false,
			},
		},
		"non-participating_reaction": {
			tags: &protocol.Tags{
				MessageInteractionType: protocol.MessageInteractionType_MESSAGE_INTERACTION_TYPE_REACTION,
			},
			expectedForwards: map[protocol.ForwardSettingValue]bool{
				protocol.ForwardSettingValue_FORWARD_SETTING_ALL_MESSAGES:               true,
				protocol.ForwardSettingValue_FORWARD_SETTING_UNSPECIFIED:                false,
				protocol.ForwardSettingValue_FORWARD_SETTING_MENTIONS_REPLIES_REACTIONS: false,
				protocol.ForwardSettingValue_FORWARD_SETTING_NO_MESSAGES:                false,
			},
		},
		"participating_reaction": {
			tags: &protocol.Tags{
				MessageInteractionType:     protocol.MessageInteractionType_MESSAGE_INTERACTION_TYPE_REACTION,
				ParticipatingUserAddresses: [][]byte{botWallet.Address[:]},
			},
			expectedForwards: map[protocol.ForwardSettingValue]bool{
				protocol.ForwardSettingValue_FORWARD_SETTING_ALL_MESSAGES:               true,
				protocol.ForwardSettingValue_FORWARD_SETTING_UNSPECIFIED:                true,
				protocol.ForwardSettingValue_FORWARD_SETTING_MENTIONS_REPLIES_REACTIONS: true,
				protocol.ForwardSettingValue_FORWARD_SETTING_NO_MESSAGES:                false,
			},
		},
		"non-participating_reply": {
			tags: &protocol.Tags{
				MessageInteractionType: protocol.MessageInteractionType_MESSAGE_INTERACTION_TYPE_REPLY,
			},
			expectedForwards: map[protocol.ForwardSettingValue]bool{
				protocol.ForwardSettingValue_FORWARD_SETTING_ALL_MESSAGES:               true,
				protocol.ForwardSettingValue_FORWARD_SETTING_UNSPECIFIED:                false,
				protocol.ForwardSettingValue_FORWARD_SETTING_MENTIONS_REPLIES_REACTIONS: false,
				protocol.ForwardSettingValue_FORWARD_SETTING_NO_MESSAGES:                false,
			},
		},
		"participating_reply": {
			tags: &protocol.Tags{
				MessageInteractionType:     protocol.MessageInteractionType_MESSAGE_INTERACTION_TYPE_REPLY,
				ParticipatingUserAddresses: [][]byte{botWallet.Address[:]},
			},
			expectedForwards: map[protocol.ForwardSettingValue]bool{
				protocol.ForwardSettingValue_FORWARD_SETTING_ALL_MESSAGES:               true,
				protocol.ForwardSettingValue_FORWARD_SETTING_UNSPECIFIED:                true,
				protocol.ForwardSettingValue_FORWARD_SETTING_MENTIONS_REPLIES_REACTIONS: true,
				protocol.ForwardSettingValue_FORWARD_SETTING_NO_MESSAGES:                false,
			},
		},
		"slash_command_to_this_bot": {
			tags: &protocol.Tags{
				MessageInteractionType: protocol.MessageInteractionType_MESSAGE_INTERACTION_TYPE_SLASH_COMMAND,
				AppClientAddress:       botWallet.Address[:],
			},
			expectedForwards: map[protocol.ForwardSettingValue]bool{
				protocol.ForwardSettingValue_FORWARD_SETTING_ALL_MESSAGES:               true,
				protocol.ForwardSettingValue_FORWARD_SETTING_UNSPECIFIED:                true,
				protocol.ForwardSettingValue_FORWARD_SETTING_MENTIONS_REPLIES_REACTIONS: true,
				protocol.ForwardSettingValue_FORWARD_SETTING_NO_MESSAGES:                false, // Respects NO_MESSAGES setting
			},
		},
		"slash_command_to_another_bot": {
			tags: &protocol.Tags{
				MessageInteractionType: protocol.MessageInteractionType_MESSAGE_INTERACTION_TYPE_SLASH_COMMAND,
				AppClientAddress:       differentBotWallet.Address[:],
			},
			expectedForwards: map[protocol.ForwardSettingValue]bool{
				protocol.ForwardSettingValue_FORWARD_SETTING_ALL_MESSAGES:               false,
				protocol.ForwardSettingValue_FORWARD_SETTING_UNSPECIFIED:                false,
				protocol.ForwardSettingValue_FORWARD_SETTING_MENTIONS_REPLIES_REACTIONS: false,
				protocol.ForwardSettingValue_FORWARD_SETTING_NO_MESSAGES:                false,
			},
		},
	}
	tests := map[string]protocol.ForwardSettingValue{
		"ALL_MESSAGES":               protocol.ForwardSettingValue_FORWARD_SETTING_ALL_MESSAGES,
		"UNSPECIFIED":                protocol.ForwardSettingValue_FORWARD_SETTING_UNSPECIFIED,
		"MENTIONS_REPLIES_REACTIONS": protocol.ForwardSettingValue_FORWARD_SETTING_MENTIONS_REPLIES_REACTIONS,
		"NO_MESSAGES":                protocol.ForwardSettingValue_FORWARD_SETTING_NO_MESSAGES,
	}
	for name, forwardSetting := range tests {
		t.Run(name, func(t *testing.T) {
			tester := NewAppRegistryServiceTester(t, &appRegistryTesterOpts{
				numBots: 1,
				botCredentials: []testBotCredentials{
					{
						botWallet:   botWallet,
						ownerWallet: ownerWallet,
					},
				},
			})
			tester.StartBotServices()

			// Create user streams for chat participant
			participantClient := tester.NodeClient(0, testClientOpts{
				deviceKey:   "participantDeviceKey",
				fallbackKey: "participantFallbackKey",
			})
			participantClient.createUserStreamsWithEncryptionDevice()

			// The participant creates a space and a channel.
			spaceId, _ := participantClient.createSpace()
			channelId, _, _ := participantClient.createChannel(spaceId)

			// Create user streams for bot and add to channel
			_, userStreamMbRef := tester.RegisterBotService(0, forwardSetting)
			botClient := tester.BotNodeClient(0, testClientOpts{})

			// Bot joins channel.
			membership := botClient.joinChannel(spaceId, channelId, userStreamMbRef)

			// Confirm channel has 2 members: bot and participant.
			botClient.requireMembership(
				channelId,
				[]common.Address{botClient.wallet.Address, participantClient.wallet.Address},
			)

			testSessionBytes, testSession := generateRandomSession(tester.require)
			expectForwarding := false
			conversation := make([][]string, 0, 2*len(uniqueTestMessages))
			for messageText, tc := range uniqueTestMessages {
				if tc.expectedForwards[forwardSetting] {
					expectForwarding = true
				}
				participantClient.sayWithSessionAndTags(
					channelId,
					messageText,
					tc.tags,
					testSessionBytes,
					participantClient.deviceKey,
				)
				conversation = append(conversation, []string{messageText, ""})
			}

			// Also send a solicitation, which is a member event, to validate that member events are or
			// are not being passed through.
			solicitation := participantClient.solicitKeys(
				channelId,
				participantClient.deviceKey,
				participantClient.fallbackKey,
				false,
				[]string{"12345678", "abcdef0123"},
			)

			var testCiphertexts string
			if expectForwarding {
				// Expect the bot to solicit keys to decrypt the messages the participant just sent.
				participantClient.requireKeySolicitation(channelId, testBotEncryptionDevice(0).DeviceKey, testSession)

				// Have the participant send the solicitation response directly to the bot's user inbox stream.
				testCiphertexts = generateSessionKeys(testBotEncryptionDevice(0).DeviceKey, []string{testSession})
				participantClient.sendSolicitationResponse(
					botWallet.Address,
					channelId,
					testBotEncryptionDevice(0).DeviceKey,
					[]string{testSession},
					testCiphertexts,
				)
			} else {
				participantClient.requireNoKeySolicitation(channelId, testBotEncryptionDevice(0).DeviceKey, "", 3*time.Second, 100*time.Millisecond)
			}

			if expectForwarding {
				for messageText, tc := range uniqueTestMessages {
					if !tc.expectedForwards[forwardSetting] {
						continue
					}
					// Final channel content should include original message as well as the reply.
					replyText := app_registry.FormatTestAppMessageReply(
						testSession,
						messageText,
						testCiphertexts,
					)
					conversation = append(conversation, []string{"", replyText})
				}

				// If the setting is ALL_MESSAGES, expect a reply specific to key solicitations
				// containing the key solicitation metadata.
				if forwardSetting == protocol.ForwardSettingValue_FORWARD_SETTING_ALL_MESSAGES {
					conversation = append(
						conversation,
						[]string{"", app_registry.FormatKeySolicitationReply(solicitation)},
						[]string{"", app_registry.FormatMembershipReply(membership)},
					)
				}
			}

			participantClient.listen(
				channelId,
				[]common.Address{participantClient.userId, botClient.userId},
				conversation,
			)
		})
	}
}

func TestAppRegistry_GetSession(t *testing.T) {
	tester := NewAppRegistryServiceTester(t, nil)
	require := tester.require

	tester.StartBotServices()
	_, userMbRef := tester.RegisterBotService(0, protocol.ForwardSettingValue_FORWARD_SETTING_ALL_MESSAGES)

	participantClient := tester.serviceTester.newTestClient(0, testClientOpts{
		deviceKey:   "participantDeviceKey",
		fallbackKey: "participantFallbackKey",
	})

	participantClient.createUserStreamsWithEncryptionDevice()

	// The participant creates a space and a channel.
	spaceId, _ := participantClient.createSpace()
	channelId, _, _ := participantClient.createChannel(spaceId)

	botClient := tester.BotNodeClient(0, testClientOpts{})
	botClient.joinChannel(spaceId, channelId, userMbRef)
	botClient.requireMembership(channelId, []common.Address{botClient.wallet.Address, participantClient.wallet.Address})

	// Have the participant send a group encryption sessions message directly to the bot's user inbox stream
	// so the registry can detect the published key for the sessions.
	testSession1 := "session1"
	testSession2 := "session2"
	testCiphertexts := "ciphertext-deviceKey-session1-session2"

	participantClient.sendSolicitationResponse(
		botClient.userId,
		channelId,
		testBotEncryptionDevice(0).DeviceKey,
		[]string{
			testSession1,
			testSession2,
		},
		testCiphertexts,
	)

	botWallet, _ := tester.BotWallets(0)

	// Wait for a request for testSession1 keys to succeed with the correct event
	require.EventuallyWithT(func(c *assert.CollectT) {
		req := &connect.Request[protocol.GetSessionRequest]{
			Msg: &protocol.GetSessionRequest{
				AppId: botWallet.Address[:],
				Identifier: &protocol.GetSessionRequest_SessionId{
					SessionId: testSession1,
				},
			},
		}
		req2 := &connect.Request[protocol.GetSessionRequest]{
			Msg: &protocol.GetSessionRequest{
				AppId: botWallet.Address[:],
				Identifier: &protocol.GetSessionRequest_StreamId{
					StreamId: channelId[:],
				},
			},
		}
		authenticateBS(tester.ctx, require, tester.authClient, botWallet, req)
		authenticateBS(tester.ctx, require, tester.authClient, botWallet, req2)

		resp, err := tester.appRegistryClient.GetSession(tester.ctx, req)
		if !(assert.NoError(c, err, "GetSession should produce no error") && assert.NotNil(c, resp)) {
			return
		}

		resp, error := tester.appRegistryClient.GetSession(tester.ctx, req2)
		if !(assert.NoError(c, error, "GetSession with streamid should produce no error") && assert.NotNil(c, resp)) {
			return
		}

		parsedEvent, err := events.ParseEvent(resp.Msg.GroupEncryptionSessions)
		if !assert.NoError(c, err, "session was not parsable") {
			return
		}

		sessions := parsedEvent.Event.GetUserInboxPayload().GetGroupEncryptionSessions()
		if !assert.NotNil(c, sessions, "parsed envelope should contain ciphertexts") {
			return
		}

		assert.ElementsMatch(c, sessions.SessionIds, []string{testSession1, testSession2})
		deviceCiphertexts, ok := sessions.Ciphertexts[testBotEncryptionDevice(0).DeviceKey]
		if !assert.True(c, ok, "bot device key is present in ciphertexts map") {
			return
		}
		assert.Equal(c, testCiphertexts, deviceCiphertexts)
		assert.Equal(c, channelId[:], sessions.StreamId)
	}, 10*time.Second, 100*time.Millisecond)

	// Once the first session key is available, we should not need to wait to test the
	// 2nd one because they are included in the same event.
	req := &connect.Request[protocol.GetSessionRequest]{
		Msg: &protocol.GetSessionRequest{
			AppId: botWallet.Address[:],
			Identifier: &protocol.GetSessionRequest_SessionId{
				SessionId: testSession2,
			},
		},
	}
	authenticateBS(tester.ctx, tester.require, tester.authClient, botWallet, req)

	resp, err := tester.appRegistryClient.GetSession(tester.ctx, req)
	tester.require.NoError(err)
	require.NotNil(resp)

	parsedEvent, err := events.ParseEvent(resp.Msg.GroupEncryptionSessions)
	require.NoError(err)

	sessions := parsedEvent.Event.GetUserInboxPayload().GetGroupEncryptionSessions()
	require.NotNil(sessions)
	require.ElementsMatch(sessions.SessionIds, []string{testSession1, testSession2})

	deviceCiphertexts, ok := sessions.Ciphertexts[testBotEncryptionDevice(0).DeviceKey]
	require.True(ok, "bot device key is present in ciphertexts map")
	require.Equal(testCiphertexts, deviceCiphertexts)
	require.Equal(channelId[:], sessions.StreamId)

	nonexistentSession := "nonexistentSession"

	// Check non-existent session - should result in a NOT_FOUND error.
	req = &connect.Request[protocol.GetSessionRequest]{
		Msg: &protocol.GetSessionRequest{
			AppId: botWallet.Address[:],
			Identifier: &protocol.GetSessionRequest_SessionId{
				SessionId: nonexistentSession,
			},
		},
	}
	authenticateBS(tester.ctx, tester.require, tester.authClient, botWallet, req)
	resp, err = tester.appRegistryClient.GetSession(tester.ctx, req)
	require.Nil(resp)
	require.ErrorContains(err, "session key for app not found")

	// Check nonexistent app - should result in a NOT_FOUND error.
	req = &connect.Request[protocol.GetSessionRequest]{
		Msg: &protocol.GetSessionRequest{
			// participant is not a bot
			AppId: participantClient.wallet.Address[:],
			Identifier: &protocol.GetSessionRequest_SessionId{
				SessionId: nonexistentSession,
			},
		},
	}
	authenticateBS(tester.ctx, tester.require, tester.authClient, participantClient.wallet, req)
	resp, err = tester.appRegistryClient.GetSession(tester.ctx, req)
	require.Nil(resp)
	require.ErrorContains(err, "session key for app not found")

	// Unauthorized user should result in an error.
	req = &connect.Request[protocol.GetSessionRequest]{
		Msg: &protocol.GetSessionRequest{
			// participant is not a bot
			AppId: botWallet.Address[:],
			Identifier: &protocol.GetSessionRequest_SessionId{
				SessionId: nonexistentSession,
			},
		},
	}
	// Authorize with the participant wallet.
	authenticateBS(tester.ctx, tester.require, tester.authClient, participantClient.wallet, req)
	resp, err = tester.appRegistryClient.GetSession(tester.ctx, req)
	require.Nil(resp)
	require.ErrorContains(err, "authenticated user must be app")

	// An unauthenticated request should also fail.
	req = &connect.Request[protocol.GetSessionRequest]{
		Msg: &protocol.GetSessionRequest{
			AppId: participantClient.wallet.Address[:],
			Identifier: &protocol.GetSessionRequest_SessionId{
				SessionId: nonexistentSession,
			},
		},
	}
	resp, err = tester.appRegistryClient.GetSession(tester.ctx, req)
	require.Nil(resp)
	require.ErrorContains(err, "missing session token")
}

func TestAppRegistry_RegisterWebhook(t *testing.T) {
	tester := NewAppRegistryServiceTester(t, nil)
	require := tester.require

	tester.StartBotServices()
	// Create needed streams and add an encryption device to the user metadata stream for the app service.
	appSharedSecret, _ := tester.RegisterBotService(0, protocol.ForwardSettingValue_FORWARD_SETTING_ALL_MESSAGES)
	ctx := tester.ctx
	// Uncomment for logging of app registry service
	// ctx = logging.CtxWithLog(ctx, logging.DefaultLogger(zapcore.DebugLevel))

	appServer := tester.appServer
	appWallet, ownerWallet := tester.BotWallets(0)
	unregisteredAppWallet := safeNewWallet(ctx, tester.require)
	app2Wallet := safeNewWallet(ctx, tester.require)

	tc := tester.NodeClient(0, testClientOpts{})
	// There is no user metadata stream for app 2, but we do create a user inbox stream.
	// As a result, registration should succeed, but webhook registration should fail.
	_, _, err := createUserInboxStream(ctx, app2Wallet, tc.client, nil)
	require.NoError(err)

	app2SharedSecret := tester.RegisterApp(
		app2Wallet,
		ownerWallet,
		protocol.ForwardSettingValue_FORWARD_SETTING_ALL_MESSAGES,
	)

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
			webhookUrl:           appServer.Url(0),
		},
		"Success (owner wallet signer)": {
			appId:                appWallet.Address[:],
			authenticatingWallet: ownerWallet,
			webhookUrl:           appServer.Url(0),
		},
		"Failure: unregistered app": {
			appId:                unregisteredAppWallet.Address[:],
			authenticatingWallet: unregisteredAppWallet,
			webhookUrl:           "http://www.test.com/callme",
			expectedErr:          "app was not found in registry",
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
			expectedErr:          "authenticated user must be app or owner",
		},
		"Failure: webhook returns incorrect encryption device": {
			appId:                appWallet.Address[:],
			authenticatingWallet: appWallet,
			webhookUrl:           appServer.Url(0),
			overrideEncryptionDevice: app_client.EncryptionDevice{
				DeviceKey:   "wrongDeviceKey",
				FallbackKey: "wrongFallbackKey",
			},
			expectedErr: "webhook encryption device does not match default device detected by app registy service",
		},
		"Failure: bad webhook response": {
			appId:                appWallet.Address[:],
			authenticatingWallet: appWallet,
			webhookUrl:           appServer.Url(0),
			// Bork the test app server response by providing a mistmached shared secret
			overrideSharedSecret: safeNewWallet(tester.ctx, tester.require).Address.Bytes(),
			expectedErr:          "webhook response non-OK status",
		},
		"Failure: missing user metadata stream for app": {
			appId:                app2Wallet.Address[:],
			authenticatingWallet: app2Wallet,
			webhookUrl:           appServer.Url(0),
			overrideSharedSecret: app2SharedSecret,
			expectedErr:          "encryption device for app not found",
		},
	}

	for name, tc := range tests {
		t.Run(name, func(t *testing.T) {
			if tc.overrideSharedSecret == nil {
				appServer.SetHS256SecretKey(0, appSharedSecret)
			} else {
				appServer.SetHS256SecretKey(0, tc.overrideSharedSecret)
			}

			if tc.overrideEncryptionDevice == (app_client.EncryptionDevice{}) {
				appServer.SetEncryptionDevice(0, testBotEncryptionDevice(0))
			} else {
				appServer.SetEncryptionDevice(0, tc.overrideEncryptionDevice)
			}

			req := &connect.Request[protocol.RegisterWebhookRequest]{
				Msg: &protocol.RegisterWebhookRequest{
					AppId:      tc.appId,
					WebhookUrl: tc.webhookUrl,
				},
			}

			// Unauthenticated requests should fail
			if tc.authenticatingWallet != nil {
				authenticateBS(ctx, require, tester.authClient, tc.authenticatingWallet, req)
			}

			resp, err := tester.appRegistryClient.RegisterWebhook(
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
	tester := NewAppRegistryServiceTester(t, nil)

	tester.StartBotServices()
	// Create needed streams and add an encryption device to the user metadata stream for the app service.
	tester.RegisterBotService(0, protocol.ForwardSettingValue_FORWARD_SETTING_ALL_MESSAGES)

	appServer := tester.appServer
	appWallet, _ := tester.BotWallets(0)

	var unregisteredApp common.Address
	_, err := rand.Read(unregisteredApp[:])
	tester.require.NoError(err)

	statusTests := map[string]struct {
		appId                    []byte
		expectedIsRegistered     bool
		expectedDeviceKey        string
		expectedFallbackKey      string
		expectedFrameworkVersion int32
	}{
		"Registered app": {
			appId:                    appWallet.Address[:],
			expectedIsRegistered:     true,
			expectedDeviceKey:        "deviceKey",
			expectedFallbackKey:      "fallbackKey",
			expectedFrameworkVersion: 12345,
		},
		"Unregistered app": {
			appId:                unregisteredApp[:],
			expectedIsRegistered: false,
		},
	}

	for name, tc := range statusTests {
		t.Run(name, func(t *testing.T) {
			if tc.expectedIsRegistered {
				appServer.SetFrameworkVersion(0, tc.expectedFrameworkVersion)
				appServer.SetEncryptionDevice(0, app_client.EncryptionDevice{
					DeviceKey:   tc.expectedDeviceKey,
					FallbackKey: tc.expectedFallbackKey,
				})
			}
			status, err := tester.appRegistryClient.GetStatus(
				tester.ctx,
				&connect.Request[protocol.GetStatusRequest]{
					Msg: &protocol.GetStatusRequest{
						AppId: tc.appId,
					},
				},
			)
			tester.require.NoError(err)
			tester.require.NotNil(status)

			if !tc.expectedIsRegistered {
				tester.require.EqualExportedValues(
					status.Msg,
					&protocol.GetStatusResponse{},
				)
				return
			}

			tester.require.EqualExportedValues(
				&protocol.GetStatusResponse{
					IsRegistered:  true,
					ValidResponse: true,
					Status: &protocol.AppServiceResponse_StatusResponse{
						FrameworkVersion: tc.expectedFrameworkVersion,
						DeviceKey:        tc.expectedDeviceKey,
						FallbackKey:      tc.expectedFallbackKey,
					},
					Active: true,
				},
				status.Msg,
			)

			// Validate previous status is cached by changing the framework version of the app
			// server. The ttl is only 2 seconds, but that should not present a problem here.
			appServer.SetFrameworkVersion(0, tc.expectedFrameworkVersion+100)
			status, err = tester.appRegistryClient.GetStatus(
				tester.ctx,
				&connect.Request[protocol.GetStatusRequest]{
					Msg: &protocol.GetStatusRequest{
						AppId: tc.appId,
					},
				},
			)
			tester.require.NoError(err)
			tester.require.NotNil(status)

			// None of the original status values should have changed
			tester.require.EqualExportedValues(
				&protocol.GetStatusResponse{
					IsRegistered:  true,
					ValidResponse: true,
					Status: &protocol.AppServiceResponse_StatusResponse{
						FrameworkVersion: tc.expectedFrameworkVersion,
						DeviceKey:        tc.expectedDeviceKey,
						FallbackKey:      tc.expectedFallbackKey,
					},
					Active: true,
				},
				status.Msg,
			)
		})
	}
}

func TestAppRegistry_RotateSecret(t *testing.T) {
	tester := NewAppRegistryServiceTester(t, nil)
	appWallet, ownerWallet := tester.BotWallets(0)
	tester.BotNodeClient(0, testClientOpts{}).createUserStreamsWithEncryptionDevice()
	originalSecret := tester.RegisterApp(
		appWallet,
		ownerWallet,
		protocol.ForwardSettingValue_FORWARD_SETTING_UNSPECIFIED,
	)

	unregistered := safeNewWallet(tester.ctx, tester.require)

	tests := map[string]struct {
		appId                []byte
		authenticatingWallet *crypto.Wallet
		expectedErr          string
	}{
		"Success - signed with owner wallet": {
			appId:                appWallet.Address[:],
			authenticatingWallet: ownerWallet,
		},
		"Success - signed with app wallet": {
			appId:                appWallet.Address[:],
			authenticatingWallet: appWallet,
		},
		"Invalid app id": {
			appId:                invalidAddressBytes,
			authenticatingWallet: ownerWallet,
			expectedErr:          "invalid app id",
		},
		"Unauthenticated": {
			appId:       appWallet.Address[:],
			expectedErr: "missing session token",
		},
		"App does not exist": {
			appId:                unregistered.Address[:],
			authenticatingWallet: unregistered,
			expectedErr:          "could not determine app owner",
		},
	}
	for name, tc := range tests {
		t.Run(name, func(t *testing.T) {
			req := &connect.Request[protocol.RotateSecretRequest]{
				Msg: &protocol.RotateSecretRequest{
					AppId: tc.appId,
				},
			}

			if tc.authenticatingWallet != nil {
				authenticateBS(tester.ctx, tester.require, tester.authClient, tc.authenticatingWallet, req)
			}

			resp, err := tester.appRegistryClient.RotateSecret(
				tester.ctx,
				req,
			)

			if tc.expectedErr == "" {
				tester.require.NoError(err)
				tester.require.NotNil(resp)
				tester.require.Len(resp.Msg.GetHs256SharedSecret(), 32)
				tester.require.NotEqual(originalSecret, resp.Msg.Hs256SharedSecret[:])
				originalSecret = resp.Msg.Hs256SharedSecret
			} else {
				tester.require.Nil(resp)
				tester.require.ErrorContains(err, tc.expectedErr)
			}
		})
	}
}

func TestAppRegistry_ValidateBotName(t *testing.T) {
	tester := NewAppRegistryServiceTester(t, &appRegistryTesterOpts{numBots: 2})
	tester.StartBotServices()

	// Register a bot in order to create a bot with an existing name
	_, _ = tester.RegisterBotService(0, protocol.ForwardSettingValue_FORWARD_SETTING_ALL_MESSAGES)
	existingBotWallet, _ := tester.BotWallets(0)

	// Get the existing bot's metadata to discover its name
	getMetadataResp, err := tester.appRegistryClient.GetAppMetadata(
		tester.ctx,
		&connect.Request[protocol.GetAppMetadataRequest]{
			Msg: &protocol.GetAppMetadataRequest{
				AppId: existingBotWallet.Address[:],
			},
		},
	)
	tester.require.NoError(err)
	existingBotUsername := getMetadataResp.Msg.Metadata.Username

	tests := map[string]struct {
		name             string
		expectAvailable  bool
		expectErrMessage string
	}{
		"Available name": {
			name:            "UniqueNewBotName",
			expectAvailable: true,
		},
		"Existing username": {
			name:             existingBotUsername,
			expectAvailable:  false,
			expectErrMessage: "username is already taken",
		},
		"Empty name": {
			name:             "",
			expectAvailable:  false,
			expectErrMessage: "(3:INVALID_ARGUMENT) invalid username",
		},
		"Different case of existing username": {
			name:            strings.ToUpper(existingBotUsername),
			expectAvailable: true, // Expect case-sensitive username uniqueness
		},
		"Name with spaces": {
			name:             "Bot With Spaces",
			expectAvailable:  false,
			expectErrMessage: "(3:INVALID_ARGUMENT) invalid username",
		},
		"256 character username": {
			name:            strings.Repeat("a", 256),
			expectAvailable: true,
		},
		"257 character username (too long)": {
			name:             strings.Repeat("a", 257),
			expectAvailable:  false,
			expectErrMessage: "(3:INVALID_ARGUMENT) invalid username",
		},
	}

	for testName, tt := range tests {
		t.Run(testName, func(t *testing.T) {
			resp, err := tester.appRegistryClient.ValidateBotName(
				tester.ctx,
				&connect.Request[protocol.ValidateBotNameRequest]{
					Msg: &protocol.ValidateBotNameRequest{
						Username: tt.name,
					},
				},
			)

			// ValidateBotName should never return an error, only indicate availability
			tester.require.NoError(err)
			tester.require.NotNil(resp)
			tester.require.NotNil(resp.Msg)

			assert.Equal(t, tt.expectAvailable, resp.Msg.IsAvailable)

			if tt.expectErrMessage != "" {
				assert.Equal(t, tt.expectErrMessage, resp.Msg.ErrorMessage)
			} else {
				assert.Empty(t, resp.Msg.ErrorMessage)
			}
		})
	}
}

func TestAppRegistry_Register(t *testing.T) {
	tester := NewAppRegistryServiceTester(t, nil)

	ownerWallet := tester.botCredentials[0].ownerWallet
	appWallet := tester.botCredentials[0].botWallet

	// Create additional app wallets for success test cases
	appWallet2 := safeNewWallet(tester.ctx, tester.require)

	var unregisteredApp common.Address
	_, err := rand.Read(unregisteredApp[:])
	tester.require.NoError(err)

	tester.BotNodeClient(0, testClientOpts{}).createUserStreamsWithEncryptionDevice()

	// Create user streams for the second app wallet as well
	_, _, err = createUserInboxStream(tester.ctx, appWallet2, tester.NodeClient(0, testClientOpts{}).client, nil)
	tester.require.NoError(err)

	tests := map[string]struct {
		appId                []byte
		ownerId              []byte
		metadata             *protocol.AppMetadata
		authenticatingWallet *crypto.Wallet
		expectedErr          string
	}{
		"Success": {
			appId:   appWallet.Address[:],
			ownerId: ownerWallet.Address[:],
			metadata: &protocol.AppMetadata{
				Username: "test_bot_app_success_1",

				DisplayName: "Test Bot App Success 1",
				Description: testAppMetadata().Description,
				ImageUrl:    testAppMetadata().ImageUrl,
				AvatarUrl:   testAppMetadata().AvatarUrl,
				ExternalUrl: testAppMetadata().ExternalUrl,
			},
			authenticatingWallet: ownerWallet,
		},
		"Success with minimal metadata": {
			appId:   appWallet2.Address[:],
			ownerId: ownerWallet.Address[:],
			metadata: &protocol.AppMetadata{
				Username: "minimal_app_success_2",

				DisplayName: "Minimal App Success 2",
				Description: "Minimal app description",
				ImageUrl:    "https://example.com/minimal-image.png",
				AvatarUrl:   "https://example.com/minimal-avatar.png",
				ExternalUrl: nil,
			},
			authenticatingWallet: ownerWallet,
		},
		"Invalid app id": {
			appId:                invalidAddressBytes,
			ownerId:              ownerWallet.Address[:],
			metadata:             testAppMetadata(),
			authenticatingWallet: ownerWallet,
			expectedErr:          "invalid app id",
		},
		"Invalid owner id": {
			appId:                appWallet.Address[:],
			ownerId:              invalidAddressBytes,
			metadata:             testAppMetadata(),
			authenticatingWallet: ownerWallet,
			expectedErr:          "invalid owner id",
		},
		"Missing metadata": {
			appId:                appWallet.Address[:],
			ownerId:              ownerWallet.Address[:],
			metadata:             nil,
			authenticatingWallet: ownerWallet,
			expectedErr:          "metadata is required",
		},
		"Invalid metadata - missing name": {
			appId:   appWallet.Address[:],
			ownerId: ownerWallet.Address[:],
			metadata: &protocol.AppMetadata{
				Username: "",

				DisplayName: "",
				Description: "Missing name",
				ImageUrl:    "https://example.com/image.png",
				AvatarUrl:   "https://example.com/avatar.png",
			},
			authenticatingWallet: ownerWallet,
			expectedErr:          "metadata username validation failed",
		},
		"Invalid metadata - missing description": {
			appId:   appWallet.Address[:],
			ownerId: ownerWallet.Address[:],
			metadata: &protocol.AppMetadata{
				Username: "test_app",

				DisplayName: "Test App",
				Description: "",
				ImageUrl:    "https://example.com/image.png",
				AvatarUrl:   "https://example.com/avatar.png",
			},
			authenticatingWallet: ownerWallet,
			expectedErr:          "metadata description is required",
		},
		"Invalid metadata - missing avatar URL": {
			appId:   appWallet.Address[:],
			ownerId: ownerWallet.Address[:],
			metadata: &protocol.AppMetadata{
				Username: "test_app",

				DisplayName: "Test App",
				Description: "Missing avatar URL",
				ImageUrl:    "https://example.com/image.png",
				AvatarUrl:   "",
			},
			authenticatingWallet: ownerWallet,
			expectedErr:          "metadata avatar_url validation failed",
		},
		"Invalid metadata - invalid avatar URL": {
			appId:   appWallet.Address[:],
			ownerId: ownerWallet.Address[:],
			metadata: &protocol.AppMetadata{
				Username: "test_app",

				DisplayName: "Test App",
				Description: "Invalid avatar URL",
				ImageUrl:    "https://example.com/image.png",
				AvatarUrl:   "not-a-valid-url",
			},
			authenticatingWallet: ownerWallet,
			expectedErr:          "metadata avatar_url validation failed",
		},
		"Invalid metadata - invalid image URL": {
			appId:   appWallet.Address[:],
			ownerId: ownerWallet.Address[:],
			metadata: &protocol.AppMetadata{
				Username: "test_app",

				DisplayName: "Test App",
				Description: "Invalid image URL",
				ImageUrl:    "invalid-url",
				AvatarUrl:   "https://example.com/avatar.png",
			},
			authenticatingWallet: ownerWallet,
			expectedErr:          "metadata image_url validation failed",
		},
		"Invalid metadata - invalid external URL": {
			appId:   appWallet.Address[:],
			ownerId: ownerWallet.Address[:],
			metadata: &protocol.AppMetadata{
				Username: "test_app",

				DisplayName: "Test App",
				Description: "Invalid external URL",
				ImageUrl:    "https://example.com/image.png",
				AvatarUrl:   "https://example.com/avatar.png",
				ExternalUrl: stringPtr("not-valid-url"),
			},
			authenticatingWallet: ownerWallet,
			expectedErr:          "metadata external_url must be a valid URL",
		},
		"Invalid authorization": {
			appId:                appWallet.Address[:],
			ownerId:              ownerWallet.Address[:],
			metadata:             testAppMetadata(),
			authenticatingWallet: appWallet,
			expectedErr:          "authenticated user must be app owner",
		},
		"Missing authorization": {
			appId:       appWallet.Address[:],
			ownerId:     ownerWallet.Address[:],
			metadata:    testAppMetadata(),
			expectedErr: "missing session token",
		},
		"Invalid metadata - invalid slash command name": {
			appId:   appWallet.Address[:],
			ownerId: ownerWallet.Address[:],
			metadata: &protocol.AppMetadata{
				Username: "test_app_invalid_command",

				DisplayName: "Test App Invalid Command",
				Description: "Test app with invalid command",
				ImageUrl:    "https://example.com/image.png",
				AvatarUrl:   "https://example.com/avatar.png",
				SlashCommands: []*protocol.SlashCommand{
					{Name: "help!", Description: "Invalid command name"},
				},
			},
			authenticatingWallet: ownerWallet,
			expectedErr:          "command name must contain only letters, numbers, and underscores",
		},
		"Invalid metadata - duplicate slash commands": {
			appId:   appWallet.Address[:],
			ownerId: ownerWallet.Address[:],
			metadata: &protocol.AppMetadata{
				Username: "test_app_duplicate_commands",

				DisplayName: "Test App Duplicate Commands",
				Description: "Test app with duplicate commands",
				ImageUrl:    "https://example.com/image.png",
				AvatarUrl:   "https://example.com/avatar.png",
				SlashCommands: []*protocol.SlashCommand{
					{Name: "ping", Description: "Ping command"},
					{Name: "ping", Description: "Another ping command"},
				},
			},
			authenticatingWallet: ownerWallet,
			expectedErr:          "duplicate command name",
		},
		"Invalid metadata - too many slash commands": {
			appId:   appWallet.Address[:],
			ownerId: ownerWallet.Address[:],
			metadata: &protocol.AppMetadata{
				Username: "test_app_many_commands",

				DisplayName: "Test App Many Commands",
				Description: "Test app with too many commands",
				ImageUrl:    "https://example.com/image.png",
				AvatarUrl:   "https://example.com/avatar.png",
				SlashCommands: func() []*protocol.SlashCommand {
					commands := make([]*protocol.SlashCommand, 26)
					for i := 0; i < 26; i++ {
						commands[i] = &protocol.SlashCommand{
							Name:        fmt.Sprintf("cmd%d", i),
							Description: fmt.Sprintf("Command %d", i),
						}
					}
					return commands
				}(),
			},
			authenticatingWallet: ownerWallet,
			expectedErr:          "app metadata slash command count exceeds maximum",
		},
	}
	for name, tc := range tests {
		t.Run(name, func(t *testing.T) {
			req := &connect.Request[protocol.RegisterRequest]{
				Msg: &protocol.RegisterRequest{
					AppId:      tc.appId,
					AppOwnerId: tc.ownerId,
					Metadata:   tc.metadata,
				},
			}

			if tc.authenticatingWallet != nil {
				authenticateBS(tester.ctx, tester.require, tester.authClient, tc.authenticatingWallet, req)
			}

			resp, err := tester.appRegistryClient.Register(
				tester.ctx,
				req,
			)

			if tc.expectedErr == "" {
				tester.require.NoError(err)
				tester.require.NotNil(resp)
				tester.require.Len(resp.Msg.GetHs256SharedSecret(), 32)

				// Verify metadata was stored correctly
				getReq := &connect.Request[protocol.GetAppMetadataRequest]{
					Msg: &protocol.GetAppMetadataRequest{
						AppId: tc.appId,
					},
				}
				getResp, err := tester.appRegistryClient.GetAppMetadata(tester.ctx, getReq)
				tester.require.NoError(err)
				tester.require.NotNil(getResp)
				// Verify metadata was stored correctly
				assertAppMetadataEqual(t, tc.metadata, getResp.Msg.GetMetadata())
			} else {
				tester.require.Nil(resp)
				tester.require.ErrorContains(err, tc.expectedErr)
			}
		})
	}
}

func TestAppRegistry_SetAppActiveStatus(t *testing.T) {
	tester := NewAppRegistryServiceTester(t, &appRegistryTesterOpts{
		numBots: 1,
	})

	// Register and setup bot
	tester.StartBotServices()
	botCreds := tester.botCredentials[0]
	tester.RegisterBotService(0, protocol.ForwardSettingValue_FORWARD_SETTING_MENTIONS_REPLIES_REACTIONS)

	t.Run("Owner can deactivate app", func(t *testing.T) {
		req := &connect.Request[protocol.SetAppActiveStatusRequest]{
			Msg: &protocol.SetAppActiveStatusRequest{
				AppId:  botCreds.botWallet.Address[:],
				Active: false,
			},
		}
		authenticateBS(tester.ctx, tester.require, tester.authClient, botCreds.ownerWallet, req)

		resp, err := tester.appRegistryClient.SetAppActiveStatus(
			tester.ctx,
			req,
		)
		require.NoError(t, err)
		require.NotNil(t, resp)

		// Verify status
		statusResp, err := tester.appRegistryClient.GetStatus(
			tester.ctx,
			connect.NewRequest(&protocol.GetStatusRequest{
				AppId: botCreds.botWallet.Address[:],
			}),
		)
		require.NoError(t, err)
		require.False(t, statusResp.Msg.Active)
		require.True(t, statusResp.Msg.IsRegistered)
	})

	t.Run("Owner can reactivate app", func(t *testing.T) {
		req := &connect.Request[protocol.SetAppActiveStatusRequest]{
			Msg: &protocol.SetAppActiveStatusRequest{
				AppId:  botCreds.botWallet.Address[:],
				Active: true,
			},
		}
		authenticateBS(tester.ctx, tester.require, tester.authClient, botCreds.ownerWallet, req)

		resp, err := tester.appRegistryClient.SetAppActiveStatus(
			tester.ctx,
			req,
		)
		require.NoError(t, err)
		require.NotNil(t, resp)

		// Verify status
		statusResp, err := tester.appRegistryClient.GetStatus(
			tester.ctx,
			connect.NewRequest(&protocol.GetStatusRequest{
				AppId: botCreds.botWallet.Address[:],
			}),
		)
		require.NoError(t, err)
		require.True(t, statusResp.Msg.Active)
	})

	t.Run("App itself can change status", func(t *testing.T) {
		// Create authenticated client for the bot
		botAuthClient := protocolconnect.NewAuthenticationServiceClient(
			tester.serviceTester.httpClient(),
			"https://"+tester.appRegistryService.listener.Addr().String(),
		)
		botAppRegistryClient := protocolconnect.NewAppRegistryServiceClient(
			tester.serviceTester.httpClient(),
			"https://"+tester.appRegistryService.listener.Addr().String(),
		)

		req := &connect.Request[protocol.SetAppActiveStatusRequest]{
			Msg: &protocol.SetAppActiveStatusRequest{
				AppId:  botCreds.botWallet.Address[:],
				Active: false,
			},
		}
		authenticateBS(tester.ctx, tester.require, botAuthClient, botCreds.botWallet, req)

		resp, err := botAppRegistryClient.SetAppActiveStatus(
			tester.ctx,
			req,
		)
		require.NoError(t, err)
		require.NotNil(t, resp)

		// Verify status
		statusResp, err := tester.appRegistryClient.GetStatus(
			tester.ctx,
			connect.NewRequest(&protocol.GetStatusRequest{
				AppId: botCreds.botWallet.Address[:],
			}),
		)
		require.NoError(t, err)
		require.False(t, statusResp.Msg.Active)
	})

	t.Run("Non-owner cannot change status", func(t *testing.T) {
		otherWallet := safeNewWallet(tester.ctx, tester.require)

		otherAuthClient := protocolconnect.NewAuthenticationServiceClient(
			tester.serviceTester.httpClient(),
			"https://"+tester.appRegistryService.listener.Addr().String(),
		)
		otherAppRegistryClient := protocolconnect.NewAppRegistryServiceClient(
			tester.serviceTester.httpClient(),
			"https://"+tester.appRegistryService.listener.Addr().String(),
		)

		req := &connect.Request[protocol.SetAppActiveStatusRequest]{
			Msg: &protocol.SetAppActiveStatusRequest{
				AppId:  botCreds.botWallet.Address[:],
				Active: false,
			},
		}
		authenticateBS(tester.ctx, tester.require, otherAuthClient, otherWallet, req)

		resp, err := otherAppRegistryClient.SetAppActiveStatus(
			tester.ctx,
			req,
		)
		require.Error(t, err, "Should get an error when non-owner tries to change status")
		require.Nil(t, resp)
	})

	t.Run("Cannot change status of non-existent app", func(t *testing.T) {
		nonExistentApp := common.HexToAddress("0x1234567890123456789012345678901234567890")

		req := &connect.Request[protocol.SetAppActiveStatusRequest]{
			Msg: &protocol.SetAppActiveStatusRequest{
				AppId:  nonExistentApp[:],
				Active: false,
			},
		}
		authenticateBS(tester.ctx, tester.require, tester.authClient, botCreds.ownerWallet, req)

		resp, err := tester.appRegistryClient.SetAppActiveStatus(
			tester.ctx,
			req,
		)
		require.Error(t, err)
		require.Nil(t, resp)
	})
}

func TestAppRegistry_GetAppActiveStatus(t *testing.T) {
	tester := NewAppRegistryServiceTester(t, &appRegistryTesterOpts{
		numBots: 1,
	})

	// Register and setup bot
	tester.StartBotServices()
	botCreds := tester.botCredentials[0]
	tester.RegisterBotService(0, protocol.ForwardSettingValue_FORWARD_SETTING_MENTIONS_REPLIES_REACTIONS)

	t.Run("New app is active by default", func(t *testing.T) {
		// GetAppActiveStatus is unauthenticated - no auth needed
		resp, err := tester.appRegistryClient.GetAppActiveStatus(
			tester.ctx,
			connect.NewRequest(&protocol.GetAppActiveStatusRequest{
				AppId: botCreds.botWallet.Address[:],
			}),
		)
		require.NoError(t, err)
		require.True(t, resp.Msg.Active)
	})

	t.Run("Returns false after deactivation", func(t *testing.T) {
		// Deactivate the app
		setReq := &connect.Request[protocol.SetAppActiveStatusRequest]{
			Msg: &protocol.SetAppActiveStatusRequest{
				AppId:  botCreds.botWallet.Address[:],
				Active: false,
			},
		}
		authenticateBS(tester.ctx, tester.require, tester.authClient, botCreds.ownerWallet, setReq)
		_, err := tester.appRegistryClient.SetAppActiveStatus(tester.ctx, setReq)
		require.NoError(t, err)

		// Verify GetAppActiveStatus returns false
		resp, err := tester.appRegistryClient.GetAppActiveStatus(
			tester.ctx,
			connect.NewRequest(&protocol.GetAppActiveStatusRequest{
				AppId: botCreds.botWallet.Address[:],
			}),
		)
		require.NoError(t, err)
		require.False(t, resp.Msg.Active)
	})

	t.Run("Returns true after reactivation", func(t *testing.T) {
		// Reactivate the app
		setReq := &connect.Request[protocol.SetAppActiveStatusRequest]{
			Msg: &protocol.SetAppActiveStatusRequest{
				AppId:  botCreds.botWallet.Address[:],
				Active: true,
			},
		}
		authenticateBS(tester.ctx, tester.require, tester.authClient, botCreds.ownerWallet, setReq)
		_, err := tester.appRegistryClient.SetAppActiveStatus(tester.ctx, setReq)
		require.NoError(t, err)

		// Verify GetAppActiveStatus returns true
		resp, err := tester.appRegistryClient.GetAppActiveStatus(
			tester.ctx,
			connect.NewRequest(&protocol.GetAppActiveStatusRequest{
				AppId: botCreds.botWallet.Address[:],
			}),
		)
		require.NoError(t, err)
		require.True(t, resp.Msg.Active)
	})

	t.Run("Returns error for non-existent app", func(t *testing.T) {
		nonExistentApp := common.HexToAddress("0x1234567890123456789012345678901234567890")

		resp, err := tester.appRegistryClient.GetAppActiveStatus(
			tester.ctx,
			connect.NewRequest(&protocol.GetAppActiveStatusRequest{
				AppId: nonExistentApp[:],
			}),
		)
		require.Error(t, err)
		require.Nil(t, resp)
	})

	t.Run("Works without authentication", func(t *testing.T) {
		// Create unauthenticated client
		unauthClient := protocolconnect.NewAppRegistryServiceClient(
			tester.serviceTester.httpClient(),
			"https://"+tester.appRegistryService.listener.Addr().String(),
		)

		// Should work without authentication
		resp, err := unauthClient.GetAppActiveStatus(
			tester.ctx,
			connect.NewRequest(&protocol.GetAppActiveStatusRequest{
				AppId: botCreds.botWallet.Address[:],
			}),
		)
		require.NoError(t, err)
		require.NotNil(t, resp)
		require.True(t, resp.Msg.Active)
	})
}

func TestAppRegistry_GetStatusWithActive(t *testing.T) {
	tester := NewAppRegistryServiceTester(t, &appRegistryTesterOpts{
		numBots: 2,
	})

	// Register both bots
	tester.StartBotServices()
	tester.RegisterBotService(0, protocol.ForwardSettingValue_FORWARD_SETTING_MENTIONS_REPLIES_REACTIONS)
	tester.RegisterBotService(1, protocol.ForwardSettingValue_FORWARD_SETTING_MENTIONS_REPLIES_REACTIONS)

	// Bot 0 should be active by default
	statusResp, err := tester.appRegistryClient.GetStatus(
		tester.ctx,
		connect.NewRequest(&protocol.GetStatusRequest{
			AppId: tester.botCredentials[0].botWallet.Address[:],
		}),
	)
	tester.require.NoError(err)
	tester.require.True(statusResp.Msg.Active)
	tester.require.True(statusResp.Msg.IsRegistered)

	// Deactivate bot 1
	req := &connect.Request[protocol.SetAppActiveStatusRequest]{
		Msg: &protocol.SetAppActiveStatusRequest{
			AppId:  tester.botCredentials[1].botWallet.Address[:],
			Active: false,
		},
	}
	authenticateBS(tester.ctx, tester.require, tester.authClient, tester.botCredentials[1].ownerWallet, req)

	_, err = tester.appRegistryClient.SetAppActiveStatus(
		tester.ctx,
		req,
	)
	tester.require.NoError(err)

	// Verify bot 1 is inactive
	statusResp, err = tester.appRegistryClient.GetStatus(
		tester.ctx,
		connect.NewRequest(&protocol.GetStatusRequest{
			AppId: tester.botCredentials[1].botWallet.Address[:],
		}),
	)
	tester.require.NoError(err)
	tester.require.False(statusResp.Msg.Active)

	// Verify bot 0 is still active
	statusResp, err = tester.appRegistryClient.GetStatus(
		tester.ctx,
		connect.NewRequest(&protocol.GetStatusRequest{
			AppId: tester.botCredentials[0].botWallet.Address[:],
		}),
	)
	tester.require.NoError(err)
	tester.require.True(statusResp.Msg.Active)
}

func TestAppRegistry_InactiveAppsDoNotReceiveMessages(t *testing.T) {
	tester := NewAppRegistryServiceTester(t, nil)

	tester.StartBotServices()

	participantClient := tester.NodeClient(0, testClientOpts{
		deviceKey:   "participantDeviceKey",
		fallbackKey: "participantFallbackKey",
	})
	participantClient.createUserStreamsWithEncryptionDevice()

	spaceId, _ := participantClient.createSpace()
	channelId, _, _ := participantClient.createChannel(spaceId)

	_, userStreamMbRef := tester.RegisterBotService(0, protocol.ForwardSettingValue_FORWARD_SETTING_ALL_MESSAGES)
	botClient := tester.BotNodeClient(0, testClientOpts{})
	botClient.joinChannel(spaceId, channelId, userStreamMbRef)
	botClient.requireMembership(channelId, []common.Address{botClient.wallet.Address, participantClient.wallet.Address})

	// Send message while bot is active - should trigger key solicitation
	testSessionBytes1, testSession1 := generateRandomSession(tester.require)
	participantClient.sayWithSessionAndTags(
		channelId,
		"message while active",
		nil,
		testSessionBytes1,
		participantClient.deviceKey,
	)
	participantClient.requireKeySolicitation(channelId, testBotEncryptionDevice(0).DeviceKey, testSession1)

	// Deactivate the bot
	botCreds := tester.botCredentials[0]
	req := &connect.Request[protocol.SetAppActiveStatusRequest]{
		Msg: &protocol.SetAppActiveStatusRequest{
			AppId:  botCreds.botWallet.Address[:],
			Active: false,
		},
	}
	authenticateBS(tester.ctx, tester.require, tester.authClient, botCreds.ownerWallet, req)
	_, err := tester.appRegistryClient.SetAppActiveStatus(tester.ctx, req)
	tester.require.NoError(err)

	// Send message while bot is inactive - should NOT trigger key solicitation
	testSessionBytes2, testSession2 := generateRandomSession(tester.require)
	participantClient.sayWithSessionAndTags(
		channelId,
		"message while inactive",
		nil,
		testSessionBytes2,
		participantClient.deviceKey,
	)
	participantClient.requireNoKeySolicitation(
		channelId,
		testBotEncryptionDevice(0).DeviceKey,
		testSession2,
		2*time.Second,
		100*time.Millisecond,
	)

	// Reactivate the bot
	req.Msg.Active = true
	authenticateBS(tester.ctx, tester.require, tester.authClient, botCreds.ownerWallet, req)
	_, err = tester.appRegistryClient.SetAppActiveStatus(tester.ctx, req)
	tester.require.NoError(err)

	// Send message after reactivation - should trigger key solicitation again
	testSessionBytes3, testSession3 := generateRandomSession(tester.require)
	participantClient.sayWithSessionAndTags(
		channelId,
		"message after reactivation",
		nil,
		testSessionBytes3,
		participantClient.deviceKey,
	)
	participantClient.requireKeySolicitation(channelId, testBotEncryptionDevice(0).DeviceKey, testSession3)
}
