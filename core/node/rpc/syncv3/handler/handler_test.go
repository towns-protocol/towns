package handler

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/stretchr/testify/require"

	"github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/testutils"
)

func TestSyncStreamHandlerImpl_Run(t *testing.T) {
	t.Run("initial send error", func(t *testing.T) {
		env := newHandlerTestEnv(t)
		sendErr := errors.New("send failure")
		env.receiver.SetErrAt(1, sendErr)

		err := env.handler.Run()
		require.ErrorIs(t, err, sendErr)

		msgs := env.receiver.Messages()
		require.Len(t, msgs, 1)
		require.Equal(t, protocol.SyncOp_SYNC_NEW, msgs[0].GetSyncOp())
		require.Equal(t, env.handler.syncID, msgs[0].GetSyncId())

		require.Equal(t, []string{env.handler.syncID}, env.eventBus.RemoveCalls())
	})

	t.Run("process batch and close", func(t *testing.T) {
		env := newHandlerTestEnv(t)

		update := &protocol.SyncStreamsResponse{SyncOp: protocol.SyncOp_SYNC_UPDATE}
		closeMsg := &protocol.SyncStreamsResponse{SyncOp: protocol.SyncOp_SYNC_CLOSE}
		require.NoError(t, env.streamUpdates.AddMessage(update))
		require.NoError(t, env.streamUpdates.AddMessage(closeMsg))

		err := env.handler.Run()
		require.ErrorIs(t, context.Canceled, err)

		msgs := env.receiver.Messages()
		require.Len(t, msgs, 3)
		require.Equal(t, protocol.SyncOp_SYNC_NEW, msgs[0].GetSyncOp())
		require.Equal(t, protocol.SyncOp_SYNC_UPDATE, msgs[1].GetSyncOp())
		require.Equal(t, protocol.SyncOp_SYNC_CLOSE, msgs[2].GetSyncOp())
		require.Equal(t, env.handler.syncID, msgs[1].GetSyncId())
		require.Equal(t, env.handler.syncID, msgs[2].GetSyncId())

		require.Equal(t, 1, env.cancelCount())
		require.Nil(t, env.cancelErrAt(0))
		require.ErrorIs(t, context.Cause(env.ctx), context.Canceled)
		require.Equal(t, []string{env.handler.syncID}, env.eventBus.RemoveCalls())
	})

	t.Run("buffer closed", func(t *testing.T) {
		env := newHandlerTestEnv(t)
		env.streamUpdates.Close()

		err := env.handler.Run()
		require.NoError(t, err)

		msgs := env.receiver.Messages()
		require.Len(t, msgs, 2)
		require.Equal(t, protocol.SyncOp_SYNC_NEW, msgs[0].GetSyncOp())
		require.Equal(t, protocol.SyncOp_SYNC_CLOSE, msgs[1].GetSyncOp())
		require.Equal(t, env.handler.syncID, msgs[1].GetSyncId())
		require.Equal(t, []string{env.handler.syncID}, env.eventBus.RemoveCalls())
	})
}

func TestSyncStreamHandlerImpl_SyncID(t *testing.T) {
	env := newHandlerTestEnv(t)
	env.handler.syncID = "custom-sync"

	require.Equal(t, "custom-sync", env.handler.SyncID())
}

