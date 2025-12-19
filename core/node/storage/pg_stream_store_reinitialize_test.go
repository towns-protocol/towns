package storage

import (
	"context"
	"fmt"
	"math"
	"testing"

	"github.com/ethereum/go-ethereum/common"
	"github.com/jackc/pgx/v5"
	"github.com/stretchr/testify/require"

	. "github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/testutils"
)

func TestReinitializeStreamStorage_CreateNew(t *testing.T) {
	params := setupStreamStorageTest(t)
	require := require.New(t)
	ctx := params.ctx
	store := params.pgStreamStore

	streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)

	// Prepare miniblocks
	miniblocks := []*MiniblockDescriptor{
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

	streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)

	// Create initial stream
	genesisMb := &MiniblockDescriptor{
		Number:   0,
		Hash:     common.HexToHash("0x01"),
		Data:     []byte("genesis miniblock"),
		Snapshot: []byte("genesis snapshot"),
	}
	err := store.CreateStreamStorage(ctx, streamId, genesisMb)
	require.NoError(err)

	// Write a miniblock to extend the stream
	err = store.WriteMiniblocks(ctx, streamId,
		[]*MiniblockDescriptor{{Number: 1, Data: []byte("miniblock 1")}},
		2, [][]byte{}, 1, 0)
	require.NoError(err)

	// Add miniblock candidates
	candidate := &MiniblockDescriptor{
		Number: 2,
		Hash:   common.HexToHash("0xc1"),
		Data:   []byte("candidate 2"),
	}
	err = store.WriteMiniblockCandidate(ctx, streamId, candidate)
	require.NoError(err)

	// Prepare new miniblocks for reinitialization (extending the stream)
	newMiniblocks := []*MiniblockDescriptor{
		{
			Number: 1,
			Hash:   common.HexToHash("0x02"),
			Data:   []byte("new miniblock 1 - should be ignored"),
		},
		{
			Number:   2,
			Hash:     common.HexToHash("0x03"),
			Data:     []byte("new miniblock 2"),
			Snapshot: []byte("new snapshot 2"),
		},
		{
			Number: 3,
			Hash:   common.HexToHash("0x04"),
			Data:   []byte("new miniblock 3"),
		},
	}

	// Update existing stream
	err = store.ReinitializeStreamStorage(ctx, streamId, newMiniblocks, 2, true)
	require.NoError(err)

	// Verify stream was updated
	result, err := store.ReadStreamFromLastSnapshot(ctx, streamId, 10)
	require.NoError(err)
	// With last snapshot at 2, should return from miniblock 2 onwards
	require.GreaterOrEqual(len(result.Miniblocks), 2) // At least miniblocks 2 and 3

	// Find miniblock 0 to verify it wasn't changed
	mb0, terminus, err := store.ReadMiniblocks(ctx, streamId, 0, 1, false)
	require.NoError(err)
	require.Len(mb0, 1)
	require.True(terminus)
	require.Equal([]byte("genesis miniblock"), mb0[0].Data) // Original data preserved

	// Verify only new miniblocks 2 and 3 were added (0 and 1 already existed)
	allMbs, terminus, err := store.ReadMiniblocks(ctx, streamId, 0, 4, false)
	require.NoError(err)
	require.Len(allMbs, 4) // 0, 1, 2, 3
	require.True(terminus)
	require.Equal([]byte("genesis miniblock"), allMbs[0].Data)
	require.Equal([]byte("miniblock 1"), allMbs[1].Data) // Original miniblock 1
	require.Equal([]byte("new miniblock 2"), allMbs[2].Data)
	require.Equal([]byte("new miniblock 3"), allMbs[3].Data)

	// Verify old minipool events were deleted and new generation marker exists
	debugData, err := store.DebugReadStreamData(ctx, streamId)
	require.NoError(err)
	require.Len(debugData.Events, 1)                        // Only generation marker
	require.Equal(int64(4), debugData.Events[0].Generation) // Last miniblock is 3, so generation is 4
	require.Equal(int64(-1), debugData.Events[0].Slot)

	// Verify miniblock candidates were deleted
	mbCandidateCount, err := store.GetMiniblockCandidateCount(ctx, streamId, 2)
	require.NoError(err)
	require.Equal(0, mbCandidateCount)
}

