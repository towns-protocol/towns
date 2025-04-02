package rpc

import (
	"context"
	"errors"
	"fmt"
	"math/rand"
	"reflect"
	"slices"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"connectrpc.com/connect"
	"github.com/ethereum/go-ethereum/common"
	"github.com/stretchr/testify/require"

	. "github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/crypto"
	"github.com/towns-protocol/towns/core/node/events"
	. "github.com/towns-protocol/towns/core/node/events"
	"github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/protocol/protocolconnect"
	river_sync "github.com/towns-protocol/towns/core/node/rpc/sync"
	. "github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/testutils"
	"github.com/towns-protocol/towns/core/node/testutils/testfmt"
)

const defaultTimeout = 5 * time.Second

type syncClient struct {
	client  protocolconnect.StreamServiceClient
	syncId  string
	err     chan error
	errC    chan error
	syncIdC chan string
	updateC chan *protocol.StreamAndCookie
	downC   chan StreamId
	pongC   chan string
}

func (c *syncClient) syncMany(ctx context.Context, cookies []*protocol.SyncCookie) {
	req := &protocol.SyncStreamsRequest{}
	if len(cookies) > 0 {
		req.SyncPos = cookies
	}
	resp, err := c.client.SyncStreams(ctx, connect.NewRequest(req))
	if err == nil {
	syncLoop:
		for {
			if !resp.Receive() {
				break
			}

			msg := resp.Msg()
			switch msg.SyncOp {
			case protocol.SyncOp_SYNC_NEW:
				c.syncId = msg.SyncId
				c.syncIdC <- c.syncId
			case protocol.SyncOp_SYNC_CLOSE:
				break syncLoop
			case protocol.SyncOp_SYNC_UPDATE:
				c.updateC <- msg.Stream
			case protocol.SyncOp_SYNC_DOWN:
				streamId, err2 := StreamIdFromBytes(msg.StreamId)
				if err2 != nil {
					err = err2
					break syncLoop
				}
				c.downC <- streamId
			case protocol.SyncOp_SYNC_PONG:
				c.pongC <- msg.PongNonce
			case protocol.SyncOp_SYNC_UNSPECIFIED:
				fallthrough
			default:
				err = fmt.Errorf("unknown sync op: %v", msg.SyncOp)
				break syncLoop
			}
		}

		if err == nil {
			err = resp.Err()
		}
	}

	// Store pointer to error: if error is nil, sync is completed successfully
	// if error is not nil, sync failed
	c.err <- err
	if err != nil {
		c.errC <- err
	}
}

func (c *syncClient) sync(ctx context.Context, cookie *protocol.SyncCookie) {
	c.syncMany(ctx, []*protocol.SyncCookie{cookie})
}

func (c *syncClient) modify(t *testing.T, ctx context.Context, add []*protocol.SyncCookie, remove [][]byte) {
	resp, err := c.client.ModifySync(ctx, connect.NewRequest(&protocol.ModifySyncRequest{
		SyncId:        c.syncId,
		AddStreams:    add,
		RemoveStreams: remove,
	}))
	require.NoError(t, err, "failed to modify sync")
	require.Len(t, resp.Msg.GetAdds(), 0)
	require.Len(t, resp.Msg.GetRemovals(), 0)
}

func (c *syncClient) cancelSync(t *testing.T, ctx context.Context) {
	_, err := c.client.CancelSync(ctx, connect.NewRequest(&protocol.CancelSyncRequest{
		SyncId: c.syncId,
	}))
	require.NoError(t, err, "failed to cancel sync")
}

type syncClients struct {
	clients []*syncClient
	closed  bool
}

func makeSyncClients(tt *serviceTester, numNodes int) *syncClients {
	clients := make([]*syncClient, numNodes)
	for i := range numNodes {
		clients[i] = &syncClient{
			client:  tt.testClient(i),
			err:     make(chan error, 1),
			errC:    make(chan error, 100),
			syncIdC: make(chan string, 100),
			updateC: make(chan *protocol.StreamAndCookie, 100),
			downC:   make(chan StreamId, 100),
			pongC:   make(chan string, 100),
		}
	}

	return &syncClients{clients: clients}
}