func TestSyncStreamHandlerImpl_Modify(t *testing.T) {
	t.Run("validation failure", func(t *testing.T) {
		env := newHandlerTestEnv(t)
		_, err := env.handler.Modify(context.Background(), &protocol.ModifySyncRequest{})
		require.Error(t, err)
		var riverErr *base.RiverErrorImpl
		require.True(t, errors.As(err, &riverErr))
		require.Equal(t, protocol.Err_INVALID_ARGUMENT, riverErr.Code)
	})

	t.Run("stream not found in cache returns error in response", func(t *testing.T) {
		env := newHandlerTestEnv(t)

		addID := testutils.FakeStreamId(shared.STREAM_CHANNEL_BIN)
		// Do not add the stream to the cache - it should return an error in the response

		req := &protocol.ModifySyncRequest{
			AddStreams: []*protocol.SyncCookie{{StreamId: addID.Bytes()}},
		}

		res, err := env.handler.Modify(context.Background(), req)
		require.NoError(t, err)

		// Error should be in the response, not returned as an error
		require.Len(t, res.Adds, 1)
		require.Equal(t, addID.Bytes(), res.Adds[0].GetStreamId())
		require.Equal(t, int32(protocol.Err_NOT_FOUND), res.Adds[0].GetCode())

		// EnqueueSubscribe should not have been called since stream wasn't in cache
		require.Empty(t, env.eventBus.SubscribeCalls())
	})

	t.Run("partial success with mixed streams", func(t *testing.T) {
		env := newHandlerTestEnv(t)

		existingID := testutils.FakeStreamId(shared.STREAM_CHANNEL_BIN)
		missingID := testutils.FakeStreamId(shared.STREAM_CHANNEL_BIN)

		// Only add one stream to the cache
		env.streamCache.AddStream(existingID)

		req := &protocol.ModifySyncRequest{
			AddStreams: []*protocol.SyncCookie{
				{StreamId: existingID.Bytes()},
				{StreamId: missingID.Bytes()},
			},
		}

		res, err := env.handler.Modify(context.Background(), req)
		require.NoError(t, err)

		// Only the missing stream should have an error
		require.Len(t, res.Adds, 1)
		require.Equal(t, missingID.Bytes(), res.Adds[0].GetStreamId())
		require.Equal(t, int32(protocol.Err_NOT_FOUND), res.Adds[0].GetCode())

		// EnqueueSubscribe should have been called only for the existing stream
		subs := env.eventBus.SubscribeCalls()
		require.Len(t, subs, 1)
		require.Equal(t, existingID.Bytes(), subs[0].cookie.GetStreamId())
	})

	t.Run("successful operations", func(t *testing.T) {
		env := newHandlerTestEnv(t)

		addID := testutils.FakeStreamId(shared.STREAM_CHANNEL_BIN)
		removeID := testutils.FakeStreamId(shared.STREAM_CHANNEL_BIN)
		backfillID := testutils.FakeStreamId(shared.STREAM_CHANNEL_BIN)

		// Add the stream to the cache so validation passes
		env.streamCache.AddStream(addID)

		req := &protocol.ModifySyncRequest{
			AddStreams:    []*protocol.SyncCookie{{StreamId: addID.Bytes()}},
			RemoveStreams: [][]byte{removeID.Bytes()},
			BackfillStreams: &protocol.ModifySyncRequest_Backfill{
				Streams: []*protocol.SyncCookie{{StreamId: backfillID.Bytes()}},
				SyncId:  "backfill-sync",
			},
		}

		res, err := env.handler.Modify(context.Background(), req)
		require.NoError(t, err)
		require.Empty(t, res.Adds)
		require.Empty(t, res.Removals)
		require.Empty(t, res.Backfills)

		subs := env.eventBus.SubscribeCalls()
		require.Len(t, subs, 1)
		require.Equal(t, addID.Bytes(), subs[0].cookie.GetStreamId())
		require.Same(t, env.handler, subs[0].subscriber)

		unsubs := env.eventBus.UnsubscribeCalls()
		require.Len(t, unsubs, 1)
		require.Equal(t, removeID, unsubs[0].streamID)
		require.Same(t, env.handler, unsubs[0].subscriber)

		backfills := env.eventBus.BackfillCalls()
		require.Len(t, backfills, 1)
		require.Equal(t, backfillID.Bytes(), backfills[0].cookie.GetStreamId())
		require.Equal(t, []string{env.handler.syncID, "backfill-sync"}, backfills[0].syncIDs)
	})

	t.Run("operation errors collected", func(t *testing.T) {
		env := newHandlerTestEnv(t)

		addID := testutils.FakeStreamId(shared.STREAM_CHANNEL_BIN)
		removeID := testutils.FakeStreamId(shared.STREAM_CHANNEL_BIN)
		backfillID := testutils.FakeStreamId(shared.STREAM_CHANNEL_BIN)

		// Add the stream to the cache so validation passes
		env.streamCache.AddStream(addID)

		subErr := base.RiverError(protocol.Err_ALREADY_EXISTS, "subscribe failed")
		unsubErr := base.RiverError(protocol.Err_NOT_FOUND, "unsubscribe failed")
		backfillErr := base.RiverError(protocol.Err_UNAVAILABLE, "backfill failed")

		env.eventBus.SetSubscribeError(addID.Bytes(), subErr)
		env.eventBus.SetUnsubscribeError(removeID, unsubErr)
		env.eventBus.SetBackfillError(backfillID.Bytes(), backfillErr)

		req := &protocol.ModifySyncRequest{
			AddStreams:    []*protocol.SyncCookie{{StreamId: addID.Bytes()}},
			RemoveStreams: [][]byte{removeID.Bytes()},
			BackfillStreams: &protocol.ModifySyncRequest_Backfill{
				Streams: []*protocol.SyncCookie{{StreamId: backfillID.Bytes()}},
				SyncId:  "bf",
			},
		}

		res, err := env.handler.Modify(context.Background(), req)
		require.NoError(t, err)

		require.Len(t, res.Adds, 1)
		require.Equal(t, addID.Bytes(), res.Adds[0].GetStreamId())
		require.Equal(t, int32(protocol.Err_ALREADY_EXISTS), res.Adds[0].GetCode())
		require.Contains(t, res.Adds[0].GetMessage(), "subscribe failed")

		require.Len(t, res.Removals, 1)
		require.Equal(t, removeID.Bytes(), res.Removals[0].GetStreamId())
		require.Equal(t, int32(protocol.Err_NOT_FOUND), res.Removals[0].GetCode())
		require.Contains(t, res.Removals[0].GetMessage(), "unsubscribe failed")

		require.Len(t, res.Backfills, 1)
		require.Equal(t, backfillID.Bytes(), res.Backfills[0].GetStreamId())
		require.Equal(t, int32(protocol.Err_UNAVAILABLE), res.Backfills[0].GetCode())
		require.Contains(t, res.Backfills[0].GetMessage(), "backfill failed")
	})
}

