package client

import (
	"context"

	"github.com/ethereum/go-ethereum/common"
	"github.com/stretchr/testify/mock"

	"github.com/towns-protocol/towns/core/node/events"
	. "github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/shared"
)

// Mock implementations
type mockStreamCache struct {
	mock.Mock
}

func (m *mockStreamCache) GetStreamWaitForLocal(ctx context.Context, streamId StreamId) (*events.Stream, error) {
	args := m.Called(ctx, streamId)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*events.Stream), args.Error(1)
}

func (m *mockStreamCache) GetStreamNoWait(ctx context.Context, streamId StreamId) (*events.Stream, error) {
	args := m.Called(ctx, streamId)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*events.Stream), args.Error(1)
}

// mockMessageDistributor for testing
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

// Mock types for testing

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
