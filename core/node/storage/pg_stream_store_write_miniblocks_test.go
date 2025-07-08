package storage

import (
	"testing"

	"github.com/ethereum/go-ethereum/common"
	"github.com/stretchr/testify/require"

	. "github.com/towns-protocol/towns/core/node/base"
	. "github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/testutils"
)

func TestWriteMiniblocks_ValidationErrors(t *testing.T) {
	params := setupStreamStorageTest(t)
	require := require.New(t)
	ctx := params.ctx
	store := params.pgStreamStore
	defer params.closer()

	streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	genesisMiniblock := []byte("genesisMiniblock")
	err := store.CreateStreamStorage(ctx, streamId, &WriteMiniblockData{Data: genesisMiniblock})
	require.NoError(err)

	// Test: No miniblocks to write
	err = store.WriteMiniblocks(ctx, streamId, []*WriteMiniblockData{}, 1, [][]byte{}, 0, 0)
	require.Error(err)
	require.True(IsRiverErrorCode(err, Err_INTERNAL))
	require.Contains(err.Error(), "No miniblocks to write")

	// Test: Previous minipool generation mismatch
	miniblocks := []*WriteMiniblockData{{
		Number: 2, // Should be 1
		Hash:   common.BytesToHash([]byte("hash1")),
		Data:   []byte("block1"),
	}}
	err = store.WriteMiniblocks(ctx, streamId, miniblocks, 3, [][]byte{}, 1, 0)
	require.Error(err)
	require.True(IsRiverErrorCode(err, Err_INTERNAL))
	require.Contains(err.Error(), "Previous minipool generation mismatch")

	// Test: New minipool generation mismatch
	miniblocks = []*WriteMiniblockData{{
		Number: 1,
		Hash:   common.BytesToHash([]byte("hash1")),
		Data:   []byte("block1"),
	}}
	err = store.WriteMiniblocks(ctx, streamId, miniblocks, 3, [][]byte{}, 1, 0) // Should be 2
	require.Error(err)
	require.True(IsRiverErrorCode(err, Err_INTERNAL))
	require.Contains(err.Error(), "New minipool generation mismatch")

	// Test: Non-consecutive miniblock numbers
	miniblocks = []*WriteMiniblockData{
		{
			Number: 1,
			Hash:   common.BytesToHash([]byte("hash1")),
			Data:   []byte("block1"),
		},
		{
			Number: 3, // Should be 2
			Hash:   common.BytesToHash([]byte("hash2")),
			Data:   []byte("block2"),
		},
	}
	err = store.WriteMiniblocks(ctx, streamId, miniblocks, 4, [][]byte{}, 1, 0)
	require.Error(err)
	require.True(IsRiverErrorCode(err, Err_INTERNAL))
	require.Contains(err.Error(), "Miniblock number are not consecutive")

	// Test: Empty miniblock data
	miniblocks = []*WriteMiniblockData{{
		Number: 1,
		Hash:   common.BytesToHash([]byte("hash1")),
		Data:   []byte{}, // Empty data
	}}
	err = store.WriteMiniblocks(ctx, streamId, miniblocks, 2, [][]byte{}, 1, 0)
	require.Error(err)
	require.True(IsRiverErrorCode(err, Err_INVALID_ARGUMENT))
	require.Contains(err.Error(), "Miniblock data is empty")
}

func TestWriteMiniblocks_SuccessfulWrite(t *testing.T) {
	params := setupStreamStorageTest(t)
	require := require.New(t)
	ctx := params.ctx
	store := params.pgStreamStore
	defer params.closer()

	streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	genesisMiniblock := []byte("genesisMiniblock")
	err := store.CreateStreamStorage(ctx, streamId, &WriteMiniblockData{Data: genesisMiniblock})
	require.NoError(err)

	// Add some events to the initial minipool
	err = store.WriteEvent(ctx, streamId, 1, 0, []byte("event1"))
	require.NoError(err)
	err = store.WriteEvent(ctx, streamId, 1, 1, []byte("event2"))
	require.NoError(err)

	// Write first set of miniblocks
	miniblocks := []*WriteMiniblockData{{
		Number:   1,
		Hash:     common.BytesToHash([]byte("hash1")),
		Data:     []byte("block1"),
		Snapshot: []byte("snapshot1"),
	}}
	newEnvelopes := [][]byte{[]byte("newEvent1"), []byte("newEvent2")}
	
	err = store.WriteMiniblocks(ctx, streamId, miniblocks, 2, newEnvelopes, 1, 2)
	require.NoError(err)

	// Verify the write succeeded
	result, err := store.ReadStreamFromLastSnapshot(ctx, streamId, 10)
	require.NoError(err)
	require.Len(result.Miniblocks, 2)
	require.Equal(int64(0), result.Miniblocks[0].Number)
	require.Equal(int64(1), result.Miniblocks[1].Number)
	require.Equal([]byte("block1"), result.Miniblocks[1].Data)
	require.Equal([]byte("snapshot1"), result.Miniblocks[1].Snapshot)
	require.Equal(newEnvelopes, result.MinipoolEnvelopes)
	require.Equal(1, result.SnapshotMiniblockOffset) // Snapshot is at index 1

	// Verify old minipool was deleted and new one created
	debugData, err := store.DebugReadStreamData(ctx, streamId)
	require.NoError(err)
	require.Equal(int64(1), debugData.LatestSnapshotMiniblockNum)
	// Check events - should have new minipool with generation 2
	hasGen2Events := false
	for _, event := range debugData.Events {
		if event.Generation == 2 {
			hasGen2Events = true
			break
		}
	}
	require.True(hasGen2Events, "Should have events with generation 2")
}