func TestReinitializeStreamStorage_ValidationErrors(t *testing.T) {
	params := setupStreamStorageTest(t)
	require := require.New(t)
	ctx := params.ctx
	store := params.pgStreamStore

	streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)

	tests := []struct {
		name                     string
		miniblocks               []*MiniblockDescriptor
		lastSnapshotMiniblockNum int64
		expectedError            string
	}{
		{
			name:                     "empty miniblocks",
			miniblocks:               []*MiniblockDescriptor{},
			lastSnapshotMiniblockNum: 0,
			expectedError:            "miniblocks cannot be empty",
		},
		{
			name: "invalid snapshot number below range",
			miniblocks: []*MiniblockDescriptor{
				{Number: 5, Data: []byte("mb5")},
				{Number: 6, Data: []byte("mb6")},
			},
			lastSnapshotMiniblockNum: 4, // Below the range [5,6]
			expectedError:            "invalid snapshot miniblock number",
		},
		{
			name: "non-continuous miniblock numbers",
			miniblocks: []*MiniblockDescriptor{
				{Number: 0, Data: []byte("mb0")},
				{Number: 2, Data: []byte("mb2")}, // Skipped 1
			},
			lastSnapshotMiniblockNum: 0,
			expectedError:            "miniblock numbers must be continuous",
		},
		{
			name: "empty miniblock data",
			miniblocks: []*MiniblockDescriptor{
				{Number: 0, Data: []byte("mb0")},
				{Number: 1, Data: []byte{}}, // Empty data
			},
			lastSnapshotMiniblockNum: 0,
			expectedError:            "miniblock data cannot be empty",
		},
		{
			name: "invalid snapshot miniblock number - negative",
			miniblocks: []*MiniblockDescriptor{
				{Number: 0, Data: []byte("mb0")},
				{Number: 1, Data: []byte("mb1")},
			},
			lastSnapshotMiniblockNum: -1,
			expectedError:            "invalid snapshot miniblock number",
		},
		{
			name: "invalid snapshot miniblock number - too high",
			miniblocks: []*MiniblockDescriptor{
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

	streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)

	// Create stream with initial miniblocks
	initialMiniblocks := []*MiniblockDescriptor{
		{Number: 0, Data: []byte("genesis"), Snapshot: []byte("snapshot")},
		{Number: 1, Data: []byte("miniblock 1")},
		{Number: 2, Data: []byte("miniblock 2")},
	}
	err := store.ReinitializeStreamStorage(ctx, streamId, initialMiniblocks, 0, false)
	require.NoError(err)

	// Try to update with miniblocks not exceeding existing
	newMiniblocks := []*MiniblockDescriptor{
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

	existingStreamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	nonExistingStreamId := testutils.FakeStreamId(STREAM_SPACE_BIN)

	miniblocks := []*MiniblockDescriptor{
		{Number: 0, Data: []byte("genesis"), Snapshot: []byte("snapshot")},
	}

	// Create a stream
	err := store.ReinitializeStreamStorage(ctx, existingStreamId, miniblocks, 0, false)
	require.NoError(err)

	// Test 1: Try to create when stream exists and updateExisting=false
	err = store.ReinitializeStreamStorage(ctx, existingStreamId, miniblocks, 0, false)
	require.Error(err)
	require.Contains(err.Error(), "stream already exists")

	// Test 2: When stream doesn't exist, it should create it regardless of updateExisting
	err = store.ReinitializeStreamStorage(ctx, nonExistingStreamId, miniblocks, 0, true)
	require.NoError(err) // Should succeed and create the stream

	// Verify the stream was created
	result, err := store.ReadStreamFromLastSnapshot(ctx, nonExistingStreamId, 10)
	require.NoError(err)
	require.Len(result.Miniblocks, 1)

	// Test 3: When stream doesn't exist and updateExisting=false, it should still create it
	anotherStreamId := testutils.FakeStreamId(STREAM_USER_INBOX_BIN)
	err = store.ReinitializeStreamStorage(ctx, anotherStreamId, miniblocks, 0, false)
	require.NoError(err) // Should succeed and create the stream

	// Verify this stream was also created
	result, err = store.ReadStreamFromLastSnapshot(ctx, anotherStreamId, 10)
	require.NoError(err)
	require.Len(result.Miniblocks, 1)
}

func TestReinitializeStreamStorage_CandidateCleanup(t *testing.T) {
	// Test that ReinitializeStreamStorage deletes miniblock candidates
	// up to the last new miniblock number when updating an existing stream
	params := setupStreamStorageTest(t)
	require := require.New(t)
	ctx := params.ctx
	store := params.pgStreamStore

	streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)

	// Create initial stream
	genesisMb := &MiniblockDescriptor{
		Number:   0,
		Hash:     common.HexToHash("0x01"),
		Data:     []byte("genesis miniblock"),
		Snapshot: []byte("genesis snapshot"),
	}
	err := store.CreateStreamStorage(ctx, streamId, genesisMb)
	require.NoError(err)

	// Add multiple miniblock candidates
	candidates := []*MiniblockDescriptor{
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

	// Reinitialize stream - must extend beyond existing miniblock 0
	newMiniblocks := []*MiniblockDescriptor{
		{Number: 1, Data: []byte("new miniblock 1"), Snapshot: []byte("snapshot 1")},
		{Number: 2, Data: []byte("new miniblock 2")},
	}
	err = store.ReinitializeStreamStorage(ctx, streamId, newMiniblocks, 1, true)
	require.NoError(err)

	// Verify candidates up to miniblock 2 were deleted, but candidate 3 remains
	count1, err := store.GetMiniblockCandidateCount(ctx, streamId, 1)
	require.NoError(err)
	require.Equal(0, count1, "candidate 1 should be deleted")

	count2, err := store.GetMiniblockCandidateCount(ctx, streamId, 2)
	require.NoError(err)
	require.Equal(0, count2, "candidate 2 should be deleted")

	count3, err := store.GetMiniblockCandidateCount(ctx, streamId, 3)
	require.NoError(err)
	require.Equal(1, count3, "candidate 3 should remain")
}

func TestReinitializeStreamStorage_TransactionRollback(t *testing.T) {
	params := setupStreamStorageTest(t)
	require := require.New(t)
	ctx := params.ctx
	store := params.pgStreamStore

	streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)

	// Create initial stream
	genesisMb := &MiniblockDescriptor{
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
	badMiniblocks := []*MiniblockDescriptor{
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

	streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)

	// Create 100+ miniblocks
	miniblocks := make([]*MiniblockDescriptor, 150)
	for i := 0; i < 150; i++ {
		miniblocks[i] = &MiniblockDescriptor{
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
	allMiniblocks, terminus, err := store.ReadMiniblocks(ctx, streamId, 0, 150, false)
	require.NoError(err)
	require.Len(allMiniblocks, 150)
	require.True(terminus)
}

func TestReinitializeStreamStorage_SnapshotHandling(t *testing.T) {
	params := setupStreamStorageTest(t)
	ctx := params.ctx
	store := params.pgStreamStore

	tests := []struct {
		name                     string
		miniblocks               []*MiniblockDescriptor
		lastSnapshotMiniblockNum int64
		expectedSnapshot         int
		expectedMiniblockCount   int
	}{
		{
			name: "snapshot at genesis",
			miniblocks: []*MiniblockDescriptor{
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
			miniblocks: []*MiniblockDescriptor{
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
			miniblocks: []*MiniblockDescriptor{
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

			miniblocks := make([]*MiniblockDescriptor, tt.miniblockCount)
			for j := 0; j < tt.miniblockCount; j++ {
				miniblocks[j] = &MiniblockDescriptor{
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

	streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)

	// Test miniblocks starting from non-zero
	miniblocks := []*MiniblockDescriptor{
		{Number: 10, Data: []byte("mb10"), Snapshot: []byte("snapshot10")},
		{Number: 11, Data: []byte("mb11")},
		{Number: 12, Data: []byte("mb12")},
		{Number: 13, Data: []byte("mb13"), Snapshot: []byte("snapshot13")},
	}

	// Create stream with miniblocks starting from 10
	err := store.ReinitializeStreamStorage(ctx, streamId, miniblocks, 13, false)
	require.NoError(err)

	// Verify stream was created correctly
	allMiniblocks, terminus, err := store.ReadMiniblocks(ctx, streamId, 10, 14, false)
	require.NoError(err)
	require.Len(allMiniblocks, 4)
	require.True(terminus)

	// Verify miniblock numbers
	for i, mb := range allMiniblocks {
		require.Equal(int64(10+i), mb.Number)
		require.Equal(miniblocks[i].Data, mb.Data)
	}

	// Verify minipool generation is set to last miniblock + 1
	err = store.WriteEvent(ctx, streamId, 14, 0, []byte("test event"))
	require.NoError(err)
}

func TestReinitializeStreamStorage_OverlappingUpdate(t *testing.T) {
	params := setupStreamStorageTest(t)
	require := require.New(t)
	ctx := params.ctx
	store := params.pgStreamStore

	streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)

	// Create initial stream with miniblocks 0-3
	initialMiniblocks := []*MiniblockDescriptor{
		{Number: 0, Data: []byte("original mb0"), Snapshot: []byte("snapshot0")},
		{Number: 1, Data: []byte("original mb1")},
		{Number: 2, Data: []byte("original mb2")},
		{Number: 3, Data: []byte("original mb3")},
	}
	err := store.ReinitializeStreamStorage(ctx, streamId, initialMiniblocks, 0, false)
	require.NoError(err)

	// Update with overlapping range (2-5), existing 2-3 should remain unchanged
	updateMiniblocks := []*MiniblockDescriptor{
		{Number: 2, Data: []byte("new mb2 - should be ignored")},
		{Number: 3, Data: []byte("new mb3 - should be ignored")},
		{Number: 4, Data: []byte("new mb4")},
		{Number: 5, Data: []byte("new mb5"), Snapshot: []byte("snapshot5")},
	}
	err = store.ReinitializeStreamStorage(ctx, streamId, updateMiniblocks, 5, true)
	require.NoError(err)

	// Verify all miniblocks
	allMiniblocks, terminus, err := store.ReadMiniblocks(ctx, streamId, 0, 6, false)
	require.NoError(err)
	require.Len(allMiniblocks, 6)
	require.True(terminus)

	// Verify original miniblocks 0-3 are unchanged
	require.Equal([]byte("original mb0"), allMiniblocks[0].Data)
	require.Equal([]byte("original mb1"), allMiniblocks[1].Data)
	require.Equal([]byte("original mb2"), allMiniblocks[2].Data) // Not overwritten
	require.Equal([]byte("original mb3"), allMiniblocks[3].Data) // Not overwritten

	// Verify new miniblocks 4-5 were added
	require.Equal([]byte("new mb4"), allMiniblocks[4].Data)
	require.Equal([]byte("new mb5"), allMiniblocks[5].Data)

	// Verify minipool generation is set to last miniblock + 1
	err = store.WriteEvent(ctx, streamId, 6, 0, []byte("test event"))
	require.NoError(err)
}

func TestReinitializeStreamStorage_StreamWithoutMiniblocks(t *testing.T) {
	params := setupStreamStorageTest(t)
	require := require.New(t)
	ctx := params.ctx
	store := params.pgStreamStore

	streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)

	// Manually create a stream without miniblocks (violates invariant)
	err := store.txRunner(
		ctx,
		"CreateStreamWithoutMiniblocks",
		pgx.ReadWrite,
		func(ctx context.Context, tx pgx.Tx) error {
			_, err := tx.Exec(
				ctx,
				"INSERT INTO es (stream_id, latest_snapshot_miniblock, migrated, ephemeral) VALUES ($1, 0, true, false)",
				streamId,
			)
			return err
		},
		nil,
	)
	require.NoError(err)

	// Try to update the stream - should detect the invariant violation
	miniblocks := []*MiniblockDescriptor{
		{Number: 0, Data: []byte("mb0"), Snapshot: []byte("snapshot0")},
		{Number: 1, Data: []byte("mb1")},
	}
	err = store.ReinitializeStreamStorage(ctx, streamId, miniblocks, 0, true)
	require.Error(err)
	require.Contains(err.Error(), "stream exists but has no miniblocks")
}

func TestReinitializeStreamStorage_SnapshotValidation(t *testing.T) {
	params := setupStreamStorageTest(t)
	require := require.New(t)
	ctx := params.ctx
	store := params.pgStreamStore

	tests := []struct {
		name                     string
		miniblocks               []*MiniblockDescriptor
		lastSnapshotMiniblockNum int64
		expectedError            string
	}{
		{
			name: "snapshot position has no snapshot",
			miniblocks: []*MiniblockDescriptor{
				{Number: 0, Data: []byte("mb0"), Snapshot: []byte("snapshot0")},
				{Number: 1, Data: []byte("mb1")}, // No snapshot
				{Number: 2, Data: []byte("mb2")},
			},
			lastSnapshotMiniblockNum: 1, // Points to miniblock without snapshot
			expectedError:            "miniblock at snapshot position has no snapshot",
		},
		{
			name: "snapshot position has empty snapshot",
			miniblocks: []*MiniblockDescriptor{
				{Number: 0, Data: []byte("mb0"), Snapshot: []byte("snapshot0")},
				{Number: 1, Data: []byte("mb1"), Snapshot: []byte{}}, // Empty snapshot
				{Number: 2, Data: []byte("mb2")},
			},
			lastSnapshotMiniblockNum: 1,
			expectedError:            "miniblock at snapshot position has no snapshot",
		},
		{
			name: "valid snapshot position",
			miniblocks: []*MiniblockDescriptor{
				{Number: 0, Data: []byte("mb0")},
				{Number: 1, Data: []byte("mb1"), Snapshot: []byte("snapshot1")},
				{Number: 2, Data: []byte("mb2")},
			},
			lastSnapshotMiniblockNum: 1,
			expectedError:            "", // No error expected
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Use a different stream ID for each test
			testStreamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)

			err := store.ReinitializeStreamStorage(ctx, testStreamId, tt.miniblocks, tt.lastSnapshotMiniblockNum, false)
			if tt.expectedError != "" {
				require.Error(err)
				require.Contains(err.Error(), tt.expectedError)
			} else {
				require.NoError(err)
			}
		})
	}
}

func TestReinitializeStreamStorage_IntegerOverflow(t *testing.T) {
	params := setupStreamStorageTest(t)
	require := require.New(t)
	ctx := params.ctx
	store := params.pgStreamStore

	streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)

	// Test with miniblock number at MaxInt64
	miniblocks := []*MiniblockDescriptor{
		{Number: math.MaxInt64 - 1, Data: []byte("mb"), Snapshot: []byte("snapshot")},
		{Number: math.MaxInt64, Data: []byte("mb at max")},
	}

	err := store.ReinitializeStreamStorage(ctx, streamId, miniblocks, math.MaxInt64-1, false)
	require.Error(err)
	require.Contains(err.Error(), "miniblock number overflow")
}
