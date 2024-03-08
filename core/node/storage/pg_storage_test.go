package storage

import (
	"context"
	"os"
	"reflect"
	"testing"

	. "github.com/river-build/river/core/node/base"
	"github.com/river-build/river/core/node/base/test"
	. "github.com/river-build/river/core/node/protocol"
	. "github.com/river-build/river/core/node/shared"
	"github.com/river-build/river/core/node/testutils"
	"github.com/river-build/river/core/node/testutils/dbtestutils"

	"github.com/stretchr/testify/require"
)

var (
	testDatabaseUrl string
	testSchemaName  string
)

func setupTest(ctx context.Context) *PostgresEventStore {
	instanceId := GenShortNanoid()
	exitSignal := make(chan error, 1)
	store, err := NewPostgresEventStore(ctx, testDatabaseUrl, testSchemaName, instanceId, exitSignal)
	if err != nil {
		panic("Can't create event store: " + err.Error())
	}
	return store
}

func testMainImpl(m *testing.M) int {
	ctx := test.NewTestContext()
	dbUrl, dbSchemaName, closer, err := dbtestutils.StartDB(ctx)
	if err != nil {
		panic("Could not connect to docker" + err.Error())
	}

	defer closer()
	testDatabaseUrl = dbUrl
	testSchemaName = dbSchemaName

	// Run tests
	return m.Run()
}

func TestMain(m *testing.M) {
	// This allows deferes to run before os.Exit
	os.Exit(testMainImpl(m))
}

func TestPostgresEventStore(t *testing.T) {
	require := require.New(t)

	ctx := test.NewTestContext()
	pgEventStore := setupTest(ctx)
	defer pgEventStore.Close(ctx)

	streamsNumber, _ := pgEventStore.GetStreamsNumber(ctx)
	if streamsNumber != 0 {
		t.Fatal("Expected to find zero streams, found different number")
	}

	streamId1 := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	streamId2 := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	streamId3 := testutils.FakeStreamId(STREAM_CHANNEL_BIN)

	// Test that created stream will have proper genesis miniblock
	genesisMiniblock := []byte("genesisMinoblock")
	err := pgEventStore.CreateStreamStorage(ctx, streamId1, genesisMiniblock)
	if err != nil {
		t.Fatal(err)
	}

	streamsNumber, _ = pgEventStore.GetStreamsNumber(ctx)
	if streamsNumber != 1 {
		t.Fatal("Expected to find one stream, found different number")
	}

	streamFromLastSnaphot, streamRetrievalError := pgEventStore.ReadStreamFromLastSnapshot(ctx, streamId1, 0)

	if streamRetrievalError != nil {
		t.Fatal(streamRetrievalError)
	}

	if len(streamFromLastSnaphot.Miniblocks) != 1 {
		t.Fatal("Expected to find one minoblock, found different number")
	}

	if !reflect.DeepEqual(streamFromLastSnaphot.Miniblocks[0], genesisMiniblock) {
		t.Fatal("Expected to find original genesis block, found different")
	}

	if len(streamFromLastSnaphot.MinipoolEnvelopes) != 0 {
		t.Fatal("Expected minipool to be empty, found different", streamFromLastSnaphot.MinipoolEnvelopes)
	}

	// Test that we cannot add second stream with same id
	genesisMiniblock2 := []byte("genesisMinoblock2")
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
	genesisMiniblock3 := []byte("genesisMinoblock3")
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
		t.Fatal("Expected to find one minoblock, found different number")
	}

	if !reflect.DeepEqual(streamFromLastSnaphot.MinipoolEnvelopes[0], []byte("event1")) {
		t.Fatal("Expected to find original genesis block, found different")
	}
	var testEnvelopes [][]byte
	testEnvelopes = append(testEnvelopes, []byte("event2"))
	err = pgEventStore.WriteBlock(ctx, streamId1, 1, 1, []byte("block1"), false, testEnvelopes)

	if err != nil {
		t.Fatal("error creating block", err)
	}

	var testEnvelopes2 [][]byte
	testEnvelopes2 = append(testEnvelopes2, []byte("event3"))
	err = pgEventStore.WriteBlock(ctx, streamId1, 2, 1, []byte("block2"), true, testEnvelopes2)

	if err != nil {
		t.Fatal("error creating block with snapshot", err)
	}
}

func prepareTestDataForAddEventConsistencyCheck(ctx context.Context, s *PostgresEventStore, streamId StreamId) {
	genesisMiniblock := []byte("genesisMinoblock")
	_ = s.CreateStreamStorage(ctx, streamId, genesisMiniblock)
	_ = s.WriteEvent(ctx, streamId, 1, 0, []byte("event1"))
	_ = s.WriteEvent(ctx, streamId, 1, 1, []byte("event2"))
	_ = s.WriteEvent(ctx, streamId, 1, 2, []byte("event3"))
}

