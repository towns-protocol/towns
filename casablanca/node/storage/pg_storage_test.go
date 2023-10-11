package storage

import (
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
	store, err := NewPostgresEventStore(context.Background(), testDatabaseUrl, testSchemaName, true, exitSignal)
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

	streamId1 := "11-0sfdsf_sdfds1"
	streamId2 := "11-0sfdsf_sdfds2"
	streamId3 := "11-0sfdsf_sdfds3"

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

	streamFromLastSnaphot, streamRetrievalError := pgEventStore.GetStreamFromLastSnapshot(ctx, streamId1)

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
	streamsOrder1 = append(streamsOrder1, "11-0sfdsf_sdfds1", "11-0sfdsf_sdfds2")

	var streamsOrder2 []string
	streamsOrder2 = append(streamsOrder1, "11-0sfdsf_sdfds2", "11-0sfdsf_sdfds1")

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
	streamsOrder1 = append(streamsOrder1, "11-0sfdsf_sdfds1", "11-0sfdsf_sdfds3")

	streamsOrder2 = streamsOrder2[:0]
	streamsOrder2 = append(streamsOrder2, "11-0sfdsf_sdfds3", "11-0sfdsf_sdfds1")

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

	streamFromLastSnaphot, streamRetrievalError = pgEventStore.GetStreamFromLastSnapshot(ctx, streamId1)

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

func TestNoStream(t *testing.T) {
	teardownTest := setupTest()
	defer teardownTest()
	res, err := pgEventStore.GetStreamFromLastSnapshot(context.Background(), "noStream")
	assert.Nil(t, res)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "NOT_FOUND")
}

func TestExitIfSecondStorageCreated(t *testing.T) {
	teardownTest := setupTest()
	defer teardownTest()
	ctx := context.Background()
	_, err := NewPostgresEventStore(context.Background(), testDatabaseUrl, testSchemaName, true, exitSignal)
	if err != nil {
		t.Fatal("Error creating new storage instance", err)
	}
	var genesisMiniblock = []byte("genesisMinoblock")
	streamId := "11-0sfdsf_sdfds1"
	err = pgEventStore.CreateStream(ctx, streamId, genesisMiniblock)
	assert.NotNil(t, err)
	assert.Contains(t, err.Error(), "Node number mismatch")
}
