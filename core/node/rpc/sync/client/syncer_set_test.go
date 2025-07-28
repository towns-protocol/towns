package client

import (
	"context"
	"errors"
	"sync/atomic"
	"testing"

	"github.com/ethereum/go-ethereum/common"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	. "github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/testutils"
	"github.com/towns-protocol/towns/core/node/testutils/mocks"
)

// Helper functions for testing
func createTestSyncerSet(ctx context.Context, localAddr common.Address) (*SyncerSet, *mockStreamCache, *mockMessageDistributor, *mocks.MockNodeRegistry) {
	streamCache := &mockStreamCache{}
	messageDistributor := &mockMessageDistributor{}
	nodeRegistry := &mocks.MockNodeRegistry{}

	// Default unsubStream callback that does nothing
	unsubStream := func(streamID StreamId) {}

	syncerSet := NewSyncers(
		ctx,
		streamCache,
		nodeRegistry,
		localAddr,
		messageDistributor,
		unsubStream,
		nil, // no otel tracer
	)

	return syncerSet, streamCache, messageDistributor, nodeRegistry
}

// createTestSyncerSetWithCallback creates a test syncer set with a custom unsubStream callback
func createTestSyncerSetWithCallback(ctx context.Context, localAddr common.Address, unsubStream func(StreamId)) (*SyncerSet, *mockStreamCache, *mockMessageDistributor, *mocks.MockNodeRegistry) {
	streamCache := &mockStreamCache{}
	messageDistributor := &mockMessageDistributor{}
	nodeRegistry := &mocks.MockNodeRegistry{}

	syncerSet := NewSyncers(
		ctx,
		streamCache,
		nodeRegistry,
		localAddr,
		messageDistributor,
		unsubStream,
		nil, // no otel tracer
	)

	return syncerSet, streamCache, messageDistributor, nodeRegistry
}

