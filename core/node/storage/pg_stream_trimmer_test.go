package storage

import (
	"slices"
	"strconv"
	"testing"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/stretchr/testify/require"

	. "github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/testutils"
)

func TestStreamTrimmer(t *testing.T) {
	params := setupStreamStorageTest(t)
	ctx := params.ctx
	pgStreamStore := params.pgStreamStore

	require := require.New(t)

	streamId := testutils.FakeStreamId(STREAM_SPACE_BIN)
	nonTrimmableStreamId := testutils.FakeStreamId(STREAM_MEDIA_BIN)

	genesisMb := &MiniblockDescriptor{Data: []byte("genesisMiniblock"), Snapshot: []byte("genesisSnapshot")}

	err := pgStreamStore.CreateStreamStorage(ctx, streamId, genesisMb)
	require.NoError(err)
	err = pgStreamStore.CreateStreamStorage(ctx, nonTrimmableStreamId, genesisMb)
	require.NoError(err)

	var testEnvelopes [][]byte
	testEnvelopes = append(testEnvelopes, []byte("event2"))

	// Generate 54 miniblocks with snapshot on each 10th miniblock
	mbs := make([]*MiniblockDescriptor, 54)
	for i := 1; i <= 54; i++ {
		mb := &MiniblockDescriptor{
			Number: int64(i),
			Hash:   common.BytesToHash([]byte("block_hash" + strconv.Itoa(i))),
			Data:   []byte("block" + strconv.Itoa(i)),
		}
		if i%10 == 0 {
			mb.Snapshot = []byte("snapshot" + strconv.Itoa(i))
		}
		mbs[i-1] = mb
	}

	// Write to space stream
	err = pgStreamStore.WriteMiniblocks(
		ctx,
		streamId,
		mbs,
		mbs[len(mbs)-1].Number+1,
		testEnvelopes,
		mbs[0].Number,
		-1,
	)
	require.NoError(err)

	// Write to non trimmable stream
	err = pgStreamStore.WriteMiniblocks(
		ctx,
		nonTrimmableStreamId,
		mbs,
		mbs[len(mbs)-1].Number+1,
		testEnvelopes,
		mbs[0].Number,
		-1,
	)
	require.NoError(err)

	// Check if the streams are trimmed correctly
	require.Eventually(func() bool {
		mbsLeft := make([]int64, 0, 10)
		err = pgStreamStore.ReadMiniblocksByStream(
			ctx,
			streamId,
			true,
			func(blockdata []byte, seqNum int64, snapshot []byte) error {
				mbsLeft = append(mbsLeft, seqNum)
				return nil
			},
		)
		require.NoError(err)
		return slices.Equal([]int64{45, 46, 47, 48, 49, 50, 51, 52, 53, 54}, mbsLeft)
	}, time.Second*5, 100*time.Millisecond)

	// Make sure the non-trimmable stream is not trimmed
	require.Eventually(func() bool {
		mbsLeft := make([]int64, 0, 55)
		err = pgStreamStore.ReadMiniblocksByStream(
			ctx,
			nonTrimmableStreamId,
			true,
			func(blockdata []byte, seqNum int64, snapshot []byte) error {
				mbsLeft = append(mbsLeft, seqNum)
				return nil
			},
		)
		require.NoError(err)
		return len(mbsLeft) == 55
	}, time.Second*5, 100*time.Millisecond)

	// Write a new miniblock with a snapshot and check if the stream is trimmed correctly
	newMb := &MiniblockDescriptor{
		Number:   55,
		Hash:     common.BytesToHash([]byte("block_hash" + strconv.Itoa(55))),
		Data:     []byte("block" + strconv.Itoa(55)),
		Snapshot: []byte("snapshot" + strconv.Itoa(55)),
	}
	err = pgStreamStore.WriteMiniblocks(
		ctx,
		streamId,
		[]*MiniblockDescriptor{newMb},
		newMb.Number+1,
		testEnvelopes,
		newMb.Number,
		-1,
	)

	// Check if the streams are trimmed correctly
	require.Eventually(func() bool {
		mbsLeft := make([]int64, 0, 3)
		err = pgStreamStore.ReadMiniblocksByStream(
			ctx,
			streamId,
			true,
			func(blockdata []byte, seqNum int64, snapshot []byte) error {
				mbsLeft = append(mbsLeft, seqNum)
				return nil
			},
		)
		require.NoError(err)
		return slices.Equal([]int64{50, 51, 52, 53, 54, 55}, mbsLeft)
	}, time.Second*5, 100*time.Millisecond)
}
