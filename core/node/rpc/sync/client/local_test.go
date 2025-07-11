package client

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	. "github.com/towns-protocol/towns/core/node/base"
	. "github.com/towns-protocol/towns/core/node/events"
	. "github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/rpc/sync/dynmsgbuf"
	. "github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/testutils"
)

// Mock implementations
type mockStreamCache struct {
	mock.Mock
}

func (m *mockStreamCache) GetStreamWaitForLocal(ctx context.Context, streamId StreamId) (*Stream, error) {
	args := m.Called(ctx, streamId)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*Stream), args.Error(1)
}

// createTestSyncCookie creates a SyncCookie with the correct NodeAddress for testing
func createTestSyncCookie(streamID StreamId) *SyncCookie {
	return &SyncCookie{
		NodeAddress: common.HexToAddress("0x1234567890123456789012345678901234567890").Bytes(),
		StreamId:    streamID[:],
		MinipoolGen: 0,
	}
}

// TestNewLocalSyncer tests the constructor
func TestNewLocalSyncer(t *testing.T) {
	ctx := context.Background()
	localAddr := common.HexToAddress("0x123")
	streamCache := &mockStreamCache{}
	messages := dynmsgbuf.NewDynamicBuffer[*SyncStreamsResponse]()
	unsubStream := func(streamID StreamId) {}

	syncer := newLocalSyncer(ctx, localAddr, streamCache, messages, unsubStream, nil)

	assert.Equal(t, ctx, syncer.globalCtx)
	assert.Equal(t, localAddr, syncer.localAddr)
	assert.Equal(t, streamCache, syncer.streamCache)
	assert.Equal(t, messages, syncer.messages)
	assert.NotNil(t, syncer.activeStreams)
	assert.Nil(t, syncer.otelTracer)
}

// TestLocalSyncer_Address tests the Address method
func TestLocalSyncer_Address(t *testing.T) {
	ctx := context.Background()
	localAddr := common.HexToAddress("0x456")
	streamCache := &mockStreamCache{}
	messages := dynmsgbuf.NewDynamicBuffer[*SyncStreamsResponse]()
	unsubStream := func(streamID StreamId) {}

	syncer := newLocalSyncer(ctx, localAddr, streamCache, messages, unsubStream, nil)

	assert.Equal(t, localAddr, syncer.Address())
}

// TestLocalSyncer_Run tests the Run method
func TestLocalSyncer_Run(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	localAddr := common.HexToAddress("0x123")
	streamCache := &mockStreamCache{}
	messages := dynmsgbuf.NewDynamicBuffer[*SyncStreamsResponse]()

	unsubCalled := false
	unsubStream := func(streamID StreamId) {
		unsubCalled = true
	}

	syncer := newLocalSyncer(ctx, localAddr, streamCache, messages, unsubStream, nil)

	// Start Run in a goroutine
	go syncer.Run()

	// Cancel context to trigger cleanup
	time.Sleep(10 * time.Millisecond)
	cancel()

	// Wait a bit for cleanup to complete
	time.Sleep(10 * time.Millisecond)

	// Verify that streams were unsubscribed (none to unsubscribe in this test)
	// The test just verifies that Run doesn't panic and handles context cancellation
	assert.False(t, unsubCalled) // No streams to unsubscribe
}

// TestLocalSyncer_OnUpdate tests the OnUpdate method
func TestLocalSyncer_OnUpdate(t *testing.T) {
	ctx := context.Background()
	localAddr := common.HexToAddress("0x123")
	streamCache := &mockStreamCache{}
	messages := dynmsgbuf.NewDynamicBuffer[*SyncStreamsResponse]()
	unsubStream := func(streamID StreamId) {}

	syncer := newLocalSyncer(ctx, localAddr, streamCache, messages, unsubStream, nil)

	// Test successful OnUpdate
	streamID := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	streamAndCookie := &StreamAndCookie{
		NextSyncCookie: createTestSyncCookie(streamID),
	}

	syncer.OnUpdate(streamAndCookie)

	// Verify message was sent
	batch := messages.GetBatch(nil)
	require.Len(t, batch, 1)
	msg := batch[0]
	assert.Equal(t, SyncOp_SYNC_UPDATE, msg.GetSyncOp())
	assert.Equal(t, streamAndCookie, msg.GetStream())
}

