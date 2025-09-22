package eventbus

import (
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/rpc/syncv3/syncer"
)

func TestStreamSubscribersAddPendingUnique(t *testing.T) {
	shared := newCloningSubscriber("shared")
	cases := []struct {
		name            string
		setup           func(StreamSubscriber) streamSubscribers
		subscriber      StreamSubscriber
		wantAdded       bool
		expectInPending bool
	}{
		{
			name: "adds new subscriber to pending bucket",
			setup: func(StreamSubscriber) streamSubscribers {
				return make(streamSubscribers)
			},
			subscriber:      newCloningSubscriber("fresh"),
			wantAdded:       true,
			expectInPending: true,
		},
		{
			name: "skips subscriber already pending",
			setup: func(sub StreamSubscriber) streamSubscribers {
				return streamSubscribers{syncer.PendingSubscribersVersion: {sub}}
			},
			subscriber:      shared,
			wantAdded:       false,
			expectInPending: true,
		},
		{
			name: "skips subscriber present in another version",
			setup: func(sub StreamSubscriber) streamSubscribers {
				return streamSubscribers{5: {sub}}
			},
			subscriber:      shared,
			wantAdded:       false,
			expectInPending: false,
		},
	}

	for _, tc := range cases {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			ss := tc.setup(tc.subscriber)
			added := ss.addPendingUnique(tc.subscriber)

			require.Equal(t, tc.wantAdded, added)
			pending, ok := ss[syncer.PendingSubscribersVersion]
			if !tc.expectInPending {
				require.False(t, ok)
				return
			}

			require.True(t, ok)
			require.Len(t, pending, 1)
			require.Same(t, tc.subscriber, pending[0])
		})
	}
}

func TestStreamSubscribersFindBySyncID(t *testing.T) {
	subA := newCloningSubscriber("a")
	subB := newCloningSubscriber("b")
	subC := newCloningSubscriber("c")

	ss := streamSubscribers{
		1: {subA, subB},
		7: {subC},
	}

	cases := []struct {
		name        string
		syncID      string
		want        StreamSubscriber
		wantVersion int
	}{
		{name: "hits first version", syncID: subA.SyncID(), want: subA, wantVersion: 1},
		{name: "hits second entry in same bucket", syncID: subB.SyncID(), want: subB, wantVersion: 1},
		{name: "finds in alternative version", syncID: subC.SyncID(), want: subC, wantVersion: 7},
		{name: "returns nil when missing", syncID: "missing", want: nil, wantVersion: 0},
	}

	for _, tc := range cases {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			got, version := ss.findBySyncID(tc.syncID)
			require.Equal(t, tc.wantVersion, version)
			if tc.want == nil {
				require.Nil(t, got)
				return
			}
			require.Same(t, tc.want, got)
		})
	}
}

func TestStreamSubscribersMovePendingToVersion(t *testing.T) {
	t.Run("moves subscriber and drops empty pending bucket", func(t *testing.T) {
		sub := newCloningSubscriber("pending")
		ss := streamSubscribers{syncer.PendingSubscribersVersion: {sub}}

		ss.movePendingToVersion(sub.SyncID(), 3)

		_, ok := ss[syncer.PendingSubscribersVersion]
		require.False(t, ok)
		target := ss[3]
		require.Len(t, target, 1)
		require.Same(t, sub, target[0])
	})

	t.Run("moves subscriber among multiple pending entries", func(t *testing.T) {
		sub1 := newCloningSubscriber("first")
		sub2 := newCloningSubscriber("second")
		existing := newCloningSubscriber("existing")
		ss := streamSubscribers{
			syncer.PendingSubscribersVersion: {sub1, sub2},
			7:                                {existing},
		}

		ss.movePendingToVersion(sub1.SyncID(), 7)

		pending := ss[syncer.PendingSubscribersVersion]
		require.Len(t, pending, 1)
		require.Same(t, sub2, pending[0])

		target := ss[7]
		require.Len(t, target, 2)
		require.Same(t, existing, target[0])
		require.Same(t, sub1, target[1])
	})

	t.Run("no-op when subscriber not pending", func(t *testing.T) {
		other := newCloningSubscriber("other")
		ss := streamSubscribers{syncer.PendingSubscribersVersion: {other}}

		ss.movePendingToVersion("unknown", 9)

		pending := ss[syncer.PendingSubscribersVersion]
		require.Len(t, pending, 1)
		require.Same(t, other, pending[0])
		_, ok := ss[9]
		require.False(t, ok)
	})
}

