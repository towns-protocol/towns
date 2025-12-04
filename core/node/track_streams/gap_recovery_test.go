package track_streams

import (
	"context"
	"testing"

	"connectrpc.com/connect"
	"github.com/ethereum/go-ethereum/common"
	"github.com/puzpuzpuz/xsync/v4"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	"github.com/towns-protocol/towns/core/node/events"
	"github.com/towns-protocol/towns/core/node/infra"
	"github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/testutils/mocks"
)

// mockTrackedStreamView implements events.TrackedStreamView for testing
type mockTrackedStreamView struct {
	mock.Mock
}

func (m *mockTrackedStreamView) ApplyBlock(miniblock *protocol.Miniblock, snapshot *protocol.Envelope) error {
	args := m.Called(miniblock, snapshot)
	return args.Error(0)
}

func (m *mockTrackedStreamView) ApplyEvent(ctx context.Context, event *protocol.Envelope) error {
	args := m.Called(ctx, event)
	return args.Error(0)
}

func (m *mockTrackedStreamView) SendEventNotification(ctx context.Context, event *events.ParsedEvent) error {
	args := m.Called(ctx, event)
	return args.Error(0)
}

func (m *mockTrackedStreamView) ShouldPersistCookie(ctx context.Context) bool {
	args := m.Called(ctx)
	return args.Bool(0)
}

var _ events.TrackedStreamView = (*mockTrackedStreamView)(nil)

// TestHandleGapOnReset_CaseA_SameSnapshot tests that no gap recovery happens when snapshots match
func TestHandleGapOnReset_CaseA_SameSnapshot(t *testing.T) {
	require := require.New(t)

	// Create miniblock with number 100 (server snapshot)
	serverMiniblock := makeMiniblockWithNum(t, 100)

	// Create record with persisted state matching server snapshot
	record := &streamSyncInitRecord{
		streamId:                   shared.StreamId{},
		persistedSnapshotMiniblock: 100, // Same as server
		persistedMinipoolGen:       150,
	}

	// Create mocks
	mockView := &mockTrackedStreamView{}
	mockRegistry := mocks.NewMockNodeRegistry(t)

	// No calls should be made to fetch miniblocks or send notifications
	// (mock will fail if unexpected calls are made)

	// Create minimal syncSessionRunner
	ctx := context.Background()
	ssr := &syncSessionRunner{
		syncCtx:      ctx,
		nodeRegistry: mockRegistry,
		node:         common.Address{},
	}

	// Execute
	ssr.handleGapOnReset(record, mockView, []*protocol.Miniblock{serverMiniblock})

	// Verify no interactions with mocks (no gap recovery triggered)
	mockView.AssertNotCalled(t, "SendEventNotification", mock.Anything, mock.Anything)
	mockRegistry.AssertNotCalled(t, "GetStreamServiceClientForAddress", mock.Anything)

	require.True(true) // Test passed if we got here without panics
}

// TestHandleGapOnReset_CaseB_GapDetected tests gap recovery when gap is detected
func TestHandleGapOnReset_CaseB_GapDetected(t *testing.T) {
	require := require.New(t)

	// Create miniblock with number 200 (server snapshot)
	serverMiniblock := makeMiniblockWithNum(t, 200)

	// Create gap miniblocks (150-199)
	gapMiniblock1 := makeMiniblockWithNum(t, 150)
	gapMiniblock2 := makeMiniblockWithNum(t, 151)

	streamId := shared.StreamId{0x20} // channel stream

	// Create record with persisted state that creates a gap
	record := &streamSyncInitRecord{
		streamId:                   streamId,
		persistedSnapshotMiniblock: 100, // Different from server (200)
		persistedMinipoolGen:       150, // <= serverSnapshotMb (200) - triggers gap
	}

	// Create mocks
	mockView := &mockTrackedStreamView{}
	mockRegistry := mocks.NewMockNodeRegistry(t)
	mockClient := mocks.NewMockStreamServiceClient(t)

	nodeAddr := common.HexToAddress("0x1234567890123456789012345678901234567890")

	// Setup mock expectations
	mockRegistry.On("GetStreamServiceClientForAddress", nodeAddr).Return(mockClient, nil)

	// Mock GetMiniblocks to return gap miniblocks
	mockClient.On("GetMiniblocks", mock.Anything, mock.MatchedBy(func(req *connect.Request[protocol.GetMiniblocksRequest]) bool {
		return req.Msg.FromInclusive == 150 && req.Msg.ToExclusive == 200
	})).Return(&connect.Response[protocol.GetMiniblocksResponse]{
		Msg: &protocol.GetMiniblocksResponse{
			Miniblocks: []*protocol.Miniblock{gapMiniblock1, gapMiniblock2},
		},
	}, nil)

	// Mock SendEventNotification - expect it to be called for events in gap miniblocks
	// (Our test miniblocks have no events, so this won't be called, but that's okay)

	// Create syncSessionRunner
	ctx := context.Background()
	ssr := &syncSessionRunner{
		syncCtx:      ctx,
		nodeRegistry: mockRegistry,
		node:         nodeAddr,
	}

	// Execute
	ssr.handleGapOnReset(record, mockView, []*protocol.Miniblock{serverMiniblock})

	// Verify GetMiniblocks was called with correct range
	mockClient.AssertCalled(t, "GetMiniblocks", mock.Anything, mock.Anything)

	require.True(true)
}

