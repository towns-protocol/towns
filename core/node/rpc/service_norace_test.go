//go:build !race

// This file contains tests that are skipped when the race detector is enabled
// because they are too resource-intensive.

package rpc

import (
	"bytes"
	"errors"
	"fmt"
	"math/rand"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/towns-protocol/towns/core/node/rpc/syncv3/eventbus"
	"github.com/towns-protocol/towns/core/node/rpc/syncv3/handler"

	"connectrpc.com/connect"
	"github.com/ethereum/go-ethereum/common"
	"github.com/stretchr/testify/require"
	"google.golang.org/protobuf/proto"

	. "github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/crypto"
	"github.com/towns-protocol/towns/core/node/events"
	"github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/testutils"
	"github.com/towns-protocol/towns/core/node/testutils/testfmt"
)

// TestGetMiniblocksRangeLimit_NoRace checks that GetMiniblocks endpoint has a validation for a max range of blocks
// to be fetched at once.
func TestGetMiniblocksRangeLimit_NoRace(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping TestGetMiniblocksRangeLimit_NoRace in short mode")
	}
	const expectedLimit = 200
	tt := newServiceTester(t, serviceTesterOpts{numNodes: 1, start: true})
	tt.btc.SetConfigValue(
		t,
		tt.ctx,
		crypto.StreamGetMiniblocksMaxPageSizeConfigKey,
		crypto.ABIEncodeUint64(uint64(expectedLimit)),
	)

	alice := tt.newTestClient(0, testClientOpts{})
	_ = alice.createUserStream()
	spaceId, _ := alice.createSpace()
	channelId, _, _ := alice.createChannel(spaceId)

	// Here we create a miniblock for each message sent by Alice.
	// Creating a bit more miniblocks than limit.
	var lastMbNum int64
	for count := range expectedLimit + 10 {
		alice.say(channelId, fmt.Sprintf("hello from Alice %d", count))
		mb, err := makeMiniblock(tt.ctx, alice.client, channelId, false, lastMbNum)
		tt.require.NoError(err)
		lastMbNum = mb.Num
	}

	// Try to get miniblocks with invalid range
	resp, err := alice.client.GetMiniblocks(alice.ctx, connect.NewRequest(&protocol.GetMiniblocksRequest{
		StreamId:      channelId[:],
		FromInclusive: expectedLimit + 100,
		ToExclusive:   5,
	}))
	tt.require.Nil(resp)
	tt.require.ErrorContains(err, "INVALID_ARGUMENT")

	tt.require.Eventually(func() bool {
		// Requesting a list of miniblocks with the limit > max limit and expect to return "limit" miniblocks.
		resp, err := alice.client.GetMiniblocks(alice.ctx, connect.NewRequest(&protocol.GetMiniblocksRequest{
			StreamId:      channelId[:],
			FromInclusive: 5,
			ToExclusive:   expectedLimit + 100,
		}))
		tt.require.NoError(err)

		if len(resp.Msg.GetMiniblocks()) != expectedLimit {
			return false
		}

		tt.require.Equal(int64(5), resp.Msg.GetFromInclusive())
		tt.require.Equal(int64(expectedLimit), resp.Msg.GetLimit())
		tt.require.Len(resp.Msg.GetMiniblocks(), expectedLimit)

		return true
	}, 20*time.Second, 100*time.Millisecond)
}

