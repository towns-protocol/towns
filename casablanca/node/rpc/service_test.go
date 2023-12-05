package rpc_test

import (
	"context"
	"fmt"
	"math/rand"
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"casablanca/node/common"
	"casablanca/node/config"
	"casablanca/node/crypto"
	"casablanca/node/events"
	"casablanca/node/infra"
	"casablanca/node/protocol"
	"casablanca/node/protocol/protocolconnect"
	"casablanca/node/rpc"
	"casablanca/node/testutils"
	"casablanca/node/testutils/dbtestutils"

	"github.com/bufbuild/connect-go"
	eth_crypto "github.com/ethereum/go-ethereum/crypto"
	"github.com/stretchr/testify/assert"
	"google.golang.org/protobuf/proto"
)

var testDatabaseUrl string
var testSchemaName string

func TestMain(m *testing.M) {

	db, schemaName, closer, err := dbtestutils.StartDB(context.Background())
	if err != nil {
		panic(err)
	}
	defer closer()
	testDatabaseUrl = db
	testSchemaName = schemaName

	//Run tests
	code := m.Run()

	os.Exit(code)
}

func createUserDeviceKeyStream(ctx context.Context, wallet *crypto.Wallet, client protocolconnect.StreamServiceClient) (*protocol.SyncCookie, []byte, error) {
	userId, err := common.AddressHex(wallet.Address.Bytes())
	if err != nil {
		return nil, nil, err
	}
	userDeviceKeyStreamId, err := common.UserDeviceKeyStreamIdFromId(userId)
	if err != nil {
		return nil, nil, err
	}
	inception, err := events.MakeEnvelopeWithPayload(
		wallet,
		events.Make_UserDeviceKeyPayload_Inception(
			userDeviceKeyStreamId,
			userId,
			nil,
		),
		nil,
	)
	if err != nil {
		return nil, nil, err
	}
	res, err := client.CreateStream(ctx, connect.NewRequest(&protocol.CreateStreamRequest{
		Events:   []*protocol.Envelope{inception},
		StreamId: userDeviceKeyStreamId,
	}))
	if err != nil {
		return nil, nil, err
	}
	return res.Msg.Stream.NextSyncCookie, inception.Hash, nil
}

func makeDelegateSig(primaryWallet *crypto.Wallet, deviceWallet *crypto.Wallet) ([]byte, error) {
	devicePubKey := eth_crypto.FromECDSAPub(&deviceWallet.PrivateKeyStruct.PublicKey)

	delegatSig, err := primaryWallet.SignHash(crypto.TownsHash(devicePubKey))
	return delegatSig, err
}

func createUserWithMismatchedId(ctx context.Context, wallet *crypto.Wallet, client protocolconnect.StreamServiceClient) (*protocol.SyncCookie, []byte, error) {

	userStreamId, err := common.UserStreamIdFromAddress(wallet.Address.Bytes())
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
	res, err := client.CreateStream(ctx, connect.NewRequest(&protocol.CreateStreamRequest{
		Events:   []*protocol.Envelope{inception},
		StreamId: "BAD_ID",
	}))
	if err != nil {
		return nil, nil, err
	}
	return res.Msg.Stream.NextSyncCookie, inception.Hash, nil
}

func createUser(ctx context.Context, wallet *crypto.Wallet, client protocolconnect.StreamServiceClient) (*protocol.SyncCookie, []byte, error) {

	userStreamId, err := common.UserStreamIdFromAddress(wallet.Address.Bytes())
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
	res, err := client.CreateStream(ctx, connect.NewRequest(&protocol.CreateStreamRequest{
		Events:   []*protocol.Envelope{inception},
		StreamId: userStreamId,
	}))
	if err != nil {
		return nil, nil, err
	}
	return res.Msg.Stream.NextSyncCookie, inception.Hash, nil
}

func createSpace(ctx context.Context, wallet *crypto.Wallet, client protocolconnect.StreamServiceClient, spaceId string) (*protocol.SyncCookie, []byte, error) {
	spaceStreamId := common.SpaceStreamIdFromName(spaceId)
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
	userId, err := common.AddressHex(wallet.Address.Bytes())
	if err != nil {
		return nil, nil, err
	}
	joinSpace, err := events.MakeEnvelopeWithPayload(
		wallet,
		events.Make_SpacePayload_Membership(
			protocol.MembershipOp_SO_JOIN,
			userId,
		),
		nil,
	)
	if err != nil {
		return nil, nil, err
	}

	resspace, err := client.CreateStream(ctx, connect.NewRequest(&protocol.CreateStreamRequest{
		Events:   []*protocol.Envelope{space, joinSpace},
		StreamId: spaceStreamId,
	},
	))
	if err != nil {
		return nil, nil, err
	}

	return resspace.Msg.Stream.NextSyncCookie, joinSpace.Hash, nil
}