func (sc *syncClients) startSyncMany(t *testing.T, ctx context.Context, cookies []*protocol.SyncCookie) {
	for _, client := range sc.clients {
		go client.syncMany(ctx, cookies)
	}

	t.Cleanup(func() {
		sc.cancelAll(t, ctx)
	})

	for i, client := range sc.clients {
		select {
		case <-client.syncIdC:
			// Received syncId, continue
		case err := <-client.errC:
			t.Fatalf("Error in sync client %d: %v", i, err)
			return
		case <-time.After(defaultTimeout):
			t.Fatalf("Timeout waiting for syncId from client %d", i)
			return
		}
	}
}

func (sc *syncClients) startSync(t *testing.T, ctx context.Context, cookie *protocol.SyncCookie) {
	for _, client := range sc.clients {
		go client.sync(ctx, cookie)
	}

	t.Cleanup(func() {
		sc.cancelAll(t, ctx)
	})

	for i, client := range sc.clients {
		select {
		case <-client.syncIdC:
			// Received syncId, continue
		case err := <-client.errC:
			t.Fatalf("Error in sync client %d: %v", i, err)
			return
		case <-time.After(defaultTimeout):
			t.Fatalf("Timeout waiting for syncId from client %d", i)
			return
		}
	}
}

func (sc *syncClients) modifySync(t *testing.T, ctx context.Context, add []*protocol.SyncCookie, remove [][]byte) {
	for _, client := range sc.clients {
		go client.modify(t, ctx, add, remove)
	}
}

func (sc *syncClients) checkDone(t *testing.T) {
	for i, client := range sc.clients {
		err := <-client.err
		if err != nil {
			t.Fatalf("Error in sync client %d: %v", i, err)
			return
		}
		// Check that all updates and pongs are consumed
		select {
		case update := <-client.updateC:
			t.Fatalf("Unexpected update remaining for client %d: %v", i, update)
		case down := <-client.downC:
			t.Fatalf("Unexpected down remaining for client %d: %v", i, down)
		case pong := <-client.pongC:
			t.Fatalf("Unexpected pong remaining for client %d: %v", i, pong)
		default:
			// No updates or pongs remaining, which is expected
		}
	}
}

func (sc *syncClients) expectOneUpdate(t *testing.T, opts *updateOpts) {
	t.Helper()
	timer := time.NewTimer(defaultTimeout)
	defer timer.Stop()

	for i, client := range sc.clients {
		select {
		case update := <-client.updateC:
			checkUpdate(t, update, opts)
			if t.Failed() {
				return
			}
		case <-timer.C:
			t.Fatalf("Timeout waiting for update on client %d", i)
			return
		}
	}
}

func (sc *syncClients) expectNUpdates(
	t *testing.T,
	wantedUniqueStreamsWithUpdates int,
	timeout time.Duration,
	opts *updateOpts,
) {
	t.Helper()
	timer := time.NewTimer(timeout)
	defer timer.Stop()

	uniqueStreamsWithUpdates := make(map[StreamId]struct{})

	for i, client := range sc.clients {
		for len(uniqueStreamsWithUpdates) < wantedUniqueStreamsWithUpdates {
			select {
			case update := <-client.updateC:
				checkUpdate(t, update, opts)
				if t.Failed() {
					return
				}

				streamID, _ := StreamIdFromBytes(update.GetNextSyncCookie().GetStreamId())
				uniqueStreamsWithUpdates[streamID] = struct{}{}
			case <-timer.C:
				t.Fatalf("Timeout waiting for update on client %d", i)
				return
			}
		}
	}
}

func (sc *syncClients) cancelAll(t *testing.T, ctx context.Context) {
	t.Helper()
	if sc.closed {
		return
	}
	sc.closed = true
	for _, client := range sc.clients {
		client.cancelSync(t, ctx)
	}
}

type updateOpts struct {
	mbs       int
	events    int
	eventType string
}

func getPayloadType(event *protocol.StreamEvent) string {
	if event == nil || event.Payload == nil {
		return "nil"
	}

	// Get the type of the payload
	payloadType := reflect.TypeOf(event.Payload)

	// If it's a pointer, get the element it points to
	if payloadType.Kind() == reflect.Ptr {
		payloadType = payloadType.Elem()
	}

	typeName := payloadType.Name()
	typeName = strings.TrimPrefix(typeName, "StreamEvent_")
	return typeName
}

