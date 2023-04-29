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

	"casablanca/node/crypto"
	"casablanca/node/events"
	"casablanca/node/protocol"
	"casablanca/node/protocol/protocolconnect"
	"casablanca/node/rpc"
	"casablanca/node/testutils"

	"github.com/bufbuild/connect-go"
	log "github.com/sirupsen/logrus"
	"github.com/stretchr/testify/assert"
	"google.golang.org/protobuf/proto"
)

var testDatabaseUrl string

func TestMain(m *testing.M) {
	log.SetLevel(log.DebugLevel)

	db, closer, err := testutils.StartDB(context.Background())
	if err != nil {
		log.Fatalf("Could not connect to docker: %s", err)
	}
	defer closer()
	testDatabaseUrl = db

	//Run tests
	code := m.Run()

	os.Exit(code)
}

func createUser(ctx context.Context, wallet *crypto.Wallet, client protocolconnect.StreamServiceClient) ([]byte, []byte, error) {
	userStreamId := rpc.UserStreamIdFromAddress(wallet.Address.Bytes())
	inception, err := events.MakeEnvelopeWithPayload(
		wallet,
		events.MakePayload_Inception(
			userStreamId,
			protocol.StreamKind_SK_USER,
			"",
		),
		nil,
	)
	if err != nil {
		return nil, nil, err
	}
	res, err := client.CreateStream(ctx, connect.NewRequest(&protocol.CreateStreamRequest{
		Events: []*protocol.Envelope{inception},
	}))
	if err != nil {
		return nil, nil, err
	}
	return res.Msg.SyncCookie, inception.Hash, nil
}

func createSpace(ctx context.Context, wallet *crypto.Wallet, client protocolconnect.StreamServiceClient, spaceId string) ([]byte, []byte, error) {
	space, err := events.MakeEnvelopeWithPayload(
		wallet,
		events.MakePayload_Inception(
			rpc.SpaceStreamIdFromName(spaceId),
			protocol.StreamKind_SK_SPACE,
			"",
		),
		nil,
	)
	if err != nil {
		return nil, nil, err
	}
	joinSpace, err := events.MakeEnvelopeWithPayload(
		wallet,
		events.MakePayload_JoinableStream(
			protocol.MembershipOp_SO_JOIN,
			rpc.UserIdFromAddress(wallet.Address.Bytes()),
		),
		[][]byte{space.Hash},
	)
	if err != nil {
		return nil, nil, err
	}

	resspace, err := client.CreateStream(ctx, connect.NewRequest(&protocol.CreateStreamRequest{
		Events: []*protocol.Envelope{space, joinSpace},
	},
	))
	if err != nil {
		return nil, nil, err
	}

	return resspace.Msg.SyncCookie, joinSpace.Hash, nil
}

func createChannel(ctx context.Context, wallet *crypto.Wallet, client protocolconnect.StreamServiceClient, spaceId string, channelId string) ([]byte, []byte, error) {
	channel, err := events.MakeEnvelopeWithPayload(
		wallet,
		events.MakePayload_Inception(
			rpc.ChannelStreamIdFromName(channelId),
			protocol.StreamKind_SK_CHANNEL,
			spaceId,
		),
		nil,
	)
	if err != nil {
		return nil, nil, err
	}
	joinChannel, err := events.MakeEnvelopeWithPayload(
		wallet,
		events.MakePayload_JoinableStream(
			protocol.MembershipOp_SO_JOIN,
			rpc.UserIdFromAddress(wallet.Address.Bytes()),
		),
		[][]byte{channel.Hash},
	)
	if err != nil {
		return nil, nil, err
	}
	reschannel, err := client.CreateStream(ctx, connect.NewRequest(&protocol.CreateStreamRequest{
		Events: []*protocol.Envelope{channel, joinChannel},
	},
	))
	if err != nil {
		return nil, nil, err
	}
	return reschannel.Msg.SyncCookie, joinChannel.Hash, nil
}

func testServerAndClient(ctx context.Context, dbUrl string) (protocolconnect.StreamServiceClient, func()) {
	closer, port := rpc.StartServer(ctx, "localhost", 0, dbUrl)

	client := protocolconnect.NewStreamServiceClient(
		http.DefaultClient,
		fmt.Sprintf("http://localhost:%d", port),
	)

	return client, closer
}