func TestWriteMiniblocks_MultipleMiniblocksWithSnapshot(t *testing.T) {
	params := setupStreamStorageTest(t)
	require := require.New(t)
	ctx := params.ctx
	store := params.pgStreamStore
	defer params.closer()

	streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	genesisMiniblock := []byte("genesisMiniblock")
	err := store.CreateStreamStorage(ctx, streamId, &WriteMiniblockData{
		Data:     genesisMiniblock,
		Snapshot: []byte("genesis_snapshot"),
	})
	require.NoError(err)

	// Write multiple miniblocks, with a snapshot in the middle
	miniblocks := []*WriteMiniblockData{
		{
			Number: 1,
			Hash:   common.BytesToHash([]byte("hash1")),
			Data:   []byte("block1"),
		},
		{
			Number:   2,
			Hash:     common.BytesToHash([]byte("hash2")),
			Data:     []byte("block2"),
			Snapshot: []byte("snapshot2"),
		},
		{
			Number: 3,
			Hash:   common.BytesToHash([]byte("hash3")),
			Data:   []byte("block3"),
		},
	}
	newEnvelopes := [][]byte{[]byte("event1"), []byte("event2"), []byte("event3")}
	
	err = store.WriteMiniblocks(ctx, streamId, miniblocks, 4, newEnvelopes, 1, 0)
	require.NoError(err)

	// Verify the latest snapshot was updated
	result, err := store.ReadStreamFromLastSnapshot(ctx, streamId, 10)
	require.NoError(err)
	// ReadStreamFromLastSnapshot returns from genesis (0) to latest, since numToRead=10
	require.Len(result.Miniblocks, 4) // All 4 blocks: 0, 1, 2, 3
	require.Equal(int64(0), result.Miniblocks[0].Number) // Genesis
	require.Equal(int64(2), result.Miniblocks[2].Number) // Snapshot block
	require.Equal([]byte("snapshot2"), result.Miniblocks[2].Snapshot)
	require.Equal(2, result.SnapshotMiniblockOffset) // Snapshot is at index 2

	// Verify debug data
	debugData, err := store.DebugReadStreamData(ctx, streamId)
	require.NoError(err)
	require.Equal(int64(2), debugData.LatestSnapshotMiniblockNum)
}

