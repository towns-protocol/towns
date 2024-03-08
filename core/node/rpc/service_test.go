package rpc_test

import (
	"context"
	"crypto/tls"
	"fmt"
	"net"
	"net/http"
	"os"
	"testing"

	"github.com/river-build/river/core/node/base/test"
	"github.com/river-build/river/core/node/config"
	"github.com/river-build/river/core/node/crypto"
	"github.com/river-build/river/core/node/dlog"
	"github.com/river-build/river/core/node/events"
	"github.com/river-build/river/core/node/infra"
	"github.com/river-build/river/core/node/protocol"
	"github.com/river-build/river/core/node/protocol/protocolconnect"
	"github.com/river-build/river/core/node/rpc"
	. "github.com/river-build/river/core/node/shared"
	"github.com/river-build/river/core/node/testutils"
	"github.com/river-build/river/core/node/testutils/dbtestutils"
	"golang.org/x/net/http2"

	"connectrpc.com/connect"
	eth_crypto "github.com/ethereum/go-ethereum/crypto"
	"github.com/stretchr/testify/require"
	"google.golang.org/protobuf/proto"
)

var (
	testDatabaseUrl string
	testSchemaName  string
)

func testMainImpl(m *testing.M) int {
	ctx := test.NewTestContext()
	db, schemaName, closer, err := dbtestutils.StartDB(ctx)
	if err != nil {
		fmt.Printf("Failed to start test database: %v\n", err)
		return 1
	}
	defer closer()
	testDatabaseUrl = db
	testSchemaName = schemaName

	return m.Run()
}

func TestMain(m *testing.M) {
	// Second function allows deferes to run before os.Exit
	os.Exit(testMainImpl(m))
}

func createUserDeviceKeyStream(
	ctx context.Context,
	wallet *crypto.Wallet,
	client protocolconnect.StreamServiceClient,
) (*protocol.SyncCookie, []byte, error) {
	userDeviceKeyStreamIdStr := UserDeviceKeyStreamIdFromAddress(wallet.Address)
	userDeviceKeyStreamId, err := StreamIdFromString(userDeviceKeyStreamIdStr)
	if err != nil {
		return nil, nil, err
	}
	inception, err := events.MakeEnvelopeWithPayload(
		wallet,
		events.Make_UserDeviceKeyPayload_Inception(
			userDeviceKeyStreamId.String(),
			nil,
		),
		nil,
	)
	if err != nil {
		return nil, nil, err
	}
	res, err := client.CreateStream(ctx, connect.NewRequest(&protocol.CreateStreamRequest{
		Events:   []*protocol.Envelope{inception},
		StreamId: userDeviceKeyStreamId.Bytes(),
	}))
	if err != nil {
		return nil, nil, err
	}
	return res.Msg.Stream.NextSyncCookie, inception.Hash, nil
}

func makeDelegateSig(primaryWallet *crypto.Wallet, deviceWallet *crypto.Wallet) ([]byte, error) {
	devicePubKey := eth_crypto.FromECDSAPub(&deviceWallet.PrivateKeyStruct.PublicKey)

	delegatSig, err := primaryWallet.SignHash(crypto.RiverHash(devicePubKey).Bytes())
	return delegatSig, err
}

func createUserWithMismatchedId(
	ctx context.Context,
	wallet *crypto.Wallet,
	client protocolconnect.StreamServiceClient,
) (*protocol.SyncCookie, []byte, error) {
	userStreamId := UserStreamIdFromAddr(wallet.Address)
	inception, err := events.MakeEnvelopeWithPayload(
		wallet,
		events.Make_UserPayload_Inception(
			userStreamId,
			nil,
		),
		nil,
	)
	if err != nil {
		return nil, nil, err
	}
	badId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	res, err := client.CreateStream(ctx, connect.NewRequest(&protocol.CreateStreamRequest{
		Events:   []*protocol.Envelope{inception},
		StreamId: badId.Bytes(),
	}))
	if err != nil {
		return nil, nil, err
	}
	return res.Msg.Stream.NextSyncCookie, inception.Hash, nil
}

