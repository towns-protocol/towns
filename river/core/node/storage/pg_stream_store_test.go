package storage

import (
	"context"
	"reflect"
	"strings"
	"testing"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/stretchr/testify/require"
	"golang.org/x/exp/rand"

	"github.com/river-build/river/core/config"
	. "github.com/river-build/river/core/node/base"
	"github.com/river-build/river/core/node/base/test"
	"github.com/river-build/river/core/node/infra"
	. "github.com/river-build/river/core/node/protocol"
	. "github.com/river-build/river/core/node/shared"
	"github.com/river-build/river/core/node/testutils"
	"github.com/river-build/river/core/node/testutils/dbtestutils"
)

type testStreamStoreParams struct {
	schema     string
	config     *config.DatabaseConfig
	closer     func()
	exitSignal chan error
}

func setupStreamStorageTest() (context.Context, *PostgresStreamStore, *testStreamStoreParams) {
	ctx, ctxCloser := test.NewTestContext()

	dbCfg, dbSchemaName, dbCloser, err := dbtestutils.ConfigureDB(ctx)
	if err != nil {
		panic(err)
	}

	dbCfg.StartupDelay = 2 * time.Millisecond
	dbCfg.Extra = strings.Replace(dbCfg.Extra, "pool_max_conns=1000", "pool_max_conns=10", 1)

	pool, err := CreateAndValidatePgxPool(
		ctx,
		dbCfg,
		dbSchemaName,
		nil,
	)
	if err != nil {
		panic(err)
	}

	instanceId := GenShortNanoid()
	exitSignal := make(chan error, 1)
	store, err := NewPostgresStreamStore(
		ctx,
		pool,
		instanceId,
		exitSignal,
		infra.NewMetricsFactory(nil, "", ""),
	)
	if err != nil {
		panic(err)
	}

	params := &testStreamStoreParams{
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

func TestSqlForStream(t *testing.T) {
	streamIdString := "20864dd5d959460eec194e629507ab14403e86877549f4a5d6b3eb728adf75d1"
	streamId := testutils.StreamIdFromString(streamIdString)
	suffix := createTableSuffix(streamId)

	// Sanity check
	require.Equal(t, "80a8e1d562992f654ab5d6fd57bb1a545f12dadb6500c87fa02a897a", suffix)

	tests := map[string]struct {
		template string
		expected string
	}{
		"simple example": {
			template: "SELECT COALESCE(MAX(seq_num), -1) FROM {{miniblocks}} WHERE stream_id = $1",
			expected: "SELECT COALESCE(MAX(seq_num), -1) FROM miniblocks_80a8e1d562992f654ab5d6fd57bb1a545f12dadb6500c87fa02a897a WHERE stream_id = $1",
		},
		"table name is a substring within other ranges of the query": {
			template: `INSERT INTO es (stream_id, latest_snapshot_miniblock) VALUES ($1, -1);
			CREATE TABLE {{miniblocks}} PARTITION OF miniblocks FOR VALUES IN ($1);`,
			expected: `INSERT INTO es (stream_id, latest_snapshot_miniblock) VALUES ($1, -1);
			CREATE TABLE miniblocks_80a8e1d562992f654ab5d6fd57bb1a545f12dadb6500c87fa02a897a PARTITION OF miniblocks FOR VALUES IN ($1);`,
		},
		"query containing non-templated references to table names": {
			template: `select * from INSERT INTO es (stream_id, latest_snapshot_miniblock) VALUES ($1, 0);
			CREATE TABLE {{miniblocks}} PARTITION OF miniblocks FOR VALUES IN ($1);
			CREATE TABLE {{minipools}} PARTITION OF minipools FOR VALUES IN ($1);
			CREATE TABLE {{miniblock_candidates}} PARTITION OF miniblock_candidates for values in ($1);
			INSERT INTO {{miniblocks}} (stream_id, seq_num, blockdata) VALUES ($1, 0, $2);
			INSERT INTO {{minipools}} (stream_id, generation, slot_num) VALUES ($1, 1, -1);`,
			expected: `select * from INSERT INTO es (stream_id, latest_snapshot_miniblock) VALUES ($1, 0);
			CREATE TABLE miniblocks_80a8e1d562992f654ab5d6fd57bb1a545f12dadb6500c87fa02a897a PARTITION OF miniblocks FOR VALUES IN ($1);
			CREATE TABLE minipools_80a8e1d562992f654ab5d6fd57bb1a545f12dadb6500c87fa02a897a PARTITION OF minipools FOR VALUES IN ($1);
			CREATE TABLE miniblock_candidates_80a8e1d562992f654ab5d6fd57bb1a545f12dadb6500c87fa02a897a PARTITION OF miniblock_candidates for values in ($1);
			INSERT INTO miniblocks_80a8e1d562992f654ab5d6fd57bb1a545f12dadb6500c87fa02a897a (stream_id, seq_num, blockdata) VALUES ($1, 0, $2);
			INSERT INTO minipools_80a8e1d562992f654ab5d6fd57bb1a545f12dadb6500c87fa02a897a (stream_id, generation, slot_num) VALUES ($1, 1, -1);`,
		},
	}

	for name, tc := range tests {
		t.Run(name, func(t *testing.T) {
			sql := sqlForStream(tc.template, streamId)
			require.Equal(t, tc.expected, sql)
		})
	}
}

func promoteMiniblockCandidate(
	ctx context.Context,
	pgStreamStore *PostgresStreamStore,
	streamId StreamId,
	mbNum int64,
	candidateBlockHash common.Hash,
	snapshotMiniblock bool,
	envelopes [][]byte,
) error {
	mbData, err := pgStreamStore.ReadMiniblockCandidate(ctx, streamId, candidateBlockHash, mbNum)
	if err != nil {
		return err
	}
	return pgStreamStore.WriteMiniblocks(
		ctx,
		streamId,
		[]*WriteMiniblockData{{
			Number:   mbNum,
			Hash:     candidateBlockHash,
			Snapshot: snapshotMiniblock,
			Data:     mbData,
		}},
		mbNum+1,
		envelopes,
		mbNum,
		-1,
	)
}

func TestPostgresStreamStore(t *testing.T) {
	require := require.New(t)

	ctx, pgStreamStore, testParams := setupStreamStorageTest()
	defer testParams.closer()

	streamsNumber, err := pgStreamStore.GetStreamsNumber(ctx)
	require.NoError(err)
	require.Equal(0, streamsNumber)

	streamId1 := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	streamId2 := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	streamId3 := testutils.FakeStreamId(STREAM_CHANNEL_BIN)

	// Test that created stream will have proper genesis miniblock
	genesisMiniblock := []byte("genesisMiniblock")
	err = pgStreamStore.CreateStreamStorage(ctx, streamId1, genesisMiniblock)
	require.NoError(err)

	streamsNumber, err = pgStreamStore.GetStreamsNumber(ctx)
	require.NoError(err)
	require.Equal(1, streamsNumber)

	streamFromLastSnaphot, streamRetrievalError := pgStreamStore.ReadStreamFromLastSnapshot(ctx, streamId1, 0)

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
	err = pgStreamStore.CreateStreamStorage(ctx, streamId1, genesisMiniblock2)
	if err == nil {
		t.Fatal(err)
	}

	// Test that we can add second stream and then GetStreams will return both
	err = pgStreamStore.CreateStreamStorage(ctx, streamId2, genesisMiniblock2)
	if err != nil {
		t.Fatal(err)
	}

	streams, err := pgStreamStore.GetStreams(ctx)
	require.NoError(err)
	require.ElementsMatch(streams, []StreamId{streamId1, streamId2})

	// Test that we can delete stream and proper stream will be deleted
	genesisMiniblock3 := []byte("genesisMiniblock3")
	err = pgStreamStore.CreateStreamStorage(ctx, streamId3, genesisMiniblock3)
	if err != nil {
		t.Fatal(err)
	}

	err = pgStreamStore.DeleteStream(ctx, streamId2)
	if err != nil {
		t.Fatal("Error of deleting stream", err)
	}

	streams, err = pgStreamStore.GetStreams(ctx)
	require.NoError(err)
	require.ElementsMatch(streams, []StreamId{streamId1, streamId3})

	// Test that we can add event to stream and then retrieve it
	addEventError := pgStreamStore.WriteEvent(ctx, streamId1, 1, 0, []byte("event1"))

	if addEventError != nil {
		t.Fatal(streamRetrievalError)
	}

	streamFromLastSnaphot, streamRetrievalError = pgStreamStore.ReadStreamFromLastSnapshot(ctx, streamId1, 0)

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
	blockData := []byte("block1")
	err = pgStreamStore.WriteMiniblockCandidate(ctx, streamId1, blockHash, 1, blockData)
	if err != nil {
		t.Fatal("error creating block candidate")
	}
	mbBytes, err := pgStreamStore.ReadMiniblockCandidate(ctx, streamId1, blockHash, 1)
	require.NoError(err)
	require.EqualValues(blockData, mbBytes)
	err = promoteMiniblockCandidate(ctx, pgStreamStore, streamId1, 1, blockHash, false, testEnvelopes)
	if err != nil {
		t.Fatal("error promoting block", err)
	}

	var testEnvelopes2 [][]byte
	testEnvelopes2 = append(testEnvelopes2, []byte("event3"))
	blockHash2 := common.BytesToHash([]byte("block_hash_2"))
	err = pgStreamStore.WriteMiniblockCandidate(ctx, streamId1, blockHash2, 2, []byte("block2"))
	if err != nil {
		t.Fatal("error creating block proposal with snapshot", err)
	}

	err = promoteMiniblockCandidate(ctx, pgStreamStore, streamId1, 2, blockHash2, true, testEnvelopes2)
	if err != nil {
		t.Fatal("error promoting block with snapshot", err)
	}
}

func TestPromoteMiniblockCandidate(t *testing.T) {
	ctx, pgStreamStore, testParams := setupStreamStorageTest()
	defer testParams.closer()
	require := require.New(t)

	streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	streamId2 := testutils.FakeStreamId(STREAM_CHANNEL_BIN)

	prepareTestDataForAddEventConsistencyCheck(ctx, pgStreamStore, streamId)

	candidateHash := common.BytesToHash([]byte("block_hash"))
	candidateHash2 := common.BytesToHash([]byte("block_hash_2"))
	candidateHash_block2 := common.BytesToHash([]byte("block_hash_block2"))
	miniblock_bytes := []byte("miniblock_bytes")

	// Miniblock candidate seq number must be at least current
	err := pgStreamStore.WriteMiniblockCandidate(ctx, streamId, candidateHash, 0, miniblock_bytes)
	require.ErrorContains(err, "Miniblock proposal blockNumber mismatch")
	require.Equal(AsRiverError(err).GetTag("ExpectedBlockNumber"), int64(1))
	require.Equal(AsRiverError(err).GetTag("ActualBlockNumber"), int64(0))

	// Future candidates fine
	err = pgStreamStore.WriteMiniblockCandidate(ctx, streamId, candidateHash_block2, 2, miniblock_bytes)
	require.NoError(err)

	// Write two candidates for this block number
	err = pgStreamStore.WriteMiniblockCandidate(ctx, streamId, candidateHash, 1, miniblock_bytes)
	require.NoError(err)

	// Double write with the same hash should produce no errors, it's possible multiple nodes may propose the same candidate.
	err = pgStreamStore.WriteMiniblockCandidate(ctx, streamId, candidateHash, 1, miniblock_bytes)
	require.NoError(err)

	err = pgStreamStore.WriteMiniblockCandidate(ctx, streamId, candidateHash2, 1, miniblock_bytes)
	require.NoError(err)

	// Add candidate from another stream. This candidate should be untouched by the delete when a
	// candidate from the first stream is promoted.
	genesisMiniblock := []byte("genesisMiniblock")
	_ = pgStreamStore.CreateStreamStorage(ctx, streamId2, genesisMiniblock)
	err = pgStreamStore.WriteMiniblockCandidate(ctx, streamId2, candidateHash, 1, []byte("some bytes"))
	require.NoError(err)

	var testEnvelopes [][]byte
	testEnvelopes = append(testEnvelopes, []byte("event1"))
	testEnvelopes = append(testEnvelopes, []byte("event2"))

	// Nonexistent hash promotion fails
	err = promoteMiniblockCandidate(
		ctx,
		pgStreamStore,
		streamId,
		1,
		common.BytesToHash([]byte("nonexistent_hash")),
		false,
		testEnvelopes,
	)
	require.Error(err)
	require.Equal(Err_NOT_FOUND, AsRiverError(err).Code)

	// Stream 1 promotion succeeds.
	err = promoteMiniblockCandidate(
		ctx,
		pgStreamStore,
		streamId,
		1,
		candidateHash,
		false,
		testEnvelopes,
	)
	require.NoError(err)

	// Stream 1 able to promote candidate block from round 2 - candidate unaffected by delete at round 1 promotion.
	err = promoteMiniblockCandidate(
		ctx,
		pgStreamStore,
		streamId,
		2,
		candidateHash_block2,
		false,
		testEnvelopes,
	)
	require.NoError(err)

	// Stream 2 should be unaffected by stream 1 promotion, which deletes all candidates for stream 1 only.
	err = promoteMiniblockCandidate(
		ctx,
		pgStreamStore,
		streamId2,
		1,
		candidateHash,
		false,
		testEnvelopes,
	)
	require.NoError(err)
}

func prepareTestDataForAddEventConsistencyCheck(ctx context.Context, s *PostgresStreamStore, streamId StreamId) {
	genesisMiniblock := []byte("genesisMiniblock")
	_ = s.CreateStreamStorage(ctx, streamId, genesisMiniblock)
	_ = s.WriteEvent(ctx, streamId, 1, 0, []byte("event1"))
	_ = s.WriteEvent(ctx, streamId, 1, 1, []byte("event2"))
	_ = s.WriteEvent(ctx, streamId, 1, 2, []byte("event3"))
}

// Test that if there is an event with wrong generation in minipool, we will get error
func TestAddEventConsistencyChecksImproperGeneration(t *testing.T) {
	require := require.New(t)
	ctx, pgStreamStore, testParams := setupStreamStorageTest()
	defer testParams.closer()

	streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)

	prepareTestDataForAddEventConsistencyCheck(ctx, pgStreamStore, streamId)

	// Corrupt record in minipool
	_, _ = pgStreamStore.pool.Exec(ctx, "UPDATE minipools SET generation = 777 WHERE slot_num = 1")
	err := pgStreamStore.WriteEvent(ctx, streamId, 1, 3, []byte("event4"))

	require.NotNil(err)
	require.Contains(err.Error(), "Wrong slot number in minipool")
	require.Equal(AsRiverError(err).GetTag("ActualSlotNumber"), 2)
	require.Equal(AsRiverError(err).GetTag("ExpectedSlotNumber"), 1)
}

// Test that if there is a gap in minipool records, we will get error
func TestAddEventConsistencyChecksGaps(t *testing.T) {
	require := require.New(t)
	ctx, pgStreamStore, testParams := setupStreamStorageTest()
	defer testParams.closer()

	streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)

	prepareTestDataForAddEventConsistencyCheck(ctx, pgStreamStore, streamId)

	// Corrupt record in minipool
	_, _ = pgStreamStore.pool.Exec(ctx, "DELETE FROM minipools WHERE slot_num = 1")
	err := pgStreamStore.WriteEvent(ctx, streamId, 1, 3, []byte("event4"))

	require.NotNil(err)
	require.Contains(err.Error(), "Wrong slot number in minipool")
	require.Equal(AsRiverError(err).GetTag("ActualSlotNumber"), 2)
	require.Equal(AsRiverError(err).GetTag("ExpectedSlotNumber"), 1)
}

