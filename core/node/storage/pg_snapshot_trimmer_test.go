package storage

import (
	"fmt"
	"slices"
	"sort"
	"strconv"
	"testing"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	. "github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/testutils"
)

func TestSnapshotsTrimmer(t *testing.T) {
	params := setupStreamStorageTest(t)
	ctx := params.ctx
	pgStreamStore := params.pgStreamStore
	defer params.closer()
	require := require.New(t)

	streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)

	genesisMb := &WriteMiniblockData{Data: []byte("genesisMiniblock"), Snapshot: []byte("genesisSnapshot")}
	err := pgStreamStore.CreateStreamStorage(ctx, streamId, genesisMb)
	require.NoError(err)

	var testEnvelopes [][]byte
	testEnvelopes = append(testEnvelopes, []byte("event2"))

	// Generate 500 miniblocks with snapshot on each 10th miniblock
	mbs := make([]*WriteMiniblockData, 500)
	for i := 1; i <= 500; i++ {
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

	// Check if the snapshots are trimmed correctly
	require.Eventually(func() bool {
		mbsWithSnapshot := make([]int64, 0)
		err = pgStreamStore.ReadMiniblocksByStream(
			ctx,
			streamId,
			false,
			func(blockdata []byte, seqNum int64, snapshot []byte) error {
				if len(snapshot) > 0 {
					mbsWithSnapshot = append(mbsWithSnapshot, seqNum)
				}
				return nil
			},
		)
		require.NoError(err)
		fmt.Println(mbsWithSnapshot)
		return slices.Equal([]int64{0, 110, 220, 330, 400, 410, 420, 430, 440, 450, 460, 470, 480, 490, 500}, mbsWithSnapshot)
	}, time.Second*5, 100*time.Millisecond)
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
