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

func TestWritePrecedingMiniblocks_BasicBackfill(t *testing.T) {
	params := setupStreamStorageTest(t)
	t.Cleanup(params.closer)

	require := require.New(t)
	store := params.pgStreamStore
	ctx := params.ctx

	// Create a stream first
	streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	initialMiniblocks := []*WriteMiniblockData{
		{
			Number:   0,
			Hash:     common.BytesToHash([]byte("genesis")),
			Data:     []byte("genesis"),
			Snapshot: []byte("snapshot0"),
		},
	}

	// Initialize stream
	err := store.ReinitializeStreamStorage(ctx, streamId, initialMiniblocks, 0, false)
	require.NoError(err)

	// Now add blocks with gaps using ReinitializeStreamStorage with updateExisting=true
	// This will add blocks 5-6, leaving gaps 1-4
	additionalMiniblocks := []*WriteMiniblockData{
		{
			Number:   5,
			Hash:     common.BytesToHash([]byte("block5")),
			Data:     []byte("block5"),
			Snapshot: []byte("snapshot5"),
		},
		{
			Number:   6,
			Hash:     common.BytesToHash([]byte("block6")),
			Data:     []byte("block6"),
			Snapshot: nil,
		},
	}
	
	// Update stream to add blocks with gaps
	err = store.ReinitializeStreamStorage(ctx, streamId, additionalMiniblocks, 5, true)
	require.NoError(err)

	// Prepare miniblocks to backfill gaps
	backfillBlocks := []*WriteMiniblockData{
		{
			Number:   1,
			Hash:     common.BytesToHash([]byte("block1")),
			Data:     []byte("block1"),
			Snapshot: nil,
		},
		{
			Number:   2,
			Hash:     common.BytesToHash([]byte("block2")),
			Data:     []byte("block2"),
			Snapshot: nil,
		},
		{
			Number:   3,
			Hash:     common.BytesToHash([]byte("block3")),
			Data:     []byte("block3"),
			Snapshot: nil,
		},
		{
			Number:   4,
			Hash:     common.BytesToHash([]byte("block4")),
			Data:     []byte("block4"),
			Snapshot: nil,
		},
	}

	// Backfill the gaps
	err = store.WritePrecedingMiniblocks(ctx, streamId, backfillBlocks)
	require.NoError(err)

	// Verify all blocks are present
	blocks, err := store.ReadMiniblocks(ctx, streamId, 0, 7, false)
	require.NoError(err)
	require.Len(blocks, 7)

	// Verify blocks are in correct order
	for i, block := range blocks {
		require.Equal(int64(i), block.Number)
	}
}

func TestWritePrecedingMiniblocks_PartialOverlap(t *testing.T) {
	params := setupStreamStorageTest(t)
	t.Cleanup(params.closer)

	require := require.New(t)
	store := params.pgStreamStore
	ctx := params.ctx

	// Create a stream with some existing blocks
	streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	initialMiniblocks := []*WriteMiniblockData{
		{
			Number:   0,
			Hash:     common.BytesToHash([]byte("genesis")),
			Data:     []byte("genesis"),
			Snapshot: []byte("snapshot0"),
		},
	}

	err := store.ReinitializeStreamStorage(ctx, streamId, initialMiniblocks, 0, false)
	require.NoError(err)
	
	// Add blocks 2 and 5 with gaps
	additionalMiniblocks := []*WriteMiniblockData{
		{
			Number:   2,
			Hash:     common.BytesToHash([]byte("block2")),
			Data:     []byte("block2"),
			Snapshot: nil,
		},
		{
			Number:   5,
			Hash:     common.BytesToHash([]byte("block5")),
			Data:     []byte("block5"),
			Snapshot: []byte("snapshot5"),
		},
	}
	
	err = store.ReinitializeStreamStorage(ctx, streamId, additionalMiniblocks, 5, true)
	require.NoError(err)

	// Prepare overlapping backfill (includes existing block 2)
	backfillBlocks := []*WriteMiniblockData{
		{
			Number:   1,
			Hash:     common.BytesToHash([]byte("block1")),
			Data:     []byte("block1"),
			Snapshot: nil,
		},
		{
			Number:   2,
			Hash:     common.BytesToHash([]byte("block2_new")),
			Data:     []byte("block2_new"),
			Snapshot: nil,
		},
		{
			Number:   3,
			Hash:     common.BytesToHash([]byte("block3")),
			Data:     []byte("block3"),
			Snapshot: nil,
		},
		{
			Number:   4,
			Hash:     common.BytesToHash([]byte("block4")),
			Data:     []byte("block4"),
			Snapshot: nil,
		},
	}

	// Backfill should skip existing block 2
	err = store.WritePrecedingMiniblocks(ctx, streamId, backfillBlocks)
	require.NoError(err)

	// Verify blocks
	blocks, err := store.ReadMiniblocks(ctx, streamId, 0, 6, false)
	require.NoError(err)
	require.Len(blocks, 5) // 0, 1, 2, 3, 4, 5

	// Verify block 2 wasn't overwritten
	require.Equal([]byte("block2"), blocks[2].Data)
	require.NotEqual([]byte("block2_new"), blocks[2].Data)
}