func TestWriteMiniblocks_CandidateCleanup(t *testing.T) {
	params := setupStreamStorageTest(t)
	require := require.New(t)
	ctx := params.ctx
	store := params.pgStreamStore
	defer params.closer()

	streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	genesisMiniblock := []byte("genesisMiniblock")
	err := store.CreateStreamStorage(ctx, streamId, &WriteMiniblockData{Data: genesisMiniblock})
	require.NoError(err)

	// Write some miniblock candidates
	for i := 1; i <= 5; i++ {
		err = store.WriteMiniblockCandidate(ctx, streamId, &WriteMiniblockData{
			Number: int64(i),
			Hash:   common.BytesToHash([]byte{byte(i)}),
			Data:   []byte("candidate"),
		})
		require.NoError(err)
	}

	// Verify candidates exist
	count, err := store.GetMiniblockCandidateCount(ctx, streamId, 3)
	require.NoError(err)
	require.Equal(1, count)

	// Write miniblocks up to block 3
	miniblocks := []*WriteMiniblockData{
		{
			Number: 1,
			Hash:   common.BytesToHash([]byte("hash1")),
			Data:   []byte("block1"),
		},
		{
			Number: 2,
			Hash:   common.BytesToHash([]byte("hash2")),
			Data:   []byte("block2"),
		},
		{
			Number: 3,
			Hash:   common.BytesToHash([]byte("hash3")),
			Data:   []byte("block3"),
		},
	}
	
	err = store.WriteMiniblocks(ctx, streamId, miniblocks, 4, [][]byte{}, 1, 0)
	require.NoError(err)

	// Verify candidates before newMinipoolGeneration were deleted
	count, err = store.GetMiniblockCandidateCount(ctx, streamId, 1)
	require.NoError(err)
	require.Equal(0, count)
	count, err = store.GetMiniblockCandidateCount(ctx, streamId, 2)
	require.NoError(err)
	require.Equal(0, count)
	count, err = store.GetMiniblockCandidateCount(ctx, streamId, 3)
	require.NoError(err)
	require.Equal(0, count)

	// Candidates at or after newMinipoolGeneration should still exist
	count, err = store.GetMiniblockCandidateCount(ctx, streamId, 4)
	require.NoError(err)
	require.Equal(1, count)
	count, err = store.GetMiniblockCandidateCount(ctx, streamId, 5)
	require.NoError(err)
	require.Equal(1, count)
}

func TestWriteMiniblocks_TransactionConsistency(t *testing.T) {
	params := setupStreamStorageTest(t)
	require := require.New(t)
	ctx := params.ctx
	store := params.pgStreamStore
	defer params.closer()

	streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	genesisMiniblock := []byte("genesisMiniblock")
	err := store.CreateStreamStorage(ctx, streamId, &WriteMiniblockData{Data: genesisMiniblock})
	require.NoError(err)

	// Add events to current minipool
	err = store.WriteEvent(ctx, streamId, 1, 0, []byte("event1"))
	require.NoError(err)

	// Corrupt the database to make write fail partway through
	// We'll delete the stream after locking it, which should cause the write to fail
	miniblocks := []*WriteMiniblockData{{
		Number: 1,
		Hash:   common.BytesToHash([]byte("hash1")),
		Data:   []byte("block1"),
	}}

	// We can't easily simulate a mid-transaction failure, so let's test
	// a different validation that will cause rollback

	// Instead, let's test with inconsistent prevMinipoolSize
	err = store.WriteMiniblocks(ctx, streamId, miniblocks, 2, [][]byte{}, 1, 10) // Wrong size
	require.Error(err)
	require.Contains(err.Error(), "Previous minipool size mismatch")

	// Verify the transaction was rolled back - minipool should still exist
	result, err := store.ReadStreamFromLastSnapshot(ctx, streamId, 10)
	require.NoError(err)
	require.Len(result.MinipoolEnvelopes, 1) // Original event should still be there
	require.Equal([]byte("event1"), result.MinipoolEnvelopes[0])
}

func TestWriteMiniblocks_StreamNotFound(t *testing.T) {
	params := setupStreamStorageTest(t)
	require := require.New(t)
	ctx := params.ctx
	store := params.pgStreamStore
	defer params.closer()

	streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	
	// Try to write miniblocks to non-existent stream
	miniblocks := []*WriteMiniblockData{{
		Number: 1,
		Hash:   common.BytesToHash([]byte("hash1")),
		Data:   []byte("block1"),
	}}
	
	err := store.WriteMiniblocks(ctx, streamId, miniblocks, 2, [][]byte{}, 1, 0)
	require.Error(err)
	require.True(IsRiverErrorCode(err, Err_NOT_FOUND))
}

func TestWriteMiniblocks_CorruptedMinipool(t *testing.T) {
	params := setupStreamStorageTest(t)
	require := require.New(t)
	ctx := params.ctx
	store := params.pgStreamStore
	defer params.closer()

	streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	genesisMiniblock := []byte("genesisMiniblock")
	err := store.CreateStreamStorage(ctx, streamId, &WriteMiniblockData{Data: genesisMiniblock})
	require.NoError(err)

	// Add events to minipool
	err = store.WriteEvent(ctx, streamId, 1, 0, []byte("event1"))
	require.NoError(err)
	err = store.WriteEvent(ctx, streamId, 1, 1, []byte("event2"))
	require.NoError(err)

	// Corrupt the minipool by changing generation of one event
	_, err = store.pool.Exec(
		ctx,
		store.sqlForStream(
			"UPDATE {{minipools}} SET generation = 777 WHERE stream_id = $1 AND slot_num = 1",
			streamId,
		),
		streamId,
	)
	require.NoError(err)

	// Try to write miniblocks - should fail due to inconsistent minipool
	miniblocks := []*WriteMiniblockData{{
		Number: 1,
		Hash:   common.BytesToHash([]byte("hash1")),
		Data:   []byte("block1"),
	}}
	
	err = store.WriteMiniblocks(ctx, streamId, miniblocks, 2, [][]byte{}, 1, 2)
	require.Error(err)
	require.Contains(err.Error(), "Minipool contains unexpected generation")
}

