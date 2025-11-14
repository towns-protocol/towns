package syncer

import (
	"context"
	"testing"

	"github.com/stretchr/testify/require"
	"google.golang.org/protobuf/proto"

	"github.com/towns-protocol/towns/core/node/logging"
	"github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/utils/dynmsgbuf"
)

func TestLocalStreamUpdateEmitter_BackfillSuccess(t *testing.T) {
	ctx := context.Background()
	stream, wallet, _, view := newTestStream(t, ctx)
	subscriber := newFakeStreamSubscriber()

	emitterAny, err := NewLocalStreamUpdateEmitter(ctx, stream, wallet.Address, subscriber, 1, nil)
	require.NoError(t, err)
	emitter := emitterAny.(*localStreamUpdateEmitter)
	t.Cleanup(func() { emitter.Close() })

	target := []string{"sync-id"}
	require.True(t, emitter.EnqueueBackfill(view.SyncCookie(wallet.Address), target))

	update := subscriber.waitForUpdate(t)
	require.Equal(t, protocol.SyncOp_SYNC_UPDATE, update.GetSyncOp())
	require.Equal(t, target, update.GetTargetSyncIds())
	require.NotNil(t, update.GetStream())

	emitter.Close()

	_ = waitForOp(t, subscriber, protocol.SyncOp_SYNC_DOWN)
}

func TestLocalStreamUpdateEmitter_OnUpdate(t *testing.T) {
	ctx := context.Background()
	stream, wallet, _, _ := newTestStream(t, ctx)
	subscriber := newFakeStreamSubscriber()

	const version = 42
	emitterAny, err := NewLocalStreamUpdateEmitter(ctx, stream, wallet.Address, subscriber, version, nil)
	require.NoError(t, err)
	emitter := emitterAny.(*localStreamUpdateEmitter)
	t.Cleanup(func() { emitter.Close() })

	streamAndCookie := &protocol.StreamAndCookie{
		NextSyncCookie: &protocol.SyncCookie{StreamId: stream.StreamId().Bytes()},
		SyncReset:      true,
	}

	emitter.OnUpdate(stream.StreamId(), streamAndCookie)

	msg := subscriber.waitForMessage(t)
	require.Equal(t, version, msg.version)
	require.Equal(t, protocol.SyncOp_SYNC_UPDATE, msg.resp.GetSyncOp())
	require.True(t, proto.Equal(streamAndCookie, msg.resp.GetStream()))
	require.Empty(t, msg.resp.GetTargetSyncIds())
}

func TestLocalStreamUpdateEmitter_OnSyncDown(t *testing.T) {
	ctx := context.Background()
	stream, wallet, _, view := newTestStream(t, ctx)
	subscriber := newFakeStreamSubscriber()

	const version = 5
	emitterAny, err := NewLocalStreamUpdateEmitter(ctx, stream, wallet.Address, subscriber, version, nil)
	require.NoError(t, err)
	emitter := emitterAny.(*localStreamUpdateEmitter)
	defer emitter.Close()

	target := []string{"sync-1", "sync-2"}
	require.True(t, emitter.EnqueueBackfill(view.SyncCookie(wallet.Address), target))
	msg := subscriber.waitForMessage(t)
	require.Equal(t, protocol.SyncOp_SYNC_UPDATE, msg.resp.GetSyncOp())
	require.Equal(t, target, msg.resp.GetTargetSyncIds())
	require.Equal(t, version, msg.version)

	emitter.OnSyncDown(stream.StreamId())

	msg = subscriber.waitForMessage(t)
	require.Equal(t, protocol.SyncOp_SYNC_DOWN, msg.resp.GetSyncOp())
	require.Empty(t, msg.resp.GetTargetSyncIds())
	require.Equal(t, version, msg.version)
}