func checkUpdate(t *testing.T, update *protocol.StreamAndCookie, opts *updateOpts) {
	t.Helper()
	require.NotNil(t, update)
	if opts == nil {
		return
	}
	updateStr := fmt.Sprintf("ev: %d, mb: %d", len(update.Events), len(update.Miniblocks))
	for _, e := range update.Events {
		// Parse event
		parsedEvent, err := ParseEvent(e)
		if err != nil {
			t.Errorf("Failed to parse event: %v", err)
			return
		}
		eventType := getPayloadType(parsedEvent.Event)
		updateStr += fmt.Sprintf("\n    %s", eventType)
		if opts.eventType != "" && eventType != opts.eventType {
			t.Fatalf("Unexpected event type: %s", updateStr)
			return
		}
	}
	if opts.mbs >= 0 {
		require.Len(t, update.Miniblocks, opts.mbs, "checkUpdate: update: %s", updateStr)
	}
	if opts.events >= 0 {
		require.Len(t, update.Events, opts.events, "checkUpdate: update: %s", updateStr)
	}
}

func TestSyncWithFlush(t *testing.T) {
	numNodes := 10
	tt := newServiceTester(t, serviceTesterOpts{numNodes: numNodes, start: true})
	ctx := tt.ctx
	require := tt.require

	syncClients := makeSyncClients(tt, numNodes)
	client0 := syncClients.clients[0].client

	wallet, err := crypto.NewWallet(ctx)
	require.NoError(err)
	streamId, cookie, _, err := createUserSettingsStream(
		ctx,
		wallet,
		client0,
		&protocol.StreamSettings{
			DisableMiniblockCreation: true,
		},
	)
	require.NoError(err)

	syncClients.startSync(t, ctx, cookie)

	syncClients.expectOneUpdate(t, &updateOpts{})

	require.NoError(addUserBlockedFillerEvent(ctx, wallet, client0, streamId, MiniblockRefFromCookie(cookie)))
	syncClients.expectOneUpdate(t, &updateOpts{events: 1, eventType: "UserSettingsPayload"})

	mbRef, err := makeMiniblock(ctx, client0, streamId, false, 0)
	require.NoError(err)
	require.NotEmpty(mbRef.Hash)
	require.Equal(int64(1), mbRef.Num)
	syncClients.expectOneUpdate(t, &updateOpts{events: 1, eventType: "MiniblockHeader"})

	var cacheCleanupTotal CacheCleanupResult
	for i := 0; i < 10; i++ {
		cacheCleanupResult := tt.nodes[i].service.cache.CacheCleanup(ctx, true, -1*time.Hour)
		cacheCleanupTotal.TotalStreams += cacheCleanupResult.TotalStreams
		cacheCleanupTotal.UnloadedStreams += cacheCleanupResult.UnloadedStreams
	}
	require.Equal(1, cacheCleanupTotal.TotalStreams)
	require.Equal(1, cacheCleanupTotal.UnloadedStreams)

	require.NoError(addUserBlockedFillerEvent(ctx, wallet, client0, streamId, mbRef))
	syncClients.expectOneUpdate(t, &updateOpts{events: 1, eventType: "UserSettingsPayload"})

	mbRef, err = makeMiniblock(ctx, client0, streamId, false, mbRef.Num)
	require.NoError(err)
	require.NotEmpty(mbRef.Hash)
	require.Equal(int64(2), mbRef.Num)
	syncClients.expectOneUpdate(t, &updateOpts{events: 1, eventType: "MiniblockHeader"})

	syncClients.cancelAll(t, ctx)
	syncClients.checkDone(t)
}