// TestModify tests the Modify method with various scenarios
func TestModify(t *testing.T) {
	tests := []struct {
		name                     string
		setupFunc                func(*testing.T, *SyncerSet, *mockStreamCache)
		syncStopped              bool
		toAdd                    int
		toRemove                 []StreamId
		toBackfill               []StreamId
		expectedAddFailures      int
		expectedBackfillFailures int
		expectedRemoveFailures   int
		expectedError            string
		verifyFunc               func(*testing.T, *SyncerSet)
	}{
		{
			name: "concurrent stream processing",
			setupFunc: func(t *testing.T, ss *SyncerSet, sc *mockStreamCache) {
				// Create a mock stream with all required methods
				mockStream := &mockStream{}
				mockStream.On("GetRemotesAndIsLocal").Return([]common.Address{ss.localNodeAddress}, true)
				mockStream.On("GetStickyPeer").Return(ss.localNodeAddress)
				mockStream.On("AdvanceStickyPeer", mock.Anything).Return(ss.localNodeAddress).Maybe()
				mockStream.On("StreamId").Return(mock.AnythingOfType("shared.StreamId"))
				mockStream.On("UpdatesSinceCookie", mock.Anything, mock.Anything, mock.Anything).Return(nil).Maybe()
				mockStream.On("Sub", mock.Anything, mock.Anything, mock.Anything).Return(nil).Maybe()
				mockStream.On("Unsub", mock.Anything).Return().Maybe()
				
				// Mock stream cache to return local streams
				sc.On("GetStreamNoWait", mock.Anything, mock.Anything).Return(mockStream, nil)
				sc.On("GetStreamWaitForLocal", mock.Anything, mock.Anything).Return(mockStream, nil).Maybe()
			},
			toAdd:               10,
			expectedAddFailures: 0,
			expectedError:       "",
		},
		{
			name:          "sync stopped",
			syncStopped:   true,
			toAdd:         1,
			expectedError: "Sync stopped",
		},
		{
			name: "add new stream successfully",
			setupFunc: func(t *testing.T, ss *SyncerSet, sc *mockStreamCache) {
				// Mock stream cache
				mockStream := &mockStream{}
				mockStream.On("GetRemotesAndIsLocal").Return([]common.Address{ss.localNodeAddress}, true)
				mockStream.On("GetStickyPeer").Return(ss.localNodeAddress)
				mockStream.On("AdvanceStickyPeer", mock.Anything).Return(ss.localNodeAddress).Maybe()
				mockStream.On("StreamId").Return(mock.AnythingOfType("shared.StreamId")).Maybe()
				mockStream.On("UpdatesSinceCookie", mock.Anything, mock.Anything, mock.Anything).Return(nil).Maybe()
				mockStream.On("Sub", mock.Anything, mock.Anything, mock.Anything).Return(nil).Maybe()
				mockStream.On("Unsub", mock.Anything).Return().Maybe()
				sc.On("GetStreamNoWait", mock.Anything, mock.Anything).Return(mockStream, nil)
				sc.On("GetStreamWaitForLocal", mock.Anything, mock.Anything).Return(mockStream, nil).Maybe()
			},
			toAdd:                    1,
			toRemove:                 []StreamId{},
			toBackfill:               []StreamId{},
			expectedAddFailures:      0,
			expectedBackfillFailures: 0,
			expectedRemoveFailures:   0,
			verifyFunc: func(t *testing.T, ss *SyncerSet) {
				// Verify we have at least one stream added
				count := 0
				ss.streamID2Syncer.Range(func(key StreamId, value StreamsSyncer) bool {
					count++
					return true
				})
				assert.Equal(t, 1, count)
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctx := context.Background()
			localAddr := common.HexToAddress("0x1234567890123456789012345678901234567890")
			syncerSet, streamCache, _, _ := createTestSyncerSet(ctx, localAddr)

			if tt.setupFunc != nil {
				tt.setupFunc(t, syncerSet, streamCache)
			}

			if tt.syncStopped {
				syncerSet.stopped.Store(true)
			}

			// Track handler calls
			var addHandlerCalls, backfillHandlerCalls, removeHandlerCalls int32

			// Create request
			req := ModifyRequest{
				SyncID: "test-sync-1",
				AddingFailureHandler: func(status *SyncStreamOpStatus) {
					atomic.AddInt32(&addHandlerCalls, 1)
				},
				BackfillingFailureHandler: func(status *SyncStreamOpStatus) {
					atomic.AddInt32(&backfillHandlerCalls, 1)
				},
				RemovingFailureHandler: func(status *SyncStreamOpStatus) {
					atomic.AddInt32(&removeHandlerCalls, 1)
				},
			}

			// Add streams
			for i := 0; i < tt.toAdd; i++ {
				streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
				req.ToAdd = append(req.ToAdd, &SyncCookie{StreamId: streamId[:]})
			}

			// Remove streams
			for _, streamId := range tt.toRemove {
				req.ToRemove = append(req.ToRemove, streamId[:])
			}

			// Backfill streams
			if len(tt.toBackfill) > 0 {
				backfill := &ModifySyncRequest_Backfill{
					SyncId: "backfill-sync-1",
				}
				for _, streamId := range tt.toBackfill {
					backfill.Streams = append(backfill.Streams, &SyncCookie{StreamId: streamId[:]})
				}
				req.ToBackfill = append(req.ToBackfill, backfill)
			}

			// Execute
			err := syncerSet.Modify(ctx, req)

			// Verify
			if tt.expectedError != "" {
				require.Error(t, err)
				assert.Contains(t, err.Error(), tt.expectedError)
			} else {
				require.NoError(t, err)
				assert.Equal(t, int32(tt.expectedAddFailures), addHandlerCalls)
				assert.Equal(t, int32(tt.expectedBackfillFailures), backfillHandlerCalls)
				assert.Equal(t, int32(tt.expectedRemoveFailures), removeHandlerCalls)
			}

			if tt.verifyFunc != nil {
				tt.verifyFunc(t, syncerSet)
			}
		})
	}
}