// Test that if there is a wrong number minipool records, we will get error
func TestAddEventConsistencyChecksEventsNumberMismatch(t *testing.T) {
	require := require.New(t)
	ctx, pgStreamStore, testParams := setupStreamStorageTest()
	defer testParams.closer()

	streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)

	prepareTestDataForAddEventConsistencyCheck(ctx, pgStreamStore, streamId)

	// Corrupt record in minipool
	_, _ = pgStreamStore.pool.Exec(ctx, "DELETE FROM minipools WHERE slot_num = 2")
	err := pgStreamStore.WriteEvent(ctx, streamId, 1, 3, []byte("event4"))

	require.NotNil(err)
	require.Contains(err.Error(), "Wrong number of records in minipool")
	require.Equal(AsRiverError(err).GetTag("ActualRecordsNumber"), 2)
	require.Equal(AsRiverError(err).GetTag("ExpectedRecordsNumber"), 3)
}

func TestNoStream(t *testing.T) {
	require := require.New(t)
	ctx, pgStreamStore, testParams := setupStreamStorageTest()
	defer testParams.closer()

	res, err := pgStreamStore.ReadStreamFromLastSnapshot(ctx, testutils.FakeStreamId(STREAM_CHANNEL_BIN), 0)
	require.Nil(res)
	require.Error(err)
	require.Equal(Err_NOT_FOUND, AsRiverError(err).Code, err)
}

