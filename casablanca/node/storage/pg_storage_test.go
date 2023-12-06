package storage

import (
	. "casablanca/node/base"
	. "casablanca/node/shared"
	"casablanca/node/testutils/dbtestutils"
	"context"
	"os"
	"reflect"
	"testing"

	"github.com/stretchr/testify/assert"
)

var testDatabaseUrl string
var testSchemaName string
var pgEventStore *PostgresEventStore
var exitSignal chan error

func setupTest() func() {
	instanceId := GenShortNanoid()
	store, err := NewPostgresEventStore(context.Background(), testDatabaseUrl, testSchemaName, instanceId, true, exitSignal)
	if err != nil {
		panic("Can't create event store: " + err.Error())
	}
	pgEventStore = store
	return func() {
		pgEventStore.Close()
	}
}

func TestMain(m *testing.M) {
	dbUrl, dbSchemaName, closer, err := dbtestutils.StartDB(context.Background())
	if err != nil {
		panic("Could not connect to docker" + err.Error())
	}
	testDatabaseUrl = dbUrl
	testSchemaName = dbSchemaName

	exitSignal = make(chan error, 1)

	var code int = 1

	// Defer the cleanup so it always runs, even if something panics
	defer func() {
		pgEventStore.Close()
		closer()
		os.Exit(code)
	}()

	// Run tests
	code = m.Run()
}

func TestPostgresEventStore(t *testing.T) {
	teardownTest := setupTest()
	defer teardownTest()
	ctx := context.Background()

	streamsNumber, _ := pgEventStore.GetStreamsNumber(ctx)
	if streamsNumber != 0 {
		t.Fatal("Expected to find zero streams, found different number")
	}

	streamId1 := STREAM_CHANNEL_PREFIX_DASH + "0sfdsf_sdfds1"
	streamId2 := STREAM_CHANNEL_PREFIX_DASH + "0sfdsf_sdfds2"
	streamId3 := STREAM_CHANNEL_PREFIX_DASH + "0sfdsf_sdfds3"

	//Test that created stream will have proper genesis miniblock
	var genesisMiniblock = []byte("genesisMinoblock")
	err := pgEventStore.CreateStream(ctx, streamId1, genesisMiniblock)
	if err != nil {
		t.Fatal(err)
	}

	streamsNumber, _ = pgEventStore.GetStreamsNumber(ctx)
	if streamsNumber != 1 {
		t.Fatal("Expected to find one stream, found different number")
	}

	streamFromLastSnaphot, streamRetrievalError := pgEventStore.GetStreamFromLastSnapshot(ctx, streamId1, 0)

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

	//Test that we cannot add second stream with same id
	var genesisMiniblock2 = []byte("genesisMinoblock2")
	err = pgEventStore.CreateStream(ctx, streamId1, genesisMiniblock2)
	if err == nil {
		t.Fatal(err)
	}

	//Test that we can add second stream and then GetStreams will return both
	err = pgEventStore.CreateStream(ctx, streamId2, genesisMiniblock2)
	if err != nil {
		t.Fatal(err)
	}

	streams, err := pgEventStore.GetStreams(ctx)

	if err != nil {
		t.Fatal(err)
	}

	var streamsOrder1 []string
	streamsOrder1 = append(streamsOrder1, STREAM_CHANNEL_PREFIX_DASH+"0sfdsf_sdfds1", STREAM_CHANNEL_PREFIX_DASH+"0sfdsf_sdfds2")

	var streamsOrder2 []string
	streamsOrder2 = append(streamsOrder1, STREAM_CHANNEL_PREFIX_DASH+"0sfdsf_sdfds2", STREAM_CHANNEL_PREFIX_DASH+"0sfdsf_sdfds1")

	if !reflect.DeepEqual(streams, streamsOrder1) && !reflect.DeepEqual(streams, streamsOrder2) {
		t.Fatal("expected to find 2 streams, found something else")
	}

	//Test that we can delete stream and proper stream will be deleted
	var genesisMiniblock3 = []byte("genesisMinoblock3")
	err = pgEventStore.CreateStream(ctx, streamId3, genesisMiniblock3)
	if err != nil {
		t.Fatal(err)
	}

	err = pgEventStore.DeleteStream(ctx, streamId2)

	if err != nil {
		t.Fatal("Error of deleting stream", err)
	}

	streamsOrder1 = streamsOrder1[:0]
	streamsOrder1 = append(streamsOrder1, STREAM_CHANNEL_PREFIX_DASH+"0sfdsf_sdfds1", STREAM_CHANNEL_PREFIX_DASH+"0sfdsf_sdfds3")

	streamsOrder2 = streamsOrder2[:0]
	streamsOrder2 = append(streamsOrder2, STREAM_CHANNEL_PREFIX_DASH+"0sfdsf_sdfds3", STREAM_CHANNEL_PREFIX_DASH+"0sfdsf_sdfds1")

	streams, err = pgEventStore.GetStreams(ctx)

	if err != nil {
		t.Fatal(err)
	}

	if !reflect.DeepEqual(streams, streamsOrder1) && !reflect.DeepEqual(streams, streamsOrder2) {
		t.Fatal("expected to find 2 streams without one we deleted, found something else")
	}

	//Test that we can add event to stream and then retrieve it
	addEventError := pgEventStore.AddEvent(ctx, streamId1, 1, 0, []byte("event1"))

	if addEventError != nil {
		t.Fatal(streamRetrievalError)
	}

	streamFromLastSnaphot, streamRetrievalError = pgEventStore.GetStreamFromLastSnapshot(ctx, streamId1, 0)

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
	err = pgEventStore.CreateBlock(ctx, streamId1, 1, 1, []byte("block1"), false, testEnvelopes)

	if err != nil {
		t.Fatal("error creating block", err)
	}

	var testEnvelopes2 [][]byte
	testEnvelopes2 = append(testEnvelopes2, []byte("event3"))
	err = pgEventStore.CreateBlock(ctx, streamId1, 2, 1, []byte("block2"), true, testEnvelopes2)

	if err != nil {
		t.Fatal("error creating block with snapshot", err)
	}
}

