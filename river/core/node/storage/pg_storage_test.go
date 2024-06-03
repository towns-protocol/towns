package storage

import (
	"context"
	"embed"
	"reflect"
	"strings"
	"testing"
	"time"

	"github.com/ethereum/go-ethereum/common"
	. "github.com/river-build/river/core/node/base"
	"github.com/river-build/river/core/node/base/test"
	"github.com/river-build/river/core/node/config"
	"github.com/river-build/river/core/node/infra"
	. "github.com/river-build/river/core/node/protocol"
	. "github.com/river-build/river/core/node/shared"
	"github.com/river-build/river/core/node/testutils"
	"github.com/river-build/river/core/node/testutils/dbtestutils"

	"github.com/stretchr/testify/require"
)

type testParams struct {
	schema     string
	config     *config.DatabaseConfig
	exitSignal chan error
	closer     func()
}

func setupTest() (context.Context, *PostgresEventStore, *testParams) {
	return setupTestWithMigration(migrationsDir)
}

func setupTestWithMigration(
	migrations embed.FS,
) (context.Context, *PostgresEventStore, *testParams) {
	ctx, ctxCloser := test.NewTestContext()

	dbCfg, dbSchemaName, dbCloser, err := dbtestutils.StartDB(ctx)
	if err != nil {
		panic(err)
	}

	dbCfg.StartupDelay = 2 * time.Millisecond
	dbCfg.Extra = strings.Replace(dbCfg.Extra, "pool_max_conns=1000", "pool_max_conns=10", 1)

	pool, err := CreateAndValidatePgxPool(
		ctx,
		dbCfg,
		dbSchemaName,
	)
	if err != nil {
		panic(err)
	}

	instanceId := GenShortNanoid()
	exitSignal := make(chan error, 1)
	store, err := newPostgresEventStore(
		ctx,
		pool,
		instanceId,
		exitSignal,
		infra.NewMetricsFactory("", ""),
		migrations,
	)
	if err != nil {
		panic(err)
	}

	params := &testParams{
		schema:     dbSchemaName,
		config:     dbCfg,
		exitSignal: exitSignal,
		closer: func() {
			store.Close(ctx)
			dbCloser()
			ctxCloser()
		},
	}

	return ctx, store, params
}

func TestPostgresAcquireConnections(t *testing.T) {
	tests := map[string]struct {
		acquire       func(t *testing.T, ctx context.Context, pgEventStore *PostgresEventStore) func()
		expectedSlots int
		tryAcquire    func(t *testing.T, ctx context.Context, pgEventStore *PostgresEventStore) bool
	}{
		"AcquireRegularConnection": {
			acquire: func(t *testing.T, ctx context.Context, pgEventStore *PostgresEventStore) func() {
				release, err := pgEventStore.acquireRegularConnection(ctx)
				require.NoError(t, err)
				return release
			},
			expectedSlots: 8,
			tryAcquire: func(t *testing.T, ctx context.Context, pgEventStore *PostgresEventStore) bool {
				return pgEventStore.regularConnections.TryAcquire(1)
			},
		},
		"AcquireStreamingConnection": {
			acquire: func(t *testing.T, ctx context.Context, pgEventStore *PostgresEventStore) func() {
				release, err := pgEventStore.acquireStreamingConnection(ctx)
				require.NoError(t, err)
				return release
			},
			expectedSlots: 1,
			tryAcquire: func(t *testing.T, ctx context.Context, pgEventStore *PostgresEventStore) bool {
				return pgEventStore.streamingConnections.TryAcquire(1)
			},
		},
	}

	for name, tc := range tests {
		t.Run(name, func(t *testing.T) {
			require := require.New(t)

			// dbUrl := strings.Replace(testDatabaseUrl, "pool_max_conns=1000", "pool_max_conns=10", 1)
			ctx, pgEventStore, testParams := setupTest()
			defer testParams.closer()

			// Test that we can acquire and release connections
			releaseConnections := make(chan func(), tc.expectedSlots+10)
			for i := 0; i < tc.expectedSlots; i++ {
				releaseConnections <- tc.acquire(t, ctx, pgEventStore)
			}

			// All acquires now blocked
			require.False(tc.tryAcquire(t, ctx, pgEventStore))

			for i := 0; i < 10; i++ {
				// One release frees up one acquire
				(<-releaseConnections)()
				releaseConnections <- tc.acquire(t, ctx, pgEventStore)
			}

			for i := 0; i < tc.expectedSlots; i++ {
				(<-releaseConnections)()
			}
		})
	}
}