// TestSyncSubscriptionWithTooSlowClient_NoRace ensures that a sync operation cancels itself when a subscriber isn't
// able to
// keep up with sync updates.
func TestSyncSubscriptionWithTooSlowClient_NoRace(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping TestSyncSubscriptionWithTooSlowClient_NoRace in short mode")
	}
	var (
		req      = require.New(t)
		services = newServiceTester(t, serviceTesterOpts{numNodes: 5, start: true})
		client0  = services.testClient(0)
		client1  = services.testClient(1)
		node1    = services.nodes[1]
		ctx      = services.ctx
		wallets  []*crypto.Wallet
		users    []*protocol.SyncCookie
		channels []*protocol.SyncCookie
		syncID   = GenNanoid()
	)

	// create users that will join and add messages to channels.
	for range 10 {
		// Create user streams
		wallet, err := crypto.NewWallet(ctx)
		req.NoError(err, "new wallet")
		syncCookie, _, err := createUser(ctx, wallet, client0, nil)
		req.NoError(err, "create user")

		_, _, err = createUserMetadataStream(ctx, wallet, client0, nil)
		req.NoError(err)

		wallets = append(wallets, wallet)
		users = append(users, syncCookie)
	}

	// create a space and several channels in it
	spaceId := testutils.FakeStreamId(STREAM_SPACE_BIN)
	resspace, _, err := createSpace(ctx, wallets[0], client0, spaceId, nil)
	req.NoError(err)
	req.NotNil(resspace, "create space sync cookie")

	// create enough channels that they will be distributed among local and remote nodes
	for range TestStreams {
		channelId := testutils.MakeChannelId(spaceId)
		channel, _, err := createChannel(ctx, wallets[0], client0, spaceId, channelId, nil)
		req.NoError(err)
		req.NotNil(channel, "nil create channel sync cookie")
		channels = append(channels, channel)
	}
	syncPos := append(users, channels...)

	// subscribe to channel updates on node 1 direct through a sync op to have better control over it
	testfmt.Logf(t, "subscribe on node %s", node1.address)
	eventBus := eventbus.New(ctx, node1.address, node1.service.cache, node1.service.nodeRegistry, nil, nil)
	handlerRegistry := handler.NewRegistry(node1.service.cache, eventBus, nil)
	slowSubscriber := slowStreamsResponseSender{sendDuration: time.Second}
	syncHandler, err := handlerRegistry.New(ctx, syncID, slowSubscriber)
	req.NoError(err, "handlerRegistry.New")
	resp, err := syncHandler.Modify(ctx, &protocol.ModifySyncRequest{AddStreams: syncPos})
	req.NoError(err, "syncHandler.Modify")
	req.Empty(resp.GetAdds())

	syncOpResult := make(chan error)
	syncOpStopped := atomic.Bool{}

	// run the subscription in the background that takes a long time for each update to send to the client.
	// this must cancel the sync op with a buffer too full error.
	go func() {
		syncOpErr := syncHandler.Run()
		syncOpStopped.Store(true)
		syncOpResult <- syncOpErr
	}()

	// users join channels
	channelsCount := len(channels)
	for i, wallet := range wallets[1:] {
		for c := range channelsCount {
			channel := channels[c]
			miniBlockHashResp, err := client1.GetLastMiniblockHash(ctx,
				connect.NewRequest(&protocol.GetLastMiniblockHashRequest{StreamId: users[i+1].StreamId}))

			req.NoError(err, "get last mini-block hash")

			channelId, _ := StreamIdFromBytes(channel.GetStreamId())
			userJoin, err := events.MakeEnvelopeWithPayload(
				wallet,
				events.Make_UserPayload_Membership(
					protocol.MembershipOp_SO_JOIN,
					channelId,
					common.Address{},
					nil,
				),
				MiniblockRefFromLastHash(miniBlockHashResp.Msg),
			)
			req.NoError(err)

			resp, err := client1.AddEvent(
				ctx,
				connect.NewRequest(
					&protocol.AddEventRequest{
						StreamId: users[i+1].StreamId,
						Event:    userJoin,
					},
				),
			)

			req.NoError(err)
			req.NotNil(resp.Msg)
		}
	}

	// send a bunch of messages and ensure that the sync op is cancelled because the client can't keep up
	for i := range 10000 {
		if syncOpStopped.Load() { // no need to send additional messages, sync op already cancelled
			break
		}

		wallet := wallets[rand.Int()%len(wallets)]
		channel := channels[rand.Int()%len(channels)]
		msgContents := fmt.Sprintf("msg #%d", i)

		getStreamResp, err := client1.GetStream(ctx, connect.NewRequest(&protocol.GetStreamRequest{
			StreamId: channel.GetStreamId(),
			Optional: false,
		}))
		req.NoError(err)

		message, err := events.MakeEnvelopeWithPayload(
			wallet,
			events.Make_ChannelPayload_Message(msgContents),
			MiniblockRefFromCookie(getStreamResp.Msg.GetStream().GetNextSyncCookie()),
		)
		req.NoError(err)

		_, err = client1.AddEvent(
			ctx,
			connect.NewRequest(
				&protocol.AddEventRequest{
					StreamId: channel.GetStreamId(),
					Event:    message,
				},
			),
		)

		req.NoError(err)
	}

	// At some moment one of the syncers in the sync op syncer set encounters a buffer full and cancels the sync op.
	// Ensure that the sync op ends with protocol.Err_BUFFER_FULL.
	req.Eventuallyf(func() bool {
		select {
		case err := <-syncOpResult:
			var riverErr *RiverErrorImpl
			if errors.As(err, &riverErr) {
				req.Equal(riverErr.Code, protocol.Err_BUFFER_FULL, "unexpected error code")
				return true
			}
			req.FailNow("received unexpected err", err)
			return false
		default:
			return false
		}
	}, 20*time.Second, 100*time.Millisecond, "sync operation not stopped within reasonable time")
}

