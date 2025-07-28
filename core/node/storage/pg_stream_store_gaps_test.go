package storage

import (
	"testing"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/stretchr/testify/require"

	. "github.com/towns-protocol/towns/core/node/base"
	. "github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/testutils"
	"github.com/towns-protocol/towns/core/node/testutils/testfmt"
)

func TestGetMiniblockNumberRanges(t *testing.T) {
	params := setupStreamStorageTest(t)

	require := require.New(t)
	ctx := params.ctx
	store := params.pgStreamStore
	streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)

	t.Run("EmptyStream", func(t *testing.T) {
		// Test with a stream that doesn't exist
		nonExistentStreamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
		ranges, err := store.GetMiniblockNumberRanges(ctx, nonExistentStreamId, 0)
		require.Error(err)
		require.True(IsRiverErrorCode(err, Err_NOT_FOUND))
		require.Nil(ranges)
	})

	t.Run("ContinuousSequence", func(t *testing.T) {
		// Create stream with continuous miniblocks 0-5
		err := store.CreateStreamStorage(
			ctx,
			streamId,
			&MiniblockDescriptor{
				Number:   0,
				Hash:     common.HexToHash("0x01"),
				Data:     []byte("genesis"),
				Snapshot: []byte("snapshot0"),
			},
		)
		require.NoError(err)

		// Add miniblocks 1-5
		for i := int64(1); i <= 5; i++ {
			err := store.WriteMiniblocks(
				ctx,
				streamId,
				[]*MiniblockDescriptor{{
					Number:   i,
					Hash:     common.HexToHash(string(rune('0' + i))),
					Data:     []byte("miniblock"),
					Snapshot: nil,
				}},
				i+1,
				[][]byte{},
				i,
				0,
			)
			require.NoError(err)
		}

		// Test from start
		ranges, err := store.GetMiniblockNumberRanges(ctx, streamId, 0)
		require.NoError(err)
		require.Equal([]MiniblockRange{{StartInclusive: 0, EndInclusive: 5}}, ranges)

		// Test from middle
		ranges, err = store.GetMiniblockNumberRanges(ctx, streamId, 3)
		require.NoError(err)
		require.Equal([]MiniblockRange{{StartInclusive: 3, EndInclusive: 5}}, ranges)

		// Test from beyond last
		ranges, err = store.GetMiniblockNumberRanges(ctx, streamId, 10)
		require.NoError(err)
		require.Equal([]MiniblockRange{}, ranges)
	})

	t.Run("SequenceWithGaps", func(t *testing.T) {
		// Create a new stream for this test
		streamIdGaps := testutils.FakeStreamId(STREAM_SPACE_BIN)

		// Create stream with miniblocks that have gaps: 0,1,2,5,6,7,10
		// This simulates a stream that has been partially reconciled
		// First create with higher numbered miniblocks
		err := store.ReinitializeStreamStorage(
			ctx,
			streamIdGaps,
			[]*MiniblockDescriptor{
				{Number: 5, Hash: common.HexToHash("0x05"), Data: []byte("miniblock5"), Snapshot: nil},
				{Number: 6, Hash: common.HexToHash("0x06"), Data: []byte("miniblock6"), Snapshot: nil},
				{Number: 7, Hash: common.HexToHash("0x07"), Data: []byte("miniblock7"), Snapshot: []byte("snapshot7")},
				{Number: 8, Hash: common.HexToHash("0x08"), Data: []byte("miniblock8"), Snapshot: nil},
				{Number: 9, Hash: common.HexToHash("0x09"), Data: []byte("miniblock9"), Snapshot: nil},
				{Number: 10, Hash: common.HexToHash("0x10"), Data: []byte("miniblock10"), Snapshot: nil},
			},
			7,     // last snapshot at 7
			false, // not updating existing
		)
		require.NoError(err)

		// Now use WritePrecedingMiniblocks to add lower numbered miniblocks
		err = store.WritePrecedingMiniblocks(
			ctx,
			streamIdGaps,
			[]*MiniblockDescriptor{
				{Number: 0, Hash: common.HexToHash("0x00"), Data: []byte("genesis"), Snapshot: []byte("snapshot0")},
				{Number: 1, Hash: common.HexToHash("0x01"), Data: []byte("miniblock1"), Snapshot: nil},
				{Number: 2, Hash: common.HexToHash("0x02"), Data: []byte("miniblock2"), Snapshot: nil},
			},
		)
		require.NoError(err)

		// Test full range - should have gap between 2 and 5
		ranges, err := store.GetMiniblockNumberRanges(ctx, streamIdGaps, 0)
		require.NoError(err)
		require.Equal(
			[]MiniblockRange{{StartInclusive: 0, EndInclusive: 2}, {StartInclusive: 5, EndInclusive: 10}},
			ranges,
		)

		// Test from middle of first gap
		ranges, err = store.GetMiniblockNumberRanges(ctx, streamIdGaps, 4)
		require.NoError(err)
		require.Equal([]MiniblockRange{{StartInclusive: 5, EndInclusive: 10}}, ranges)

		// Test from middle of continuous range
		ranges, err = store.GetMiniblockNumberRanges(ctx, streamIdGaps, 6)
		require.NoError(err)
		require.Equal([]MiniblockRange{{StartInclusive: 6, EndInclusive: 10}}, ranges)

		// Now update the stream to create gap at 11 by reinitializing
		err = store.ReinitializeStreamStorage(
			ctx,
			streamIdGaps,
			[]*MiniblockDescriptor{
				{
					Number:   15,
					Hash:     common.HexToHash("0x15"),
					Data:     []byte("miniblock15"),
					Snapshot: []byte("snapshot15"),
				},
			},
			15,   // last snapshot at 15
			true, // updateExisting
		)
		require.NoError(err)

		// Test after update - should have 0-2, 5-10, 15
		ranges, err = store.GetMiniblockNumberRanges(ctx, streamIdGaps, 0)
		require.NoError(err)
		require.Equal(
			[]MiniblockRange{
				{StartInclusive: 0, EndInclusive: 2},
				{StartInclusive: 5, EndInclusive: 10},
				{StartInclusive: 15, EndInclusive: 15},
			},
			ranges,
		)
	})

	t.Run("NonZeroStartingSequence", func(t *testing.T) {
		// Create stream starting from miniblock 100
		streamIdNonZero := testutils.FakeStreamId(STREAM_DM_CHANNEL_BIN)

		err := store.ReinitializeStreamStorage(
			ctx,
			streamIdNonZero,
			[]*MiniblockDescriptor{
				{
					Number:   100,
					Hash:     common.HexToHash("0x100"),
					Data:     []byte("miniblock100"),
					Snapshot: []byte("snapshot100"),
				},
				{Number: 101, Hash: common.HexToHash("0x101"), Data: []byte("miniblock101"), Snapshot: nil},
				{Number: 102, Hash: common.HexToHash("0x102"), Data: []byte("miniblock102"), Snapshot: nil},
			},
			100,   // last snapshot at 100
			false, // not updating existing
		)
		require.NoError(err)

		// Test from 0 (before first miniblock)
		ranges, err := store.GetMiniblockNumberRanges(ctx, streamIdNonZero, 0)
		require.NoError(err)
		require.Equal([]MiniblockRange{{StartInclusive: 100, EndInclusive: 102}}, ranges)

		// Test from exact start
		ranges, err = store.GetMiniblockNumberRanges(ctx, streamIdNonZero, 100)
		require.NoError(err)
		require.Equal([]MiniblockRange{{StartInclusive: 100, EndInclusive: 102}}, ranges)

		// Test from middle
		ranges, err = store.GetMiniblockNumberRanges(ctx, streamIdNonZero, 101)
		require.NoError(err)
		require.Equal([]MiniblockRange{{StartInclusive: 101, EndInclusive: 102}}, ranges)
	})

	t.Run("LargeGapsSequence", func(t *testing.T) {
		// Create stream with large gaps to test edge cases
		streamIdLarge := testutils.FakeStreamId(STREAM_GDM_CHANNEL_BIN)

		// First create stream starting at a high number
		err := store.ReinitializeStreamStorage(
			ctx,
			streamIdLarge,
			[]*MiniblockDescriptor{
				{
					Number:   1000,
					Hash:     common.HexToHash("0x1000"),
					Data:     []byte("miniblock1000"),
					Snapshot: []byte("snapshot1000"),
				},
				{Number: 1001, Hash: common.HexToHash("0x1001"), Data: []byte("miniblock1001"), Snapshot: nil},
				{Number: 1002, Hash: common.HexToHash("0x1002"), Data: []byte("miniblock1002"), Snapshot: nil},
			},
			1000, // last snapshot at 1000
			false,
		)
		require.NoError(err)

		// Add miniblock at 2000 using update
		err = store.ReinitializeStreamStorage(
			ctx,
			streamIdLarge,
			[]*MiniblockDescriptor{
				{
					Number:   2000,
					Hash:     common.HexToHash("0x2000"),
					Data:     []byte("miniblock2000"),
					Snapshot: []byte("snapshot2000"),
				},
			},
			2000, // last snapshot at 2000
			true, // updateExisting
		)
		require.NoError(err)

		// Use WritePrecedingMiniblocks to add genesis block
		err = store.WritePrecedingMiniblocks(
			ctx,
			streamIdLarge,
			[]*MiniblockDescriptor{
				{Number: 0, Hash: common.HexToHash("0x00"), Data: []byte("genesis"), Snapshot: []byte("snapshot0")},
			},
		)
		require.NoError(err)

		// Test full range
		ranges, err := store.GetMiniblockNumberRanges(ctx, streamIdLarge, 0)
		require.NoError(err)
		require.Equal(
			[]MiniblockRange{
				{StartInclusive: 0, EndInclusive: 0},
				{StartInclusive: 1000, EndInclusive: 1002},
				{StartInclusive: 2000, EndInclusive: 2000},
			},
			ranges,
		)

		// Test from middle of large gap
		ranges, err = store.GetMiniblockNumberRanges(ctx, streamIdLarge, 500)
		require.NoError(err)
		require.Equal(
			[]MiniblockRange{{StartInclusive: 1000, EndInclusive: 1002}, {StartInclusive: 2000, EndInclusive: 2000}},
			ranges,
		)
	})
}