func TestPostgresEventStore(t *testing.T) {
	require := require.New(t)

	ctx, pgEventStore, testParams := setupTest()
	defer testParams.closer()

	streamsNumber, err := pgEventStore.GetStreamsNumber(ctx)
	require.NoError(err)
	require.Equal(0, streamsNumber)

	streamId1 := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	streamId2 := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	streamId3 := testutils.FakeStreamId(STREAM_CHANNEL_BIN)

	// Test that created stream will have proper genesis miniblock
	genesisMiniblock := []byte("genesisMiniblock")
	err = pgEventStore.CreateStreamStorage(ctx, streamId1, genesisMiniblock)
	require.NoError(err)

	streamsNumber, err = pgEventStore.GetStreamsNumber(ctx)
	require.NoError(err)
	require.Equal(1, streamsNumber)

	streamFromLastSnaphot, streamRetrievalError := pgEventStore.ReadStreamFromLastSnapshot(ctx, streamId1, 0)

	if streamRetrievalError != nil {
		t.Fatal(streamRetrievalError)
	}

	if len(streamFromLastSnaphot.Miniblocks) != 1 {
		t.Fatal("Expected to find one miniblock, found different number")
	}

	if !reflect.DeepEqual(streamFromLastSnaphot.Miniblocks[0], genesisMiniblock) {
		t.Fatal("Expected to find original genesis block, found different")
	}

	if len(streamFromLastSnaphot.MinipoolEnvelopes) != 0 {
		t.Fatal("Expected minipool to be empty, found different", streamFromLastSnaphot.MinipoolEnvelopes)
	}

	// Test that we cannot add second stream with same id
	genesisMiniblock2 := []byte("genesisMiniblock2")
	err = pgEventStore.CreateStreamStorage(ctx, streamId1, genesisMiniblock2)
	if err == nil {
		t.Fatal(err)
	}

	// Test that we can add second stream and then GetStreams will return both
	err = pgEventStore.CreateStreamStorage(ctx, streamId2, genesisMiniblock2)
	if err != nil {
		t.Fatal(err)
	}

	streams, err := pgEventStore.GetStreams(ctx)
	require.NoError(err)
	require.ElementsMatch(streams, []StreamId{streamId1, streamId2})

	// Test that we can delete stream and proper stream will be deleted
	genesisMiniblock3 := []byte("genesisMiniblock3")
	err = pgEventStore.CreateStreamStorage(ctx, streamId3, genesisMiniblock3)
	if err != nil {
		t.Fatal(err)
	}

	err = pgEventStore.DeleteStream(ctx, streamId2)
	if err != nil {
		t.Fatal("Error of deleting stream", err)
	}

	streams, err = pgEventStore.GetStreams(ctx)
	require.NoError(err)
	require.ElementsMatch(streams, []StreamId{streamId1, streamId3})

	// Test that we can add event to stream and then retrieve it
	addEventError := pgEventStore.WriteEvent(ctx, streamId1, 1, 0, []byte("event1"))

	if addEventError != nil {
		t.Fatal(streamRetrievalError)
	}

	streamFromLastSnaphot, streamRetrievalError = pgEventStore.ReadStreamFromLastSnapshot(ctx, streamId1, 0)

	if streamRetrievalError != nil {
		t.Fatal(streamRetrievalError)
	}

	if len(streamFromLastSnaphot.MinipoolEnvelopes) != 1 {
		t.Fatal("Expected to find one miniblock, found different number")
	}

	if !reflect.DeepEqual(streamFromLastSnaphot.MinipoolEnvelopes[0], []byte("event1")) {
		t.Fatal("Expected to find original genesis block, found different")
	}
	var testEnvelopes [][]byte
	testEnvelopes = append(testEnvelopes, []byte("event2"))
	blockHash := common.BytesToHash([]byte("block_hash"))
	err = pgEventStore.WriteBlockProposal(ctx, streamId1, blockHash, 1, []byte("block1"))
	if err != nil {
		t.Fatal("error creating block candidate")
	}
	err = pgEventStore.PromoteBlock(ctx, streamId1, 1, blockHash, false, testEnvelopes)
	if err != nil {
		t.Fatal("error promoting block", err)
	}

	var testEnvelopes2 [][]byte
	testEnvelopes2 = append(testEnvelopes2, []byte("event3"))
	blockHash2 := common.BytesToHash([]byte("block_hash_2"))
	err = pgEventStore.WriteBlockProposal(ctx, streamId1, blockHash2, 2, []byte("block2"))
	if err != nil {
		t.Fatal("error creating block proposal with snapshot", err)
	}

	err = pgEventStore.PromoteBlock(ctx, streamId1, 2, blockHash2, true, testEnvelopes2)
	if err != nil {
		t.Fatal("error promoting block with snapshot", err)
	}
}

