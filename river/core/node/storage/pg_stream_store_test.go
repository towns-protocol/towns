package storage

import (
	"context"
	"encoding/hex"
	"strings"
	"sync"
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
	ctx           context.Context
	pgStreamStore *PostgresStreamStore
	schema        string
	config        *config.DatabaseConfig
	closer        func()
	// For retaining schema and manually closing the store, use
	// the following two cleanup functions to manually delete the
	// schema and cancel the test context.
	schemaDeleter func()
	ctxCloser     func()
	exitSignal    chan error
}

func setupStreamStorageTest(t *testing.T) *testStreamStoreParams {
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
		ctx:           ctx,
		pgStreamStore: store,
		schema:        dbSchemaName,
		config:        dbCfg,
		exitSignal:    exitSignal,
		closer: sync.OnceFunc(func() {
			store.Close(ctx)
			dbCloser()
			ctxCloser()
		}),
		schemaDeleter: dbCloser,
		ctxCloser:     ctxCloser,
	}

	return params
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
	params := setupStreamStorageTest(t)
	require := require.New(t)

	pgStreamStore := params.pgStreamStore
	ctx := params.ctx
	defer params.closer()

	streamsNumber, err := pgStreamStore.GetStreamsNumber(ctx)
	require.NoError(err)
	require.Equal(0, streamsNumber)

	streamId1 := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	streamId2 := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	streamId3 := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	nonExistentStreamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)

	// Test that created stream will have proper genesis miniblock
	genesisMiniblock := []byte("genesisMiniblock")
	err = pgStreamStore.CreateStreamStorage(ctx, streamId1, genesisMiniblock)
	require.NoError(err)

	streamsNumber, err = pgStreamStore.GetStreamsNumber(ctx)
	require.NoError(err)
	require.Equal(1, streamsNumber)

	streamFromLastSnaphot, err := pgStreamStore.ReadStreamFromLastSnapshot(ctx, streamId1, 0)
	require.NoError(err)
	require.Len(streamFromLastSnaphot.Miniblocks, 1, "Expected to find one miniblock, found different number")
	require.EqualValues(
		streamFromLastSnaphot.Miniblocks[0],
		genesisMiniblock,
		"Expected to find original genesis block, found different",
	)
	require.Len(streamFromLastSnaphot.MinipoolEnvelopes, 0, "Expected minipool to be empty, found different")

	// Test that we cannot add second stream with same id
	genesisMiniblock2 := []byte("genesisMiniblock2")
	err = pgStreamStore.CreateStreamStorage(ctx, streamId1, genesisMiniblock2)
	require.Error(err)

	// Test that we can add second stream and then GetStreams will return both
	err = pgStreamStore.CreateStreamStorage(ctx, streamId2, genesisMiniblock2)
	require.NoError(err)

	streams, err := pgStreamStore.GetStreams(ctx)
	require.NoError(err)
	require.ElementsMatch(streams, []StreamId{streamId1, streamId2})

	// Test that we can delete stream and proper stream will be deleted
	genesisMiniblock3 := []byte("genesisMiniblock3")
	err = pgStreamStore.CreateStreamStorage(ctx, streamId3, genesisMiniblock3)
	require.NoError(err)

	err = pgStreamStore.DeleteStream(ctx, streamId2)
	require.NoError(err)

	streams, err = pgStreamStore.GetStreams(ctx)
	require.NoError(err)
	require.ElementsMatch(streams, []StreamId{streamId1, streamId3})

	// Test that we can add event to stream and then retrieve it
	err = pgStreamStore.WriteEvent(ctx, streamId1, 1, 0, []byte("event1"))
	require.NoError(err)

	streamFromLastSnaphot, err = pgStreamStore.ReadStreamFromLastSnapshot(ctx, streamId1, 0)
	require.NoError(err)
	require.Len(streamFromLastSnaphot.Miniblocks, 1, "Expected to find one miniblock, found different number")
	require.EqualValues(
		streamFromLastSnaphot.Miniblocks[0],
		genesisMiniblock,
		"Expected to find original genesis block, found different",
	)

	var testEnvelopes [][]byte
	testEnvelopes = append(testEnvelopes, []byte("event2"))
	blockHash := common.BytesToHash([]byte("block_hash"))
	blockData := []byte("block1")
	err = pgStreamStore.WriteMiniblockCandidate(ctx, streamId1, blockHash, 1, blockData)
	require.NoError(err)

	mbBytes, err := pgStreamStore.ReadMiniblockCandidate(ctx, streamId1, blockHash, 1)
	require.NoError(err)
	require.EqualValues(blockData, mbBytes)

	err = promoteMiniblockCandidate(ctx, pgStreamStore, streamId1, 1, blockHash, false, testEnvelopes)
	require.NoError(err)

	var testEnvelopes2 [][]byte
	testEnvelopes2 = append(testEnvelopes2, []byte("event3"))
	blockHash2 := common.BytesToHash([]byte("block_hash_2"))
	err = pgStreamStore.WriteMiniblockCandidate(ctx, streamId1, blockHash2, 2, []byte("block2"))
	require.NoError(err)

	err = promoteMiniblockCandidate(ctx, pgStreamStore, streamId1, 2, blockHash2, true, testEnvelopes2)
	require.NoError(err)

	lastMiniblockNumber, err := pgStreamStore.GetLastMiniblockNumber(ctx, streamId1)
	require.NoError(err)
	require.Equal(int64(2), lastMiniblockNumber)

	lastMiniblockNumber, err = pgStreamStore.GetLastMiniblockNumber(ctx, nonExistentStreamId)
	require.Error(err)
	require.Equal(int64(0), lastMiniblockNumber)
	require.True(IsRiverErrorCode(err, Err_NOT_FOUND))
}