func prepareTestDataForAddEventConsistencyCheck(ctx context.Context, streamId string) string {
	var genesisMiniblock = []byte("genesisMinoblock")
	_ = pgEventStore.CreateStream(ctx, streamId, genesisMiniblock)
	_ = pgEventStore.AddEvent(ctx, streamId, 1, 0, []byte("event1"))
	_ = pgEventStore.AddEvent(ctx, streamId, 1, 1, []byte("event2"))
	_ = pgEventStore.AddEvent(ctx, streamId, 1, 2, []byte("event3"))
	return streamId
}

// Test that if there is an event with wrong generation in minipool, we will get error
func TestAddEventConsistencyChecksImproperGeneration(t *testing.T) {
	teardownTest := setupTest()
	defer teardownTest()

	ctx := context.Background()
	assert := assert.New(t)

	streamId := STREAM_CHANNEL_PREFIX_DASH + "0sfdsf_sdfds1"

	prepareTestDataForAddEventConsistencyCheck(ctx, streamId)

	//Corrupt record in minipool
	_, _ = pgEventStore.pool.Exec(ctx, "UPDATE minipools SET generation = 777 WHERE slot_num = 1")
	err := pgEventStore.AddEvent(ctx, streamId, 1, 3, []byte("event4"))

	assert.NotNil(err)
	assert.Contains(err.Error(), "Wrong event generation in minipool")
	assert.Equal(AsRiverError(err).GetTag("ActualGeneration"), int64(777))
	assert.Equal(AsRiverError(err).GetTag("ExpectedGeneration"), int64(1))
	assert.Equal(AsRiverError(err).GetTag("SlotNumber"), 1)
}

// Test that if there is a gap in minipool records, we will get error
func TestAddEventConsistencyChecksGaps(t *testing.T) {
	teardownTest := setupTest()
	defer teardownTest()

	ctx := context.Background()
	assert := assert.New(t)

	streamId := STREAM_CHANNEL_PREFIX_DASH + "0sfdsf_sdfds1"

	prepareTestDataForAddEventConsistencyCheck(ctx, streamId)

	//Corrupt record in minipool
	_, _ = pgEventStore.pool.Exec(ctx, "DELETE FROM minipools WHERE slot_num = 1")
	err := pgEventStore.AddEvent(ctx, streamId, 1, 3, []byte("event4"))

	assert.NotNil(err)
	assert.Contains(err.Error(), "Wrong slot number in minipool")
	assert.Equal(AsRiverError(err).GetTag("ActualSlotNumber"), 2)
	assert.Equal(AsRiverError(err).GetTag("ExpectedSlotNumber"), 1)
}