// Test that if there is an event with wrong generation in minipool, we will get error
func TestAddEventConsistencyChecksImproperGeneration(t *testing.T) {
	ctx := test.NewTestContext()
	pgEventStore := setupTest(ctx)
	defer pgEventStore.Close(ctx)
	require := require.New(t)

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
	ctx := test.NewTestContext()
	pgEventStore := setupTest(ctx)
	defer pgEventStore.Close(ctx)
	require := require.New(t)

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
	ctx := test.NewTestContext()
	pgEventStore := setupTest(ctx)
	defer pgEventStore.Close(ctx)
	require := require.New(t)

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
	ctx := test.NewTestContext()
	pgEventStore := setupTest(ctx)
	defer pgEventStore.Close(ctx)

	res, err := pgEventStore.ReadStreamFromLastSnapshot(context.Background(), testutils.FakeStreamId(STREAM_CHANNEL_BIN), 0)
	require.Nil(t, res)
	require.Error(t, err)
	require.Contains(t, err.Error(), "NOT_FOUND")
}

func TestCreateBlockConsistencyChecksProperNewMinipoolGeneration(t *testing.T) {
	ctx := test.NewTestContext()
	pgEventStore := setupTest(ctx)
	defer pgEventStore.Close(ctx)

	require := require.New(t)

	streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	genesisMiniblock := []byte("genesisMinoblock")
	_ = pgEventStore.CreateStreamStorage(ctx, streamId, genesisMiniblock)

	var testEnvelopes1 [][]byte
	testEnvelopes1 = append(testEnvelopes1, []byte("event1"))
	var testEnvelopes2 [][]byte
	testEnvelopes2 = append(testEnvelopes2, []byte("event2"))
	var testEnvelopes3 [][]byte
	testEnvelopes3 = append(testEnvelopes3, []byte("event3"))

	_ = pgEventStore.WriteBlock(ctx, streamId, 1, 1, []byte("block1"), true, testEnvelopes1)
	_ = pgEventStore.WriteBlock(ctx, streamId, 2, 1, []byte("block2"), false, testEnvelopes2)

	_, _ = pgEventStore.pool.Exec(ctx, "DELETE FROM miniblocks WHERE seq_num = 2")

	err := pgEventStore.WriteBlock(ctx, streamId, 3, 1, []byte("block3"), false, testEnvelopes3)

	require.NotNil(err)
	require.Contains(err.Error(), "Minipool generation missmatch")
	require.Equal(AsRiverError(err).GetTag("ActualNewMinipoolGeneration"), int64(2))
	require.Equal(AsRiverError(err).GetTag("ExpectedNewMinipoolGeneration"), int64(3))
}

func TestCreateBlockNoSuchStreamError(t *testing.T) {
	ctx := test.NewTestContext()
	pgEventStore := setupTest(ctx)
	defer pgEventStore.Close(ctx)

	require := require.New(t)

	streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	genesisMiniblock := []byte("genesisMinoblock")
	_ = pgEventStore.CreateStreamStorage(ctx, streamId, genesisMiniblock)

	_, _ = pgEventStore.pool.Exec(ctx, "DELETE FROM miniblocks")

	var testEnvelopes1 [][]byte
	testEnvelopes1 = append(testEnvelopes1, []byte("event1"))
	err := pgEventStore.WriteBlock(ctx, streamId, 1, 1, []byte("block1"), false, testEnvelopes1)

	require.NotNil(err)
	require.Contains(err.Error(), "No blocks for the stream found in block storage")
	require.Equal(AsRiverError(err).GetTag("streamId"), streamId)
}

func TestExitIfSecondStorageCreated(t *testing.T) {
	ctx := test.NewTestContext()
	pgEventStore := setupTest(ctx)
	defer pgEventStore.Close(ctx)

	exitSignal := make(chan error, 1)
	_, err := NewPostgresEventStore(ctx, testDatabaseUrl, testSchemaName, GenShortNanoid(), exitSignal)
	if err != nil {
		t.Fatal("Error creating new storage instance", err)
	}
	genesisMiniblock := []byte("genesisMinoblock")
	streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	err = pgEventStore.CreateStreamStorage(ctx, streamId, genesisMiniblock)
	require.NotNil(t, err)
	require.Contains(t, err.Error(), "No longer a current node")
}