func TestPromoteMiniblockCandidate(t *testing.T) {
	params := setupStreamStorageTest(t)
	ctx := params.ctx
	pgStreamStore := params.pgStreamStore
	defer params.closer()
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
	require.True(IsRiverErrorCode(err, Err_MINIBLOCKS_STORAGE_FAILURE))
	require.Equal(AsRiverError(err).GetTag("LastBlockInStorage"), int64(0))
	require.Equal(AsRiverError(err).GetTag("CandidateBlockNumber"), int64(0))

	// Future candidates fine
	err = pgStreamStore.WriteMiniblockCandidate(ctx, streamId, candidateHash_block2, 2, miniblock_bytes)
	require.NoError(err)

	// Write two candidates for this block number
	err = pgStreamStore.WriteMiniblockCandidate(ctx, streamId, candidateHash, 1, miniblock_bytes)
	require.NoError(err)

	err = pgStreamStore.WriteMiniblockCandidate(ctx, streamId, candidateHash, 1, miniblock_bytes)
	require.True(IsRiverErrorCode(err, Err_ALREADY_EXISTS))

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
	params := setupStreamStorageTest(t)
	require := require.New(t)
	ctx := params.ctx
	pgStreamStore := params.pgStreamStore
	defer params.closer()

	streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)

	prepareTestDataForAddEventConsistencyCheck(ctx, pgStreamStore, streamId)

	// Corrupt record in minipool
	_, _ = pgStreamStore.pool.Exec(
		ctx,
		pgStreamStore.sqlForStream(
			"UPDATE {{minipools}} SET generation = 777 WHERE slot_num = 1",
			streamId,
		),
	)
	err := pgStreamStore.WriteEvent(ctx, streamId, 1, 3, []byte("event4"))

	require.NotNil(err)
	require.Contains(err.Error(), "Wrong slot number in minipool")
	require.Equal(AsRiverError(err).GetTag("ActualSlotNumber"), 2)
	require.Equal(AsRiverError(err).GetTag("ExpectedSlotNumber"), 1)
}