func TestWritePrecedingMiniblocks_StreamNotFound(t *testing.T) {
	params := setupStreamStorageTest(t)
	t.Cleanup(params.closer)

	require := require.New(t)
	store := params.pgStreamStore
	ctx := params.ctx

	streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	backfillBlocks := []*WriteMiniblockData{
		{
			Number:   1,
			Hash:     common.BytesToHash([]byte("block1")),
			Data:     []byte("block1"),
			Snapshot: nil,
		},
	}

	// Should fail with NOT_FOUND
	err := store.WritePrecedingMiniblocks(ctx, streamId, backfillBlocks)
	require.Error(err)
	require.True(IsRiverErrorCode(err, Err_NOT_FOUND))
}

func TestWritePrecedingMiniblocks_InvalidRange(t *testing.T) {
	params := setupStreamStorageTest(t)
	t.Cleanup(params.closer)

	require := require.New(t)
	store := params.pgStreamStore
	ctx := params.ctx

	// Create a stream
	streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	miniblocks := []*WriteMiniblockData{
		{
			Number:   0,
			Hash:     common.BytesToHash([]byte("genesis")),
			Data:     []byte("genesis"),
			Snapshot: []byte("snapshot0"),
		},
		{
			Number:   1,
			Hash:     common.BytesToHash([]byte("block1")),
			Data:     []byte("block1"),
			Snapshot: nil,
		},
		{
			Number:   2,
			Hash:     common.BytesToHash([]byte("block2")),
			Data:     []byte("block2"),
			Snapshot: nil,
		},
	}

	err := store.ReinitializeStreamStorage(ctx, streamId, miniblocks, 0, false)
	require.NoError(err)

	// Try to backfill with block >= last block (should fail validation)
	backfillBlocks := []*WriteMiniblockData{
		{
			Number:   2, // Equal to last block
			Hash:     common.BytesToHash([]byte("block2_new")),
			Data:     []byte("block2_new"),
			Snapshot: nil,
		},
	}

	err = store.WritePrecedingMiniblocks(ctx, streamId, backfillBlocks)
	require.Error(err)
	require.True(IsRiverErrorCode(err, Err_INVALID_ARGUMENT), "Expected INVALID_ARGUMENT error, got: %v", err)
}

func TestWritePrecedingMiniblocks_NonContinuous(t *testing.T) {
	params := setupStreamStorageTest(t)
	t.Cleanup(params.closer)

	require := require.New(t)
	store := params.pgStreamStore
	ctx := params.ctx

	// Create a stream with initial block
	streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	initialMiniblocks := []*WriteMiniblockData{
		{
			Number:   0,
			Hash:     common.BytesToHash([]byte("genesis")),
			Data:     []byte("genesis"),
			Snapshot: []byte("snapshot0"),
		},
	}

	err := store.ReinitializeStreamStorage(ctx, streamId, initialMiniblocks, 0, false)
	require.NoError(err)
	
	// Add block 10 with gap using updateExisting
	additionalMiniblocks := []*WriteMiniblockData{
		{
			Number:   10,
			Hash:     common.BytesToHash([]byte("block10")),
			Data:     []byte("block10"),
			Snapshot: []byte("snapshot10"),
		},
	}
	
	err = store.ReinitializeStreamStorage(ctx, streamId, additionalMiniblocks, 10, true)
	require.NoError(err)

	// Try to backfill with non-continuous blocks
	backfillBlocks := []*WriteMiniblockData{
		{
			Number:   1,
			Hash:     common.BytesToHash([]byte("block1")),
			Data:     []byte("block1"),
			Snapshot: nil,
		},
		{
			Number:   3, // Gap - missing block 2
			Hash:     common.BytesToHash([]byte("block3")),
			Data:     []byte("block3"),
			Snapshot: nil,
		},
	}

	err = store.WritePrecedingMiniblocks(ctx, streamId, backfillBlocks)
	require.Error(err)
	require.True(IsRiverErrorCode(err, Err_INVALID_ARGUMENT))
}

