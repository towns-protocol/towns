package client

import (
	"context"

	"github.com/ethereum/go-ethereum/common"
	"github.com/stretchr/testify/mock"

	"github.com/towns-protocol/towns/core/node/events"
	. "github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/shared"
)

type mockStreamCache struct {
	mock.Mock
}

func (m *mockStreamCache) GetStreamWaitForLocal(ctx context.Context, streamId StreamId) (Stream, error) {
	args := m.Called(ctx, streamId)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(Stream), args.Error(1)
}

func (m *mockStreamCache) GetStreamNoWait(ctx context.Context, streamId StreamId) (Stream, error) {
	args := m.Called(ctx, streamId)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(Stream), args.Error(1)
}

type mockStream struct {
	mock.Mock
}

func (m *mockStream) GetRemotesAndIsLocal() ([]common.Address, bool) {
	args := m.Called()
	if args.Get(0) == nil {
		return nil, false
	}
	return args.Get(0).([]common.Address), args.Bool(1)
}

func (m *mockStream) GetStickyPeer() common.Address {
	args := m.Called()
	return args.Get(0).(common.Address)
}

func (m *mockStream) AdvanceStickyPeer(currentPeer common.Address) common.Address {
	args := m.Called(currentPeer)
	return args.Get(0).(common.Address)
}

func (m *mockStream) UpdatesSinceCookie(
	ctx context.Context,
	cookie *SyncCookie,
	callback func(streamAndCookie *StreamAndCookie) error,
) error {
	args := m.Called(ctx, cookie, callback)
	return args.Error(0)
}

func (m *mockStream) Sub(ctx context.Context, cookie *SyncCookie, r events.SyncResultReceiver) error {
	args := m.Called(ctx, cookie, r)
	return args.Error(0)
}

func (m *mockStream) Unsub(r events.SyncResultReceiver) {
	m.Called(r)
}

func (m *mockStream) StreamId() StreamId {
	args := m.Called()
	return args.Get(0).(StreamId)
}

type mockMessageDistributor struct {
	mock.Mock
	messages []*SyncStreamsResponse
}

func (m *mockMessageDistributor) DistributeMessage(streamID StreamId, msg *SyncStreamsResponse) {
	m.Called(streamID, msg)
	m.messages = append(m.messages, msg)
}

func (m *mockMessageDistributor) DistributeBackfillMessage(streamID StreamId, msg *SyncStreamsResponse) {
	m.Called(streamID, msg)
	m.messages = append(m.messages, msg)
}

type mockStreamsSyncer struct {
	mock.Mock
}

func (m *mockStreamsSyncer) Run() {
	m.Called()
}

func (m *mockStreamsSyncer) Address() common.Address {
	args := m.Called()
	return args.Get(0).(common.Address)
}

func (m *mockStreamsSyncer) Modify(ctx context.Context, request *ModifySyncRequest) (*ModifySyncResponse, bool, error) {
	args := m.Called(ctx, request)
	if args.Get(0) == nil {
		return nil, args.Bool(1), args.Error(2)
	}
	return args.Get(0).(*ModifySyncResponse), args.Bool(1), args.Error(2)
}

func (m *mockStreamsSyncer) DebugDropStream(ctx context.Context, streamID StreamId) (bool, error) {
	args := m.Called(ctx, streamID)
	return args.Bool(0), args.Error(1)
}
