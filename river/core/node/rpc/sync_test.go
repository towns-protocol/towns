package rpc

import (
	"context"
	"fmt"
	"reflect"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"connectrpc.com/connect"
	"github.com/stretchr/testify/require"
	"github.com/towns-protocol/towns/core/node/crypto"
	. "github.com/towns-protocol/towns/core/node/events"
	"github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/protocol/protocolconnect"
	. "github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/testutils"
	"github.com/towns-protocol/towns/core/node/testutils/testfmt"
)

const defaultTimeout = 5 * time.Second

type syncClient struct {
	client  protocolconnect.StreamServiceClient
	syncId  string
	err     atomic.Pointer[error]
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
	c.err.Store(&err)
	if err != nil {
		c.errC <- err
	}
}

func (c *syncClient) sync(ctx context.Context, cookie *protocol.SyncCookie) {
	c.syncMany(ctx, []*protocol.SyncCookie{cookie})
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

func (sc *syncClients) checkDone(t *testing.T) {
	for i, client := range sc.clients {
		err := client.err.Load()
		if err == nil {
			t.Fatalf("sync client not done %d", i)
			return
		}
		if *err != nil {
			t.Fatalf("Error in sync client %d: %v", i, *err)
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

	var channelCookies []*protocol.SyncCookie

	for range 500 {
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

		// add 1 event to the channel
		addMessageToChannel(ctx, syncClient0, wallet, "hello", channelId, channelHash, require)

		channelCookies = append(channelCookies, channel)
	}

	// start sync session with all channels and ensure that for each stream an update is received with 1 message
	now := time.Now()
	syncClients.startSyncMany(t, ctx, channelCookies)
	syncClients.expectNUpdates(t, len(channelCookies), 30*time.Second, &updateOpts{events: 1, eventType: "ChannelPayload"})
	testfmt.Printf(t, "Received first update for all %d streams in init sync session took: %s", len(channelCookies), time.Since(now))

	syncClients.cancelAll(t, ctx)
	syncClients.checkDone(t)
}