func TestCreateBlockProposalConsistencyChecksProperNewMinipoolGeneration(t *testing.T) {
	require := require.New(t)
	ctx, pgStreamStore, testParams := setupStreamStorageTest()
	defer testParams.closer()

	streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	genesisMiniblock := []byte("genesisMiniblock")
	_ = pgStreamStore.CreateStreamStorage(ctx, streamId, genesisMiniblock)

	var testEnvelopes1 [][]byte
	testEnvelopes1 = append(testEnvelopes1, []byte("event1"))
	var testEnvelopes2 [][]byte
	testEnvelopes2 = append(testEnvelopes2, []byte("event2"))

	blockHash1 := common.BytesToHash([]byte("hash1"))
	blockHash2 := common.BytesToHash([]byte("hash2"))
	blockHash3 := common.BytesToHash([]byte("hash3"))
	_ = pgStreamStore.WriteMiniblockCandidate(ctx, streamId, blockHash1, 1, []byte("block1"))
	_ = promoteMiniblockCandidate(ctx, pgStreamStore, streamId, 1, blockHash1, true, testEnvelopes1)

	_ = pgStreamStore.WriteMiniblockCandidate(ctx, streamId, blockHash2, 2, []byte("block2"))
	_ = promoteMiniblockCandidate(ctx, pgStreamStore, streamId, 2, blockHash2, false, testEnvelopes2)

	_, _ = pgStreamStore.pool.Exec(ctx, "DELETE FROM miniblocks WHERE seq_num = 2")

	// Future candidate writes are fine, these may come from other nodes.
	err := pgStreamStore.WriteMiniblockCandidate(ctx, streamId, blockHash3, 3, []byte("block3"))
	require.Nil(err)
}

