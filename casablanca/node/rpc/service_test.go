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
	"casablanca/node/protocol"
	"casablanca/node/protocol/protocolconnect"
	"casablanca/node/rpc"
	"casablanca/node/testutils"

	"github.com/bufbuild/connect-go"
	eth_crypto "github.com/ethereum/go-ethereum/crypto"
	"github.com/stretchr/testify/assert"
	"google.golang.org/protobuf/proto"
)

var testDatabaseUrl string
var testSchemaName string

func TestMain(m *testing.M) {

	db, schemaName, closer, err := testutils.StartDB(context.Background())
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

func revokeDeviceId(ctx context.Context, wallet *crypto.Wallet, deviceWallet *crypto.Wallet, client protocolconnect.StreamServiceClient, hash []byte) ([]byte, error) {
	userId, err := common.AddressHex(wallet.Address.Bytes())
	if err != nil {
		return nil, err
	}
	userDeviceKeyStreamId, err := common.UserDeviceKeyStreamIdFromId(userId)
	if err != nil {
		return nil, err
	}
	deviceId, err := crypto.GetDeviceId(deviceWallet)
	if err != nil {
		return nil, err
	}
	registerEvent, err := events.MakeEnvelopeWithPayload(
		wallet,
		events.Make_UserDeviceKeyPayload_RevokeUserDeviceKey(
			userId, deviceId,
		),
		[][]byte{hash},
	)
	if err != nil {
		return nil, err
	}
	_, err = client.AddEvent(ctx, connect.NewRequest(&protocol.AddEventRequest{
		StreamId: userDeviceKeyStreamId,
		Event:    registerEvent,
	}))
	if err != nil {
		return nil, err
	}
	return registerEvent.Hash, nil
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
		[][]byte{space.Hash},
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

func createChannel(ctx context.Context, wallet *crypto.Wallet, client protocolconnect.StreamServiceClient, spaceId string, channelId string) (*protocol.SyncCookie, []byte, error) {
	var channelProperties protocol.EncryptedData
	channelProperties.Text = "encrypted text supposed to be here"
	channelStreamId := common.ChannelStreamIdFromName(channelId)
	channel, err := events.MakeEnvelopeWithPayload(
		wallet,
		events.Make_ChannelPayload_Inception(
			channelStreamId,
			spaceId,
			//TODO: add channel settings
			&channelProperties,
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
	joinChannel, err := events.MakeEnvelopeWithPayload(
		wallet,
		events.Make_ChannelPayload_Membership(
			protocol.MembershipOp_SO_JOIN,
			userId,
		),
		[][]byte{channel.Hash},
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
	return reschannel.Msg.Stream.NextSyncCookie, joinChannel.Hash, nil
}

func testServerAndClient(ctx context.Context, dbUrl string, dbSchemaName string, useContract bool) (protocolconnect.StreamServiceClient, func()) {
	cfg := &config.Config{
		UseContract: useContract,
		Chain: config.ChainConfig{
			ChainId:    31337,
			NetworkUrl: "http://localhost:8545",
		},
		TopChain: config.ChainConfig{
			ChainId:    31337,
			NetworkUrl: "http://localhost:8545",
		},
		Address:           "localhost",
		Port:              1234,
		DbUrl:             dbUrl,
		StorageType:       "postgres",
		SkipDelegateCheck: false,
	}

	wallet, err := crypto.NewWallet(ctx)
	if err != nil {
		panic(err)
	}

	if useContract {
		err = testutils.FundWallet(ctx, wallet.Address, cfg.TopChain.NetworkUrl)
		if err != nil {
			panic(err)
		}
	}

	closer, port, _, err := rpc.StartServer(ctx, cfg, wallet)
	if err != nil {
		panic(err)
	}

	client := protocolconnect.NewStreamServiceClient(
		http.DefaultClient,
		fmt.Sprintf("http://localhost:%d", port),
	)

	return client, closer
}

func TestMethods(t *testing.T) {
	ctx := context.Background()
	client, closer := testServerAndClient(ctx, testDatabaseUrl, testSchemaName, false)
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

		_, udkHash, err := createUserDeviceKeyStream(ctx, wallet1, client)
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
		channel, channelHash, err := createChannel(ctx, wallet1, client, common.SpaceStreamIdFromName("test"), "channel1")
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
			[][]byte{channelHash},
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
			[][]byte{join.Hash},
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

		if len(msg.Streams) != 1 {
			t.Errorf("expected 1 stream, got %d", len(msg.Streams))
		}
		if len(msg.Streams[0].Events) != 2 {
			t.Errorf("expected 2 events, got %d", len(msg.Streams[0].Events))
		}

		var payload protocol.StreamEvent
		err = proto.Unmarshal(msg.Streams[0].Events[1].Event, &payload)
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

		_, err = revokeDeviceId(ctx, wallet1, wallet1, client, udkHash)
		if err != nil {
			t.Fatalf("error calling CreateStream: %v", err)
		}
	}
}

func TestRiverDeviceId(t *testing.T) {
	ctx := context.Background()
	client, closer := testServerAndClient(ctx, testDatabaseUrl, testSchemaName, false)
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

		_, udkHash, err := createUserDeviceKeyStream(ctx, wallet, client)
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

		channel, channelHash, err := createChannel(ctx, wallet, client, common.SpaceStreamIdFromName("test"), "channel1")
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
			[][]byte{channelHash},
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

		_, err = revokeDeviceId(ctx, wallet, deviceWallet, client, udkHash)
		if err != nil {
			t.Fatalf("error registering device: %v", err)
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

// TODO: revamp with block support
func DisableTestManyUsers(t *testing.T) {
	ctx := context.Background()
	client, closer := testServerAndClient(ctx, testDatabaseUrl, testSchemaName, false)
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
		channel, channelHash, err := createChannel(ctx, wallets[0], client, common.SpaceStreamIdFromName("test"), fmt.Sprintf("channel-%d", i))
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
				[][]byte{channelHashes[j]},
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
				[][]byte{channelHashes[j]},
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
		streams = append(streams, msg.Streams...)
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
			if channels[syncPosIdx].StreamId == streams[i].StreamId {
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
						[][]byte{channelHashes[channel]},
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
		stats := make(map[int]int)

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
			stats[len(msg.Streams)]++
			for streamIdx := range msg.Streams {
				for syncPosStrem := range channels {
					if channels[syncPosStrem].StreamId == msg.Streams[streamIdx].StreamId {
						channels[syncPosStrem] = msg.Streams[streamIdx].NextSyncCookie
					}
				}
				received += len(msg.Streams[streamIdx].Events)
				for _, event := range msg.Streams[streamIdx].Events {
					e, err := events.ParseEvent(event)
					assert.NoError(t, err)
					msg := e.GetChannelMessage()
					assert.NotNil(t, msg)
					tokens := strings.Split(msg.Message.Text, " ")
					assert.Equal(t, 4, len(tokens))
					id, err := strconv.Atoi(tokens[0])
					assert.NoError(t, err)
					msgTable[id]++
					assert.Equal(t, 1, msgTable[id])
				}
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
