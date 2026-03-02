package storage

import (
	"context"
	"encoding/hex"
	"fmt"
	"math/rand/v2"
	"regexp"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/stretchr/testify/require"
	"google.golang.org/protobuf/proto"

	"github.com/towns-protocol/towns/core/config"
	. "github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/base/test"
	"github.com/towns-protocol/towns/core/node/crypto"
	"github.com/towns-protocol/towns/core/node/infra"
	. "github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/testutils"
	"github.com/towns-protocol/towns/core/node/testutils/dbtestutils"
	"github.com/towns-protocol/towns/core/node/testutils/mocks"
)

// requireActualRows checks for "Actual Rows" in EXPLAIN output, handling both
// PG 17 format (integer: "Actual Rows": 1,) and PG 18 format (decimal: "Actual Rows": 1.00,)
func requireActualRows(require *require.Assertions, plan string, expectedRows int, msgAndArgs ...any) {
	// Match "Actual Rows": N, or "Actual Rows": N.00, (PG 17 vs PG 18 format)
	pattern := fmt.Sprintf(`"Actual Rows": %d(\.00)?,`, expectedRows)
	matched, err := regexp.MatchString(pattern, plan)
	require.NoError(err)
	if len(msgAndArgs) > 0 {
		require.True(matched, msgAndArgs...)
	} else {
		require.True(matched, "Expected 'Actual Rows': %d in plan: %s", expectedRows, plan)
	}
}

type testStreamStoreParams struct {
	ctx           context.Context
	pgStreamStore *PostgresStreamStore
	schema        string
	config        *config.DatabaseConfig
	exitSignal    chan error
}

func setupStreamStorageTest(t *testing.T) *testStreamStoreParams {
	require := require.New(t)
	ctx := test.NewTestContext(t)

	dbCfg, dbSchemaName, dbCloser, err := dbtestutils.ConfigureDB(ctx)
	require.NoError(err, "Error configuring db for test")

	dbCfg.StartupDelay = 2 * time.Millisecond
	dbCfg.Extra = strings.Replace(dbCfg.Extra, "pool_max_conns=1000", "pool_max_conns=10", 1)

	pool, err := CreateAndValidatePgxPool(
		ctx,
		dbCfg,
		dbSchemaName,
		nil,
	)
	require.NoError(err, "Error creating pgx pool for test")

	instanceId := GenShortNanoid()
	exitSignal := make(chan error, 1)
	store, err := NewPostgresStreamStore(
		ctx,
		pool,
		instanceId,
		exitSignal,
		infra.NewMetricsFactory(nil, "", ""),
		&mocks.MockOnChainCfg{
			Settings: &crypto.OnChainSettings{
				StreamEphemeralStreamTTL: time.Minute * 10,
				StreamHistoryMiniblocks: crypto.StreamHistoryMiniblocks{
					Default:      0,
					Space:        5,
					UserSettings: 5,
				},
				MinSnapshotEvents: crypto.MinSnapshotEventsSettings{
					Default: 10,
				},
				StreamSnapshotIntervalInMiniblocks: 110,
				StreamTrimActivationFactor:         1,
			},
		},
		nil,
		5,
	)
	require.NoError(err, "Error creating new postgres stream store")

	params := &testStreamStoreParams{
		ctx:           ctx,
		pgStreamStore: store,
		schema:        dbSchemaName,
		config:        dbCfg,
		exitSignal:    exitSignal,
	}

	t.Cleanup(func() {
		store.Close(ctx)
		dbCloser()
	})

	return params
}

func promoteMiniblockCandidate(
	ctx context.Context,
	pgStreamStore *PostgresStreamStore,
	streamId StreamId,
	mbNum int64,
	candidateBlockHash common.Hash,
	envelopes [][]byte,
) error {
	mbData, err := pgStreamStore.ReadMiniblockCandidate(ctx, streamId, candidateBlockHash, mbNum)
	if err != nil {
		return err
	}
	return pgStreamStore.WriteMiniblocks(
		ctx,
		streamId,
		[]*MiniblockDescriptor{{
			Number:   mbNum,
			Hash:     candidateBlockHash,
			Snapshot: mbData.Snapshot,
			Data:     mbData.Data,
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

	streamsNumber, err := pgStreamStore.GetStreamsNumber(ctx)
	require.NoError(err)
	require.Equal(0, streamsNumber)

	streamId1 := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	streamId2 := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	streamId3 := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	nonExistentStreamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)

	// Test that created stream will have proper genesis miniblock
	genesisMb := &MiniblockDescriptor{Data: []byte("genesisMiniblock")}
	err = pgStreamStore.CreateStreamStorage(ctx, streamId1, genesisMb)
	require.NoError(err)

	streamsNumber, err = pgStreamStore.GetStreamsNumber(ctx)
	require.NoError(err)
	require.Equal(1, streamsNumber)

	streamFromLastSnaphot, err := pgStreamStore.ReadStreamFromLastSnapshot(ctx, streamId1, 0)
	require.NoError(err)
	require.Len(streamFromLastSnaphot.Miniblocks, 1, "Expected to find one miniblock, found different number")
	require.EqualValues(
		streamFromLastSnaphot.Miniblocks[0].Data,
		genesisMb.Data,
		"Expected to find original genesis block, found different",
	)
	require.EqualValues(streamFromLastSnaphot.Miniblocks[0].Snapshot, genesisMb.Snapshot)
	require.Len(streamFromLastSnaphot.MinipoolEnvelopes, 0, "Expected minipool to be empty, found different")

	// Test that we cannot add second stream with same id
	genesisMiniblock2 := []byte("genesisMiniblock2")
	err = pgStreamStore.CreateStreamStorage(ctx, streamId1, &MiniblockDescriptor{Data: genesisMiniblock2})
	require.Error(err)

	// Test that we can add second stream and then GetStreams will return both
	err = pgStreamStore.CreateStreamStorage(ctx, streamId2, &MiniblockDescriptor{Data: genesisMiniblock2})
	require.NoError(err)

	streams, err := pgStreamStore.GetStreams(ctx)
	require.NoError(err)
	require.ElementsMatch(streams, []StreamId{streamId1, streamId2})

	// Test that we can delete stream and proper stream will be deleted
	genesisMiniblock3 := []byte("genesisMiniblock3")
	err = pgStreamStore.CreateStreamStorage(ctx, streamId3, &MiniblockDescriptor{Data: genesisMiniblock3})
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
		streamFromLastSnaphot.Miniblocks[0].Data,
		genesisMb.Data,
		"Expected to find original genesis block, found different",
	)

	var testEnvelopes [][]byte
	testEnvelopes = append(testEnvelopes, []byte("event2"))
	mb1 := &MiniblockDescriptor{
		Number: 1,
		Hash:   common.BytesToHash([]byte("block_hash")),
		Data:   []byte("block1"),
	}
	err = pgStreamStore.WriteMiniblockCandidate(ctx, streamId1, mb1)
	require.NoError(err)

	mb, err := pgStreamStore.ReadMiniblockCandidate(ctx, streamId1, mb1.Hash, 1)
	require.NoError(err)
	require.EqualValues(mb1.Data, mb.Data)

	err = promoteMiniblockCandidate(ctx, pgStreamStore, streamId1, 1, mb1.Hash, testEnvelopes)
	require.NoError(err)

	var testEnvelopes2 [][]byte
	testEnvelopes2 = append(testEnvelopes2, []byte("event3"))
	mb2 := &MiniblockDescriptor{
		Number:   2,
		Hash:     common.BytesToHash([]byte("block_hash_2")),
		Data:     []byte("block2"),
		Snapshot: []byte("snapshot"),
	}
	err = pgStreamStore.WriteMiniblockCandidate(ctx, streamId1, mb2)
	require.NoError(err)

	err = promoteMiniblockCandidate(ctx, pgStreamStore, streamId1, 2, mb2.Hash, testEnvelopes2)
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

	require := require.New(t)

	streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	streamId2 := testutils.FakeStreamId(STREAM_CHANNEL_BIN)

	prepareTestDataForAddEventConsistencyCheck(ctx, pgStreamStore, streamId)

	candidateHash := common.BytesToHash([]byte("block_hash"))
	candidateHash2 := common.BytesToHash([]byte("block_hash_2"))
	candidateHashBlock2 := common.BytesToHash([]byte("block_hash_block2"))
	miniblockBytes := []byte("miniblock_bytes")

	// Miniblock candidate seq number must be at least current
	err := pgStreamStore.WriteMiniblockCandidate(ctx, streamId, &MiniblockDescriptor{
		Number: 0,
		Hash:   candidateHash,
		Data:   miniblockBytes,
	})
	require.True(IsRiverErrorCode(err, Err_MINIBLOCKS_STORAGE_FAILURE))
	require.Equal(AsRiverError(err).GetTag("LastBlockInStorage"), int64(0))
	require.Equal(AsRiverError(err).GetTag("CandidateBlockNumber"), int64(0))

	// Future candidates fine
	err = pgStreamStore.WriteMiniblockCandidate(ctx, streamId, &MiniblockDescriptor{
		Number: 2,
		Hash:   candidateHashBlock2,
		Data:   miniblockBytes,
	})
	require.NoError(err)

	// Write two candidates for this block number
	err = pgStreamStore.WriteMiniblockCandidate(ctx, streamId, &MiniblockDescriptor{
		Number: 1,
		Hash:   candidateHash,
		Data:   miniblockBytes,
	})
	require.NoError(err)

	err = pgStreamStore.WriteMiniblockCandidate(ctx, streamId, &MiniblockDescriptor{
		Number: 1,
		Hash:   candidateHash,
		Data:   miniblockBytes,
	})
	require.True(IsRiverErrorCode(err, Err_ALREADY_EXISTS))

	err = pgStreamStore.WriteMiniblockCandidate(ctx, streamId, &MiniblockDescriptor{
		Number: 1,
		Hash:   candidateHash2,
		Data:   miniblockBytes,
	})
	require.NoError(err)

	// Add candidate from another stream. This candidate should be untouched by the delete when a
	// candidate from the first stream is promoted.
	genesisMiniblock := []byte("genesisMiniblock")
	_ = pgStreamStore.CreateStreamStorage(ctx, streamId2, &MiniblockDescriptor{Data: genesisMiniblock})
	err = pgStreamStore.WriteMiniblockCandidate(ctx, streamId2, &MiniblockDescriptor{
		Number: 1,
		Hash:   candidateHash,
		Data:   []byte("some bytes"),
	})
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
		testEnvelopes,
	)
	require.NoError(err)

	// Stream 1 able to promote candidate block from round 2 - candidate unaffected by delete at round 1 promotion.
	err = promoteMiniblockCandidate(
		ctx,
		pgStreamStore,
		streamId,
		2,
		candidateHashBlock2,
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
		testEnvelopes,
	)
	require.NoError(err)
}

