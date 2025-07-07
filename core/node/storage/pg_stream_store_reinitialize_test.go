package storage

import (
	"fmt"
	"testing"

	"github.com/ethereum/go-ethereum/common"
	"github.com/stretchr/testify/require"

	. "github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/testutils"
)

func TestReinitializeStreamStorage_CreateNew(t *testing.T) {
	params := setupStreamStorageTest(t)
	require := require.New(t)
	ctx := params.ctx
	store := params.pgStreamStore
	defer params.closer()

	streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)

	// Prepare miniblocks
	miniblocks := []*WriteMiniblockData{
		{
			Number:   0,
			Hash:     common.HexToHash("0x01"),
			Data:     []byte("genesis miniblock"),
			Snapshot: []byte("genesis snapshot"),
		},
		{
			Number: 1,
			Hash:   common.HexToHash("0x02"),
			Data:   []byte("miniblock 1"),
		},
		{
			Number: 2,
			Hash:   common.HexToHash("0x03"),
			Data:   []byte("miniblock 2"),
		},
	}

	// Test creating a new stream
	err := store.ReinitializeStreamStorage(ctx, streamId, miniblocks, 0, false)
	require.NoError(err)

	// Verify stream was created
	result, err := store.ReadStreamFromLastSnapshot(ctx, streamId, 10)
	require.NoError(err)
	require.Len(result.Miniblocks, 3)
	require.Equal(0, result.SnapshotMiniblockOffset)
	require.Empty(result.MinipoolEnvelopes)

	// Verify miniblocks
	for i, mb := range result.Miniblocks {
		require.Equal(miniblocks[i].Number, mb.Number)
		require.Equal(miniblocks[i].Data, mb.Data)
		require.Equal(miniblocks[i].Snapshot, mb.Snapshot)
	}

	// Verify minipool generation (new minipool should have generation = last miniblock + 1)
	debugData, err := store.DebugReadStreamData(ctx, streamId)
	require.NoError(err)
	require.NotNil(debugData)
	// Check that only the generation marker exists in minipool (slot -1)
	require.Len(debugData.Events, 1)
	require.Equal(int64(3), debugData.Events[0].Generation)
	require.Equal(int64(-1), debugData.Events[0].Slot)
}

func TestReinitializeStreamStorage_UpdateExisting(t *testing.T) {
	params := setupStreamStorageTest(t)
	require := require.New(t)
	ctx := params.ctx
	store := params.pgStreamStore
	defer params.closer()

	streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)

	// Create initial stream
	genesisMb := &WriteMiniblockData{
		Number:   0,
		Hash:     common.HexToHash("0x01"),
		Data:     []byte("genesis miniblock"),
		Snapshot: []byte("genesis snapshot"),
	}
	err := store.CreateStreamStorage(ctx, streamId, genesisMb)
	require.NoError(err)

	// Add some events to minipool
	err = store.WriteEvent(ctx, streamId, 1, 0, []byte("event 1"))
	require.NoError(err)
	err = store.WriteEvent(ctx, streamId, 1, 1, []byte("event 2"))
	require.NoError(err)

	// Add miniblock candidates
	candidate := &WriteMiniblockData{
		Number: 1,
		Hash:   common.HexToHash("0xc1"),
		Data:   []byte("candidate 1"),
	}
	err = store.WriteMiniblockCandidate(ctx, streamId, candidate)
	require.NoError(err)

	// Prepare new miniblocks for reinitialization
	newMiniblocks := []*WriteMiniblockData{
		{
			Number:   0,
			Hash:     common.HexToHash("0x01"),
			Data:     []byte("new genesis miniblock"),
			Snapshot: []byte("new genesis snapshot"),
		},
		{
			Number:   1,
			Hash:     common.HexToHash("0x02"),
			Data:     []byte("new miniblock 1"),
			Snapshot: []byte("new snapshot 1"),
		},
		{
			Number: 2,
			Hash:   common.HexToHash("0x03"),
			Data:   []byte("new miniblock 2"),
		},
	}

	// Update existing stream
	err = store.ReinitializeStreamStorage(ctx, streamId, newMiniblocks, 1, true)
	require.NoError(err)

	// Verify stream was updated
	result, err := store.ReadStreamFromLastSnapshot(ctx, streamId, 10)
	require.NoError(err)
	// When requesting 10 miniblocks with only 3 total (0,1,2) and snapshot at 1,
	// it returns all miniblocks from 0 to ensure snapshot is included
	require.Len(result.Miniblocks, 3) // Returns all miniblocks 0, 1, 2
	require.Equal(1, result.SnapshotMiniblockOffset) // Snapshot (miniblock 1) is at offset 1
	require.Empty(result.MinipoolEnvelopes) // Minipool should be reset

	// Verify miniblocks were replaced with new data
	for i, mb := range result.Miniblocks {
		require.Equal(newMiniblocks[i].Number, mb.Number)
		require.Equal(newMiniblocks[i].Data, mb.Data)
		require.Equal(newMiniblocks[i].Snapshot, mb.Snapshot)
	}

	// Verify old minipool events were deleted and new generation marker exists
	debugData, err := store.DebugReadStreamData(ctx, streamId)
	require.NoError(err)
	require.Len(debugData.Events, 1) // Only generation marker
	require.Equal(int64(3), debugData.Events[0].Generation)
	require.Equal(int64(-1), debugData.Events[0].Slot)

	// Verify miniblock candidates were deleted
	mbCandidateCount, err := store.GetMiniblockCandidateCount(ctx, streamId, 1)
	require.NoError(err)
	require.Equal(0, mbCandidateCount)
}