func createUser(
	ctx context.Context,
	wallet *crypto.Wallet,
	client protocolconnect.StreamServiceClient,
) (*protocol.SyncCookie, []byte, error) {
	userStreamId := UserStreamIdFromAddr(wallet.Address)
	inception, err := events.MakeEnvelopeWithPayload(
		wallet,
		events.Make_UserPayload_Inception(
			userStreamId,
			nil,
		),
		nil,
	)
	if err != nil {
		return nil, nil, err
	}
	res, err := client.CreateStream(ctx, connect.NewRequest(&protocol.CreateStreamRequest{
		Events:   []*protocol.Envelope{inception},
		StreamId: userStreamId.Bytes(),
	}))
	if err != nil {
		return nil, nil, err
	}
	return res.Msg.Stream.NextSyncCookie, inception.Hash, nil
}

func createSpace(
	ctx context.Context,
	wallet *crypto.Wallet,
	client protocolconnect.StreamServiceClient,
	spaceStreamId StreamId,
) (*protocol.SyncCookie, []byte, error) {
	space, err := events.MakeEnvelopeWithPayload(
		wallet,
		events.Make_SpacePayload_Inception(
			spaceStreamId,
			nil,
		),
		nil,
	)
	if err != nil {
		return nil, nil, err
	}
	userId, err := AddressHex(wallet.Address.Bytes())
	if err != nil {
		return nil, nil, err
	}
	joinSpace, err := events.MakeEnvelopeWithPayload(
		wallet,
		events.Make_SpacePayload_Membership(
			protocol.MembershipOp_SO_JOIN,
			userId,
			userId,
		),
		nil,
	)
	if err != nil {
		return nil, nil, err
	}

	resspace, err := client.CreateStream(ctx, connect.NewRequest(&protocol.CreateStreamRequest{
		Events:   []*protocol.Envelope{space, joinSpace},
		StreamId: spaceStreamId.Bytes(),
	},
	))
	if err != nil {
		return nil, nil, err
	}

	return resspace.Msg.Stream.NextSyncCookie, joinSpace.Hash, nil
}

func createChannel(
	ctx context.Context,
	wallet *crypto.Wallet,
	client protocolconnect.StreamServiceClient,
	spaceId StreamId,
	channelStreamId StreamId,
	streamSettings *protocol.StreamSettings,
) (*protocol.SyncCookie, []byte, error) {
	var channelProperties protocol.EncryptedData
	channelProperties.Ciphertext = "encrypted text supposed to be here"
	channel, err := events.MakeEnvelopeWithPayload(
		wallet,
		events.Make_ChannelPayload_Inception(
			channelStreamId,
			spaceId,
			&channelProperties,
			streamSettings,
		),
		nil,
	)
	if err != nil {
		return nil, nil, err
	}
	userId, err := AddressHex(wallet.Address.Bytes())
	if err != nil {
		return nil, nil, err
	}
	joinChannel, err := events.MakeEnvelopeWithPayload(
		wallet,
		events.Make_ChannelPayload_Membership(
			protocol.MembershipOp_SO_JOIN,
			userId,
			userId,
		),
		nil,
	)
	if err != nil {
		return nil, nil, err
	}
	reschannel, err := client.CreateStream(ctx, connect.NewRequest(&protocol.CreateStreamRequest{
		Events:   []*protocol.Envelope{channel, joinChannel},
		StreamId: channelStreamId.Bytes(),
	},
	))
	if err != nil {
		return nil, nil, err
	}
	if len(reschannel.Msg.Stream.Miniblocks) == 0 {
		return nil, nil, fmt.Errorf("expected at least one miniblock")
	}
	miniblockHash := reschannel.Msg.Stream.Miniblocks[len(reschannel.Msg.Stream.Miniblocks)-1].Header.Hash
	return reschannel.Msg.Stream.NextSyncCookie, miniblockHash, nil
}