func TestWritePrecedingMiniblocks_EmptyList(t *testing.T) {
	params := setupStreamStorageTest(t)
	t.Cleanup(params.closer)

	require := require.New(t)
	store := params.pgStreamStore
	ctx := params.ctx

	// Create a stream
	streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	miniblocks := []*WriteMiniblockData{
		{
			Number:   0,
			Hash:     common.BytesToHash([]byte("genesis")),
			Data:     []byte("genesis"),
			Snapshot: []byte("snapshot0"),
		},
	}

	err := store.ReinitializeStreamStorage(ctx, streamId, miniblocks, 0, false)
	require.NoError(err)

	// Empty list should return error
	err = store.WritePrecedingMiniblocks(ctx, streamId, []*WriteMiniblockData{})
	require.Error(err)
	require.True(IsRiverErrorCode(err, Err_INVALID_ARGUMENT))
	require.Contains(err.Error(), "miniblocks cannot be empty")
}

func TestWritePrecedingMiniblocks_AllExisting(t *testing.T) {
	params := setupStreamStorageTest(t)
	t.Cleanup(params.closer)

	require := require.New(t)
	store := params.pgStreamStore
	ctx := params.ctx

	// Create a stream with continuous blocks
	streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	miniblocks := []*WriteMiniblockData{
		{
			Number:   0,
			Hash:     common.BytesToHash([]byte("genesis")),
			Data:     []byte("genesis"),
			Snapshot: []byte("snapshot0"),
		},
		{
			Number:   1,
			Hash:     common.BytesToHash([]byte("block1")),
			Data:     []byte("block1"),
			Snapshot: nil,
		},
		{
			Number:   2,
			Hash:     common.BytesToHash([]byte("block2")),
			Data:     []byte("block2"),
			Snapshot: nil,
		},
	}

	err := store.ReinitializeStreamStorage(ctx, streamId, miniblocks, 0, false)
	require.NoError(err)

	// Try to backfill existing blocks
	backfillBlocks := []*WriteMiniblockData{
		{
			Number:   0,
			Hash:     common.BytesToHash([]byte("genesis_new")),
			Data:     []byte("genesis_new"),
			Snapshot: []byte("snapshot0_new"),
		},
		{
			Number:   1,
			Hash:     common.BytesToHash([]byte("block1_new")),
			Data:     []byte("block1_new"),
			Snapshot: nil,
		},
	}

	// Should succeed but not overwrite
	err = store.WritePrecedingMiniblocks(ctx, streamId, backfillBlocks)
	require.NoError(err)

	// Verify blocks weren't overwritten
	blocks, err := store.ReadMiniblocks(ctx, streamId, 0, 3, false)
	require.NoError(err)
	require.Len(blocks, 3)
	require.Equal([]byte("genesis"), blocks[0].Data)
	require.Equal([]byte("block1"), blocks[1].Data)
}

func TestWritePrecedingMiniblocks_LargeBackfill(t *testing.T) {
	params := setupStreamStorageTest(t)
	t.Cleanup(params.closer)

	require := require.New(t)
	store := params.pgStreamStore
	ctx := params.ctx

	// Create a stream with a gap
	streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	miniblocks := []*WriteMiniblockData{
		{
			Number:   0,
			Hash:     common.BytesToHash([]byte("genesis")),
			Data:     []byte("genesis"),
			Snapshot: []byte("snapshot0"),
		},
		{
			Number:   1000,
			Hash:     common.BytesToHash([]byte("block1000")),
			Data:     []byte("block1000"),
			Snapshot: []byte("snapshot1000"),
		},
	}

	err := store.ReinitializeStreamStorage(ctx, streamId, miniblocks, 1000, false)
	require.NoError(err)

	// Create large backfill
	backfillBlocks := make([]*WriteMiniblockData, 500)
	for i := 0; i < 500; i++ {
		backfillBlocks[i] = &WriteMiniblockData{
			Number:   int64(i + 100), // 100-599
			Hash:     common.BytesToHash([]byte{byte(i)}),
			Data:     []byte{byte(i)},
			Snapshot: nil,
		}
	}

	// Backfill should succeed
	err = store.WritePrecedingMiniblocks(ctx, streamId, backfillBlocks)
	require.NoError(err)

	// Verify some blocks
	blocks, err := store.ReadMiniblocks(ctx, streamId, 100, 110, false)
	require.NoError(err)
	require.Len(blocks, 10)
	for i, block := range blocks {
		require.Equal(int64(100+i), block.Number)
	}
}

