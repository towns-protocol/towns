package syncer

import (
	"context"
	"errors"
	"io"
	"sync/atomic"
	"testing"
	"time"

	"connectrpc.com/connect"
	"github.com/ethereum/go-ethereum/common"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
	"google.golang.org/protobuf/proto"

	"github.com/towns-protocol/towns/core/node/logging"
	"github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/testutils/mocks"
	"github.com/towns-protocol/towns/core/node/utils/dynmsgbuf"
)

func TestNewRemoteStreamUpdateEmitter_Success(t *testing.T) {
	t.Parallel()

	ctx := context.Background()
	stream, wallet, _, _ := newTestStream(t, ctx)

	remoteAddr := common.HexToAddress("0x00000000000000000000000000000000000000aa")
	stream.Reset(1, []common.Address{remoteAddr}, wallet.Address)

	subscriber := newFakeStreamSubscriber()
	syncID := "sync-success"

	messages := []*protocol.SyncStreamsResponse{
		{SyncOp: protocol.SyncOp_SYNC_NEW, SyncId: syncID},
		{SyncOp: protocol.SyncOp_SYNC_UPDATE, Stream: &protocol.StreamAndCookie{SyncReset: true}},
	}
	conn := newFakeStreamingClientConn(messages, io.EOF)
	serverStream := newServerStreamForClient(t, conn)

	client := newMockStreamServiceClient(t)
	client.On("SyncStreams", mock.Anything, mock.Anything).Return(serverStream, nil).Once()
	client.On("ModifySync", mock.Anything, mock.Anything).Return(connect.NewResponse(&protocol.ModifySyncResponse{}), nil).Maybe()
	client.On("PingSync", mock.Anything, mock.Anything).Return(connect.NewResponse(&protocol.PingSyncResponse{}), nil).Maybe()

	nodeRegistry := newMockNodeRegistry(t)
	nodeRegistry.On("GetStreamServiceClientForAddress", remoteAddr).Return(client, nil).Once()

	version := 11
	gotEmitter, err := NewRemoteStreamUpdateEmitter(ctx, stream, nodeRegistry, subscriber, version, nil)
	require.NoError(t, err)
	emitter := gotEmitter.(*remoteStreamUpdateEmitter)
	defer emitter.Close()

	require.Equal(t, syncID, emitter.SyncID())
	require.Equal(t, stream.StreamId(), emitter.StreamID())
	require.Equal(t, remoteAddr, emitter.Node())
	require.Equal(t, version, emitter.Version())

	updateMsg := subscriber.waitForMessage(t)
	require.Equal(t, protocol.SyncOp_SYNC_UPDATE, updateMsg.resp.GetSyncOp())
	require.Equal(t, version, updateMsg.version)

	downMsg := subscriber.waitForMessage(t)
	require.Equal(t, protocol.SyncOp_SYNC_DOWN, downMsg.resp.GetSyncOp())
	require.Equal(t, version, downMsg.version)
	require.Empty(t, downMsg.resp.GetTargetSyncIds())
}