// Test that if there is a gap in miniblocks sequence, we will get error
func TestGetStreamFromLastSnapshotConsistencyChecksMissingBlockFailure(t *testing.T) {
	ctx := test.NewTestContext()
	pgEventStore := setupTest(ctx)
	defer pgEventStore.Close(ctx)

	require := require.New(t)

	streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	genesisMiniblock := []byte("genesisMinoblock")
	_ = pgEventStore.CreateStreamStorage(ctx, streamId, genesisMiniblock)
	var testEnvelopes1 [][]byte
	testEnvelopes1 = append(testEnvelopes1, []byte("event1"))
	var testEnvelopes2 [][]byte
	testEnvelopes2 = append(testEnvelopes2, []byte("event2"))
	var testEnvelopes3 [][]byte
	testEnvelopes3 = append(testEnvelopes3, []byte("event3"))

	_ = pgEventStore.WriteBlock(ctx, streamId, 1, 1, []byte("block1"), true, testEnvelopes1)
	_ = pgEventStore.WriteBlock(ctx, streamId, 2, 1, []byte("block2"), false, testEnvelopes2)
	_ = pgEventStore.WriteBlock(ctx, streamId, 3, 1, []byte("block3"), false, testEnvelopes3)

	_, _ = pgEventStore.pool.Exec(ctx, "DELETE FROM miniblocks WHERE seq_num = 2")

	_, err := pgEventStore.getStreamFromLastSnapshot(ctx, streamId, 0)

	require.NotNil(err)
	require.Contains(err.Error(), "Miniblocks consistency violation - wrong block sequence number")
	require.Equal(AsRiverError(err).GetTag("ActualSeqNum"), int64(3))
	require.Equal(AsRiverError(err).GetTag("ExpectedSeqNum"), int64(2))
}

func TestGetStreamFromLastSnapshotConsistencyCheckWrongEnvelopeGeneration(t *testing.T) {
	ctx := test.NewTestContext()
	pgEventStore := setupTest(ctx)
	defer pgEventStore.Close(ctx)

	require := require.New(t)

	streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	genesisMiniblock := []byte("genesisMinoblock")
	_ = pgEventStore.CreateStreamStorage(ctx, streamId, genesisMiniblock)

	var testEnvelopes1 [][]byte
	testEnvelopes1 = append(testEnvelopes1, []byte("event1"))

	var testEnvelopes2 [][]byte
	testEnvelopes2 = append(testEnvelopes2, []byte("event2"))
	testEnvelopes2 = append(testEnvelopes2, []byte("event3"))

	_ = pgEventStore.WriteBlock(ctx, streamId, 1, 1, []byte("block1"), true, testEnvelopes1)
	_ = pgEventStore.WriteBlock(ctx, streamId, 2, 2, []byte("block2"), false, testEnvelopes2)

	_, _ = pgEventStore.pool.Exec(ctx, "UPDATE minipools SET generation = 777 WHERE slot_num = 1")

	_, err := pgEventStore.getStreamFromLastSnapshot(ctx, streamId, 0)

	require.NotNil(err)
	require.Contains(err.Error(), "Minipool consistency violation - wrong event generation")
	require.Equal(AsRiverError(err).GetTag("ActualGeneration"), int64(777))
	require.Equal(AsRiverError(err).GetTag("ExpectedGeneration"), int64(1))
}

func TestGetStreamFromLastSnapshotConsistencyCheckNoZeroIndexEnvelope(t *testing.T) {
	ctx := test.NewTestContext()
	pgEventStore := setupTest(ctx)
	defer pgEventStore.Close(ctx)

	require := require.New(t)

	streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	genesisMiniblock := []byte("genesisMinoblock")
	_ = pgEventStore.CreateStreamStorage(ctx, streamId, genesisMiniblock)

	var testEnvelopes1 [][]byte
	testEnvelopes1 = append(testEnvelopes1, []byte("event1"))

	var testEnvelopes2 [][]byte
	testEnvelopes2 = append(testEnvelopes2, []byte("event2"))
	testEnvelopes2 = append(testEnvelopes2, []byte("event3"))
	testEnvelopes2 = append(testEnvelopes2, []byte("event4"))

	_ = pgEventStore.WriteBlock(ctx, streamId, 1, 1, []byte("block1"), true, testEnvelopes1)
	_ = pgEventStore.WriteBlock(ctx, streamId, 2, 2, []byte("block2"), false, testEnvelopes2)

	_, _ = pgEventStore.pool.Exec(ctx, "DELETE FROM minipools WHERE slot_num = 0")

	_, err := pgEventStore.getStreamFromLastSnapshot(ctx, streamId, 0)

	require.NotNil(err)
	require.Contains(err.Error(), "Minipool consistency violation - slotNums are not sequential")
	require.Equal(AsRiverError(err).GetTag("ActualSlotNumber"), int64(1))
	require.Equal(AsRiverError(err).GetTag("ExpectedSlotNumber"), int64(0))
}