func prepareTestDataForAddEventConsistencyCheck(ctx context.Context, s *PostgresStreamStore, streamId StreamId) {
	genesisMiniblock := []byte("genesisMiniblock")
	_ = s.CreateStreamStorage(ctx, streamId, &MiniblockDescriptor{Data: genesisMiniblock})
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

	streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	genesisMiniblock := []byte("genesisMiniblock")
	_ = pgStreamStore.CreateStreamStorage(ctx, streamId, &MiniblockDescriptor{Data: genesisMiniblock})

	var testEnvelopes1 [][]byte
	testEnvelopes1 = append(testEnvelopes1, []byte("event1"))
	var testEnvelopes2 [][]byte
	testEnvelopes2 = append(testEnvelopes2, []byte("event2"))

	blockHash1 := common.BytesToHash([]byte("hash1"))
	blockHash2 := common.BytesToHash([]byte("hash2"))
	blockHash3 := common.BytesToHash([]byte("hash3"))
	_ = pgStreamStore.WriteMiniblockCandidate(ctx, streamId, &MiniblockDescriptor{
		Number:   1,
		Hash:     blockHash1,
		Data:     []byte("block1"),
		Snapshot: []byte("snapshot"),
	})
	_ = promoteMiniblockCandidate(ctx, pgStreamStore, streamId, 1, blockHash1, testEnvelopes1)

	_ = pgStreamStore.WriteMiniblockCandidate(ctx, streamId, &MiniblockDescriptor{
		Number: 2,
		Hash:   blockHash2,
		Data:   []byte("block2"),
	})
	_ = promoteMiniblockCandidate(ctx, pgStreamStore, streamId, 2, blockHash2, testEnvelopes2)

	_, _ = pgStreamStore.pool.Exec(ctx, "DELETE FROM miniblocks WHERE seq_num = 2")

	// Future candidate writes are fine, these may come from other nodes.
	err := pgStreamStore.WriteMiniblockCandidate(ctx, streamId, &MiniblockDescriptor{
		Number: 3,
		Hash:   blockHash3,
		Data:   []byte("block3"),
	})
	require.Nil(err)
}

func TestPromoteBlockConsistencyChecksProperNewMinipoolGeneration(t *testing.T) {
	params := setupStreamStorageTest(t)
	require := require.New(t)
	ctx := params.ctx
	pgStreamStore := params.pgStreamStore

	streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	genesisMiniblock := []byte("genesisMiniblock")
	_ = pgStreamStore.CreateStreamStorage(ctx, streamId, &MiniblockDescriptor{Data: genesisMiniblock})

	var testEnvelopes1 [][]byte
	testEnvelopes1 = append(testEnvelopes1, []byte("event1"))
	var testEnvelopes2 [][]byte
	testEnvelopes2 = append(testEnvelopes2, []byte("event2"))
	var testEnvelopes3 [][]byte
	testEnvelopes3 = append(testEnvelopes3, []byte("event3"))

	blockHash1 := common.BytesToHash([]byte("hash1"))
	blockHash2 := common.BytesToHash([]byte("hash2"))
	blockHash3 := common.BytesToHash([]byte("hash3"))
	_ = pgStreamStore.WriteMiniblockCandidate(ctx, streamId, &MiniblockDescriptor{
		Number:   1,
		Hash:     blockHash1,
		Data:     []byte("block1"),
		Snapshot: []byte("snapshot"),
	})
	_ = promoteMiniblockCandidate(ctx, pgStreamStore, streamId, 1, blockHash1, testEnvelopes1)

	_ = pgStreamStore.WriteMiniblockCandidate(ctx, streamId, &MiniblockDescriptor{
		Number: 2,
		Hash:   blockHash2,
		Data:   []byte("block2"),
	})
	_ = promoteMiniblockCandidate(ctx, pgStreamStore, streamId, 2, blockHash2, testEnvelopes2)

	_ = pgStreamStore.WriteMiniblockCandidate(ctx, streamId, &MiniblockDescriptor{
		Number: 3,
		Hash:   blockHash3,
		Data:   []byte("block3"),
	})

	_, _ = pgStreamStore.pool.Exec(
		ctx,
		pgStreamStore.sqlForStream(
			"DELETE FROM {{miniblocks}} WHERE seq_num = 2",
			streamId,
		),
	)
	err := promoteMiniblockCandidate(ctx, pgStreamStore, streamId, 3, blockHash3, testEnvelopes3)

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

	streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	genesisMiniblock := []byte("genesisMiniblock")
	_ = pgStreamStore.CreateStreamStorage(ctx, streamId, &MiniblockDescriptor{Data: genesisMiniblock})

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
		&MiniblockDescriptor{
			Number: 1,
			Hash:   common.BytesToHash([]byte("block_hash")),
			Data:   []byte("block1"),
		},
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

	streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	genesisMiniblock := []byte("genesisMiniblock")
	_ = pgStreamStore.CreateStreamStorage(ctx, streamId, &MiniblockDescriptor{Data: genesisMiniblock})

	var testEnvelopes1 [][]byte
	testEnvelopes1 = append(testEnvelopes1, []byte("event1"))
	block_hash := common.BytesToHash([]byte("block_hash"))
	_ = pgStreamStore.WriteMiniblockCandidate(ctx, streamId, &MiniblockDescriptor{
		Number:   1,
		Hash:     block_hash,
		Data:     []byte("block1"),
		Snapshot: []byte("snapshot"),
	})

	_, _ = pgStreamStore.pool.Exec(
		ctx,
		pgStreamStore.sqlForStream(
			"DELETE FROM {{miniblocks}}",
			streamId,
		),
	)

	err := promoteMiniblockCandidate(ctx, pgStreamStore, streamId, 1, block_hash, testEnvelopes1)

	require.NotNil(err)
	require.Contains(err.Error(), "No blocks for the stream found in block storage")
	require.Equal(AsRiverError(err).GetTag("streamId"), streamId)
}

