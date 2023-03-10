package rpc_test

import (
	"context"
	"os"
	"testing"

	"casablanca/node/protocol"
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

func TestMethods(t *testing.T) {
	ctx := context.Background()
	client, closer := rpc.MakeServer(ctx, testDatabaseUrl)
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
		userStreamId := rpc.UserStreamIdFromAddress(userId)
		inception, err := testutils.UserStreamInceptionEvent(2, userId, userStreamId)
		if err != nil {
			t.Errorf("error creating inception event: %v", err)
		}

		res, err := client.CreateStream(ctx, connect.NewRequest(&protocol.CreateStreamRequest{
			Events: []*protocol.Envelope{inception},
		},
		))
		if err != nil {
			t.Fatalf("error calling CreateStream: %v", err)
		}
		if res.Msg.SyncCookie == nil {
			t.Errorf("nil sync cookie")
		}

		// create user stream

		userId2 := []byte{0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1, 2, 3, 4, 5, 6, 7, 8, 10}
		user, err := testutils.UserStreamInceptionEvent(2, userId2, rpc.UserStreamIdFromAddress(userId2))
		if err != nil {
			t.Errorf("error creating inception event: %v", err)
		}

		resuser, err := client.CreateStream(ctx, connect.NewRequest(&protocol.CreateStreamRequest{
			Events: []*protocol.Envelope{user},
		},
		))
		if err != nil {
			t.Fatalf("error calling CreateStream: %v", err)
		}
		if resuser.Msg.SyncCookie == nil {
			t.Errorf("nil sync cookie")
		}

		// create space
		space, err := testutils.SpaceStreamInceptionEvent(2, userId, rpc.SpaceStreamIdFromName("test"))
		if err != nil {
			t.Errorf("error creating inception event: %v", err)
		}
		joinSpace, err := testutils.JoinEvent(2, userId, userId, space.Hash)
		if err != nil {
			t.Errorf("error creating join event: %v", err)
		}

		resspace, err := client.CreateStream(ctx, connect.NewRequest(&protocol.CreateStreamRequest{
			Events: []*protocol.Envelope{space, joinSpace},
		},
		))
		if err != nil {
			t.Fatalf("error calling CreateStream: %v", err)
		}
		if resspace.Msg.SyncCookie == nil {
			t.Errorf("nil sync cookie")
		}

		// create channel
		channel, err := testutils.ChannelStreamInceptionEvent(2, userId, rpc.ChannelStreamIdFromName("channel1"), rpc.SpaceStreamIdFromName("test"))
		if err != nil {
			t.Errorf("error creating inception event: %v", err)
		}
		joinChannel, err := testutils.JoinEvent(2, userId, userId, channel.Hash)
		if err != nil {
			t.Errorf("error creating join event: %v", err)
		}
		reschannel, err := client.CreateStream(ctx, connect.NewRequest(&protocol.CreateStreamRequest{
			Events: []*protocol.Envelope{channel, joinChannel},
		},
		))
		if err != nil {
			t.Fatalf("error calling CreateStream: %v", err)
		}

		// user2 joins channel
		join, err := testutils.JoinEvent(2, userId, userId2, space.Hash)
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

		message, err := testutils.MessageEvent(2, userId2, "hello", inception.Hash)
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
					SyncCookie: reschannel.Msg.SyncCookie,
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
			t.Errorf("expected 1 event, got %d", len(syncRes.Msg.Streams[0].Events))
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