func TestPromoteMiniblockCandidate(t *testing.T) {
	ctx, pgEventStore, testParams := setupTest()
	defer testParams.closer()
	require := require.New(t)

	streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	streamId2 := testutils.FakeStreamId(STREAM_CHANNEL_BIN)

	prepareTestDataForAddEventConsistencyCheck(ctx, pgEventStore, streamId)

	candidateHash := common.BytesToHash([]byte("block_hash"))
	candidateHash2 := common.BytesToHash([]byte("block_hash_2"))
	candidateHash_block2 := common.BytesToHash([]byte("block_hash_block2"))
	miniblock_bytes := []byte("miniblock_bytes")

	// Miniblock candidate seq number must be at least current
	err := pgEventStore.WriteBlockProposal(ctx, streamId, candidateHash, 0, miniblock_bytes)
	require.ErrorContains(err, "Miniblock proposal blockNumber mismatch")
	require.Equal(AsRiverError(err).GetTag("ExpectedBlockNumber"), int64(1))
	require.Equal(AsRiverError(err).GetTag("ActualBlockNumber"), int64(0))

	// Future candidates fine
	err = pgEventStore.WriteBlockProposal(ctx, streamId, candidateHash_block2, 2, miniblock_bytes)
	require.NoError(err)

	// Write two candidates for this block number
	err = pgEventStore.WriteBlockProposal(ctx, streamId, candidateHash, 1, miniblock_bytes)
	require.NoError(err)

	// Double write with the same hash should produce no errors, it's possible multiple nodes may propose the same candidate.
	err = pgEventStore.WriteBlockProposal(ctx, streamId, candidateHash, 1, miniblock_bytes)
	require.NoError(err)

	err = pgEventStore.WriteBlockProposal(ctx, streamId, candidateHash2, 1, miniblock_bytes)
	require.NoError(err)

	// Add candidate from another stream. This candidate should be untouched by the delete when a
	// candidate from the first stream is promoted.
	genesisMiniblock := []byte("genesisMiniblock")
	_ = pgEventStore.CreateStreamStorage(ctx, streamId2, genesisMiniblock)
	err = pgEventStore.WriteBlockProposal(ctx, streamId2, candidateHash, 1, []byte("some bytes"))
	require.NoError(err)

	var testEnvelopes [][]byte
	testEnvelopes = append(testEnvelopes, []byte("event1"))
	testEnvelopes = append(testEnvelopes, []byte("event2"))

	// Nonexistent hash promotion fails
	err = pgEventStore.PromoteBlock(
		ctx,
		streamId,
		1,
		common.BytesToHash([]byte("nonexistent_hash")),
		false,
		testEnvelopes,
	)
	require.ErrorContains(err, "No candidate block found")

	// Stream 1 promotion succeeds.
	err = pgEventStore.PromoteBlock(
		ctx,
		streamId,
		1,
		candidateHash,
		false,
		testEnvelopes,
	)
	require.NoError(err)

	// Stream 1 able to promote candidate block from round 2 - candidate unaffected by delete at round 1 promotion.
	err = pgEventStore.PromoteBlock(
		ctx,
		streamId,
		2,
		candidateHash_block2,
		false,
		testEnvelopes,
	)
	require.NoError(err)

	// Stream 2 should be unaffected by stream 1 promotion, which deletes all candidates for stream 1 only.
	err = pgEventStore.PromoteBlock(
		ctx,
		streamId2,
		1,
		candidateHash,
		false,
		testEnvelopes,
	)
	require.NoError(err)
}

