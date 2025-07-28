package client

import (
	"context"
	"errors"
	"sync"
	"testing"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/linkdata/deadlock"
	"github.com/puzpuzpuz/xsync/v4"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	. "github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/shared"
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

// TestGetOrCreateSyncer_LocalNode tests creating a local syncer
func TestGetOrCreateSyncer_LocalNode(t *testing.T) {
	ctx := context.Background()
	localAddr := common.HexToAddress("0x1234567890123456789012345678901234567890")

	syncerSet, streamCache, messageDistributor, _ := createTestSyncerSet(ctx, localAddr)

	// Test creating local syncer
	syncer, err := syncerSet.getOrCreateSyncer(ctx, localAddr)

	require.NoError(t, err)
	require.NotNil(t, syncer)
	assert.Equal(t, localAddr, syncer.Address())

	// Verify syncer is stored
	storedSyncerEntry, found := syncerSet.syncers.Load(localAddr)
	assert.True(t, found)
	assert.Equal(t, syncer, storedSyncerEntry.StreamsSyncer)

	// Test getting the same syncer again (should return cached)
	syncer2, err := syncerSet.getOrCreateSyncer(ctx, localAddr)
	require.NoError(t, err)
	assert.Equal(t, syncer, syncer2)

	// Cleanup
	streamCache.AssertExpectations(t)
	messageDistributor.AssertExpectations(t)
}

// TestGetOrCreateSyncer_RemoteNode tests creating a remote syncer
func TestGetOrCreateSyncer_RemoteNode(t *testing.T) {
	ctx := context.Background()
	localAddr := common.HexToAddress("0x1234567890123456789012345678901234567890")
	remoteAddr := common.HexToAddress("0x0987654321098765432109876543210987654321")

	syncerSet, streamCache, messageDistributor, nodeRegistry := createTestSyncerSet(ctx, localAddr)

	// Mock the stream service client
	mockClient := &mocks.MockStreamServiceClient{}
	nodeRegistry.On("GetStreamServiceClientForAddress", remoteAddr).Return(mockClient, nil)

	// Mock SyncStreams to return an error (simpler test)
	expectedErr := errors.New("sync stream error")
	mockClient.On("SyncStreams", mock.Anything, mock.Anything).Return(nil, expectedErr)

	// Test creating remote syncer with error
	syncer, err := syncerSet.getOrCreateSyncer(ctx, remoteAddr)

	require.Error(t, err)
	require.Nil(t, syncer)
	assert.Contains(t, err.Error(), "sync stream error")

	// Verify syncer is NOT stored
	syncerEntity, found := syncerSet.syncers.Load(remoteAddr)
	assert.True(t, found)
	assert.Nil(t, syncerEntity.StreamsSyncer)

	// Cleanup
	nodeRegistry.AssertExpectations(t)
	streamCache.AssertExpectations(t)
	messageDistributor.AssertExpectations(t)
}

// TestGetOrCreateSyncer_RemoteNodeError tests error handling when creating remote syncer fails
func TestGetOrCreateSyncer_RemoteNodeError(t *testing.T) {
	ctx := context.Background()
	localAddr := common.HexToAddress("0x1234567890123456789012345678901234567890")
	remoteAddr := common.HexToAddress("0x0987654321098765432109876543210987654321")

	syncerSet, streamCache, messageDistributor, nodeRegistry := createTestSyncerSet(ctx, localAddr)

	// Mock the stream service client to return error
	expectedErr := errors.New("connection failed")
	nodeRegistry.On("GetStreamServiceClientForAddress", remoteAddr).Return(nil, expectedErr)

	// Test creating remote syncer with error
	syncer, err := syncerSet.getOrCreateSyncer(ctx, remoteAddr)

	require.Error(t, err)
	require.Nil(t, syncer)
	assert.Contains(t, err.Error(), "connection failed")

	// Verify syncer is NOT stored
	syncerEntity, found := syncerSet.syncers.Load(remoteAddr)
	assert.True(t, found)
	assert.Nil(t, syncerEntity.StreamsSyncer)

	// Cleanup
	nodeRegistry.AssertExpectations(t)
	streamCache.AssertExpectations(t)
	messageDistributor.AssertExpectations(t)
}

// TestGetOrCreateSyncer_SyncStopped tests behavior when sync is stopped
func TestGetOrCreateSyncer_SyncStopped(t *testing.T) {
	ctx := context.Background()
	localAddr := common.HexToAddress("0x1234567890123456789012345678901234567890")

	syncerSet, streamCache, messageDistributor, _ := createTestSyncerSet(ctx, localAddr)

	// Mark sync as stopped
	syncerSet.stopped.Store(true)

	// Test creating syncer when stopped
	syncer, err := syncerSet.getOrCreateSyncer(ctx, localAddr)

	require.Error(t, err)
	require.Nil(t, syncer)
	assert.Contains(t, err.Error(), "Sync stopped")

	// Verify syncer is NOT stored
	_, found := syncerSet.syncers.Load(localAddr)
	assert.False(t, found)

	// Cleanup
	streamCache.AssertExpectations(t)
	messageDistributor.AssertExpectations(t)
}

// TestGetOrCreateSyncer_ConcurrentAccess tests concurrent access to getOrCreateSyncer
func TestGetOrCreateSyncer_ConcurrentAccess(t *testing.T) {
	ctx := context.Background()
	localAddr := common.HexToAddress("0x1234567890123456789012345678901234567890")

	syncerSet, streamCache, messageDistributor, _ := createTestSyncerSet(ctx, localAddr)

	// Use more goroutines to increase chance of race conditions
	numGoroutines := 50
	var wg sync.WaitGroup
	results := make([]StreamsSyncer, numGoroutines)
	errors := make([]error, numGoroutines)

	// Start all goroutines at once using WaitGroup for better concurrency
	wg.Add(numGoroutines)
	start := make(chan struct{})

	for i := 0; i < numGoroutines; i++ {
		go func(idx int) {
			defer wg.Done()
			<-start // Wait for signal to start all at once
			results[idx], errors[idx] = syncerSet.getOrCreateSyncer(ctx, localAddr)
		}(i)
	}

	// Release all goroutines at once
	close(start)
	wg.Wait()

	// Verify all succeeded and got the same instance
	var firstSyncer StreamsSyncer
	for i := 0; i < numGoroutines; i++ {
		require.NoError(t, errors[i])
		require.NotNil(t, results[i])

		if firstSyncer == nil {
			firstSyncer = results[i]
		} else {
			assert.Same(t, firstSyncer, results[i], "All goroutines should get the same syncer instance")
		}
	}

	// Verify syncer is properly stored
	storedSyncerEntry, found := syncerSet.syncers.Load(localAddr)
	assert.True(t, found)
	assert.Equal(t, firstSyncer, storedSyncerEntry.StreamsSyncer)

	// Cleanup
	streamCache.AssertExpectations(t)
	messageDistributor.AssertExpectations(t)
}

// TestGetOrCreateSyncer_RemoteSyncerInitError tests when NewRemoteSyncer returns an error
func TestGetOrCreateSyncer_RemoteSyncerInitError(t *testing.T) {
	ctx := context.Background()
	localAddr := common.HexToAddress("0x1234567890123456789012345678901234567890")
	remoteAddr := common.HexToAddress("0x0987654321098765432109876543210987654321")

	syncerSet, streamCache, messageDistributor, nodeRegistry := createTestSyncerSet(ctx, localAddr)

	// Mock the stream service client
	mockClient := &mocks.MockStreamServiceClient{}
	nodeRegistry.On("GetStreamServiceClientForAddress", remoteAddr).Return(mockClient, nil)

	// Mock SyncStreams to return error immediately
	expectedErr := errors.New("sync init failed")
	mockClient.On("SyncStreams", mock.Anything, mock.Anything).Return(nil, expectedErr)

	// Test creating remote syncer with init error
	syncer, err := syncerSet.getOrCreateSyncer(ctx, remoteAddr)

	require.Error(t, err)
	require.Nil(t, syncer)
	assert.Contains(t, err.Error(), "sync init failed")

	// Verify syncer is NOT stored
	syncerEntity, found := syncerSet.syncers.Load(remoteAddr)
	assert.True(t, found)
	assert.Nil(t, syncerEntity.StreamsSyncer)

	// Cleanup
	nodeRegistry.AssertExpectations(t)
	mockClient.AssertExpectations(t)
	streamCache.AssertExpectations(t)
	messageDistributor.AssertExpectations(t)
}

// TestGetOrCreateSyncer_SyncerLifecycle tests that syncer is removed when Run completes
func TestGetOrCreateSyncer_SyncerLifecycle(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	localAddr := common.HexToAddress("0x1234567890123456789012345678901234567890")

	syncerSet, streamCache, messageDistributor, _ := createTestSyncerSet(ctx, localAddr)

	// Create a local syncer
	syncer, err := syncerSet.getOrCreateSyncer(ctx, localAddr)
	require.NoError(t, err)
	require.NotNil(t, syncer)

	// Verify syncer is stored
	_, found := syncerSet.syncers.Load(localAddr)
	assert.True(t, found)

	// Cancel context to trigger syncer shutdown
	cancel()

	// Wait for syncer to be removed (give it some time to clean up)
	time.Sleep(100 * time.Millisecond)

	// Verify syncer is removed after Run completes
	syncerEntity, found := syncerSet.syncers.Load(localAddr)
	assert.True(t, found)
	syncerEntity.Lock()
	assert.Nil(t, syncerEntity.StreamsSyncer)
	syncerEntity.Unlock()

	// Cleanup
	streamCache.AssertExpectations(t)
	messageDistributor.AssertExpectations(t)
}

// TestSyncerSet_Run tests the Run method of SyncerSet
func TestSyncerSet_Run(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	localAddr := common.HexToAddress("0x1234567890123456789012345678901234567890")

	syncerSet, streamCache, messageDistributor, _ := createTestSyncerSet(ctx, localAddr)

	// Start Run in a goroutine
	runComplete := make(chan bool)
	go func() {
		syncerSet.Run()
		runComplete <- true
	}()

	// Create a syncer to ensure we have something to wait for
	syncer, err := syncerSet.getOrCreateSyncer(ctx, localAddr)
	require.NoError(t, err)
	require.NotNil(t, syncer)

	// Cancel context
	cancel()

	// Wait for Run to complete
	select {
	case <-runComplete:
		// Success
	case <-time.After(1 * time.Second):
		t.Fatal("Run did not complete in time")
	}

	// Verify stopped flag is set
	assert.True(t, syncerSet.stopped.Load())

	// Cleanup
	streamCache.AssertExpectations(t)
	messageDistributor.AssertExpectations(t)
}

// TestGetOrCreateSyncer_ComputeOpBehavior tests xsync.Compute operation behavior
func TestGetOrCreateSyncer_ComputeOpBehavior(t *testing.T) {
	// This test verifies the atomic nature of the LoadOrStore operation
	ctx := context.Background()
	localAddr := common.HexToAddress("0x1234567890123456789012345678901234567890")
	remoteAddr := common.HexToAddress("0x0987654321098765432109876543210987654321")

	// Create a custom syncer set to test internal behavior
	streamCache := &mockStreamCache{}
	messageDistributor := &mockMessageDistributor{}
	nodeRegistry := &mocks.MockNodeRegistry{}

	syncerSet := &SyncerSet{
		globalCtx:          ctx,
		streamCache:        streamCache,
		nodeRegistry:       nodeRegistry,
		localNodeAddress:   localAddr,
		messageDistributor: messageDistributor,
		syncers:            xsync.NewMap[common.Address, *syncerWithLock](),
		streamID2Syncer:    xsync.NewMap[StreamId, StreamsSyncer](),
		streamLocks:        xsync.NewMap[StreamId, *deadlock.Mutex](),
	}

	// Pre-store a syncer
	existingSyncer := newLocalSyncer(ctx, localAddr, streamCache, messageDistributor, func(StreamId) {}, nil)
	syncerEntry := &syncerWithLock{StreamsSyncer: existingSyncer}
	syncerSet.syncers.Store(remoteAddr, syncerEntry)

	// Try to get the existing syncer
	syncer, err := syncerSet.getOrCreateSyncer(ctx, remoteAddr)

	require.NoError(t, err)
	require.NotNil(t, syncer)
	assert.Equal(t, existingSyncer, syncer) // Should return the existing syncer

	// Verify nodeRegistry was NOT called since syncer already existed
	nodeRegistry.AssertNotCalled(t, "GetStreamServiceClientForAddress", mock.Anything)

	// Cleanup
	streamCache.AssertExpectations(t)
	messageDistributor.AssertExpectations(t)
	nodeRegistry.AssertExpectations(t)
}

// TestGetOrCreateSyncer_RemoteFailure tests remote syncer creation that fails
func TestGetOrCreateSyncer_RemoteFailure(t *testing.T) {
	ctx := context.Background()
	localAddr := common.HexToAddress("0x1234567890123456789012345678901234567890")
	remoteAddr := common.HexToAddress("0x0987654321098765432109876543210987654321")

	syncerSet, streamCache, messageDistributor, nodeRegistry := createTestSyncerSet(ctx, localAddr)

	// Mock the stream service client
	mockClient := &mocks.MockStreamServiceClient{}
	nodeRegistry.On("GetStreamServiceClientForAddress", remoteAddr).Return(mockClient, nil)

	// Mock SyncStreams to return an error
	syncErr := errors.New("sync failed")
	mockClient.On("SyncStreams", mock.Anything, mock.Anything).Return(nil, syncErr)

	// Try to create a remote syncer
	syncer, err := syncerSet.getOrCreateSyncer(ctx, remoteAddr)

	// Should fail with an error
	require.Error(t, err)
	require.Nil(t, syncer)
	assert.Contains(t, err.Error(), "sync failed")

	// Verify no syncer was stored since creation failed
	syncerEntity, found := syncerSet.syncers.Load(remoteAddr)
	assert.True(t, found)
	assert.Nil(t, syncerEntity.StreamsSyncer)

	// Cleanup
	nodeRegistry.AssertExpectations(t)
	mockClient.AssertExpectations(t)
	streamCache.AssertExpectations(t)
	messageDistributor.AssertExpectations(t)
}

// TestStreamLocks_Behavior tests that stream locks work correctly with the new implementation
func TestStreamLocks_Behavior(t *testing.T) {
	ctx := context.Background()
	localAddr := common.HexToAddress("0x1234567890123456789012345678901234567890")

	syncerSet, _, _, _ := createTestSyncerSet(ctx, localAddr)

	streamID := StreamId{0x01, 0x02, 0x03}

	// Use lockStream directly (as processAddingStream would)
	unlock := syncerSet.lockStream(streamID)

	// Verify the lock exists
	lock, found := syncerSet.streamLocks.Load(streamID)
	assert.True(t, found, "Stream lock should exist after locking")
	assert.NotNil(t, lock)

	// Verify we can't acquire the lock (proving it's locked)
	assert.False(t, lock.TryLock(), "Lock should be held")

	// Unlock the stream
	unlock()

	// Verify the lock still exists but is unlocked
	lock, found = syncerSet.streamLocks.Load(streamID)
	assert.True(t, found, "Stream lock should still exist after unlock")
	assert.NotNil(t, lock)

	// Verify we can acquire the lock again (proving it was unlocked)
	assert.True(t, lock.TryLock())
	lock.Unlock()
}

// TestStreamLocks_ConcurrentAccess tests concurrent access to different stream locks
func TestStreamLocks_ConcurrentAccess(t *testing.T) {
	ctx := context.Background()
	localAddr := common.HexToAddress("0x1234567890123456789012345678901234567890")

	syncerSet, _, _, _ := createTestSyncerSet(ctx, localAddr)

	numGoroutines := 20
	var wg sync.WaitGroup

	// Start concurrent goroutines that lock and unlock different streams
	for i := 0; i < numGoroutines; i++ {
		wg.Add(1)
		go func(idx int) {
			defer wg.Done()

			// Each goroutine uses a different stream ID
			streamID := StreamId{byte(idx), 0x02, 0x03}

			// Lock the stream using the new method
			unlock := syncerSet.lockStream(streamID)

			// Simulate some work
			time.Sleep(1 * time.Millisecond)

			// Unlock the stream
			unlock()

			// After unlock, the lock should still exist but be unlocked
			lock, found := syncerSet.streamLocks.Load(streamID)
			assert.True(t, found, "Stream lock should still exist after unlock")

			// Verify we can acquire it again
			if lock != nil && lock.TryLock() {
				lock.Unlock()
			}
		}(i)
	}

	// Wait for all goroutines to complete
	wg.Wait()
}

// TestSyncerWithLock_Embedding tests that syncerWithLock properly embeds StreamsSyncer
func TestSyncerWithLock_Embedding(t *testing.T) {
	localAddr := common.HexToAddress("0x1234567890123456789012345678901234567890")

	// Create a mock syncer
	mockSyncer := &mockStreamsSyncer{}
	mockSyncer.On("Address").Return(localAddr)

	// Create syncerWithLock
	swl := &syncerWithLock{
		StreamsSyncer: mockSyncer,
	}

	// Verify we can call StreamsSyncer methods
	assert.Equal(t, localAddr, swl.Address())

	// Verify we can use the mutex
	swl.Lock()
	swl.Unlock() //lint:ignore SA2001 just waiting for the stream to be unlocked and then proceed

	// Verify TryLock works
	assert.True(t, swl.TryLock())
	swl.Unlock()

	mockSyncer.AssertExpectations(t)
}

// TestOnStreamDown tests the onStreamDown method
func TestOnStreamDown(t *testing.T) {
	ctx := context.Background()
	localAddr := common.HexToAddress("0x1234567890123456789012345678901234567890")

	unsubCalled := false
	var unsubStreamID StreamId
	unsubStream := func(streamID StreamId) {
		unsubCalled = true
		unsubStreamID = streamID
	}

	syncerSet, streamCache, messageDistributor, _ := createTestSyncerSetWithCallback(ctx, localAddr, unsubStream)

	streamID := StreamId{0x01, 0x02, 0x03}

	// Create a mock syncer and add it to streamID2Syncer
	mockSyncer := &mockStreamsSyncer{}
	syncerSet.streamID2Syncer.Store(streamID, mockSyncer)

	// Call onStreamDown
	syncerSet.onStreamDown(streamID)

	// Verify unsubStream was called with correct streamID
	assert.True(t, unsubCalled, "unsubStream should have been called")
	assert.Equal(t, streamID, unsubStreamID, "unsubStream should have been called with correct streamID")

	// Verify stream was removed from streamID2Syncer
	_, found := syncerSet.streamID2Syncer.Load(streamID)
	assert.False(t, found, "Stream should have been removed from streamID2Syncer")

	// Cleanup
	streamCache.AssertExpectations(t)
	messageDistributor.AssertExpectations(t)
	mockSyncer.AssertExpectations(t)
}

// TestOnStreamDown_NilCallback tests onStreamDown when unsubStream is nil
func TestOnStreamDown_NilCallback(t *testing.T) {
	ctx := context.Background()
	localAddr := common.HexToAddress("0x1234567890123456789012345678901234567890")

	// Create syncer set with nil unsubStream callback
	streamCache := &mockStreamCache{}
	messageDistributor := &mockMessageDistributor{}
	nodeRegistry := &mocks.MockNodeRegistry{}

	syncerSet := NewSyncers(
		ctx,
		streamCache,
		nodeRegistry,
		localAddr,
		messageDistributor,
		nil, // nil unsubStream callback
		nil, // no otel tracer
	)

	streamID := StreamId{0x01, 0x02, 0x03}

	// Create a mock syncer and add it to streamID2Syncer
	mockSyncer := &mockStreamsSyncer{}
	syncerSet.streamID2Syncer.Store(streamID, mockSyncer)

	// Call onStreamDown - should not panic even with nil callback
	syncerSet.onStreamDown(streamID)

	// Verify stream was still removed from streamID2Syncer
	_, found := syncerSet.streamID2Syncer.Load(streamID)
	assert.False(t, found, "Stream should have been removed from streamID2Syncer")

	// Cleanup
	streamCache.AssertExpectations(t)
	messageDistributor.AssertExpectations(t)
	nodeRegistry.AssertExpectations(t)
	mockSyncer.AssertExpectations(t)
}