func TestReinitializeStreamStorage_ValidationErrors(t *testing.T) {
	params := setupStreamStorageTest(t)
	require := require.New(t)
	ctx := params.ctx
	store := params.pgStreamStore
	defer params.closer()

	streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)

	tests := []struct {
		name                     string
		miniblocks               []*WriteMiniblockData
		lastSnapshotMiniblockNum int64
		expectedError            string
	}{
		{
			name:                     "empty miniblocks",
			miniblocks:               []*WriteMiniblockData{},
			lastSnapshotMiniblockNum: 0,
			expectedError:            "miniblocks cannot be empty",
		},
		{
			name: "invalid snapshot number below range",
			miniblocks: []*WriteMiniblockData{
				{Number: 5, Data: []byte("mb5")},
				{Number: 6, Data: []byte("mb6")},
			},
			lastSnapshotMiniblockNum: 4, // Below the range [5,6]
			expectedError:            "invalid snapshot miniblock number",
		},
		{
			name: "non-continuous miniblock numbers",
			miniblocks: []*WriteMiniblockData{
				{Number: 0, Data: []byte("mb0")},
				{Number: 2, Data: []byte("mb2")}, // Skipped 1
			},
			lastSnapshotMiniblockNum: 0,
			expectedError:            "miniblock numbers must be continuous",
		},
		{
			name: "empty miniblock data",
			miniblocks: []*WriteMiniblockData{
				{Number: 0, Data: []byte("mb0")},
				{Number: 1, Data: []byte{}}, // Empty data
			},
			lastSnapshotMiniblockNum: 0,
			expectedError:            "miniblock data cannot be empty",
		},
		{
			name: "invalid snapshot miniblock number - negative",
			miniblocks: []*WriteMiniblockData{
				{Number: 0, Data: []byte("mb0")},
				{Number: 1, Data: []byte("mb1")},
			},
			lastSnapshotMiniblockNum: -1,
			expectedError:            "invalid snapshot miniblock number",
		},
		{
			name: "invalid snapshot miniblock number - too high",
			miniblocks: []*WriteMiniblockData{
				{Number: 0, Data: []byte("mb0")},
				{Number: 1, Data: []byte("mb1")},
			},
			lastSnapshotMiniblockNum: 2, // Only have 0 and 1
			expectedError:            "invalid snapshot miniblock number",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := store.ReinitializeStreamStorage(ctx, streamId, tt.miniblocks, tt.lastSnapshotMiniblockNum, false)
			require.Error(err)
			require.Contains(err.Error(), tt.expectedError)
		})
	}
}