func prepareTestDataForAddEventConsistencyCheck(ctx context.Context, s *PostgresEventStore, streamId StreamId) {
	genesisMiniblock := []byte("genesisMiniblock")
	_ = s.CreateStreamStorage(ctx, streamId, genesisMiniblock)
	_ = s.WriteEvent(ctx, streamId, 1, 0, []byte("event1"))
	_ = s.WriteEvent(ctx, streamId, 1, 1, []byte("event2"))
	_ = s.WriteEvent(ctx, streamId, 1, 2, []byte("event3"))
}

// Test that if there is an event with wrong generation in minipool, we will get error
func TestAddEventConsistencyChecksImproperGeneration(t *testing.T) {
	require := require.New(t)
	ctx, pgEventStore, testParams := setupTest()
	defer testParams.closer()

	streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)

	prepareTestDataForAddEventConsistencyCheck(ctx, pgEventStore, streamId)

	// Corrupt record in minipool
	_, _ = pgEventStore.pool.Exec(ctx, "UPDATE minipools SET generation = 777 WHERE slot_num = 1")
	err := pgEventStore.WriteEvent(ctx, streamId, 1, 3, []byte("event4"))

	require.NotNil(err)
	require.Contains(err.Error(), "Wrong event generation in minipool")
	require.Equal(AsRiverError(err).GetTag("ActualGeneration"), int64(777))
	require.Equal(AsRiverError(err).GetTag("ExpectedGeneration"), int64(1))
	require.Equal(AsRiverError(err).GetTag("SlotNumber"), 1)
}

// Test that if there is a gap in minipool records, we will get error
func TestAddEventConsistencyChecksGaps(t *testing.T) {
	require := require.New(t)
	ctx, pgEventStore, testParams := setupTest()
	defer testParams.closer()

	streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)

	prepareTestDataForAddEventConsistencyCheck(ctx, pgEventStore, streamId)

	// Corrupt record in minipool
	_, _ = pgEventStore.pool.Exec(ctx, "DELETE FROM minipools WHERE slot_num = 1")
	err := pgEventStore.WriteEvent(ctx, streamId, 1, 3, []byte("event4"))

	require.NotNil(err)
	require.Contains(err.Error(), "Wrong slot number in minipool")
	require.Equal(AsRiverError(err).GetTag("ActualSlotNumber"), 2)
	require.Equal(AsRiverError(err).GetTag("ExpectedSlotNumber"), 1)
}

// Test that if there is a wrong number minipool records, we will get error
func TestAddEventConsistencyChecksEventsNumberMismatch(t *testing.T) {
	require := require.New(t)
	ctx, pgEventStore, testParams := setupTest()
	defer testParams.closer()

	streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)

	prepareTestDataForAddEventConsistencyCheck(ctx, pgEventStore, streamId)

	// Corrupt record in minipool
	_, _ = pgEventStore.pool.Exec(ctx, "DELETE FROM minipools WHERE slot_num = 2")
	err := pgEventStore.WriteEvent(ctx, streamId, 1, 3, []byte("event4"))

	require.NotNil(err)
	require.Contains(err.Error(), "Wrong number of records in minipool")
	require.Equal(AsRiverError(err).GetTag("ActualRecordsNumber"), 2)
	require.Equal(AsRiverError(err).GetTag("ExpectedRecordsNumber"), 3)
}

func TestNoStream(t *testing.T) {
	require := require.New(t)
	ctx, pgEventStore, testParams := setupTest()
	defer testParams.closer()

	res, err := pgEventStore.ReadStreamFromLastSnapshot(ctx, testutils.FakeStreamId(STREAM_CHANNEL_BIN), 0)
	require.Nil(res)
	require.Error(err)
	require.Equal(Err_NOT_FOUND, AsRiverError(err).Code, err)
}

