package rpc_test

import (
	"bytes"
	"context"
	"crypto/tls"
	"fmt"
	"math/rand"
	"net"
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/river-build/river/core/node/base/test"
	"github.com/river-build/river/core/node/config"
	"github.com/river-build/river/core/node/crypto"
	"github.com/river-build/river/core/node/dlog"
	"github.com/river-build/river/core/node/events"
	"github.com/river-build/river/core/node/infra"
	"github.com/river-build/river/core/node/protocol"
	"github.com/river-build/river/core/node/protocol/protocolconnect"
	"github.com/river-build/river/core/node/rpc"
	"github.com/river-build/river/core/node/shared"
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
	userDeviceKeyStreamIdStr := shared.UserDeviceKeyStreamIdFromAddress(wallet.Address)
	userDeviceKeyStreamId, err := shared.StreamIdFromString(userDeviceKeyStreamIdStr)
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
	userStreamId, err := shared.UserStreamIdFromAddress(wallet.Address)
	if err != nil {
		return nil, nil, err
	}
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
	badId := testutils.StreamIdFromString(shared.STREAM_CHANNEL_PREFIX + "baad1d")
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
	userStreamIdStr, err := shared.UserStreamIdFromAddress(wallet.Address)
	if err != nil {
		return nil, nil, err
	}
	userStreamId := testutils.StreamIdFromString(userStreamIdStr)
	inception, err := events.MakeEnvelopeWithPayload(
		wallet,
		events.Make_UserPayload_Inception(
			userStreamId.String(),
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
	spaceStreamId string,
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
	userId, err := shared.AddressHex(wallet.Address.Bytes())
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
		StreamId: testutils.StreamIdStringToBytes(spaceStreamId),
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
	spaceId string,
	channelStreamId string,
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
	userId, err := shared.AddressHex(wallet.Address.Bytes())
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
		StreamId: testutils.StreamIdStringToBytes(channelStreamId),
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
	t *testing.T,
	ctx context.Context,
	dbUrl string,
	dbSchemaName string,
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
	if err != nil {
		panic(err)
	}
	cfg.RegistryContract = btc.RegistryConfig()

	bc := btc.GetBlockchain(ctx, 0, true)

	// This is a hack to get the port number of the listener
	// so we can register it in the contract before starting
	// the server
	listener, err := net.Listen("tcp", "localhost:0")

	if err != nil {
		panic(err)
	}

	port := listener.Addr().(*net.TCPAddr).Port

	url := fmt.Sprintf("http://localhost:%d", port)

	err = btc.InitNodeRecord(ctx, 0, url)

	if err != nil {
		panic(err)
	}

	service, err := rpc.StartServer(ctx, cfg, bc, listener)
	if err != nil {
		panic(err)
	}

	return testClient(url), url, func() {
		service.Close()
		btc.Close()
	}
}

func TestMethods(t *testing.T) {
	ctx := test.NewTestContext()
	client, _, closer := testServerAndClient(t, ctx, testDatabaseUrl, testSchemaName)
	wallet1, _ := crypto.NewWallet(ctx)
	wallet2, _ := crypto.NewWallet(ctx)

	defer closer()

	response, err := client.Info(ctx, connect.NewRequest(&protocol.InfoRequest{}))
	if err != nil {
		t.Errorf("error calling Info: %v", err)
	}
	require.Equal(t, "River Node welcomes you!", response.Msg.Graffiti)

	_, err = client.CreateStream(ctx, connect.NewRequest(&protocol.CreateStreamRequest{}))
	if err == nil {
		t.Errorf("expected error calling CreateStream with no events")
	}

	_, _, err = createUserWithMismatchedId(ctx, wallet1, client)
	require.Error(t, err) // expected Error when calling CreateStream with mismatched id

	userStreamId, err := shared.UserStreamIdFromAddress(wallet1.Address)
	require.NoError(t, err)

	// if optional is true, stream should be nil instead of throwing an error
	resp, err := client.GetStream(ctx, connect.NewRequest(&protocol.GetStreamRequest{
		StreamId: testutils.StreamIdStringToBytes(userStreamId),
		Optional: true,
	}))
	require.NoError(t, err)
	require.Nil(t, resp.Msg.Stream, "expected user stream to not exist")

	// if optional is false, error should be thrown
	_, err = client.GetStream(ctx, connect.NewRequest(&protocol.GetStreamRequest{
		StreamId: testutils.StreamIdStringToBytes(userStreamId),
	}))
	require.Error(t, err)

	// create user stream for user 1
	res, _, err := createUser(ctx, wallet1, client)
	require.NoError(t, err)
	require.NotNil(t, res, "nil sync cookie")

	_, _, err = createUserDeviceKeyStream(ctx, wallet1, client)
	require.NoError(t, err)

	// get stream optional should now return not nil
	resp, err = client.GetStream(ctx, connect.NewRequest(&protocol.GetStreamRequest{
		StreamId: testutils.StreamIdStringToBytes(userStreamId),
		Optional: true,
	}))
	require.NoError(t, err)
	require.NotNil(t, resp.Msg, "expected user stream to not exist")

	// create user stream for user 2
	resuser, _, err := createUser(ctx, wallet2, client)
	require.NoError(t, err)
	require.NotNil(t, resuser, "nil sync cookie")

	_, _, err = createUserDeviceKeyStream(ctx, wallet2, client)
	require.NoError(t, err)

	// create space
	spaceId := testutils.FakeStreamId(shared.STREAM_SPACE_PREFIX)
	resspace, _, err := createSpace(ctx, wallet1, client, spaceId)
	require.NoError(t, err)
	require.NotNil(t, resspace, "nil sync cookie")

	// create channel
	channelId := testutils.FakeStreamId(shared.STREAM_CHANNEL_PREFIX)
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
	require.NoError(t, err)
	require.NotNil(t, channel, "nil sync cookie")

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
	require.NoError(t, err)

	_, err = client.AddEvent(
		ctx,
		connect.NewRequest(
			&protocol.AddEventRequest{
				StreamId: resuser.StreamId,
				Event:    userJoin,
			},
		),
	)
	require.NoError(t, err)

	_, err = client.Info(ctx, connect.NewRequest(&protocol.InfoRequest{Debug: []string{"make_miniblock", channelId, "false"}}))
	require.NoError(t, err)

	_, err = client.Info(ctx, connect.NewRequest(&protocol.InfoRequest{
		Debug: []string{"make_miniblock", channelId, "false"},
	}))
	require.NoError(t, err)

	message, err := events.MakeEnvelopeWithPayload(
		wallet2,
		events.Make_ChannelPayload_Message("hello"),
		channelHash,
	)
	if err != nil {
		t.Errorf("error creating message event: %v", err)
	}

	_, err = client.AddEvent(
		ctx,
		connect.NewRequest(
			&protocol.AddEventRequest{
				StreamId: testutils.StreamIdStringToBytes(channelId),
				Event:    message,
			},
		),
	)
	require.NoError(t, err)

	_, err = client.Info(ctx, connect.NewRequest(&protocol.InfoRequest{Debug: []string{"make_miniblock", channelId, "false"}}))
	require.NoError(t, err)

	_, err = client.Info(ctx, connect.NewRequest(&protocol.InfoRequest{
		Debug: []string{"make_miniblock", channelId, "false"},
	}))
	require.NoError(t, err)

	_, err = client.GetMiniblocks(ctx, connect.NewRequest(&protocol.GetMiniblocksRequest{
		StreamId:      testutils.StreamIdStringToBytes(channelId),
		FromInclusive: 0,
		ToExclusive:   1,
	}))
	require.NoError(t, err)

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
	require.NoError(t, err)

	syncRes.Receive()
	// verify the first message is new a sync
	syncRes.Receive()
	msg := syncRes.Msg()
	require.NotNil(t, msg.SyncId, "expected non-nil sync id")
	require.True(t, len(msg.SyncId) > 0, "expected non-empty sync id")
	msg = syncRes.Msg()
	syncCancel()

	require.NotNil(t, msg.Stream, "expected non-nil stream")

	// join, miniblock, message, miniblock
	if len(msg.Stream.Events) != 4 {
		t.Errorf("expected 4 events, got %d", len(msg.Stream.Events))
	}

	var payload protocol.StreamEvent
	err = proto.Unmarshal(msg.Stream.Events[len(msg.Stream.Events)-2].Event, &payload)
	if err != nil {
		t.Errorf("error unmarshaling event: %v", err)
	}
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
	ctx := test.NewTestContext()
	client, _, closer := testServerAndClient(t, ctx, testDatabaseUrl, testSchemaName)
	wallet, _ := crypto.NewWallet(ctx)
	deviceWallet, _ := crypto.NewWallet(ctx)
	defer closer()

	resuser, _, err := createUser(ctx, wallet, client)
	require.NoError(t, err)
	if resuser == nil {
		t.Errorf("nil sync cookie")
	}

	_, _, err = createUserDeviceKeyStream(ctx, wallet, client)
	require.NoError(t, err)

	spaceId := testutils.FakeStreamId(shared.STREAM_SPACE_PREFIX)
	space, _, err := createSpace(ctx, wallet, client, spaceId)
	require.NoError(t, err)
	if space == nil {
		t.Errorf("nil sync cookie")
	}

	channelId := testutils.FakeStreamId(shared.STREAM_CHANNEL_PREFIX)
	channel, channelHash, err := createChannel(ctx, wallet, client, spaceId, channelId, nil)
	require.NoError(t, err)
	if channel == nil {
		t.Errorf("nil sync cookie")
	}

	delegateSig, err := makeDelegateSig(wallet, deviceWallet)
	require.NoError(t, err)

	event, err := events.MakeDelegatedStreamEvent(
		wallet,
		events.Make_ChannelPayload_Message(
			"try to send a message without RDK",
		),
		channelHash,
		delegateSig,
	)
	require.NoError(t, err)
	msg, err := events.MakeEnvelopeWithEvent(
		deviceWallet,
		event,
	)
	if err != nil {
		t.Errorf("error creating message event: %v", err)
	}

	_, err = client.AddEvent(
		ctx,
		connect.NewRequest(
			&protocol.AddEventRequest{
				StreamId: testutils.StreamIdStringToBytes(channelId),
				Event:    msg,
			},
		),
	)
	require.NoError(t, err)

	_, err = client.AddEvent(
		ctx,
		connect.NewRequest(
			&protocol.AddEventRequest{
				StreamId: testutils.StreamIdStringToBytes(channelId),
				Event:    msg,
			},
		),
	)
	require.Error(t, err) // expected error when calling AddEvent
}

func TestSyncStreams(t *testing.T) {
	/**
	Arrange
	*/
	// create the test client and server
	ctx := test.NewTestContext()
	client, _, closer := testServerAndClient(t, ctx, testDatabaseUrl, testSchemaName)
	defer closer()
	// create the streams for a user
	wallet, _ := crypto.NewWallet(ctx)
	_, _, err := createUser(ctx, wallet, client)
	require.Nilf(t, err, "error calling createUser: %v", err)
	_, _, err = createUserDeviceKeyStream(ctx, wallet, client)
	require.Nilf(t, err, "error calling createUserDeviceKeyStream: %v", err)
	// create space
	spaceId := testutils.FakeStreamId(shared.STREAM_SPACE_PREFIX)
	space1, _, err := createSpace(ctx, wallet, client, spaceId)
	require.Nilf(t, err, "error calling createSpace: %v", err)
	require.NotNil(t, space1, "nil sync cookie")
	// create channel
	channelId := testutils.FakeStreamId(shared.STREAM_CHANNEL_PREFIX)
	channel1, channelHash, err := createChannel(ctx, wallet, client, spaceId, channelId, nil)
	require.Nilf(t, err, "error calling createChannel: %v", err)
	require.NotNil(t, channel1, "nil sync cookie")

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
	require.Nilf(t, err, "error calling SyncStreams: %v", err)
	// get the syncId for requires later
	syncRes.Receive()
	syncId := syncRes.Msg().SyncId
	// add an event to verify that sync is working
	message, err := events.MakeEnvelopeWithPayload(
		wallet,
		events.Make_ChannelPayload_Message("hello"),
		channelHash,
	)
	require.Nilf(t, err, "error creating message event: %v", err)
	_, err = client.AddEvent(
		ctx,
		connect.NewRequest(
			&protocol.AddEventRequest{
				StreamId: testutils.StreamIdStringToBytes(channelId),
				Event:    message,
			},
		),
	)
	require.Nilf(t, err, "error calling AddEvent: %v", err)
	// wait for the sync
	syncRes.Receive()
	msg := syncRes.Msg()
	// stop the sync loop
	syncCancel()

	/**
	requires
	*/
	require.NotEmpty(t, syncId, "expected non-empty sync id")
	require.NotNil(t, msg.Stream, "expected 1 stream")
	require.Equal(t, syncId, msg.SyncId, "expected sync id to match")
}

func TestAddStreamsToSync(t *testing.T) {
	/**
	Arrange
	*/
	// create the test client and server
	ctx := test.NewTestContext()
	aliceClient, url, closer := testServerAndClient(t, ctx, testDatabaseUrl, testSchemaName)
	defer closer()
	// create alice's wallet and streams
	aliceWallet, _ := crypto.NewWallet(ctx)
	alice, _, err := createUser(ctx, aliceWallet, aliceClient)
	require.Nilf(t, err, "error calling createUser: %v", err)
	require.NotNil(t, alice, "nil sync cookie for alice")
	_, _, err = createUserDeviceKeyStream(ctx, aliceWallet, aliceClient)
	require.Nilf(t, err, "error calling createUserDeviceKeyStream: %v", err)

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
	require.Nilf(t, err, "error calling createUser: %v", err)
	require.NotNil(t, bob, "nil sync cookie for bob")
	_, _, err = createUserDeviceKeyStream(ctx, bobWallet, bobClient)
	require.Nilf(t, err, "error calling createUserDeviceKeyStream: %v", err)
	// alice creates a space
	spaceId := testutils.FakeStreamId(shared.STREAM_SPACE_PREFIX)
	space1, _, err := createSpace(ctx, aliceWallet, aliceClient, spaceId)
	require.Nilf(t, err, "error calling createSpace: %v", err)
	require.NotNil(t, space1, "nil sync cookie")
	// alice creates a channel
	channelId := testutils.FakeStreamId(shared.STREAM_CHANNEL_PREFIX)
	channel1, channelHash, err := createChannel(
		ctx,
		aliceWallet,
		aliceClient,
		spaceId,
		channelId,
		nil,
	)
	require.Nilf(t, err, "error calling createChannel: %v", err)
	require.NotNil(t, channel1, "nil sync cookie")

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
	require.Nilf(t, err, "error calling SyncStreams: %v", err)
	// get the syncId for requires later
	syncRes.Receive()
	syncId := syncRes.Msg().SyncId
	// add an event to verify that sync is working
	message, err := events.MakeEnvelopeWithPayload(
		aliceWallet,
		events.Make_ChannelPayload_Message("hello"),
		channelHash,
	)
	require.Nilf(t, err, "error creating message event: %v", err)
	_, err = aliceClient.AddEvent(
		ctx,
		connect.NewRequest(
			&protocol.AddEventRequest{
				StreamId: testutils.StreamIdStringToBytes(channelId),
				Event:    message,
			},
		),
	)
	require.Nilf(t, err, "error calling AddEvent: %v", err)
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
	require.Nilf(t, err, "error calling AddStreamsToSync: %v", err)
	// wait for the sync
	syncRes.Receive()
	msg := syncRes.Msg()
	// stop the sync loop
	syncCancel()

	/**
	requires
	*/
	require.NotEmpty(t, syncId, "expected non-empty sync id")
	require.NotNil(t, msg.Stream, "expected 1 stream")
	require.Equal(t, syncId, msg.SyncId, "expected sync id to match")
}

func TestRemoveStreamsFromSync(t *testing.T) {
	/**
	Arrange
	*/
	// create the test client and server
	ctx := test.NewTestContext()
	log := dlog.FromCtx(ctx)
	aliceClient, url, closer := testServerAndClient(t, ctx, testDatabaseUrl, testSchemaName)
	defer closer()
	// create alice's wallet and streams
	aliceWallet, _ := crypto.NewWallet(ctx)
	alice, _, err := createUser(ctx, aliceWallet, aliceClient)
	require.Nilf(t, err, "error calling createUser: %v", err)
	require.NotNil(t, alice, "nil sync cookie for alice")
	_, _, err = createUserDeviceKeyStream(ctx, aliceWallet, aliceClient)
	require.NoError(t, err)

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
	require.Nilf(t, err, "error calling createUser: %v", err)
	require.NotNil(t, bob, "nil sync cookie for bob")
	_, _, err = createUserDeviceKeyStream(ctx, bobWallet, bobClient)
	require.Nilf(t, err, "error calling createUserDeviceKeyStream: %v", err)
	// alice creates a space
	spaceId := testutils.FakeStreamId(shared.STREAM_SPACE_PREFIX)
	space1, _, err := createSpace(ctx, aliceWallet, aliceClient, spaceId)
	require.Nilf(t, err, "error calling createSpace: %v", err)
	require.NotNil(t, space1, "nil sync cookie")
	// alice creates a channel
	channelId := testutils.FakeStreamId(shared.STREAM_CHANNEL_PREFIX)
	channel1, channelHash, err := createChannel(ctx, aliceWallet, aliceClient, spaceId, channelId, nil)
	require.Nilf(t, err, "error calling createChannel: %v", err)
	require.NotNil(t, channel1, "nil sync cookie")
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
	require.Nilf(t, err, "error calling SyncStreams: %v", err)
	// get the syncId for requires later
	syncRes.Receive()
	syncId := syncRes.Msg().SyncId

	// add an event to verify that sync is working
	message1, err := events.MakeEnvelopeWithPayload(
		aliceWallet,
		events.Make_ChannelPayload_Message("hello"),
		channelHash,
	)
	require.Nilf(t, err, "error creating message event: %v", err)
	_, err = aliceClient.AddEvent(
		ctx,
		connect.NewRequest(
			&protocol.AddEventRequest{
				StreamId: testutils.StreamIdStringToBytes(channelId),
				Event:    message1,
			},
		),
	)
	require.Nilf(t, err, "error calling AddEvent: %v", err)

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
	require.Nilf(t, err, "error calling AddStreamsToSync: %v", err)
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

	require.Equal(t, 2, receivedCount, "expected 2 events")
	/**
	Act
	*/
	// bob removes alice's stream to sync
	removeRes, err := bobClient.RemoveStreamFromSync(
		ctx,
		connect.NewRequest(
			&protocol.RemoveStreamFromSyncRequest{
				SyncId:   syncId,
				StreamId: testutils.StreamIdStringToBytes(channelId),
			},
		),
	)
	require.Nilf(t, err, "error calling RemoveStreamsFromSync: %v", err)

	// alice sends another message
	message2, err := events.MakeEnvelopeWithPayload(
		aliceWallet,
		events.Make_ChannelPayload_Message("world"),
		channelHash,
	)
	require.Nilf(t, err, "error creating message event: %v", err)
	_, err = aliceClient.AddEvent(
		ctx,
		connect.NewRequest(
			&protocol.AddEventRequest{
				StreamId: testutils.StreamIdStringToBytes(channelId),
				Event:    message2,
			},
		),
	)
	require.Nilf(t, err, "error calling AddEvent: %v", err)

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
	require.NotEmpty(t, syncId, "expected non-empty sync id")
	require.NotNil(t, removeRes.Msg, "expected non-nil remove response")
}

// TODO: revamp with block support
func DisableTestManyUsers(t *testing.T) {
	ctx := test.NewTestContext()
	client, _, closer := testServerAndClient(t, ctx, testDatabaseUrl, testSchemaName)
	defer closer()

	totalUsers := 14
	totalChannels := 10

	wallets := []*crypto.Wallet{}
	for i := 0; i < totalUsers; i++ {
		wallet, _ := crypto.NewWallet(ctx)
		wallets = append(wallets, wallet)

		res, _, err := createUser(ctx, wallet, client)
		require.NoError(t, err)
		if res == nil {
			t.Fatalf("nil sync cookie")
		}
	}

	// create space
	spaceId := testutils.FakeStreamId(shared.STREAM_SPACE_PREFIX)
	resspace, _, err := createSpace(ctx, wallets[0], client, spaceId)
	require.NoError(t, err)
	if resspace == nil {
		t.Fatalf("nil sync cookie")
	}

	// create channels
	var channelHashes [][]byte
	var channels []*protocol.SyncCookie
	for i := 0; i < totalChannels; i++ {
		// TODO: add channel setting instead of channelId
		channel, channelHash, err := createChannel(
			ctx,
			wallets[0],
			client,
			spaceId,
			fmt.Sprintf("channel-%d", i),
			nil,
		)
		require.NoError(t, err)
		if channel == nil {
			t.Fatalf("nil sync cookie")
		}
		channelHashes = append(channelHashes, channelHash)
		channels = append(channels, channel)
	}

	for i := 1; i < totalUsers; i++ {
		// users joins channels
		for j := 0; j < totalChannels; j++ {
			userId, err := shared.AddressHex(wallets[i].Address.Bytes())
			require.NoError(t, err)
			channelId := fmt.Sprintf("channel-%d", j)
			userStreamId, err := shared.UserStreamIdFromId(userId)
			require.NoError(t, err)

			userBlockHash, err := client.GetLastMiniblockHash(ctx, connect.NewRequest(&protocol.GetLastMiniblockHashRequest{
				StreamId: testutils.StreamIdStringToBytes(userStreamId),
			}))
			require.NoError(t, err)

			userJoin, err := events.MakeEnvelopeWithPayload(
				wallets[i],
				events.Make_UserPayload_Membership(
					protocol.MembershipOp_SO_JOIN,
					channelId,
					nil,
				),
				userBlockHash.Msg.Hash,
			)

			require.NoError(t, err)
			_, err = client.AddEvent(ctx, connect.NewRequest(&protocol.AddEventRequest{
				StreamId: testutils.StreamIdStringToBytes(userStreamId),
				Event:    userJoin,
			},
			))
			require.NoError(t, err)

			message, err := events.MakeEnvelopeWithPayload(
				wallets[i],
				events.Make_ChannelPayload_Message("hello"),
				channelHashes[j],
			)
			require.NoError(t, err)

			_, err = client.AddEvent(ctx, connect.NewRequest(&protocol.AddEventRequest{
				StreamId: testutils.StreamIdStringToBytes(fmt.Sprintf("channel-%d", j)),
				Event:    message,
			},
			))
			require.NoError(t, err)
		}
	}

	syncCtx, syncCancel := context.WithCancel(ctx)
	defer syncCancel()
	syncRes, err := client.SyncStreams(syncCtx, connect.NewRequest(&protocol.SyncStreamsRequest{
		SyncPos: channels,
	}))
	require.NoError(t, err)

	streams := make([]*protocol.StreamAndCookie, 0)
	for syncRes.Receive() {
		msg := syncRes.Msg()
		streams = append(streams, msg.Stream)
		if len(streams) == totalChannels {
			syncCancel()
		}
	}

	require.Equal(t, totalChannels, len(streams))

	for i := 0; i < totalChannels; i++ {
		if streams[i] != nil {
			require.Equal(t, len(streams[i].Events), (totalUsers-1)*2)

			for syncPosIdx := range channels {
				if bytes.Equal(channels[syncPosIdx].StreamId, streams[i].NextSyncCookie.StreamId) {
					channels[syncPosIdx] = streams[i].NextSyncCookie
				}
			}
		}
	}

	selectedUsers := 300
	selectedChannels := 3
	waitForMessages := sync.WaitGroup{}
	waitForMessages.Add(selectedUsers * selectedChannels)
	defer waitForMessages.Wait()

	s1 := rand.NewSource(time.Now().UnixNano())
	r1 := rand.New(s1)

	messagesSent := make(chan struct{})

	msgId := atomic.Int32{}
	generateMessages := func() {
		go func() {
			for i := 0; i < selectedUsers; i++ {

				user := r1.Intn(totalUsers)

				for i := 0; i < selectedChannels; i++ {

					channel := r1.Intn(totalChannels)

					message, err := events.MakeEnvelopeWithPayload(
						wallets[user],
						events.Make_ChannelPayload_Message(fmt.Sprintf("%d hello from %d", msgId.Add(1)-1, user)),
						channelHashes[channel],
					)
					require.NoError(t, err)

					_, err = client.AddEvent(ctx, connect.NewRequest(&protocol.AddEventRequest{
						StreamId: testutils.StreamIdStringToBytes(fmt.Sprintf("channel-%d", channel)),
						Event:    message,
					},
					))
					require.NoError(t, err)
					waitForMessages.Done()
				}
			}
			waitForMessages.Wait()
			close(messagesSent)
		}()
	}

	syncCount := make(chan int)

	updateSyncPos := func() {
		msgTable := make([]int, selectedUsers*selectedChannels)

		syncCtx, syncCancel := context.WithCancel(ctx)
		defer syncCancel()

		received := 0
		syncRes, err = client.SyncStreams(syncCtx, connect.NewRequest(&protocol.SyncStreamsRequest{
			SyncPos: channels,
		}))
		require.NoError(t, err)
		for syncRes.Receive() {
			err := syncRes.Err()
			msg := syncRes.Msg()
			require.NoError(t, err)
			if msg.Stream != nil {
				for syncPosStrem := range channels {
					if channels[syncPosStrem] != nil {
						if bytes.Equal(channels[syncPosStrem].StreamId, msg.Stream.NextSyncCookie.StreamId) {
							channels[syncPosStrem] = msg.Stream.NextSyncCookie
						}
					}
				}
				received += len(msg.Stream.Events)
				for _, event := range msg.Stream.Events {
					e, err := events.ParseEvent(event)
					require.NoError(t, err)
					msg := e.GetChannelMessage()
					require.NotNil(t, msg)
					if msg.Message != nil {
						tokens := strings.Split(msg.Message.Ciphertext, " ")
						require.Equal(t, 4, len(tokens))
						id, err := strconv.Atoi(tokens[0])
						require.NoError(t, err)

						msgTable[id]++
						require.Equal(t, 1, msgTable[id])
					}
				}

				if received >= selectedUsers*selectedChannels {
					syncCancel()
				}
			}
		}
		syncCount <- received
	}

	go updateSyncPos()
	go generateMessages()

	rcvMessages := <-syncCount
	fmt.Println("syncCount reached", rcvMessages)
	msg2 := <-messagesSent
	fmt.Println("messagesSent", msg2)

	require.GreaterOrEqual(t, rcvMessages, selectedUsers*selectedChannels)
}