func testClient(url string) protocolconnect.StreamServiceClient {
	// Allow insecure TLS connections to HTTP/2 server using HTTP/1.1 and don't validate the certificate
	http.DefaultTransport.(*http.Transport).TLSClientConfig = &tls.Config{InsecureSkipVerify: true}

	httpClient := &http.Client{
		Transport: &http2.Transport{
			// So http2.Transport doesn't complain the URL scheme isn't 'https'
			AllowHTTP: true,
			// Pretend we are dialing a TLS endpoint. (Note, we ignore the passed tls.Config)
			DialTLSContext: func(ctx context.Context, network, addr string, cfg *tls.Config) (net.Conn, error) {
				var d net.Dialer
				return d.DialContext(ctx, network, addr)
			},
		},
	}

	return protocolconnect.NewStreamServiceClient(
		httpClient,
		url)
}

func testServerAndClient(
	ctx context.Context,
	dbUrl string,
	require *require.Assertions,
) (protocolconnect.StreamServiceClient, string, func()) {
	cfg := &config.Config{
		DisableBaseChain: true,
		Database:         config.DatabaseConfig{Url: dbUrl},
		StorageType:      "postgres",
		Stream: config.StreamConfig{
			Media: config.MediaStreamConfig{
				MaxChunkCount: 100,
				MaxChunkSize:  1000000,
			},
			RecencyConstraints: config.RecencyConstraintsConfig{
				AgeSeconds:  11,
				Generations: 5,
			},
		},
	}

	infra.InitLogFromConfig(&cfg.Log)

	btc, err := crypto.NewBlockchainTestContext(ctx, 1)
	require.NoError(err)
	cfg.RegistryContract = btc.RegistryConfig()

	bc := btc.GetBlockchain(ctx, 0, true)

	// This is a hack to get the port number of the listener
	// so we can register it in the contract before starting
	// the server
	listener, err := net.Listen("tcp", "localhost:0")
	require.NoError(err)

	port := listener.Addr().(*net.TCPAddr).Port

	url := fmt.Sprintf("http://localhost:%d", port)

	err = btc.InitNodeRecord(ctx, 0, url)
	require.NoError(err)

	service, err := rpc.StartServer(ctx, cfg, bc, listener)
	require.NoError(err)

	return testClient(url), url, func() {
		service.Close()
		btc.Close()
	}
}