func TestPromoteBlockConsistencyChecksProperNewMinipoolGeneration(t *testing.T) {
	ctx, pgStreamStore, testParams := setupStreamStorageTest()
	defer testParams.closer()

	require := require.New(t)

	streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	genesisMiniblock := []byte("genesisMiniblock")
	_ = pgStreamStore.CreateStreamStorage(ctx, streamId, genesisMiniblock)

	var testEnvelopes1 [][]byte
	testEnvelopes1 = append(testEnvelopes1, []byte("event1"))
	var testEnvelopes2 [][]byte
	testEnvelopes2 = append(testEnvelopes2, []byte("event2"))
	var testEnvelopes3 [][]byte
	testEnvelopes3 = append(testEnvelopes3, []byte("event3"))

	blockHash1 := common.BytesToHash([]byte("hash1"))
	blockHash2 := common.BytesToHash([]byte("hash2"))
	blockHash3 := common.BytesToHash([]byte("hash3"))
	_ = pgStreamStore.WriteMiniblockCandidate(ctx, streamId, blockHash1, 1, []byte("block1"))
	_ = promoteMiniblockCandidate(ctx, pgStreamStore, streamId, 1, blockHash1, true, testEnvelopes1)

	_ = pgStreamStore.WriteMiniblockCandidate(ctx, streamId, blockHash2, 2, []byte("block2"))
	_ = promoteMiniblockCandidate(ctx, pgStreamStore, streamId, 2, blockHash2, false, testEnvelopes2)

	_ = pgStreamStore.WriteMiniblockCandidate(ctx, streamId, blockHash3, 3, []byte("block3"))

	_, _ = pgStreamStore.pool.Exec(ctx, "DELETE FROM miniblocks WHERE seq_num = 2")
	err := promoteMiniblockCandidate(ctx, pgStreamStore, streamId, 3, blockHash3, false, testEnvelopes3)

	// TODO(crystal): tune these
	require.NotNil(err)
	require.Contains(err.Error(), "DB data consistency check failed: Previous minipool generation mismatch")
	require.Equal(AsRiverError(err).GetTag("lastMbInStorage"), int64(1))
	require.Equal(AsRiverError(err).GetTag("lastMiniblockNumber"), int64(3))
}

