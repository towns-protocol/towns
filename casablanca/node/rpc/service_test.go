package rpc_test

import (
	"context"
	"fmt"
	"math/rand"
	"os"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

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

var counter atomic.Int32 = atomic.Int32{}

func next() int {
	return int(counter.Add(1))
}

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

func createUser(ctx context.Context, client protocolconnect.StreamServiceClient, userId []byte) ([]byte, []byte, error) {
	userStreamId := rpc.UserStreamIdFromAddress(userId)
	inception, err := testutils.UserStreamInceptionEvent(next(), userId, userStreamId)
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

func createSpace(ctx context.Context, client protocolconnect.StreamServiceClient, userId []byte, spaceId string) ([]byte, []byte, error) {
	space, err := testutils.SpaceStreamInceptionEvent(next(), userId, rpc.SpaceStreamIdFromName(spaceId))
	if err != nil {
		return nil, nil, err
	}
	joinSpace, err := testutils.JoinEvent(next(), userId, userId, space.Hash)
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

func createChannel(ctx context.Context, client protocolconnect.StreamServiceClient, userId []byte, spaceId string, channelId string) ([]byte, []byte, error) {
	channel, err := testutils.ChannelStreamInceptionEvent(next(), userId, rpc.ChannelStreamIdFromName(channelId), rpc.SpaceStreamIdFromName(spaceId))
	if err != nil {
		return nil, nil, err
	}
	joinChannel, err := testutils.JoinEvent(next(), userId, userId, channel.Hash)
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

func TestMethods(t *testing.T) {
	ctx := context.Background()
	client, closer := rpc.MakeServer(ctx, testDatabaseUrl, false)
	defer closer()
	{
		response, err := client.Info(ctx, connect.NewRequest(&protocol.InfoRequest{}))
		if err != nil {
			t.Errorf("error calling Info: %v", err)
		}
		assert.Equal(t, "TBD Project Name node welcomes you!", response.Msg.Graffiti)
	}
	{
		_, err := client.CreateStream(ctx, connect.NewRequest(&protocol.CreateStreamRequest{}))
		if err == nil {
			t.Errorf("expected error calling CreateStream with no events")
		}
		userId := []byte{0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9}
		res, _, err := createUser(ctx, client, userId)
		if err != nil {
			t.Fatalf("error calling CreateStream: %v", err)
		}
		if res == nil {
			t.Errorf("nil sync cookie")
		}

		// create user stream

		userId2 := []byte{0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1, 2, 3, 4, 5, 6, 7, 8, 10}
		resuser, _, err := createUser(ctx, client, userId2)
		if err != nil {
			t.Fatalf("error calling CreateStream: %v", err)
		}
		if resuser == nil {
			t.Errorf("nil sync cookie")
		}

		// create space
		resspace, _, err := createSpace(ctx, client, userId, "test")
		if err != nil {
			t.Fatalf("error calling CreateStream: %v", err)
		}
		if resspace == nil {
			t.Errorf("nil sync cookie")
		}

		// create channel
		channel, channelHash, err := createChannel(ctx, client, userId, "test", "channel1")
		if err != nil {
			t.Fatalf("error calling CreateStream: %v", err)
		}
		if channel == nil {
			t.Errorf("nil sync cookie")
		}

		// user2 joins channel
		join, err := testutils.JoinEvent(next(), userId, userId2, channelHash)
		if err != nil {
			t.Errorf("error creating join event: %v", err)
		}
		_, err = client.AddEvent(ctx, connect.NewRequest(&protocol.AddEventRequest{
			StreamId: rpc.ChannelStreamIdFromName("channel1"),
			Event:    join,
		},
		))
		if err != nil {
			t.Fatalf("error calling AddEvent: %v", err)
		}

		message, err := testutils.MessageEvent(next(), userId2, "hello", channelHash)
		if err != nil {
			t.Errorf("error creating message event: %v", err)
		}

		_, err = client.AddEvent(ctx, connect.NewRequest(&protocol.AddEventRequest{
			StreamId: rpc.ChannelStreamIdFromName("channel1"),
			Event:    message,
		},
		))
		if err != nil {
			t.Fatalf("error calling AddEvent: %v", err)
		}

		syncRes, err := client.SyncStreams(ctx, connect.NewRequest(&protocol.SyncStreamsRequest{
			SyncPos: []*protocol.SyncPos{
				{
					StreamId:   rpc.ChannelStreamIdFromName("channel1"),
					SyncCookie: channel,
				},
			},
			TimeoutMs: 1000,
		}))
		if err != nil {
			t.Fatalf("error calling SyncStreams: %v", err)
		}

		if len(syncRes.Msg.Streams) != 1 {
			t.Errorf("expected 1 stream, got %d", len(syncRes.Msg.Streams))
		}
		if len(syncRes.Msg.Streams[0].Events) != 2 {
			t.Errorf("expected 2 events, got %d", len(syncRes.Msg.Streams[0].Events))
		}

		var payload protocol.StreamEvent
		err = proto.Unmarshal(syncRes.Msg.Streams[0].Events[1].Event, &payload)
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

func TestManyUsers(t *testing.T) {
	ctx := context.Background()
	client, closer := rpc.MakeServer(ctx, testDatabaseUrl, false)
	defer closer()

	totalUsers := 14
	totalChannels := 10

	{
		userIds := [][]byte{}
		for i := 0; i < totalUsers; i++ {
			userId := []byte{0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1, 2, 3, 4, 5, 6, 7, 8, byte(10 + i)}
			res, _, err := createUser(ctx, client, userId)
			if err != nil {
				t.Fatalf("error calling CreateStream: %v", err)
			}
			if res == nil {
				t.Fatalf("nil sync cookie")
			}
			userIds = append(userIds, userId)
		}

		// create space
		resspace, _, err := createSpace(ctx, client, userIds[0], "test")
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
			channel, channelHash, err := createChannel(ctx, client, userIds[0], "test", fmt.Sprintf("channel-%d", i))
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
				join, err := testutils.JoinEvent(next(), userIds[0], userIds[i], channelHashes[j])
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

				message, err := testutils.MessageEvent(next(), userIds[i], "hello", channelHashes[j])
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

		if len(syncRes.Msg.Streams) != totalChannels {
			t.Fatalf("expected %d stream, got %d", totalChannels, len(syncRes.Msg.Streams))
		}
		for i := 0; i < totalChannels; i++ {
			if len(syncRes.Msg.Streams[i].Events) != (totalUsers-1)*2 {
				t.Fatalf("expected %d event, got %d", (totalUsers-1)*2, len(syncRes.Msg.Streams[0].Events))
			}
			for syncPosIdx := range syncPos {
				if syncPos[syncPosIdx].StreamId == syncRes.Msg.Streams[i].StreamId {
					syncPos[syncPosIdx].SyncCookie = syncRes.Msg.Streams[i].NextSyncCookie
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

					message, err := testutils.MessageEvent(next(), userIds[user], fmt.Sprintf("%d hello from %d", msgId.Add(1)-1, user), channelHashes[channel])
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
			assert.NoError(t, err)
			stats[len(syncRes.Msg.Streams)]++
			for streamIdx := range syncRes.Msg.Streams {
				for syncPosStrem := range syncPos {
					if syncPos[syncPosStrem].StreamId == syncRes.Msg.Streams[streamIdx].StreamId {
						// check if cookie's stream matches
						assert.Equal(t, syncPos[syncPosStrem].SyncCookie[8:], syncRes.Msg.Streams[streamIdx].NextSyncCookie[8:])
						syncPos[syncPosStrem].SyncCookie = syncRes.Msg.Streams[streamIdx].NextSyncCookie
					}
				}
				received += len(syncRes.Msg.Streams[streamIdx].Events)
				for _, event := range syncRes.Msg.Streams[streamIdx].Events {
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
}