func TestMethods(t *testing.T) {
	require := require.New(t)
	ctx := test.NewTestContext()
	client, _, closer := testServerAndClient(ctx, testDatabaseUrl, require)
	defer closer()

	wallet1, _ := crypto.NewWallet(ctx)
	wallet2, _ := crypto.NewWallet(ctx)

	response, err := client.Info(ctx, connect.NewRequest(&protocol.InfoRequest{}))
	require.NoError(err)
	require.Equal("River Node welcomes you!", response.Msg.Graffiti)

	_, err = client.CreateStream(ctx, connect.NewRequest(&protocol.CreateStreamRequest{}))
	require.Error(err)

	_, _, err = createUserWithMismatchedId(ctx, wallet1, client)
	require.Error(err) // expected Error when calling CreateStream with mismatched id

	userStreamId := UserStreamIdFromAddr(wallet1.Address)

	// if optional is true, stream should be nil instead of throwing an error
	resp, err := client.GetStream(ctx, connect.NewRequest(&protocol.GetStreamRequest{
		StreamId: userStreamId.Bytes(),
		Optional: true,
	}))
	require.NoError(err)
	require.Nil(resp.Msg.Stream, "expected user stream to not exist")

	// if optional is false, error should be thrown
	_, err = client.GetStream(ctx, connect.NewRequest(&protocol.GetStreamRequest{
		StreamId: userStreamId.Bytes(),
	}))
	require.Error(err)

	// create user stream for user 1
	res, _, err := createUser(ctx, wallet1, client)
	require.NoError(err)
	require.NotNil(res, "nil sync cookie")

	_, _, err = createUserDeviceKeyStream(ctx, wallet1, client)
	require.NoError(err)

	// get stream optional should now return not nil
	resp, err = client.GetStream(ctx, connect.NewRequest(&protocol.GetStreamRequest{
		StreamId: userStreamId.Bytes(),
		Optional: true,
	}))
	require.NoError(err)
	require.NotNil(resp.Msg, "expected user stream to not exist")

	// create user stream for user 2
	resuser, _, err := createUser(ctx, wallet2, client)
	require.NoError(err)
	require.NotNil(resuser, "nil sync cookie")

	_, _, err = createUserDeviceKeyStream(ctx, wallet2, client)
	require.NoError(err)

	// create space
	spaceId := testutils.FakeStreamId(STREAM_SPACE_BIN)
	resspace, _, err := createSpace(ctx, wallet1, client, spaceId)
	require.NoError(err)
	require.NotNil(resspace, "nil sync cookie")

	// create channel
	channelId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	channel, channelHash, err := createChannel(
		ctx,
		wallet1,
		client,
		spaceId,
		channelId,
		&protocol.StreamSettings{
			DisableMiniblockCreation: true,
		},
	)
	require.NoError(err)
	require.NotNil(channel, "nil sync cookie")

	// user2 joins channel
	userJoin, err := events.MakeEnvelopeWithPayload(
		wallet2,
		events.Make_UserPayload_Membership(
			protocol.MembershipOp_SO_JOIN,
			channelId,
			nil,
		),
		resuser.PrevMiniblockHash,
	)
	require.NoError(err)

	_, err = client.AddEvent(
		ctx,
		connect.NewRequest(
			&protocol.AddEventRequest{
				StreamId: resuser.StreamId,
				Event:    userJoin,
			},
		),
	)
	require.NoError(err)

	_, err = client.Info(ctx, connect.NewRequest(&protocol.InfoRequest{Debug: []string{"make_miniblock", channelId.String(), "false"}}))
	require.NoError(err)

	_, err = client.Info(ctx, connect.NewRequest(&protocol.InfoRequest{
		Debug: []string{"make_miniblock", channelId.String(), "false"},
	}))
	require.NoError(err)

	message, err := events.MakeEnvelopeWithPayload(
		wallet2,
		events.Make_ChannelPayload_Message("hello"),
		channelHash,
	)
	require.NoError(err)

	_, err = client.AddEvent(
		ctx,
		connect.NewRequest(
			&protocol.AddEventRequest{
				StreamId: channelId.Bytes(),
				Event:    message,
			},
		),
	)
	require.NoError(err)

	_, err = client.Info(ctx, connect.NewRequest(&protocol.InfoRequest{Debug: []string{"make_miniblock", channelId.String(), "false"}}))
	require.NoError(err)

	_, err = client.Info(ctx, connect.NewRequest(&protocol.InfoRequest{
		Debug: []string{"make_miniblock", channelId.String(), "false"},
	}))
	require.NoError(err)

	_, err = client.GetMiniblocks(ctx, connect.NewRequest(&protocol.GetMiniblocksRequest{
		StreamId:      channelId.Bytes(),
		FromInclusive: 0,
		ToExclusive:   1,
	}))
	require.NoError(err)

	syncCtx, syncCancel := context.WithCancel(ctx)
	syncRes, err := client.SyncStreams(
		syncCtx,
		connect.NewRequest(
			&protocol.SyncStreamsRequest{
				SyncPos: []*protocol.SyncCookie{
					channel,
				},
			},
		),
	)
	require.NoError(err)

	syncRes.Receive()
	// verify the first message is new a sync
	syncRes.Receive()
	msg := syncRes.Msg()
	require.NotNil(msg.SyncId, "expected non-nil sync id")
	require.True(len(msg.SyncId) > 0, "expected non-empty sync id")
	msg = syncRes.Msg()
	syncCancel()

	require.NotNil(msg.Stream, "expected non-nil stream")

	// join, miniblock, message, miniblock
	require.Equal(4, len(msg.Stream.Events), "expected 4 events")

	var payload protocol.StreamEvent
	err = proto.Unmarshal(msg.Stream.Events[len(msg.Stream.Events)-2].Event, &payload)
	require.NoError(err)
	switch p := payload.Payload.(type) {
	case *protocol.StreamEvent_ChannelPayload:
		// ok
		switch p.ChannelPayload.Content.(type) {
		case *protocol.ChannelPayload_Message:
			// ok
		default:
			t.Fatalf("expected message event, got %v", p.ChannelPayload.Content)
		}
	default:
		t.Fatalf("expected channel event, got %v", payload.Payload)
	}
}