func TestCreateBlockProposalNoSuchStreamError(t *testing.T) {
	require := require.New(t)
	ctx, pgStreamStore, testParams := setupStreamStorageTest()
	defer testParams.closer()

	streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	genesisMiniblock := []byte("genesisMiniblock")
	_ = pgStreamStore.CreateStreamStorage(ctx, streamId, genesisMiniblock)

	_, _ = pgStreamStore.pool.Exec(ctx, "DELETE FROM miniblocks")

	err := pgStreamStore.WriteMiniblockCandidate(
		ctx,
		streamId,
		common.BytesToHash([]byte("block_hash")),
		1,
		[]byte("block1"),
	)

	require.NotNil(err)
	require.Contains(err.Error(), "No blocks for the stream found in block storage")
	require.Equal(AsRiverError(err).GetTag("streamId"), streamId)
}

func TestPromoteBlockNoSuchStreamError(t *testing.T) {
	ctx, pgStreamStore, testParams := setupStreamStorageTest()
	defer testParams.closer()

	require := require.New(t)

	streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	genesisMiniblock := []byte("genesisMiniblock")
	_ = pgStreamStore.CreateStreamStorage(ctx, streamId, genesisMiniblock)

	var testEnvelopes1 [][]byte
	testEnvelopes1 = append(testEnvelopes1, []byte("event1"))
	block_hash := common.BytesToHash([]byte("block_hash"))
	_ = pgStreamStore.WriteMiniblockCandidate(ctx, streamId, block_hash, 1, []byte("block1"))

	_, _ = pgStreamStore.pool.Exec(ctx, "DELETE FROM miniblocks")

	err := promoteMiniblockCandidate(ctx, pgStreamStore, streamId, 1, block_hash, true, testEnvelopes1)

	require.NotNil(err)
	require.Contains(err.Error(), "No blocks for the stream found in block storage")
	require.Equal(AsRiverError(err).GetTag("streamId"), streamId)
}

func TestExitIfSecondStorageCreated(t *testing.T) {
	require := require.New(t)

	ctx, pgStreamStore, testParams := setupStreamStorageTest()
	defer testParams.closer()

	// Give listener thread some time to start
	time.Sleep(500 * time.Millisecond)

	genesisMiniblock := []byte("genesisMiniblock")
	streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	err := pgStreamStore.CreateStreamStorage(ctx, streamId, genesisMiniblock)
	require.NoError(err)

	pool, err := CreateAndValidatePgxPool(
		ctx,
		testParams.config,
		testParams.schema,
		nil,
	)
	require.NoError(err)

	instanceId2 := GenShortNanoid()
	exitSignal2 := make(chan error, 1)
	pgStreamStore2, err := NewPostgresStreamStore(
		ctx,
		pool,
		instanceId2,
		exitSignal2,
		infra.NewMetricsFactory(nil, "", ""),
	)
	require.NoError(err)
	defer pgStreamStore2.Close(ctx)

	// Give listener thread for the first store some time to detect the notification and emit an error
	time.Sleep(500 * time.Millisecond)

	exitErr := <-testParams.exitSignal
	require.Error(exitErr)
	require.Equal(Err_RESOURCE_EXHAUSTED, AsRiverError(exitErr).Code)

	result, err := pgStreamStore2.ReadStreamFromLastSnapshot(ctx, streamId, 0)
	require.NoError(err)
	require.NotNil(result)
}