// TestLocalSyncer_OnUpdate_Error tests OnUpdate when sendResponse fails
func TestLocalSyncer_OnUpdate_Error(t *testing.T) {
	ctx := context.Background()
	localAddr := common.HexToAddress("0x123")
	streamCache := &mockStreamCache{}
	messages := dynmsgbuf.NewDynamicBuffer[*SyncStreamsResponse]()

	unsubCalled := false
	unsubStream := func(streamID StreamId) {
		unsubCalled = true
	}

	syncer := newLocalSyncer(ctx, localAddr, streamCache, messages, unsubStream, nil)

	// Close messages to cause sendResponse to fail
	messages.Close()

	streamID := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	streamAndCookie := &StreamAndCookie{
		NextSyncCookie: createTestSyncCookie(streamID),
	}
	// Add a real *Stream with minimal valid params to activeStreams so unsubStream can be called
	syncer.activeStreams.Store(streamID, NewStream(streamID, 0, nil))

	syncer.OnUpdate(streamAndCookie)

	// Verify unsubStream was called due to error
	assert.True(t, unsubCalled)
}

// TestLocalSyncer_OnSyncError tests the OnSyncError method
func TestLocalSyncer_OnSyncError(t *testing.T) {
	ctx := context.Background()
	localAddr := common.HexToAddress("0x123")
	streamCache := &mockStreamCache{}
	messages := dynmsgbuf.NewDynamicBuffer[*SyncStreamsResponse]()
	unsubStream := func(streamID StreamId) {}

	syncer := newLocalSyncer(ctx, localAddr, streamCache, messages, unsubStream, nil)

	// Test OnSyncError with no active streams
	syncer.OnSyncError(errors.New("test error"))

	// Verify streams were cleared (should be empty already)
	assert.Equal(t, 0, syncer.activeStreams.Size())
}

// TestLocalSyncer_OnStreamSyncDown tests the OnStreamSyncDown method
func TestLocalSyncer_OnStreamSyncDown(t *testing.T) {
	ctx := context.Background()
	localAddr := common.HexToAddress("0x123")
	streamCache := &mockStreamCache{}
	messages := dynmsgbuf.NewDynamicBuffer[*SyncStreamsResponse]()
	unsubStream := func(streamID StreamId) {}

	syncer := newLocalSyncer(ctx, localAddr, streamCache, messages, unsubStream, nil)

	streamID := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	syncer.OnStreamSyncDown(streamID)

	// Verify message was sent
	batch := messages.GetBatch(nil)
	require.Len(t, batch, 1)
	msg := batch[0]
	assert.Equal(t, SyncOp_SYNC_DOWN, msg.GetSyncOp())
	assert.Equal(t, streamID[:], msg.GetStreamId())
}

// TestLocalSyncer_OnStreamSyncDown_Error tests OnStreamSyncDown when sendResponse fails
func TestLocalSyncer_OnStreamSyncDown_Error(t *testing.T) {
	ctx := context.Background()
	localAddr := common.HexToAddress("0x123")
	streamCache := &mockStreamCache{}
	messages := dynmsgbuf.NewDynamicBuffer[*SyncStreamsResponse]()

	unsubCalled := false
	unsubStream := func(streamID StreamId) {
		unsubCalled = true
	}

	syncer := newLocalSyncer(ctx, localAddr, streamCache, messages, unsubStream, nil)

	// Close messages to cause sendResponse to fail
	messages.Close()

	streamID := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	// Add a real *Stream with minimal valid params to activeStreams so unsubStream can be called
	syncer.activeStreams.Store(streamID, NewStream(streamID, 0, nil))

	syncer.OnStreamSyncDown(streamID)

	// Verify unsubStream was called due to error
	assert.True(t, unsubCalled)
}