func createChannel(ctx context.Context, wallet *crypto.Wallet, client protocolconnect.StreamServiceClient, spaceId string, channelId string, streamSettings *protocol.StreamSettings) (*protocol.SyncCookie, []byte, error) {
	var channelProperties protocol.EncryptedData
	channelProperties.Ciphertext = "encrypted text supposed to be here"
	channelStreamId := common.ChannelStreamIdFromName(channelId)
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
	userId, err := common.AddressHex(wallet.Address.Bytes())
	if err != nil {
		return nil, nil, err
	}
	joinChannel, err := events.MakeEnvelopeWithPayload(
		wallet,
		events.Make_ChannelPayload_Membership(
			protocol.MembershipOp_SO_JOIN,
			userId,
		),
		nil,
	)
	if err != nil {
		return nil, nil, err
	}
	reschannel, err := client.CreateStream(ctx, connect.NewRequest(&protocol.CreateStreamRequest{
		Events:   []*protocol.Envelope{channel, joinChannel},
		StreamId: channelStreamId,
	},
	))
	if err != nil {
		return nil, nil, err
	}
	if len(reschannel.Msg.Miniblocks) == 0 {
		return nil, nil, fmt.Errorf("expected at least one miniblock")
	}
	miniblockHash := reschannel.Msg.Miniblocks[len(reschannel.Msg.Miniblocks)-1].Header.Hash
	return reschannel.Msg.Stream.NextSyncCookie, miniblockHash, nil
}