func TestNewRemoteStreamUpdateEmitter_Errors(t *testing.T) {
	t.Parallel()

	ctx := context.Background()

	testCases := []struct {
		name  string
		setup func(t *testing.T, remote common.Address) *mocks.MockStreamServiceClient
	}{
		{
			name: "syncStreamsError",
			setup: func(t *testing.T, remote common.Address) *mocks.MockStreamServiceClient {
				client := newMockStreamServiceClient(t)
				client.On("SyncStreams", mock.Anything, mock.Anything).Return(nil, errors.New("sync call failed")).Once()
				return client
			},
		},
		{
			name: "noInitialMessage",
			setup: func(t *testing.T, remote common.Address) *mocks.MockStreamServiceClient {
				conn := newFakeStreamingClientConn(nil, io.EOF)
				srv := newServerStreamForClient(t, conn)
				client := newMockStreamServiceClient(t)
				client.On("SyncStreams", mock.Anything, mock.Anything).Return(srv, nil).Once()
				client.On("ModifySync", mock.Anything, mock.Anything).Return(connect.NewResponse(&protocol.ModifySyncResponse{}), nil).Maybe()
				return client
			},
		},
		{
			name: "unexpectedFirstOp",
			setup: func(t *testing.T, remote common.Address) *mocks.MockStreamServiceClient {
				messages := []*protocol.SyncStreamsResponse{{SyncOp: protocol.SyncOp_SYNC_UPDATE}}
				conn := newFakeStreamingClientConn(messages, io.EOF)
				srv := newServerStreamForClient(t, conn)
				client := newMockStreamServiceClient(t)
				client.On("SyncStreams", mock.Anything, mock.Anything).Return(srv, nil).Once()
				client.On("ModifySync", mock.Anything, mock.Anything).Return(connect.NewResponse(&protocol.ModifySyncResponse{}), nil).Maybe()
				return client
			},
		},
		{
			name: "emptySyncID",
			setup: func(t *testing.T, remote common.Address) *mocks.MockStreamServiceClient {
				messages := []*protocol.SyncStreamsResponse{{SyncOp: protocol.SyncOp_SYNC_NEW, SyncId: ""}}
				conn := newFakeStreamingClientConn(messages, io.EOF)
				srv := newServerStreamForClient(t, conn)
				client := newMockStreamServiceClient(t)
				client.On("SyncStreams", mock.Anything, mock.Anything).Return(srv, nil).Once()
				client.On("ModifySync", mock.Anything, mock.Anything).Return(connect.NewResponse(&protocol.ModifySyncResponse{}), nil).Maybe()
				return client
			},
		},
	}

	for _, tc := range testCases {
		caseName := tc.name
		t.Run(caseName, func(t *testing.T) {
			stream, wallet, _, _ := newTestStream(t, ctx)
			remoteAddr := common.HexToAddress("0x00000000000000000000000000000000000000bb")
			stream.Reset(1, []common.Address{remoteAddr}, wallet.Address)

			subscriber := newFakeStreamSubscriber()
			client := tc.setup(t, remoteAddr)
			nodeRegistry := newMockNodeRegistry(t)
			nodeRegistry.On("GetStreamServiceClientForAddress", remoteAddr).Return(client, nil).Once()

			_, err := NewRemoteStreamUpdateEmitter(ctx, stream, nodeRegistry, subscriber, 3, nil)
			require.Error(t, err)
		})
	}
}

func TestRemoteStreamUpdateEmitter_EnqueueBackfill(t *testing.T) {
	emitter := &remoteStreamUpdateEmitter{
		cancel:         func(error) {},
		log:            logging.NoopLogger(),
		backfillsQueue: dynmsgbuf.NewDynamicBuffer[*backfillRequest](),
	}

	cookie := &protocol.SyncCookie{StreamId: []byte{0x01}}
	ok := emitter.EnqueueBackfill(cookie, []string{"sync"})
	require.True(t, ok)

	select {
	case <-emitter.backfillsQueue.Wait():
		msgs := emitter.backfillsQueue.GetBatch(nil)
		require.Len(t, msgs, 1)
		require.Equal(t, cookie, msgs[0].cookie)
		require.Equal(t, []string{"sync"}, msgs[0].syncIDs)
	default:
		t.Fatal("expected queued message signal")
	}
}

func TestRemoteStreamUpdateEmitter_EnqueueBackfillQueueClosed(t *testing.T) {
	errCh := make(chan error, 1)
	queue := dynmsgbuf.NewDynamicBuffer[*backfillRequest]()
	queue.Close()

	emitter := &remoteStreamUpdateEmitter{
		cancel: func(err error) {
			select {
			case errCh <- err:
			default:
			}
		},
		log:            logging.NoopLogger(),
		backfillsQueue: queue,
	}

	ok := emitter.EnqueueBackfill(&protocol.SyncCookie{}, []string{"sync"})
	require.False(t, ok)

	var got error
	select {
	case got = <-errCh:
	case <-time.After(time.Second):
		t.Fatal("expected cancel invocation")
	}
	require.Error(t, got)
}