func TestRiverDeviceId(t *testing.T) {
	require := require.New(t)
	ctx := test.NewTestContext()
	client, _, closer := testServerAndClient(ctx, testDatabaseUrl, require)
	defer closer()

	wallet, _ := crypto.NewWallet(ctx)
	deviceWallet, _ := crypto.NewWallet(ctx)

	resuser, _, err := createUser(ctx, wallet, client)
	require.NoError(err)
	require.NotNil(resuser)

	_, _, err = createUserDeviceKeyStream(ctx, wallet, client)
	require.NoError(err)

	spaceId := testutils.FakeStreamId(STREAM_SPACE_BIN)
	space, _, err := createSpace(ctx, wallet, client, spaceId)
	require.NoError(err)
	require.NotNil(space)

	channelId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	channel, channelHash, err := createChannel(ctx, wallet, client, spaceId, channelId, nil)
	require.NoError(err)
	require.NotNil(channel)

	delegateSig, err := makeDelegateSig(wallet, deviceWallet)
	require.NoError(err)

	event, err := events.MakeDelegatedStreamEvent(
		wallet,
		events.Make_ChannelPayload_Message(
			"try to send a message without RDK",
		),
		channelHash,
		delegateSig,
	)
	require.NoError(err)
	msg, err := events.MakeEnvelopeWithEvent(
		deviceWallet,
		event,
	)
	require.NoError(err)

	_, err = client.AddEvent(
		ctx,
		connect.NewRequest(
			&protocol.AddEventRequest{
				StreamId: channelId.Bytes(),
				Event:    msg,
			},
		),
	)
	require.NoError(err)

	_, err = client.AddEvent(
		ctx,
		connect.NewRequest(
			&protocol.AddEventRequest{
				StreamId: channelId.Bytes(),
				Event:    msg,
			},
		),
	)
	require.Error(err) // expected error when calling AddEvent
}