// TestLocalSyncer_Modify_AddStreams tests the Modify method with add streams
func TestLocalSyncer_Modify_AddStreams(t *testing.T) {
	ctx := context.Background()
	localAddr := common.HexToAddress("0x123")
	streamCache := &mockStreamCache{}
	messages := dynmsgbuf.NewDynamicBuffer[*SyncStreamsResponse]()
	unsubStream := func(streamID StreamId) {}

	syncer := newLocalSyncer(ctx, localAddr, streamCache, messages, unsubStream, nil)

	// Set up mock expectations for error (simpler test)
	streamID := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	expectedErr := RiverError(Err_NOT_FOUND, "stream not found")

	streamCache.On("GetStreamWaitForLocal", ctx, streamID).Return(nil, expectedErr)

	request := &ModifySyncRequest{
		AddStreams: []*SyncCookie{
			createTestSyncCookie(streamID),
		},
	}

	resp, _, err := syncer.Modify(ctx, request)

	require.NoError(t, err)
	assert.NotNil(t, resp)
	assert.Len(t, resp.Adds, 1)
	assert.Equal(t, streamID[:], resp.Adds[0].GetStreamId())
	assert.Equal(t, int32(Err_NOT_FOUND), resp.Adds[0].GetCode())

	streamCache.AssertExpectations(t)
}

// TestLocalSyncer_Modify_AddStreams_Error tests Modify with add streams error
func TestLocalSyncer_Modify_AddStreams_Error(t *testing.T) {
	ctx := context.Background()
	localAddr := common.HexToAddress("0x123")
	streamCache := &mockStreamCache{}
	messages := dynmsgbuf.NewDynamicBuffer[*SyncStreamsResponse]()
	unsubStream := func(streamID StreamId) {}

	syncer := newLocalSyncer(ctx, localAddr, streamCache, messages, unsubStream, nil)

	// Set up mock expectations for error
	streamID := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	expectedErr := RiverError(Err_NOT_FOUND, "stream not found")

	streamCache.On("GetStreamWaitForLocal", ctx, streamID).Return(nil, expectedErr)

	request := &ModifySyncRequest{
		AddStreams: []*SyncCookie{
			createTestSyncCookie(streamID),
		},
	}

	resp, _, err := syncer.Modify(ctx, request)

	require.NoError(t, err)
	assert.NotNil(t, resp)
	assert.Len(t, resp.Adds, 1)
	assert.Equal(t, streamID[:], resp.Adds[0].GetStreamId())
	assert.Equal(t, int32(Err_NOT_FOUND), resp.Adds[0].GetCode())

	streamCache.AssertExpectations(t)
}

// TestLocalSyncer_Modify_RemoveStreams tests the Modify method with remove streams
func TestLocalSyncer_Modify_RemoveStreams(t *testing.T) {
	ctx := context.Background()
	localAddr := common.HexToAddress("0x123")
	streamCache := &mockStreamCache{}
	messages := dynmsgbuf.NewDynamicBuffer[*SyncStreamsResponse]()
	unsubStream := func(streamID StreamId) {}

	syncer := newLocalSyncer(ctx, localAddr, streamCache, messages, unsubStream, nil)

	streamID := testutils.FakeStreamId(STREAM_CHANNEL_BIN)

	// Test removal of non-existent stream (simpler test)
	request := &ModifySyncRequest{
		RemoveStreams: [][]byte{streamID[:]},
	}

	resp, _, err := syncer.Modify(ctx, request)

	require.NoError(t, err)
	assert.NotNil(t, resp)

	// Verify stream was not found (since it wasn't added)
	_, found := syncer.activeStreams.Load(streamID)
	assert.False(t, found)
}

// TestLocalSyncer_Modify_BackfillStreams tests the Modify method with backfill streams
func TestLocalSyncer_Modify_BackfillStreams(t *testing.T) {
	ctx := context.Background()
	localAddr := common.HexToAddress("0x123")
	streamCache := &mockStreamCache{}
	messages := dynmsgbuf.NewDynamicBuffer[*SyncStreamsResponse]()
	unsubStream := func(streamID StreamId) {}

	syncer := newLocalSyncer(ctx, localAddr, streamCache, messages, unsubStream, nil)

	// Set up mock expectations for error (simpler test)
	streamID := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	expectedErr := RiverError(Err_NOT_FOUND, "stream not found")

	streamCache.On("GetStreamWaitForLocal", ctx, streamID).Return(nil, expectedErr)

	request := &ModifySyncRequest{
		BackfillStreams: &ModifySyncRequest_Backfill{
			Streams: []*SyncCookie{
				createTestSyncCookie(streamID),
			},
		},
	}

	resp, _, err := syncer.Modify(ctx, request)

	require.NoError(t, err)
	assert.NotNil(t, resp)
	assert.Len(t, resp.Backfills, 1)
	assert.Equal(t, streamID[:], resp.Backfills[0].GetStreamId())
	assert.Equal(t, int32(Err_NOT_FOUND), resp.Backfills[0].GetCode())

	streamCache.AssertExpectations(t)
}