func testServerAndClient(
	ctx context.Context,
	dbUrl string,
	dbSchemaName string,
	useContract bool,
	syncVersion int,
) (client protocolconnect.StreamServiceClient, port int, closer func()) {
	cfg := &config.Config{
		UseContract: useContract,
		BaseChain: config.ChainConfig{
			ChainId:    infra.CHAIN_ID_LOCALHOST,
			NetworkUrl: "http://localhost:8545",
		},
		RiverChain: config.ChainConfig{
			ChainId:    infra.CHAIN_ID_LOCALHOST,
			NetworkUrl: "http://localhost:8545",
		},
		Address:     "localhost",
		Port:        1234,
		Database:    config.DatabaseConfig{Url: dbUrl},
		StorageType: "postgres",
		SyncVersion: syncVersion,
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

	wallet, err := crypto.NewWallet(ctx)
	if err != nil {
		panic(err)
	}

	if useContract {
		err = testutils.FundWallet(ctx, wallet.Address, cfg.RiverChain.NetworkUrl)
		if err != nil {
			panic(err)
		}
	}

	closer, port, _, err = rpc.StartServer(ctx, cfg, wallet)
	if err != nil {
		panic(err)
	}

	client = protocolconnect.NewStreamServiceClient(
		http.DefaultClient,
		fmt.Sprintf("http://localhost:%d", port),
	)

	return client, port, closer
}

func TestMethods(t *testing.T) {
	ctx := context.Background()
	client, _, closer := testServerAndClient(ctx, testDatabaseUrl, testSchemaName, false, 0)
	wallet1, _ := crypto.NewWallet(ctx)
	wallet2, _ := crypto.NewWallet(ctx)
	defer closer()
	{
		response, err := client.Info(ctx, connect.NewRequest(&protocol.InfoRequest{}))
		if err != nil {
			t.Errorf("error calling Info: %v", err)
		}
		assert.Equal(t, "Towns.com node welcomes you!", response.Msg.Graffiti)
	}
	{
		_, err := client.CreateStream(ctx, connect.NewRequest(&protocol.CreateStreamRequest{}))
		if err == nil {
			t.Errorf("expected error calling CreateStream with no events")
		}

		_, _, err = createUserDeviceKeyStream(ctx, wallet1, client)
		if err != nil {
			t.Fatalf("error calling CreateStream: %v", err)
		}

		_, _, err = createUserWithMismatchedId(ctx, wallet1, client)
		if err == nil {
			t.Fatalf("expected Error when calling CreateStream with mismatched id")
		}

		// create user stream for user 1
		res, _, err := createUser(ctx, wallet1, client)
		if err != nil {
			t.Fatalf("error calling CreateStream: %v", err)
		}
		if res == nil {
			t.Errorf("nil sync cookie")
		}

		_, _, err = createUserDeviceKeyStream(ctx, wallet2, client)
		if err != nil {
			t.Fatalf("error calling CreateStream: %v", err)
		}

		// create user stream for user 2
		resuser, _, err := createUser(ctx, wallet2, client)
		if err != nil {
			t.Fatalf("error calling CreateStream: %v", err)
		}
		if resuser == nil {
			t.Errorf("nil sync cookie")
		}

		// create space
		resspace, _, err := createSpace(ctx, wallet1, client, "test")
		if err != nil {
			t.Fatalf("error calling CreateStream: %v", err)
		}
		if resspace == nil {
			t.Errorf("nil sync cookie")
		}

		// create channel
		//TODO: add channel setting instead of "channel1"
		channel, channelHash, err := createChannel(
			ctx,
			wallet1,
			client,
			common.SpaceStreamIdFromName("test"),
			"channel1",
			&protocol.StreamSettings{MinEventsPerSnapshot: int32(200), MiniblockTimeMs: 1}, // custom miniblock timing
		)
		if err != nil {
			t.Fatalf("error calling CreateStream: %v", err)
		}
		if channel == nil {
			t.Errorf("nil sync cookie")
		}

		// user2 joins channel
		userId, err := common.AddressHex(wallet2.Address.Bytes())
		if err != nil {
			t.Errorf("error getting user id: %v", err)
		}
		join, err := events.MakeEnvelopeWithPayload(
			wallet2,
			events.Make_ChannelPayload_Membership(
				protocol.MembershipOp_SO_JOIN,
				userId,
			),
			channelHash,
		)
		if err != nil {
			t.Errorf("error creating join event: %v", err)
		}
		_, err = client.AddEvent(
			ctx,
			connect.NewRequest(
				&protocol.AddEventRequest{
					StreamId: common.ChannelStreamIdFromName("channel1"),
					Event:    join,
				},
			),
		)
		if err != nil {
			t.Fatalf("error calling AddEvent: %v", err)
		}

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
					StreamId: common.ChannelStreamIdFromName("channel1"),
					Event:    message,
				},
			),
		)
		if err != nil {
			t.Fatalf("error calling AddEvent: %v", err)
		}

		_, err = client.GetMiniblocks(ctx, connect.NewRequest(&protocol.GetMiniblocksRequest{
			StreamId:      common.ChannelStreamIdFromName("channel1"),
			FromInclusive: 0,
			ToExclusive:   1,
		}))

		if err != nil {
			t.Fatalf("error calling GetMiniblocks: %v", err)
		}

		syncCtx, syncCancel := context.WithCancel(context.Background())
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
		if err != nil {
			t.Fatalf("error calling SyncStreams: %v", err)
		}

		syncRes.Receive()
		msg := syncRes.Msg()
		syncCancel()

		if msg.Stream == nil {
			t.Errorf("expected a stream")
		}
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
}

func TestRiverDeviceId(t *testing.T) {
	ctx := context.Background()
	client, _, closer := testServerAndClient(ctx, testDatabaseUrl, testSchemaName, false, 0)
	wallet, _ := crypto.NewWallet(ctx)
	deviceWallet, _ := crypto.NewWallet(ctx)
	defer closer()
	{
		resuser, _, err := createUser(ctx, wallet, client)
		if err != nil {
			t.Fatalf("error calling CreateStream: %v", err)
		}
		if resuser == nil {
			t.Errorf("nil sync cookie")
		}

		_, _, err = createUserDeviceKeyStream(ctx, wallet, client)
		if err != nil {
			t.Fatalf("error calling CreateStream: %v", err)
		}

		space, _, err := createSpace(ctx, wallet, client, "test")
		if err != nil {
			t.Fatalf("error calling CreateStream: %v", err)
		}
		if space == nil {
			t.Errorf("nil sync cookie")
		}

		channel, channelHash, err := createChannel(ctx, wallet, client, common.SpaceStreamIdFromName("test"), "channel1", nil)
		if err != nil {
			t.Fatalf("error calling CreateStream: %v", err)
		}
		if channel == nil {
			t.Errorf("nil sync cookie")
		}

		delegateSig, err := makeDelegateSig(wallet, deviceWallet)
		if err != nil {
			t.Fatalf("error calling CreateStream: %v", err)
		}

		event, err := events.MakeDelegatedStreamEvent(
			wallet,
			events.Make_ChannelPayload_Message(
				"try to send a message without RDK",
			),
			channelHash,
			delegateSig,
		)
		if err != nil {
			t.Fatalf("error creating message event: %v", err)
		}
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
					StreamId: common.ChannelStreamIdFromName("channel1"),
					Event:    msg,
				},
			),
		)
		if err != nil {
			t.Fatalf("error calling AddEvent: %v", err)
		}

		_, err = client.AddEvent(
			ctx,
			connect.NewRequest(
				&protocol.AddEventRequest{
					StreamId: common.ChannelStreamIdFromName("channel1"),
					Event:    msg,
				},
			),
		)
		if err == nil {
			t.Fatalf("expected error calling AddEvent: %v", err)
		}
	}
}

