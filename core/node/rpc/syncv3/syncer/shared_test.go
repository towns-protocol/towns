package syncer

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/stretchr/testify/require"

	"github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/testutils"
)

func TestSharedStreamUpdateEmitter_ForwardsBufferedBackfills(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	stream, wallet, _, _ := newTestStream(t, ctx)
	stream.Reset(1, []common.Address{wallet.Address}, wallet.Address)

	cache := &stubStreamCache{stream: stream}
	subscriber := newCollectingSubscriber()
	nodeRegistry := newMockNodeRegistry(t)

	shared := newSharedStreamUpdateEmitter(ctx, wallet.Address, cache, nodeRegistry, subscriber, stream.StreamId(), 7, nil)
	t.Cleanup(shared.Close)

	require.Equal(t, common.Address{}, shared.Node())

	cookie := &protocol.SyncCookie{StreamId: stream.StreamId().Bytes()}
	require.True(t, shared.EnqueueBackfill(cookie, []string{"sync-a"}))

	msg := waitForMessage(t, subscriber.ch)
	require.Equal(t, protocol.SyncOp_SYNC_UPDATE, msg.resp.GetSyncOp())
	require.Equal(t, []string{"sync-a"}, msg.resp.GetTargetSyncIds())
	require.Equal(t, 7, msg.version)

	require.Eventually(t, func() bool { return shared.Node() == wallet.Address }, time.Second, 20*time.Millisecond)
}

func TestSharedStreamUpdateEmitter_StreamLookupFailure(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	streamID := testutils.FakeStreamId(shared.STREAM_SPACE_BIN)
	cache := &stubStreamCache{err: errors.New("boom")}
	subscriber := newCollectingSubscriber()
	nodeRegistry := newMockNodeRegistry(t)

	shared := newSharedStreamUpdateEmitter(ctx, common.Address{}, cache, nodeRegistry, subscriber, streamID, 3, nil)

	require.True(t, shared.EnqueueBackfill(&protocol.SyncCookie{StreamId: streamID.Bytes()}, []string{"target"}))

	msg := waitForMessage(t, subscriber.ch)
	require.Equal(t, protocol.SyncOp_SYNC_DOWN, msg.resp.GetSyncOp())
	require.Equal(t, []string{"target"}, msg.resp.GetTargetSyncIds())
	require.Equal(t, AllSubscribersVersion, msg.version)

	require.False(t, shared.EnqueueBackfill(&protocol.SyncCookie{StreamId: streamID.Bytes()}, []string{"later"}))
	require.Equal(t, common.Address{}, shared.Node())
}