// Test that if there is a gap in minipool records, we will get error
func TestAddEventConsistencyChecksGaps(t *testing.T) {
	params := setupStreamStorageTest(t)
	require := require.New(t)
	ctx := params.ctx
	pgStreamStore := params.pgStreamStore
	defer params.closer()

	streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)

	prepareTestDataForAddEventConsistencyCheck(ctx, pgStreamStore, streamId)

	// Corrupt record in minipool
	_, _ = pgStreamStore.pool.Exec(
		ctx,
		pgStreamStore.sqlForStream(
			"DELETE FROM {{minipools}} WHERE slot_num = 1",
			streamId,
		),
	)
	err := pgStreamStore.WriteEvent(ctx, streamId, 1, 3, []byte("event4"))

	require.NotNil(err)
	require.Contains(err.Error(), "Wrong slot number in minipool")
	require.Equal(AsRiverError(err).GetTag("ActualSlotNumber"), 2)
	require.Equal(AsRiverError(err).GetTag("ExpectedSlotNumber"), 1)
}

// Test that if there is a wrong number minipool records, we will get error
func TestAddEventConsistencyChecksEventsNumberMismatch(t *testing.T) {
	params := setupStreamStorageTest(t)
	require := require.New(t)
	ctx := params.ctx
	pgStreamStore := params.pgStreamStore
	defer params.closer()

	streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)

	prepareTestDataForAddEventConsistencyCheck(ctx, pgStreamStore, streamId)

	// Corrupt record in minipool
	_, _ = pgStreamStore.pool.Exec(
		ctx,
		pgStreamStore.sqlForStream(
			"DELETE FROM {{minipools}} WHERE slot_num = 2",
			streamId,
		),
	)
	err := pgStreamStore.WriteEvent(ctx, streamId, 1, 3, []byte("event4"))

	require.NotNil(err)
	require.Contains(err.Error(), "Wrong number of records in minipool")
	require.Equal(AsRiverError(err).GetTag("ActualRecordsNumber"), 2)
	require.Equal(AsRiverError(err).GetTag("ExpectedRecordsNumber"), 3)
}

func TestNoStream(t *testing.T) {
	params := setupStreamStorageTest(t)
	require := require.New(t)
	ctx := params.ctx
	pgStreamStore := params.pgStreamStore
	defer params.closer()

	res, err := pgStreamStore.ReadStreamFromLastSnapshot(ctx, testutils.FakeStreamId(STREAM_CHANNEL_BIN), 0)
	require.Nil(res)
	require.Error(err)
	require.Equal(Err_NOT_FOUND, AsRiverError(err).Code, err)
}

func TestCreateBlockProposalConsistencyChecksProperNewMinipoolGeneration(t *testing.T) {
	params := setupStreamStorageTest(t)
	require := require.New(t)
	ctx := params.ctx
	pgStreamStore := params.pgStreamStore
	defer params.closer()

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
	params := setupStreamStorageTest(t)
	require := require.New(t)
	ctx := params.ctx
	pgStreamStore := params.pgStreamStore
	defer params.closer()

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

	_, _ = pgStreamStore.pool.Exec(
		ctx,
		pgStreamStore.sqlForStream(
			"DELETE FROM {{miniblocks}} WHERE seq_num = 2",
			streamId,
		),
	)
	err := promoteMiniblockCandidate(ctx, pgStreamStore, streamId, 3, blockHash3, false, testEnvelopes3)

	// TODO(crystal): tune these
	require.NotNil(err)
	require.Contains(err.Error(), "DB data consistency check failed: Previous minipool generation mismatch")
	require.Equal(AsRiverError(err).GetTag("lastMbInStorage"), int64(1))
	require.Equal(AsRiverError(err).GetTag("lastMiniblockNumber"), int64(3))
}