func TestMethods(t *testing.T) {
	ctx := context.Background()
	client, closer := testServerAndClient(ctx, testDatabaseUrl)
	wallet1, _ := crypto.NewWallet()
	wallet2, _ := crypto.NewWallet()
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

		// create user stream for user 1
		res, _, err := createUser(ctx, wallet1, client)
		if err != nil {
			t.Fatalf("error calling CreateStream: %v", err)
		}
		if res == nil {
			t.Errorf("nil sync cookie")
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
		channel, channelHash, err := createChannel(ctx, wallet1, client, rpc.SpaceStreamIdFromName("test"), "channel1")
		if err != nil {
			t.Fatalf("error calling CreateStream: %v", err)
		}
		if channel == nil {
			t.Errorf("nil sync cookie")
		}

		// user2 joins channel
		join, err := events.MakeEnvelopeWithPayload(
			wallet2,
			events.MakePayload_JoinableStream(
				protocol.MembershipOp_SO_JOIN,
				rpc.UserIdFromAddress(wallet2.Address.Bytes()),
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
					StreamId: rpc.ChannelStreamIdFromName("channel1"),
					Event:    join,
				},
			),
		)
		if err != nil {
			t.Fatalf("error calling AddEvent: %v", err)
		}

		message, err := events.MakeEnvelopeWithPayload(
			wallet2,
			events.MakePayload_Message("hello"),
			[][]byte{join.Hash},
		)
		if err != nil {
			t.Errorf("error creating message event: %v", err)
		}

		_, err = client.AddEvent(
			ctx,
			connect.NewRequest(
				&protocol.AddEventRequest{
					StreamId: rpc.ChannelStreamIdFromName("channel1"),
					Event:    message,
				},
			),
		)
		if err != nil {
			t.Fatalf("error calling AddEvent: %v", err)
		}

		syncRes, err := client.SyncStreams(
			ctx,
			connect.NewRequest(
				&protocol.SyncStreamsRequest{
					SyncPos: []*protocol.SyncPos{
						{
							StreamId:   rpc.ChannelStreamIdFromName("channel1"),
							SyncCookie: channel,
						},
					},
					TimeoutMs: 1000,
				},
			),
		)
		if err != nil {
			t.Fatalf("error calling SyncStreams: %v", err)
		}

		for syncRes.Receive() {
			msg := syncRes.Msg()

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
			switch payload.Payload.Payload.(type) {
			case *protocol.Payload_Message_:
				// ok
			default:
				t.Fatalf("expected message event, got %v", payload.Payload.Payload)
			}
		}
	}
}

