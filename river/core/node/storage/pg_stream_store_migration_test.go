package storage

import (
	"context"
	"strings"
	"testing"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/stretchr/testify/require"

	. "github.com/river-build/river/core/node/base"
	"github.com/river-build/river/core/node/base/test"
	"github.com/river-build/river/core/node/infra"
	. "github.com/river-build/river/core/node/shared"
	"github.com/river-build/river/core/node/testutils"
	"github.com/river-build/river/core/node/testutils/dbtestutils"
)

// Check various APIs on the store to validate the expected state of the stream.
// This heavy-weight check is used for testing legacy stream views after migrating
// the db schema and business logic and can be removed if desired once we confirm
// that all streams on public networks are fully migrated.
func checkStreamState(
	t *testing.T,
	ctx context.Context,
	store *PostgresStreamStore,
	expected *DebugReadStreamDataResult,
) {
	// 1. compare to actual debug read stream data
	actual, err := store.DebugReadStreamData(ctx, expected.StreamId)
	require.NoError(t, err)
	require.Equal(t, expected.StreamId, actual.StreamId)
	require.Equal(t, expected.LatestSnapshotMiniblockNum, actual.LatestSnapshotMiniblockNum)
	require.Equal(t, expected.Migrated, actual.Migrated)

	require.Len(t, actual.Miniblocks, len(expected.Miniblocks))
	for i := 0; i < len(expected.Miniblocks); i++ {
		require.Equal(t, expected.Miniblocks[i].MiniblockNumber, actual.Miniblocks[i].MiniblockNumber)
		require.Equal(t, expected.Miniblocks[i].Data, actual.Miniblocks[i].Data)
	}

	require.Len(t, actual.Events, len(expected.Events))
	for i := 0; i < len(expected.Events); i++ {
		require.Equal(t, expected.Events[i].Generation, actual.Events[i].Generation)
		require.Equal(t, expected.Events[i].Slot, actual.Events[i].Slot)
		require.Equal(t, expected.Events[i].Data, actual.Events[i].Data)
	}

	require.Len(t, actual.MbCandidates, len(expected.MbCandidates))
	for i := 0; i < len(expected.MbCandidates); i++ {
		require.Equal(t, expected.MbCandidates[i].MiniblockNumber, actual.MbCandidates[i].MiniblockNumber)
		require.Equal(t, expected.MbCandidates[i].Data, actual.MbCandidates[i].Data)
		require.Equal(t, expected.MbCandidates[i].Hash, actual.MbCandidates[i].Hash)
	}

	// 2. ReadStreamFromLastSnapshot
	expectedSnapshotMiniblocks := expected.Miniblocks[len(expected.Miniblocks)-1].MiniblockNumber - expected.LatestSnapshotMiniblockNum + 1
	readFromLastSnapshotResult, err := store.ReadStreamFromLastSnapshot(
		ctx,
		expected.StreamId,
		int(expectedSnapshotMiniblocks),
	)
	require.NoError(t, err)
	require.Len(t, readFromLastSnapshotResult.Miniblocks, int(expectedSnapshotMiniblocks))

	require.Equal(t, expected.LatestSnapshotMiniblockNum, readFromLastSnapshotResult.StartMiniblockNumber)
	require.Equal(t, 0, readFromLastSnapshotResult.SnapshotMiniblockOffset)

	// validate miniblock content
	for i := 0; i < int(expectedSnapshotMiniblocks); i = i + 1 {
		require.Equal(
			t,
			expected.Miniblocks[int(expected.LatestSnapshotMiniblockNum)+i].Data,
			readFromLastSnapshotResult.Miniblocks[i],
		)
	}

	// validate minipool content
	// Ignore generation record with slot_num=-1
	require.Len(t, readFromLastSnapshotResult.MinipoolEnvelopes, len(expected.Events)-1)
	for i := 0; i < len(expected.Events)-1; i = i + 1 {
		require.Equal(t, expected.Events[i+1].Data, readFromLastSnapshotResult.MinipoolEnvelopes[i])
	}

	// 3. ReadMiniblocks
	miniblocks, err := store.ReadMiniblocks(
		ctx,
		expected.StreamId,
		0,
		int64(len(expected.Miniblocks)),
	)
	require.NoError(t, err)
	require.Len(t, miniblocks, len(expected.Miniblocks))
	for i := 0; i < len(expected.Miniblocks); i++ {
		require.Equal(t, expected.Miniblocks[i].Data, miniblocks[i])
	}

	// 4. Miniblock candidates
	for _, mbCandidate := range expected.MbCandidates {
		actualData, err := store.ReadMiniblockCandidate(
			ctx,
			expected.StreamId,
			mbCandidate.Hash,
			mbCandidate.MiniblockNumber,
		)
		require.NoError(t, err, "Expected miniblock candidate")
		require.Equal(t, mbCandidate.Data, actualData)
	}

	// 5. StreamLastMiniblock
	actualLastMiniblock, err := store.StreamLastMiniBlock(ctx, expected.StreamId)

	require.NoError(t, err)
	expectedLastMiniblock := expected.Miniblocks[len(expected.Miniblocks)-1]
	require.Equal(t, expected.StreamId, actualLastMiniblock.StreamID)
	require.Equal(t, expectedLastMiniblock.MiniblockNumber, actualLastMiniblock.Number)
	require.Equal(t, expectedLastMiniblock.Data, actualLastMiniblock.MiniBlockInfo)
}

