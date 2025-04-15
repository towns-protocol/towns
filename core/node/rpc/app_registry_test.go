package rpc

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/hex"
	"strings"
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

var testEncryptionDevice = app_client.EncryptionDevice{
	DeviceKey:   "deviceKey",
	FallbackKey: "fallbackKey",
}

type appRegistryServiceTester struct {
	tester             *serviceTester
	t                  *testing.T
	ctx                context.Context
	require            *require.Assertions
	appRegistryService *Service

	botWallet   *crypto.Wallet
	ownerWallet *crypto.Wallet

	appServer *app_registry.TestAppServer

	authClient        protocolconnect.AuthenticationServiceClient
	appRegistryClient protocolconnect.AppRegistryServiceClient
}

func (ar *appRegistryServiceTester) Bot() *crypto.Wallet {
	return ar.botWallet
}

func (ar *appRegistryServiceTester) Owner() *crypto.Wallet {
	return ar.ownerWallet
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

func (ar *appRegistryServiceTester) RegisterBotService(
	forwardSetting protocol.ForwardSettingValue,
) (sharedSecret []byte, appUserStreamCookie *protocol.SyncCookie) {
	botClient := ar.BotNodeClient(testClientOpts{})
	appUserStreamCookie = botClient.createUserStreamsWithEncryptionDevice(
		&protocol.UserMetadataPayload_EncryptionDevice{
			DeviceKey:   testEncryptionDevice.DeviceKey,
			FallbackKey: testEncryptionDevice.FallbackKey,
		},
	)
	sharedSecret = ar.RegisterApp(
		ar.botWallet,
		ar.ownerWallet,
		forwardSetting,
	)

	registerWebhook(
		ar.ctx,
		ar.require,
		ar.botWallet,
		sharedSecret,
		testEncryptionDevice,
		ar.authClient,
		ar.appRegistryClient,
		ar.appServer,
	)
	return sharedSecret, appUserStreamCookie
}

func (ar *appRegistryServiceTester) StartBotService() {
	go func() {
		if err := ar.appServer.Serve(ar.ctx); err != nil {
			ar.tester.t.Errorf("Error starting bot service: %v", err)
		}
	}()
}

func (ar *appRegistryServiceTester) BotNodeClient(opts testClientOpts) *testClient {
	return ar.tester.newTestClientWithWallet(0, opts, ar.botWallet)
}

func (ar *appRegistryServiceTester) NodeClient(i int, opts testClientOpts) *testClient {
	if i >= ar.tester.opts.numNodes {
		ar.t.Fatalf("Node index does not exist; have %d nodes, asked for node %d", ar.tester.opts.numNodes, i)
	}
	return ar.tester.newTestClient(i, opts)
}

type testerOpts struct {
	numNodes    int
	botWallet   *crypto.Wallet
	ownerWallet *crypto.Wallet
}

func NewAppRegistryServiceTester(t *testing.T, opts *testerOpts) *appRegistryServiceTester {
	numNodes := int(1)
	if opts != nil && opts.numNodes > 0 {
		numNodes = opts.numNodes
	}
	tester := newServiceTester(t, serviceTesterOpts{numNodes: numNodes, start: true})
	ctx := tester.ctx
	// Uncomment to force logging only for the app registry service
	// ctx = logging.CtxWithLog(ctx, logging.DefaultLogger(zapcore.DebugLevel))
	service := initAppRegistryService(ctx, tester)

	require := tester.require
	client := tester.testClient(0)
	var botWallet, ownerWallet *crypto.Wallet
	if opts != nil && opts.botWallet != nil {
		botWallet = opts.botWallet
	} else {
		botWallet = safeNewWallet(ctx, require)
	}
	if opts != nil && opts.ownerWallet != nil {
		ownerWallet = opts.ownerWallet
	} else {
		ownerWallet = safeNewWallet(ctx, require)
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

	// Start a test app service that serves webhook responses
	appServer := app_registry.NewTestAppServer(t, botWallet, client, true)
	tester.cleanup(appServer.Close)

	return &appRegistryServiceTester{
		tester:             tester,
		t:                  t,
		ctx:                ctx,
		require:            require,
		appRegistryService: service,
		authClient:         authClient,
		appRegistryClient:  appRegistryClient,
		botWallet:          botWallet,
		ownerWallet:        ownerWallet,
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

	tester.StartBotService()
	// Create user streams for chat participant
	participantEncryptionDevice := protocol.UserMetadataPayload_EncryptionDevice{
		DeviceKey:   "participantDeviceKey",
		FallbackKey: "participantFallbackKey",
	}

	participantClient := tester.NodeClient(0, testClientOpts{})
	participantClient.createUserStreamsWithEncryptionDevice(&participantEncryptionDevice)

	// The participant creates a space and a channel.
	spaceId, _ := participantClient.createSpace()
	channelId, _, _ := participantClient.createChannel(spaceId)

	// Create user streams for bot and add to channel
	_, appUserStreamCookie := tester.RegisterBotService(protocol.ForwardSettingValue_FORWARD_SETTING_ALL_MESSAGES)
	botClient := tester.BotNodeClient(testClientOpts{})

	// Note: if this fails, recall the previous implementation had the participant sign this transaction
	botClient.joinChannel(spaceId, channelId, &MiniblockRef{
		Hash: common.Hash(appUserStreamCookie.PrevMiniblockHash),
		Num:  appUserStreamCookie.MinipoolGen - 1,
	})
	botClient.requireMembership(channelId, []common.Address{botClient.wallet.Address, participantClient.wallet.Address})

	// The participant sends a test message to send to the channel with session id "session0".
	// The app registry service does not have a session key for this session and should prompt
	// the bot to solicit keys in the channel.
	testMessageText := "xyz"
	testSessionBytes, testSession := generateRandomSession(tester.require)
	participantClient.sayWithSessionAndTags(
		channelId,
		testMessageText,
		nil,
		testSessionBytes,
		participantEncryptionDevice.DeviceKey,
	)

	// Expect the bot to solicit keys to decrypt the message the particapant just sent.
	participantClient.requireKeySolicitation(channelId, testEncryptionDevice.DeviceKey, testSession)

	// Have the participant send the solicitation response directly to the bot's user inbox stream.
	testCiphertexts := generateSessionKeys(testEncryptionDevice.DeviceKey, []string{testSession})
	participantClient.sendSolicitationResponse(
		tester.botWallet.Address,
		channelId,
		testEncryptionDevice.DeviceKey,
		[]string{testSession},
		testCiphertexts,
	)

	replyText := app_registry.FormatTestAppMessageReply(testSession, testMessageText, testCiphertexts)

	// Final channel content should include original message as well as the reply.
	participantClient.listen(
		channelId,
		[]common.Address{participantClient.userId, botClient.userId},
		[][]string{{testMessageText, ""}, {"", replyText}},
	)
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
	forwardSetting protocol.ForwardSettingValue,
	signer *crypto.Wallet,
	authClient protocolconnect.AuthenticationServiceClient,
	appRegistryClient protocolconnect.AppRegistryServiceClient,
) (sharedSecret []byte) {
	req := &connect.Request[protocol.RegisterRequest]{
		Msg: &protocol.RegisterRequest{
			AppId:          appAddress,
			AppOwnerId:     ownerAddress,
			ForwardSetting: &forwardSetting,
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

func safeCreateUserStreams(
	t *testing.T,
	ctx context.Context,
	wallet *crypto.Wallet,
	client protocolconnect.StreamServiceClient,
	encryptionDevice *app_client.EncryptionDevice,
) (userCookie *protocol.SyncCookie) {
	userCookie, _, err := createUser(ctx, wallet, client, nil)
	require.NoError(t, err)

	_, _, err = createUserInboxStream(ctx, wallet, client, nil)
	require.NoError(t, err)

	cookie, _, err := createUserMetadataStream(ctx, wallet, client, nil)
	require.NoError(t, err)

	event, err := events.MakeEnvelopeWithPayloadAndTags(
		wallet,
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

	return userCookie
}

func TestAppRegistry_MessageForwardSettings(t *testing.T) {
	botWallet := safeNewWallet(context.Background(), require.New(t))
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
		"ALL_MESSAGES": protocol.ForwardSettingValue_FORWARD_SETTING_ALL_MESSAGES,
		// "UNSPECIFIED":                protocol.ForwardSettingValue_FORWARD_SETTING_UNSPECIFIED,
		// "MENTIONS_REPLIES_REACTIONS": protocol.ForwardSettingValue_FORWARD_SETTING_MENTIONS_REPLIES_REACTIONS,
		// "NO_MESSAGES":                protocol.ForwardSettingValue_FORWARD_SETTING_NO_MESSAGES,
	}
	for name, forwardSetting := range tests {
		t.Run(name, func(t *testing.T) {
			tester := NewAppRegistryServiceTester(t, &testerOpts{
				botWallet: botWallet,
			})
			tester.StartBotService()

			// Create user streams for chat participant
			participantEncryptionDevice := protocol.UserMetadataPayload_EncryptionDevice{
				DeviceKey:   "participantDeviceKey",
				FallbackKey: "participantFallbackKey",
			}

			participantClient := tester.NodeClient(0, testClientOpts{})
			participantClient.createUserStreamsWithEncryptionDevice(&participantEncryptionDevice)

			// The participant creates a space and a channel.
			spaceId, _ := participantClient.createSpace()
			channelId, _, _ := participantClient.createChannel(spaceId)

			// Create user streams for bot and add to channel
			_, appUserStreamCookie := tester.RegisterBotService(forwardSetting)
			botClient := tester.BotNodeClient(testClientOpts{})

			// Bot joins channel.
			botClient.joinChannel(spaceId, channelId, &MiniblockRef{
				Hash: common.Hash(appUserStreamCookie.PrevMiniblockHash),
				Num:  appUserStreamCookie.MinipoolGen - 1,
			})

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
					participantEncryptionDevice.DeviceKey,
				)
				conversation = append(conversation, []string{messageText, ""})
			}

			// Also send a solicitation, which is a member event, to validate that member events are or
			// are not being passed through.
			solicitation := participantClient.solicitKeys(
				channelId,
				participantEncryptionDevice.DeviceKey,
				participantEncryptionDevice.FallbackKey                                                                                                                                                         ,
				false,
				[]string{"12345678", "abcdef0123"},
			)

			var testCiphertexts string
			if expectForwarding {
				// Expect the bot to solicit keys to decrypt the messages the participant just sent.
				participantClient.requireKeySolicitation(channelId, testEncryptionDevice.DeviceKey, testSession)

				// Have the participant send the solicitation response directly to the bot's user inbox stream.
				testCiphertexts = generateSessionKeys(testEncryptionDevice.DeviceKey, []string{testSession})
				participantClient.sendSolicitationResponse(
					tester.botWallet.Address,
					channelId,
					testEncryptionDevice.DeviceKey,
					[]string{testSession},
					testCiphertexts,
				)
			} else {
				participantClient.requireNoKeySolicitation(channelId, testEncryptionDevice.DeviceKey, 10*time.Second, 100*time.Millisecond)
			}

			if expectForwarding {
				for messageText, tc := range uniqueTestMessages {
					if !tc.expectedForwards[forwardSetting] {
						continue
					}
					// Final channel content should include original message as well as the reply.
					replyText := app_registry.FormatTestAppMessageReply(testSession, messageText, testCiphertexts)
					conversation = append(conversation, []string{"", replyText})
				}

				// If the setting is ALL_MESSAGES, expect a reply specific to key solicitations
				// containing the key solicitation metadata.
				if forwardSetting == protocol.ForwardSettingValue_FORWARD_SETTING_ALL_MESSAGES {
					conversation = append(
						conversation,
						[]string{"", app_registry.FormatKeySolicitationReply(solicitation)},
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

	tester.StartBotService()
	_, userCookie := tester.RegisterBotService(protocol.ForwardSettingValue_FORWARD_SETTING_ALL_MESSAGES)

	participantClient := tester.tester.newTestClient(0, testClientOpts{})

	// Create user streams for a chat participant
	participantEncryptionDevice := app_client.EncryptionDevice{
		DeviceKey:   "participantDeviceKey",
		FallbackKey: "participantFallbackKey",
	}
	participantClient.createUserStreamsWithEncryptionDevice(&protocol.UserMetadataPayload_EncryptionDevice{
		DeviceKey:   participantEncryptionDevice.DeviceKey,
		FallbackKey: participantEncryptionDevice.FallbackKey,
	})

	// The participant creates a space and a channel.
	spaceId, _ := participantClient.createSpace()
	channelId, _, _ := participantClient.createChannel(spaceId)

	botClient := tester.BotNodeClient(testClientOpts{})
	botClient.joinChannel(spaceId, channelId, &MiniblockRef{
		Hash: common.Hash(userCookie.PrevMiniblockHash),
		Num:  userCookie.MinipoolGen - 1,
	})
	botClient.requireMembership(channelId, []common.Address{botClient.wallet.Address, participantClient.wallet.Address})

	// Have the participant send a group encryption sessions message directly to the bot's user inbox stream
	// so the registry can detect the published key for the sessions.
	testSession1 := "session1"
	testSession2 := "session2"
	testCiphertexts := "ciphertext-deviceKey-session1-session2"

	participantClient.sendSolicitationResponse(
		botClient.userId,
		channelId,
		testEncryptionDevice.DeviceKey,
		[]string{
			testSession1,
			testSession2,
		},
		testCiphertexts,
	)

	// Wait for a request for testSession1 keys to succeed with the correct event
	require.EventuallyWithT(func(c *assert.CollectT) {
		req := &connect.Request[protocol.GetSessionRequest]{
			Msg: &protocol.GetSessionRequest{
				AppId:     tester.botWallet.Address[:],
				SessionId: testSession1,
			},
		}
		authenticateBS(tester.ctx, require, tester.authClient, tester.botWallet, req)

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
		deviceCiphertexts, ok := sessions.Ciphertexts[testEncryptionDevice.DeviceKey]
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
			AppId:     tester.Bot().Address[:],
			SessionId: testSession2,
		},
	}
	authenticateBS(tester.ctx, tester.require, tester.authClient, tester.Bot(), req)

	resp, err := tester.appRegistryClient.GetSession(tester.ctx, req)
	tester.require.NoError(err)
	require.NotNil(resp)

	parsedEvent, err := events.ParseEvent(resp.Msg.GroupEncryptionSessions)
	require.NoError(err)

	sessions := parsedEvent.Event.GetUserInboxPayload().GetGroupEncryptionSessions()
	require.NotNil(sessions)
	require.ElementsMatch(sessions.SessionIds, []string{testSession1, testSession2})

	deviceCiphertexts, ok := sessions.Ciphertexts[testEncryptionDevice.DeviceKey]
	require.True(ok, "bot device key is present in ciphertexts map")
	require.Equal(testCiphertexts, deviceCiphertexts)
	require.Equal(channelId[:], sessions.StreamId)

	// Check non-existent session - should result in a NOT_FOUND error.
	req = &connect.Request[protocol.GetSessionRequest]{
		Msg: &protocol.GetSessionRequest{
			AppId:     tester.Bot().Address[:],
			SessionId: "nonexistentSession",
		},
	}
	authenticateBS(tester.ctx, tester.require, tester.authClient, tester.Bot(), req)
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
			AppId:     tester.Bot().Address[:],
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

	tester.StartBotService()
	// Create needed streams and add an encryption device to the user metadata stream for the app service.
	appSharedSecret, _ := tester.RegisterBotService(protocol.ForwardSettingValue_FORWARD_SETTING_ALL_MESSAGES)
	ctx := tester.ctx
	// Uncomment for logging of app registry service
	// ctx = logging.CtxWithLog(ctx, logging.DefaultLogger(zapcore.DebugLevel))

	appServer := tester.appServer
	appWallet := tester.botWallet
	ownerWallet := tester.ownerWallet
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

	tester.StartBotService()
	// Create needed streams and add an encryption device to the user metadata stream for the app service.
	tester.RegisterBotService(protocol.ForwardSettingValue_FORWARD_SETTING_ALL_MESSAGES)

	appServer := tester.appServer
	appWallet := tester.botWallet

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
				appServer.SetFrameworkVersion(tc.expectedFrameworkVersion)
				appServer.SetEncryptionDevice(app_client.EncryptionDevice{
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
			appServer.SetFrameworkVersion(tc.expectedFrameworkVersion + 100)
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

	ownerWallet := tester.ownerWallet
	appWallet := tester.botWallet

	// Create required streams so that the app can be registered.
	// The app requires the user inbox stream to exist for successful registration.
	_ = safeCreateUserStreams(
		t,
		tester.ctx,
		appWallet,
		tester.NodeClient(0, testClientOpts{}).client,
		&testEncryptionDevice,
	)

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

	ownerWallet := tester.ownerWallet
	appWallet := tester.botWallet

	var unregisteredApp common.Address
	_, err := rand.Read(unregisteredApp[:])
	tester.require.NoError(err)
	// Create required streams so that the app can be registered.
	// The app requires the user inbox stream to exist for successful registration.
	safeCreateUserStreams(
		t,
		tester.ctx,
		appWallet,
		tester.NodeClient(0, testClientOpts{}).client,
		&testEncryptionDevice,
	)

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