func TestReinitializeStreamStorage_UpdateValidation(t *testing.T) {
	params := setupStreamStorageTest(t)
	require := require.New(t)
	ctx := params.ctx
	store := params.pgStreamStore
	defer params.closer()

	streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)

	// Create stream with initial miniblocks
	initialMiniblocks := []*WriteMiniblockData{
		{Number: 0, Data: []byte("genesis"), Snapshot: []byte("snapshot")},
		{Number: 1, Data: []byte("miniblock 1")},
		{Number: 2, Data: []byte("miniblock 2")},
	}
	err := store.ReinitializeStreamStorage(ctx, streamId, initialMiniblocks, 0, false)
	require.NoError(err)

	// Try to update with miniblocks not exceeding existing
	newMiniblocks := []*WriteMiniblockData{
		{Number: 0, Data: []byte("new genesis"), Snapshot: []byte("new snapshot")},
		{Number: 1, Data: []byte("new miniblock 1")},
		// Last miniblock is 1, but existing has up to 2
	}
	err = store.ReinitializeStreamStorage(ctx, streamId, newMiniblocks, 0, true)
	require.Error(err)
	require.Contains(err.Error(), "last new miniblock must exceed last existing miniblock")
}

func TestReinitializeStreamStorage_ExistenceChecks(t *testing.T) {
	params := setupStreamStorageTest(t)
	require := require.New(t)
	ctx := params.ctx
	store := params.pgStreamStore
	defer params.closer()

	existingStreamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	nonExistingStreamId := testutils.FakeStreamId(STREAM_SPACE_BIN)

	miniblocks := []*WriteMiniblockData{
		{Number: 0, Data: []byte("genesis"), Snapshot: []byte("snapshot")},
	}

	// Create a stream
	err := store.ReinitializeStreamStorage(ctx, existingStreamId, miniblocks, 0, false)
	require.NoError(err)

	// Test 1: Try to create when stream exists and updateExisting=false
	err = store.ReinitializeStreamStorage(ctx, existingStreamId, miniblocks, 0, false)
	require.Error(err)
	require.Contains(err.Error(), "stream already exists")

	// Test 2: Try to update when stream doesn't exist and updateExisting=true
	err = store.ReinitializeStreamStorage(ctx, nonExistingStreamId, miniblocks, 0, true)
	require.Error(err)
	require.Contains(err.Error(), "stream not found")
}

func TestReinitializeStreamStorage_CandidateCleanup(t *testing.T) {
	params := setupStreamStorageTest(t)
	require := require.New(t)
	ctx := params.ctx
	store := params.pgStreamStore
	defer params.closer()

	streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)

	// Create initial stream
	genesisMb := &WriteMiniblockData{
		Number:   0,
		Hash:     common.HexToHash("0x01"),
		Data:     []byte("genesis miniblock"),
		Snapshot: []byte("genesis snapshot"),
	}
	err := store.CreateStreamStorage(ctx, streamId, genesisMb)
	require.NoError(err)

	// Add multiple miniblock candidates
	candidates := []*WriteMiniblockData{
		{Number: 1, Hash: common.HexToHash("0xc1"), Data: []byte("candidate 1")},
		{Number: 2, Hash: common.HexToHash("0xc2"), Data: []byte("candidate 2")},
		{Number: 3, Hash: common.HexToHash("0xc3"), Data: []byte("candidate 3")},
	}
	for _, c := range candidates {
		err = store.WriteMiniblockCandidate(ctx, streamId, c)
		require.NoError(err)
	}

	// Verify candidates exist
	candidateCount := 0
	for _, c := range candidates {
		count, err := store.GetMiniblockCandidateCount(ctx, streamId, c.Number)
		require.NoError(err)
		candidateCount += count
	}
	require.Equal(3, candidateCount)

	// Reinitialize stream
	newMiniblocks := []*WriteMiniblockData{
		{Number: 0, Data: []byte("new genesis"), Snapshot: []byte("new snapshot")},
		{Number: 1, Data: []byte("new miniblock 1")},
	}
	err = store.ReinitializeStreamStorage(ctx, streamId, newMiniblocks, 0, true)
	require.NoError(err)

	// Verify all candidates were deleted
	candidateCount = 0
	for i := int64(0); i < 5; i++ {
		count, err := store.GetMiniblockCandidateCount(ctx, streamId, i)
		require.NoError(err)
		candidateCount += count
	}
	require.Equal(0, candidateCount)
}