// TestSyncWithManyStreams ensures that when starting a sync session with a lot of initial streams
// the client receives for each stream an update and the sync session remains valid.
func TestSyncWithManyStreams(t *testing.T) {
	numNodes := 10
	tt := newServiceTester(t, serviceTesterOpts{numNodes: numNodes, start: true})
	ctx := tt.ctx
	require := tt.require

	syncClients := makeSyncClients(tt, 1)
	syncClient0 := syncClients.clients[0].client

	wallet, err := crypto.NewWallet(ctx)
	require.NoError(err)
	resuser, _, err := createUser(ctx, wallet, syncClient0, nil)
	require.NoError(err)
	require.NotNil(resuser)

	_, _, err = createUserMetadataStream(ctx, wallet, syncClient0, nil)
	require.NoError(err)

	// create space with 500 channels and add 1 event to each channel
	spaceId := testutils.FakeStreamId(STREAM_SPACE_BIN)
	_, _, err = createSpace(ctx, wallet, syncClient0, spaceId, &protocol.StreamSettings{})
	require.NoError(err)

	produceChannel := func() (*protocol.SyncCookie, *MiniblockRef) {
		channelId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
		channel, channelHash, err := createChannel(
			ctx,
			wallet,
			syncClient0,
			spaceId,
			channelId,
			&protocol.StreamSettings{DisableMiniblockCreation: true},
		)
		require.NoError(err)
		require.NotNil(channel)
		b0ref, err := makeMiniblock(ctx, syncClient0, channelId, false, -1)
		require.NoError(err)
		require.Equal(int64(0), b0ref.Num)
		return channel, channelHash
	}

	var channelCookies []*protocol.SyncCookie
	for range 500 {
		channel, channelHash := produceChannel()

		// add 1 event to the channel
		addMessageToChannel(ctx, syncClient0, wallet, "hello", StreamId(channel.StreamId), channelHash, require)

		channelCookies = append(channelCookies, channel)
	}

	// start sync session with all channels and ensure that for each stream an update is received with 1 message
	now := time.Now()
	syncClients.startSyncMany(t, ctx, channelCookies)
	syncClients.expectNUpdates(t, len(channelCookies), 30*time.Second, &updateOpts{events: 1, eventType: "ChannelPayload"})
	testfmt.Printf(t, "Received first update for all %d streams in init sync session took: %s", len(channelCookies), time.Since(now))

	// create more streams and add them to the sync via the modify sync endpoint
	var add []*protocol.SyncCookie
	for range 500 {
		channel, channelHash := produceChannel()

		// add 1 event to the channel
		addMessageToChannel(ctx, syncClient0, wallet, "hello", StreamId(channel.StreamId), channelHash, require)

		add = append(add, channel)
	}

	// remove half of the previously added streams and send one more message to the remaining half
	var remove [][]byte
	for _, existingStream := range channelCookies[:len(channelCookies)/2] {
		remove = append(remove, existingStream.GetStreamId())
	}
	for _, existingStream := range channelCookies[len(channelCookies)/2:] {
		res, err := syncClient0.GetLastMiniblockHash(ctx, connect.NewRequest(&protocol.GetLastMiniblockHashRequest{
			StreamId: existingStream.GetStreamId(),
		}))
		require.NoError(err)

		addMessageToChannel(
			ctx,
			syncClient0,
			wallet,
			"hello",
			StreamId(existingStream.GetStreamId()),
			&MiniblockRef{
				Hash: common.BytesToHash(res.Msg.Hash),
				Num:  res.Msg.MiniblockNum,
			},
			require,
		)
	}

	// send modify sync request
	syncClients.modifySync(t, ctx, add, remove)
	syncClients.expectNUpdates(t, len(add)+len(channelCookies[len(channelCookies)/2:]), 30*time.Second, &updateOpts{events: 1, eventType: "ChannelPayload"})
	testfmt.Printf(t, "Received second update for all %d streams in init sync session took: %s", len(channelCookies), time.Since(now))

	// add two same streams in the modify sync request and expect error
	t.Run("duplicate add streams", func(t *testing.T) {
		channel, _ := produceChannel()
		_, err = syncClient0.ModifySync(ctx, connect.NewRequest(&protocol.ModifySyncRequest{
			SyncId:     syncClients.clients[0].syncId,
			AddStreams: []*protocol.SyncCookie{channel, channel},
		}))
		require.Error(err)
		require.Equal(connect.CodeAlreadyExists, connect.CodeOf(err))
	})

	// remove two same streams in the modify sync request and expect error
	t.Run("duplicate remove streams", func(t *testing.T) {
		_, err = syncClient0.ModifySync(ctx, connect.NewRequest(&protocol.ModifySyncRequest{
			SyncId: syncClients.clients[0].syncId,
			RemoveStreams: [][]byte{
				channelCookies[len(channelCookies)-1].StreamId,
				channelCookies[len(channelCookies)-1].StreamId,
			},
		}))
		require.Error(err)
		require.Equal(connect.CodeAlreadyExists, connect.CodeOf(err))
	})

	// passing the same stream in add and remove streams in the modify sync request and expect error
	t.Run("same stream in remove and add", func(t *testing.T) {
		channel, _ := produceChannel()
		_, err = syncClient0.ModifySync(ctx, connect.NewRequest(&protocol.ModifySyncRequest{
			SyncId:        syncClients.clients[0].syncId,
			AddStreams:    []*protocol.SyncCookie{channel},
			RemoveStreams: [][]byte{channel.StreamId},
		}))
		require.Error(err)
		require.Equal(connect.CodeInvalidArgument, connect.CodeOf(err))
	})

	// finish testing
	syncClients.cancelAll(t, ctx)
	syncClients.checkDone(t)
}