// Test that if there is a wrong number minipool records, we will get error
func TestAddEventConsistencyChecksEventsNumberMismatch(t *testing.T) {
	teardownTest := setupTest()
	defer teardownTest()

	ctx := context.Background()
	assert := assert.New(t)

	streamId := STREAM_CHANNEL_PREFIX_DASH + "0sfdsf_sdfds1"

	prepareTestDataForAddEventConsistencyCheck(ctx, streamId)

	//Corrupt record in minipool
	_, _ = pgEventStore.pool.Exec(ctx, "DELETE FROM minipools WHERE slot_num = 2")
	err := pgEventStore.AddEvent(ctx, streamId, 1, 3, []byte("event4"))

	assert.NotNil(err)
	assert.Contains(err.Error(), "Wrong number of records in minipool")
	assert.Equal(AsRiverError(err).GetTag("ActualRecordsNumber"), 2)
	assert.Equal(AsRiverError(err).GetTag("ExpectedRecordsNumber"), 3)
}

func TestNoStream(t *testing.T) {
	teardownTest := setupTest()
	defer teardownTest()
	res, err := pgEventStore.GetStreamFromLastSnapshot(context.Background(), "noStream", 0)
	assert.Nil(t, res)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "NOT_FOUND")
}

func TestCreateBlockConsistencyChecksProperNewMinipoolGeneration(t *testing.T) {
	teardownTest := setupTest()
	defer teardownTest()

	ctx := context.Background()

	assert := assert.New(t)

	streamId := STREAM_CHANNEL_PREFIX_DASH + "0sfdsf_sdfds1"
	var genesisMiniblock = []byte("genesisMinoblock")
	_ = pgEventStore.CreateStream(ctx, streamId, genesisMiniblock)

	var testEnvelopes1 [][]byte
	testEnvelopes1 = append(testEnvelopes1, []byte("event1"))
	var testEnvelopes2 [][]byte
	testEnvelopes2 = append(testEnvelopes2, []byte("event2"))
	var testEnvelopes3 [][]byte
	testEnvelopes3 = append(testEnvelopes3, []byte("event3"))

	_ = pgEventStore.CreateBlock(ctx, streamId, 1, 1, []byte("block1"), true, testEnvelopes1)
	_ = pgEventStore.CreateBlock(ctx, streamId, 2, 1, []byte("block2"), false, testEnvelopes2)

	_, _ = pgEventStore.pool.Exec(ctx, "DELETE FROM miniblocks WHERE seq_num = 2")

	err := pgEventStore.CreateBlock(ctx, streamId, 3, 1, []byte("block3"), false, testEnvelopes3)

	assert.NotNil(err)
	assert.Contains(err.Error(), "Minipool generation missmatch")
	assert.Equal(AsRiverError(err).GetTag("ActualNewMinipoolGeneration"), int64(2))
	assert.Equal(AsRiverError(err).GetTag("ExpectedNewMinipoolGeneration"), int64(3))
}

func TestCreateBlockNoSuchStreamError(t *testing.T) {
	teardownTest := setupTest()
	defer teardownTest()

	ctx := context.Background()

	assert := assert.New(t)

	streamId := STREAM_CHANNEL_PREFIX_DASH + "0sfdsf_sdfds1"
	var genesisMiniblock = []byte("genesisMinoblock")
	_ = pgEventStore.CreateStream(ctx, streamId, genesisMiniblock)

	_, _ = pgEventStore.pool.Exec(ctx, "DELETE FROM miniblocks")

	var testEnvelopes1 [][]byte
	testEnvelopes1 = append(testEnvelopes1, []byte("event1"))
	err := pgEventStore.CreateBlock(ctx, streamId, 1, 1, []byte("block1"), false, testEnvelopes1)

	assert.NotNil(err)
	assert.Contains(err.Error(), "No blocks for the stream found in block storage")
	assert.Equal(AsRiverError(err).GetTag("streamId"), STREAM_CHANNEL_PREFIX_DASH+"0sfdsf_sdfds1")
}

func TestExitIfSecondStorageCreated(t *testing.T) {
	teardownTest := setupTest()
	defer teardownTest()
	ctx := context.Background()
	_, err := NewPostgresEventStore(context.Background(), testDatabaseUrl, testSchemaName, GenShortNanoid(), true, exitSignal)
	if err != nil {
		t.Fatal("Error creating new storage instance", err)
	}
	var genesisMiniblock = []byte("genesisMinoblock")
	streamId := STREAM_CHANNEL_PREFIX_DASH + "0sfdsf_sdfds1"
	err = pgEventStore.CreateStream(ctx, streamId, genesisMiniblock)
	assert.NotNil(t, err)
	assert.Contains(t, err.Error(), "Node number mismatch")
}