func TestCreateBlockProposalNoSuchStreamError(t *testing.T) {
	params := setupStreamStorageTest(t)
	require := require.New(t)
	ctx := params.ctx
	pgStreamStore := params.pgStreamStore
	defer params.closer()

	streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	genesisMiniblock := []byte("genesisMiniblock")
	_ = pgStreamStore.CreateStreamStorage(ctx, streamId, genesisMiniblock)

	_, _ = pgStreamStore.pool.Exec(
		ctx,
		pgStreamStore.sqlForStream(
			"DELETE FROM {{miniblocks}}",
			streamId,
		),
	)

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
	params := setupStreamStorageTest(t)
	require := require.New(t)
	ctx := params.ctx
	pgStreamStore := params.pgStreamStore
	defer params.closer()

	streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	genesisMiniblock := []byte("genesisMiniblock")
	_ = pgStreamStore.CreateStreamStorage(ctx, streamId, genesisMiniblock)

	var testEnvelopes1 [][]byte
	testEnvelopes1 = append(testEnvelopes1, []byte("event1"))
	block_hash := common.BytesToHash([]byte("block_hash"))
	_ = pgStreamStore.WriteMiniblockCandidate(ctx, streamId, block_hash, 1, []byte("block1"))

	_, _ = pgStreamStore.pool.Exec(
		ctx,
		pgStreamStore.sqlForStream(
			"DELETE FROM {{miniblocks}}",
			streamId,
		),
	)

	err := promoteMiniblockCandidate(ctx, pgStreamStore, streamId, 1, block_hash, true, testEnvelopes1)

	require.NotNil(err)
	require.Contains(err.Error(), "No blocks for the stream found in block storage")
	require.Equal(AsRiverError(err).GetTag("streamId"), streamId)
}

func TestExitIfSecondStorageCreated(t *testing.T) {
	params := setupStreamStorageTest(t)
	require := require.New(t)
	ctx := params.ctx
	pgStreamStore := params.pgStreamStore
	defer params.schemaDeleter()
	defer params.ctxCloser()

	// Give listener thread some time to start
	time.Sleep(500 * time.Millisecond)

	genesisMiniblock := []byte("genesisMiniblock")
	streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	err := pgStreamStore.CreateStreamStorage(ctx, streamId, genesisMiniblock)
	require.NoError(err)

	pool, err := CreateAndValidatePgxPool(
		ctx,
		params.config,
		params.schema,
		nil,
	)
	require.NoError(err)

	instanceId2 := GenShortNanoid()
	exitSignal2 := make(chan error, 1)

	var secondStoreInitialized sync.WaitGroup
	secondStoreInitialized.Add(1)
	var pgStreamStore2 *PostgresStreamStore
	go func() {
		pgStreamStore2, err = NewPostgresStreamStore(
			ctx,
			pool,
			instanceId2,
			exitSignal2,
			infra.NewMetricsFactory(nil, "", ""),
		)
		require.NoError(err)
		secondStoreInitialized.Done()
	}()

	// Give listener thread for the first store some time to detect the notification and emit an error
	time.Sleep(500 * time.Millisecond)

	exitErr := <-params.exitSignal
	require.Error(exitErr)
	require.Equal(Err_RESOURCE_EXHAUSTED, AsRiverError(exitErr).Code)
	pgStreamStore.Close(ctx)

	secondStoreInitialized.Wait()
	defer pgStreamStore2.Close(ctx)

	result, err := pgStreamStore2.ReadStreamFromLastSnapshot(ctx, streamId, 0)
	require.NoError(err)
	require.NotNil(result)
}