func TestCreateBlockProposalConsistencyChecksProperNewMinipoolGeneration(t *testing.T) {
	require := require.New(t)
	ctx, pgEventStore, testParams := setupTest()
	defer testParams.closer()

	streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	genesisMiniblock := []byte("genesisMiniblock")
	_ = pgEventStore.CreateStreamStorage(ctx, streamId, genesisMiniblock)

	var testEnvelopes1 [][]byte
	testEnvelopes1 = append(testEnvelopes1, []byte("event1"))
	var testEnvelopes2 [][]byte
	testEnvelopes2 = append(testEnvelopes2, []byte("event2"))

	blockHash1 := common.BytesToHash([]byte("hash1"))
	blockHash2 := common.BytesToHash([]byte("hash2"))
	blockHash3 := common.BytesToHash([]byte("hash3"))
	_ = pgEventStore.WriteBlockProposal(ctx, streamId, blockHash1, 1, []byte("block1"))
	_ = pgEventStore.PromoteBlock(ctx, streamId, 1, blockHash1, true, testEnvelopes1)

	_ = pgEventStore.WriteBlockProposal(ctx, streamId, blockHash2, 2, []byte("block2"))
	_ = pgEventStore.PromoteBlock(ctx, streamId, 2, blockHash2, false, testEnvelopes2)

	_, _ = pgEventStore.pool.Exec(ctx, "DELETE FROM miniblocks WHERE seq_num = 2")

	// Future candidate writes are fine, these may come from other nodes.
	err := pgEventStore.WriteBlockProposal(ctx, streamId, blockHash3, 3, []byte("block3"))
	require.Nil(err)
}

func TestPromoteBlockConsistencyChecksProperNewMinipoolGeneration(t *testing.T) {
	ctx, pgEventStore, testParams := setupTest()
	defer testParams.closer()

	require := require.New(t)

	streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	genesisMiniblock := []byte("genesisMiniblock")
	_ = pgEventStore.CreateStreamStorage(ctx, streamId, genesisMiniblock)

	var testEnvelopes1 [][]byte
	testEnvelopes1 = append(testEnvelopes1, []byte("event1"))
	var testEnvelopes2 [][]byte
	testEnvelopes2 = append(testEnvelopes2, []byte("event2"))
	var testEnvelopes3 [][]byte
	testEnvelopes3 = append(testEnvelopes3, []byte("event3"))

	blockHash1 := common.BytesToHash([]byte("hash1"))
	blockHash2 := common.BytesToHash([]byte("hash2"))
	blockHash3 := common.BytesToHash([]byte("hash3"))
	_ = pgEventStore.WriteBlockProposal(ctx, streamId, blockHash1, 1, []byte("block1"))
	_ = pgEventStore.PromoteBlock(ctx, streamId, 1, blockHash1, true, testEnvelopes1)

	_ = pgEventStore.WriteBlockProposal(ctx, streamId, blockHash2, 2, []byte("block2"))
	_ = pgEventStore.PromoteBlock(ctx, streamId, 2, blockHash2, false, testEnvelopes2)

	_ = pgEventStore.WriteBlockProposal(ctx, streamId, blockHash3, 3, []byte("block3"))

	_, _ = pgEventStore.pool.Exec(ctx, "DELETE FROM miniblocks WHERE seq_num = 2")
	err := pgEventStore.PromoteBlock(ctx, streamId, 3, blockHash3, false, testEnvelopes3)

	// TODO(crystal): tune these
	require.NotNil(err)
	require.Contains(err.Error(), "Minipool generation mismatch")
	require.Equal(AsRiverError(err).GetTag("ActualNewMinipoolGeneration"), int64(2))
	require.Equal(AsRiverError(err).GetTag("ExpectedNewMinipoolGeneration"), int64(3))
}

func TestCreateBlockProposalNoSuchStreamError(t *testing.T) {
	require := require.New(t)
	ctx, pgEventStore, testParams := setupTest()
	defer testParams.closer()

	streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	genesisMiniblock := []byte("genesisMiniblock")
	_ = pgEventStore.CreateStreamStorage(ctx, streamId, genesisMiniblock)

	_, _ = pgEventStore.pool.Exec(ctx, "DELETE FROM miniblocks")

	err := pgEventStore.WriteBlockProposal(ctx, streamId, common.BytesToHash([]byte("block_hash")), 1, []byte("block1"))

	require.NotNil(err)
	require.Contains(err.Error(), "No blocks for the stream found in block storage")
	require.Equal(AsRiverError(err).GetTag("streamId"), streamId)
}

func TestPromoteBlockNoSuchStreamError(t *testing.T) {
	ctx, pgEventStore, testParams := setupTest()
	defer testParams.closer()

	require := require.New(t)

	streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	genesisMiniblock := []byte("genesisMiniblock")
	_ = pgEventStore.CreateStreamStorage(ctx, streamId, genesisMiniblock)

	var testEnvelopes1 [][]byte
	testEnvelopes1 = append(testEnvelopes1, []byte("event1"))
	block_hash := common.BytesToHash([]byte("block_hash"))
	_ = pgEventStore.WriteBlockProposal(ctx, streamId, block_hash, 1, []byte("block1"))

	_, _ = pgEventStore.pool.Exec(ctx, "DELETE FROM miniblocks")

	err := pgEventStore.PromoteBlock(ctx, streamId, 1, block_hash, true, testEnvelopes1)

	require.NotNil(err)
	require.Contains(err.Error(), "No blocks for the stream found in block storage")
	require.Equal(AsRiverError(err).GetTag("streamId"), streamId)
}