// Test that if there is a gap in miniblocks sequence, we will get error
func TestGetStreamFromLastSnapshotConsistencyChecksMissingBlockFailure(t *testing.T) {
	require := require.New(t)
	ctx, pgStreamStore, testParams := setupStreamStorageTest()
	defer testParams.closer()

	streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	genesisMiniblock := []byte("genesisMiniblock")
	_ = pgStreamStore.CreateStreamStorage(ctx, streamId, genesisMiniblock)
	var testEnvelopes1 [][]byte
	testEnvelopes1 = append(testEnvelopes1, []byte("event1"))
	var testEnvelopes2 [][]byte
	testEnvelopes2 = append(testEnvelopes2, []byte("event2"))
	var testEnvelopes3 [][]byte
	testEnvelopes3 = append(testEnvelopes3, []byte("event3"))

	_ = pgStreamStore.WriteMiniblockCandidate(
		ctx,
		streamId,
		common.BytesToHash([]byte("blockhash1")),
		1,
		[]byte("block1"),
	)
	_ = promoteMiniblockCandidate(
		ctx,
		pgStreamStore,
		streamId,
		1,
		common.BytesToHash([]byte("blockhash1")),
		true,
		testEnvelopes1,
	)

	_ = pgStreamStore.WriteMiniblockCandidate(
		ctx,
		streamId,
		common.BytesToHash([]byte("blockhash2")),
		2,
		[]byte("block2"),
	)
	_ = promoteMiniblockCandidate(
		ctx,
		pgStreamStore,
		streamId,
		2,
		common.BytesToHash([]byte("blockhash2")),
		false,
		testEnvelopes2,
	)

	_ = pgStreamStore.WriteMiniblockCandidate(
		ctx,
		streamId,
		common.BytesToHash([]byte("blockhash3")),
		3,
		[]byte("block3"),
	)
	_ = promoteMiniblockCandidate(
		ctx,
		pgStreamStore,
		streamId,
		3,
		common.BytesToHash([]byte("blockhash3")),
		false,
		testEnvelopes3,
	)

	_, _ = pgStreamStore.pool.Exec(ctx, "DELETE FROM miniblocks WHERE seq_num = 2")

	_, err := pgStreamStore.ReadStreamFromLastSnapshot(ctx, streamId, 0)

	require.NotNil(err)
	require.EqualValues(Err_INTERNAL, AsRiverError(err).Code)
	require.Equal(AsRiverError(err).GetTag("ActualSeqNum"), int64(3))
	require.Equal(AsRiverError(err).GetTag("ExpectedSeqNum"), int64(2))
}

func TestGetStreamFromLastSnapshotConsistencyCheckWrongEnvelopeGeneration(t *testing.T) {
	require := require.New(t)
	ctx, pgStreamStore, testParams := setupStreamStorageTest()
	defer testParams.closer()

	streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	genesisMiniblock := []byte("genesisMiniblock")
	_ = pgStreamStore.CreateStreamStorage(ctx, streamId, genesisMiniblock)

	var testEnvelopes1 [][]byte
	testEnvelopes1 = append(testEnvelopes1, []byte("event1"))

	var testEnvelopes2 [][]byte
	testEnvelopes2 = append(testEnvelopes2, []byte("event2"))
	testEnvelopes2 = append(testEnvelopes2, []byte("event3"))

	_ = pgStreamStore.WriteMiniblockCandidate(
		ctx,
		streamId,
		common.BytesToHash([]byte("blockhash1")),
		1,
		[]byte("block1"),
	)
	_ = promoteMiniblockCandidate(
		ctx,
		pgStreamStore,
		streamId,
		1,
		common.BytesToHash([]byte("blockhash1")),
		true,
		testEnvelopes1,
	)
	_ = pgStreamStore.WriteMiniblockCandidate(
		ctx,
		streamId,
		common.BytesToHash([]byte("blockhash2")),
		2,
		[]byte("block2"),
	)
	_ = promoteMiniblockCandidate(
		ctx,
		pgStreamStore,
		streamId,
		2,
		common.BytesToHash([]byte("blockhash2")),
		false,
		testEnvelopes2,
	)

	_, _ = pgStreamStore.pool.Exec(ctx, "UPDATE minipools SET generation = 777 WHERE slot_num = 1")

	_, err := pgStreamStore.ReadStreamFromLastSnapshot(ctx, streamId, 0)

	require.NotNil(err)
	require.EqualValues(Err_MINIBLOCKS_STORAGE_FAILURE, AsRiverError(err).Code)
}

func TestGetStreamFromLastSnapshotConsistencyCheckNoZeroIndexEnvelope(t *testing.T) {
	require := require.New(t)
	ctx, pgStreamStore, testParams := setupStreamStorageTest()
	defer testParams.closer()

	streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	genesisMiniblock := []byte("genesisMiniblock")
	_ = pgStreamStore.CreateStreamStorage(ctx, streamId, genesisMiniblock)

	var testEnvelopes1 [][]byte
	testEnvelopes1 = append(testEnvelopes1, []byte("event1"))

	var testEnvelopes2 [][]byte
	testEnvelopes2 = append(testEnvelopes2, []byte("event2"))
	testEnvelopes2 = append(testEnvelopes2, []byte("event3"))
	testEnvelopes2 = append(testEnvelopes2, []byte("event4"))

	_ = pgStreamStore.WriteMiniblockCandidate(
		ctx,
		streamId,
		common.BytesToHash([]byte("blockhash1")),
		1,
		[]byte("block1"),
	)
	_ = promoteMiniblockCandidate(
		ctx,
		pgStreamStore,
		streamId,
		1,
		common.BytesToHash([]byte("blockhash1")),
		true,
		testEnvelopes1,
	)
	_ = pgStreamStore.WriteMiniblockCandidate(
		ctx,
		streamId,
		common.BytesToHash([]byte("blockhash2")),
		2,
		[]byte("block2"),
	)
	_ = promoteMiniblockCandidate(
		ctx,
		pgStreamStore,
		streamId,
		2,
		common.BytesToHash([]byte("blockhash2")),
		false,
		testEnvelopes2,
	)

	_, _ = pgStreamStore.pool.Exec(ctx, "DELETE FROM minipools WHERE slot_num = 0")

	_, err := pgStreamStore.ReadStreamFromLastSnapshot(ctx, streamId, 0)

	require.NotNil(err)
	require.Contains(err.Error(), "Minipool consistency violation - slotNums are not sequential")
}

