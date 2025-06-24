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

func (ar *appRegistryServiceTester) RegisterApp(
	appWallet *crypto.Wallet,
	ownerWallet *crypto.Wallet,
	forwardSetting protocol.ForwardSettingValue,
) (sharedSecret []byte) {
	return register(
		ar.ctx,
		ar.require,
		appWallet.Address[:],
		ownerWallet.Address[:],
		forwardSetting,
		ownerWallet,
		ar.authClient,
		ar.appRegistryClient,
	)
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
	ar.botIndexCheck(botIndex)
	botClient := ar.BotNodeClient(botIndex, testClientOpts{})
	mbRef = botClient.createUserStreamsWithEncryptionDevice()
	sharedSecret = ar.RegisterApp(
		ar.botCredentials[botIndex].botWallet,
		ar.botCredentials[botIndex].ownerWallet,
		forwardSetting,
	)

	ar.appServer.SetHS256SecretKey(botIndex, sharedSecret)
	ar.appServer.SetEncryptionDevice(botIndex, botClient.DefaultEncryptionDevice())

	registerWebhook(
		ar.ctx,
		ar.require,
		ar.botCredentials[botIndex].botWallet,
		ar.authClient,
		ar.appRegistryClient,
		ar.appServer.Url(botIndex),
	)
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
	enableRiverLogs     bool
	enableAppServerLogs bool
}

func NewAppRegistryServiceTester(t *testing.T, opts *appRegistryTesterOpts) *appRegistryServiceTester {
	numNodes := int(1)
	if opts != nil && opts.numNodes > 0 {
		numNodes = opts.numNodes
	}
	enableRiverLogs := opts != nil && opts.enableRiverLogs
	tester := newServiceTester(t, serviceTesterOpts{numNodes: numNodes, start: true, printTestLogs: enableRiverLogs})
	ctx := tester.ctx
	// Uncomment to force logging only for the app registry service
	// ctx = logging.CtxWithLog(ctx, logging.DefaultLogger(zapcore.DebugLevel))
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
	tester.cleanup(appServer.Close)

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
	tester.cleanup(func() {
		err := dbtestutils.DeleteTestSchema(
			context.Background(),
			tester.dbUrl,
			storage.DbSchemaNameForAppRegistryService(config.AppRegistry.AppRegistryId),
		)
		tester.require.NoError(err)
	})
	tester.cleanup(service.Close)

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

func register(
	ctx context.Context,
	require *require.Assertions,
	appAddress []byte,
	ownerAddress []byte,
	forwardSetting protocol.ForwardSettingValue,
	signer *crypto.Wallet,
	authClient protocolconnect.AuthenticationServiceClient,
	appRegistryClient protocolconnect.AppRegistryServiceClient,
) (sharedSecret []byte) {
	req := &connect.Request[protocol.RegisterRequest]{
		Msg: &protocol.RegisterRequest{
			AppId:      appAddress,
			AppOwnerId: ownerAddress,
			Settings: &protocol.AppSettings{
				ForwardSetting: forwardSetting,
			},
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
	authClient protocolconnect.AuthenticationServiceClient,
	appRegistryClient protocolconnect.AppRegistryServiceClient,
	url string,
) {
	req := &connect.Request[protocol.RegisterWebhookRequest]{
		Msg: &protocol.RegisterWebhookRequest{
			AppId:      appWallet.Address[:],
			WebhookUrl: url,
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
			expectedErr:          "app is not registered",
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

func TestAppRegistry_MessageForwardSettings(t *testing.T) {
	ctx, cancel := test.NewTestContext()
	defer cancel()
	require := require.New(t)
	botWallet := safeNewWallet(ctx, require)
	ownerWallet := safeNewWallet(ctx, require)

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
				participantClient.requireNoKeySolicitation(channelId, testBotEncryptionDevice(0).DeviceKey, 10*time.Second, 100*time.Millisecond)
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
	// t.Skip("Skipping due to flakes")
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
				AppId:     botWallet.Address[:],
				SessionId: testSession1,
			},
		}
		authenticateBS(tester.ctx, require, tester.authClient, botWallet, req)

		resp, err := tester.appRegistryClient.GetSession(tester.ctx, req)
		if !(assert.NoError(c, err, "GetSession should produce no error") && assert.NotNil(c, resp)) {
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
			AppId:     botWallet.Address[:],
			SessionId: testSession2,
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

	// Check non-existent session - should result in a NOT_FOUND error.
	req = &connect.Request[protocol.GetSessionRequest]{
		Msg: &protocol.GetSessionRequest{
			AppId:     botWallet.Address[:],
			SessionId: "nonexistentSession",
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
			AppId:     participantClient.wallet.Address[:],
			SessionId: "nonexistentSession",
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
			AppId:     botWallet.Address[:],
			SessionId: "nonexistentSession",
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
			AppId:     participantClient.wallet.Address[:],
			SessionId: "nonexistentSession",
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
			expectedErr:          "app is not registered",
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

func TestAppRegistry_Register(t *testing.T) {
	tester := NewAppRegistryServiceTester(t, nil)

	ownerWallet := tester.botCredentials[0].ownerWallet
	appWallet := tester.botCredentials[0].botWallet

	var unregisteredApp common.Address
	_, err := rand.Read(unregisteredApp[:])
	tester.require.NoError(err)

	tester.BotNodeClient(0, testClientOpts{}).createUserStreamsWithEncryptionDevice()

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
			} else {
				tester.require.Nil(resp)
				tester.require.ErrorContains(err, tc.expectedErr)
			}
		})
	}
}