func TestWritePrecedingMiniblocks_ConcurrentBackfill(t *testing.T) {
	params := setupStreamStorageTest(t)
	t.Cleanup(params.closer)

	require := require.New(t)
	store := params.pgStreamStore
	ctx := params.ctx

	// Create a stream
	streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	miniblocks := []*WriteMiniblockData{
		{
			Number:   0,
			Hash:     common.BytesToHash([]byte("genesis")),
			Data:     []byte("genesis"),
			Snapshot: []byte("snapshot0"),
		},
		{
			Number:   10,
			Hash:     common.BytesToHash([]byte("block10")),
			Data:     []byte("block10"),
			Snapshot: nil,
		},
	}

	err := store.ReinitializeStreamStorage(ctx, streamId, miniblocks, 0, false)
	require.NoError(err)

	// Prepare two overlapping backfills
	backfill1 := []*WriteMiniblockData{
		{
			Number:   1,
			Hash:     common.BytesToHash([]byte("block1")),
			Data:     []byte("block1"),
			Snapshot: nil,
		},
		{
			Number:   2,
			Hash:     common.BytesToHash([]byte("block2")),
			Data:     []byte("block2"),
			Snapshot: nil,
		},
	}

	backfill2 := []*WriteMiniblockData{
		{
			Number:   2,
			Hash:     common.BytesToHash([]byte("block2_alt")),
			Data:     []byte("block2_alt"),
			Snapshot: nil,
		},
		{
			Number:   3,
			Hash:     common.BytesToHash([]byte("block3")),
			Data:     []byte("block3"),
			Snapshot: nil,
		},
	}

	// Run concurrent backfills
	errChan := make(chan error, 2)
	go func() {
		errChan <- store.WritePrecedingMiniblocks(ctx, streamId, backfill1)
	}()
	go func() {
		errChan <- store.WritePrecedingMiniblocks(ctx, streamId, backfill2)
	}()

	// Both should succeed (one will skip overlapping blocks)
	err1 := <-errChan
	err2 := <-errChan
	require.NoError(err1)
	require.NoError(err2)

	// Verify blocks were written
	blocks, err := store.ReadMiniblocks(ctx, streamId, 1, 4, false)
	require.NoError(err)
	require.Len(blocks, 3)
}

func TestWritePrecedingMiniblocks_ValidationBeforeWrite(t *testing.T) {
	params := setupStreamStorageTest(t)
	t.Cleanup(params.closer)

	require := require.New(t)
	store := params.pgStreamStore
	ctx := params.ctx

	// Create a stream
	streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	miniblocks := []*WriteMiniblockData{
		{
			Number:   0,
			Hash:     common.BytesToHash([]byte("genesis")),
			Data:     []byte("genesis"),
			Snapshot: []byte("snapshot0"),
		},
		{
			Number:   5,
			Hash:     common.BytesToHash([]byte("block5")),
			Data:     []byte("block5"),
			Snapshot: nil,
		},
	}

	err := store.ReinitializeStreamStorage(ctx, streamId, miniblocks, 0, false)
	require.NoError(err)

	// Mix of valid and invalid blocks (block 5 exists, block 6 > last)
	backfillBlocks := []*WriteMiniblockData{
		{
			Number:   3,
			Hash:     common.BytesToHash([]byte("block3")),
			Data:     []byte("block3"),
			Snapshot: nil,
		},
		{
			Number:   4,
			Hash:     common.BytesToHash([]byte("block4")),
			Data:     []byte("block4"),
			Snapshot: nil,
		},
		{
			Number:   5, // Equal to last - invalid
			Hash:     common.BytesToHash([]byte("block5_new")),
			Data:     []byte("block5_new"),
			Snapshot: nil,
		},
	}

	// Should fail validation before any writes
	err = store.WritePrecedingMiniblocks(ctx, streamId, backfillBlocks)
	require.Error(err)
	require.True(IsRiverErrorCode(err, Err_INVALID_ARGUMENT))

	// Verify no blocks were written
	blocks, err := store.ReadMiniblocks(ctx, streamId, 3, 5, false)
	require.NoError(err)
	require.Len(blocks, 0)
}