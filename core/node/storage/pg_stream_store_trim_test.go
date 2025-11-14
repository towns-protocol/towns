package storage

import (
	"testing"

	"github.com/stretchr/testify/require"

	. "github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/testutils"
)

func TestTrimStream(t *testing.T) {
	params := setupStreamStorageTest(t)
	ctx := params.ctx
	store := params.pgStreamStore

	t.Run("deletes miniblocks and nullifies snapshots", func(t *testing.T) {
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
			data.mb(3, true),
			data.mb(4, false),
		}
		require.NoError(t, store.WriteMiniblocks(ctx, streamId, miniblocks, 5, [][]byte{}, 1, 0))

		require.NoError(t, store.TrimStream(ctx, streamId, 3, []int64{3}))

		ranges, err := store.GetMiniblockNumberRanges(ctx, streamId)
		require.NoError(t, err)
		require.Equal(t, []MiniblockRange{{StartInclusive: 3, EndInclusive: 4}}, ranges)
	})

	t.Run("nullifies snapshots without deleting miniblocks", func(t *testing.T) {
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
			data.mb(3, true),
		}
		require.NoError(t, store.WriteMiniblocks(ctx, streamId, miniblocks, 4, [][]byte{}, 1, 0))

		require.NoError(t, store.TrimStream(ctx, streamId, 1, []int64{2}))

		ranges, err := store.GetMiniblockNumberRanges(ctx, streamId)
		require.NoError(t, err)
		require.Equal(t, []MiniblockRange{{StartInclusive: 1, EndInclusive: 3, SnapshotSeqNums: []int64{3}}}, ranges)
	})

	t.Run("recomputes after deleting latest snapshot", func(t *testing.T) {
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
			data.mb(3, false),
		}
		require.NoError(t, store.WriteMiniblocks(ctx, streamId, miniblocks, 4, [][]byte{}, 1, 0))

		require.NoError(t, store.TrimStream(ctx, streamId, 4, nil))

		ranges, err := store.GetMiniblockNumberRanges(ctx, streamId)
		require.NoError(t, err)
		require.Empty(t, ranges)
	})
}
