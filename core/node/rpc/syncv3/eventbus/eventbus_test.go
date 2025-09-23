package eventbus

import (
	"testing"

	"github.com/stretchr/testify/require"
	"google.golang.org/protobuf/proto"

	"github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/rpc/syncv3/syncer"
	"github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/testutils"
)

func TestProcessStreamUpdate_AllSubscribersVersion(t *testing.T) {
	streamID := testutils.FakeStreamId(shared.STREAM_SPACE_BIN)
	sub := newCloningSubscriber("sub-1")
	subs := streamSubscribers{syncer.InitialEmitterVersion: {sub}}
	e := &eventBusImpl{subscribers: map[shared.StreamId]streamSubscribers{streamID: subs}}

	msg := &protocol.SyncStreamsResponse{SyncOp: protocol.SyncOp_SYNC_UPDATE}
	e.processStreamUpdateCommand(streamID, msg, syncer.AllSubscribersVersion)

	require.Len(t, sub.updates, 1)
	require.Equal(t, protocol.SyncOp_SYNC_UPDATE, sub.updates[0].GetSyncOp())

	// SYNC_DOWN should remove the entire stream entry.
	e.processStreamUpdateCommand(
		streamID,
		&protocol.SyncStreamsResponse{SyncOp: protocol.SyncOp_SYNC_DOWN},
		syncer.AllSubscribersVersion,
	)
	require.Empty(t, e.subscribers)
}

func TestProcessStreamUpdate_SpecificVersion(t *testing.T) {
	streamID := testutils.FakeStreamId(shared.STREAM_SPACE_BIN)
	sub := newCloningSubscriber("sub-1")
	subs := streamSubscribers{2: {sub}}
	e := &eventBusImpl{subscribers: map[shared.StreamId]streamSubscribers{streamID: subs}}

	msg := &protocol.SyncStreamsResponse{SyncOp: protocol.SyncOp_SYNC_UPDATE}
	e.processStreamUpdateCommand(streamID, msg, 2)

	require.Len(t, sub.updates, 1)

	// SYNC_DOWN removes the specific version bucket.
	e.processStreamUpdateCommand(streamID, &protocol.SyncStreamsResponse{SyncOp: protocol.SyncOp_SYNC_DOWN}, 2)
	require.Empty(t, e.subscribers)
}

func TestProcessTargetedStreamUpdate_MovePendingToVersion(t *testing.T) {
	streamID := testutils.FakeStreamId(shared.STREAM_SPACE_BIN)
	sub := newCloningSubscriber("pending-sub")
	subs := streamSubscribers{
		syncer.PendingSubscribersVersion: {sub},
	}
	e := &eventBusImpl{subscribers: map[shared.StreamId]streamSubscribers{streamID: subs}}

	msg := &protocol.SyncStreamsResponse{
		SyncOp:        protocol.SyncOp_SYNC_UPDATE,
		TargetSyncIds: []string{sub.SyncID(), "leftover"},
	}

	e.processTargetedStreamUpdateCommand(streamID, msg, 5)

	require.Len(t, sub.updates, 1)
	require.Equal(t, []string{"leftover"}, sub.updates[0].GetTargetSyncIds())
	require.Len(t, subs[syncer.PendingSubscribersVersion], 0)
	require.Contains(t, subs, 5)
	require.Contains(t, subs[5], sub)
}

func TestProcessTargetedStreamUpdate_SyncDown(t *testing.T) {
	streamID := testutils.FakeStreamId(shared.STREAM_SPACE_BIN)
	sub := newCloningSubscriber("victim")
	subs := streamSubscribers{3: {sub}}
	e := &eventBusImpl{subscribers: map[shared.StreamId]streamSubscribers{streamID: subs}}

	msg := &protocol.SyncStreamsResponse{
		SyncOp:        protocol.SyncOp_SYNC_DOWN,
		TargetSyncIds: []string{sub.SyncID()},
	}

	e.processTargetedStreamUpdateCommand(streamID, msg, 3)

	require.Len(t, sub.updates, 1)
	require.Empty(t, e.subscribers)
}