func TestSyncStreams(t *testing.T) {
	require := require.New(t)
	/**
	Arrange
	*/
	// create the test client and server
	ctx := test.NewTestContext()
	client, _, closer := testServerAndClient(ctx, testDatabaseUrl, require)
	defer closer()


	// create the streams for a user
	wallet, _ := crypto.NewWallet(ctx)
	_, _, err := createUser(ctx, wallet, client)
	require.Nilf(err, "error calling createUser: %v", err)
	_, _, err = createUserDeviceKeyStream(ctx, wallet, client)
	require.Nilf(err, "error calling createUserDeviceKeyStream: %v", err)
	// create space
	spaceId := testutils.FakeStreamId(STREAM_SPACE_BIN)
	space1, _, err := createSpace(ctx, wallet, client, spaceId)
	require.Nilf(err, "error calling createSpace: %v", err)
	require.NotNil(space1, "nil sync cookie")
	// create channel
	channelId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	channel1, channelHash, err := createChannel(ctx, wallet, client, spaceId, channelId, nil)
	require.Nilf(err, "error calling createChannel: %v", err)
	require.NotNil(channel1, "nil sync cookie")

	/**
	Act
	*/
	// sync streams
	syncCtx, syncCancel := context.WithCancel(ctx)
	syncRes, err := client.SyncStreams(
		syncCtx,
		connect.NewRequest(
			&protocol.SyncStreamsRequest{
				SyncPos: []*protocol.SyncCookie{
					channel1,
				},
			},
		),
	)
	require.Nilf(err, "error calling SyncStreams: %v", err)
	// get the syncId for requires later
	syncRes.Receive()
	syncId := syncRes.Msg().SyncId
	// add an event to verify that sync is working
	message, err := events.MakeEnvelopeWithPayload(
		wallet,
		events.Make_ChannelPayload_Message("hello"),
		channelHash,
	)
	require.Nilf(err, "error creating message event: %v", err)
	_, err = client.AddEvent(
		ctx,
		connect.NewRequest(
			&protocol.AddEventRequest{
				StreamId: channelId.Bytes(),
				Event:    message,
			},
		),
	)
	require.Nilf(err, "error calling AddEvent: %v", err)
	// wait for the sync
	syncRes.Receive()
	msg := syncRes.Msg()
	// stop the sync loop
	syncCancel()

	/**
	requires
	*/
	require.NotEmpty(syncId, "expected non-empty sync id")
	require.NotNil(msg.Stream, "expected 1 stream")
	require.Equal(syncId, msg.SyncId, "expected sync id to match")
}

func TestAddStreamsToSync(t *testing.T) {
	require := require.New(t)
	/**
	Arrange
	*/
	// create the test client and server
	ctx := test.NewTestContext()
	aliceClient, url, closer := testServerAndClient(ctx, testDatabaseUrl, require)
	defer closer()


	// create alice's wallet and streams
	aliceWallet, _ := crypto.NewWallet(ctx)
	alice, _, err := createUser(ctx, aliceWallet, aliceClient)
	require.Nilf(err, "error calling createUser: %v", err)
	require.NotNil(alice, "nil sync cookie for alice")
	_, _, err = createUserDeviceKeyStream(ctx, aliceWallet, aliceClient)
	require.Nilf(err, "error calling createUserDeviceKeyStream: %v", err)

	httpClient := &http.Client{
		Transport: &http2.Transport{
			// So http2.Transport doesn't complain the URL scheme isn't 'https'
			AllowHTTP: true,
			// Pretend we are dialing a TLS endpoint. (Note, we ignore the passed tls.Config)
			DialTLSContext: func(ctx context.Context, network, addr string, cfg *tls.Config) (net.Conn, error) {
				var d net.Dialer
				return d.DialContext(ctx, network, addr)
			},
		},
	}

	// create bob's client, wallet, and streams
	bobClient := protocolconnect.NewStreamServiceClient(
		httpClient,
		url,
	)
	bobWallet, _ := crypto.NewWallet(ctx)
	bob, _, err := createUser(ctx, bobWallet, bobClient)
	require.Nilf(err, "error calling createUser: %v", err)
	require.NotNil(bob, "nil sync cookie for bob")
	_, _, err = createUserDeviceKeyStream(ctx, bobWallet, bobClient)
	require.Nilf(err, "error calling createUserDeviceKeyStream: %v", err)
	// alice creates a space
	spaceId := testutils.FakeStreamId(STREAM_SPACE_BIN)
	space1, _, err := createSpace(ctx, aliceWallet, aliceClient, spaceId)
	require.Nilf(err, "error calling createSpace: %v", err)
	require.NotNil(space1, "nil sync cookie")
	// alice creates a channel
	channelId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	channel1, channelHash, err := createChannel(
		ctx,
		aliceWallet,
		aliceClient,
		spaceId,
		channelId,
		nil,
	)
	require.Nilf(err, "error calling createChannel: %v", err)
	require.NotNil(channel1, "nil sync cookie")

	/**
	Act
	*/
	// bob sync streams
	syncCtx, syncCancel := context.WithCancel(ctx)
	syncRes, err := bobClient.SyncStreams(
		syncCtx,
		connect.NewRequest(
			&protocol.SyncStreamsRequest{
				SyncPos: []*protocol.SyncCookie{},
			},
		),
	)
	require.Nilf(err, "error calling SyncStreams: %v", err)
	// get the syncId for requires later
	syncRes.Receive()
	syncId := syncRes.Msg().SyncId
	// add an event to verify that sync is working
	message, err := events.MakeEnvelopeWithPayload(
		aliceWallet,
		events.Make_ChannelPayload_Message("hello"),
		channelHash,
	)
	require.Nilf(err, "error creating message event: %v", err)
	_, err = aliceClient.AddEvent(
		ctx,
		connect.NewRequest(
			&protocol.AddEventRequest{
				StreamId: channelId.Bytes(),
				Event:    message,
			},
		),
	)
	require.Nilf(err, "error calling AddEvent: %v", err)
	// bob adds alice's stream to sync
	_, err = bobClient.AddStreamToSync(
		ctx,
		connect.NewRequest(
			&protocol.AddStreamToSyncRequest{
				SyncId:  syncId,
				SyncPos: channel1,
			},
		),
	)
	require.Nilf(err, "error calling AddStreamsToSync: %v", err)
	// wait for the sync
	syncRes.Receive()
	msg := syncRes.Msg()
	// stop the sync loop
	syncCancel()

	/**
	requires
	*/
	require.NotEmpty(syncId, "expected non-empty sync id")
	require.NotNil(msg.Stream, "expected 1 stream")
	require.Equal(syncId, msg.SyncId, "expected sync id to match")
}

