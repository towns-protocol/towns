package eventbus

import (
	"google.golang.org/protobuf/proto"

	"github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/shared"
)

type testSubscriber struct {
	id      string
	updates []*protocol.SyncStreamsResponse
	clone   bool
}

func newCloningSubscriber(id string) *testSubscriber {
	return &testSubscriber{id: id, clone: true}
}

func newPassthroughSubscriber(id string) *testSubscriber {
	return &testSubscriber{id: id}
}

func (s *testSubscriber) SyncID() string { return s.id }

func (s *testSubscriber) OnUpdate(update *protocol.SyncStreamsResponse) {
	if s.clone {
		s.updates = append(s.updates, proto.Clone(update).(*protocol.SyncStreamsResponse))
		return
	}

	s.updates = append(s.updates, update)
}

type busStubRegistry struct {
	subscribeCalls []struct {
		cookie  *protocol.SyncCookie
		syncIDs []string
	}
	unsubscribeCalls []shared.StreamId
}

func (b *busStubRegistry) EnqueueSubscribeAndBackfill(cookie *protocol.SyncCookie, syncIDs []string) {
	b.subscribeCalls = append(b.subscribeCalls, struct {
		cookie  *protocol.SyncCookie
		syncIDs []string
	}{
		cookie:  proto.Clone(cookie).(*protocol.SyncCookie),
		syncIDs: append([]string(nil), syncIDs...),
	})
}

func (b *busStubRegistry) EnqueueUnsubscribe(streamID shared.StreamId) {
	b.unsubscribeCalls = append(b.unsubscribeCalls, streamID)
}