// Test that if there is a gap in miniblocks sequence, we will get error
func TestGetStreamFromLastSnapshotConsistencyChecksMissingBlockFailure(t *testing.T) {
	teardownTest := setupTest()
	defer teardownTest()

	ctx := context.Background()

	assert := assert.New(t)

	streamId := STREAM_CHANNEL_PREFIX_DASH + "0sfdsf_sdfds1"
	var genesisMiniblock = []byte("genesisMinoblock")
	_ = pgEventStore.CreateStream(ctx, streamId, genesisMiniblock)
	var testEnvelopes1 [][]byte
	testEnvelopes1 = append(testEnvelopes1, []byte("event1"))
	var testEnvelopes2 [][]byte
	testEnvelopes2 = append(testEnvelopes2, []byte("event2"))
	var testEnvelopes3 [][]byte
	testEnvelopes3 = append(testEnvelopes3, []byte("event3"))

	_ = pgEventStore.CreateBlock(ctx, streamId, 1, 1, []byte("block1"), true, testEnvelopes1)
	_ = pgEventStore.CreateBlock(ctx, streamId, 2, 1, []byte("block2"), false, testEnvelopes2)
	_ = pgEventStore.CreateBlock(ctx, streamId, 3, 1, []byte("block3"), false, testEnvelopes3)

	_, _ = pgEventStore.pool.Exec(ctx, "DELETE FROM miniblocks WHERE seq_num = 2")

	_, err := pgEventStore.getStreamFromLastSnapshot(ctx, streamId, 0)

	assert.NotNil(err)
	assert.Contains(err.Error(), "Miniblocks consistency violation - wrong block sequence number")
	assert.Equal(AsRiverError(err).GetTag("ActualSeqNum"), int64(3))
	assert.Equal(AsRiverError(err).GetTag("ExpectedSeqNum"), int64(2))
}

func TestGetStreamFromLastSnapshotConsistencyCheckWrongEnvelopeGeneration(t *testing.T) {
	teardownTest := setupTest()
	defer teardownTest()

	ctx := context.Background()

	assert := assert.New(t)

	streamId := STREAM_CHANNEL_PREFIX_DASH + "0sfdsf_sdfds1"
	var genesisMiniblock = []byte("genesisMinoblock")
	_ = pgEventStore.CreateStream(ctx, streamId, genesisMiniblock)

	var testEnvelopes1 [][]byte
	testEnvelopes1 = append(testEnvelopes1, []byte("event1"))

	var testEnvelopes2 [][]byte
	testEnvelopes2 = append(testEnvelopes2, []byte("event2"))
	testEnvelopes2 = append(testEnvelopes2, []byte("event3"))

	_ = pgEventStore.CreateBlock(ctx, streamId, 1, 1, []byte("block1"), true, testEnvelopes1)
	_ = pgEventStore.CreateBlock(ctx, streamId, 2, 2, []byte("block2"), false, testEnvelopes2)

	_, _ = pgEventStore.pool.Exec(ctx, "UPDATE minipools SET generation = 777 WHERE slot_num = 1")

	_, err := pgEventStore.getStreamFromLastSnapshot(ctx, streamId, 0)

	assert.NotNil(err)
	assert.Contains(err.Error(), "Minipool consistency violation - wrong event generation")
	assert.Equal(AsRiverError(err).GetTag("ActualGeneration"), int64(777))
	assert.Equal(AsRiverError(err).GetTag("ExpectedGeneration"), int64(1))
}