func TestExitIfSecondStorageCreated(t *testing.T) {
	params := setupStreamStorageTest(t)
	require := require.New(t)
	ctx := params.ctx
	pgStreamStore := params.pgStreamStore

	// Give listener thread some time to start
	time.Sleep(500 * time.Millisecond)

	genesisMiniblock := []byte("genesisMiniblock")
	streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	err := pgStreamStore.CreateStreamStorage(ctx, streamId, &MiniblockDescriptor{Data: genesisMiniblock})
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
			&mocks.MockOnChainCfg{
				Settings: &crypto.OnChainSettings{
					StreamEphemeralStreamTTL: time.Minute * 10,
					StreamHistoryMiniblocks:  crypto.StreamHistoryMiniblocks{},
				},
			},
			nil,
			5,
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

	streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	genesisMiniblock := []byte("genesisMiniblock")
	_ = pgStreamStore.CreateStreamStorage(ctx, streamId, &MiniblockDescriptor{Data: genesisMiniblock})
	var testEnvelopes1 [][]byte
	testEnvelopes1 = append(testEnvelopes1, []byte("event1"))
	var testEnvelopes2 [][]byte
	testEnvelopes2 = append(testEnvelopes2, []byte("event2"))
	var testEnvelopes3 [][]byte
	testEnvelopes3 = append(testEnvelopes3, []byte("event3"))

	_ = pgStreamStore.WriteMiniblockCandidate(
		ctx,
		streamId,
		&MiniblockDescriptor{
			Number:   1,
			Hash:     common.BytesToHash([]byte("blockhash1")),
			Data:     []byte("block1"),
			Snapshot: []byte("snapshot"),
		},
	)
	_ = promoteMiniblockCandidate(
		ctx,
		pgStreamStore,
		streamId,
		1,
		common.BytesToHash([]byte("blockhash1")),
		testEnvelopes1,
	)

	_ = pgStreamStore.WriteMiniblockCandidate(
		ctx,
		streamId,
		&MiniblockDescriptor{
			Number: 2,
			Hash:   common.BytesToHash([]byte("blockhash2")),
			Data:   []byte("block2"),
		},
	)
	_ = promoteMiniblockCandidate(
		ctx,
		pgStreamStore,
		streamId,
		2,
		common.BytesToHash([]byte("blockhash2")),
		testEnvelopes2,
	)

	_ = pgStreamStore.WriteMiniblockCandidate(
		ctx,
		streamId,
		&MiniblockDescriptor{
			Number: 3,
			Hash:   common.BytesToHash([]byte("blockhash3")),
			Data:   []byte("block3"),
		},
	)
	_ = promoteMiniblockCandidate(
		ctx,
		pgStreamStore,
		streamId,
		3,
		common.BytesToHash([]byte("blockhash3")),
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

	streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	genesisMiniblock := []byte("genesisMiniblock")
	_ = pgStreamStore.CreateStreamStorage(ctx, streamId, &MiniblockDescriptor{Data: genesisMiniblock})

	var testEnvelopes1 [][]byte
	testEnvelopes1 = append(testEnvelopes1, []byte("event1"))

	var testEnvelopes2 [][]byte
	testEnvelopes2 = append(testEnvelopes2, []byte("event2"))
	testEnvelopes2 = append(testEnvelopes2, []byte("event3"))

	_ = pgStreamStore.WriteMiniblockCandidate(
		ctx,
		streamId,
		&MiniblockDescriptor{
			Number:   1,
			Hash:     common.BytesToHash([]byte("blockhash1")),
			Data:     []byte("block1"),
			Snapshot: []byte("snapshot"),
		},
	)
	_ = promoteMiniblockCandidate(
		ctx,
		pgStreamStore,
		streamId,
		1,
		common.BytesToHash([]byte("blockhash1")),
		testEnvelopes1,
	)
	_ = pgStreamStore.WriteMiniblockCandidate(
		ctx,
		streamId,
		&MiniblockDescriptor{
			Number: 2,
			Hash:   common.BytesToHash([]byte("blockhash2")),
			Data:   []byte("block2"),
		},
	)
	_ = promoteMiniblockCandidate(
		ctx,
		pgStreamStore,
		streamId,
		2,
		common.BytesToHash([]byte("blockhash2")),
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

	streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	genesisMiniblock := []byte("genesisMiniblock")
	_ = pgStreamStore.CreateStreamStorage(ctx, streamId, &MiniblockDescriptor{Data: genesisMiniblock})

	var testEnvelopes1 [][]byte
	testEnvelopes1 = append(testEnvelopes1, []byte("event1"))

	var testEnvelopes2 [][]byte
	testEnvelopes2 = append(testEnvelopes2, []byte("event2"))
	testEnvelopes2 = append(testEnvelopes2, []byte("event3"))
	testEnvelopes2 = append(testEnvelopes2, []byte("event4"))

	_ = pgStreamStore.WriteMiniblockCandidate(
		ctx,
		streamId,
		&MiniblockDescriptor{
			Number:   1,
			Hash:     common.BytesToHash([]byte("blockhash1")),
			Data:     []byte("block1"),
			Snapshot: []byte("snapshot"),
		},
	)
	_ = promoteMiniblockCandidate(
		ctx,
		pgStreamStore,
		streamId,
		1,
		common.BytesToHash([]byte("blockhash1")),
		testEnvelopes1,
	)
	_ = pgStreamStore.WriteMiniblockCandidate(
		ctx,
		streamId,
		&MiniblockDescriptor{
			Number: 2,
			Hash:   common.BytesToHash([]byte("blockhash2")),
			Data:   []byte("block2"),
		},
	)
	_ = promoteMiniblockCandidate(
		ctx,
		pgStreamStore,
		streamId,
		2,
		common.BytesToHash([]byte("blockhash2")),
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

	streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	genesisMiniblock := []byte("genesisMiniblock")
	_ = pgStreamStore.CreateStreamStorage(ctx, streamId, &MiniblockDescriptor{Data: genesisMiniblock})

	var testEnvelopes1 [][]byte
	testEnvelopes1 = append(testEnvelopes1, []byte("event1"))

	var testEnvelopes2 [][]byte
	testEnvelopes2 = append(testEnvelopes2, []byte("event2"))
	testEnvelopes2 = append(testEnvelopes2, []byte("event3"))
	testEnvelopes2 = append(testEnvelopes2, []byte("event4"))

	_ = pgStreamStore.WriteMiniblockCandidate(
		ctx,
		streamId,
		&MiniblockDescriptor{
			Number:   1,
			Hash:     common.BytesToHash([]byte("blockhash1")),
			Data:     []byte("block1"),
			Snapshot: []byte("snapshot"),
		},
	)
	_ = promoteMiniblockCandidate(
		ctx,
		pgStreamStore,
		streamId,
		1,
		common.BytesToHash([]byte("blockhash1")),
		testEnvelopes1,
	)
	_ = pgStreamStore.WriteMiniblockCandidate(
		ctx,
		streamId,
		&MiniblockDescriptor{
			Number: 2,
			Hash:   common.BytesToHash([]byte("blockhash2")),
			Data:   []byte("block2"),
		},
	)
	_ = promoteMiniblockCandidate(
		ctx,
		pgStreamStore,
		streamId,
		2,
		common.BytesToHash([]byte("blockhash2")),
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

	streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	genesisMiniblock := []byte("genesisMiniblock")
	_ = pgStreamStore.CreateStreamStorage(ctx, streamId, &MiniblockDescriptor{Data: genesisMiniblock})

	var testEnvelopes1 [][]byte
	testEnvelopes1 = append(testEnvelopes1, []byte("event1"))
	var testEnvelopes2 [][]byte
	testEnvelopes2 = append(testEnvelopes2, []byte("event2"))
	var testEnvelopes3 [][]byte
	testEnvelopes3 = append(testEnvelopes3, []byte("event3"))

	_ = pgStreamStore.WriteMiniblockCandidate(
		ctx,
		streamId,
		&MiniblockDescriptor{
			Number:   1,
			Hash:     common.BytesToHash([]byte("blockhash1")),
			Data:     []byte("block1"),
			Snapshot: []byte("snapshot"),
		},
	)
	_ = promoteMiniblockCandidate(
		ctx,
		pgStreamStore,
		streamId,
		1,
		common.BytesToHash([]byte("blockhash1")),
		testEnvelopes1,
	)
	_ = pgStreamStore.WriteMiniblockCandidate(
		ctx,
		streamId,
		&MiniblockDescriptor{
			Number: 2,
			Hash:   common.BytesToHash([]byte("blockhash2")),
			Data:   []byte("block2"),
		},
	)
	_ = promoteMiniblockCandidate(
		ctx,
		pgStreamStore,
		streamId,
		2,
		common.BytesToHash([]byte("blockhash2")),
		testEnvelopes2,
	)
	_ = pgStreamStore.WriteMiniblockCandidate(
		ctx,
		streamId,
		&MiniblockDescriptor{
			Number: 3,
			Hash:   common.BytesToHash([]byte("blockhash3")),
			Data:   []byte("block3"),
		},
	)
	_ = promoteMiniblockCandidate(
		ctx,
		pgStreamStore,
		streamId,
		3,
		common.BytesToHash([]byte("blockhash3")),
		testEnvelopes3,
	)

	_, _ = pgStreamStore.pool.Exec(
		ctx,
		pgStreamStore.sqlForStream(
			"DELETE FROM {{miniblocks}} WHERE seq_num = 2",
			streamId,
		),
	)

	_, _, err := pgStreamStore.ReadMiniblocks(ctx, streamId, 1, 4, true)

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

	streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	genesisMiniblock := []byte("genesisMiniblock")
	err := pgStreamStore.CreateStreamStorage(ctx, streamId, &MiniblockDescriptor{Data: genesisMiniblock})
	require.NoError(err)

	err = pgStreamStore.CreateStreamStorage(ctx, streamId, &MiniblockDescriptor{Data: genesisMiniblock})
	require.Equal(Err_ALREADY_EXISTS, AsRiverError(err).Code)
}

func TestNotFound(t *testing.T) {
	params := setupStreamStorageTest(t)
	require := require.New(t)
	ctx := params.ctx
	pgStreamStore := params.pgStreamStore

	streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	result, err := pgStreamStore.ReadStreamFromLastSnapshot(ctx, streamId, 0)
	require.Nil(result)
	require.Equal(Err_NOT_FOUND, AsRiverError(err).Code)
}

type dataMaker struct {
	source rand.Source
}

func newDataMaker() *dataMaker {
	return &dataMaker{source: rand.NewPCG(42, 42)}
}

func (m *dataMaker) read(p []byte) {
	pos := 0
	var val uint64
	for n := 0; n < len(p); n++ {
		if pos == 0 {
			val = m.source.Uint64()
			pos = 8
		}
		p[n] = byte(val)
		val >>= 8
		pos--
	}
}

func (m *dataMaker) mb(num int64, sn bool) *MiniblockDescriptor {
	b := make([]byte, 200)
	m.read(b)
	var snapshot []byte
	if sn {
		snapshot = make([]byte, 200)
		m.read(snapshot)
	}
	// Hash is fake
	return &MiniblockDescriptor{
		Data:     b,
		Hash:     common.BytesToHash(b),
		Number:   num,
		Snapshot: snapshot,
	}
}

func (m *dataMaker) mbs(start, n int) []*MiniblockDescriptor {
	var ret []*MiniblockDescriptor
	for i := range n {
		b := make([]byte, 200)
		m.read(b)
		ret = append(ret, &MiniblockDescriptor{
			Number: int64(start + i),
			Hash:   common.BytesToHash(b), // Hash is fake
			Data:   b,
		})
	}
	return ret
}

func (m *dataMaker) events(n int) [][]byte {
	var ret [][]byte
	for range n {
		b := make([]byte, 50)
		m.read(b)
		ret = append(ret, b)
	}
	return ret
}

func makeLegacySnapshotDescriptor(t *testing.T, number int64) *MiniblockDescriptor {
	t.Helper()
	streamEvent := &StreamEvent{
		Payload: &StreamEvent_MiniblockHeader{
			MiniblockHeader: &MiniblockHeader{
				MiniblockNum: number,
				Snapshot:     &Snapshot{},
			},
		},
	}
	eventBytes, err := proto.Marshal(streamEvent)
	require.NoError(t, err)
	miniblock := &Miniblock{Header: &Envelope{Event: eventBytes}}
	data, err := proto.Marshal(miniblock)
	require.NoError(t, err)
	return &MiniblockDescriptor{
		Number:            number,
		Data:              data,
		Hash:              common.BytesToHash(data),
		HasLegacySnapshot: true,
	}
}

func requireSnapshotResult(
	t *testing.T,
	result *ReadStreamFromLastSnapshotResult,
	snapshotOffset int,
	miniblocks []*MiniblockDescriptor,
	minipoolEnvelopes [][]byte,
) {
	require.EqualValues(t, snapshotOffset, result.SnapshotMiniblockOffset, "SnapshotMiniblockOffset")
	require.Equal(t, len(result.Miniblocks), len(miniblocks), "len of miniblocks")
	for i, mb := range miniblocks {
		require.EqualValues(t, mb.Number, result.Miniblocks[i].Number, i)
		require.EqualValues(t, mb.Data, result.Miniblocks[i].Data, i)
		require.EqualValues(t, mb.Snapshot, result.Miniblocks[i].Snapshot, i)
	}
	require.Equal(t, len(result.MinipoolEnvelopes), len(minipoolEnvelopes), "len of minipoolEnvelopes")
	require.EqualValues(t, minipoolEnvelopes, result.MinipoolEnvelopes)
}

func TestReadStreamFromLastSnapshot(t *testing.T) {
	params := setupStreamStorageTest(t)
	require := require.New(t)

	ctx := params.ctx
	pgStreamStore := params.pgStreamStore

	streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)

	dataMaker := newDataMaker()

	var store StreamStorage = pgStreamStore

	genMB := dataMaker.mb(0, true)
	mbs := []*MiniblockDescriptor{genMB}
	require.NoError(store.CreateStreamStorage(ctx, streamId, &MiniblockDescriptor{
		Data:     genMB.Data,
		Snapshot: genMB.Snapshot,
	}))

	count, err := store.GetMiniblockCandidateCount(ctx, streamId, 0)
	require.NoError(err)
	require.EqualValues(0, count)
	count, err = store.GetMiniblockCandidateCount(ctx, streamId, 1)
	require.NoError(err)
	require.EqualValues(0, count)

	mb1 := dataMaker.mb(1, false)
	mbs = append(mbs, mb1)
	require.NoError(store.WriteMiniblockCandidate(ctx, streamId, &MiniblockDescriptor{
		Number: mb1.Number,
		Hash:   mb1.Hash,
		Data:   mb1.Data,
	}))
	count, err = store.GetMiniblockCandidateCount(ctx, streamId, mb1.Number)
	require.NoError(err)
	require.EqualValues(1, count)

	mb1_1 := dataMaker.mb(1, false)
	require.NoError(store.WriteMiniblockCandidate(ctx, streamId, &MiniblockDescriptor{
		Number: mb1_1.Number,
		Hash:   mb1_1.Hash,
		Data:   mb1_1.Data,
	}))
	count, err = store.GetMiniblockCandidateCount(ctx, streamId, mb1.Number)
	require.NoError(err)
	require.EqualValues(2, count)

	mb1read, err := store.ReadMiniblockCandidate(ctx, streamId, mb1.Hash, mb1.Number)
	require.NoError(err)
	require.EqualValues(mb1, mb1read)

	eventPool1 := dataMaker.events(5)
	require.NoError(promoteMiniblockCandidate(ctx, pgStreamStore, streamId, mb1.Number, mb1.Hash, eventPool1))

	streamData, err := store.ReadStreamFromLastSnapshot(ctx, streamId, 10)
	require.NoError(err)
	requireSnapshotResult(t, streamData, 0, mbs, eventPool1)

	mb2 := dataMaker.mb(2, true)
	mbs = append(mbs, mb2)
	require.NoError(store.WriteMiniblockCandidate(ctx, streamId, &MiniblockDescriptor{
		Number:   mb2.Number,
		Hash:     mb2.Hash,
		Data:     mb2.Data,
		Snapshot: mb2.Snapshot,
	}))

	mb2read, err := store.ReadMiniblockCandidate(ctx, streamId, mb2.Hash, mb2.Number)
	require.NoError(err)
	require.EqualValues(mb2.Number, mb2read.Number)
	require.EqualValues(mb2.Data, mb2read.Data)
	require.EqualValues(mb2.Snapshot, mb2read.Snapshot)

	eventPool2 := dataMaker.events(5)
	require.NoError(promoteMiniblockCandidate(ctx, pgStreamStore, streamId, mb2.Number, mb2.Hash, eventPool2))

	streamData, err = store.ReadStreamFromLastSnapshot(ctx, streamId, 10)
	require.NoError(err)
	requireSnapshotResult(t, streamData, 2, mbs, eventPool2)

	var lastEvents [][]byte
	for i := range 12 {
		mb := dataMaker.mb(3+int64(i), false)
		mbs = append(mbs, mb)
		require.NoError(store.WriteMiniblockCandidate(ctx, streamId, &MiniblockDescriptor{
			Number: mb.Number,
			Hash:   mb.Hash,
			Data:   mb.Data,
		}))
		lastEvents = dataMaker.events(5)
		require.NoError(promoteMiniblockCandidate(ctx, pgStreamStore, streamId, mb.Number, mb.Hash, lastEvents))
	}

	streamData, err = store.ReadStreamFromLastSnapshot(ctx, streamId, 14)
	require.NoError(err)
	requireSnapshotResult(t, streamData, 2, mbs, lastEvents)

	mb := dataMaker.mb(15, true)
	mbs = append(mbs, mb)
	require.NoError(store.WriteMiniblockCandidate(ctx, streamId, &MiniblockDescriptor{
		Number:   mb.Number,
		Hash:     mb.Hash,
		Data:     mb.Data,
		Snapshot: mb.Snapshot,
	}))
	lastEvents = dataMaker.events(5)
	require.NoError(promoteMiniblockCandidate(ctx, pgStreamStore, streamId, mb.Number, mb.Hash, lastEvents))

	streamData, err = store.ReadStreamFromLastSnapshot(ctx, streamId, 6)
	require.NoError(err)
	requireSnapshotResult(t, streamData, 6, mbs[9:], lastEvents)
}

func TestReadStreamFromLastSnapshotWithPrecedingMiniblocks(t *testing.T) {
	params := setupStreamStorageTest(t)
	require := require.New(t)

	ctx := params.ctx
	pgStreamStore := params.pgStreamStore

	streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	dataMaker := newDataMaker()

	var store StreamStorage = pgStreamStore

	// Create genesis block
	genMB := dataMaker.mb(0, true)
	require.NoError(store.CreateStreamStorage(ctx, streamId, &MiniblockDescriptor{
		Data:     genMB.Data,
		Snapshot: genMB.Snapshot,
	}))

	// Add 10 regular miniblocks
	for i := 1; i <= 10; i++ {
		mb := dataMaker.mb(int64(i), false)
		require.NoError(store.WriteMiniblockCandidate(ctx, streamId, &MiniblockDescriptor{
			Number: mb.Number,
			Hash:   mb.Hash,
			Data:   mb.Data,
		}))
		events := dataMaker.events(5)
		require.NoError(promoteMiniblockCandidate(ctx, pgStreamStore, streamId, mb.Number, mb.Hash, events))
	}

	// Add a snapshot at block 11
	snapshotMB := dataMaker.mb(11, true)
	require.NoError(store.WriteMiniblockCandidate(ctx, streamId, &MiniblockDescriptor{
		Number:   snapshotMB.Number,
		Hash:     snapshotMB.Hash,
		Data:     snapshotMB.Data,
		Snapshot: snapshotMB.Snapshot,
	}))
	events := dataMaker.events(5)
	require.NoError(promoteMiniblockCandidate(ctx, pgStreamStore, streamId, snapshotMB.Number, snapshotMB.Hash, events))

	// Add 5 more blocks after snapshot
	for i := 12; i <= 16; i++ {
		mb := dataMaker.mb(int64(i), false)
		require.NoError(store.WriteMiniblockCandidate(ctx, streamId, &MiniblockDescriptor{
			Number: mb.Number,
			Hash:   mb.Hash,
			Data:   mb.Data,
		}))
		events = dataMaker.events(5)
		require.NoError(promoteMiniblockCandidate(ctx, pgStreamStore, streamId, mb.Number, mb.Hash, events))
	}

	// Test 1: Request 0 preceding miniblocks (should return from snapshot)
	streamData, err := store.ReadStreamFromLastSnapshot(ctx, streamId, 0)
	require.NoError(err)
	require.Equal(0, streamData.SnapshotMiniblockOffset)
	require.Equal(6, len(streamData.Miniblocks)) // Snapshot + 5 blocks after
	require.Equal(int64(11), streamData.Miniblocks[0].Number)

	// Test 2: Request 3 preceding miniblocks
	streamData, err = store.ReadStreamFromLastSnapshot(ctx, streamId, 3)
	require.NoError(err)
	require.Equal(3, streamData.SnapshotMiniblockOffset)
	require.Equal(9, len(streamData.Miniblocks)) // 3 before + snapshot + 5 after
	require.Equal(int64(8), streamData.Miniblocks[0].Number)
	require.Equal(int64(11), streamData.Miniblocks[3].Number) // Snapshot at index 3

	// Test 3: Request 10 preceding miniblocks (should get 10 blocks before snapshot)
	streamData, err = store.ReadStreamFromLastSnapshot(ctx, streamId, 10)
	require.NoError(err)
	require.Equal(10, streamData.SnapshotMiniblockOffset)      // 10 blocks before snapshot (blocks 1-10)
	require.Equal(16, len(streamData.Miniblocks))              // Blocks 1-16 (missing block 0)
	require.Equal(int64(1), streamData.Miniblocks[0].Number)   // Starts at block 1
	require.Equal(int64(11), streamData.Miniblocks[10].Number) // Snapshot at index 10

	// Test 4: Request more preceding miniblocks than available (should get all 11 blocks before snapshot)
	streamData, err = store.ReadStreamFromLastSnapshot(ctx, streamId, 20)
	require.NoError(err)
	require.Equal(11, streamData.SnapshotMiniblockOffset)      // All 11 blocks before snapshot (blocks 0-10)
	require.Equal(17, len(streamData.Miniblocks))              // All 17 blocks (0-16)
	require.Equal(int64(0), streamData.Miniblocks[0].Number)   // Starts at block 0
	require.Equal(int64(11), streamData.Miniblocks[11].Number) // Snapshot at index 11
}

func TestQueryPlan(t *testing.T) {
	params := setupStreamStorageTest(t)
	require := require.New(t)
	ctx := params.ctx
	store := params.pgStreamStore

	dataMaker := newDataMaker()

	var streamId StreamId
	var candHash common.Hash
	for range 20 {
		streamId = testutils.FakeStreamId(STREAM_CHANNEL_BIN)
		genMB := dataMaker.mb(0, true)
		require.NoError(store.CreateStreamStorage(ctx, streamId, &MiniblockDescriptor{
			Data:     genMB.Data,
			Snapshot: genMB.Snapshot,
		}))

		require.NoError(store.WriteMiniblocks(ctx, streamId, dataMaker.mbs(1, 10), 11, dataMaker.events(10), 1, 0))

		for range 5 {
			mb := dataMaker.mb(11, false)
			candHash = mb.Hash
			require.NoError(store.WriteMiniblockCandidate(ctx, streamId, &MiniblockDescriptor{
				Number: mb.Number,
				Hash:   candHash,
				Data:   mb.Data,
			}))
		}
	}

	var plan string
	require.NoError(store.pool.QueryRow(
		ctx,
		"EXPLAIN (ANALYZE, FORMAT JSON) SELECT latest_snapshot_miniblock, migrated from es WHERE stream_id = $1 FOR UPDATE",
		streamId,
	).Scan(&plan))
	require.Contains(plan, `"Node Type": "Index Scan",`, "PLAN: %s", plan)
	requireActualRows(require, plan, 1, "PLAN: %s", plan)

	require.NoError(store.pool.QueryRow(
		ctx,
		"EXPLAIN (ANALYZE, FORMAT JSON) SELECT latest_snapshot_miniblock, migrated from es WHERE stream_id = $1 FOR SHARE",
		streamId,
	).Scan(&plan))
	require.Contains(plan, `"Node Type": "Index Scan",`, "PLAN: %s", plan)
	requireActualRows(require, plan, 1, "PLAN: %s", plan)

	require.NoError(store.pool.QueryRow(
		ctx,
		store.sqlForStream(
			"EXPLAIN (ANALYZE, FORMAT JSON) SELECT MAX(seq_num) FROM {{miniblocks}} WHERE stream_id = $1",
			streamId,
		),
		streamId,
	).Scan(&plan))
	require.Contains(plan, `"Node Type": "Index Only Scan",`, "PLAN: %s", plan)
	requireActualRows(require, plan, 1, "PLAN: %s", plan)

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
	requireActualRows(require, plan, 6, "PLAN: %s", plan)

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
	requireActualRows(require, plan, 1, "PLAN: %s", plan)

	require.NoError(store.pool.QueryRow(
		ctx,
		store.sqlForStream(
			"EXPLAIN (ANALYZE, FORMAT JSON) SELECT generation, slot_num, envelope FROM {{minipools}} WHERE stream_id = $1 ORDER BY generation, slot_num",
			streamId,
		),
		streamId,
	).Scan(&plan))
	require.Contains(plan, `"Node Type": "Index Scan",`, "PLAN: %s", plan)
	requireActualRows(require, plan, 11, "PLAN: %s", plan)

	require.NoError(store.pool.QueryRow(
		ctx,
		store.sqlForStream(
			"EXPLAIN (ANALYZE, FORMAT JSON) DELETE FROM {{minipools}} WHERE stream_id = $1 RETURNING generation, slot_num",
			streamId,
		),
		streamId,
	).Scan(&plan))
	require.Contains(plan, `"Node Type": "Index Scan",`, "PLAN: %s", plan)
	requireActualRows(require, plan, 11, "PLAN: %s", plan)
}

// TestEmptyMiniblockRecordCorruptionFix checks that code recovers from the corruption that occurred
// when empty genesis miniblocks occasionally were inserted into production database.
// Such records were not parsible on load leading to errors.
// Code is modified to return Err_NOT_FOUND in case of such records in GetStreamFromLastSnapshot.
// And to allow overwriting of such record in CreateStreamStorage.
func TestEmptyMiniblockRecordCorruptionFix(t *testing.T) {
	params := setupStreamStorageTest(t)
	require := require.New(t)

	ctx := params.ctx
	store := params.pgStreamStore

	streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	require.Error(store.CreateStreamStorage(ctx, streamId, &MiniblockDescriptor{
		Data:     []byte{},
		Snapshot: []byte{},
	}))

	dataMaker := newDataMaker()

	genMB := dataMaker.mb(0, true)
	err := store.CreateStreamStorage(
		ctx,
		streamId,
		&MiniblockDescriptor{
			Data:     []byte{},
			Snapshot: genMB.Snapshot,
		},
	)
	require.Error(err)
	require.True(IsRiverErrorCode(err, Err_INVALID_ARGUMENT))
	require.NoError(
		store.CreateStreamStorage(
			ctx,
			streamId,
			&MiniblockDescriptor{
				Data:     genMB.Data,
				Snapshot: genMB.Snapshot,
			},
		),
	)
	err = store.CreateStreamStorage(
		ctx,
		streamId,
		&MiniblockDescriptor{
			Data:     genMB.Data,
			Snapshot: genMB.Snapshot,
		},
	)
	require.Error(err)
	require.True(IsRiverErrorCode(err, Err_ALREADY_EXISTS))

	_, err = store.ReadStreamFromLastSnapshot(ctx, streamId, 10)
	require.NoError(err)
	_, err = store.GetLastMiniblockNumber(ctx, streamId)
	require.NoError(err)

	// Check empty value returns Err_NOT_FOUND
	_, err = params.pgStreamStore.pool.Exec(
		ctx,
		params.pgStreamStore.sqlForStream(
			"UPDATE {{miniblocks}} SET blockdata = ''::BYTEA WHERE stream_id = $1 AND seq_num = 0",
			streamId,
		),
		streamId,
	)
	require.NoError(err)

	_, err = store.ReadStreamFromLastSnapshot(ctx, streamId, 10)
	require.Error(err)
	require.True(IsRiverErrorCode(err, Err_NOT_FOUND))

	_, err = store.GetLastMiniblockNumber(ctx, streamId)
	require.Error(err)
	require.True(IsRiverErrorCode(err, Err_NOT_FOUND))

	// Check it's possible to overwrite corrupt record
	require.NoError(
		store.CreateStreamStorage(
			ctx,
			streamId,
			&MiniblockDescriptor{
				Data:     genMB.Data,
				Snapshot: genMB.Snapshot,
			},
		),
	)

	_, err = store.ReadStreamFromLastSnapshot(ctx, streamId, 10)
	require.NoError(err)
	_, err = store.GetLastMiniblockNumber(ctx, streamId)
	require.NoError(err)
}

func TestReadMiniblocks(t *testing.T) {
	params := setupStreamStorageTest(t)
	ctx := params.ctx
	store := params.pgStreamStore

	t.Run("returns error for non-existent stream", func(t *testing.T) {
		streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)

		miniblocks, _, err := store.ReadMiniblocks(ctx, streamId, 0, 10, false)
		require.Error(t, err)
		require.True(t, IsRiverErrorCode(err, Err_NOT_FOUND))
		require.Nil(t, miniblocks)
	})

	t.Run("reads full range of miniblocks", func(t *testing.T) {
		data := newDataMaker()
		streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)

		genesis := data.mb(0, true)
		require.NoError(t, store.CreateStreamStorage(ctx, streamId, &MiniblockDescriptor{
			Number:   0,
			Hash:     genesis.Hash,
			Data:     genesis.Data,
			Snapshot: genesis.Snapshot,
		}))

		miniblocks := []*MiniblockDescriptor{
			data.mb(1, false),
			data.mb(2, true),
			data.mb(3, false),
			data.mb(4, true),
		}
		require.NoError(t, store.WriteMiniblocks(ctx, streamId, miniblocks, 5, [][]byte{}, 1, 0))

		result, terminus, err := store.ReadMiniblocks(ctx, streamId, 0, 5, false)
		require.NoError(t, err)
		require.Len(t, result, 5)
		require.True(t, terminus)

		// Verify all miniblocks are returned in order
		for i, mb := range result {
			require.Equal(t, int64(i), mb.Number)
		}

		// Verify snapshots are included
		require.NotNil(t, result[0].Snapshot) // genesis has snapshot
		require.Nil(t, result[1].Snapshot)
		require.NotNil(t, result[2].Snapshot) // mb 2 has snapshot
		require.Nil(t, result[3].Snapshot)
		require.NotNil(t, result[4].Snapshot) // mb 4 has snapshot
	})

	t.Run("reads partial range of miniblocks", func(t *testing.T) {
		data := newDataMaker()
		streamId := testutils.FakeStreamId(STREAM_SPACE_BIN)

		genesis := data.mb(0, true)
		require.NoError(t, store.CreateStreamStorage(ctx, streamId, &MiniblockDescriptor{
			Number:   0,
			Hash:     genesis.Hash,
			Data:     genesis.Data,
			Snapshot: genesis.Snapshot,
		}))

		miniblocks := []*MiniblockDescriptor{
			data.mb(1, false),
			data.mb(2, true),
			data.mb(3, false),
			data.mb(4, true),
		}
		require.NoError(t, store.WriteMiniblocks(ctx, streamId, miniblocks, 5, [][]byte{}, 1, 0))

		// Read only miniblocks 2-4 (exclusive)
		result, terminus, err := store.ReadMiniblocks(ctx, streamId, 2, 4, false)
		require.NoError(t, err)
		require.Len(t, result, 2)
		require.False(t, terminus)
		require.Equal(t, int64(2), result[0].Number)
		require.Equal(t, int64(3), result[1].Number)
	})

	t.Run("omits snapshots when requested", func(t *testing.T) {
		data := newDataMaker()
		streamId := testutils.FakeStreamId(STREAM_USER_BIN)

		genesis := data.mb(0, true)
		require.NoError(t, store.CreateStreamStorage(ctx, streamId, &MiniblockDescriptor{
			Number:   0,
			Hash:     genesis.Hash,
			Data:     genesis.Data,
			Snapshot: genesis.Snapshot,
		}))

		miniblocks := []*MiniblockDescriptor{
			data.mb(1, false),
			data.mb(2, true),
		}
		require.NoError(t, store.WriteMiniblocks(ctx, streamId, miniblocks, 3, [][]byte{}, 1, 0))

		result, terminus, err := store.ReadMiniblocks(ctx, streamId, 0, 3, true) // omitSnapshot = true
		require.NoError(t, err)
		require.Len(t, result, 3)
		require.True(t, terminus)

		// All snapshots should be nil when omitted
		for _, mb := range result {
			require.Nil(t, mb.Snapshot)
		}
	})

	t.Run("returns empty slice for range with no miniblocks", func(t *testing.T) {
		data := newDataMaker()
		streamId := testutils.FakeStreamId(STREAM_DM_CHANNEL_BIN)

		genesis := data.mb(0, true)
		require.NoError(t, store.CreateStreamStorage(ctx, streamId, &MiniblockDescriptor{
			Number:   0,
			Hash:     genesis.Hash,
			Data:     genesis.Data,
			Snapshot: genesis.Snapshot,
		}))

		miniblocks := []*MiniblockDescriptor{
			data.mb(1, false),
			data.mb(2, false),
		}
		require.NoError(t, store.WriteMiniblocks(ctx, streamId, miniblocks, 3, [][]byte{}, 1, 0))

		// Request range beyond existing miniblocks
		result, terminus, err := store.ReadMiniblocks(ctx, streamId, 10, 20, false)
		require.NoError(t, err)
		require.Empty(t, result)
		require.True(t, terminus)
	})

	t.Run("reads miniblocks from trimmed stream", func(t *testing.T) {
		data := newDataMaker()
		streamId := testutils.FakeStreamId(STREAM_GDM_CHANNEL_BIN)

		genesis := data.mb(0, true)
		require.NoError(t, store.CreateStreamStorage(ctx, streamId, &MiniblockDescriptor{
			Number:   0,
			Hash:     genesis.Hash,
			Data:     genesis.Data,
			Snapshot: genesis.Snapshot,
		}))

		miniblocks := []*MiniblockDescriptor{
			data.mb(1, false),
			data.mb(2, true),
			data.mb(3, false),
			data.mb(4, true),
			data.mb(5, false),
		}
		require.NoError(t, store.WriteMiniblocks(ctx, streamId, miniblocks, 6, [][]byte{}, 1, 0))

		// Trim the stream to miniblock 2
		require.NoError(t, store.TrimStream(ctx, streamId, 2, nil))

		// Verify ranges after trim
		ranges, err := store.GetMiniblockNumberRanges(ctx, streamId)
		require.NoError(t, err)
		require.Len(t, ranges, 1)
		require.Equal(t, int64(2), ranges[0].StartInclusive)
		require.Equal(t, int64(5), ranges[0].EndInclusive)

		// Read miniblocks from the trimmed range - should return only existing miniblocks
		result, terminus, err := store.ReadMiniblocks(ctx, streamId, 0, 6, false)
		require.NoError(t, err)
		// Should return miniblocks 2-5 (4 total), not 0-5
		require.Len(t, result, 4)
		require.True(t, terminus)
		require.Equal(t, int64(2), result[0].Number)
		require.Equal(t, int64(5), result[3].Number)

		// Read only existing range
		result, terminus, err = store.ReadMiniblocks(ctx, streamId, 2, 6, false)
		require.NoError(t, err)
		require.Len(t, result, 4)
		require.True(t, terminus)

		// Read partial existing range
		result, terminus, err = store.ReadMiniblocks(ctx, streamId, 3, 5, false)
		require.NoError(t, err)
		require.Len(t, result, 2)
		require.False(t, terminus)
		require.Equal(t, int64(3), result[0].Number)
		require.Equal(t, int64(4), result[1].Number)
	})

	t.Run("reports legacy snapshots inside ranges", func(t *testing.T) {
		data := newDataMaker()
		streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)

		genesis := makeLegacySnapshotDescriptor(t, 0)
		require.NoError(t, store.CreateStreamStorage(ctx, streamId, genesis))

		block1 := data.mb(1, false)
		block2 := data.mb(2, false)
		miniblocks := []*MiniblockDescriptor{
			block1,
			block2,
			data.mb(3, false),
			makeLegacySnapshotDescriptor(t, 4),
		}
		require.NoError(t, store.WriteMiniblocks(ctx, streamId, miniblocks, 5, [][]byte{}, 1, 0))

		require.NoError(t, store.TrimStream(ctx, streamId, 3, nil))

		ranges, err := store.GetMiniblockNumberRanges(ctx, streamId)
		require.NoError(t, err)
		require.Len(t, ranges, 1)
		require.Equal(t, int64(3), ranges[0].StartInclusive)
		require.Equal(t, int64(4), ranges[0].EndInclusive)
		require.Equal(t, []int64{4}, ranges[0].SnapshotSeqNums)
	})

	t.Run("reads miniblocks from stream with gaps", func(t *testing.T) {
		data := newDataMaker()
		streamId := testutils.FakeStreamId(STREAM_MEDIA_BIN)

		// Create stream with miniblocks 10-15
		err := store.ReinitializeStreamStorage(
			ctx,
			streamId,
			[]*MiniblockDescriptor{
				data.mb(10, true),
				data.mb(11, false),
				data.mb(12, false),
				data.mb(13, true),
				data.mb(14, false),
				data.mb(15, false),
			},
			10,
			false,
		)
		require.NoError(t, err)

		// Add preceding miniblocks 0-2 (creating a gap at 3-9)
		err = store.WritePrecedingMiniblocks(
			ctx,
			streamId,
			[]*MiniblockDescriptor{
				data.mb(0, true),
				data.mb(1, false),
				data.mb(2, false),
			},
		)
		require.NoError(t, err)

		// Verify ranges show the gap
		ranges, err := store.GetMiniblockNumberRanges(ctx, streamId)
		require.NoError(t, err)
		require.Len(t, ranges, 2)
		require.Equal(t, int64(0), ranges[0].StartInclusive)
		require.Equal(t, int64(2), ranges[0].EndInclusive)
		require.Equal(t, int64(10), ranges[1].StartInclusive)
		require.Equal(t, int64(15), ranges[1].EndInclusive)

		// Read from first range
		result, terminus, err := store.ReadMiniblocks(ctx, streamId, 0, 3, false)
		require.NoError(t, err)
		require.Len(t, result, 3)
		require.True(t, terminus)
		require.Equal(t, int64(0), result[0].Number)
		require.Equal(t, int64(2), result[2].Number)

		// Read from second range
		result, terminus, err = store.ReadMiniblocks(ctx, streamId, 10, 16, false)
		require.NoError(t, err)
		require.Len(t, result, 6)
		require.True(t, terminus)
		require.Equal(t, int64(10), result[0].Number)
		require.Equal(t, int64(15), result[5].Number)

		// Read across the gap - should return error due to consistency violation
		_, _, err = store.ReadMiniblocks(ctx, streamId, 0, 16, false)
		require.Error(t, err)
		require.True(t, IsRiverErrorCode(err, Err_MINIBLOCKS_NOT_FOUND))
	})

	t.Run("reads from stream starting at non-zero miniblock", func(t *testing.T) {
		data := newDataMaker()
		streamId := testutils.FakeStreamId(STREAM_USER_SETTINGS_BIN)

		// Create stream starting at miniblock 100
		err := store.ReinitializeStreamStorage(
			ctx,
			streamId,
			[]*MiniblockDescriptor{
				data.mb(100, true),
				data.mb(101, false),
				data.mb(102, true),
			},
			100,
			false,
		)
		require.NoError(t, err)

		// Request miniblocks from 0 - should return empty since stream starts at 100
		result, terminus, err := store.ReadMiniblocks(ctx, streamId, 0, 50, false)
		require.NoError(t, err)
		require.Empty(t, result)
		require.True(t, terminus)

		// Request miniblocks from 100
		result, terminus, err = store.ReadMiniblocks(ctx, streamId, 100, 103, false)
		require.NoError(t, err)
		require.Len(t, result, 3)
		require.True(t, terminus)
		require.Equal(t, int64(100), result[0].Number)
		require.Equal(t, int64(102), result[2].Number)

		// Request partial range
		result, terminus, err = store.ReadMiniblocks(ctx, streamId, 101, 103, false)
		require.NoError(t, err)
		require.Len(t, result, 2)
		require.False(t, terminus)
		require.Equal(t, int64(101), result[0].Number)
		require.Equal(t, int64(102), result[1].Number)
	})

	t.Run("terminus is true when fromInclusive is 0", func(t *testing.T) {
		data := newDataMaker()
		streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)

		genesis := data.mb(0, true)
		require.NoError(t, store.CreateStreamStorage(ctx, streamId, &MiniblockDescriptor{
			Number:   0,
			Hash:     genesis.Hash,
			Data:     genesis.Data,
			Snapshot: genesis.Snapshot,
		}))

		miniblocks := []*MiniblockDescriptor{
			data.mb(1, false),
			data.mb(2, true),
		}
		require.NoError(t, store.WriteMiniblocks(ctx, streamId, miniblocks, 3, [][]byte{}, 1, 0))

		// Request from 0 - terminus should always be true
		result, terminus, err := store.ReadMiniblocks(ctx, streamId, 0, 3, false)
		require.NoError(t, err)
		require.Len(t, result, 3)
		require.True(t, terminus, "Terminus should be true when requesting from 0")
	})

	t.Run("terminus is false when preceding miniblock exists", func(t *testing.T) {
		data := newDataMaker()
		streamId := testutils.FakeStreamId(STREAM_SPACE_BIN)

		genesis := data.mb(0, true)
		require.NoError(t, store.CreateStreamStorage(ctx, streamId, &MiniblockDescriptor{
			Number:   0,
			Hash:     genesis.Hash,
			Data:     genesis.Data,
			Snapshot: genesis.Snapshot,
		}))

		miniblocks := []*MiniblockDescriptor{
			data.mb(1, false),
			data.mb(2, true),
			data.mb(3, false),
			data.mb(4, true),
		}
		require.NoError(t, store.WriteMiniblocks(ctx, streamId, miniblocks, 5, [][]byte{}, 1, 0))

		// Request from 2 - miniblock 1 exists, so terminus should be false
		result, terminus, err := store.ReadMiniblocks(ctx, streamId, 2, 5, false)
		require.NoError(t, err)
		require.Len(t, result, 3)
		require.Equal(t, int64(2), result[0].Number)
		require.False(t, terminus, "Terminus should be false when preceding miniblock exists")

		// Request from 1 - miniblock 0 exists, so terminus should be false
		result, terminus, err = store.ReadMiniblocks(ctx, streamId, 1, 5, false)
		require.NoError(t, err)
		require.Len(t, result, 4)
		require.Equal(t, int64(1), result[0].Number)
		require.False(t, terminus, "Terminus should be false when preceding miniblock exists")
	})

	t.Run("terminus is true when stream is trimmed", func(t *testing.T) {
		data := newDataMaker()
		streamId := testutils.FakeStreamId(STREAM_DM_CHANNEL_BIN)

		genesis := data.mb(0, true)
		require.NoError(t, store.CreateStreamStorage(ctx, streamId, &MiniblockDescriptor{
			Number:   0,
			Hash:     genesis.Hash,
			Data:     genesis.Data,
			Snapshot: genesis.Snapshot,
		}))

		miniblocks := []*MiniblockDescriptor{
			data.mb(1, false),
			data.mb(2, true),
			data.mb(3, false),
			data.mb(4, true),
			data.mb(5, false),
		}
		require.NoError(t, store.WriteMiniblocks(ctx, streamId, miniblocks, 6, [][]byte{}, 1, 0))

		// Trim the stream to miniblock 3
		require.NoError(t, store.TrimStream(ctx, streamId, 3, nil))

		// Request from trim point (3) - miniblock 2 doesn't exist, so terminus should be true
		result, terminus, err := store.ReadMiniblocks(ctx, streamId, 3, 6, false)
		require.NoError(t, err)
		require.Len(t, result, 3)
		require.Equal(t, int64(3), result[0].Number)
		require.True(t, terminus, "Terminus should be true when requesting from trim point")

		// Request from after trim point (4) - miniblock 3 exists, so terminus should be false
		result, terminus, err = store.ReadMiniblocks(ctx, streamId, 4, 6, false)
		require.NoError(t, err)
		require.Len(t, result, 2)
		require.Equal(t, int64(4), result[0].Number)
		require.False(t, terminus, "Terminus should be false when preceding miniblock exists after trim point")
	})

	t.Run("terminus is true when stream starts at non-zero miniblock", func(t *testing.T) {
		data := newDataMaker()
		streamId := testutils.FakeStreamId(STREAM_USER_BIN)

		// Create stream starting at miniblock 50
		err := store.ReinitializeStreamStorage(
			ctx,
			streamId,
			[]*MiniblockDescriptor{
				data.mb(50, true),
				data.mb(51, false),
				data.mb(52, true),
			},
			50,
			false,
		)
		require.NoError(t, err)

		// Request from 0 - terminus should be true (we're at the beginning)
		// Returns miniblocks 50-52 since those are the only ones in the range
		result, terminus, err := store.ReadMiniblocks(ctx, streamId, 0, 53, false)
		require.NoError(t, err)
		require.Len(t, result, 3)
		require.Equal(t, int64(50), result[0].Number)
		require.True(t, terminus, "Terminus should be true when requesting from 0")

		// Request from 50 (first available) - miniblock 49 doesn't exist, so terminus should be true
		result, terminus, err = store.ReadMiniblocks(ctx, streamId, 50, 53, false)
		require.NoError(t, err)
		require.Len(t, result, 3)
		require.Equal(t, int64(50), result[0].Number)
		require.True(t, terminus, "Terminus should be true when requesting from first available miniblock")

		// Request from 51 - miniblock 50 exists, so terminus should be false
		result, terminus, err = store.ReadMiniblocks(ctx, streamId, 51, 53, false)
		require.NoError(t, err)
		require.Len(t, result, 2)
		require.Equal(t, int64(51), result[0].Number)
		require.False(t, terminus, "Terminus should be false when preceding miniblock exists")
	})
}