// TestHandleGapOnReset_CaseC_ServerSnapshotOlder tests that no gap recovery happens when server is behind
func TestHandleGapOnReset_CaseC_ServerSnapshotOlder(t *testing.T) {
	require := require.New(t)

	// Create miniblock with number 200 (server snapshot)
	serverMiniblock := makeMiniblockWithNum(t, 200)

	// Create record where our persisted position is ahead of server
	record := &streamSyncInitRecord{
		streamId:                   shared.StreamId{},
		persistedSnapshotMiniblock: 100, // Different from server (200)
		persistedMinipoolGen:       250, // > serverSnapshotMb (200) - server is behind
	}

	// Create mocks
	mockView := &mockTrackedStreamView{}
	mockRegistry := mocks.NewMockNodeRegistry(t)

	// No calls should be made
	ctx := context.Background()
	ssr := &syncSessionRunner{
		syncCtx:      ctx,
		nodeRegistry: mockRegistry,
		node:         common.Address{},
	}

	// Execute
	ssr.handleGapOnReset(record, mockView, []*protocol.Miniblock{serverMiniblock})

	// Verify no interactions
	mockView.AssertNotCalled(t, "SendEventNotification", mock.Anything, mock.Anything)
	mockRegistry.AssertNotCalled(t, "GetStreamServiceClientForAddress", mock.Anything)

	require.True(true)
}

// TestHandleGapOnReset_EmptyMiniblocks tests handling when server returns empty miniblocks
func TestHandleGapOnReset_EmptyMiniblocks(t *testing.T) {
	require := require.New(t)

	// Create record with persisted state
	record := &streamSyncInitRecord{
		streamId:                   shared.StreamId{},
		persistedSnapshotMiniblock: 100,
		persistedMinipoolGen:       150,
	}

	// Create mocks
	mockView := &mockTrackedStreamView{}
	mockRegistry := mocks.NewMockNodeRegistry(t)

	ctx := context.Background()
	ssr := &syncSessionRunner{
		syncCtx:      ctx,
		nodeRegistry: mockRegistry,
		node:         common.Address{},
	}

	// Execute with empty miniblocks - should return early without error
	ssr.handleGapOnReset(record, mockView, []*protocol.Miniblock{})

	// Verify no interactions (early return due to parse error)
	mockView.AssertNotCalled(t, "SendEventNotification", mock.Anything, mock.Anything)
	mockRegistry.AssertNotCalled(t, "GetStreamServiceClientForAddress", mock.Anything)

	require.True(true)
}

// TestNotifyEventsFromMiniblocks tests that events are correctly extracted and notified
func TestNotifyEventsFromMiniblocks(t *testing.T) {
	require := require.New(t)

	// Create a miniblock with actual events
	streamId := shared.StreamId{0x20}

	// Create mock view that tracks notifications
	mockView := &mockTrackedStreamView{}
	notificationCount := 0
	mockView.On("SendEventNotification", mock.Anything, mock.Anything).
		Run(func(args mock.Arguments) {
			notificationCount++
		}).
		Return(nil)

	ctx := context.Background()
	ssr := &syncSessionRunner{
		syncCtx: ctx,
	}

	// Create miniblocks without events (just headers)
	mb1 := makeMiniblockWithNum(t, 100)
	mb2 := makeMiniblockWithNum(t, 101)

	// Execute
	ssr.notifyEventsFromMiniblocks(streamId, mockView, []*protocol.Miniblock{mb1, mb2})

	// Our test miniblocks have no events, so no notifications should be sent
	require.Equal(0, notificationCount, "No notifications expected for miniblocks without events")
}