// TestProcessAddingStream tests the processAddingStream method
func TestProcessAddingStream(t *testing.T) {
	tests := []struct {
		name          string
		setupFunc     func(*testing.T, *SyncerSet, *mockStreamCache, *mocks.MockNodeRegistry, StreamId)
		cookie        func(StreamId) *SyncCookie
		expectFailure bool
		expectedCode  int32
		expectedMsg   string
	}{
		{
			name: "successful add",
			setupFunc: func(t *testing.T, ss *SyncerSet, sc *mockStreamCache, nr *mocks.MockNodeRegistry, streamID StreamId) {
				mockStream := &mockStream{}
				mockStream.On("GetRemotesAndIsLocal").Return([]common.Address{ss.localNodeAddress}, true)
				mockStream.On("GetStickyPeer").Return(ss.localNodeAddress)
				mockStream.On("AdvanceStickyPeer", mock.Anything).Return(ss.localNodeAddress).Maybe()
				mockStream.On("StreamId").Return(streamID)
				mockStream.On("UpdatesSinceCookie", mock.Anything, mock.Anything, mock.Anything).Return(nil).Maybe()
				mockStream.On("Sub", mock.Anything, mock.Anything, mock.Anything).Return(nil).Maybe()
				mockStream.On("Unsub", mock.Anything).Return().Maybe()
				sc.On("GetStreamNoWait", mock.Anything, streamID).Return(mockStream, nil)
				sc.On("GetStreamWaitForLocal", mock.Anything, streamID).Return(mockStream, nil).Maybe()
			},
			expectFailure: false,
		},
		{
			name: "stream already exists (backfill)",
			setupFunc: func(t *testing.T, ss *SyncerSet, sc *mockStreamCache, nr *mocks.MockNodeRegistry, streamID StreamId) {
				// Pre-populate stream
				mockSyncer := &mockStreamsSyncer{}
				mockSyncer.On("Address").Return(ss.localNodeAddress)
				mockSyncer.On("Modify", mock.Anything, mock.MatchedBy(func(req *ModifySyncRequest) bool {
					return req.BackfillStreams != nil
				})).Return(&ModifySyncResponse{}, false, nil)
				ss.streamID2Syncer.Store(streamID, mockSyncer)
			},
			expectFailure: false,
		},
		{
			name: "no available node",
			setupFunc: func(t *testing.T, ss *SyncerSet, sc *mockStreamCache, nr *mocks.MockNodeRegistry, streamID StreamId) {
				sc.On("GetStreamNoWait", mock.Anything, streamID).Return(nil, errors.New("stream not found"))
			},
			expectFailure: true,
			expectedCode:  int32(Err_UNAVAILABLE),
			expectedMsg:   "No available node",
		},
		{
			name: "syncer creation failure",
			setupFunc: func(t *testing.T, ss *SyncerSet, sc *mockStreamCache, nr *mocks.MockNodeRegistry, streamID StreamId) {
				sc.On("GetStreamNoWait", mock.Anything, streamID).Return(nil, errors.New("stream not found"))

				remoteAddr := common.HexToAddress("0x0987654321098765432109876543210987654321")
				mockClient := &mocks.MockStreamServiceClient{}
				nr.On("GetStreamServiceClientForAddress", remoteAddr).Return(mockClient, nil).Once()
				mockClient.On("SyncStreams", mock.Anything, mock.Anything).Return(nil, errors.New("sync failed")).Once()
			},
			cookie: func(streamID StreamId) *SyncCookie {
				remoteAddr := common.HexToAddress("0x0987654321098765432109876543210987654321")
				return &SyncCookie{
					StreamId:    streamID[:],
					NodeAddress: remoteAddr.Bytes(),
				}
			},
			expectFailure: true,
			expectedCode:  int32(Err_UNAVAILABLE),
			expectedMsg:   "No available node",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctx := context.Background()
			localAddr := common.HexToAddress("0x1234567890123456789012345678901234567890")
			syncerSet, streamCache, _, nodeRegistry := createTestSyncerSet(ctx, localAddr)

			streamID := testutils.FakeStreamId(STREAM_CHANNEL_BIN)

			if tt.setupFunc != nil {
				tt.setupFunc(t, syncerSet, streamCache, nodeRegistry, streamID)
			}

			cookie := &SyncCookie{StreamId: streamID[:]}
			if tt.cookie != nil {
				cookie = tt.cookie(streamID)
			}

			var capturedStatus *SyncStreamOpStatus
			handler := func(status *SyncStreamOpStatus) {
				capturedStatus = status
			}

			// Execute
			syncerSet.processAddingStream(ctx, "test-sync", cookie, handler)

			// Verify
			if tt.expectFailure {
				require.NotNil(t, capturedStatus)
				assert.Equal(t, tt.expectedCode, capturedStatus.Code)
				assert.Contains(t, capturedStatus.Message, tt.expectedMsg)
			} else {
				assert.Nil(t, capturedStatus)
				// Verify stream was added
				_, found := syncerSet.streamID2Syncer.Load(streamID)
				assert.True(t, found)
			}
		})
	}
}

