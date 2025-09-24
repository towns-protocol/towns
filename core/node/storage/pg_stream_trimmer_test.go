package storage

import (
	"context"
	"slices"
	"sort"
	"strconv"
	"testing"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/towns-protocol/towns/core/node/crypto"
	. "github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/testutils"
)

func TestStreamTrimmer(t *testing.T) {
	t.Run("miniblocks are trimmed per stream type and rescheduled until caught up", func(t *testing.T) {
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
			mbsLeft, _ := collectStreamState(t, pgStreamStore, ctx, streamId)
			return slices.Equal([]int64{45, 46, 47, 48, 49, 50, 51, 52, 53, 54}, mbsLeft)
		}, time.Second*5, 100*time.Millisecond)

		// Make sure the non-trimmable stream is not trimmed
		require.Eventually(func() bool {
			mbsLeft, _ := collectStreamState(t, pgStreamStore, ctx, nonTrimmableStreamId)
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
		require.NoError(err)

		// Check if the streams are trimmed correctly
		require.Eventually(func() bool {
			mbsLeft, _ := collectStreamState(t, pgStreamStore, ctx, streamId)
			return slices.Equal([]int64{50, 51, 52, 53, 54, 55}, mbsLeft)
		}, time.Second*5, 100*time.Millisecond)
	})

	t.Run("snapshot trimming honors retention interval without deleting miniblocks", func(t *testing.T) {
		params := setupStreamStorageTest(t)
		ctx := params.ctx
		pgStreamStore := params.pgStreamStore
		require := require.New(t)

		streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)

		genesisMb := &MiniblockDescriptor{Data: []byte("genesisMiniblock"), Snapshot: []byte("genesisSnapshot")}
		err := pgStreamStore.CreateStreamStorage(ctx, streamId, genesisMb)
		require.NoError(err)

		var testEnvelopes [][]byte
		testEnvelopes = append(testEnvelopes, []byte("event2"))

		// Generate 500 miniblocks with snapshot on each 10th miniblock
		mbs := make([]*MiniblockDescriptor, 500)
		for i := 1; i <= 500; i++ {
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

		expectedSeqs := make([]int64, 0, 501)
		for i := int64(0); i <= 500; i++ {
			expectedSeqs = append(expectedSeqs, i)
		}

		expectedSnapshots := []int64{0, 110, 220, 330, 400, 410, 420, 430, 440, 450, 460, 470, 480, 490, 500}

		var gotSeqs, gotSnapshots []int64
		assert.Eventually(t, func() bool {
			gotSeqs, gotSnapshots = collectStreamState(t, pgStreamStore, ctx, streamId)
			return slices.Equal(expectedSeqs, gotSeqs) && slices.Equal(expectedSnapshots, gotSnapshots)
		}, time.Second*5, 100*time.Millisecond, "snapshot retention did not converge in time")
		t.Logf("snapshot run sequences: %v", gotSeqs)
		t.Logf("snapshot run snapshots: %v", gotSnapshots)
		require.Equal(expectedSeqs, gotSeqs)
		require.Equal(expectedSnapshots, gotSnapshots)
	})

	t.Run("no trimming occurs when both policies are disabled", func(t *testing.T) {
		params := setupStreamStorageTest(t)
		ctx := params.ctx
		pgStreamStore := params.pgStreamStore
		require := require.New(t)

		cfg := pgStreamStore.streamTrimmer.config.Get()
		cfg.StreamTrimmingMiniblocksToKeep = crypto.StreamTrimmingMiniblocksToKeepSettings{}
		cfg.StreamSnapshotIntervalInMiniblocks = 0

		streamId := testutils.FakeStreamId(STREAM_SPACE_BIN)

		genesisMb := &MiniblockDescriptor{Data: []byte("genesisMiniblock"), Snapshot: []byte("genesisSnapshot")}
		err := pgStreamStore.CreateStreamStorage(ctx, streamId, genesisMb)
		require.NoError(err)

		var testEnvelopes [][]byte
		testEnvelopes = append(testEnvelopes, []byte("event2"))

		mbs := make([]*MiniblockDescriptor, 30)
		for i := 1; i <= 30; i++ {
			mb := &MiniblockDescriptor{
				Number: int64(i),
				Hash:   common.BytesToHash([]byte("block_hash" + strconv.Itoa(i))),
				Data:   []byte("block" + strconv.Itoa(i)),
			}
			if i%5 == 0 {
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

		time.Sleep(500 * time.Millisecond)

		seqs, withSnapshot := collectStreamState(t, pgStreamStore, ctx, streamId)

		expectedSeqs := make([]int64, 0, len(mbs)+1)
		for i := int64(0); i <= int64(len(mbs)); i++ {
			expectedSeqs = append(expectedSeqs, i)
		}

		expectedSnapshots := []int64{0, 5, 10, 15, 20, 25, 30}

		require.Equal(expectedSeqs, seqs)
		require.Equal(expectedSnapshots, withSnapshot)
	})
}

func TestDetermineSnapshotsToNullify(t *testing.T) {
	tests := []struct {
		name              string
		snapshotSeqs      []int64
		retentionInterval int64
		minKeep           int64
		expected          []int64
	}{
		{
			name:              "basic trimming with alignment",
			snapshotSeqs:      []int64{0, 500, 1000, 1500, 2000, 2500},
			retentionInterval: 1000,
			minKeep:           0,
			expected:          []int64{500, 1500, 2500},
		},
		{
			name:              "basic trimming with alignment #2",
			snapshotSeqs:      []int64{0, 500, 900, 1100, 1500, 1990, 2000, 2100, 2500},
			retentionInterval: 1000,
			minKeep:           0,
			expected:          []int64{500, 900, 1500, 1990, 2100, 2500},
		},
		{
			name:              "basic trimming with alignment #3",
			snapshotSeqs:      []int64{0, 10, 20, 30, 40, 50, 60, 70, 80},
			retentionInterval: 50,
			minKeep:           20,
			expected:          []int64{10, 20, 30, 40, 60},
		},
		{
			name:              "only one snapshot in a bucket",
			snapshotSeqs:      []int64{500, 1500, 2500},
			retentionInterval: 1000,
			minKeep:           0,
			expected:          nil,
		},
		{
			name:              "trimming excludes recent snapshots",
			snapshotSeqs:      []int64{0, 500, 1000, 2000, 3000, 4000},
			retentionInterval: 1000,
			minKeep:           1000,
			expected:          []int64{500},
		},
		{
			name:              "empty input",
			snapshotSeqs:      []int64{},
			retentionInterval: 1000,
			minKeep:           0,
			expected:          nil,
		},
		{
			name:              "no trimming needed when all aligned",
			snapshotSeqs:      []int64{0, 1000, 2000, 3000},
			retentionInterval: 1000,
			minKeep:           0,
			expected:          nil,
		},
		{
			name:              "mixed aligned and misaligned with minimum keep",
			snapshotSeqs:      []int64{0, 900, 1000, 1800, 2000, 2700},
			retentionInterval: 1000,
			minKeep:           500,
			expected:          []int64{900, 1800},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			actual := determineSnapshotsToNullify(tt.snapshotSeqs, tt.retentionInterval, tt.minKeep)
			sort.Slice(actual, func(i, j int) bool { return actual[i] < actual[j] }) // ensure consistent order
			assert.Equal(t, tt.expected, actual)
		})
	}
}

func collectStreamState(
	t *testing.T,
	store *PostgresStreamStore,
	ctx context.Context,
	streamId StreamId,
) ([]int64, []int64) {
	t.Helper()

	seqs := make([]int64, 0)
	withSnapshot := make([]int64, 0)

	err := store.ReadMiniblocksByStream(
		ctx,
		streamId,
		false,
		func(blockdata []byte, seqNum int64, snapshot []byte) error {
			seqs = append(seqs, seqNum)
			if len(snapshot) > 0 {
				withSnapshot = append(withSnapshot, seqNum)
			}
			return nil
		},
	)
	require.NoError(t, err)

	return seqs, withSnapshot
}