func TestGetStreamFromLastSnapshotConsistencyCheckGapInEnvelopesIndexes(t *testing.T) {
	require := require.New(t)
	ctx, pgStreamStore, testParams := setupStreamStorageTest()
	defer testParams.closer()

	streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	genesisMiniblock := []byte("genesisMiniblock")
	_ = pgStreamStore.CreateStreamStorage(ctx, streamId, genesisMiniblock)

	var testEnvelopes1 [][]byte
	testEnvelopes1 = append(testEnvelopes1, []byte("event1"))

	var testEnvelopes2 [][]byte
	testEnvelopes2 = append(testEnvelopes2, []byte("event2"))
	testEnvelopes2 = append(testEnvelopes2, []byte("event3"))
	testEnvelopes2 = append(testEnvelopes2, []byte("event4"))

	_ = pgStreamStore.WriteMiniblockCandidate(
		ctx,
		streamId,
		common.BytesToHash([]byte("blockhash1")),
		1,
		[]byte("block1"),
	)
	_ = promoteMiniblockCandidate(
		ctx,
		pgStreamStore,
		streamId,
		1,
		common.BytesToHash([]byte("blockhash1")),
		true,
		testEnvelopes1,
	)
	_ = pgStreamStore.WriteMiniblockCandidate(
		ctx,
		streamId,
		common.BytesToHash([]byte("blockhash2")),
		2,
		[]byte("block2"),
	)
	_ = promoteMiniblockCandidate(
		ctx,
		pgStreamStore,
		streamId,
		2,
		common.BytesToHash([]byte("blockhash2")),
		false,
		testEnvelopes2,
	)

	_, _ = pgStreamStore.pool.Exec(ctx, "DELETE FROM minipools WHERE slot_num = 1")

	_, err := pgStreamStore.ReadStreamFromLastSnapshot(ctx, streamId, 0)

	require.NotNil(err)
	require.EqualValues(Err_MINIBLOCKS_STORAGE_FAILURE, AsRiverError(err).Code)
}

func TestGetMiniblocksConsistencyChecks(t *testing.T) {
	require := require.New(t)
	ctx, pgStreamStore, testParams := setupStreamStorageTest()
	defer testParams.closer()

	streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	genesisMiniblock := []byte("genesisMiniblock")
	_ = pgStreamStore.CreateStreamStorage(ctx, streamId, genesisMiniblock)

	var testEnvelopes1 [][]byte
	testEnvelopes1 = append(testEnvelopes1, []byte("event1"))
	var testEnvelopes2 [][]byte
	testEnvelopes2 = append(testEnvelopes2, []byte("event2"))
	var testEnvelopes3 [][]byte
	testEnvelopes3 = append(testEnvelopes3, []byte("event3"))

	_ = pgStreamStore.WriteMiniblockCandidate(
		ctx,
		streamId,
		common.BytesToHash([]byte("blockhash1")),
		1,
		[]byte("block1"),
	)
	_ = promoteMiniblockCandidate(
		ctx,
		pgStreamStore,
		streamId,
		1,
		common.BytesToHash([]byte("blockhash1")),
		true,
		testEnvelopes1,
	)
	_ = pgStreamStore.WriteMiniblockCandidate(
		ctx,
		streamId,
		common.BytesToHash([]byte("blockhash2")),
		2,
		[]byte("block2"),
	)
	_ = promoteMiniblockCandidate(
		ctx,
		pgStreamStore,
		streamId,
		2,
		common.BytesToHash([]byte("blockhash2")),
		false,
		testEnvelopes2,
	)
	_ = pgStreamStore.WriteMiniblockCandidate(
		ctx,
		streamId,
		common.BytesToHash([]byte("blockhash3")),
		3,
		[]byte("block3"),
	)
	_ = promoteMiniblockCandidate(
		ctx,
		pgStreamStore,
		streamId,
		3,
		common.BytesToHash([]byte("blockhash3")),
		false,
		testEnvelopes3,
	)

	_, _ = pgStreamStore.pool.Exec(ctx, "DELETE FROM miniblocks WHERE seq_num = 2")

	_, err := pgStreamStore.ReadMiniblocks(ctx, streamId, 1, 4)

	require.NotNil(err)
	require.Contains(err.Error(), "Miniblocks consistency violation")
	require.Equal(AsRiverError(err).GetTag("ActualBlockNumber"), 3)
	require.Equal(AsRiverError(err).GetTag("ExpectedBlockNumber"), 2)
}

func TestAlreadyExists(t *testing.T) {
	require := require.New(t)
	ctx, pgStreamStore, testParams := setupStreamStorageTest()
	defer testParams.closer()

	streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	genesisMiniblock := []byte("genesisMiniblock")
	err := pgStreamStore.CreateStreamStorage(ctx, streamId, genesisMiniblock)
	require.NoError(err)

	err = pgStreamStore.CreateStreamStorage(ctx, streamId, genesisMiniblock)
	require.Equal(Err_ALREADY_EXISTS, AsRiverError(err).Code)
}