func TestExitIfSecondStorageCreated(t *testing.T) {
	require := require.New(t)

	ctx, pgEventStore, testParams := setupTest()
	defer testParams.closer()

	// Give listener thread some time to start
	time.Sleep(500 * time.Millisecond)

	genesisMiniblock := []byte("genesisMiniblock")
	streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	err := pgEventStore.CreateStreamStorage(ctx, streamId, genesisMiniblock)
	require.NoError(err)

	pool, err := CreateAndValidatePgxPool(
		ctx,
		testParams.config,
		testParams.schema,
	)
	require.NoError(err)

	instanceId2 := GenShortNanoid()
	exitSignal2 := make(chan error, 1)
	pgEventStore2, err := newPostgresEventStore(
		ctx,
		pool,
		instanceId2,
		exitSignal2,
		infra.NewMetricsFactory("", ""),
		migrationsDir,
	)
	require.NoError(err)
	defer pgEventStore2.Close(ctx)

	// Give listener thread for the first store some time to detect the notification and emit an error
	time.Sleep(500 * time.Millisecond)

	exitErr := <-testParams.exitSignal
	require.Error(exitErr)
	require.Equal(Err_RESOURCE_EXHAUSTED, AsRiverError(exitErr).Code)

	result, err := pgEventStore2.ReadStreamFromLastSnapshot(ctx, streamId, 0)
	require.NoError(err)
	require.NotNil(result)
}

// Test that if there is a gap in miniblocks sequence, we will get error
func TestGetStreamFromLastSnapshotConsistencyChecksMissingBlockFailure(t *testing.T) {
	require := require.New(t)
	ctx, pgEventStore, testParams := setupTest()
	defer testParams.closer()

	streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	genesisMiniblock := []byte("genesisMiniblock")
	_ = pgEventStore.CreateStreamStorage(ctx, streamId, genesisMiniblock)
	var testEnvelopes1 [][]byte
	testEnvelopes1 = append(testEnvelopes1, []byte("event1"))
	var testEnvelopes2 [][]byte
	testEnvelopes2 = append(testEnvelopes2, []byte("event2"))
	var testEnvelopes3 [][]byte
	testEnvelopes3 = append(testEnvelopes3, []byte("event3"))

	_ = pgEventStore.WriteBlockProposal(ctx, streamId, common.BytesToHash([]byte("blockhash1")), 1, []byte("block1"))
	_ = pgEventStore.PromoteBlock(ctx, streamId, 1, common.BytesToHash([]byte("blockhash1")), true, testEnvelopes1)

	_ = pgEventStore.WriteBlockProposal(ctx, streamId, common.BytesToHash([]byte("blockhash2")), 2, []byte("block2"))
	_ = pgEventStore.PromoteBlock(ctx, streamId, 2, common.BytesToHash([]byte("blockhash2")), false, testEnvelopes2)

	_ = pgEventStore.WriteBlockProposal(ctx, streamId, common.BytesToHash([]byte("blockhash3")), 3, []byte("block3"))
	_ = pgEventStore.PromoteBlock(ctx, streamId, 3, common.BytesToHash([]byte("blockhash3")), false, testEnvelopes3)

	_, _ = pgEventStore.pool.Exec(ctx, "DELETE FROM miniblocks WHERE seq_num = 2")

	_, err := pgEventStore.ReadStreamFromLastSnapshot(ctx, streamId, 0)

	require.NotNil(err)
	require.Contains(err.Error(), "Miniblocks consistency violation - wrong block sequence number")
	require.Equal(AsRiverError(err).GetTag("ActualSeqNum"), int64(3))
	require.Equal(AsRiverError(err).GetTag("ExpectedSeqNum"), int64(2))
}