// TestProcessBackfillingStream tests the processBackfillingStream method
func TestProcessBackfillingStream(t *testing.T) {
	tests := []struct {
		name          string
		setupFunc     func(*testing.T, *SyncerSet, StreamId)
		expectFailure bool
		expectedCode  int32
		expectedMsg   string
	}{
		{
			name: "successful backfill",
			setupFunc: func(t *testing.T, ss *SyncerSet, streamID StreamId) {
				// Pre-populate stream with syncer
				mockSyncer := &mockStreamsSyncer{}
				mockSyncer.On("Address").Return(ss.localNodeAddress)
				mockSyncer.On("Modify", mock.Anything, mock.MatchedBy(func(req *ModifySyncRequest) bool {
					return req.BackfillStreams != nil && req.BackfillStreams.SyncId == "backfill-sync-1"
				})).Return(&ModifySyncResponse{}, false, nil)
				ss.streamID2Syncer.Store(streamID, mockSyncer)
			},
			expectFailure: false,
		},
		{
			name:          "stream not syncing",
			expectFailure: true,
			expectedCode:  int32(Err_NOT_FOUND),
			expectedMsg:   "Stream must be syncing",
		},
		{
			name: "RPC failure",
			setupFunc: func(t *testing.T, ss *SyncerSet, streamID StreamId) {
				// Pre-populate stream with syncer that fails
				mockSyncer := &mockStreamsSyncer{}
				mockSyncer.On("Address").Return(ss.localNodeAddress)
				mockSyncer.On("Modify", mock.Anything, mock.Anything).Return(nil, false, errors.New("RPC failed"))
				ss.streamID2Syncer.Store(streamID, mockSyncer)
			},
			expectFailure: true,
			expectedMsg:   "RPC failed",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctx := context.Background()
			localAddr := common.HexToAddress("0x1234567890123456789012345678901234567890")
			syncerSet, _, _, _ := createTestSyncerSet(ctx, localAddr)

			streamID := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
			cookie := &SyncCookie{StreamId: streamID[:]}

			if tt.setupFunc != nil {
				tt.setupFunc(t, syncerSet, streamID)
			}

			var capturedStatus *SyncStreamOpStatus
			handler := func(status *SyncStreamOpStatus) {
				capturedStatus = status
			}

			// Execute
			syncerSet.processBackfillingStream(ctx, "test-sync", "backfill-sync-1", cookie, handler)

			// Verify
			if tt.expectFailure {
				require.NotNil(t, capturedStatus)
				if tt.expectedCode != 0 {
					assert.Equal(t, tt.expectedCode, capturedStatus.Code)
				}
				assert.Contains(t, capturedStatus.Message, tt.expectedMsg)
			} else {
				assert.Nil(t, capturedStatus)
			}
		})
	}
}

