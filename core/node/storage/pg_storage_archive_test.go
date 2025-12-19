package storage

import (
	"fmt"
	"testing"

	"github.com/stretchr/testify/require"

	. "github.com/towns-protocol/towns/core/node/base"
	. "github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/testutils"
)

func mbDataForNumb(n int64, sn bool) *MiniblockDescriptor {
	var snapshot []byte
	if sn {
		snapshot = []byte(fmt.Sprintf("snapshot-%d", n))
	}
	return &MiniblockDescriptor{
		Data:     []byte(fmt.Sprintf("data-%d", n)),
		Snapshot: snapshot,
	}
}

func TestArchive(t *testing.T) {
	params := setupStreamStorageTest(t)
	require := require.New(t)

	ctx := params.ctx
	pgStreamStore := params.pgStreamStore

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

	data := []*MiniblockDescriptor{
		mbDataForNumb(0, true),
		mbDataForNumb(1, false),
		mbDataForNumb(2, false),
	}

	err = pgStreamStore.WriteArchiveMiniblocks(ctx, streamId1, 1, data)
	require.Error(err)

	err = pgStreamStore.WriteArchiveMiniblocks(ctx, streamId1, 0, data)
	require.NoError(err)

	readMBs, terminus, err := pgStreamStore.ReadMiniblocks(ctx, streamId1, 0, 3, false)
	require.NoError(err)
	require.Len(readMBs, 3)
	require.True(terminus)
	require.Equal([]*MiniblockDescriptor{
		{Number: 0, Data: data[0].Data, Snapshot: data[0].Snapshot},
		{Number: 1, Data: data[1].Data, Snapshot: data[1].Snapshot},
		{Number: 2, Data: data[2].Data, Snapshot: data[2].Snapshot},
	}, readMBs)

	data2 := []*MiniblockDescriptor{
		mbDataForNumb(3, false),
		mbDataForNumb(4, false),
		mbDataForNumb(5, false),
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

	readMBs, terminus, err = pgStreamStore.ReadMiniblocks(ctx, streamId1, 0, 8, false)
	require.NoError(err)
	require.True(terminus)
	require.Equal([]*MiniblockDescriptor{
		{Number: 0, Data: data[0].Data, Snapshot: data[0].Snapshot},
		{Number: 1, Data: data[1].Data, Snapshot: data[1].Snapshot},
		{Number: 2, Data: data[2].Data, Snapshot: data[2].Snapshot},
		{Number: 3, Data: data2[0].Data, Snapshot: data2[0].Snapshot},
		{Number: 4, Data: data2[1].Data, Snapshot: data2[1].Snapshot},
		{Number: 5, Data: data2[2].Data, Snapshot: data2[2].Snapshot},
	}, readMBs)

	bn, err = pgStreamStore.GetMaxArchivedMiniblockNumber(ctx, streamId1)
	require.NoError(err)
	require.Equal(int64(5), bn)
}