func TestNotFound(t *testing.T) {
	require := require.New(t)
	ctx, pgStreamStore, testParams := setupStreamStorageTest()
	defer testParams.closer()

	streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	result, err := pgStreamStore.ReadStreamFromLastSnapshot(ctx, streamId, 0)
	require.Nil(result)
	require.Equal(Err_NOT_FOUND, AsRiverError(err).Code)
}

type dataMaker rand.Rand

func newDataMaker() *dataMaker {
	return (*dataMaker)(rand.New(rand.NewSource(42)))
}

func (m *dataMaker) mb() ([]byte, common.Hash) {
	b := make([]byte, 200)
	_, _ = (*rand.Rand)(m).Read(b)
	// Hash is fake
	return b, common.BytesToHash(b)
}

func (m *dataMaker) events() [][]byte {
	var ret [][]byte
	for range 5 {
		b := make([]byte, 50)
		_, _ = (*rand.Rand)(m).Read(b)
		ret = append(ret, b)
	}
	return ret
}

func requireSnapshotResult(
	t *testing.T,
	result *ReadStreamFromLastSnapshotResult,
	startMiniblockNumber int64,
	snapshotOffset int,
	miniblocks [][]byte,
	minipoolEnvelopes [][]byte,
) {
	require.EqualValues(t, startMiniblockNumber, result.StartMiniblockNumber, "StartMiniblockNumber")
	require.EqualValues(t, snapshotOffset, result.SnapshotMiniblockOffset, "SnapshotMiniblockOffset")
	require.Equal(t, len(result.Miniblocks), len(miniblocks), "len of miniblocks")
	require.EqualValues(t, miniblocks, result.Miniblocks)
	require.Equal(t, len(result.MinipoolEnvelopes), len(minipoolEnvelopes), "len of minipoolEnvelopes")
	require.EqualValues(t, minipoolEnvelopes, result.MinipoolEnvelopes)
}

func TestReadStreamFromLastSnapshot(t *testing.T) {
	require := require.New(t)

	ctx, pgStreamStore, testParams := setupStreamStorageTest()
	defer testParams.closer()

	streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)

	dataMaker := newDataMaker()

	var store StreamStorage = pgStreamStore

	genMB, _ := dataMaker.mb()
	mbs := [][]byte{genMB}
	require.NoError(store.CreateStreamStorage(ctx, streamId, genMB))

	mb1, h1 := dataMaker.mb()
	mbs = append(mbs, mb1)
	require.NoError(store.WriteMiniblockCandidate(ctx, streamId, h1, 1, mb1))

	mb1read, err := store.ReadMiniblockCandidate(ctx, streamId, h1, 1)
	require.NoError(err)
	require.EqualValues(mb1, mb1read)

	eventPool1 := dataMaker.events()
	require.NoError(promoteMiniblockCandidate(ctx, pgStreamStore, streamId, 1, h1, false, eventPool1))

	streamData, err := store.ReadStreamFromLastSnapshot(ctx, streamId, 10)
	require.NoError(err)
	requireSnapshotResult(t, streamData, 0, 0, mbs, eventPool1)

	mb2, h2 := dataMaker.mb()
	mbs = append(mbs, mb2)
	require.NoError(store.WriteMiniblockCandidate(ctx, streamId, h2, 2, mb2))

	mb2read, err := store.ReadMiniblockCandidate(ctx, streamId, h2, 2)
	require.NoError(err)
	require.EqualValues(mb2, mb2read)

	eventPool2 := dataMaker.events()
	require.NoError(promoteMiniblockCandidate(ctx, pgStreamStore, streamId, 2, h2, true, eventPool2))

	streamData, err = store.ReadStreamFromLastSnapshot(ctx, streamId, 10)
	require.NoError(err)
	requireSnapshotResult(t, streamData, 0, 2, mbs, eventPool2)

	var lastEvents [][]byte
	for i := range 12 {
		mb, h := dataMaker.mb()
		mbs = append(mbs, mb)
		require.NoError(store.WriteMiniblockCandidate(ctx, streamId, h, 3+int64(i), mb))
		lastEvents = dataMaker.events()
		require.NoError(promoteMiniblockCandidate(ctx, pgStreamStore, streamId, 3+int64(i), h, false, lastEvents))
	}

	streamData, err = store.ReadStreamFromLastSnapshot(ctx, streamId, 14)
	require.NoError(err)
	requireSnapshotResult(t, streamData, 1, 1, mbs[1:], lastEvents)

	mb, h := dataMaker.mb()
	mbs = append(mbs, mb)
	require.NoError(store.WriteMiniblockCandidate(ctx, streamId, h, 15, mb))
	lastEvents = dataMaker.events()
	require.NoError(promoteMiniblockCandidate(ctx, pgStreamStore, streamId, 15, h, true, lastEvents))

	streamData, err = store.ReadStreamFromLastSnapshot(ctx, streamId, 6)
	require.NoError(err)
	requireSnapshotResult(t, streamData, 10, 5, mbs[10:], lastEvents)
}