func TestReinitializeStreamStorage_TransactionRollback(t *testing.T) {
	params := setupStreamStorageTest(t)
	require := require.New(t)
	ctx := params.ctx
	store := params.pgStreamStore
	defer params.closer()

	streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)

	// Create initial stream
	genesisMb := &WriteMiniblockData{
		Number:   0,
		Hash:     common.HexToHash("0x01"),
		Data:     []byte("genesis miniblock"),
		Snapshot: []byte("genesis snapshot"),
	}
	err := store.CreateStreamStorage(ctx, streamId, genesisMb)
	require.NoError(err)

	// Add event to minipool
	err = store.WriteEvent(ctx, streamId, 1, 0, []byte("event 1"))
	require.NoError(err)

	// Get initial state
	initialResult, err := store.ReadStreamFromLastSnapshot(ctx, streamId, 10)
	require.NoError(err)
	initialDebugData, err := store.DebugReadStreamData(ctx, streamId)
	require.NoError(err)

	// Prepare miniblocks that will cause an error (duplicate miniblock number)
	badMiniblocks := []*WriteMiniblockData{
		{Number: 0, Data: []byte("new mb0"), Snapshot: []byte("snapshot")},
		{Number: 1, Data: []byte("new mb1")},
		{Number: 1, Data: []byte("duplicate")}, // This will cause an error
	}

	// Attempt reinitialization (should fail)
	err = store.ReinitializeStreamStorage(ctx, streamId, badMiniblocks, 0, true)
	require.Error(err)

	// Verify nothing changed
	finalResult, err := store.ReadStreamFromLastSnapshot(ctx, streamId, 10)
	require.NoError(err)
	require.Equal(initialResult.Miniblocks, finalResult.Miniblocks)

	// Verify minipool wasn't changed
	finalDebugData, err := store.DebugReadStreamData(ctx, streamId)
	require.NoError(err)
	require.Equal(len(initialDebugData.Events), len(finalDebugData.Events))
}

func TestReinitializeStreamStorage_LargeDataSet(t *testing.T) {
	params := setupStreamStorageTest(t)
	require := require.New(t)
	ctx := params.ctx
	store := params.pgStreamStore
	defer params.closer()

	streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)

	// Create 100+ miniblocks
	miniblocks := make([]*WriteMiniblockData, 150)
	for i := 0; i < 150; i++ {
		miniblocks[i] = &WriteMiniblockData{
			Number: int64(i),
			Hash:   common.BytesToHash([]byte(fmt.Sprintf("hash%d", i))),
			Data:   []byte(fmt.Sprintf("miniblock data %d", i)),
		}
		// Add snapshot every 10 miniblocks
		if i%10 == 0 {
			miniblocks[i].Snapshot = []byte(fmt.Sprintf("snapshot at %d", i))
		}
	}

	// Initialize stream with large dataset
	err := store.ReinitializeStreamStorage(ctx, streamId, miniblocks, 140, false)
	require.NoError(err)

	// Verify stream was created correctly
	result, err := store.ReadStreamFromLastSnapshot(ctx, streamId, 20)
	require.NoError(err)
	// ReadStreamFromLastSnapshot returns more than requested when including from snapshot
	// It returns from snapshot (140) to the end (149), which is 10 miniblocks
	require.GreaterOrEqual(len(result.Miniblocks), 10)

	// Read all miniblocks to verify
	allMiniblocks, err := store.ReadMiniblocks(ctx, streamId, 0, 150, false)
	require.NoError(err)
	require.Len(allMiniblocks, 150)
}

func TestReinitializeStreamStorage_SnapshotHandling(t *testing.T) {
	params := setupStreamStorageTest(t)
	ctx := params.ctx
	store := params.pgStreamStore
	defer params.closer()

	tests := []struct {
		name                     string
		miniblocks               []*WriteMiniblockData
		lastSnapshotMiniblockNum int64
		expectedSnapshot         int
		expectedMiniblockCount   int
	}{
		{
			name: "snapshot at genesis",
			miniblocks: []*WriteMiniblockData{
				{Number: 0, Data: []byte("mb0"), Snapshot: []byte("snapshot0")},
				{Number: 1, Data: []byte("mb1")},
				{Number: 2, Data: []byte("mb2")},
			},
			lastSnapshotMiniblockNum: 0,
			expectedSnapshot:         0,
			expectedMiniblockCount:   3,
		},
		{
			name: "snapshot in middle",
			miniblocks: []*WriteMiniblockData{
				{Number: 0, Data: []byte("mb0")},
				{Number: 1, Data: []byte("mb1"), Snapshot: []byte("snapshot1")},
				{Number: 2, Data: []byte("mb2")},
				{Number: 3, Data: []byte("mb3")},
			},
			lastSnapshotMiniblockNum: 1,
			expectedSnapshot:         1, // Snapshot is at position 1 in returned array
			expectedMiniblockCount:   4, // Returns all from 0 to ensure snapshot included
		},
		{
			name: "snapshot at end",
			miniblocks: []*WriteMiniblockData{
				{Number: 0, Data: []byte("mb0")},
				{Number: 1, Data: []byte("mb1")},
				{Number: 2, Data: []byte("mb2"), Snapshot: []byte("snapshot2")},
			},
			lastSnapshotMiniblockNum: 2,
			expectedSnapshot:         2, // Snapshot is at position 2 in returned array  
			expectedMiniblockCount:   3, // Returns all miniblocks when snapshot is at end
		},
	}

	for i, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			require := require.New(t)
			// Use different stream types to avoid conflicts
			streamTypes := []byte{STREAM_CHANNEL_BIN, STREAM_SPACE_BIN, STREAM_DM_CHANNEL_BIN}
			streamId := testutils.FakeStreamId(streamTypes[i%len(streamTypes)])

			err := store.ReinitializeStreamStorage(ctx, streamId, tt.miniblocks, tt.lastSnapshotMiniblockNum, false)
			require.NoError(err)

			result, err := store.ReadStreamFromLastSnapshot(ctx, streamId, 10)
			require.NoError(err)
			require.Equal(tt.expectedSnapshot, result.SnapshotMiniblockOffset)
			require.Len(result.Miniblocks, tt.expectedMiniblockCount)
		})
	}
}