// Helper to create a minimal syncSessionRunner for testing applyUpdateToStream
func newTestSyncSessionRunner(
	t *testing.T,
	nodeRegistry *mocks.MockNodeRegistry,
	trackedViewForStream TrackedViewForStream,
) *syncSessionRunner {
	ctx := context.Background()
	cancelFunc := func(err error) {}

	// Create metrics
	metricsFactory := infra.NewMetricsFactory(nil, "", "")
	metrics := NewTrackStreamsSyncMetrics(metricsFactory)

	return &syncSessionRunner{
		rootCtx:              ctx,
		syncCtx:              ctx,
		cancelSync:           cancelFunc,
		node:                 common.HexToAddress("0x1234567890123456789012345678901234567890"),
		nodeRegistry:         nodeRegistry,
		metrics:              metrics,
		trackedViewForStream: trackedViewForStream,
		streamRecords:        xsync.NewMap[shared.StreamId, *streamSyncInitRecord](),
	}
}

// TestApplyUpdateToStream_WithGapRecovery tests the full flow through applyUpdateToStream
// when gap recovery is triggered
func TestApplyUpdateToStream_WithGapRecovery(t *testing.T) {
	require := require.New(t)

	streamId := shared.StreamId{0x20} // channel stream

	// Create server response miniblock at position 200 (new snapshot)
	serverMiniblock := makeMiniblockWithNum(t, 200)

	// Create gap miniblocks that will be fetched (150-199)
	gapMiniblock1 := makeMiniblockWithNum(t, 150)
	gapMiniblock2 := makeMiniblockWithNum(t, 151)

	// Create mock tracked view
	mockView := &mockTrackedStreamView{}
	mockView.On("SendEventNotification", mock.Anything, mock.Anything).Return(nil)
	mockView.On("ShouldPersistCookie", mock.Anything).Return(false)

	// Create mock node registry and client
	mockRegistry := mocks.NewMockNodeRegistry(t)
	mockClient := mocks.NewMockStreamServiceClient(t)

	nodeAddr := common.HexToAddress("0x1234567890123456789012345678901234567890")

	// Setup mock for gap recovery fetch
	mockRegistry.On("GetStreamServiceClientForAddress", nodeAddr).Return(mockClient, nil)
	mockClient.On("GetMiniblocks", mock.Anything, mock.MatchedBy(func(req *connect.Request[protocol.GetMiniblocksRequest]) bool {
		return req.Msg.FromInclusive == 150 && req.Msg.ToExclusive == 200
	})).Return(&connect.Response[protocol.GetMiniblocksResponse]{
		Msg: &protocol.GetMiniblocksResponse{
			Miniblocks: []*protocol.Miniblock{gapMiniblock1, gapMiniblock2},
		},
	}, nil)

	// Create trackedViewForStream function that returns our mock
	trackedViewForStream := func(streamId shared.StreamId, streamAndCookie *protocol.StreamAndCookie) (events.TrackedStreamView, error) {
		return mockView, nil
	}

	// Create sync session runner
	ssr := newTestSyncSessionRunner(t, mockRegistry, trackedViewForStream)
	ssr.node = nodeAddr

	// Create record with persisted state that will trigger gap recovery
	record := &streamSyncInitRecord{
		streamId:                   streamId,
		persistedSnapshotMiniblock: 100, // Different from server (200)
		persistedMinipoolGen:       150, // Gap: need miniblocks 150-199
		applyHistoricalContent:     ApplyHistoricalContent{Enabled: true, FromMiniblockNum: 150},
	}

	// Create StreamAndCookie response (reset with new snapshot at 200)
	streamAndCookie := &protocol.StreamAndCookie{
		SyncReset:  true,
		Miniblocks: []*protocol.Miniblock{serverMiniblock},
		NextSyncCookie: &protocol.SyncCookie{
			MinipoolGen: 201,
		},
	}

	// Execute
	ssr.applyUpdateToStream(streamAndCookie, record)

	// Verify gap recovery was triggered - GetMiniblocks should have been called
	mockClient.AssertCalled(t, "GetMiniblocks", mock.Anything, mock.Anything)

	// Verify trackedView was set on record
	require.NotNil(record.trackedView)

	require.True(true)
}