func TestRemoteStreamUpdateEmitter_Close(t *testing.T) {
	errCh := make(chan error, 1)
	emitter := &remoteStreamUpdateEmitter{
		cancel: func(err error) {
			select {
			case errCh <- err:
			default:
			}
		},
	}

	emitter.Close()
	select {
	case err := <-errCh:
		require.NoError(t, err)
	case <-time.After(time.Second):
		t.Fatal("expected cancel to be called")
	}
}

func TestRemoteStreamUpdateEmitter_Cleanup(t *testing.T) {
	ctx := context.Background()
	stream, wallet, _, _ := newTestStream(t, ctx)
	remoteAddr := common.HexToAddress("0x00000000000000000000000000000000000000cc")
	stream.Reset(1, []common.Address{remoteAddr}, wallet.Address)

	subscriber := newFakeStreamSubscriber()
	emitter := &remoteStreamUpdateEmitter{
		log:            logging.NoopLogger(),
		syncID:         "cleanup",
		streamID:       stream.StreamId(),
		remoteAddr:     remoteAddr,
		subscriber:     subscriber,
		backfillsQueue: dynmsgbuf.NewDynamicBuffer[*backfillRequest](),
		version:        4,
	}

	reqs := []*backfillRequest{
		{cookie: &protocol.SyncCookie{StreamId: stream.StreamId().Bytes()}, syncIDs: []string{"a"}},
		{cookie: &protocol.SyncCookie{StreamId: stream.StreamId().Bytes()}, syncIDs: []string{"b", "c"}},
	}
	for _, br := range reqs {
		require.NoError(t, emitter.backfillsQueue.AddMessage(br))
	}

	emitter.cleanup()

	general := subscriber.waitForMessage(t)
	require.Equal(t, protocol.SyncOp_SYNC_DOWN, general.resp.GetSyncOp())
	require.Empty(t, general.resp.GetTargetSyncIds())
	require.Equal(t, emitter.version, general.version)

	first := subscriber.waitForMessage(t)
	require.Equal(t, reqs[0].syncIDs, first.resp.GetTargetSyncIds())
	require.Equal(t, emitter.version, first.version)

	second := subscriber.waitForMessage(t)
	require.Equal(t, reqs[1].syncIDs, second.resp.GetTargetSyncIds())
	require.Equal(t, emitter.version, second.version)
}

func TestRemoteStreamUpdateEmitter_ProcessBackfillRequest(t *testing.T) {
	emitter := &remoteStreamUpdateEmitter{
		log:        logging.NoopLogger(),
		syncID:     "sync",
		remoteAddr: common.HexToAddress("0x00000000000000000000000000000000000000dd"),
		version:    1,
	}

	t.Run("success", func(t *testing.T) {
		calls := make(chan *protocol.ModifySyncRequest, 1)
		client := newMockStreamServiceClient(t)
		client.On("ModifySync", mock.Anything, mock.Anything).
			Run(func(args mock.Arguments) {
				req := args.Get(1).(*connect.Request[protocol.ModifySyncRequest])
				calls <- proto.Clone(req.Msg).(*protocol.ModifySyncRequest)
			}).
			Return(connect.NewResponse(&protocol.ModifySyncResponse{}), nil).
			Once()
		emitter.client = client

		req := &backfillRequest{
			cookie:  &protocol.SyncCookie{StreamId: []byte{0x01}},
			syncIDs: []string{"chain-1", "chain-2"},
		}

		require.NoError(t, emitter.processBackfillRequest(context.Background(), req))

		select {
		case call := <-calls:
			require.Equal(t, emitter.syncID, call.GetSyncId())
			require.Equal(t, req.syncIDs[0], call.GetBackfillStreams().GetSyncId())
			cookies := call.GetBackfillStreams().GetStreams()
			require.Len(t, cookies, 1)
			require.True(t, proto.Equal(req.cookie, cookies[0]))
		case <-time.After(time.Second):
			t.Fatal("expected modify sync call")
		}
	})

	t.Run("modifySyncError", func(t *testing.T) {
		expected := errors.New("boom")
		client := newMockStreamServiceClient(t)
		client.On("ModifySync", mock.Anything, mock.Anything).Return(nil, expected).Once()
		emitter.client = client

		req := &backfillRequest{cookie: &protocol.SyncCookie{}, syncIDs: []string{"sync"}}
		err := emitter.processBackfillRequest(context.Background(), req)
		require.Error(t, err)
	})

	t.Run("responseBackfillError", func(t *testing.T) {
		client := newMockStreamServiceClient(t)
		client.On("ModifySync", mock.Anything, mock.Anything).Return(connect.NewResponse(&protocol.ModifySyncResponse{
			Backfills: []*protocol.SyncStreamOpStatus{{
				Code:        int32(protocol.Err_UNAVAILABLE),
				NodeAddress: common.HexToAddress("0x00000000000000000000000000000000000000ff").Bytes(),
			}},
		}), nil).Once()
		emitter.client = client

		req := &backfillRequest{cookie: &protocol.SyncCookie{}, syncIDs: []string{"sync"}}
		err := emitter.processBackfillRequest(context.Background(), req)
		require.Error(t, err)
	})
}