func TestGetStreamFromLastSnapshotConsistencyCheckWrongEnvelopeGeneration(t *testing.T) {
	require := require.New(t)
	ctx, pgEventStore, testParams := setupTest()
	defer testParams.closer()

	streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	genesisMiniblock := []byte("genesisMiniblock")
	_ = pgEventStore.CreateStreamStorage(ctx, streamId, genesisMiniblock)

	var testEnvelopes1 [][]byte
	testEnvelopes1 = append(testEnvelopes1, []byte("event1"))

	var testEnvelopes2 [][]byte
	testEnvelopes2 = append(testEnvelopes2, []byte("event2"))
	testEnvelopes2 = append(testEnvelopes2, []byte("event3"))

	_ = pgEventStore.WriteBlockProposal(ctx, streamId, common.BytesToHash([]byte("blockhash1")), 1, []byte("block1"))
	_ = pgEventStore.PromoteBlock(ctx, streamId, 1, common.BytesToHash([]byte("blockhash1")), true, testEnvelopes1)
	_ = pgEventStore.WriteBlockProposal(ctx, streamId, common.BytesToHash([]byte("blockhash2")), 2, []byte("block2"))
	_ = pgEventStore.PromoteBlock(ctx, streamId, 2, common.BytesToHash([]byte("blockhash2")), false, testEnvelopes2)

	_, _ = pgEventStore.pool.Exec(ctx, "UPDATE minipools SET generation = 777 WHERE slot_num = 1")

	_, err := pgEventStore.ReadStreamFromLastSnapshot(ctx, streamId, 0)

	require.NotNil(err)
	require.Contains(err.Error(), "Minipool consistency violation - wrong event generation")
	require.Equal(AsRiverError(err).GetTag("ActualGeneration"), int64(777))
	require.Equal(AsRiverError(err).GetTag("ExpectedGeneration"), int64(1))
}

func TestGetStreamFromLastSnapshotConsistencyCheckNoZeroIndexEnvelope(t *testing.T) {
	require := require.New(t)
	ctx, pgEventStore, testParams := setupTest()
	defer testParams.closer()

	streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	genesisMiniblock := []byte("genesisMiniblock")
	_ = pgEventStore.CreateStreamStorage(ctx, streamId, genesisMiniblock)

	var testEnvelopes1 [][]byte
	testEnvelopes1 = append(testEnvelopes1, []byte("event1"))

	var testEnvelopes2 [][]byte
	testEnvelopes2 = append(testEnvelopes2, []byte("event2"))
	testEnvelopes2 = append(testEnvelopes2, []byte("event3"))
	testEnvelopes2 = append(testEnvelopes2, []byte("event4"))

	_ = pgEventStore.WriteBlockProposal(ctx, streamId, common.BytesToHash([]byte("blockhash1")), 1, []byte("block1"))
	_ = pgEventStore.PromoteBlock(ctx, streamId, 1, common.BytesToHash([]byte("blockhash1")), true, testEnvelopes1)
	_ = pgEventStore.WriteBlockProposal(ctx, streamId, common.BytesToHash([]byte("blockhash2")), 2, []byte("block2"))
	_ = pgEventStore.PromoteBlock(ctx, streamId, 2, common.BytesToHash([]byte("blockhash2")), false, testEnvelopes2)

	_, _ = pgEventStore.pool.Exec(ctx, "DELETE FROM minipools WHERE slot_num = 0")

	_, err := pgEventStore.ReadStreamFromLastSnapshot(ctx, streamId, 0)

	require.NotNil(err)
	require.Contains(err.Error(), "Minipool consistency violation - slotNums are not sequential")
	require.Equal(AsRiverError(err).GetTag("ActualSlotNumber"), int64(1))
	require.Equal(AsRiverError(err).GetTag("ExpectedSlotNumber"), int64(0))
}