// Test that if there is a gap in miniblocks sequence, we will get error
func TestGetStreamFromLastSnapshotConsistencyChecksMissingBlockFailure(t *testing.T) {
	params := setupStreamStorageTest(t)
	require := require.New(t)
	ctx := params.ctx
	pgStreamStore := params.pgStreamStore
	defer params.closer()

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

	_, _ = pgStreamStore.pool.Exec(
		ctx,
		pgStreamStore.sqlForStream(
			"DELETE FROM {{miniblocks}} WHERE seq_num = 2",
			streamId,
		),
	)

	_, err := pgStreamStore.ReadStreamFromLastSnapshot(ctx, streamId, 0)

	require.NotNil(err)
	require.EqualValues(Err_INTERNAL, AsRiverError(err).Code)
	require.Equal(AsRiverError(err).GetTag("ActualSeqNum"), int64(3))
	require.Equal(AsRiverError(err).GetTag("ExpectedSeqNum"), int64(2))
}

func TestGetStreamFromLastSnapshotConsistencyCheckWrongEnvelopeGeneration(t *testing.T) {
	params := setupStreamStorageTest(t)
	require := require.New(t)
	ctx := params.ctx
	pgStreamStore := params.pgStreamStore
	defer params.closer()

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

	_, _ = pgStreamStore.pool.Exec(
		ctx,
		pgStreamStore.sqlForStream(
			"UPDATE {{minipools}} SET generation = 777 WHERE slot_num = 1",
			streamId,
		),
	)

	_, err := pgStreamStore.ReadStreamFromLastSnapshot(ctx, streamId, 0)

	require.NotNil(err)
	require.EqualValues(Err_MINIBLOCKS_STORAGE_FAILURE, AsRiverError(err).Code)
}

func TestGetStreamFromLastSnapshotConsistencyCheckNoZeroIndexEnvelope(t *testing.T) {
	params := setupStreamStorageTest(t)
	require := require.New(t)
	ctx := params.ctx
	pgStreamStore := params.pgStreamStore
	defer params.closer()

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

	_, _ = pgStreamStore.pool.Exec(
		ctx,
		pgStreamStore.sqlForStream(
			"DELETE FROM {{minipools}} WHERE slot_num = 0",
			streamId,
		),
	)

	_, err := pgStreamStore.ReadStreamFromLastSnapshot(ctx, streamId, 0)

	require.NotNil(err)
	require.Contains(err.Error(), "Minipool consistency violation - slotNums are not sequential")
}

func TestGetStreamFromLastSnapshotConsistencyCheckGapInEnvelopesIndexes(t *testing.T) {
	params := setupStreamStorageTest(t)
	require := require.New(t)
	ctx := params.ctx
	pgStreamStore := params.pgStreamStore
	defer params.closer()

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

	_, _ = pgStreamStore.pool.Exec(
		ctx,
		pgStreamStore.sqlForStream(
			"DELETE FROM {{minipools}} WHERE slot_num = 1",
			streamId,
		),
	)

	_, err := pgStreamStore.ReadStreamFromLastSnapshot(ctx, streamId, 0)

	require.NotNil(err)
	require.EqualValues(Err_MINIBLOCKS_STORAGE_FAILURE, AsRiverError(err).Code)
}

func TestGetMiniblocksConsistencyChecks(t *testing.T) {
	params := setupStreamStorageTest(t)
	require := require.New(t)
	ctx := params.ctx
	pgStreamStore := params.pgStreamStore
	defer params.closer()

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

	_, _ = pgStreamStore.pool.Exec(
		ctx,
		pgStreamStore.sqlForStream(
			"DELETE FROM {{miniblocks}} WHERE seq_num = 2",
			streamId,
		),
	)

	_, err := pgStreamStore.ReadMiniblocks(ctx, streamId, 1, 4)

	require.NotNil(err)
	require.Contains(err.Error(), "Miniblocks consistency violation")
	require.Equal(AsRiverError(err).GetTag("ActualBlockNumber"), 3)
	require.Equal(AsRiverError(err).GetTag("ExpectedBlockNumber"), 2)
}