func TestRemoteStreamUpdateEmitter_ProcessStreamUpdates(t *testing.T) {
	ctx := context.Background()
	stream, wallet, _, _ := newTestStream(t, ctx)
	remoteAddr := common.HexToAddress("0x0000000000000000000000000000000000000200")
	stream.Reset(1, []common.Address{remoteAddr}, wallet.Address)

	subscriber := newFakeStreamSubscriber()
	syncID := "process"
	messages := []*protocol.SyncStreamsResponse{
		{SyncOp: protocol.SyncOp_SYNC_UPDATE, Stream: &protocol.StreamAndCookie{}},
		{SyncOp: protocol.SyncOp_SYNC_DOWN},
	}
	serverStream := newServerStreamForClient(t, newFakeStreamingClientConn(messages, io.EOF))

	emitter := &remoteStreamUpdateEmitter{
		log:            logging.NoopLogger(),
		cancel:         func(error) {},
		syncID:         syncID,
		streamID:       stream.StreamId(),
		remoteAddr:     remoteAddr,
		subscriber:     subscriber,
		backfillsQueue: dynmsgbuf.NewDynamicBuffer[*backfillRequest](),
		version:        5,
	}

	emitter.processStreamUpdates(ctx, stream, serverStream)

	update := subscriber.waitForMessage(t)
	require.Equal(t, protocol.SyncOp_SYNC_UPDATE, update.resp.GetSyncOp())

	down := subscriber.waitForMessage(t)
	require.Equal(t, protocol.SyncOp_SYNC_DOWN, down.resp.GetSyncOp())
}

func TestRemoteStreamUpdateEmitter_ConnectionAliveTimeout(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	subscriber := newFakeStreamSubscriber()
	client := newMockStreamServiceClient(t)
	emitter := &remoteStreamUpdateEmitter{
		log:        logging.NoopLogger(),
		cancel:     func(err error) { cancel() },
		subscriber: subscriber,
		client:     client,
	}

	latest := &atomic.Value{}
	latest.Store(time.Now().Add(-time.Minute))

	done := make(chan struct{})
	go func() {
		emitter.connectionAlive(ctx, latest)
		close(done)
	}()

	select {
	case <-done:
	case <-time.After(5 * time.Second):
		t.Fatal("connectionAlive did not cancel")
	}
}

func TestRemoteStreamUpdateEmitter_ConnectionAlivePings(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	pingCount := make(chan struct{}, 1)
	clientPing := newMockStreamServiceClient(t)
	clientPing.On("PingSync", mock.Anything, mock.Anything).
		Run(func(args mock.Arguments) {
			pingCount <- struct{}{}
		}).
		Return(connect.NewResponse(&protocol.PingSyncResponse{}), nil).
		Maybe()

	emitter := &remoteStreamUpdateEmitter{
		log:    logging.NoopLogger(),
		cancel: func(err error) { cancel() },
		client: clientPing,
	}

	latest := &atomic.Value{}
	latest.Store(time.Now().Add(-20 * time.Second))

	done := make(chan struct{})
	go func() {
		emitter.connectionAlive(ctx, latest)
		close(done)
	}()

	select {
	case <-pingCount:
	case <-time.After(5 * time.Second):
		t.Fatal("expected ping")
	}

	cancel()
	<-done
}