// TestProcessRemovingStream tests the processRemovingStream method
func TestProcessRemovingStream(t *testing.T) {
	tests := []struct {
		name          string
		setupFunc     func(*testing.T, *SyncerSet, StreamId)
		expectFailure bool
		expectedCode  int32
		expectedMsg   string
		verifyFunc    func(*testing.T, *SyncerSet, StreamId)
	}{
		{
			name: "successful removal",
			setupFunc: func(t *testing.T, ss *SyncerSet, streamID StreamId) {
				// Pre-populate stream
				mockSyncer := &mockStreamsSyncer{}
				mockSyncer.On("Modify", mock.Anything, mock.MatchedBy(func(req *ModifySyncRequest) bool {
					return len(req.RemoveStreams) == 1 && string(req.RemoveStreams[0]) == string(streamID[:])
				})).Return(&ModifySyncResponse{}, false, nil)
				ss.streamID2Syncer.Store(streamID, mockSyncer)
			},
			expectFailure: false,
			verifyFunc: func(t *testing.T, ss *SyncerSet, streamID StreamId) {
				_, found := ss.streamID2Syncer.Load(streamID)
				assert.False(t, found) // Stream should be removed
			},
		},
		{
			name:          "stream not found",
			expectFailure: false, // No failure, just no-op
		},
		{
			name: "RPC failure",
			setupFunc: func(t *testing.T, ss *SyncerSet, streamID StreamId) {
				// Pre-populate stream with failing syncer
				mockSyncer := &mockStreamsSyncer{}
				mockSyncer.On("Modify", mock.Anything, mock.Anything).Return(&ModifySyncResponse{
					Removals: []*SyncStreamOpStatus{{
						StreamId: streamID[:],
						Code:     int32(Err_INTERNAL),
						Message:  "Removal failed",
					}},
				}, false, nil)
				ss.streamID2Syncer.Store(streamID, mockSyncer)
			},
			expectFailure: true,
			expectedCode:  int32(Err_INTERNAL),
			expectedMsg:   "Removal failed",
			verifyFunc: func(t *testing.T, ss *SyncerSet, streamID StreamId) {
				_, found := ss.streamID2Syncer.Load(streamID)
				assert.True(t, found) // Stream should NOT be removed on failure
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctx := context.Background()
			localAddr := common.HexToAddress("0x1234567890123456789012345678901234567890")
			syncerSet, _, _, _ := createTestSyncerSet(ctx, localAddr)

			streamID := testutils.FakeStreamId(STREAM_CHANNEL_BIN)

			if tt.setupFunc != nil {
				tt.setupFunc(t, syncerSet, streamID)
			}

			var capturedStatus *SyncStreamOpStatus
			handler := func(status *SyncStreamOpStatus) {
				capturedStatus = status
			}

			// Execute
			syncerSet.processRemovingStream(ctx, streamID, handler)

			// Verify
			if tt.expectFailure {
				require.NotNil(t, capturedStatus)
				assert.Equal(t, tt.expectedCode, capturedStatus.Code)
				assert.Equal(t, tt.expectedMsg, capturedStatus.Message)
			} else {
				assert.Nil(t, capturedStatus)
			}

			if tt.verifyFunc != nil {
				tt.verifyFunc(t, syncerSet, streamID)
			}
		})
	}
}