func TestStreamSubscribersRemoveBySyncID(t *testing.T) {
	t.Run("removes subscriber and deletes version bucket", func(t *testing.T) {
		sub := newCloningSubscriber("target")
		ss := streamSubscribers{4: {sub}}

		removed := ss.removeBySyncID(sub.SyncID())
		require.Same(t, sub, removed)
		_, ok := ss[4]
		require.False(t, ok)
		require.True(t, ss.isEmpty())
	})

	t.Run("removes subscriber across all versions", func(t *testing.T) {
		sub := newCloningSubscriber("dup")
		other := newCloningSubscriber("other")
		ss := streamSubscribers{
			1: {sub, other},
			5: {sub},
		}

		removed := ss.removeBySyncID(sub.SyncID())
		require.Same(t, sub, removed)

		bucket, ok := ss[1]
		require.True(t, ok)
		require.Len(t, bucket, 1)
		require.Same(t, other, bucket[0])
		_, ok = ss[5]
		require.False(t, ok)
	})

	t.Run("returns nil when subscriber absent", func(t *testing.T) {
		other := newCloningSubscriber("other")
		ss := streamSubscribers{2: {other}}

		removed := ss.removeBySyncID("missing")
		require.Nil(t, removed)
		bucket := ss[2]
		require.Len(t, bucket, 1)
		require.Same(t, other, bucket[0])
	})
}

func TestStreamSubscribersIsEmpty(t *testing.T) {
	ss := make(streamSubscribers)
	require.True(t, ss.isEmpty())

	ss[1] = []StreamSubscriber{newCloningSubscriber("one")}
	require.False(t, ss.isEmpty())
}

func TestStreamSubscribersClearVersion(t *testing.T) {
	sub1 := newCloningSubscriber("a")
	sub2 := newCloningSubscriber("b")
	ss := streamSubscribers{1: {sub1}, 2: {sub2}}

	ss.clearVersion(1)
	_, ok := ss[1]
	require.False(t, ok)

	bucket := ss[2]
	require.Len(t, bucket, 1)
	require.Same(t, sub2, bucket[0])

	ss.clearVersion(3)
	bucket = ss[2]
	require.Len(t, bucket, 1)
	require.Same(t, sub2, bucket[0])
}

func TestStreamSubscribersSendUpdateToVersion(t *testing.T) {
	msg := &protocol.SyncStreamsResponse{
		SyncId:        "original-sync",
		SyncOp:        protocol.SyncOp_SYNC_UPDATE,
		Stream:        &protocol.StreamAndCookie{SyncReset: true},
		StreamId:      []byte{0x01},
		TargetSyncIds: []string{"t1", "t2"},
	}

	recipient := newPassthroughSubscriber("recipient")
	other := newPassthroughSubscriber("other")
	ss := streamSubscribers{
		3: {recipient},
		4: {other},
	}

	ss.sendUpdateToVersion(3, msg)

	require.Len(t, recipient.updates, 1)
	delivered := recipient.updates[0]
	require.NotSame(t, msg, delivered)
	require.Equal(t, protocol.SyncOp_SYNC_UPDATE, delivered.GetSyncOp())
	require.Empty(t, delivered.GetSyncId())
	require.Empty(t, delivered.GetTargetSyncIds())
	require.Same(t, msg.GetStream(), delivered.GetStream())
	require.Equal(t, msg.GetStreamId(), delivered.GetStreamId())

	require.Empty(t, other.updates)
}

func TestStreamSubscribersSendUpdateToAll(t *testing.T) {
	msg := &protocol.SyncStreamsResponse{
		SyncOp:   protocol.SyncOp_SYNC_DOWN,
		StreamId: []byte{0x02},
	}

	first := newPassthroughSubscriber("first")
	second := newPassthroughSubscriber("second")
	third := newPassthroughSubscriber("third")
	ss := streamSubscribers{
		1: {first},
		2: {second, third},
	}

	ss.sendUpdateToAll(msg)

	require.Len(t, first.updates, 1)
	require.Len(t, second.updates, 1)
	require.Len(t, third.updates, 1)

	require.NotSame(t, msg, first.updates[0])
	require.NotSame(t, first.updates[0], second.updates[0])
	require.NotSame(t, second.updates[0], third.updates[0])
	require.Equal(t, protocol.SyncOp_SYNC_DOWN, second.updates[0].GetSyncOp())
}