// TestSyncWithEmptyNodeAddress tests that the sync service can handle an empty node address by using sticky peer.
func TestSyncWithEmptyNodeAddress(t *testing.T) {
	numNodes := 10
	tt := newServiceTester(t, serviceTesterOpts{numNodes: numNodes, start: true})
	ctx := tt.ctx
	require := tt.require

	syncClients := makeSyncClients(tt, 1)
	syncClient0 := syncClients.clients[0].client

	wallet, err := crypto.NewWallet(ctx)
	require.NoError(err)
	resuser, _, err := createUser(ctx, wallet, syncClient0, nil)
	require.NoError(err)
	require.NotNil(resuser)

	_, _, err = createUserMetadataStream(ctx, wallet, syncClient0, nil)
	require.NoError(err)

	// create space with 500 channels and add 1 event to each channel
	spaceId := testutils.FakeStreamId(STREAM_SPACE_BIN)
	_, _, err = createSpace(ctx, wallet, syncClient0, spaceId, &protocol.StreamSettings{})
	require.NoError(err)

	produceChannel := func() (*protocol.SyncCookie, *MiniblockRef) {
		channelId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
		channel, channelHash, err := createChannel(
			ctx,
			wallet,
			syncClient0,
			spaceId,
			channelId,
			&protocol.StreamSettings{DisableMiniblockCreation: true},
		)
		require.NoError(err)
		require.NotNil(channel)
		b0ref, err := makeMiniblock(ctx, syncClient0, channelId, false, -1)
		require.NoError(err)
		require.Equal(int64(0), b0ref.Num)

		// do not specify the node address to force the sync service to use sticky peer
		return &protocol.SyncCookie{
			StreamId:          channel.GetStreamId(),
			MinipoolGen:       channel.GetMinipoolGen(),
			PrevMiniblockHash: channel.GetPrevMiniblockHash(),
		}, channelHash
	}

	var channelCookies []*protocol.SyncCookie
	for range 50 {
		channel, channelHash := produceChannel()
		addMessageToChannel(ctx, syncClient0, wallet, "hello", StreamId(channel.StreamId), channelHash, require)
		channelCookies = append(channelCookies, channel)
	}

	// start sync session with all channels and ensure that for each stream an update is received with 1 message
	now := time.Now()
	syncClients.startSyncMany(t, ctx, channelCookies)
	syncClients.expectNUpdates(t, len(channelCookies), 30*time.Second, &updateOpts{events: 1, eventType: "ChannelPayload"})
	testfmt.Printf(t, "Received first update for all %d streams in init sync session took: %s", len(channelCookies), time.Since(now))

	// create more streams and add them to the sync via the modify sync endpoint
	var add []*protocol.SyncCookie
	for range 50 {
		channel, channelHash := produceChannel()
		addMessageToChannel(ctx, syncClient0, wallet, "hello", StreamId(channel.StreamId), channelHash, require)
		add = append(add, channel)
	}

	// remove half of the previously added streams and send one more message to the remaining half
	var remove [][]byte
	for _, existingStream := range channelCookies[:len(channelCookies)/2] {
		remove = append(remove, existingStream.GetStreamId())
	}
	for _, existingStream := range channelCookies[len(channelCookies)/2:] {
		res, err := syncClient0.GetLastMiniblockHash(ctx, connect.NewRequest(&protocol.GetLastMiniblockHashRequest{
			StreamId: existingStream.GetStreamId(),
		}))
		require.NoError(err)

		addMessageToChannel(
			ctx,
			syncClient0,
			wallet,
			"hello",
			StreamId(existingStream.GetStreamId()),
			&MiniblockRef{
				Hash: common.BytesToHash(res.Msg.Hash),
				Num:  res.Msg.MiniblockNum,
			},
			require,
		)
	}

	// send modify sync request
	syncClients.modifySync(t, ctx, add, remove)
	syncClients.expectNUpdates(t, len(add)+len(channelCookies[len(channelCookies)/2:]), 30*time.Second, &updateOpts{events: 1, eventType: "ChannelPayload"})
	testfmt.Printf(t, "Received second update for all %d streams in init sync session took: %s", len(channelCookies), time.Since(now))

	// finish testing
	syncClients.cancelAll(t, ctx)
	syncClients.checkDone(t)
}