func TestGetStreamFromLastSnapshotConsistencyCheckNoZeroIndexEnvelope(t *testing.T) {
	teardownTest := setupTest()
	defer teardownTest()

	ctx := context.Background()

	assert := assert.New(t)

	streamId := STREAM_CHANNEL_PREFIX_DASH + "0sfdsf_sdfds1"
	var genesisMiniblock = []byte("genesisMinoblock")
	_ = pgEventStore.CreateStream(ctx, streamId, genesisMiniblock)

	var testEnvelopes1 [][]byte
	testEnvelopes1 = append(testEnvelopes1, []byte("event1"))

	var testEnvelopes2 [][]byte
	testEnvelopes2 = append(testEnvelopes2, []byte("event2"))
	testEnvelopes2 = append(testEnvelopes2, []byte("event3"))
	testEnvelopes2 = append(testEnvelopes2, []byte("event4"))

	_ = pgEventStore.CreateBlock(ctx, streamId, 1, 1, []byte("block1"), true, testEnvelopes1)
	_ = pgEventStore.CreateBlock(ctx, streamId, 2, 2, []byte("block2"), false, testEnvelopes2)

	_, _ = pgEventStore.pool.Exec(ctx, "DELETE FROM minipools WHERE slot_num = 0")

	_, err := pgEventStore.getStreamFromLastSnapshot(ctx, streamId, 0)

	assert.NotNil(err)
	assert.Contains(err.Error(), "Minipool consistency violation - slotNums are not sequential")
	assert.Equal(AsRiverError(err).GetTag("ActualSlotNumber"), int64(1))
	assert.Equal(AsRiverError(err).GetTag("ExpectedSlotNumber"), int64(0))
}

func TestGetStreamFromLastSnapshotConsistencyCheckGapInEnvelopesIndexes(t *testing.T) {
	teardownTest := setupTest()
	defer teardownTest()

	ctx := context.Background()

	assert := assert.New(t)

	streamId := STREAM_CHANNEL_PREFIX_DASH + "0sfdsf_sdfds1"
	var genesisMiniblock = []byte("genesisMinoblock")
	_ = pgEventStore.CreateStream(ctx, streamId, genesisMiniblock)

	var testEnvelopes1 [][]byte
	testEnvelopes1 = append(testEnvelopes1, []byte("event1"))

	var testEnvelopes2 [][]byte
	testEnvelopes2 = append(testEnvelopes2, []byte("event2"))
	testEnvelopes2 = append(testEnvelopes2, []byte("event3"))
	testEnvelopes2 = append(testEnvelopes2, []byte("event4"))

	_ = pgEventStore.CreateBlock(ctx, streamId, 1, 1, []byte("block1"), true, testEnvelopes1)

	_ = pgEventStore.CreateBlock(ctx, streamId, 2, 2, []byte("block2"), false, testEnvelopes2)

	_, _ = pgEventStore.pool.Exec(ctx, "DELETE FROM minipools WHERE slot_num = 1")

	_, err := pgEventStore.getStreamFromLastSnapshot(ctx, streamId, 0)

	assert.NotNil(err)
	assert.Contains(err.Error(), "Minipool consistency violation - slotNums are not sequential")
	assert.Equal(AsRiverError(err).GetTag("ActualSlotNumber"), int64(2))
	assert.Equal(AsRiverError(err).GetTag("ExpectedSlotNumber"), int64(1))
}

func TestGetMiniblocksConsistencyChecks(t *testing.T) {
	teardownTest := setupTest()
	defer teardownTest()

	ctx := context.Background()

	assert := assert.New(t)

	streamId := STREAM_CHANNEL_PREFIX_DASH + "0sfdsf_sdfds1"
	var genesisMiniblock = []byte("genesisMinoblock")
	_ = pgEventStore.CreateStream(ctx, streamId, genesisMiniblock)

	var testEnvelopes1 [][]byte
	testEnvelopes1 = append(testEnvelopes1, []byte("event1"))
	var testEnvelopes2 [][]byte
	testEnvelopes2 = append(testEnvelopes2, []byte("event2"))
	var testEnvelopes3 [][]byte
	testEnvelopes3 = append(testEnvelopes3, []byte("event3"))

	_ = pgEventStore.CreateBlock(ctx, streamId, 1, 1, []byte("block1"), true, testEnvelopes1)
	_ = pgEventStore.CreateBlock(ctx, streamId, 2, 1, []byte("block2"), false, testEnvelopes2)
	_ = pgEventStore.CreateBlock(ctx, streamId, 3, 1, []byte("block3"), false, testEnvelopes3)

	_, _ = pgEventStore.pool.Exec(ctx, "DELETE FROM miniblocks WHERE seq_num = 2")

	_, err := pgEventStore.GetMiniblocks(ctx, streamId, 1, 4)

	assert.NotNil(err)
	assert.Contains(err.Error(), "Miniblocks consistency violation")
	assert.Equal(AsRiverError(err).GetTag("ActualBlockNumber"), 3)
	assert.Equal(AsRiverError(err).GetTag("ExpectedBlockNumber"), 2)
}