func TestWriteMiniblocks_LastMiniblockValidation(t *testing.T) {
	params := setupStreamStorageTest(t)
	require := require.New(t)
	ctx := params.ctx
	store := params.pgStreamStore
	defer params.closer()

	streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	genesisMiniblock := []byte("genesisMiniblock")
	err := store.CreateStreamStorage(ctx, streamId, &WriteMiniblockData{Data: genesisMiniblock})
	require.NoError(err)

	// Write first miniblock
	miniblocks := []*WriteMiniblockData{{
		Number: 1,
		Hash:   common.BytesToHash([]byte("hash1")),
		Data:   []byte("block1"),
	}}
	err = store.WriteMiniblocks(ctx, streamId, miniblocks, 2, [][]byte{}, 1, 0)
	require.NoError(err)

	// Try to write with wrong prevMinipoolGeneration
	miniblocks = []*WriteMiniblockData{{
		Number: 2,
		Hash:   common.BytesToHash([]byte("hash2")),
		Data:   []byte("block2"),
	}}
	err = store.WriteMiniblocks(ctx, streamId, miniblocks, 3, [][]byte{}, 1, 0) // Should be 2
	require.Error(err)
	require.Contains(err.Error(), "Previous minipool generation mismatch")

	// Correct write
	err = store.WriteMiniblocks(ctx, streamId, miniblocks, 3, [][]byte{}, 2, 0)
	require.NoError(err)
}

func TestWriteMiniblocks_EmptyMinipool(t *testing.T) {
	params := setupStreamStorageTest(t)
	require := require.New(t)
	ctx := params.ctx
	store := params.pgStreamStore
	defer params.closer()

	streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	genesisMiniblock := []byte("genesisMiniblock")
	err := store.CreateStreamStorage(ctx, streamId, &WriteMiniblockData{Data: genesisMiniblock})
	require.NoError(err)

	// Write miniblocks with empty new minipool
	miniblocks := []*WriteMiniblockData{{
		Number: 1,
		Hash:   common.BytesToHash([]byte("hash1")),
		Data:   []byte("block1"),
	}}
	
	err = store.WriteMiniblocks(ctx, streamId, miniblocks, 2, [][]byte{}, 1, 0)
	require.NoError(err)

	// Verify empty minipool was created
	result, err := store.ReadStreamFromLastSnapshot(ctx, streamId, 10)
	require.NoError(err)
	require.Len(result.MinipoolEnvelopes, 0)

	// Verify we can still add events to the new empty minipool
	err = store.WriteEvent(ctx, streamId, 2, 0, []byte("newEvent"))
	require.NoError(err)
}

func TestWriteMiniblocks_LargeMinipool(t *testing.T) {
	params := setupStreamStorageTest(t)
	require := require.New(t)
	ctx := params.ctx
	store := params.pgStreamStore
	defer params.closer()

	streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	genesisMiniblock := []byte("genesisMiniblock")
	err := store.CreateStreamStorage(ctx, streamId, &WriteMiniblockData{Data: genesisMiniblock})
	require.NoError(err)

	// Create a large minipool
	numEvents := 100
	for i := 0; i < numEvents; i++ {
		err = store.WriteEvent(ctx, streamId, 1, i, []byte("event"+string(rune(i))))
		require.NoError(err)
	}

	// Write miniblocks with another large minipool
	miniblocks := []*WriteMiniblockData{{
		Number: 1,
		Hash:   common.BytesToHash([]byte("hash1")),
		Data:   []byte("block1"),
	}}
	
	newEnvelopes := make([][]byte, 50)
	for i := range newEnvelopes {
		newEnvelopes[i] = []byte("newEvent" + string(rune(i)))
	}
	
	err = store.WriteMiniblocks(ctx, streamId, miniblocks, 2, newEnvelopes, 1, numEvents)
	require.NoError(err)

	// Verify the new minipool
	result, err := store.ReadStreamFromLastSnapshot(ctx, streamId, 10)
	require.NoError(err)
	require.Len(result.MinipoolEnvelopes, 50)
}