func TestLocalStreamUpdateEmitter_Cleanup(t *testing.T) {
	ctx := context.Background()
	stream, wallet, _, _ := newTestStream(t, ctx)
	subscriber := newFakeStreamSubscriber()

	reqs := []*backfillRequest{
		{cookie: &protocol.SyncCookie{StreamId: stream.StreamId().Bytes()}, syncIDs: []string{"a"}},
		{cookie: &protocol.SyncCookie{StreamId: stream.StreamId().Bytes()}, syncIDs: []string{"b", "c"}},
	}

	emitter := &localStreamUpdateEmitter{
		cancel:         func(error) {},
		log:            logging.NoopLogger(),
		localAddr:      wallet.Address,
		stream:         stream,
		subscriber:     subscriber,
		backfillsQueue: dynmsgbuf.NewDynamicBuffer[*backfillRequest](),
		version:        7,
	}

	for _, req := range reqs {
		require.NoError(t, emitter.backfillsQueue.AddMessage(req))
	}

	emitter.cleanup()

	require.True(t, emitter.backfillsQueue.IsClosed())

	var generalMsg *subscriberMsg
	targeted := make([][]string, 0, len(reqs))
	for i := 0; i < len(reqs)+1; i++ {
		msg := subscriber.waitForMessage(t)
		require.Equal(t, protocol.SyncOp_SYNC_DOWN, msg.resp.GetSyncOp())
		require.Equal(t, emitter.version, msg.version)
		require.Equal(t, stream.StreamId().Bytes(), msg.resp.GetStreamId())
		if len(msg.resp.GetTargetSyncIds()) == 0 {
			require.Nil(t, generalMsg)
			cp := msg
			generalMsg = &cp
			continue
		}
		targeted = append(targeted, msg.resp.GetTargetSyncIds())
	}

	require.NotNil(t, generalMsg)
	require.Equal(t, [][]string{reqs[0].syncIDs, reqs[1].syncIDs}, targeted)
}

func TestLocalStreamUpdateEmitter_MetadataMethods(t *testing.T) {
	ctx := context.Background()
	stream, wallet, streamID, _ := newTestStream(t, ctx)
	subscriber := newFakeStreamSubscriber()

	const version = 9
	emitterAny, err := NewLocalStreamUpdateEmitter(ctx, stream, wallet.Address, subscriber, version, nil)
	require.NoError(t, err)
	emitter := emitterAny.(*localStreamUpdateEmitter)
	t.Cleanup(func() { emitter.Close() })

	testCases := []struct {
		name   string
		assert func(*testing.T)
	}{
		{
			name: "StreamID",
			assert: func(t *testing.T) {
				require.Equal(t, streamID, emitter.StreamID())
			},
		},
		{
			name: "Node",
			assert: func(t *testing.T) {
				require.Equal(t, wallet.Address, emitter.Node())
			},
		},
		{
			name: "Version",
			assert: func(t *testing.T) {
				require.Equal(t, version, emitter.Version())
			},
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, tc.assert)
	}
}

func TestLocalStreamUpdateEmitter_ReAddUnprocessedBackfills(t *testing.T) {
	queue := dynmsgbuf.NewDynamicBuffer[*backfillRequest]()
	emitter := &localStreamUpdateEmitter{
		backfillsQueue: queue,
		log:            logging.NoopLogger(),
	}

	reqs := []*backfillRequest{
		{cookie: &protocol.SyncCookie{StreamId: []byte{0x01}}, syncIDs: []string{"a"}},
		{cookie: &protocol.SyncCookie{StreamId: []byte{0x02}}, syncIDs: []string{"b"}},
	}

	emitter.reAddUnprocessedBackfills(reqs)

	batch := queue.GetBatch(nil)
	require.Len(t, batch, len(reqs))
	require.Equal(t, reqs[0].syncIDs, batch[0].syncIDs)
	require.Equal(t, reqs[1].syncIDs, batch[1].syncIDs)
}

func TestLocalStreamUpdateEmitter_EnqueueAfterClose(t *testing.T) {
	ctx := context.Background()
	stream, wallet, _, view := newTestStream(t, ctx)
	subscriber := newFakeStreamSubscriber()

	emitterAny, err := NewLocalStreamUpdateEmitter(ctx, stream, wallet.Address, subscriber, 3, nil)
	require.NoError(t, err)
	emitter := emitterAny.(*localStreamUpdateEmitter)

	emitter.Close()
	_ = waitForOp(t, subscriber, protocol.SyncOp_SYNC_DOWN)
	require.False(t, emitter.EnqueueBackfill(view.SyncCookie(wallet.Address), []string{"sync"}))
}