func TestSyncStreamHandlerImpl_Cancel(t *testing.T) {
	t.Run("context already cancelled", func(t *testing.T) {
		env := newHandlerTestEnv(t)
		env.triggerCancel(errors.New("done"))

		err := env.handler.Cancel(context.Background())
		require.ErrorIs(t, err, context.Canceled)
	})

	t.Run("add message failure", func(t *testing.T) {
		env := newHandlerTestEnv(t)
		env.streamUpdates.Close()

		err := env.handler.Cancel(context.Background())
		require.Error(t, err)
		var riverErr *base.RiverErrorImpl
		require.True(t, errors.As(err, &riverErr))
		require.Equal(t, protocol.Err_UNAVAILABLE, riverErr.Code)
		require.Contains(t, riverErr.Msg, "failed to add close message")
	})

	t.Run("request context cancelled", func(t *testing.T) {
		env := newHandlerTestEnv(t)

		reqCtx, cancel := context.WithCancel(context.Background())
		go func() {
			time.Sleep(time.Millisecond)
			cancel()
		}()

		err := env.handler.Cancel(reqCtx)
		require.Error(t, err)
		var riverErr *base.RiverErrorImpl
		require.True(t, errors.As(err, &riverErr))
		require.Equal(t, protocol.Err_CANCELED, riverErr.Code)
		require.Contains(t, riverErr.Msg, "request context cancelled")
	})

	t.Run("successful cancel", func(t *testing.T) {
		env := newHandlerTestEnv(t)

		go func() {
			time.Sleep(time.Millisecond)
			env.triggerCancel(nil)
		}()

		err := env.handler.Cancel(context.Background())
		require.NoError(t, err)
	})
}

func TestSyncStreamHandlerImpl_Ping(t *testing.T) {
	t.Run("enqueues pong message", func(t *testing.T) {
		env := newHandlerTestEnv(t)

		env.handler.Ping(context.Background(), "nonce")

		msgs := env.streamUpdates.GetBatch(nil)
		require.Len(t, msgs, 1)
		require.Equal(t, protocol.SyncOp_SYNC_PONG, msgs[0].GetSyncOp())
		require.Equal(t, "nonce", msgs[0].GetPongNonce())
	})

	t.Run("context cancelled", func(t *testing.T) {
		env := newHandlerTestEnv(t)
		env.triggerCancel(nil)

		env.handler.Ping(context.Background(), "nonce")
		require.Equal(t, 0, env.streamUpdates.Len())
	})
}

func TestSyncStreamHandlerImpl_DebugDropStream(t *testing.T) {
	t.Run("context cancelled", func(t *testing.T) {
		env := newHandlerTestEnv(t)
		env.triggerCancel(nil)
		streamID := testutils.FakeStreamId(shared.STREAM_CHANNEL_BIN)

		err := env.handler.DebugDropStream(context.Background(), streamID)
		require.ErrorIs(t, err, context.Canceled)
	})

	t.Run("unsubscribe error", func(t *testing.T) {
		env := newHandlerTestEnv(t)
		streamID := testutils.FakeStreamId(shared.STREAM_CHANNEL_BIN)

		unsubErr := base.RiverError(protocol.Err_UNKNOWN, "unsubscribe failed")
		env.eventBus.SetUnsubscribeError(streamID, unsubErr)

		err := env.handler.DebugDropStream(context.Background(), streamID)
		require.ErrorIs(t, err, unsubErr)
	})

	t.Run("add message failure", func(t *testing.T) {
		env := newHandlerTestEnv(t)
		streamID := testutils.FakeStreamId(shared.STREAM_CHANNEL_BIN)
		env.streamUpdates.Close()

		err := env.handler.DebugDropStream(context.Background(), streamID)
		require.Error(t, err)
		var riverErr *base.RiverErrorImpl
		require.True(t, errors.As(err, &riverErr))
		require.Equal(t, protocol.Err_UNAVAILABLE, riverErr.Code)
	})

	t.Run("success", func(t *testing.T) {
		env := newHandlerTestEnv(t)
		streamID := testutils.FakeStreamId(shared.STREAM_CHANNEL_BIN)

		err := env.handler.DebugDropStream(context.Background(), streamID)
		require.NoError(t, err)

		unsubs := env.eventBus.UnsubscribeCalls()
		require.Len(t, unsubs, 1)
		require.Equal(t, streamID, unsubs[0].streamID)
		require.Same(t, env.handler, unsubs[0].subscriber)

		msgs := env.streamUpdates.GetBatch(nil)
		require.Len(t, msgs, 1)
		require.Equal(t, protocol.SyncOp_SYNC_DOWN, msgs[0].GetSyncOp())
		require.Equal(t, streamID.Bytes(), msgs[0].GetStreamId())
	})
}