func TestSyncStreams(t *testing.T) {
	/**
	Arrange
	*/
	// create the test client and server
	ctx := context.Background()
	client, _, closer := testServerAndClient(ctx, testDatabaseUrl, testSchemaName, false, 2)
	defer closer()
	// create the streams for a user
	wallet, _ := crypto.NewWallet(ctx)
	_, _, err := createUser(ctx, wallet, client)
	assert.Nilf(t, err, "error calling createUser: %v", err)
	_, _, err = createUserDeviceKeyStream(ctx, wallet, client)
	assert.Nilf(t, err, "error calling createUserDeviceKeyStream: %v", err)
	// create space
	space1, _, err := createSpace(ctx, wallet, client, "space1")
	assert.Nilf(t, err, "error calling createSpace: %v", err)
	assert.NotNil(t, space1, "nil sync cookie")
	// create channel
	channel1, channelHash, err := createChannel(ctx, wallet, client, common.SpaceStreamIdFromName("space1"), "channel1", nil)
	assert.Nilf(t, err, "error calling createChannel: %v", err)
	assert.NotNil(t, channel1, "nil sync cookie")

	/**
	Act
	*/
	// sync streams
	syncCtx, syncCancel := context.WithCancel(context.Background())
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
	assert.Nilf(t, err, "error calling SyncStreams: %v", err)
	// get the syncId for asserts later
	syncRes.Receive()
	syncId := syncRes.Msg().SyncId
	// add an event to verify that sync is working
	message, err := events.MakeEnvelopeWithPayload(
		wallet,
		events.Make_ChannelPayload_Message("hello"),
		channelHash,
	)
	assert.Nilf(t, err, "error creating message event: %v", err)
	_, err = client.AddEvent(
		ctx,
		connect.NewRequest(
			&protocol.AddEventRequest{
				StreamId: common.ChannelStreamIdFromName("channel1"),
				Event:    message,
			},
		),
	)
	assert.Nilf(t, err, "error calling AddEvent: %v", err)
	// wait for the sync
	syncRes.Receive()
	msg := syncRes.Msg()
	// stop the sync loop
	syncCancel()

	/**
	Asserts
	*/
	assert.NotEmpty(t, syncId, "expected non-empty sync id")
	assert.NotNil(t, 1, msg.Stream, "expected 1 stream")
	assert.Equal(t, syncId, msg.SyncId, "expected sync id to match")
}

