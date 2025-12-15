package storage

import (
	"testing"

	"github.com/stretchr/testify/require"

	. "github.com/towns-protocol/towns/core/node/base"
	. "github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/testutils"
)

func TestReadMiniblocks(t *testing.T) {
	params := setupStreamStorageTest(t)
	ctx := params.ctx
	store := params.pgStreamStore

	t.Run("returns error for non-existent stream", func(t *testing.T) {
		streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)

		miniblocks, err := store.ReadMiniblocks(ctx, streamId, 0, 10, false)
		require.Error(t, err)
		require.True(t, IsRiverErrorCode(err, Err_NOT_FOUND))
		require.Nil(t, miniblocks)
	})

	t.Run("reads full range of miniblocks", func(t *testing.T) {
		data := newDataMaker()
		streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)

		genesis := data.mb(0, true)
		require.NoError(t, store.CreateStreamStorage(ctx, streamId, &MiniblockDescriptor{
			Number:   0,
			Hash:     genesis.Hash,
			Data:     genesis.Data,
			Snapshot: genesis.Snapshot,
		}))

		miniblocks := []*MiniblockDescriptor{
			data.mb(1, false),
			data.mb(2, true),
			data.mb(3, false),
			data.mb(4, true),
		}
		require.NoError(t, store.WriteMiniblocks(ctx, streamId, miniblocks, 5, [][]byte{}, 1, 0))

		result, err := store.ReadMiniblocks(ctx, streamId, 0, 5, false)
		require.NoError(t, err)
		require.Len(t, result, 5)

		// Verify all miniblocks are returned in order
		for i, mb := range result {
			require.Equal(t, int64(i), mb.Number)
		}

		// Verify snapshots are included
		require.NotNil(t, result[0].Snapshot) // genesis has snapshot
		require.Nil(t, result[1].Snapshot)
		require.NotNil(t, result[2].Snapshot) // mb 2 has snapshot
		require.Nil(t, result[3].Snapshot)
		require.NotNil(t, result[4].Snapshot) // mb 4 has snapshot
	})

	t.Run("reads partial range of miniblocks", func(t *testing.T) {
		data := newDataMaker()
		streamId := testutils.FakeStreamId(STREAM_SPACE_BIN)

		genesis := data.mb(0, true)
		require.NoError(t, store.CreateStreamStorage(ctx, streamId, &MiniblockDescriptor{
			Number:   0,
			Hash:     genesis.Hash,
			Data:     genesis.Data,
			Snapshot: genesis.Snapshot,
		}))

		miniblocks := []*MiniblockDescriptor{
			data.mb(1, false),
			data.mb(2, true),
			data.mb(3, false),
			data.mb(4, true),
		}
		require.NoError(t, store.WriteMiniblocks(ctx, streamId, miniblocks, 5, [][]byte{}, 1, 0))

		// Read only miniblocks 2-4 (exclusive)
		result, err := store.ReadMiniblocks(ctx, streamId, 2, 4, false)
		require.NoError(t, err)
		require.Len(t, result, 2)
		require.Equal(t, int64(2), result[0].Number)
		require.Equal(t, int64(3), result[1].Number)
	})

	t.Run("omits snapshots when requested", func(t *testing.T) {
		data := newDataMaker()
		streamId := testutils.FakeStreamId(STREAM_USER_BIN)

		genesis := data.mb(0, true)
		require.NoError(t, store.CreateStreamStorage(ctx, streamId, &MiniblockDescriptor{
			Number:   0,
			Hash:     genesis.Hash,
			Data:     genesis.Data,
			Snapshot: genesis.Snapshot,
		}))

		miniblocks := []*MiniblockDescriptor{
			data.mb(1, false),
			data.mb(2, true),
		}
		require.NoError(t, store.WriteMiniblocks(ctx, streamId, miniblocks, 3, [][]byte{}, 1, 0))

		result, err := store.ReadMiniblocks(ctx, streamId, 0, 3, true) // omitSnapshot = true
		require.NoError(t, err)
		require.Len(t, result, 3)

		// All snapshots should be nil when omitted
		for _, mb := range result {
			require.Nil(t, mb.Snapshot)
		}
	})

	t.Run("returns empty slice for range with no miniblocks", func(t *testing.T) {
		data := newDataMaker()
		streamId := testutils.FakeStreamId(STREAM_DM_CHANNEL_BIN)

		genesis := data.mb(0, true)
		require.NoError(t, store.CreateStreamStorage(ctx, streamId, &MiniblockDescriptor{
			Number:   0,
			Hash:     genesis.Hash,
			Data:     genesis.Data,
			Snapshot: genesis.Snapshot,
		}))

		miniblocks := []*MiniblockDescriptor{
			data.mb(1, false),
			data.mb(2, false),
		}
		require.NoError(t, store.WriteMiniblocks(ctx, streamId, miniblocks, 3, [][]byte{}, 1, 0))

		// Request range beyond existing miniblocks
		result, err := store.ReadMiniblocks(ctx, streamId, 10, 20, false)
		require.NoError(t, err)
		require.Empty(t, result)
	})

	t.Run("reads miniblocks from trimmed stream", func(t *testing.T) {
		data := newDataMaker()
		streamId := testutils.FakeStreamId(STREAM_GDM_CHANNEL_BIN)

		genesis := data.mb(0, true)
		require.NoError(t, store.CreateStreamStorage(ctx, streamId, &MiniblockDescriptor{
			Number:   0,
			Hash:     genesis.Hash,
			Data:     genesis.Data,
			Snapshot: genesis.Snapshot,
		}))

		miniblocks := []*MiniblockDescriptor{
			data.mb(1, false),
			data.mb(2, true),
			data.mb(3, false),
			data.mb(4, true),
			data.mb(5, false),
		}
		require.NoError(t, store.WriteMiniblocks(ctx, streamId, miniblocks, 6, [][]byte{}, 1, 0))

		// Trim the stream to miniblock 2
		require.NoError(t, store.TrimStream(ctx, streamId, 2, nil))

		// Verify ranges after trim
		ranges, err := store.GetMiniblockNumberRanges(ctx, streamId)
		require.NoError(t, err)
		require.Len(t, ranges, 1)
		require.Equal(t, int64(2), ranges[0].StartInclusive)
		require.Equal(t, int64(5), ranges[0].EndInclusive)

		// Read miniblocks from the trimmed range - should return only existing miniblocks
		result, err := store.ReadMiniblocks(ctx, streamId, 0, 6, false)
		require.NoError(t, err)
		// Should return miniblocks 2-5 (4 total), not 0-5
		require.Len(t, result, 4)
		require.Equal(t, int64(2), result[0].Number)
		require.Equal(t, int64(5), result[3].Number)

		// Read only existing range
		result, err = store.ReadMiniblocks(ctx, streamId, 2, 6, false)
		require.NoError(t, err)
		require.Len(t, result, 4)

		// Read partial existing range
		result, err = store.ReadMiniblocks(ctx, streamId, 3, 5, false)
		require.NoError(t, err)
		require.Len(t, result, 2)
		require.Equal(t, int64(3), result[0].Number)
		require.Equal(t, int64(4), result[1].Number)
	})

	t.Run("reads miniblocks from stream with gaps", func(t *testing.T) {
		data := newDataMaker()
		streamId := testutils.FakeStreamId(STREAM_MEDIA_BIN)

		// Create stream with miniblocks 10-15
		err := store.ReinitializeStreamStorage(
			ctx,
			streamId,
			[]*MiniblockDescriptor{
				data.mb(10, true),
				data.mb(11, false),
				data.mb(12, false),
				data.mb(13, true),
				data.mb(14, false),
				data.mb(15, false),
			},
			10,
			false,
		)
		require.NoError(t, err)

		// Add preceding miniblocks 0-2 (creating a gap at 3-9)
		err = store.WritePrecedingMiniblocks(
			ctx,
			streamId,
			[]*MiniblockDescriptor{
				data.mb(0, true),
				data.mb(1, false),
				data.mb(2, false),
			},
		)
		require.NoError(t, err)

		// Verify ranges show the gap
		ranges, err := store.GetMiniblockNumberRanges(ctx, streamId)
		require.NoError(t, err)
		require.Len(t, ranges, 2)
		require.Equal(t, int64(0), ranges[0].StartInclusive)
		require.Equal(t, int64(2), ranges[0].EndInclusive)
		require.Equal(t, int64(10), ranges[1].StartInclusive)
		require.Equal(t, int64(15), ranges[1].EndInclusive)

		// Read from first range
		result, err := store.ReadMiniblocks(ctx, streamId, 0, 3, false)
		require.NoError(t, err)
		require.Len(t, result, 3)
		require.Equal(t, int64(0), result[0].Number)
		require.Equal(t, int64(2), result[2].Number)

		// Read from second range
		result, err = store.ReadMiniblocks(ctx, streamId, 10, 16, false)
		require.NoError(t, err)
		require.Len(t, result, 6)
		require.Equal(t, int64(10), result[0].Number)
		require.Equal(t, int64(15), result[5].Number)

		// Read across the gap - should return error due to consistency violation
		result, err = store.ReadMiniblocks(ctx, streamId, 0, 16, false)
		require.Error(t, err)
		require.True(t, IsRiverErrorCode(err, Err_MINIBLOCKS_NOT_FOUND))
	})

	t.Run("reads from stream starting at non-zero miniblock", func(t *testing.T) {
		data := newDataMaker()
		streamId := testutils.FakeStreamId(STREAM_USER_SETTINGS_BIN)

		// Create stream starting at miniblock 100
		err := store.ReinitializeStreamStorage(
			ctx,
			streamId,
			[]*MiniblockDescriptor{
				data.mb(100, true),
				data.mb(101, false),
				data.mb(102, true),
			},
			100,
			false,
		)
		require.NoError(t, err)

		// Request miniblocks from 0 - should return empty since stream starts at 100
		result, err := store.ReadMiniblocks(ctx, streamId, 0, 50, false)
		require.NoError(t, err)
		require.Empty(t, result)

		// Request miniblocks from 100
		result, err = store.ReadMiniblocks(ctx, streamId, 100, 103, false)
		require.NoError(t, err)
		require.Len(t, result, 3)
		require.Equal(t, int64(100), result[0].Number)
		require.Equal(t, int64(102), result[2].Number)

		// Request partial range
		result, err = store.ReadMiniblocks(ctx, streamId, 101, 103, false)
		require.NoError(t, err)
		require.Len(t, result, 2)
		require.Equal(t, int64(101), result[0].Number)
		require.Equal(t, int64(102), result[1].Number)
	})
}