func TestAlreadyExists(t *testing.T) {
	params := setupStreamStorageTest(t)
	require := require.New(t)
	ctx := params.ctx
	pgStreamStore := params.pgStreamStore
	defer params.closer()

	streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	genesisMiniblock := []byte("genesisMiniblock")
	err := pgStreamStore.CreateStreamStorage(ctx, streamId, genesisMiniblock)
	require.NoError(err)

	err = pgStreamStore.CreateStreamStorage(ctx, streamId, genesisMiniblock)
	require.Equal(Err_ALREADY_EXISTS, AsRiverError(err).Code)
}

func TestNotFound(t *testing.T) {
	params := setupStreamStorageTest(t)
	require := require.New(t)
	ctx := params.ctx
	pgStreamStore := params.pgStreamStore
	defer params.closer()

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

func (m *dataMaker) mbs(start, n int) []*WriteMiniblockData {
	var ret []*WriteMiniblockData
	for i := range n {
		b := make([]byte, 200)
		_, _ = (*rand.Rand)(m).Read(b)
		ret = append(ret, &WriteMiniblockData{
			Number:   int64(start + i),
			Hash:     common.BytesToHash(b), // Hash is fake
			Snapshot: false,
			Data:     b,
		})
	}
	return ret
}

func (m *dataMaker) events(n int) [][]byte {
	var ret [][]byte
	for range n {
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
	params := setupStreamStorageTest(t)
	require := require.New(t)

	ctx := params.ctx
	pgStreamStore := params.pgStreamStore
	defer params.closer()

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

	eventPool1 := dataMaker.events(5)
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

	eventPool2 := dataMaker.events(5)
	require.NoError(promoteMiniblockCandidate(ctx, pgStreamStore, streamId, 2, h2, true, eventPool2))

	streamData, err = store.ReadStreamFromLastSnapshot(ctx, streamId, 10)
	require.NoError(err)
	requireSnapshotResult(t, streamData, 0, 2, mbs, eventPool2)

	var lastEvents [][]byte
	for i := range 12 {
		mb, h := dataMaker.mb()
		mbs = append(mbs, mb)
		require.NoError(store.WriteMiniblockCandidate(ctx, streamId, h, 3+int64(i), mb))
		lastEvents = dataMaker.events(5)
		require.NoError(promoteMiniblockCandidate(ctx, pgStreamStore, streamId, 3+int64(i), h, false, lastEvents))
	}

	streamData, err = store.ReadStreamFromLastSnapshot(ctx, streamId, 14)
	require.NoError(err)
	requireSnapshotResult(t, streamData, 1, 1, mbs[1:], lastEvents)

	mb, h := dataMaker.mb()
	mbs = append(mbs, mb)
	require.NoError(store.WriteMiniblockCandidate(ctx, streamId, h, 15, mb))
	lastEvents = dataMaker.events(5)
	require.NoError(promoteMiniblockCandidate(ctx, pgStreamStore, streamId, 15, h, true, lastEvents))

	streamData, err = store.ReadStreamFromLastSnapshot(ctx, streamId, 6)
	require.NoError(err)
	requireSnapshotResult(t, streamData, 10, 5, mbs[10:], lastEvents)
}

func TestQueryPlan(t *testing.T) {
	params := setupStreamStorageTest(t)
	require := require.New(t)
	ctx := params.ctx
	store := params.pgStreamStore
	defer params.closer()

	dataMaker := newDataMaker()

	var streamId StreamId
	var candHash common.Hash
	for range 20 {
		streamId = testutils.FakeStreamId(STREAM_CHANNEL_BIN)
		genMB, _ := dataMaker.mb()
		require.NoError(store.CreateStreamStorage(ctx, streamId, genMB))

		require.NoError(store.WriteMiniblocks(ctx, streamId, dataMaker.mbs(1, 10), 11, dataMaker.events(10), 1, 0))

		for range 5 {
			var mb []byte
			mb, candHash = dataMaker.mb()
			require.NoError(store.WriteMiniblockCandidate(ctx, streamId, candHash, 11, mb))
		}
	}

	var plan string
	require.NoError(store.pool.QueryRow(
		ctx,
		"EXPLAIN (ANALYZE, FORMAT JSON) SELECT latest_snapshot_miniblock, migrated from es WHERE stream_id = $1 FOR UPDATE",
		streamId,
	).Scan(&plan))
	require.Contains(plan, `"Node Type": "Index Scan",`, "PLAN: %s", plan)
	require.Contains(plan, `"Actual Rows": 1,`, "PLAN: %s", plan)

	require.NoError(store.pool.QueryRow(
		ctx,
		"EXPLAIN (ANALYZE, FORMAT JSON) SELECT latest_snapshot_miniblock, migrated from es WHERE stream_id = $1 FOR SHARE",
		streamId,
	).Scan(&plan))
	require.Contains(plan, `"Node Type": "Index Scan",`, "PLAN: %s", plan)
	require.Contains(plan, `"Actual Rows": 1,`, "PLAN: %s", plan)

	require.NoError(store.pool.QueryRow(
		ctx,
		store.sqlForStream(
			"EXPLAIN (ANALYZE, FORMAT JSON) SELECT MAX(seq_num) FROM {{miniblocks}} WHERE stream_id = $1",
			streamId,
		),
		streamId,
	).Scan(&plan))
	require.Contains(plan, `"Node Type": "Index Only Scan",`, "PLAN: %s", plan)
	require.Contains(plan, `"Actual Rows": 1,`, "PLAN: %s", plan)

	require.NoError(store.pool.QueryRow(
		ctx,
		store.sqlForStream(
			"EXPLAIN (ANALYZE, FORMAT JSON) SELECT blockdata, seq_num FROM {{miniblocks}} WHERE seq_num >= $1 AND stream_id = $2 ORDER BY seq_num",
			streamId,
		),
		5,
		streamId,
	).Scan(&plan))
	require.Contains(plan, `"Node Type": "Index Scan",`, "PLAN: %s", plan)
	require.Contains(plan, `"Actual Rows": 6,`, "PLAN: %s", plan)

	require.NoError(store.pool.QueryRow(
		ctx,
		store.sqlForStream(
			"EXPLAIN (ANALYZE, FORMAT JSON) SELECT blockdata FROM {{miniblock_candidates}} WHERE stream_id = $1 AND seq_num = $2 AND block_hash = $3",
			streamId,
		),
		streamId,
		11,
		hex.EncodeToString(candHash.Bytes()),
	).Scan(&plan))
	require.Contains(plan, `"Node Type": "Index Scan",`, "PLAN: %s", plan)
	require.Contains(plan, `"Actual Rows": 1,`, "PLAN: %s", plan)

	require.NoError(store.pool.QueryRow(
		ctx,
		store.sqlForStream(
			"EXPLAIN (ANALYZE, FORMAT JSON) SELECT generation, slot_num, envelope FROM {{minipools}} WHERE stream_id = $1 ORDER BY generation, slot_num",
			streamId,
		),
		streamId,
	).Scan(&plan))
	require.Contains(plan, `"Node Type": "Index Scan",`, "PLAN: %s", plan)
	require.Contains(plan, `"Actual Rows": 11,`, "PLAN: %s", plan)

	require.NoError(store.pool.QueryRow(
		ctx,
		store.sqlForStream(
			"EXPLAIN (ANALYZE, FORMAT JSON) DELETE FROM {{minipools}} WHERE stream_id = $1 RETURNING generation, slot_num",
			streamId,
		),
		streamId,
	).Scan(&plan))
	require.Contains(plan, `"Node Type": "Index Scan",`, "PLAN: %s", plan)
	require.Contains(plan, `"Actual Rows": 11,`, "PLAN: %s", plan)
}