func TestAddStreamsToSync(t *testing.T) {
	/**
	Arrange
	*/
	// create the test client and server
	ctx := context.Background()
	aliceClient, port, closer := testServerAndClient(ctx, testDatabaseUrl, testSchemaName, false, 2)
	defer closer()
	// create alice's wallet and streams
	aliceWallet, _ := crypto.NewWallet(ctx)
	alice, _, err := createUser(ctx, aliceWallet, aliceClient)
	assert.Nilf(t, err, "error calling createUser: %v", err)
	assert.NotNil(t, alice, "nil sync cookie for alice")
	_, _, err = createUserDeviceKeyStream(ctx, aliceWallet, aliceClient)
	assert.Nilf(t, err, "error calling createUserDeviceKeyStream: %v", err)
	// create bob's client, wallet, and streams
	bobClient := protocolconnect.NewStreamServiceClient(
		http.DefaultClient,
		fmt.Sprintf("http://localhost:%d", port),
	)
	bobWallet, _ := crypto.NewWallet(ctx)
	bob, _, err := createUser(ctx, bobWallet, bobClient)
	assert.Nilf(t, err, "error calling createUser: %v", err)
	assert.NotNil(t, bob, "nil sync cookie for bob")
	_, _, err = createUserDeviceKeyStream(ctx, bobWallet, bobClient)
	assert.Nilf(t, err, "error calling createUserDeviceKeyStream: %v", err)
	// alice creates a space
	space1, _, err := createSpace(ctx, aliceWallet, aliceClient, "space1")
	assert.Nilf(t, err, "error calling createSpace: %v", err)
	assert.NotNil(t, space1, "nil sync cookie")
	// alice creates a channel
	channel1, channelHash, err := createChannel(ctx, aliceWallet, aliceClient, common.SpaceStreamIdFromName("space1"), "channel1", nil)
	assert.Nilf(t, err, "error calling createChannel: %v", err)
	assert.NotNil(t, channel1, "nil sync cookie")

	/**
	Act
	*/
	// bob sync streams
	syncCtx, syncCancel := context.WithCancel(context.Background())
	syncRes, err := bobClient.SyncStreams(
		syncCtx,
		connect.NewRequest(
			&protocol.SyncStreamsRequest{
				SyncPos: []*protocol.SyncCookie{},
			},
		),
	)
	assert.Nilf(t, err, "error calling SyncStreams: %v", err)
	// get the syncId for asserts later
	syncRes.Receive()
	syncId := syncRes.Msg().SyncId
	// add an event to verify that sync is working
	message, err := events.MakeEnvelopeWithPayload(
		aliceWallet,
		events.Make_ChannelPayload_Message("hello"),
		channelHash,
	)
	assert.Nilf(t, err, "error creating message event: %v", err)
	_, err = aliceClient.AddEvent(
		ctx,
		connect.NewRequest(
			&protocol.AddEventRequest{
				StreamId: common.ChannelStreamIdFromName("channel1"),
				Event:    message,
			},
		),
	)
	assert.Nilf(t, err, "error calling AddEvent: %v", err)
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
	assert.Nilf(t, err, "error calling AddStreamsToSync: %v", err)
	// wait for the sync
	syncRes.Receive()
	msg := syncRes.Msg()
	// stop the sync loop
	syncCancel()

	/**
	Asserts
	*/
	assert.NotEmpty(t, syncId, "expected non-empty sync id")
	assert.NotNil(t, msg.Stream, "expected 1 stream")
	assert.Equal(t, syncId, msg.SyncId, "expected sync id to match")
}