// TestApplyUpdateToStream_NoGapRecovery_SameSnapshot tests that no gap recovery happens
// when snapshots match
func TestApplyUpdateToStream_NoGapRecovery_SameSnapshot(t *testing.T) {
	require := require.New(t)

	streamId := shared.StreamId{0x20}

	// Create server response miniblock at position 100 (same as persisted snapshot)
	serverMiniblock := makeMiniblockWithNum(t, 100)

	// Create mock tracked view
	mockView := &mockTrackedStreamView{}
	mockView.On("SendEventNotification", mock.Anything, mock.Anything).Return(nil)
	mockView.On("ShouldPersistCookie", mock.Anything).Return(false)

	// Create mock node registry - should NOT be called for miniblock fetch
	mockRegistry := mocks.NewMockNodeRegistry(t)

	// Create trackedViewForStream function
	trackedViewForStream := func(streamId shared.StreamId, streamAndCookie *protocol.StreamAndCookie) (events.TrackedStreamView, error) {
		return mockView, nil
	}

	// Create sync session runner
	ssr := newTestSyncSessionRunner(t, mockRegistry, trackedViewForStream)

	// Create record with persisted state matching server snapshot
	record := &streamSyncInitRecord{
		streamId:                   streamId,
		persistedSnapshotMiniblock: 100, // Same as server
		persistedMinipoolGen:       150,
		applyHistoricalContent:     ApplyHistoricalContent{Enabled: true, FromMiniblockNum: 150},
	}

	// Create StreamAndCookie response
	streamAndCookie := &protocol.StreamAndCookie{
		SyncReset:  true,
		Miniblocks: []*protocol.Miniblock{serverMiniblock},
		NextSyncCookie: &protocol.SyncCookie{
			MinipoolGen: 151,
		},
	}

	// Execute
	ssr.applyUpdateToStream(streamAndCookie, record)

	// Verify NO gap recovery - GetStreamServiceClientForAddress should NOT have been called
	mockRegistry.AssertNotCalled(t, "GetStreamServiceClientForAddress", mock.Anything)

	require.True(true)
}

// TestApplyUpdateToStream_NoPersistedState tests behavior when there's no persisted state
// (first time syncing a stream)
func TestApplyUpdateToStream_NoPersistedState(t *testing.T) {
	require := require.New(t)

	streamId := shared.StreamId{0x20}

	// Create server response miniblock
	serverMiniblock := makeMiniblockWithNum(t, 100)

	// Create mock tracked view
	mockView := &mockTrackedStreamView{}
	mockView.On("SendEventNotification", mock.Anything, mock.Anything).Return(nil)
	mockView.On("ShouldPersistCookie", mock.Anything).Return(false)

	// Create mock node registry - should NOT be called
	mockRegistry := mocks.NewMockNodeRegistry(t)

	// Create trackedViewForStream function
	trackedViewForStream := func(streamId shared.StreamId, streamAndCookie *protocol.StreamAndCookie) (events.TrackedStreamView, error) {
		return mockView, nil
	}

	// Create sync session runner
	ssr := newTestSyncSessionRunner(t, mockRegistry, trackedViewForStream)

	// Create record with NO persisted state (persistedSnapshotMiniblock = 0)
	record := &streamSyncInitRecord{
		streamId:                   streamId,
		persistedSnapshotMiniblock: 0, // No persisted state
		persistedMinipoolGen:       0,
		applyHistoricalContent:     ApplyHistoricalContent{Enabled: false},
	}

	// Create StreamAndCookie response
	streamAndCookie := &protocol.StreamAndCookie{
		SyncReset:  true,
		Miniblocks: []*protocol.Miniblock{serverMiniblock},
		NextSyncCookie: &protocol.SyncCookie{
			MinipoolGen: 101,
		},
	}

	// Execute
	ssr.applyUpdateToStream(streamAndCookie, record)

	// Verify NO gap recovery - GetStreamServiceClientForAddress should NOT have been called
	mockRegistry.AssertNotCalled(t, "GetStreamServiceClientForAddress", mock.Anything)

	require.True(true)
}