func TestRemoveStreamsFromSync(t *testing.T) {
	require := require.New(t)
	/**
	Arrange
	*/
	// create the test client and server
	ctx := test.NewTestContext()
	log := dlog.FromCtx(ctx)
	aliceClient, url, closer := testServerAndClient(ctx, testDatabaseUrl, require)
	defer closer()


	// create alice's wallet and streams
	aliceWallet, _ := crypto.NewWallet(ctx)
	alice, _, err := createUser(ctx, aliceWallet, aliceClient)
	require.Nilf(err, "error calling createUser: %v", err)
	require.NotNil(alice, "nil sync cookie for alice")
	_, _, err = createUserDeviceKeyStream(ctx, aliceWallet, aliceClient)
	require.NoError(err)

	httpClient := &http.Client{
		Transport: &http2.Transport{
			// So http2.Transport doesn't complain the URL scheme isn't 'https'
			AllowHTTP: true,
			// Pretend we are dialing a TLS endpoint. (Note, we ignore the passed tls.Config)
			DialTLSContext: func(ctx context.Context, network, addr string, cfg *tls.Config) (net.Conn, error) {
				var d net.Dialer
				return d.DialContext(ctx, network, addr)
			},
		},
	}

	// create bob's client, wallet, and streams
	bobClient := protocolconnect.NewStreamServiceClient(
		httpClient,
		url,
	)
	bobWallet, _ := crypto.NewWallet(ctx)
	bob, _, err := createUser(ctx, bobWallet, bobClient)
	require.Nilf(err, "error calling createUser: %v", err)
	require.NotNil(bob, "nil sync cookie for bob")
	_, _, err = createUserDeviceKeyStream(ctx, bobWallet, bobClient)
	require.Nilf(err, "error calling createUserDeviceKeyStream: %v", err)
	// alice creates a space
	spaceId := testutils.FakeStreamId(STREAM_SPACE_BIN)
	space1, _, err := createSpace(ctx, aliceWallet, aliceClient, spaceId)
	require.Nilf(err, "error calling createSpace: %v", err)
	require.NotNil(space1, "nil sync cookie")
	// alice creates a channel
	channelId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	channel1, channelHash, err := createChannel(ctx, aliceWallet, aliceClient, spaceId, channelId, nil)
	require.Nilf(err, "error calling createChannel: %v", err)
	require.NotNil(channel1, "nil sync cookie")
	// bob sync streams
	syncCtx, syncCancel := context.WithCancel(ctx)
	syncRes, err := bobClient.SyncStreams(
		syncCtx,
		connect.NewRequest(
			&protocol.SyncStreamsRequest{
				SyncPos: []*protocol.SyncCookie{},
			},
		),
	)
	require.Nilf(err, "error calling SyncStreams: %v", err)
	// get the syncId for requires later
	syncRes.Receive()
	syncId := syncRes.Msg().SyncId

	// add an event to verify that sync is working
	message1, err := events.MakeEnvelopeWithPayload(
		aliceWallet,
		events.Make_ChannelPayload_Message("hello"),
		channelHash,
	)
	require.Nilf(err, "error creating message event: %v", err)
	_, err = aliceClient.AddEvent(
		ctx,
		connect.NewRequest(
			&protocol.AddEventRequest{
				StreamId: channelId.Bytes(),
				Event:    message1,
			},
		),
	)
	require.Nilf(err, "error calling AddEvent: %v", err)

	// bob adds alice's stream to sync
	resp, err := bobClient.AddStreamToSync(
		ctx,
		connect.NewRequest(
			&protocol.AddStreamToSyncRequest{
				SyncId:  syncId,
				SyncPos: channel1,
			},
		),
	)
	require.Nilf(err, "error calling AddStreamsToSync: %v", err)
	log.Info("AddStreamToSync", "resp", resp)
	// When AddEvent is called, node calls streamImpl.notifyToSubscribers() twice
	// for different events. 	See hnt-3683 for explanation. First event is for
	// the externally added event (by AddEvent). Second event is the miniblock
	// event with headers.
	// drain the events
	receivedCount := 0
OuterLoop:
	for syncRes.Receive() {
		update := syncRes.Msg()
		log.Info("received update", "update", update)
		if update.Stream != nil {
			sEvents := update.Stream.Events
			for _, envelope := range sEvents {
				receivedCount++
				parsedEvent, _ := events.ParseEvent(envelope)
				log.Info("received update inner loop", "envelope", parsedEvent)
				if parsedEvent != nil && parsedEvent.Event.GetMiniblockHeader() != nil {
					break OuterLoop
				}
			}
		}
	}

	require.Equal(2, receivedCount, "expected 2 events")
	/**
	Act
	*/
	// bob removes alice's stream to sync
	removeRes, err := bobClient.RemoveStreamFromSync(
		ctx,
		connect.NewRequest(
			&protocol.RemoveStreamFromSyncRequest{
				SyncId:   syncId,
				StreamId: channelId.Bytes(),
			},
		),
	)
	require.Nilf(err, "error calling RemoveStreamsFromSync: %v", err)

	// alice sends another message
	message2, err := events.MakeEnvelopeWithPayload(
		aliceWallet,
		events.Make_ChannelPayload_Message("world"),
		channelHash,
	)
	require.Nilf(err, "error creating message event: %v", err)
	_, err = aliceClient.AddEvent(
		ctx,
		connect.NewRequest(
			&protocol.AddEventRequest{
				StreamId: channelId.Bytes(),
				Event:    message2,
			},
		),
	)
	require.Nilf(err, "error calling AddEvent: %v", err)

	/**
	For debugging only. Uncomment to see syncRes.Receive() block.
	bobClient's syncRes no longer receives the latest events from alice.

	// wait to see if we got a message. We shouldn't.
	// uncomment: syncRes.Receive()
	*/
	syncCancel()

	/**
	requires
	*/
	require.NotEmpty(syncId, "expected non-empty sync id")
	require.NotNil(removeRes.Msg, "expected non-nil remove response")
}