func TestGetStreamFromLastSnapshotConsistencyCheckGapInEnvelopesIndexes(t *testing.T) {
	ctx := test.NewTestContext()
	pgEventStore := setupTest(ctx)
	defer pgEventStore.Close(ctx)

	require := require.New(t)

	streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	genesisMiniblock := []byte("genesisMinoblock")
	_ = pgEventStore.CreateStreamStorage(ctx, streamId, genesisMiniblock)

	var testEnvelopes1 [][]byte
	testEnvelopes1 = append(testEnvelopes1, []byte("event1"))

	var testEnvelopes2 [][]byte
	testEnvelopes2 = append(testEnvelopes2, []byte("event2"))
	testEnvelopes2 = append(testEnvelopes2, []byte("event3"))
	testEnvelopes2 = append(testEnvelopes2, []byte("event4"))

	_ = pgEventStore.WriteBlock(ctx, streamId, 1, 1, []byte("block1"), true, testEnvelopes1)

	_ = pgEventStore.WriteBlock(ctx, streamId, 2, 2, []byte("block2"), false, testEnvelopes2)

	_, _ = pgEventStore.pool.Exec(ctx, "DELETE FROM minipools WHERE slot_num = 1")

	_, err := pgEventStore.getStreamFromLastSnapshot(ctx, streamId, 0)

	require.NotNil(err)
	require.Contains(err.Error(), "Minipool consistency violation - slotNums are not sequential")
	require.Equal(AsRiverError(err).GetTag("ActualSlotNumber"), int64(2))
	require.Equal(AsRiverError(err).GetTag("ExpectedSlotNumber"), int64(1))
}

func TestGetMiniblocksConsistencyChecks(t *testing.T) {
	ctx := test.NewTestContext()
	pgEventStore := setupTest(ctx)
	defer pgEventStore.Close(ctx)

	require := require.New(t)

	streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	genesisMiniblock := []byte("genesisMinoblock")
	_ = pgEventStore.CreateStreamStorage(ctx, streamId, genesisMiniblock)

	var testEnvelopes1 [][]byte
	testEnvelopes1 = append(testEnvelopes1, []byte("event1"))
	var testEnvelopes2 [][]byte
	testEnvelopes2 = append(testEnvelopes2, []byte("event2"))
	var testEnvelopes3 [][]byte
	testEnvelopes3 = append(testEnvelopes3, []byte("event3"))

	_ = pgEventStore.WriteBlock(ctx, streamId, 1, 1, []byte("block1"), true, testEnvelopes1)
	_ = pgEventStore.WriteBlock(ctx, streamId, 2, 1, []byte("block2"), false, testEnvelopes2)
	_ = pgEventStore.WriteBlock(ctx, streamId, 3, 1, []byte("block3"), false, testEnvelopes3)

	_, _ = pgEventStore.pool.Exec(ctx, "DELETE FROM miniblocks WHERE seq_num = 2")

	_, err := pgEventStore.ReadMiniblocks(ctx, streamId, 1, 4)

	require.NotNil(err)
	require.Contains(err.Error(), "Miniblocks consistency violation")
	require.Equal(AsRiverError(err).GetTag("ActualBlockNumber"), 3)
	require.Equal(AsRiverError(err).GetTag("ExpectedBlockNumber"), 2)
}

func TestAlreadyExists(t *testing.T) {
	ctx := test.NewTestContext()
	pgEventStore := setupTest(ctx)
	defer pgEventStore.Close(ctx)
	require := require.New(t)

	streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	genesisMiniblock := []byte("genesisMinoblock")
	err := pgEventStore.CreateStreamStorage(ctx, streamId, genesisMiniblock)
	require.NoError(err)

	err = pgEventStore.CreateStreamStorage(ctx, streamId, genesisMiniblock)
	require.Equal(Err_ALREADY_EXISTS, AsRiverError(err).Code)
}

func TestNotFound(t *testing.T) {
	ctx := test.NewTestContext()
	pgEventStore := setupTest(ctx)
	defer pgEventStore.Close(ctx)
	require := require.New(t)

	streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	result, err := pgEventStore.ReadStreamFromLastSnapshot(ctx, streamId, 0)
	require.Nil(result)
	require.Equal(Err_NOT_FOUND, AsRiverError(err).Code)
}