// TestSelectNodeForStream tests the selectNodeForStream method
func TestSelectNodeForStream(t *testing.T) {
	tests := []struct {
		name              string
		setupFunc         func(*testing.T, *SyncerSet, *mockStreamCache, StreamId) *SyncCookie
		changeNode        bool
		expectedNode      common.Address
		expectedAvailable bool
	}{
		{
			name: "use node from cookie",
			setupFunc: func(t *testing.T, ss *SyncerSet, sc *mockStreamCache, streamID StreamId) *SyncCookie {
				cookieAddr := common.HexToAddress("0x0987654321098765432109876543210987654321")

				// Pre-populate syncer for cookie node
				mockSyncer := &mockStreamsSyncer{}
				mockSyncer.On("Address").Return(cookieAddr)
				ss.syncers.Store(cookieAddr, &syncerWithLock{StreamsSyncer: mockSyncer})

				return &SyncCookie{
					StreamId:    streamID[:],
					NodeAddress: cookieAddr.Bytes(),
				}
			},
			expectedNode:      common.HexToAddress("0x0987654321098765432109876543210987654321"),
			expectedAvailable: true,
		},
		{
			name: "local stream",
			setupFunc: func(t *testing.T, ss *SyncerSet, sc *mockStreamCache, streamID StreamId) *SyncCookie {
				// Mock stream as local
				mockStream := &mockStream{}
				mockStream.On("GetRemotesAndIsLocal").Return([]common.Address{}, true)
				mockStream.On("GetStickyPeer").Return(ss.localNodeAddress)
				mockStream.On("AdvanceStickyPeer", mock.Anything).Return(ss.localNodeAddress).Maybe()
				mockStream.On("StreamId").Return(streamID).Maybe()
				mockStream.On("UpdatesSinceCookie", mock.Anything, mock.Anything, mock.Anything).Return(nil).Maybe()
				mockStream.On("Sub", mock.Anything, mock.Anything, mock.Anything).Return(nil).Maybe()
				mockStream.On("Unsub", mock.Anything).Return().Maybe()
				sc.On("GetStreamNoWait", mock.Anything, streamID).Return(mockStream, nil)

				return &SyncCookie{StreamId: streamID[:]}
			},
			expectedNode:      common.HexToAddress("0x1234567890123456789012345678901234567890"),
			expectedAvailable: true,
		},
		{
			name: "remote nodes",
			setupFunc: func(t *testing.T, ss *SyncerSet, sc *mockStreamCache, streamID StreamId) *SyncCookie {
				remoteAddr1 := common.HexToAddress("0x1111111111111111111111111111111111111111")
				remoteAddr2 := common.HexToAddress("0x2222222222222222222222222222222222222222")

				// Mock stream with remotes
				mockStream := &mockStream{}
				mockStream.On("GetRemotesAndIsLocal").Return([]common.Address{remoteAddr1, remoteAddr2}, false)
				mockStream.On("GetStickyPeer").Return(remoteAddr1)
				mockStream.On("AdvanceStickyPeer", mock.Anything).Return(remoteAddr2).Maybe()
				mockStream.On("StreamId").Return(streamID).Maybe()
				mockStream.On("UpdatesSinceCookie", mock.Anything, mock.Anything, mock.Anything).Return(nil).Maybe()
				mockStream.On("Sub", mock.Anything, mock.Anything, mock.Anything).Return(nil).Maybe()
				mockStream.On("Unsub", mock.Anything).Return().Maybe()
				sc.On("GetStreamNoWait", mock.Anything, streamID).Return(mockStream, nil)

				// Pre-populate syncer for first remote
				mockSyncer := &mockStreamsSyncer{}
				mockSyncer.On("Address").Return(remoteAddr1)
				ss.syncers.Store(remoteAddr1, &syncerWithLock{StreamsSyncer: mockSyncer})

				return &SyncCookie{StreamId: streamID[:]}
			},
			expectedNode:      common.HexToAddress("0x1111111111111111111111111111111111111111"),
			expectedAvailable: true,
		},
		{
			name: "changeNode flag",
			setupFunc: func(t *testing.T, ss *SyncerSet, sc *mockStreamCache, streamID StreamId) *SyncCookie {
				usedNode := common.HexToAddress("0x1111111111111111111111111111111111111111")
				alternateNode := common.HexToAddress("0x2222222222222222222222222222222222222222")

				// Mock stream with remotes
				mockStream := &mockStream{}
				mockStream.On("GetRemotesAndIsLocal").Return([]common.Address{usedNode, alternateNode}, false)
				mockStream.On("GetStickyPeer").Return(alternateNode)
				mockStream.On("AdvanceStickyPeer", usedNode).Return(alternateNode)
				mockStream.On("StreamId").Return(streamID).Maybe()
				mockStream.On("UpdatesSinceCookie", mock.Anything, mock.Anything, mock.Anything).Return(nil).Maybe()
				mockStream.On("Sub", mock.Anything, mock.Anything, mock.Anything).Return(nil).Maybe()
				mockStream.On("Unsub", mock.Anything).Return().Maybe()
				sc.On("GetStreamNoWait", mock.Anything, streamID).Return(mockStream, nil)

				// Pre-populate syncers for both nodes
				mockSyncerUsed := &mockStreamsSyncer{}
				mockSyncerUsed.On("Address").Return(usedNode)
				ss.syncers.Store(usedNode, &syncerWithLock{StreamsSyncer: mockSyncerUsed})

				mockSyncerAlt := &mockStreamsSyncer{}
				mockSyncerAlt.On("Address").Return(alternateNode)
				ss.syncers.Store(alternateNode, &syncerWithLock{StreamsSyncer: mockSyncerAlt})

				return &SyncCookie{
					StreamId:    streamID[:],
					NodeAddress: usedNode.Bytes(),
				}
			},
			changeNode:        true,
			expectedNode:      common.HexToAddress("0x2222222222222222222222222222222222222222"),
			expectedAvailable: true,
		},
		{
			name: "no available nodes",
			setupFunc: func(t *testing.T, ss *SyncerSet, sc *mockStreamCache, streamID StreamId) *SyncCookie {
				// Mock stream cache to return error
				sc.On("GetStreamNoWait", mock.Anything, streamID).Return(nil, errors.New("stream not found"))

				return &SyncCookie{StreamId: streamID[:]}
			},
			expectedNode:      common.Address{},
			expectedAvailable: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctx := context.Background()
			localAddr := common.HexToAddress("0x1234567890123456789012345678901234567890")
			syncerSet, streamCache, _, _ := createTestSyncerSet(ctx, localAddr)

			streamID := testutils.FakeStreamId(STREAM_CHANNEL_BIN)

			cookie := &SyncCookie{StreamId: streamID[:]}
			if tt.setupFunc != nil {
				cookie = tt.setupFunc(t, syncerSet, streamCache, streamID)
			}

			// Execute
			selectedNode, available := syncerSet.selectNodeForStream(ctx, cookie, tt.changeNode)

			// Verify
			assert.Equal(t, tt.expectedAvailable, available)
			assert.Equal(t, tt.expectedNode, selectedNode)
		})
	}
}

