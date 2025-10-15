package storage

import (
	"context"
	"slices"
	"strconv"
	"testing"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/jackc/pgx/v5"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/crypto"
	. "github.com/towns-protocol/towns/core/node/protocol"
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

		// Initial trim anchors to the closest retained snapshot (40), so we keep genesis plus 40..54.
		// As per test setting, we keep 5 miniblocks from the last snapshot, which is 50, and then do history trimming
		// from the closest snapshot (40).
		require.Eventually(func() bool {
			mbsLeft, snapshots := collectStreamState(t, pgStreamStore, ctx, streamId)
			expectedSeqs := []int64{0, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54}
			expectedSnapshots := []int64{0, 40, 50}
			return slices.Equal(expectedSeqs, mbsLeft) && slices.Equal(expectedSnapshots, snapshots)
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

		// The subsequent trim anchors to snapshot 50, keeping genesis and 50..55.
		require.Eventually(func() bool {
			mbsLeft, snapshots := collectStreamState(t, pgStreamStore, ctx, streamId)
			expectedSeqs := []int64{0, 50, 51, 52, 53, 54, 55}
			expectedSnapshots := []int64{0, 50, 55}
			return slices.Equal(expectedSeqs, mbsLeft) && slices.Equal(expectedSnapshots, snapshots)
		}, time.Second*5, 100*time.Millisecond)
	})

	t.Run("snapshot trimming enforces minimum retention interval and disables history trimming", func(t *testing.T) {
		params := setupStreamStorageTest(t)
		ctx := params.ctx
		pgStreamStore := params.pgStreamStore
		require := require.New(t)

		cfg := pgStreamStore.streamTrimmer.config.Get()
		cfg.StreamSnapshotIntervalInMiniblocks = 50                    // below minRetentionInterval
		cfg.StreamHistoryMiniblocks = crypto.StreamHistoryMiniblocks{} // disable miniblock deletion

		streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)

		genesisMb := &MiniblockDescriptor{Data: []byte("genesisMiniblock"), Snapshot: []byte("genesisSnapshot")}
		require.NoError(pgStreamStore.CreateStreamStorage(ctx, streamId, genesisMb))

		var envelopes [][]byte
		envelopes = append(envelopes, []byte("event"))

		snapshots := make([]*MiniblockDescriptor, 400)
		for i := 1; i <= 400; i++ {
			mb := &MiniblockDescriptor{
				Number: int64(i),
				Hash:   common.BytesToHash([]byte("hash" + strconv.Itoa(i))),
				Data:   []byte("block" + strconv.Itoa(i)),
			}
			if i%20 == 0 {
				mb.Snapshot = []byte("snap" + strconv.Itoa(i))
			}
			snapshots[i-1] = mb
		}

		require.NoError(pgStreamStore.WriteMiniblocks(
			ctx,
			streamId,
			snapshots,
			snapshots[len(snapshots)-1].Number+1,
			envelopes,
			snapshots[0].Number,
			-1,
		))

		expectedSeqs := make([]int64, 0, 401)
		for i := int64(0); i <= 400; i++ {
			expectedSeqs = append(expectedSeqs, i)
		}
		expectedSnapshots := []int64{0, 100, 200, 300, 320, 340, 360, 380, 400}

		var gotSeqs, gotSnapshots []int64
		assert.Eventually(t, func() bool {
			gotSeqs, gotSnapshots = collectStreamState(t, pgStreamStore, ctx, streamId)
			return slices.Equal(expectedSeqs, gotSeqs) && slices.Equal(expectedSnapshots, gotSnapshots)
		}, time.Second*5, 100*time.Millisecond, "min retention clamp not enforced")
		require.Equal(expectedSeqs, gotSeqs)
		require.Equal(expectedSnapshots, gotSnapshots)
	})

	t.Run("no trimming occurs when both policies are disabled", func(t *testing.T) {
		params := setupStreamStorageTest(t)
		ctx := params.ctx
		pgStreamStore := params.pgStreamStore
		require := require.New(t)

		cfg := pgStreamStore.streamTrimmer.config.Get()
		cfg.StreamHistoryMiniblocks = crypto.StreamHistoryMiniblocks{}
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

	t.Run("miniblock trimming is skipped when already within retention window", func(t *testing.T) {
		params := setupStreamStorageTest(t)
		ctx := params.ctx
		pgStreamStore := params.pgStreamStore
		require := require.New(t)

		cfg := pgStreamStore.streamTrimmer.config.Get()
		cfg.StreamHistoryMiniblocks.Space = 1000
		cfg.StreamSnapshotIntervalInMiniblocks = 0

		streamId := testutils.FakeStreamId(STREAM_SPACE_BIN)

		genesis := &MiniblockDescriptor{Data: []byte("g"), Snapshot: []byte("snap0")}
		require.NoError(pgStreamStore.CreateStreamStorage(ctx, streamId, genesis))

		var envelopes [][]byte
		envelopes = append(envelopes, []byte("event"))

		mbs := make([]*MiniblockDescriptor, 20)
		for i := 1; i <= 20; i++ {
			mb := &MiniblockDescriptor{
				Number: int64(i),
				Hash:   common.BytesToHash([]byte("hash" + strconv.Itoa(i))),
				Data:   []byte("block" + strconv.Itoa(i)),
			}
			if i%10 == 0 {
				mb.Snapshot = []byte("snap" + strconv.Itoa(i))
			}
			mbs[i-1] = mb
		}

		require.NoError(pgStreamStore.WriteMiniblocks(
			ctx,
			streamId,
			mbs,
			mbs[len(mbs)-1].Number+1,
			envelopes,
			mbs[0].Number,
			-1,
		))

		tr := pgStreamStore.streamTrimmer
		tr.tryScheduleTrimming(streamId)

		expectedSeqs := make([]int64, 0, 21)
		for i := int64(0); i <= 20; i++ {
			expectedSeqs = append(expectedSeqs, i)
		}

		require.Eventually(func() bool {
			seqs, _ := collectStreamState(t, pgStreamStore, ctx, streamId)
			return slices.Equal(seqs, expectedSeqs)
		}, time.Second*2, 100*time.Millisecond)

		require.Eventually(func() bool {
			tr.pendingTasksLock.Lock()
			defer tr.pendingTasksLock.Unlock()
			return len(tr.pendingTasks) == 0
		}, time.Second, 10*time.Millisecond)
	})

	t.Run("trimming aborts when stream has unexpected gaps", func(t *testing.T) {
		params := setupStreamStorageTest(t)
		ctx := params.ctx
		pgStreamStore := params.pgStreamStore
		require := require.New(t)

		cfg := pgStreamStore.streamTrimmer.config.Get()
		cfg.StreamHistoryMiniblocks.Space = 0
		cfg.StreamSnapshotIntervalInMiniblocks = 0

		streamId := testutils.FakeStreamId(STREAM_SPACE_BIN)
		genesis := &MiniblockDescriptor{Data: []byte("g"), Snapshot: []byte("snap0")}
		require.NoError(pgStreamStore.CreateStreamStorage(ctx, streamId, genesis))

		var envelopes [][]byte
		envelopes = append(envelopes, []byte("event"))

		mbs := make([]*MiniblockDescriptor, 30)
		for i := 1; i <= 30; i++ {
			mb := &MiniblockDescriptor{
				Number: int64(i),
				Hash:   common.BytesToHash([]byte("hash" + strconv.Itoa(i))),
				Data:   []byte("block" + strconv.Itoa(i)),
			}
			if i%5 == 0 {
				mb.Snapshot = []byte("snap" + strconv.Itoa(i))
			}
			mbs[i-1] = mb
		}

		require.NoError(pgStreamStore.WriteMiniblocks(
			ctx,
			streamId,
			mbs,
			mbs[len(mbs)-1].Number+1,
			envelopes,
			mbs[0].Number,
			-1,
		))

		require.NoError(pgStreamStore.txRunner(
			ctx,
			"deleteGap",
			pgx.ReadWrite,
			func(ctx context.Context, tx pgx.Tx) error {
				deleteQuery := pgStreamStore.sqlForStream(
					"DELETE FROM {{miniblocks}} WHERE stream_id = $1 AND seq_num = $2",
					streamId,
				)
				for _, seq := range []int64{5, 15} {
					if _, err := tx.Exec(ctx, deleteQuery, streamId, seq); err != nil {
						return err
					}
				}
				return nil
			},
			nil,
			"streamId", streamId,
		))

		beforeSeqs, _ := collectStreamState(t, pgStreamStore, ctx, streamId)
		require.Greater(len(beforeSeqs), 0, beforeSeqs)
		require.Contains(beforeSeqs, int64(4), beforeSeqs)
		require.NotContains(beforeSeqs, int64(5), beforeSeqs)
		require.NotContains(beforeSeqs, int64(15), beforeSeqs)

		err := pgStreamStore.txRunner(
			ctx,
			"trimWithGap",
			pgx.ReadWrite,
			func(ctx context.Context, tx pgx.Tx) error {
				task := trimTask{
					streamId:             streamId,
					streamHistoryMbs:     5,
					retentionIntervalMbs: 0,
				}
				return pgStreamStore.streamTrimmer.processTrimTaskTx(ctx, tx, task)
			},
			nil,
			"streamId", streamId,
		)
		require.Error(err)
		require.True(base.IsRiverErrorCode(err, Err_MINIBLOCKS_STORAGE_FAILURE))

		afterSeqs, _ := collectStreamState(t, pgStreamStore, ctx, streamId)
		require.Equal(beforeSeqs, afterSeqs)
	})

	t.Run("pending deduplication keeps only one task per stream", func(t *testing.T) {
		params := setupStreamStorageTest(t)
		ctx := params.ctx
		pgStreamStore := params.pgStreamStore
		require := require.New(t)

		cfg := pgStreamStore.streamTrimmer.config.Get()
		cfg.StreamHistoryMiniblocks.Space = 5
		cfg.StreamSnapshotIntervalInMiniblocks = 0

		pgStreamStore.streamTrimmer.trimmingBatchSize = 2

		streamId := testutils.FakeStreamId(STREAM_SPACE_BIN)
		genesisMb := &MiniblockDescriptor{Data: []byte("genesis"), Snapshot: []byte("snap0")}
		require.NoError(pgStreamStore.CreateStreamStorage(ctx, streamId, genesisMb))

		var envelopes [][]byte
		envelopes = append(envelopes, []byte("event"))

		mbs := make([]*MiniblockDescriptor, 40)
		for i := 1; i <= 40; i++ {
			mb := &MiniblockDescriptor{
				Number: int64(i),
				Hash:   common.BytesToHash([]byte("hash" + strconv.Itoa(i))),
				Data:   []byte("block" + strconv.Itoa(i)),
			}
			if i%5 == 0 {
				mb.Snapshot = []byte("snap" + strconv.Itoa(i))
			}
			mbs[i-1] = mb
		}

		require.NoError(pgStreamStore.WriteMiniblocks(
			ctx,
			streamId,
			mbs,
			mbs[len(mbs)-1].Number+1,
			envelopes,
			mbs[0].Number,
			-1,
		))

		tr := pgStreamStore.streamTrimmer

		done := make(chan struct{})
		var maxPending int
		go func() {
			for {
				select {
				case <-done:
					return
				default:
					tr.pendingTasksLock.Lock()
					if l := len(tr.pendingTasks); l > maxPending {
						maxPending = l
					}
					tr.pendingTasksLock.Unlock()
					time.Sleep(5 * time.Millisecond)
				}
			}
		}()

		tr.tryScheduleTrimming(streamId)
		tr.tryScheduleTrimming(streamId)
		tr.tryScheduleTrimming(streamId)

		require.Eventually(func() bool {
			seqs, _ := collectStreamState(t, pgStreamStore, ctx, streamId)
			return slices.Equal([]int64{0, 35, 36, 37, 38, 39, 40}, seqs)
		}, time.Second*5, 100*time.Millisecond)

		close(done)

		tr.pendingTasksLock.Lock()
		pendingLen := len(tr.pendingTasks)
		tr.pendingTasksLock.Unlock()

		require.Equal(0, pendingLen)
		require.True(maxPending <= 1, "maxPending=%d", maxPending)
	})
}

func collectStreamState(
	t *testing.T,
	store *PostgresStreamStore,
	ctx context.Context,
	streamId StreamId,
) ([]int64, []int64) {
	t.Helper()

	ranges, err := store.GetMiniblockNumberRanges(ctx, streamId)
	require.NoError(t, err)

	var seqs []int64
	var withSnapshot []int64

	for _, r := range ranges {
		for seq := r.StartInclusive; seq <= r.EndInclusive; seq++ {
			seqs = append(seqs, seq)
		}
		if len(r.SnapshotSeqNums) > 0 {
			withSnapshot = append(withSnapshot, r.SnapshotSeqNums...)
		}
	}

	if len(withSnapshot) > 1 {
		slices.Sort(withSnapshot)
		withSnapshot = slices.Compact(withSnapshot)
	}

	return seqs, withSnapshot
}