func TestGetMiniblockNumberRangesWithPrecedingMiniblocks(t *testing.T) {
	params := setupStreamStorageTest(t)

	require := require.New(t)
	ctx := params.ctx
	store := params.pgStreamStore
	streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)

	// Create stream with initial miniblocks 10-15
	err := store.ReinitializeStreamStorage(
		ctx,
		streamId,
		[]*MiniblockDescriptor{
			{Number: 10, Hash: common.HexToHash("0x10"), Data: []byte("miniblock10"), Snapshot: []byte("snapshot10")},
			{Number: 11, Hash: common.HexToHash("0x11"), Data: []byte("miniblock11"), Snapshot: nil},
			{Number: 12, Hash: common.HexToHash("0x12"), Data: []byte("miniblock12"), Snapshot: nil},
			{Number: 13, Hash: common.HexToHash("0x13"), Data: []byte("miniblock13"), Snapshot: nil},
			{Number: 14, Hash: common.HexToHash("0x14"), Data: []byte("miniblock14"), Snapshot: nil},
			{Number: 15, Hash: common.HexToHash("0x15"), Data: []byte("miniblock15"), Snapshot: nil},
		},
		10, // last snapshot at 10
		false,
	)
	require.NoError(err)

	// Initial state: miniblocks 10-15
	ranges, err := store.GetMiniblockNumberRanges(ctx, streamId, 0)
	require.NoError(err)
	require.Equal([]MiniblockRange{{StartInclusive: 10, EndInclusive: 15}}, ranges)

	// Use WritePrecedingMiniblocks to backfill some gaps
	err = store.WritePrecedingMiniblocks(
		ctx,
		streamId,
		[]*MiniblockDescriptor{
			{Number: 5, Hash: common.HexToHash("0x05"), Data: []byte("miniblock5"), Snapshot: nil},
			{Number: 6, Hash: common.HexToHash("0x06"), Data: []byte("miniblock6"), Snapshot: nil},
			{Number: 7, Hash: common.HexToHash("0x07"), Data: []byte("miniblock7"), Snapshot: nil},
		},
	)
	require.NoError(err)

	// After backfilling: should have gap between 7 and 10
	ranges, err = store.GetMiniblockNumberRanges(ctx, streamId, 0)
	require.NoError(err)
	require.Equal(
		[]MiniblockRange{{StartInclusive: 5, EndInclusive: 7}, {StartInclusive: 10, EndInclusive: 15}},
		ranges,
	)

	// Backfill more to create another gap
	err = store.WritePrecedingMiniblocks(
		ctx,
		streamId,
		[]*MiniblockDescriptor{
			{Number: 0, Hash: common.HexToHash("0x00"), Data: []byte("genesis"), Snapshot: []byte("snapshot0")},
			{Number: 1, Hash: common.HexToHash("0x01"), Data: []byte("miniblock1"), Snapshot: nil},
			{Number: 2, Hash: common.HexToHash("0x02"), Data: []byte("miniblock2"), Snapshot: nil},
		},
	)
	require.NoError(err)

	// Final state: 0-2, 5-7, 10-15
	ranges, err = store.GetMiniblockNumberRanges(ctx, streamId, 0)
	require.NoError(err)
	require.Equal(
		[]MiniblockRange{
			{StartInclusive: 0, EndInclusive: 2},
			{StartInclusive: 5, EndInclusive: 7},
			{StartInclusive: 10, EndInclusive: 15},
		},
		ranges,
	)

	// Test querying from different starting points
	ranges, err = store.GetMiniblockNumberRanges(ctx, streamId, 3)
	require.NoError(err)
	require.Equal(
		[]MiniblockRange{{StartInclusive: 5, EndInclusive: 7}, {StartInclusive: 10, EndInclusive: 15}},
		ranges,
	)

	ranges, err = store.GetMiniblockNumberRanges(ctx, streamId, 8)
	require.NoError(err)
	require.Equal([]MiniblockRange{{StartInclusive: 10, EndInclusive: 15}}, ranges)
}