func TestReinitializeStreamStorage_MinipoolGeneration(t *testing.T) {
	params := setupStreamStorageTest(t)
	ctx := params.ctx
	store := params.pgStreamStore
	defer params.closer()

	tests := []struct {
		name               string
		miniblockCount     int
		expectedGeneration int64
	}{
		{
			name:               "single miniblock",
			miniblockCount:     1,
			expectedGeneration: 1,
		},
		{
			name:               "multiple miniblocks",
			miniblockCount:     5,
			expectedGeneration: 5,
		},
		{
			name:               "many miniblocks",
			miniblockCount:     20,
			expectedGeneration: 20,
		},
	}

	for i, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			require := require.New(t)
			// Use different valid stream types
			streamTypes := []byte{STREAM_CHANNEL_BIN, STREAM_SPACE_BIN, STREAM_DM_CHANNEL_BIN}
			streamId := testutils.FakeStreamId(streamTypes[i%len(streamTypes)])

			miniblocks := make([]*WriteMiniblockData, tt.miniblockCount)
			for j := 0; j < tt.miniblockCount; j++ {
				miniblocks[j] = &WriteMiniblockData{
					Number: int64(j),
					Data:   []byte(fmt.Sprintf("miniblock %d", j)),
				}
			}
			miniblocks[0].Snapshot = []byte("genesis snapshot")

			err := store.ReinitializeStreamStorage(ctx, streamId, miniblocks, 0, false)
			require.NoError(err)

			// Verify by attempting to write an event with the expected generation
			err = store.WriteEvent(ctx, streamId, tt.expectedGeneration, 0, []byte("test event"))
			require.NoError(err)
		})
	}
}

func TestReinitializeStreamStorage_NonZeroStart(t *testing.T) {
	params := setupStreamStorageTest(t)
	require := require.New(t)
	ctx := params.ctx
	store := params.pgStreamStore
	defer params.closer()

	streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)

	// Test miniblocks starting from non-zero
	miniblocks := []*WriteMiniblockData{
		{Number: 10, Data: []byte("mb10"), Snapshot: []byte("snapshot10")},
		{Number: 11, Data: []byte("mb11")},
		{Number: 12, Data: []byte("mb12")},
		{Number: 13, Data: []byte("mb13"), Snapshot: []byte("snapshot13")},
	}

	// Create stream with miniblocks starting from 10
	err := store.ReinitializeStreamStorage(ctx, streamId, miniblocks, 13, false)
	require.NoError(err)

	// Verify stream was created correctly
	allMiniblocks, err := store.ReadMiniblocks(ctx, streamId, 10, 14, false)
	require.NoError(err)
	require.Len(allMiniblocks, 4)

	// Verify miniblock numbers
	for i, mb := range allMiniblocks {
		require.Equal(int64(10+i), mb.Number)
		require.Equal(miniblocks[i].Data, mb.Data)
	}

	// Verify minipool generation is set to last miniblock + 1
	err = store.WriteEvent(ctx, streamId, 14, 0, []byte("test event"))
	require.NoError(err)
}