func TestModifySyncWithWrongCookie(t *testing.T) {
	tt := newServiceTester(t, serviceTesterOpts{numNodes: 2, start: true})

	alice := tt.newTestClient(0, testClientOpts{enableSync: true})
	cookie := alice.createUserStreamGetCookie()

	alice.startSync()

	// Replace node address in the cookie with the address of the other node
	if common.BytesToAddress(cookie.NodeAddress) == tt.nodes[0].address {
		cookie.NodeAddress = tt.nodes[1].address.Bytes()
	} else {
		cookie.NodeAddress = tt.nodes[0].address.Bytes()
	}

	testfmt.Print(t, "Modifying sync with wrong cookie")
	resp, err := alice.client.ModifySync(alice.ctx, connect.NewRequest(&protocol.ModifySyncRequest{
		SyncId:     alice.SyncID(),
		AddStreams: []*protocol.SyncCookie{cookie},
	}))
	tt.require.NoError(err)
	tt.require.Len(resp.Msg.GetAdds(), 0)
	tt.require.Len(resp.Msg.GetRemovals(), 0)
}

func TestAddStreamToSyncWithWrongCookie(t *testing.T) {
	tt := newServiceTester(t, serviceTesterOpts{numNodes: 2, start: true})

	alice := tt.newTestClient(0, testClientOpts{enableSync: true})
	_ = alice.createUserStreamGetCookie()
	spaceId, _ := alice.createSpace()
	channelId, _, cookie := alice.createChannel(spaceId)

	alice.say(channelId, "hello from Alice")

	alice.startSync()

	// Replace node address in the cookie with the address of the other node
	if common.BytesToAddress(cookie.NodeAddress) == tt.nodes[0].address {
		cookie.NodeAddress = tt.nodes[1].address.Bytes()
	} else {
		cookie.NodeAddress = tt.nodes[0].address.Bytes()
	}

	testfmt.Print(t, "AddStreamToSync with wrong node address in cookie")
	_, err := alice.client.AddStreamToSync(alice.ctx, connect.NewRequest(&protocol.AddStreamToSyncRequest{
		SyncId:  alice.SyncID(),
		SyncPos: cookie,
	}))
	tt.require.NoError(err)
	testfmt.Print(t, "AddStreamToSync with wrong node address in cookie done")
}

func TestStartSyncWithWrongCookie(t *testing.T) {
	tt := newServiceTester(t, serviceTesterOpts{numNodes: 2, start: true})

	alice := tt.newTestClient(0, testClientOpts{enableSync: false})
	_ = alice.createUserStreamGetCookie()
	spaceId, _ := alice.createSpace()
	channelId, _, cookie := alice.createChannel(spaceId)

	// Replace node address in the cookie with the address of the other node
	if common.BytesToAddress(cookie.NodeAddress) == tt.nodes[0].address {
		cookie.NodeAddress = tt.nodes[1].address.Bytes()
	} else {
		cookie.NodeAddress = tt.nodes[0].address.Bytes()
	}

	alice.say(channelId, "hello from Alice")

	testfmt.Print(t, "StartSync with wrong cookie")
	syncCtx, syncCancel := context.WithTimeout(alice.ctx, 10*time.Second)
	defer syncCancel()
	updates, err := alice.client.SyncStreams(syncCtx, connect.NewRequest(&protocol.SyncStreamsRequest{
		SyncPos: []*protocol.SyncCookie{cookie},
	}))
	tt.require.NoError(err)
	testfmt.Print(t, "StartSync with wrong cookie done")

	for updates.Receive() {
		msg := updates.Msg()
		if msg.GetSyncOp() == protocol.SyncOp_SYNC_UPDATE &&
			testutils.StreamIdFromBytes(msg.GetStream().GetNextSyncCookie().GetStreamId()) == channelId {
			syncCancel()
		}
	}
	tt.require.ErrorIs(updates.Err(), context.Canceled)
}