func TestRemoveStreamsFromSync(t *testing.T) {
	/**
	Arrange
	*/
	// create the test client and server
	ctx := context.Background()
	aliceClient, port, closer := testServerAndClient(ctx, testDatabaseUrl, testSchemaName, false, 2)
	defer closer()
	// create alice's wallet and streams
	aliceWallet, _ := crypto.NewWallet(ctx)
	alice, _, err := createUser(ctx, aliceWallet, aliceClient)
	assert.Nilf(t, err, "error calling createUser: %v", err)
	assert.NotNil(t, alice, "nil sync cookie for alice")
	_, _, err = createUserDeviceKeyStream(ctx, aliceWallet, aliceClient)
	if err != nil {
		t.Fatalf("error calling createUser: %v", err)
	}
	// create bob's client, wallet, and streams
	bobClient := protocolconnect.NewStreamServiceClient(
		http.DefaultClient,
		fmt.Sprintf("http://localhost:%d", port),
	)
	bobWallet, _ := crypto.NewWallet(ctx)
	bob, _, err := createUser(ctx, bobWallet, bobClient)
	assert.Nilf(t, err, "error calling createUser: %v", err)
	assert.NotNil(t, bob, "nil sync cookie for bob")
	_, _, err = createUserDeviceKeyStream(ctx, bobWallet, bobClient)
	assert.Nilf(t, err, "error calling createUserDeviceKeyStream: %v", err)
	// alice creates a space
	space1, _, err := createSpace(ctx, aliceWallet, aliceClient, "space1")
	assert.Nilf(t, err, "error calling createSpace: %v", err)
	assert.NotNil(t, space1, "nil sync cookie")
	// alice creates a channel
	space1StreamId := common.SpaceStreamIdFromName("space1")
	channel1StreamId := common.ChannelStreamIdFromName("channel1")
	channel1, channelHash, err := createChannel(ctx, aliceWallet, aliceClient, space1StreamId, "channel1", nil)
	assert.Nilf(t, err, "error calling createChannel: %v", err)
	assert.NotNil(t, channel1, "nil sync cookie")
	// bob sync streams
	syncCtx, syncCancel := context.WithCancel(context.Background())
	syncRes, err := bobClient.SyncStreams(
		syncCtx,
		connect.NewRequest(
			&protocol.SyncStreamsRequest{
				SyncPos: []*protocol.SyncCookie{},
			},
		),
	)
	assert.Nilf(t, err, "error calling SyncStreams: %v", err)
	// get the syncId for asserts later
	syncRes.Receive()
	syncId := syncRes.Msg().SyncId

	// add an event to verify that sync is working
	message1, err := events.MakeEnvelopeWithPayload(
		aliceWallet,
		events.Make_ChannelPayload_Message("hello"),
		channelHash,
	)
	assert.Nilf(t, err, "error creating message event: %v", err)
	_, err = aliceClient.AddEvent(
		ctx,
		connect.NewRequest(
			&protocol.AddEventRequest{
				StreamId: channel1StreamId,
				Event:    message1,
			},
		),
	)
	assert.Nilf(t, err, "error calling AddEvent: %v", err)

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
	assert.Nilf(t, err, "error calling AddStreamsToSync: %v", err)

	// When AddEvent is called, node calls streamImpl.notifyToSubscribers() twice
	// for different events. 	See hnt-3683 for explanation. First event is for
	// the externally added event (by AddEvent). Second event is the miniblock
	// event with headers.
	// drain the events
	receivedCount := 0
	for syncRes.Receive() {
		syncRes.Msg()
		receivedCount++
		if receivedCount == 2 {
			break
		}
	}

	/**
	Act
	*/
	// bob removes alice's stream to sync
	removeRes, err := bobClient.RemoveStreamFromSync(
		ctx,
		connect.NewRequest(
			&protocol.RemoveStreamFromSyncRequest{
				SyncId:   syncId,
				StreamId: channel1StreamId,
			},
		),
	)
	assert.Nilf(t, err, "error calling RemoveStreamsFromSync: %v", err)

	// alice sends another message
	message2, err := events.MakeEnvelopeWithPayload(
		aliceWallet,
		events.Make_ChannelPayload_Message("world"),
		channelHash,
	)
	assert.Nilf(t, err, "error creating message event: %v", err)
	_, err = aliceClient.AddEvent(
		ctx,
		connect.NewRequest(
			&protocol.AddEventRequest{
				StreamId: channel1StreamId,
				Event:    message2,
			},
		),
	)
	assert.Nilf(t, err, "error calling AddEvent: %v", err)

	/**
	For debugging only. Uncomment to see syncRes.Receive() block.
	bobClient's syncRes no longer receives the latest events from alice.

	// wait to see if we got a message. We shouldn't.
	// uncomment: syncRes.Receive()
	*/
	syncCancel()

	/**
	Asserts
	*/
	assert.NotEmpty(t, syncId, "expected non-empty sync id")
	assert.NotNil(t, removeRes.Msg, "expected non-nil remove response")
}

