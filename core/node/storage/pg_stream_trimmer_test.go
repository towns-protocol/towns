package storage

import (
	"strconv"
	"testing"

	"github.com/ethereum/go-ethereum/common"
	"github.com/stretchr/testify/require"

	"github.com/towns-protocol/towns/core/node/logging"
	. "github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/testutils"
)

func TestStreamTrimmer(t *testing.T) {
	params := setupStreamStorageTest(t)
	ctx := params.ctx
	pgStreamStore := params.pgStreamStore
	defer params.closer()
	require := require.New(t)

	streamId := testutils.FakeStreamId(STREAM_SPACE_BIN)

	genesisMb := &WriteMiniblockData{Data: []byte("genesisMiniblock"), Snapshot: []byte("genesisSnapshot")}
	err := pgStreamStore.CreateStreamStorage(ctx, streamId, genesisMb)
	require.NoError(err)

	var testEnvelopes [][]byte
	testEnvelopes = append(testEnvelopes, []byte("event2"))

	// Generate 54 miniblocks with snapshot on each 10th miniblock
	mbs := make([]*WriteMiniblockData, 54)
	for i := 1; i <= 54; i++ {
		mb := &WriteMiniblockData{
			Number: int64(i),
			Hash:   common.BytesToHash([]byte("block_hash" + strconv.Itoa(i))),
			Data:   []byte("block" + strconv.Itoa(i)),
		}
		if i%10 == 0 {
			mb.Snapshot = []byte("snapshot" + strconv.Itoa(i))
		}
		mbs[i-1] = mb
	}

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

	// Force trim streams
	pgStreamStore.st = &streamTrimmer{
		store:            pgStreamStore,
		miniblocksToKeep: 2,
		log:              logging.FromCtx(ctx),
		stopCh:           make(chan struct{}),
	}
	pgStreamStore.st.trimStreams(ctx)

	// Check if the streams are trimmed correctly
	mbsWithSnapshot := make([]int64, 0)
	err = pgStreamStore.ReadMiniblocksByStream(ctx, streamId, func(blockdata []byte, seqNum int64, snapshot []byte) error {
		mbsWithSnapshot = append(mbsWithSnapshot, seqNum)
		return nil
	})
	require.NoError(err)
	require.Equal([]int64{48, 49, 50, 51, 52, 53, 54}, mbsWithSnapshot)
}