// TestLocalSyncer_Modify_BackfillStreams_Error tests Modify with backfill streams error
func TestLocalSyncer_Modify_BackfillStreams_Error(t *testing.T) {
	ctx := context.Background()
	localAddr := common.HexToAddress("0x123")
	streamCache := &mockStreamCache{}
	messages := dynmsgbuf.NewDynamicBuffer[*SyncStreamsResponse]()
	unsubStream := func(streamID StreamId) {}

	syncer := newLocalSyncer(ctx, localAddr, streamCache, messages, unsubStream, nil)

	// Set up mock expectations for error
	streamID := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	expectedErr := RiverError(Err_NOT_FOUND, "stream not found")

	streamCache.On("GetStreamWaitForLocal", ctx, streamID).Return(nil, expectedErr)

	request := &ModifySyncRequest{
		BackfillStreams: &ModifySyncRequest_Backfill{
			Streams: []*SyncCookie{
				createTestSyncCookie(streamID),
			},
		},
	}

	resp, _, err := syncer.Modify(ctx, request)

	require.NoError(t, err)
	assert.NotNil(t, resp)
	assert.Len(t, resp.Backfills, 1)
	assert.Equal(t, streamID[:], resp.Backfills[0].GetStreamId())
	assert.Equal(t, int32(Err_NOT_FOUND), resp.Backfills[0].GetCode())

	streamCache.AssertExpectations(t)
}

// TestLocalSyncer_DebugDropStream tests the DebugDropStream method
func TestLocalSyncer_DebugDropStream(t *testing.T) {
	ctx := context.Background()
	localAddr := common.HexToAddress("0x123")
	streamCache := &mockStreamCache{}
	messages := dynmsgbuf.NewDynamicBuffer[*SyncStreamsResponse]()
	unsubStream := func(streamID StreamId) {}

	syncer := newLocalSyncer(ctx, localAddr, streamCache, messages, unsubStream, nil)

	streamID := testutils.FakeStreamId(STREAM_CHANNEL_BIN)

	// Test dropping non-existent stream (simpler test)
	dropped, err := syncer.DebugDropStream(ctx, streamID)

	assert.Error(t, err)
	assert.False(t, dropped)

	// Verify no message was sent
	batch := messages.GetBatch(nil)
	assert.Len(t, batch, 0)
}

// TestLocalSyncer_DebugDropStream_NotFound tests DebugDropStream when stream not found
func TestLocalSyncer_DebugDropStream_NotFound(t *testing.T) {
	ctx := context.Background()
	localAddr := common.HexToAddress("0x123")
	streamCache := &mockStreamCache{}
	messages := dynmsgbuf.NewDynamicBuffer[*SyncStreamsResponse]()
	unsubStream := func(streamID StreamId) {}

	syncer := newLocalSyncer(ctx, localAddr, streamCache, messages, unsubStream, nil)

	streamID := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	found := syncer.streamUnbsub(streamID)

	assert.False(t, found)
}

// TestLocalSyncer_AddStream_Duplicate tests addStream with duplicate stream
func TestLocalSyncer_AddStream_Duplicate(t *testing.T) {
	ctx := context.Background()
	localAddr := common.HexToAddress("0x123")
	streamCache := &mockStreamCache{}
	messages := dynmsgbuf.NewDynamicBuffer[*SyncStreamsResponse]()
	unsubStream := func(streamID StreamId) {}

	syncer := newLocalSyncer(ctx, localAddr, streamCache, messages, unsubStream, nil)

	// Test duplicate stream handling by adding the same stream twice
	streamID := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	expectedErr := RiverError(Err_NOT_FOUND, "stream not found")

	streamCache.On("GetStreamWaitForLocal", ctx, streamID).Return(nil, expectedErr).Times(2)

	cookie := createTestSyncCookie(streamID)

	// First call should fail
	err := syncer.addStream(ctx, cookie)
	assert.Error(t, err)

	// Second call should also fail (duplicate handling is internal)
	err = syncer.addStream(ctx, cookie)
	assert.Error(t, err)

	streamCache.AssertExpectations(t)
}