// TestUnstableStreams_NoRace ensures that when a stream becomes unavailable a SyncOp_Down message is received and when
// available again allows the client to resubscribe.
func TestUnstableStreams_NoRace(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping TestUnstableStreams_NoRace in short mode")
	}
	var (
		req      = require.New(t)
		services = newServiceTester(t, serviceTesterOpts{numNodes: 5, start: true})
		client0  = services.testClient(0)
		client1  = services.testClient(1)
		ctx      = services.ctx
		wallets  []*crypto.Wallet
		users    []*protocol.SyncCookie
		channels []*protocol.SyncCookie
	)

	// create users that will join and add messages to channels.
	for range 10 {
		// Create user streams
		wallet, err := crypto.NewWallet(ctx)
		req.NoError(err, "new wallet")
		syncCookie, _, err := createUser(ctx, wallet, client0, nil)
		req.NoError(err, "create user")

		_, _, err = createUserMetadataStream(ctx, wallet, client0, nil)
		req.NoError(err)

		wallets = append(wallets, wallet)
		users = append(users, syncCookie)
	}

	// create a space and several channels in it
	spaceId := testutils.FakeStreamId(STREAM_SPACE_BIN)
	resspace, _, err := createSpace(ctx, wallets[0], client0, spaceId, nil)
	req.NoError(err)
	req.NotNil(resspace, "create space sync cookie")

	// create enough channels that they will be distributed among local and remote nodes
	for range TestStreams {
		channelId := testutils.MakeChannelId(spaceId)
		channel, _, err := createChannel(ctx, wallets[0], client0, spaceId, channelId, nil)
		req.NoError(err)
		req.NotNil(channel, "nil create channel sync cookie")
		channels = append(channels, channel)
	}

	// subscribe to channel updates
	syncPos := append(users, channels...)

	syncRes, err := client1.SyncStreams(ctx, connect.NewRequest(&protocol.SyncStreamsRequest{SyncPos: syncPos}))
	req.NoError(err, "sync streams")

	syncRes.Receive()
	syncID := syncRes.Msg().SyncId
	testfmt.Logf(t, "subscription %s created on node: %s", syncID, services.nodes[1].address)

	// collect sync cookie updates for channels
	var (
		messages           = make(chan string, 512)
		mu                 sync.Mutex
		streamDownMessages = make(map[StreamId]struct{})
		syncCookies        = make(map[StreamId][]*protocol.StreamAndCookie)
	)

	go func() {
		for syncRes.Receive() {
			msg := syncRes.Msg()

			switch msg.GetSyncOp() {
			case protocol.SyncOp_SYNC_NEW:
				syncID := msg.GetSyncId()
				testfmt.Logf(t, "start stream sync %s ", syncID)
			case protocol.SyncOp_SYNC_UPDATE:
				req.Equal(syncID, msg.GetSyncId(), "sync id")
				req.NotNil(msg.GetStream(), "stream")
				req.NotNil(msg.GetStream().GetNextSyncCookie(), "next sync cookie")
				cookie := msg.GetStream().GetNextSyncCookie()
				streamID, err := StreamIdFromBytes(cookie.GetStreamId())
				if err != nil {
					req.NoError(err, "invalid stream id in sync op update")
				}

				mu.Lock()
				syncCookies[streamID] = append(syncCookies[streamID], msg.GetStream())
				delete(streamDownMessages, streamID)
				mu.Unlock()

				for _, e := range msg.GetStream().GetEvents() {
					var payload protocol.StreamEvent
					err = proto.Unmarshal(e.Event, &payload)
					req.NoError(err)
					switch p := payload.Payload.(type) {
					case *protocol.StreamEvent_ChannelPayload:
						switch p.ChannelPayload.Content.(type) {
						case *protocol.ChannelPayload_Message:
							messages <- p.ChannelPayload.GetMessage().GetCiphertext()
						}
					}
				}

			case protocol.SyncOp_SYNC_DOWN:
				req.Equal(syncID, msg.GetSyncId(), "sync id")
				streamID, err := StreamIdFromBytes(msg.GetStreamId())
				req.NoError(err, "stream id")

				mu.Lock()
				if _, found := streamDownMessages[streamID]; found {
					t.Error("received a second down message in a row for a stream")
					return
				}
				streamDownMessages[streamID] = struct{}{}
				mu.Unlock()

			case protocol.SyncOp_SYNC_CLOSE:
				req.Equal(syncID, msg.GetSyncId(), "invalid sync id in sync close message")
				close(messages)

			case protocol.SyncOp_SYNC_UNSPECIFIED, protocol.SyncOp_SYNC_PONG:
				continue

			default:
				t.Errorf("unexpected sync operation %s", msg.GetSyncOp())
				return
			}
		}
	}()

	// users join channels
	channelsCount := len(channels)
	for i, wallet := range wallets[1:] {
		for c := range channelsCount {
			channel := channels[c]

			miniBlockHashResp, err := client1.GetLastMiniblockHash(
				ctx,
				connect.NewRequest(&protocol.GetLastMiniblockHashRequest{StreamId: users[i+1].StreamId}))

			req.NoError(err, "get last miniblock hash")

			channelId, _ := StreamIdFromBytes(channel.GetStreamId())
			userJoin, err := events.MakeEnvelopeWithPayload(
				wallet,
				events.Make_UserPayload_Membership(
					protocol.MembershipOp_SO_JOIN,
					channelId,
					common.Address{},
					nil,
				),
				&MiniblockRef{
					Hash: common.BytesToHash(miniBlockHashResp.Msg.GetHash()),
					Num:  miniBlockHashResp.Msg.GetMiniblockNum(),
				},
			)
			req.NoError(err)

			resp, err := client1.AddEvent(
				ctx,
				connect.NewRequest(
					&protocol.AddEventRequest{
						StreamId: users[i+1].StreamId,
						Event:    userJoin,
					},
				),
			)

			req.NoError(err)
			req.NotNil(resp.Msg)
		}
	}

	// send a bunch of messages and ensure that all are received
	sendMessagesAndReceive(100, wallets, channels, req, client0, ctx, messages, func(StreamId) bool { return false })

	testfmt.Logf(t, "first message batch received")

	// bring ~25% of the streams down
	streamsDownCounter := 0
	rand.Shuffle(len(channels), func(i, j int) { channels[i], channels[j] = channels[j], channels[i] })

	for i, syncCookie := range channels {
		streamID, _ := StreamIdFromBytes(syncCookie.GetStreamId())
		if _, err = client1.Info(ctx, connect.NewRequest(&protocol.InfoRequest{Debug: []string{
			"drop_stream",
			syncID,
			streamID.String(),
		}})); err != nil {
			req.NoError(err, "unable to bring stream down")
		}

		streamsDownCounter++

		testfmt.Logf(t, "bring stream %s down", streamID)

		if i > TestStreams/4 {
			break
		}
	}

	// make sure that for all streams that are down a SyncOp_Down msg is received
	req.Eventuallyf(func() bool {
		mu.Lock()
		count := len(streamDownMessages)
		mu.Unlock()

		return count == streamsDownCounter
	}, 20*time.Second, 100*time.Millisecond, "didn't receive for all streams a down message: %d != %d",
		streamsDownCounter, len(streamDownMessages))

	testfmt.Logf(t, "received SyncOp_Down message for all expected streams")

	// make sure that no more stream down messages are received
	req.Never(func() bool {
		mu.Lock()
		count := len(streamDownMessages)
		mu.Unlock()
		return count > streamsDownCounter
	}, 5*time.Second, 100*time.Millisecond, "received unexpected stream down message")

	// send a bunch of messages to streams and ensure that we messages are received streams that are up
	sendMessagesAndReceive(100, wallets, channels, req, client0, ctx, messages, func(streamID StreamId) bool {
		mu.Lock()
		defer mu.Unlock()

		_, found := streamDownMessages[streamID]
		return found
	})

	testfmt.Logf(t, "second message batch received")

	// resubscribe to the head on down streams and ensure that messages are received for all streams again
	mu.Lock()
	for streamID := range streamDownMessages {
		getStreamResp, err := client1.GetStream(ctx, connect.NewRequest(&protocol.GetStreamRequest{
			StreamId: streamID[:],
			Optional: false,
		}))
		req.NoError(err, "GetStream")

		_, err = client1.ModifySync(ctx, connect.NewRequest(&protocol.ModifySyncRequest{
			SyncId:     syncID,
			AddStreams: []*protocol.SyncCookie{getStreamResp.Msg.GetStream().GetNextSyncCookie()},
		}))
		req.NoError(err, "ModifySync")
	}
	mu.Unlock()

	testfmt.Logf(t, "resubscribed to streams that where brought down")

	// ensure that messages for all streams are received again
	sendMessagesAndReceive(100, wallets, channels, req, client0, ctx, messages, func(StreamId) bool { return false })

	testfmt.Logf(t, "third message batch received")

	// unsub from ~25% streams and ensure that no updates are received again
	unsubbedStreams := make(map[StreamId]struct{})
	rand.Shuffle(len(channels), func(i, j int) { channels[i], channels[j] = channels[j], channels[i] })
	for i, syncCookie := range channels {
		streamID, _ := StreamIdFromBytes(syncCookie.GetStreamId())
		_, err = client1.ModifySync(ctx, connect.NewRequest(&protocol.ModifySyncRequest{
			SyncId:        syncID,
			RemoveStreams: [][]byte{streamID[:]},
		}))
		req.NoError(err, "ModifySync")

		unsubbedStreams[streamID] = struct{}{}

		testfmt.Logf(t, "unsubbed from stream %s", streamID)

		if i > TestStreams/4 {
			break
		}
	}

	sendMessagesAndReceive(100, wallets, channels, req, client0, ctx, messages, func(streamID StreamId) bool {
		_, found := unsubbedStreams[streamID]
		return found
	})

	testfmt.Logf(t, "fourth message batch received")

	// resubscribe to the head on down streams and ensure that messages are received for all streams again
	mu.Lock()
	for streamID := range unsubbedStreams {
		getStreamResp, err := client1.GetStream(ctx, connect.NewRequest(&protocol.GetStreamRequest{
			StreamId: streamID[:],
			Optional: false,
		}))
		req.NoError(err, "GetStream")

		_, err = client1.ModifySync(ctx, connect.NewRequest(&protocol.ModifySyncRequest{
			SyncId:     syncID,
			AddStreams: []*protocol.SyncCookie{getStreamResp.Msg.GetStream().GetNextSyncCookie()},
		}))
		req.NoError(err, "ModifySync")
	}
	mu.Unlock()

	testfmt.Logf(t, "resubscribed to streams that where brought down")

	sendMessagesAndReceive(100, wallets, channels, req, client0, ctx, messages, func(streamID StreamId) bool {
		return false
	})

	testfmt.Logf(t, "fifth message batch received")

	// drop all streams from a node
	var (
		targetNodeAddr = services.nodes[4].address
		targetStreams  []StreamId
	)

	mu.Lock()
	streamDownMessages = map[StreamId]struct{}{}
	mu.Unlock()

	for _, pos := range syncPos {
		if bytes.Equal(pos.GetNodeAddress(), targetNodeAddr.Bytes()) {
			streamID, _ := StreamIdFromBytes(pos.GetStreamId())
			targetStreams = append(targetStreams, streamID)
		}
	}

	for _, targetStream := range targetStreams {
		_, err = client1.Info(ctx, connect.NewRequest(&protocol.InfoRequest{Debug: []string{
			"drop_stream",
			syncID,
			targetStream.String(),
		}}))
		req.NoError(err, "drop stream")
	}

	// make sure that for all streams that are down a SyncOp_Down msg is received
	req.Eventuallyf(func() bool {
		mu.Lock()
		count := len(streamDownMessages)
		mu.Unlock()

		return count == len(targetStreams)
	}, 20*time.Second, 100*time.Millisecond, "didn't receive for all streams a down message")

	testfmt.Logf(t, "received SyncOp_Down message for all expected streams")

	sendMessagesAndReceive(100, wallets, channels, req, client0, ctx, messages, func(streamID StreamId) bool {
		mu.Lock()
		_, found := streamDownMessages[streamID]
		mu.Unlock()
		return found
	})

	testfmt.Logf(t, "sixth message batch received")

	// make sure we can resubscribe to these streams
	for _, streamID := range targetStreams {
		getStreamResp, err := client1.GetStream(ctx, connect.NewRequest(&protocol.GetStreamRequest{
			StreamId: streamID[:],
			Optional: false,
		}))
		req.NoError(err, "GetStream")

		_, err = client1.ModifySync(ctx, connect.NewRequest(&protocol.ModifySyncRequest{
			SyncId:     syncID,
			AddStreams: []*protocol.SyncCookie{getStreamResp.Msg.GetStream().GetNextSyncCookie()},
		}))
		req.NoError(err, "ModifySync")
	}

	sendMessagesAndReceive(100, wallets, channels, req, client0, ctx, messages, func(streamID StreamId) bool {
		return false
	})

	testfmt.Logf(t, "seventh message batch received")

	_, err = client1.CancelSync(ctx, connect.NewRequest(&protocol.CancelSyncRequest{SyncId: syncID}))
	req.NoError(err, "cancel sync")

	testfmt.Logf(t, "Streams subscription cancelled")

	sendMessagesAndReceive(100, wallets, channels, req, client0, ctx, messages, func(streamID StreamId) bool {
		return true
	})

	testfmt.Logf(t, "eighth message batch received")

	// make sure that SyncOp_Close msg is received (messages is closed)
	req.Eventuallyf(func() bool {
		select {
		case _, gotMsg := <-messages:
			return !gotMsg
		default:
			return false
		}
	}, 20*time.Second, 100*time.Millisecond, "no SyncOp_Close message received")
}