// Set up streams in various states before a migration and validate they read and mutate correctly
// after the migration.
// After migration, we should able to:
// - ReadStreamFromLastSnapshot, DebugReadStreamData
// - WriteEvent, with appropriate changes in stream state
// - ReadMiniblocks
// - Read, write, and promote miniblock candidates, with appropriate changes in stream state
// - ImportMiniblocks on top of the stream
// Additionally, legacy streams should still update appropriately in response to mutations.
func TestLegacyStreamDataAfterStoreMigration(t *testing.T) {
	ctx, ctxCloser := test.NewTestContext()
	defer ctxCloser()

	dbCfg, dbSchemaName, dbCloser, err := dbtestutils.ConfigureDB(ctx)
	if err != nil {
		panic(err)
	}
	// Delete schema
	defer dbCloser()

	dbCfg.StartupDelay = 2 * time.Millisecond
	dbCfg.Extra = strings.Replace(dbCfg.Extra, "pool_max_conns=1000", "pool_max_conns=10", 1)
	dbCfg.MigrateStreamCreation = false

	pool, err := CreateAndValidatePgxPool(
		ctx,
		dbCfg,
		dbSchemaName,
		nil,
	)
	require.NoError(t, err)

	deprecatedStore, err := NewPostgresStreamStore(
		ctx,
		pool,
		GenShortNanoid(),
		make(chan error, 1),
		infra.NewMetricsFactory(nil, "", ""),
	)
	require.NoError(t, err)

	streamId1 := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	streamId2 := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	streamId3 := testutils.FakeStreamId(STREAM_CHANNEL_BIN)

	// Set up streams.
	// stream 1: genesis miniblock, empty minipool
	// stream 2: genesis miniblock, miniblock candidate, single event in the minipool
	// stream 3: stream with multiple blocks and a snapshot, candidates, events in the pool

	// After migration, we should be able to perform all API operations on legacy streams. In addition,
	// the view of the stream from the db should be consistent.

	// Stream 1 setup
	genesisMiniblock := []byte("genesisMiniblock")
	err = deprecatedStore.CreateStreamStorage(ctx, streamId1, genesisMiniblock)
	require.NoError(t, err)

	// Stream 2 setup
	err = deprecatedStore.CreateStreamStorage(ctx, streamId2, []byte("genesisMiniblock2"))
	require.NoError(t, err)

	blockHash := common.BytesToHash([]byte("st"))
	err = deprecatedStore.WriteMiniblockCandidate(ctx, streamId2, blockHash, 1, []byte("stream2_candidate_hash"))
	require.NoError(t, err)

	err = deprecatedStore.WriteEvent(ctx, streamId2, 1, 0, []byte("event0"))
	require.NoError(t, err)

	// Stream 3 setup
	err = deprecatedStore.CreateStreamStorage(ctx, streamId3, []byte("genesisMiniblock3"))
	require.NoError(t, err)

	stream3Blocks := []MiniblockDescriptor{
		{
			MiniblockNumber: 1,
			Data:            []byte("block1_data"),
			Hash:            common.BytesToHash([]byte("hash1")),
		},
		{
			MiniblockNumber: 2,
			Data:            []byte("block2_data"),
			Hash:            common.BytesToHash([]byte("hash2")),
		},
		{
			MiniblockNumber: 3,
			Data:            []byte("block3_data"),
			Hash:            common.BytesToHash([]byte("hash3")),
		},
		{
			MiniblockNumber: 4,
			Data:            []byte("block4_data"),
			Hash:            common.BytesToHash([]byte("hash4")),
		},
	}
	for _, candidate := range stream3Blocks {
		err = deprecatedStore.WriteMiniblockCandidate(
			ctx,
			streamId3,
			candidate.Hash,
			candidate.MiniblockNumber,
			candidate.Data,
		)
		require.NoError(t, err)

		// Leave block 4 as a candidate, do not promote.
		if candidate.MiniblockNumber == 4 {
			break
		}

		// Snapshot block 2, leave block 4 as a candidate
		err = promoteMiniblockCandidate(
			ctx,
			deprecatedStore,
			streamId3,
			candidate.MiniblockNumber,
			candidate.Hash,
			candidate.MiniblockNumber == 2,
			[][]byte{},
		)
		require.NoError(t, err)
	}

	require.NoError(t, deprecatedStore.WriteEvent(ctx, streamId3, 4, 0, []byte("event0")))
	require.NoError(t, deprecatedStore.WriteEvent(ctx, streamId3, 4, 1, []byte("event1")))

	deprecatedStore.Close(ctx)

	// Create migrated store
	dbCfg.MigrateStreamCreation = true
	pool, err = CreateAndValidatePgxPool(
		ctx,
		dbCfg,
		dbSchemaName,
		nil,
	)
	require.NoError(t, err)
	store, err := NewPostgresStreamStore(
		ctx,
		pool,
		GenShortNanoid(),
		make(chan error, 1),
		infra.NewMetricsFactory(nil, "", ""),
	)
	require.NoError(t, err, "Unable to create postgres store")
	defer store.Close(ctx)

	// Check views
	// ===========
	// Stream 1: one miniblock, empty minipool
	checkStreamState(
		t,
		ctx,
		store,
		&DebugReadStreamDataResult{
			StreamId:                   streamId1,
			LatestSnapshotMiniblockNum: 0,
			Migrated:                   false,
			Miniblocks: []MiniblockDescriptor{
				{
					MiniblockNumber: 0,
					Data:            genesisMiniblock,
				},
			},
			Events: []EventDescriptor{
				{
					Generation: 1,
					Slot:       -1,
				},
			},
		},
	)
	// Stream 2: one miniblock, 2 events, 1 candidate
	checkStreamState(
		t,
		ctx,
		store,
		&DebugReadStreamDataResult{
			StreamId: streamId2,
			Migrated: false,
			Miniblocks: []MiniblockDescriptor{
				{
					MiniblockNumber: 0,
					Data:            []byte("genesisMiniblock2"),
				},
			},
			Events: []EventDescriptor{
				{
					Generation: 1,
					Slot:       -1,
				},
				{
					Generation: 1,
					Slot:       0,
					Data:       []byte("event0"),
				},
			},
			// TODO: this is a bug, candidates < the current committed block # should be dropped
			// whenever blocks are imported.
			MbCandidates: []MiniblockDescriptor{
				{
					MiniblockNumber: 1,
					Data:            []byte("stream2_candidate_hash"),
					Hash:            blockHash,
				},
			},
		},
	)

	// Stream 3: snapshot on block 2, 4 miniblocks, 1 candidate, 2 events
	checkStreamState(
		t,
		ctx,
		store,
		&DebugReadStreamDataResult{
			StreamId:                   streamId3,
			LatestSnapshotMiniblockNum: 2,
			Migrated:                   false,
			Miniblocks: []MiniblockDescriptor{
				{
					MiniblockNumber: 0,
					Data:            []byte("genesisMiniblock3"),
				},
				{
					MiniblockNumber: 1,
					Data:            []byte("block1_data"),
				},
				{
					MiniblockNumber: 2,
					Data:            []byte("block2_data"),
				},
				{
					MiniblockNumber: 3,
					Data:            []byte("block3_data"),
				},
			},
			Events: []EventDescriptor{
				{
					Generation: 4,
					Slot:       -1,
				},
				{
					Generation: 4,
					Slot:       0,
					Data:       []byte("event0"),
				},
				{
					Generation: 4,
					Slot:       1,
					Data:       []byte("event1"),
				},
			},
			MbCandidates: []MiniblockDescriptor{
				{
					MiniblockNumber: 4,
					Data:            []byte("block4_data"),
					Hash:            common.BytesToHash([]byte("hash4")),
				},
			},
		},
	)

	// Mutations
	// =========
	// Add events and check stream state in storage
	err = store.WriteEvent(ctx, streamId1, 1, 0, []byte("event0"))
	require.NoError(t, err)
	err = store.WriteEvent(ctx, streamId1, 1, 1, []byte("event1"))
	require.NoError(t, err)

	// Check constraints are still applied to unmigrated streams:
	// Bad generation
	err = store.WriteEvent(ctx, streamId1, 5, 2, []byte("wrong generation"))
	require.ErrorContains(t, err, "Wrong event generation in minipool")
	// Bad slot number
	err = store.WriteEvent(ctx, streamId1, 1, 5, []byte("bad slot number"))
	require.ErrorContains(t, err, "Wrong number of records in minipool")

	checkStreamState(
		t,
		ctx,
		store,
		&DebugReadStreamDataResult{
			StreamId:                   streamId1,
			LatestSnapshotMiniblockNum: 0,
			Migrated:                   false,
			Miniblocks: []MiniblockDescriptor{
				{
					MiniblockNumber: 0,
					Data:            genesisMiniblock,
				},
			},
			Events: []EventDescriptor{
				{
					Generation: 1,
					Slot:       -1,
				},
				{
					Generation: 1,
					Slot:       0,
					Data:       []byte("event0"),
				},
				{
					Generation: 1,
					Slot:       1,
					Data:       []byte("event1"),
				},
			},
		},
	)

	// Write miniblock candidates
	candidateHash1 := common.BytesToHash([]byte("block_hash1"))
	candidateHash2 := common.BytesToHash([]byte("block_hash2"))
	candidateHash3 := common.BytesToHash([]byte("block_hash3"))
	candidateHash4 := common.BytesToHash([]byte("block_hash4"))
	err = store.WriteMiniblockCandidate(ctx, streamId1, candidateHash1, 1, []byte("miniblock1_candidate0"))
	require.NoError(t, err)
	err = store.WriteMiniblockCandidate(ctx, streamId1, candidateHash2, 1, []byte("miniblock1_candidate1"))
	require.NoError(t, err)
	err = store.WriteMiniblockCandidate(ctx, streamId1, candidateHash3, 2, []byte("miniblock2_candidate0"))
	require.NoError(t, err)
	// Check bad block number still produces error
	err = store.WriteMiniblockCandidate(ctx, streamId1, candidateHash4, 0, []byte("bad_block_number"))
	require.ErrorContains(t, err, "Miniblock proposal blockNumber mismatch")

	checkStreamState(
		t,
		ctx,
		store,
		&DebugReadStreamDataResult{
			StreamId:                   streamId1,
			LatestSnapshotMiniblockNum: 0,
			Migrated:                   false,
			Miniblocks: []MiniblockDescriptor{
				{
					MiniblockNumber: 0,
					Data:            genesisMiniblock,
				},
			},
			Events: []EventDescriptor{
				{
					Generation: 1,
					Slot:       -1,
				},
				{
					Generation: 1,
					Slot:       0,
					Data:       []byte("event0"),
				},
				{
					Generation: 1,
					Slot:       1,
					Data:       []byte("event1"),
				},
			},
			MbCandidates: []MiniblockDescriptor{
				{
					MiniblockNumber: 1,
					Data:            []byte("miniblock1_candidate0"),
					Hash:            candidateHash1,
				},
				{
					MiniblockNumber: 1,
					Data:            []byte("miniblock1_candidate1"),
					Hash:            candidateHash2,
				},
				{
					MiniblockNumber: 2,
					Data:            []byte("miniblock2_candidate0"),
					Hash:            candidateHash3,
				},
			},
		},
	)

	// Promote a new miniblock
	err = promoteMiniblockCandidate(
		ctx,
		store,
		streamId1,
		1,
		candidateHash2,
		true,
		[][]byte{
			// Retain event 1
			[]byte("event1"),
		},
	)
	require.NoError(t, err)

	checkStreamState(
		t,
		ctx,
		store,
		&DebugReadStreamDataResult{
			StreamId:                   streamId1,
			LatestSnapshotMiniblockNum: 1,
			Migrated:                   false,
			Miniblocks: []MiniblockDescriptor{
				{
					MiniblockNumber: 0,
					Data:            genesisMiniblock,
				},
				{
					MiniblockNumber: 1,
					Data:            []byte("miniblock1_candidate1"),
				},
			},
			Events: []EventDescriptor{
				{
					Generation: 2,
					Slot:       -1,
				},
				{
					Generation: 2,
					Slot:       0,
					Data:       []byte("event1"),
				},
			},
			MbCandidates: []MiniblockDescriptor{
				{
					MiniblockNumber: 2,
					Data:            []byte("miniblock2_candidate0"),
					Hash:            candidateHash3,
				},
			},
		},
	)
}