func TestGetStreamFromLastSnapshotConsistencyCheckGapInEnvelopesIndexes(t *testing.T) {
	require := require.New(t)
	ctx, pgEventStore, testParams := setupTest()
	defer testParams.closer()

	streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	genesisMiniblock := []byte("genesisMiniblock")
	_ = pgEventStore.CreateStreamStorage(ctx, streamId, genesisMiniblock)

	var testEnvelopes1 [][]byte
	testEnvelopes1 = append(testEnvelopes1, []byte("event1"))

	var testEnvelopes2 [][]byte
	testEnvelopes2 = append(testEnvelopes2, []byte("event2"))
	testEnvelopes2 = append(testEnvelopes2, []byte("event3"))
	testEnvelopes2 = append(testEnvelopes2, []byte("event4"))

	_ = pgEventStore.WriteBlockProposal(ctx, streamId, common.BytesToHash([]byte("blockhash1")), 1, []byte("block1"))
	_ = pgEventStore.PromoteBlock(ctx, streamId, 1, common.BytesToHash([]byte("blockhash1")), true, testEnvelopes1)
	_ = pgEventStore.WriteBlockProposal(ctx, streamId, common.BytesToHash([]byte("blockhash2")), 2, []byte("block2"))
	_ = pgEventStore.PromoteBlock(ctx, streamId, 2, common.BytesToHash([]byte("blockhash2")), false, testEnvelopes2)

	_, _ = pgEventStore.pool.Exec(ctx, "DELETE FROM minipools WHERE slot_num = 1")

	_, err := pgEventStore.ReadStreamFromLastSnapshot(ctx, streamId, 0)

	require.NotNil(err)
	require.Contains(err.Error(), "Minipool consistency violation - slotNums are not sequential")
	require.Equal(AsRiverError(err).GetTag("ActualSlotNumber"), int64(2))
	require.Equal(AsRiverError(err).GetTag("ExpectedSlotNumber"), int64(1))
}

func TestGetMiniblocksConsistencyChecks(t *testing.T) {
	require := require.New(t)
	ctx, pgEventStore, testParams := setupTest()
	defer testParams.closer()

	streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	genesisMiniblock := []byte("genesisMiniblock")
	_ = pgEventStore.CreateStreamStorage(ctx, streamId, genesisMiniblock)

	var testEnvelopes1 [][]byte
	testEnvelopes1 = append(testEnvelopes1, []byte("event1"))
	var testEnvelopes2 [][]byte
	testEnvelopes2 = append(testEnvelopes2, []byte("event2"))
	var testEnvelopes3 [][]byte
	testEnvelopes3 = append(testEnvelopes3, []byte("event3"))

	_ = pgEventStore.WriteBlockProposal(ctx, streamId, common.BytesToHash([]byte("blockhash1")), 1, []byte("block1"))
	_ = pgEventStore.PromoteBlock(ctx, streamId, 1, common.BytesToHash([]byte("blockhash1")), true, testEnvelopes1)
	_ = pgEventStore.WriteBlockProposal(ctx, streamId, common.BytesToHash([]byte("blockhash2")), 2, []byte("block2"))
	_ = pgEventStore.PromoteBlock(ctx, streamId, 2, common.BytesToHash([]byte("blockhash2")), false, testEnvelopes2)
	_ = pgEventStore.WriteBlockProposal(ctx, streamId, common.BytesToHash([]byte("blockhash3")), 3, []byte("block3"))
	_ = pgEventStore.PromoteBlock(ctx, streamId, 3, common.BytesToHash([]byte("blockhash3")), false, testEnvelopes3)

	_, _ = pgEventStore.pool.Exec(ctx, "DELETE FROM miniblocks WHERE seq_num = 2")

	_, err := pgEventStore.ReadMiniblocks(ctx, streamId, 1, 4)

	require.NotNil(err)
	require.Contains(err.Error(), "Miniblocks consistency violation")
	require.Equal(AsRiverError(err).GetTag("ActualBlockNumber"), 3)
	require.Equal(AsRiverError(err).GetTag("ExpectedBlockNumber"), 2)
}

func TestAlreadyExists(t *testing.T) {
	require := require.New(t)
	ctx, pgEventStore, testParams := setupTest()
	defer testParams.closer()

	streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	genesisMiniblock := []byte("genesisMiniblock")
	err := pgEventStore.CreateStreamStorage(ctx, streamId, genesisMiniblock)
	require.NoError(err)

	err = pgEventStore.CreateStreamStorage(ctx, streamId, genesisMiniblock)
	require.Equal(Err_ALREADY_EXISTS, AsRiverError(err).Code)
}

func TestNotFound(t *testing.T) {
	require := require.New(t)
	ctx, pgEventStore, testParams := setupTest()
	defer testParams.closer()

	streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	result, err := pgEventStore.ReadStreamFromLastSnapshot(ctx, streamId, 0)
	require.Nil(result)
	require.Equal(Err_NOT_FOUND, AsRiverError(err).Code)
}