// TODO: revamp with block support
func DisableTestManyUsers(t *testing.T) {
	ctx := context.Background()
	client, _, closer := testServerAndClient(ctx, testDatabaseUrl, testSchemaName, false, 0)
	defer closer()

	totalUsers := 14
	totalChannels := 10

	wallets := []*crypto.Wallet{}
	for i := 0; i < totalUsers; i++ {
		wallet, _ := crypto.NewWallet(ctx)
		wallets = append(wallets, wallet)

		res, _, err := createUser(ctx, wallet, client)
		if err != nil {
			t.Fatalf("error calling CreateStream: %v", err)
		}
		if res == nil {
			t.Fatalf("nil sync cookie")
		}
	}

	// create space
	resspace, _, err := createSpace(ctx, wallets[0], client, "test")
	if err != nil {
		t.Fatalf("error calling CreateStream: %v", err)
	}
	if resspace == nil {
		t.Fatalf("nil sync cookie")
	}

	// create channels
	var channelHashes [][]byte
	var channels []*protocol.SyncCookie
	for i := 0; i < totalChannels; i++ {
		//TODO: add channel setting instead of "channel1"
		channel, channelHash, err := createChannel(
			ctx,
			wallets[0],
			client,
			common.SpaceStreamIdFromName("test"),
			fmt.Sprintf("channel-%d", i),
			nil,
		)
		if err != nil {
			t.Fatalf("error calling CreateStream: %v", err)
		}
		if channel == nil {
			t.Fatalf("nil sync cookie")
		}
		channelHashes = append(channelHashes, channelHash)
		channels = append(channels, channel)
	}

	for i := 1; i < totalUsers; i++ {
		// users joins channels
		for j := 0; j < totalChannels; j++ {
			userId, err := common.AddressHex(wallets[i].Address.Bytes())
			if err != nil {
				t.Fatalf("error getting user id: %v", err)
			}

			join, err := events.MakeEnvelopeWithPayload(
				wallets[i],
				events.Make_ChannelPayload_Membership(
					protocol.MembershipOp_SO_JOIN,
					userId,
				),
				channelHashes[j],
			)
			channelHashes[j] = join.Hash

			if err != nil {
				t.Fatalf("error creating join event: %v", err)
			}
			_, err = client.AddEvent(ctx, connect.NewRequest(&protocol.AddEventRequest{
				StreamId: common.ChannelStreamIdFromName(fmt.Sprintf("channel-%d", j)),
				Event:    join,
			},
			))
			if err != nil {
				t.Fatalf("error calling AddEvent: %v", err)
			}

			message, err := events.MakeEnvelopeWithPayload(
				wallets[i],
				events.Make_ChannelPayload_Message("hello"),
				channelHashes[j],
			)
			if err != nil {
				t.Fatalf("error creating message event: %v", err)
			}

			_, err = client.AddEvent(ctx, connect.NewRequest(&protocol.AddEventRequest{
				StreamId: common.ChannelStreamIdFromName(fmt.Sprintf("channel-%d", j)),
				Event:    message,
			},
			))
			if err != nil {
				t.Fatalf("error calling AddEvent: %v", err)
			}
		}
	}

	syncCtx, syncCancel := context.WithCancel(ctx)
	defer syncCancel()
	syncRes, err := client.SyncStreams(syncCtx, connect.NewRequest(&protocol.SyncStreamsRequest{
		SyncPos: channels,
	}))
	if err != nil {
		t.Fatalf("error calling SyncStreams: %v", err)
	}

	streams := make([]*protocol.StreamAndCookie, 0)
	for syncRes.Receive() {
		msg := syncRes.Msg()
		streams = append(streams, msg.Stream)
		if len(streams) == totalChannels {
			syncCancel()
		}
	}

	if len(streams) != totalChannels {
		t.Fatalf("expected %d stream, got %d", totalChannels, len(streams))
	}
	for i := 0; i < totalChannels; i++ {
		if len(streams[i].Events) != (totalUsers-1)*2 {
			t.Fatalf("expected %d event, got %d", (totalUsers-1)*2, len(streams[0].Events))
		}
		for syncPosIdx := range channels {
			if channels[syncPosIdx].StreamId == streams[i].NextSyncCookie.StreamId {
				channels[syncPosIdx] = streams[i].NextSyncCookie
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
					assert.NoError(t, err)

					_, err = client.AddEvent(ctx, connect.NewRequest(&protocol.AddEventRequest{
						StreamId: common.ChannelStreamIdFromName(fmt.Sprintf("channel-%d", channel)),
						Event:    message,
					},
					))
					assert.NoError(t, err)
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
		assert.NoError(t, err)
		for syncRes.Receive() {
			err := syncRes.Err()
			msg := syncRes.Msg()
			assert.NoError(t, err)

			for syncPosStrem := range channels {
				if channels[syncPosStrem].StreamId == msg.Stream.NextSyncCookie.StreamId {
					channels[syncPosStrem] = msg.Stream.NextSyncCookie
				}
			}
			received += len(msg.Stream.Events)
			for _, event := range msg.Stream.Events {
				e, err := events.ParseEvent(event)
				assert.NoError(t, err)
				msg := e.GetChannelMessage()
				assert.NotNil(t, msg)
				tokens := strings.Split(msg.Message.Ciphertext, " ")
				assert.Equal(t, 4, len(tokens))
				id, err := strconv.Atoi(tokens[0])
				assert.NoError(t, err)
				msgTable[id]++
				assert.Equal(t, 1, msgTable[id])
			}

			if received >= selectedUsers*selectedChannels {
				syncCancel()
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

	assert.GreaterOrEqual(t, rcvMessages, selectedUsers*selectedChannels)
}
