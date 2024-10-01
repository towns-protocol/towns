package storage

import (
	"fmt"
	"testing"

	"github.com/stretchr/testify/require"

	. "github.com/river-build/river/core/node/base"
	. "github.com/river-build/river/core/node/protocol"
	. "github.com/river-build/river/core/node/shared"
	"github.com/river-build/river/core/node/testutils"
)

func mbDataForNumb(n int64) []byte {
	return []byte(fmt.Sprintf("data-%d", n))
}

func TestArchive(t *testing.T) {
	require := require.New(t)

	ctx, pgStreamStore, testParams := setupStreamStorageTest()
	defer testParams.closer()

	streamId1 := testutils.FakeStreamId(STREAM_CHANNEL_BIN)

	_, err := pgStreamStore.GetMaxArchivedMiniblockNumber(ctx, streamId1)
	require.Error(err)
	require.Equal(Err_NOT_FOUND, AsRiverError(err).Code)

	err = pgStreamStore.CreateStreamArchiveStorage(ctx, streamId1)
	require.NoError(err)

	err = pgStreamStore.CreateStreamArchiveStorage(ctx, streamId1)
	require.Error(err)
	require.Equal(Err_ALREADY_EXISTS, AsRiverError(err).Code)

	bn, err := pgStreamStore.GetMaxArchivedMiniblockNumber(ctx, streamId1)
	require.NoError(err)
	require.Equal(int64(-1), bn)

	data := [][]byte{
		mbDataForNumb(0),
		mbDataForNumb(1),
		mbDataForNumb(2),
	}

	err = pgStreamStore.WriteArchiveMiniblocks(ctx, streamId1, 1, data)
	require.Error(err)

	err = pgStreamStore.WriteArchiveMiniblocks(ctx, streamId1, 0, data)
	require.NoError(err)

	readMBs, err := pgStreamStore.ReadMiniblocks(ctx, streamId1, 0, 3)
	require.NoError(err)
	require.Len(readMBs, 3)
	require.Equal(data, readMBs)

	data2 := [][]byte{
		mbDataForNumb(3),
		mbDataForNumb(4),
		mbDataForNumb(5),
	}

	bn, err = pgStreamStore.GetMaxArchivedMiniblockNumber(ctx, streamId1)
	require.NoError(err)
	require.Equal(int64(2), bn)

	err = pgStreamStore.WriteArchiveMiniblocks(ctx, streamId1, 2, data2)
	require.Error(err)

	err = pgStreamStore.WriteArchiveMiniblocks(ctx, streamId1, 10, data2)
	require.Error(err)

	err = pgStreamStore.WriteArchiveMiniblocks(ctx, streamId1, 3, data2)
	require.NoError(err)

	readMBs, err = pgStreamStore.ReadMiniblocks(ctx, streamId1, 0, 8)
	require.NoError(err)
	require.Equal(append(data, data2...), readMBs)

	bn, err = pgStreamStore.GetMaxArchivedMiniblockNumber(ctx, streamId1)
	require.NoError(err)
	require.Equal(int64(5), bn)
}