// TestDebugDropStream tests the DebugDropStream method
func TestDebugDropStream(t *testing.T) {
	tests := []struct {
		name          string
		setupFunc     func(*testing.T, *SyncerSet, StreamId)
		expectedError string
	}{
		{
			name: "successful drop",
			setupFunc: func(t *testing.T, ss *SyncerSet, streamID StreamId) {
				// Pre-populate stream
				mockSyncer := &mockStreamsSyncer{}
				mockSyncer.On("DebugDropStream", mock.Anything, streamID).Return(true, nil)
				ss.streamID2Syncer.Store(streamID, mockSyncer)
			},
		},
		{
			name:          "stream not found",
			expectedError: "Stream not part of sync operation",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctx := context.Background()
			localAddr := common.HexToAddress("0x1234567890123456789012345678901234567890")
			syncerSet, _, _, _ := createTestSyncerSet(ctx, localAddr)

			streamID := testutils.FakeStreamId(STREAM_CHANNEL_BIN)

			if tt.setupFunc != nil {
				tt.setupFunc(t, syncerSet, streamID)
			}

			// Execute
			err := syncerSet.DebugDropStream(ctx, streamID)

			// Verify
			if tt.expectedError != "" {
				require.Error(t, err)
				assert.Contains(t, err.Error(), tt.expectedError)
			} else {
				require.NoError(t, err)
				_, found := syncerSet.streamID2Syncer.Load(streamID)
				assert.False(t, found) // Stream should be removed
			}
		})
	}
}

// TestValidate tests the Validate method on ModifyRequest
func TestValidate(t *testing.T) {
	tests := []struct {
		name          string
		buildRequest  func() *ModifyRequest
		expectedError string
	}{
		{
			name: "empty request",
			buildRequest: func() *ModifyRequest {
				return &ModifyRequest{}
			},
			expectedError: "Empty modify sync request",
		},
		{
			name: "duplicate in add list",
			buildRequest: func() *ModifyRequest {
				streamID := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
				return &ModifyRequest{
					ToAdd: []*SyncCookie{
						{StreamId: streamID[:]},
						{StreamId: streamID[:]}, // Duplicate
					},
				}
			},
			expectedError: "Duplicate stream in add list",
		},
		{
			name: "duplicate in remove list",
			buildRequest: func() *ModifyRequest {
				streamID := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
				return &ModifyRequest{
					ToRemove: [][]byte{
						streamID[:],
						streamID[:], // Duplicate
					},
				}
			},
			expectedError: "Duplicate stream in remove list",
		},
		{
			name: "stream in both add and remove",
			buildRequest: func() *ModifyRequest {
				streamID := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
				return &ModifyRequest{
					ToAdd: []*SyncCookie{
						{StreamId: streamID[:]},
					},
					ToRemove: [][]byte{
						streamID[:],
					},
				}
			},
			expectedError: "Stream in remove list is also in add list",
		},
		{
			name: "duplicate in backfill list",
			buildRequest: func() *ModifyRequest {
				streamID := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
				return &ModifyRequest{
					ToBackfill: []*ModifySyncRequest_Backfill{
						{
							Streams: []*SyncCookie{
								{StreamId: streamID[:]},
								{StreamId: streamID[:]}, // Duplicate
							},
						},
					},
				}
			},
			expectedError: "Duplicate stream in backfill list",
		},
		{
			name: "invalid stream ID in add list",
			buildRequest: func() *ModifyRequest {
				return &ModifyRequest{
					ToAdd: []*SyncCookie{
						{StreamId: []byte{0x01, 0x02}}, // Too short
					},
				}
			},
			expectedError: "Invalid stream",
		},
		{
			name: "invalid stream ID in remove list",
			buildRequest: func() *ModifyRequest {
				return &ModifyRequest{
					ToRemove: [][]byte{
						{0x01}, // Too short
					},
				}
			},
			expectedError: "Invalid stream",
		},
		{
			name: "invalid stream ID in backfill list",
			buildRequest: func() *ModifyRequest {
				return &ModifyRequest{
					ToBackfill: []*ModifySyncRequest_Backfill{
						{
							Streams: []*SyncCookie{
								{StreamId: nil}, // Nil
							},
						},
					},
				}
			},
			expectedError: "Invalid stream",
		},
		{
			name: "valid request",
			buildRequest: func() *ModifyRequest {
				streamID1 := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
				streamID2 := testutils.FakeStreamId(STREAM_SPACE_BIN)
				streamID3 := testutils.FakeStreamId(STREAM_DM_CHANNEL_BIN)
				return &ModifyRequest{
					ToAdd: []*SyncCookie{
						{StreamId: streamID1[:]},
					},
					ToRemove: [][]byte{
						streamID2[:],
					},
					ToBackfill: []*ModifySyncRequest_Backfill{
						{
							Streams: []*SyncCookie{
								{StreamId: streamID3[:]},
							},
						},
					},
				}
			},
			expectedError: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := tt.buildRequest()
			err := req.Validate()

			if tt.expectedError != "" {
				require.Error(t, err)
				assert.Contains(t, err.Error(), tt.expectedError)
			} else {
				require.NoError(t, err)
			}
		})
	}
}

