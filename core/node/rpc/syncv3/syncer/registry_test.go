package syncer

import (
	"context"
	"errors"
	"testing"

	"github.com/ethereum/go-ethereum/common"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	"github.com/towns-protocol/towns/core/node/logging"
	"github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/testutils"
)

func TestRegistry_ProcessSubscribe_NewEmitterSuccess(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	stream, wallet, streamID, view := newTestStream(t, ctx)
	stream.Reset(1, []common.Address{wallet.Address}, wallet.Address)

	subscriber := newFakeStreamSubscriber()
	cache := &stubStreamCache{stream: stream}
	nodeRegistry := newMockNodeRegistry(t)
	nodeRegistry.On("GetStreamServiceClientForAddress", mock.Anything).Return(nil, errors.New("unused")).Maybe()

	r := &registryImpl{
		ctx:          ctx,
		log:          logging.NoopLogger(),
		localAddr:    wallet.Address,
		streamCache:  cache,
		nodeRegistry: nodeRegistry,
		subscriber:   subscriber,
		syncers:      make(map[shared.StreamId]StreamUpdateEmitter),
	}

	r.processSubscribeAndBackfill(view.SyncCookie(wallet.Address), []string{"initial"})

	msg := subscriber.waitForMessage(t)
	require.Equal(t, protocol.SyncOp_SYNC_UPDATE, msg.resp.GetSyncOp())
	require.Equal(t, []string{"initial"}, msg.resp.GetTargetSyncIds())

	emitter, ok := r.syncers[streamID]
	require.True(t, ok)
	require.Equal(t, InitialEmitterVersion, emitter.Version())
}

func TestRegistry_ProcessSubscribe_ExistingEmitterSuccess(t *testing.T) {
	r := &registryImpl{
		log:        logging.NoopLogger(),
		syncers:    make(map[shared.StreamId]StreamUpdateEmitter),
		subscriber: newFakeStreamSubscriber(),
	}

	emitter := &stubEmitter{enqueueResults: []bool{true}, version: 5}
	streamID := testutils.FakeStreamId(shared.STREAM_SPACE_BIN)
	r.syncers[streamID] = emitter

	cookie := &protocol.SyncCookie{StreamId: streamID.Bytes()}
	r.processSubscribeAndBackfill(cookie, []string{"existing"})
	require.Equal(t, 1, emitter.enqueueCalls)
}

func TestRegistry_ProcessSubscribe_RecreateEmitterOnFailure(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	stream, wallet, streamID, view := newTestStream(t, ctx)
	stream.Reset(1, []common.Address{wallet.Address}, wallet.Address)

	subscriber := newFakeStreamSubscriber()
	cache := &stubStreamCache{stream: stream}
	nodeRegistry := newMockNodeRegistry(t)
	nodeRegistry.On("GetStreamServiceClientForAddress", mock.Anything).Return(nil, errors.New("unused")).Maybe()

	emitter := &stubEmitter{enqueueResults: []bool{false}, version: 3}

	r := &registryImpl{
		ctx:          ctx,
		log:          logging.NoopLogger(),
		localAddr:    wallet.Address,
		streamCache:  cache,
		nodeRegistry: nodeRegistry,
		subscriber:   subscriber,
		syncers:      map[shared.StreamId]StreamUpdateEmitter{streamID: emitter},
	}

	r.processSubscribeAndBackfill(view.SyncCookie(wallet.Address), []string{"resync"})

	msg := subscriber.waitForMessage(t)
	require.Equal(t, protocol.SyncOp_SYNC_UPDATE, msg.resp.GetSyncOp())

	recreated := r.syncers[streamID]
	require.NotSame(t, emitter, recreated)
	require.Equal(t, emitter.version+1, recreated.Version())
}

func TestRegistry_ProcessSubscribe_NewEmitterFailureSendsSyncDown(t *testing.T) {
	ctx := context.Background()
	streamID := testutils.FakeStreamId(shared.STREAM_SPACE_BIN)

	subscriber := newFakeStreamSubscriber()
	cache := &stubStreamCache{err: errors.New("boom")}
	nodeRegistry := newMockNodeRegistry(t)

	r := &registryImpl{
		ctx:          ctx,
		log:          logging.NoopLogger(),
		streamCache:  cache,
		nodeRegistry: nodeRegistry,
		subscriber:   subscriber,
		syncers:      make(map[shared.StreamId]StreamUpdateEmitter),
	}

	cookie := &protocol.SyncCookie{StreamId: streamID.Bytes()}
	r.processSubscribeAndBackfill(cookie, []string{"pending"})

	msg := subscriber.waitForMessage(t)
	require.Equal(t, protocol.SyncOp_SYNC_DOWN, msg.resp.GetSyncOp())
	require.Equal(t, []string{"pending"}, msg.resp.GetTargetSyncIds())
	require.Equal(t, AllSubscribersVersion, msg.version)
}

func TestRegistry_ProcessUnsubscribeStopsEmitter(t *testing.T) {
	r := &registryImpl{
		log:     logging.NoopLogger(),
		syncers: make(map[shared.StreamId]StreamUpdateEmitter),
	}

	emitter := &stubEmitter{version: 4}
	streamID := testutils.FakeStreamId(shared.STREAM_SPACE_BIN)
	r.syncers[streamID] = emitter

	r.processUnsubscribe(streamID)
	require.True(t, emitter.closed)
	_, ok := r.syncers[streamID]
	require.False(t, ok)
}