func TestSyncStreamHandlerImpl_OnUpdate(t *testing.T) {
	t.Run("context cancelled", func(t *testing.T) {
		env := newHandlerTestEnv(t)
		env.triggerCancel(nil)

		env.handler.OnUpdate(&protocol.SyncStreamsResponse{SyncOp: protocol.SyncOp_SYNC_UPDATE})
		require.Equal(t, 0, env.streamUpdates.Len())
	})

	t.Run("message enqueued", func(t *testing.T) {
		env := newHandlerTestEnv(t)
		update := &protocol.SyncStreamsResponse{SyncOp: protocol.SyncOp_SYNC_UPDATE}

		env.handler.OnUpdate(update)

		msgs := env.streamUpdates.GetBatch(nil)
		require.Len(t, msgs, 1)
		require.Same(t, update, msgs[0])
	})

	t.Run("add message failure triggers cancel", func(t *testing.T) {
		env := newHandlerTestEnv(t)
		env.streamUpdates.Close()

		env.handler.OnUpdate(&protocol.SyncStreamsResponse{SyncOp: protocol.SyncOp_SYNC_UPDATE})

		require.Equal(t, 1, env.cancelCount())
		err := env.cancelErrAt(0)
		var riverErr *base.RiverErrorImpl
		require.True(t, errors.As(err, &riverErr))
		require.Equal(t, protocol.Err_UNAVAILABLE, riverErr.Code)
	})
}

func TestSyncStreamHandlerImpl_ProcessMessage(t *testing.T) {
	t.Run("context cancelled", func(t *testing.T) {
		env := newHandlerTestEnv(t)
		env.triggerCancel(nil)

		stop := env.handler.processMessage(&protocol.SyncStreamsResponse{SyncOp: protocol.SyncOp_SYNC_UPDATE})
		require.True(t, stop)
		require.Empty(t, env.receiver.Messages())
	})

	t.Run("send success", func(t *testing.T) {
		env := newHandlerTestEnv(t)
		msg := &protocol.SyncStreamsResponse{SyncOp: protocol.SyncOp_SYNC_UPDATE}

		stop := env.handler.processMessage(msg)
		require.False(t, stop)

		msgs := env.receiver.Messages()
		require.Len(t, msgs, 1)
		require.Equal(t, env.handler.syncID, msgs[0].GetSyncId())
		require.Equal(t, env.handler.syncID, msg.GetSyncId())
		require.Equal(t, 0, env.cancelCount())
	})

	t.Run("send failure cancels", func(t *testing.T) {
		env := newHandlerTestEnv(t)
		sendErr := errors.New("send failure")
		env.receiver.SetErr(sendErr)

		stop := env.handler.processMessage(&protocol.SyncStreamsResponse{SyncOp: protocol.SyncOp_SYNC_UPDATE})
		require.True(t, stop)
		require.Equal(t, 1, env.cancelCount())
		require.Equal(t, sendErr, env.cancelErrAt(0))
		require.ErrorIs(t, context.Cause(env.ctx), sendErr)
	})

	t.Run("close message", func(t *testing.T) {
		env := newHandlerTestEnv(t)
		msg := &protocol.SyncStreamsResponse{SyncOp: protocol.SyncOp_SYNC_CLOSE}

		stop := env.handler.processMessage(msg)
		require.True(t, stop)
		require.Equal(t, env.handler.syncID, msg.GetSyncId())
		require.Equal(t, 1, env.cancelCount())
		require.Nil(t, env.cancelErrAt(0))
	})
}
