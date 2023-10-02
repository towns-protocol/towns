package storage_test

import (
	"context"
	"os"
	"reflect"
	"testing"

	_ "github.com/lib/pq"

	"casablanca/node/crypto"
	"casablanca/node/events"
	"casablanca/node/storage"
	"casablanca/node/testutils"
)

var testDatabaseUrl string
var testSchemaName string

func TestMain(m *testing.M) {
	dbUrl, dbSchemaName, closer, err := testutils.StartDB(context.Background())
	if err != nil {
		panic("Could not connect to docker" + err.Error())
	}
	defer closer()
	testDatabaseUrl = dbUrl
	testSchemaName = dbSchemaName

	//Run tests
	code := m.Run()

	// You can't defer this because os.Exit doesn't care for defer

	os.Exit(code)
}

func TestPostgresEventStore(t *testing.T) {
	ctx := context.Background()
	// Create a new PGEventStore
	pgEventStore, err := storage.NewPostgresEventStore(ctx, testDatabaseUrl, testSchemaName, true)
	if err != nil {
		t.Fatal(err)
	}
	defer pgEventStore.Close()

	streamsNumber, _ := pgEventStore.GetStreamsNumber(ctx)
	if streamsNumber != 0 {
		t.Fatal("Expected to find zero streams, found different number")
	}

	streamId1 := "11-0sfdsf_sdfds1"
	streamId2 := "11-0sfdsf_sdfds2"
	streamId3 := "11-0sfdsf_sdfds3"

	wallet, _ := crypto.NewWallet(ctx)
	_, err = events.MakeEnvelopeWithPayload(
		wallet,
		events.Make_UserPayload_Inception(streamId1, nil),
		nil,
	)
	if err != nil {
		t.Fatal(err)
	}

	//Test that created stream will have proper genesis miniblock
	var genesisMiniblock = []byte("genesisMinoblock")
	err = pgEventStore.CreateStream(ctx, streamId1, genesisMiniblock)
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