func TestManyUsers(t *testing.T) {
	ctx := context.Background()
	client, closer := testServerAndClient(ctx, testDatabaseUrl)
	defer closer()

	totalUsers := 14
	totalChannels := 10

	wallets := []*crypto.Wallet{}
	for i := 0; i < totalUsers; i++ {
		wallet, _ := crypto.NewWallet()
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
	var channels [][]byte
	for i := 0; i < totalChannels; i++ {
		channel, channelHash, err := createChannel(ctx, wallets[0], client, rpc.SpaceStreamIdFromName("test"), fmt.Sprintf("channel-%d", i))
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
			join, err := events.MakeEnvelopeWithPayload(
				wallets[i],
				events.MakePayload_JoinableStream(
					protocol.MembershipOp_SO_JOIN,
					rpc.UserIdFromAddress(wallets[i].Address.Bytes()),
				),
				[][]byte{channelHashes[j]},
			)
			channelHashes[j] = join.Hash

			if err != nil {
				t.Fatalf("error creating join event: %v", err)
			}
			_, err = client.AddEvent(ctx, connect.NewRequest(&protocol.AddEventRequest{
				StreamId: rpc.ChannelStreamIdFromName(fmt.Sprintf("channel-%d", j)),
				Event:    join,
			},
			))
			if err != nil {
				t.Fatalf("error calling AddEvent: %v", err)
			}

			message, err := events.MakeEnvelopeWithPayload(
				wallets[i],
				events.MakePayload_Message("hello"),
				[][]byte{channelHashes[j]},
			)
			if err != nil {
				t.Fatalf("error creating message event: %v", err)
			}

			_, err = client.AddEvent(ctx, connect.NewRequest(&protocol.AddEventRequest{
				StreamId: rpc.ChannelStreamIdFromName(fmt.Sprintf("channel-%d", j)),
				Event:    message,
			},
			))
			if err != nil {
				t.Fatalf("error calling AddEvent: %v", err)
			}
		}
	}

	syncPos := []*protocol.SyncPos{}
	for i := 0; i < totalChannels; i++ {
		syncPos = append(syncPos, &protocol.SyncPos{
			StreamId:   rpc.ChannelStreamIdFromName(fmt.Sprintf("channel-%d", i)),
			SyncCookie: channels[i],
		})
	}
	syncRes, err := client.SyncStreams(ctx, connect.NewRequest(&protocol.SyncStreamsRequest{
		SyncPos:   syncPos,
		TimeoutMs: 1000,
	}))
	if err != nil {
		t.Fatalf("error calling SyncStreams: %v", err)
	}

	for syncRes.Receive() {
		msg := syncRes.Msg()

		if len(msg.Streams) != totalChannels {
			t.Fatalf("expected %d stream, got %d", totalChannels, len(msg.Streams))
		}
		for i := 0; i < totalChannels; i++ {
			if len(msg.Streams[i].Events) != (totalUsers-1)*2 {
				t.Fatalf("expected %d event, got %d", (totalUsers-1)*2, len(msg.Streams[0].Events))
			}
			for syncPosIdx := range syncPos {
				if syncPos[syncPosIdx].StreamId == msg.Streams[i].StreamId {
					syncPos[syncPosIdx].SyncCookie = msg.Streams[i].NextSyncCookie
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

	msgId := atomic.Int32{}
	generateMessages := func() {
		for i := 0; i < selectedUsers; i++ {

			user := r1.Intn(totalUsers)

			for i := 0; i < selectedChannels; i++ {

				channel := r1.Intn(totalChannels)

				message, err := events.MakeEnvelopeWithPayload(
					wallets[user],
					events.MakePayload_Message(fmt.Sprintf("%d hello from %d", msgId.Add(1)-1, user)),
					[][]byte{channelHashes[channel]},
				)
				assert.NoError(t, err)

				_, err = client.AddEvent(ctx, connect.NewRequest(&protocol.AddEventRequest{
					StreamId: rpc.ChannelStreamIdFromName(fmt.Sprintf("channel-%d", channel)),
					Event:    message,
				},
				))
				assert.NoError(t, err)
				waitForMessages.Done()
			}
		}
	}
	go generateMessages()

	rcvMessages := atomic.Int32{}
	msgTable := make([]int, selectedUsers*selectedChannels)
	stats := make(map[int]int)
	updateSyncPos := func() int {

		received := 0
		syncRes, err = client.SyncStreams(ctx, connect.NewRequest(&protocol.SyncStreamsRequest{
			SyncPos:   syncPos,
			TimeoutMs: 1000,
		}))
		if err != nil {
			t.Fatalf("error calling SyncStreams: %v", err)
		}
		for syncRes.Receive() {
			msg := syncRes.Msg()
			assert.NoError(t, err)
			stats[len(msg.Streams)]++
			for streamIdx := range msg.Streams {
				for syncPosStrem := range syncPos {
					if syncPos[syncPosStrem].StreamId == msg.Streams[streamIdx].StreamId {
						// check if cookie's stream matches
						assert.Equal(t, syncPos[syncPosStrem].SyncCookie[8:], msg.Streams[streamIdx].NextSyncCookie[8:])
						syncPos[syncPosStrem].SyncCookie = msg.Streams[streamIdx].NextSyncCookie
					}
				}
				received += len(msg.Streams[streamIdx].Events)
				for _, event := range msg.Streams[streamIdx].Events {
					e, err := events.ParseEvent(event)
					assert.NoError(t, err)
					msg := e.Event.Payload.GetMessage()
					assert.NotNil(t, msg)
					tokens := strings.Split(msg.Text, " ")
					assert.Equal(t, 4, len(tokens))
					id, err := strconv.Atoi(tokens[0])
					assert.NoError(t, err)
					msgTable[id]++
					assert.Equal(t, 1, msgTable[id])
				}
			}
			rcvMessages.Add(int32(received))
		}
		return received
	}

	for int(rcvMessages.Load()) < selectedUsers*selectedChannels {
		if updateSyncPos() > 0 {
			// sleep for a while to let the other goroutine generate more messages
			time.Sleep(100 * time.Millisecond)
		}
	}
	assert.Equal(t, selectedUsers*selectedChannels, int(rcvMessages.Load()))
	log.Info("stats ", stats)
}
