package subscription

import (
	"context"

	"github.com/stretchr/testify/mock"

	"github.com/ethereum/go-ethereum/common"
	"github.com/puzpuzpuz/xsync/v4"
	. "github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/rpc/sync/dynmsgbuf"
	. "github.com/towns-protocol/towns/core/node/shared"
)

// createTestSubscription creates a properly initialized Subscription for testing
func createTestSubscription(syncID string) *Subscription {
	ctx, cancel := context.WithCancelCause(context.Background())
	return &Subscription{
		syncID:              syncID,
		Messages:            dynmsgbuf.NewDynamicBuffer[*SyncStreamsResponse](),
		ctx:                 ctx,
		cancel:              cancel,
		initializingStreams: xsync.NewMap[StreamId, struct{}](),
		backfillEvents:      xsync.NewMap[StreamId, []common.Hash](),
		registry:            newRegistry(),
	}
}

// mockRegistry for testing
type mockRegistry struct {
	mock.Mock
}

func (m *mockRegistry) AddSubscription(sub *Subscription) {
	m.Called(sub)
}

func (m *mockRegistry) RemoveSubscription(syncID string) {
	m.Called(syncID)
}

func (m *mockRegistry) GetSubscriptionsForStream(streamID StreamId) []*Subscription {
	args := m.Called(streamID)
	return args.Get(0).([]*Subscription)
}

func (m *mockRegistry) GetSubscriptionByID(syncID string) (*Subscription, bool) {
	args := m.Called(syncID)
	return args.Get(0).(*Subscription), args.Bool(1)
}

func (m *mockRegistry) AddStreamToSubscription(syncID string, streamID StreamId) (bool, bool) {
	args := m.Called(syncID, streamID)
	return args.Bool(0), args.Bool(1)
}

func (m *mockRegistry) RemoveStreamFromSubscription(syncID string, streamID StreamId) bool {
	args := m.Called(syncID, streamID)
	return args.Bool(0)
}

func (m *mockRegistry) GetStats() (int, int) {
	args := m.Called()
	return args.Int(0), args.Int(1)
}

func (m *mockRegistry) CancelAll(err error) {
	m.Called(err)
}