// TestStreamSyncPingPong test stream sync subscription ping/pong
func TestStreamSyncPingPong(t *testing.T) {
	var (
		req      = require.New(t)
		services = newServiceTester(t, serviceTesterOpts{numNodes: 2, start: true})
		client   = services.testClient(0)
		ctx      = services.ctx
		mu       sync.Mutex
		pongs    []string
		syncID   string
	)

	// create stream sub
	syncRes, err := client.SyncStreams(ctx, connect.NewRequest(&protocol.SyncStreamsRequest{SyncPos: nil}))
	req.NoError(err, "sync streams")

	pings := []string{"ping1", "ping2", "ping3", "ping4", "ping5"}
	sendPings := func() {
		for _, ping := range pings {
			_, err := client.PingSync(ctx, connect.NewRequest(&protocol.PingSyncRequest{SyncId: syncID, Nonce: ping}))
			req.NoError(err, "ping sync")
		}
	}

	go func() {
		for syncRes.Receive() {
			msg := syncRes.Msg()
			switch msg.GetSyncOp() {
			case protocol.SyncOp_SYNC_NEW:
				syncID = msg.GetSyncId()
				// send some pings and ensure all pongs are received
				sendPings()
			case protocol.SyncOp_SYNC_PONG:
				req.NotEmpty(syncID, "expected non-empty sync id")
				req.Equal(syncID, msg.GetSyncId(), "sync id")
				mu.Lock()
				pongs = append(pongs, msg.GetPongNonce())
				mu.Unlock()
			case protocol.SyncOp_SYNC_CLOSE, protocol.SyncOp_SYNC_DOWN,
				protocol.SyncOp_SYNC_UNSPECIFIED, protocol.SyncOp_SYNC_UPDATE:
				continue
			default:
				t.Errorf("unexpected sync operation %s", msg.GetSyncOp())
				return
			}
		}
	}()

	req.Eventuallyf(func() bool {
		mu.Lock()
		defer mu.Unlock()
		return slices.Equal(pings, pongs)
	}, 20*time.Second, 100*time.Millisecond, "didn't receive all pongs in reasonable time or out of order")
}

type slowStreamsResponseSender struct {
	sendDuration time.Duration
}

func (s slowStreamsResponseSender) Send(msg *protocol.SyncStreamsResponse) error {
	time.Sleep(s.sendDuration)
	return nil
}

// TestSyncSubscriptionWithTooSlowClient ensures that a sync operation cancels itself when a subscriber isn't able to
// keep up with sync updates.
func TestSyncSubscriptionWithTooSlowClient(t *testing.T) {
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
	spaceID := testutils.FakeStreamId(STREAM_SPACE_BIN)
	resspace, _, err := createSpace(ctx, wallets[0], client0, spaceID, nil)
	req.NoError(err)
	req.NotNil(resspace, "create space sync cookie")

	// create enough channels that they will be distributed among local and remote nodes
	for range TestStreams {
		channelId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
		channel, _, err := createChannel(ctx, wallets[0], client0, spaceID, channelId, nil)
		req.NoError(err)
		req.NotNil(channel, "nil create channel sync cookie")
		channels = append(channels, channel)
	}

	// subscribe to channel updates on node 1 direct through a sync op to have better control over it
	testfmt.Logf(t, "subscribe on node %s", node1.address)
	syncPos := append(users, channels...)
	syncOp, err := river_sync.NewStreamsSyncOperation(
		ctx, syncID, node1.address, node1.service.cache, node1.service.nodeRegistry, nil)
	req.NoError(err, "NewStreamsSyncOperation")

	syncOpResult := make(chan error)
	syncOpStopped := atomic.Bool{}

	// run the subscription in the background that takes a long time for each update to send to the client.
	// this must cancel the sync op with a buffer too full error.
	go func() {
		slowSubscriber := slowStreamsResponseSender{sendDuration: 250 * time.Millisecond}
		syncOpErr := syncOp.Run(connect.NewRequest(&protocol.SyncStreamsRequest{SyncPos: syncPos}), slowSubscriber)
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
				events.Make_UserPayload_Membership(protocol.MembershipOp_SO_JOIN, channelId, nil, spaceID[:]),
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
			req.Nil(resp.Msg.GetError())
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