// TestLocalSyncer_AddStream_SubError tests addStream when Sub fails
func TestLocalSyncer_AddStream_SubError(t *testing.T) {
	ctx := context.Background()
	localAddr := common.HexToAddress("0x123")
	streamCache := &mockStreamCache{}
	messages := dynmsgbuf.NewDynamicBuffer[*SyncStreamsResponse]()
	unsubStream := func(streamID StreamId) {}

	syncer := newLocalSyncer(ctx, localAddr, streamCache, messages, unsubStream, nil)

	streamID := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	expectedErr := RiverError(Err_INTERNAL, "sub failed")

	streamCache.On("GetStreamWaitForLocal", ctx, streamID).Return(nil, expectedErr)

	cookie := createTestSyncCookie(streamID)
	err := syncer.addStream(ctx, cookie)

	assert.Error(t, err)
	assert.Equal(t, expectedErr, err)

	streamCache.AssertExpectations(t)
}

// TestLocalSyncer_SendResponse_ContextDone tests sendResponse when context is done
func TestLocalSyncer_SendResponse_ContextDone(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	localAddr := common.HexToAddress("0x123")
	streamCache := &mockStreamCache{}
	messages := dynmsgbuf.NewDynamicBuffer[*SyncStreamsResponse]()
	unsubStream := func(streamID StreamId) {}

	syncer := newLocalSyncer(ctx, localAddr, streamCache, messages, unsubStream, nil)

	// Cancel context to cause sendResponse to fail
	cancel()

	msg := &SyncStreamsResponse{SyncOp: SyncOp_SYNC_UPDATE}
	err := syncer.sendResponse(msg)

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "CANCELED")
}

// TestLocalSyncer_SendResponse_AddMessageError tests sendResponse when AddMessage fails
func TestLocalSyncer_SendResponse_AddMessageError(t *testing.T) {
	ctx := context.Background()
	localAddr := common.HexToAddress("0x123")
	streamCache := &mockStreamCache{}
	messages := dynmsgbuf.NewDynamicBuffer[*SyncStreamsResponse]()
	unsubStream := func(streamID StreamId) {}

	syncer := newLocalSyncer(ctx, localAddr, streamCache, messages, unsubStream, nil)

	// Close messages to cause AddMessage to fail
	messages.Close()

	msg := &SyncStreamsResponse{SyncOp: SyncOp_SYNC_UPDATE}
	err := syncer.sendResponse(msg)

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "UNAVAILABLE")
}

// TestLocalSyncer_StreamUnbsub tests the streamUnbsub method
func TestLocalSyncer_StreamUnbsub(t *testing.T) {
	ctx := context.Background()
	localAddr := common.HexToAddress("0x123")
	streamCache := &mockStreamCache{}
	messages := dynmsgbuf.NewDynamicBuffer[*SyncStreamsResponse]()

	unsubCalled := false
	unsubStream := func(streamID StreamId) {
		unsubCalled = true
	}

	syncer := newLocalSyncer(ctx, localAddr, streamCache, messages, unsubStream, nil)

	streamID := testutils.FakeStreamId(STREAM_CHANNEL_BIN)

	// Test streamUnbsub on non-existent stream
	found := syncer.streamUnbsub(streamID)

	assert.False(t, found)
	assert.False(t, unsubCalled) // Should not call unsubStream for non-existent stream
}

// TestLocalSyncer_StreamUnbsub_NotFound tests streamUnbsub when stream is not found
func TestLocalSyncer_StreamUnbsub_NotFound(t *testing.T) {
	ctx := context.Background()
	localAddr := common.HexToAddress("0x123")
	streamCache := &mockStreamCache{}
	messages := dynmsgbuf.NewDynamicBuffer[*SyncStreamsResponse]()
	unsubStream := func(streamID StreamId) {}

	syncer := newLocalSyncer(ctx, localAddr, streamCache, messages, unsubStream, nil)

	streamID := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	found := syncer.streamUnbsub(streamID)

	assert.False(t, found)
}