func TestLegacyStreamArchiveDataAfterStoreMigration(t *testing.T) {
	ctx, ctxCloser := test.NewTestContext()
	defer ctxCloser()

	dbCfg, dbSchemaName, dbCloser, err := dbtestutils.ConfigureDB(ctx)
	if err != nil {
		panic(err)
	}
	// Delete schema
	defer dbCloser()

	dbCfg.StartupDelay = 2 * time.Millisecond
	dbCfg.Extra = strings.Replace(dbCfg.Extra, "pool_max_conns=1000", "pool_max_conns=10", 1)
	dbCfg.MigrateStreamCreation = false

	pool, err := CreateAndValidatePgxPool(
		ctx,
		dbCfg,
		dbSchemaName,
		nil,
	)
	require.NoError(t, err)

	deprecatedStore, err := NewPostgresStreamStore(
		ctx,
		pool,
		GenShortNanoid(),
		make(chan error, 1),
		infra.NewMetricsFactory(nil, "", ""),
	)
	require.NoError(t, err)

	// Stream 1 will be empty when the store migrates. Stream 2 will have a few miniblocks.
	streamId1 := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	streamId2 := testutils.FakeStreamId(STREAM_CHANNEL_BIN)

	require.NoError(t, deprecatedStore.CreateStreamArchiveStorage(ctx, streamId1))
	require.NoError(t, deprecatedStore.CreateStreamArchiveStorage(ctx, streamId2))

	stream2StartMiniblocks := [][]byte{
		[]byte("genesis_miniblock"),
		[]byte("block1Data"),
		[]byte("block2Data"),
	}
	require.NoError(t, deprecatedStore.WriteArchiveMiniblocks(ctx, streamId2, 0, stream2StartMiniblocks))

	deprecatedStore.Close(ctx)

	// Create migrated store
	dbCfg.MigrateStreamCreation = true
	pool, err = CreateAndValidatePgxPool(
		ctx,
		dbCfg,
		dbSchemaName,
		nil,
	)
	require.NoError(t, err)
	store, err := NewPostgresStreamStore(
		ctx,
		pool,
		GenShortNanoid(),
		make(chan error, 1),
		infra.NewMetricsFactory(nil, "", ""),
	)
	require.NoError(t, err, "Unable to create postgres store")
	defer store.Close(ctx)

	maxArchivedMiniblockStream1, err := store.GetMaxArchivedMiniblockNumber(ctx, streamId1)
	require.NoError(t, err)
	require.Equal(t, int64(-1), maxArchivedMiniblockStream1)

	// Stream 1 and stream 2 should show the correct state and respond correctly to mutations.
	maxArchivedMiniblockStream2, err := store.GetMaxArchivedMiniblockNumber(ctx, streamId2)
	require.NoError(t, err)
	require.Equal(t, int64(2), maxArchivedMiniblockStream2)

	stream1Miniblocks := [][]byte{
		[]byte("block0"),
		[]byte("block1"),
		[]byte("block2"),
		[]byte("block3"),
	}

	err = store.WriteArchiveMiniblocks(ctx, streamId1, 0, stream1Miniblocks)
	require.NoError(t, err)

	actualStream1Miniblocks, err := store.ReadMiniblocks(ctx, streamId1, 0, 4)
	require.NoError(t, err)

	require.Len(t, actualStream1Miniblocks, len(stream1Miniblocks))
	for i, data := range stream1Miniblocks {
		require.Equal(t, data, actualStream1Miniblocks[i])
	}

	actualStream2Miniblocks, err := store.ReadMiniblocks(ctx, streamId2, 0, 3)
	require.NoError(t, err)
	require.Len(t, actualStream2Miniblocks, len(stream2StartMiniblocks))

	for i, data := range stream2StartMiniblocks {
		require.Equal(t, actualStream2Miniblocks[i], data)
	}

	stream2AddedMiniblocks := [][]byte{
		[]byte("block3Data"),
		[]byte("block4Data"),
		[]byte("block5Data"),
		[]byte("block6Data"),
	}

	require.NoError(t, store.WriteArchiveMiniblocks(ctx, streamId2, 3, stream2AddedMiniblocks))

	lastTwoBlocks, err := store.ReadMiniblocks(ctx, streamId2, 5, 7)
	require.NoError(t, err)
	require.Len(t, lastTwoBlocks, 2)
	require.Equal(t, []byte("block5Data"), lastTwoBlocks[0])
	require.Equal(t, []byte("block6Data"), lastTwoBlocks[1])
}