func TestProcessSubscribeCommand_AddsPendingAndEnqueues(t *testing.T) {
	streamID := testutils.FakeStreamId(shared.STREAM_SPACE_BIN)
	subscriber := newCloningSubscriber("sub")
	registry := &busStubRegistry{}
	e := &eventBusImpl{
		registry:    registry,
		subscribers: make(map[shared.StreamId]streamSubscribers),
	}

	cookie := &protocol.SyncCookie{StreamId: streamID.Bytes()}
	cmd := &eventBusMessageSub{cookie: cookie, subscriber: subscriber}
	e.processSubscribeCommand(cmd)

	require.Equal(t, []StreamSubscriber{subscriber}, e.subscribers[streamID][syncer.PendingSubscribersVersion])
	require.Len(t, registry.subscribeCalls, 1)
	require.True(t, proto.Equal(cookie, registry.subscribeCalls[0].cookie))
	require.Equal(t, []string{subscriber.SyncID()}, registry.subscribeCalls[0].syncIDs)
}

func TestProcessUnsubscribeCommand_RemovesSubscriberAndUnsubscribesWhenEmpty(t *testing.T) {
	streamID := testutils.FakeStreamId(shared.STREAM_SPACE_BIN)
	sub1 := newCloningSubscriber("a")
	sub2 := newCloningSubscriber("b")
	subs := streamSubscribers{2: {sub1, sub2}}
	registry := &busStubRegistry{}
	e := &eventBusImpl{
		registry:    registry,
		subscribers: map[shared.StreamId]streamSubscribers{streamID: subs},
	}

	// Removing first subscriber shouldn't trigger unsubscribe.
	e.processUnsubscribeCommand(&eventBusMessageUnsub{streamID: streamID, subscriber: sub1})
	require.Len(t, e.subscribers[streamID][2], 1)
	require.Empty(t, registry.unsubscribeCalls)

	// Removing last subscriber should drop stream and enqueue unsubscribe.
	e.processUnsubscribeCommand(&eventBusMessageUnsub{streamID: streamID, subscriber: sub2})
	require.Empty(t, e.subscribers)
	require.Equal(t, []shared.StreamId{streamID}, registry.unsubscribeCalls)
}

func TestProcessBackfillCommand(t *testing.T) {
	registry := &busStubRegistry{}
	e := &eventBusImpl{registry: registry}
	cookie := &protocol.SyncCookie{StreamId: []byte{0x01}}
	cmd := &eventBusMessageBackfill{cookie: cookie, syncIDs: []string{"x", "y"}}

	e.processBackfillCommand(cmd)

	require.Len(t, registry.subscribeCalls, 1)
}

func TestProcessRemoveCommand_RemovesAcrossStreams(t *testing.T) {
	syncID := "shared"
	sub := newCloningSubscriber(syncID)
	other := newCloningSubscriber("other")

	streamA := testutils.FakeStreamId(shared.STREAM_SPACE_BIN)
	streamB := testutils.FakeStreamId(shared.STREAM_SPACE_BIN)

	subscribers := map[shared.StreamId]streamSubscribers{
		streamA: {2: {sub, other}},
		streamB: {syncer.PendingSubscribersVersion: {sub}},
	}

	registry := &busStubRegistry{}
	e := &eventBusImpl{
		registry:    registry,
		subscribers: subscribers,
	}

	e.processRemoveCommand(&eventBusMessageRemove{syncID: syncID})

	require.Contains(t, registry.unsubscribeCalls, streamB)
	require.NotContains(t, registry.unsubscribeCalls, streamA)
	require.Len(t, subscribers[streamA][2], 1)
	require.Equal(t, other, subscribers[streamA][2][0])
	require.NotContains(t, subscribers, streamB)
}