func TestGetMiniblockNumberRangesPerformance(t *testing.T) {
	params := setupStreamStorageTest(t)

	require := require.New(t)
	ctx := params.ctx
	store := params.pgStreamStore

	// Create a stream with many miniblocks and gaps to test performance
	streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)

	// Create initial continuous range 0-999
	miniblocks := make([]*MiniblockDescriptor, 1000)
	for i := 0; i < 1000; i++ {
		miniblocks[i] = &MiniblockDescriptor{
			Number:   int64(i),
			Hash:     common.HexToHash(string(rune(i % 256))),
			Data:     []byte("miniblock"),
			Snapshot: nil,
		}
		if i == 0 {
			miniblocks[i].Snapshot = []byte("snapshot0")
		}
	}

	err := store.ReinitializeStreamStorage(
		ctx,
		streamId,
		miniblocks,
		0,
		false,
	)
	require.NoError(err)

	// Add more ranges with gaps: 2000-2999, 4000-4999, etc.
	for base := int64(2000); base < 10000; base += 2000 {
		extraBlocks := make([]*MiniblockDescriptor, 1000)
		for i := 0; i < 1000; i++ {
			extraBlocks[i] = &MiniblockDescriptor{
				Number:   base + int64(i),
				Hash:     common.HexToHash(string(rune(i % 256))),
				Data:     []byte("miniblock"),
				Snapshot: nil,
			}
			if i == 0 {
				extraBlocks[i].Snapshot = []byte("snapshot")
			}
		}

		err = store.ReinitializeStreamStorage(
			ctx,
			streamId,
			extraBlocks,
			base, // snapshot at start of each range
			true, // updateExisting
		)
		require.NoError(err)
	}

	// Test performance of the optimized query
	start := time.Now()
	ranges, err := store.GetMiniblockNumberRanges(ctx, streamId, 0)
	elapsed := time.Since(start)

	require.NoError(err)
	require.Len(ranges, 5) // Should have 5 ranges
	require.Equal(MiniblockRange{StartInclusive: 0, EndInclusive: 999}, ranges[0])
	require.Equal(MiniblockRange{StartInclusive: 2000, EndInclusive: 2999}, ranges[1])
	require.Equal(MiniblockRange{StartInclusive: 4000, EndInclusive: 4999}, ranges[2])
	require.Equal(MiniblockRange{StartInclusive: 6000, EndInclusive: 6999}, ranges[3])
	require.Equal(MiniblockRange{StartInclusive: 8000, EndInclusive: 8999}, ranges[4])

	testfmt.Logf(t, "GetMiniblockNumberRanges with 5000 miniblocks in 5 ranges took: %v", elapsed)
	require.Less(elapsed, 100*time.Millisecond, "Query should complete in under 100ms")
}