// TestStreamLocking tests the stream locking mechanism
func TestStreamLocking(t *testing.T) {
	ctx := context.Background()
	localAddr := common.HexToAddress("0x1234567890123456789012345678901234567890")
	syncerSet, _, _, _ := createTestSyncerSet(ctx, localAddr)

	streamID := testutils.FakeStreamId(STREAM_CHANNEL_BIN)

	// Test locking
	unlock := syncerSet.lockStream(streamID)

	// Verify lock exists
	lock, found := syncerSet.streamLocks.Load(streamID)
	assert.True(t, found)
	assert.False(t, lock.TryLock()) // Should be locked

	// Unlock
	unlock()

	// Verify it's unlocked
	assert.True(t, lock.TryLock())
	lock.Unlock()

	// Test unlocking non-existent stream
	nonExistentStream := testutils.FakeStreamId(STREAM_SPACE_BIN)
	syncerSet.unlockStream(nonExistentStream) // Should not panic
}

// TestOnStreamDown tests the onStreamDown method
func TestOnStreamDown(t *testing.T) {
	ctx := context.Background()
	localAddr := common.HexToAddress("0x1234567890123456789012345678901234567890")

	// Track unsubscribe calls
	unsubCalls := make([]StreamId, 0)
	syncerSet, _, _, _ := createTestSyncerSetWithCallback(ctx, localAddr, func(streamID StreamId) {
		unsubCalls = append(unsubCalls, streamID)
	})

	// Add some streams
	stream1 := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	stream2 := testutils.FakeStreamId(STREAM_SPACE_BIN)

	mockSyncer1 := &mockStreamsSyncer{}
	mockSyncer1.On("Address").Return(localAddr)
	syncerSet.streamID2Syncer.Store(stream1, mockSyncer1)

	mockSyncer2 := &mockStreamsSyncer{}
	mockSyncer2.On("Address").Return(localAddr)
	syncerSet.streamID2Syncer.Store(stream2, mockSyncer2)

	// Simulate stream down
	syncerSet.onStreamDown(stream1)

	// Verify
	assert.Len(t, unsubCalls, 1)
	assert.Equal(t, stream1, unsubCalls[0])
	
	// Verify stream was removed from syncer set
	_, found := syncerSet.streamID2Syncer.Load(stream1)
	assert.False(t, found)
	
	// Verify other stream is still there
	_, found = syncerSet.streamID2Syncer.Load(stream2)
	assert.True(t, found)
}
