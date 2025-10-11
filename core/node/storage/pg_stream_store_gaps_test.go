package storage

import (
	"context"
	"testing"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/jackc/pgx/v5"
	"github.com/stretchr/testify/require"

	. "github.com/towns-protocol/towns/core/node/base"
	. "github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/testutils"
	"github.com/towns-protocol/towns/core/node/testutils/testfmt"
)

func rangeWithSnapshots(start, end int64, snapshots ...int64) MiniblockRange {
	var seqs []int64
	if len(snapshots) > 0 {
		seqs = append([]int64(nil), snapshots...)
	}
	return MiniblockRange{
		StartInclusive:  start,
		EndInclusive:    end,
		SnapshotSeqNums: seqs,
	}
}

func TestGetMiniblockNumberRanges(t *testing.T) {
	params := setupStreamStorageTest(t)

	require := require.New(t)
	ctx := params.ctx
	store := params.pgStreamStore

	t.Run("EmptyStream", func(t *testing.T) {
		nonExistentStreamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
		ranges, err := store.GetMiniblockNumberRanges(ctx, nonExistentStreamId)
		require.Error(err)
		require.True(IsRiverErrorCode(err, Err_NOT_FOUND))
		require.Nil(ranges)
	})

	// Baseline: fully populated stream with a single continuous range and one snapshot.
	t.Run("ContinuousSequence", func(t *testing.T) {
		streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)

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

		ranges, err := store.GetMiniblockNumberRanges(ctx, streamId)
		require.NoError(err)
		require.Equal([]MiniblockRange{rangeWithSnapshots(0, 5, 0)}, ranges)
	})

	// Stream has historical miniblocks but every snapshot blob has been nulled out.
	// Expect the query to return the continuous range with an empty SnapshotSeqNums slice.
	t.Run("StreamWithAllSnapshotsTrimmed", func(t *testing.T) {
		streamId := testutils.FakeStreamId(STREAM_USER_BIN)

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

		for i := int64(1); i <= 4; i++ {
			err := store.WriteMiniblocks(
				ctx,
				streamId,
				[]*MiniblockDescriptor{{
					Number:   i,
					Hash:     common.HexToHash("0x01"),
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

		err = store.txRunner(
			ctx,
			"TestGetMiniblockNumberRanges.StreamWithAllSnapshotsTrimmed",
			pgx.ReadWrite,
			func(ctx context.Context, tx pgx.Tx) error {
				_, err := tx.Exec(
					ctx,
					store.sqlForStream(
						"UPDATE {{miniblocks}} SET snapshot = NULL WHERE stream_id = $1",
						streamId,
					),
					streamId,
				)
				return err
			},
			nil,
			"streamId", streamId,
		)
		require.NoError(err)

		ranges, err := store.GetMiniblockNumberRanges(ctx, streamId)
		require.NoError(err)
		require.Equal([]MiniblockRange{rangeWithSnapshots(0, 4)}, ranges)
		require.Nil(ranges[0].SnapshotSeqNums)
	})

	// Leading miniblocks without snapshots should still appear in the first range, with only
	// the later snapshot-bearing miniblocks listed in SnapshotSeqNums.
	t.Run("LeadingMiniblocksWithoutSnapshots", func(t *testing.T) {
		streamId := testutils.FakeStreamId(STREAM_SPACE_BIN)

		err := store.ReinitializeStreamStorage(
			ctx,
			streamId,
			[]*MiniblockDescriptor{
				{
					Number:   4,
					Hash:     common.HexToHash("0x04"),
					Data:     []byte("miniblock4"),
					Snapshot: []byte("snapshot4"),
				},
				{Number: 5, Hash: common.HexToHash("0x05"), Data: []byte("miniblock5"), Snapshot: nil},
				{Number: 6, Hash: common.HexToHash("0x06"), Data: []byte("miniblock6"), Snapshot: nil},
			},
			4,
			false,
		)
		require.NoError(err)

		err = store.WritePrecedingMiniblocks(
			ctx,
			streamId,
			[]*MiniblockDescriptor{
				{Number: 0, Hash: common.HexToHash("0x00"), Data: []byte("miniblock0"), Snapshot: nil},
				{Number: 1, Hash: common.HexToHash("0x01"), Data: []byte("miniblock1"), Snapshot: nil},
				{Number: 2, Hash: common.HexToHash("0x02"), Data: []byte("miniblock2"), Snapshot: nil},
				{Number: 3, Hash: common.HexToHash("0x03"), Data: []byte("miniblock3"), Snapshot: nil},
			},
		)
		require.NoError(err)

		ranges, err := store.GetMiniblockNumberRanges(ctx, streamId)
		require.NoError(err)
		require.Equal([]MiniblockRange{rangeWithSnapshots(0, 6, 4)}, ranges)
	})

	// Mixed history: two ranges separated by gaps, including multiple snapshots in the tail.
	t.Run("SequenceWithGaps", func(t *testing.T) {
		streamId := testutils.FakeStreamId(STREAM_SPACE_BIN)

		err := store.ReinitializeStreamStorage(
			ctx,
			streamId,
			[]*MiniblockDescriptor{
				{Number: 5, Hash: common.HexToHash("0x05"), Data: []byte("miniblock5"), Snapshot: nil},
				{Number: 6, Hash: common.HexToHash("0x06"), Data: []byte("miniblock6"), Snapshot: nil},
				{Number: 7, Hash: common.HexToHash("0x07"), Data: []byte("miniblock7"), Snapshot: []byte("snapshot7")},
				{Number: 8, Hash: common.HexToHash("0x08"), Data: []byte("miniblock8"), Snapshot: nil},
				{Number: 9, Hash: common.HexToHash("0x09"), Data: []byte("miniblock9"), Snapshot: nil},
				{Number: 10, Hash: common.HexToHash("0x10"), Data: []byte("miniblock10"), Snapshot: nil},
			},
			8,
			false,
		)
		require.NoError(err)

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

		latest, err := store.GetLastMiniblockNumber(ctx, streamId)
		require.NoError(err)
		require.EqualValues(10, latest)

		ranges, err := store.GetMiniblockNumberRanges(ctx, streamId)
		require.NoError(err)
		require.Equal([]MiniblockRange{
			rangeWithSnapshots(0, 2, 0),
			rangeWithSnapshots(5, 10, 7),
		}, ranges)

		err = store.ReinitializeStreamStorage(
			ctx,
			streamId,
			[]*MiniblockDescriptor{
				{
					Number:   15,
					Hash:     common.HexToHash("0x15"),
					Data:     []byte("miniblock15"),
					Snapshot: []byte("snapshot15"),
				},
			},
			15,
			true,
		)
		require.NoError(err)

		latest, err = store.GetLastMiniblockNumber(ctx, streamId)
		require.NoError(err)
		require.EqualValues(15, latest)

		ranges, err = store.GetMiniblockNumberRanges(ctx, streamId)
		require.NoError(err)
		require.Equal([]MiniblockRange{
			rangeWithSnapshots(0, 2, 0),
			rangeWithSnapshots(5, 10, 7),
			rangeWithSnapshots(15, 15, 15),
		}, ranges)
	})

	// Stream that starts at a non-zero miniblock index; ensures anchoring works above zero.
	t.Run("NonZeroStartingSequence", func(t *testing.T) {
		streamId := testutils.FakeStreamId(STREAM_DM_CHANNEL_BIN)

		err := store.ReinitializeStreamStorage(
			ctx,
			streamId,
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
			100,
			false,
		)
		require.NoError(err)

		latest, err := store.GetLastMiniblockNumber(ctx, streamId)
		require.NoError(err)
		require.EqualValues(102, latest)

		ranges, err := store.GetMiniblockNumberRanges(ctx, streamId)
		require.NoError(err)
		require.Equal([]MiniblockRange{
			rangeWithSnapshots(100, 102, 100),
		}, ranges)
	})

	// Widely separated ranges with snapshots sprinkled throughout the history.
	t.Run("LargeGapsSequence", func(t *testing.T) {
		streamId := testutils.FakeStreamId(STREAM_GDM_CHANNEL_BIN)

		err := store.ReinitializeStreamStorage(
			ctx,
			streamId,
			[]*MiniblockDescriptor{
				{
					Number:   1000,
					Hash:     common.HexToHash("0x1000"),
					Data:     []byte("miniblock1000"),
					Snapshot: []byte("snapshot1000"),
				},
				{Number: 1001, Hash: common.HexToHash("0x1001"), Data: []byte("miniblock1001"), Snapshot: nil},
				{
					Number:   1002,
					Hash:     common.HexToHash("0x1002"),
					Data:     []byte("miniblock1002"),
					Snapshot: []byte("snapshot1002"),
				},
			},
			1002,
			false,
		)
		require.NoError(err)

		err = store.ReinitializeStreamStorage(
			ctx,
			streamId,
			[]*MiniblockDescriptor{
				{
					Number:   2000,
					Hash:     common.HexToHash("0x2000"),
					Data:     []byte("miniblock2000"),
					Snapshot: []byte("snapshot2000"),
				},
			},
			2000,
			true,
		)
		require.NoError(err)

		err = store.WritePrecedingMiniblocks(
			ctx,
			streamId,
			[]*MiniblockDescriptor{
				{Number: 0, Hash: common.HexToHash("0x00"), Data: []byte("genesis"), Snapshot: []byte("snapshot0")},
			},
		)
		require.NoError(err)

		latest, err := store.GetLastMiniblockNumber(ctx, streamId)
		require.NoError(err)
		require.EqualValues(2000, latest)

		ranges, err := store.GetMiniblockNumberRanges(ctx, streamId)
		require.NoError(err)
		require.Equal([]MiniblockRange{
			rangeWithSnapshots(0, 0, 0),
			rangeWithSnapshots(1000, 1002, 1000, 1002),
			rangeWithSnapshots(2000, 2000, 2000),
		}, ranges)
	})
}

func TestGetMiniblockNumberRangesWithPrecedingMiniblocks(t *testing.T) {
	params := setupStreamStorageTest(t)

	require := require.New(t)
	ctx := params.ctx
	store := params.pgStreamStore
	streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)

	// Seed the stream with a contiguous tail (10-15) and a single snapshot at 10.
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
		10,
		false,
	)
	require.NoError(err)

	latest, err := store.GetLastMiniblockNumber(ctx, streamId)
	require.NoError(err)
	require.EqualValues(15, latest)

	ranges, err := store.GetMiniblockNumberRanges(ctx, streamId)
	require.NoError(err)
	require.Equal([]MiniblockRange{
		rangeWithSnapshots(10, 15, 10),
	}, ranges)

	// Backfill earlier miniblocks (5-7) to create a leading gap ahead of the original range.
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

	latest, err = store.GetLastMiniblockNumber(ctx, streamId)
	require.NoError(err)

	ranges, err = store.GetMiniblockNumberRanges(ctx, streamId)
	require.NoError(err)
	require.Equal([]MiniblockRange{
		rangeWithSnapshots(5, 7),
		rangeWithSnapshots(10, 15, 10),
	}, ranges)

	// Add genesis miniblocks (0-2) to introduce a second gap and ensure ordering is preserved.
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

	latest, err = store.GetLastMiniblockNumber(ctx, streamId)
	require.NoError(err)

}

func TestGetMiniblockNumberRangesPerformance(t *testing.T) {
	params := setupStreamStorageTest(t)

	require := require.New(t)
	ctx := params.ctx
	store := params.pgStreamStore

	streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)

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
			base,
			true,
		)
		require.NoError(err)
	}

	latest, err := store.GetLastMiniblockNumber(ctx, streamId)
	require.NoError(err)
	require.EqualValues(8999, latest)

	start := time.Now()
	ranges, err := store.GetMiniblockNumberRanges(ctx, streamId)
	elapsed := time.Since(start)

	require.NoError(err)
	require.Len(ranges, 5)
	require.Equal(rangeWithSnapshots(0, 999, 0), ranges[0])
	require.Equal(rangeWithSnapshots(2000, 2999, 2000), ranges[1])
	require.Equal(rangeWithSnapshots(4000, 4999, 4000), ranges[2])
	require.Equal(rangeWithSnapshots(6000, 6999, 6000), ranges[3])
	require.Equal(rangeWithSnapshots(8000, 8999, 8000), ranges[4])

	testfmt.Logf(t, "GetMiniblockNumberRanges with 5000 miniblocks in 5 ranges took: %v", elapsed)
	require.Less(elapsed, 100*time.Millisecond, "Query should complete in under 100ms")
}
