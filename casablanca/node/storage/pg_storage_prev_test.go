package storage_test

import (
	"context"
	"os"
	"reflect"
	"testing"

	_ "github.com/lib/pq"

	"casablanca/node/crypto"
	"casablanca/node/events"
	"casablanca/node/protocol"
	"casablanca/node/storage"
	"casablanca/node/testutils"
)

var testDatabaseUrl string

func TestMain(m *testing.M) {
	dbUrl, closer, err := testutils.StartDB(context.Background())
	if err != nil {
		panic("Could not connect to docker" + err.Error())
	}
	defer closer()
	testDatabaseUrl = dbUrl

	//Run tests
	code := m.Run()

	// You can't defer this because os.Exit doesn't care for defer

	os.Exit(code)
}

func TestPGEventStore(t *testing.T) {
	ctx := context.Background()
	// Create a new PGEventStore
	pgEventStore, err := storage.NewPGEventStore(ctx, testDatabaseUrl, true)
	if err != nil {
		t.Fatal(err)
	}
	defer pgEventStore.Close()

	streamId := "streamid1"

	wallet, _ := crypto.NewWallet(ctx)
	inceptionEvent, err := events.MakeEnvelopeWithPayload(
		wallet,
		events.Make_UserPayload_Inception(streamId, nil),
		nil,
	)
	if err != nil {
		t.Fatal(err)
	}

	// Create a new stream
	inceptionEvents := []*protocol.Envelope{inceptionEvent}
	err = pgEventStore.CreateStream(ctx, streamId, inceptionEvents)
	if err != nil {
		t.Fatal(err)
	}

	streams, err := pgEventStore.GetStreams(ctx)
	if err != nil {
		t.Fatal(err)
	}

	foundStreamIdx := -1
	for idx, stream := range streams {
		if string(stream) == streamId {
			foundStreamIdx = idx
		}
	}
	if foundStreamIdx == -1 {
		t.Fatal("Expected to find stream streamid1, found none")
	}

	err = pgEventStore.AddEvent(ctx, streamId, inceptionEvent)
	if err != nil {
		t.Fatal(err)
	}

	err = pgEventStore.DeleteStream(ctx, streamId)
	if err != nil {
		t.Fatal(err)
	}
	streams, err = pgEventStore.GetStreams(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if len(streams) != 0 {
		t.Fatal("Expected 0 streams, got ", len(streams))
	}
}

func TestPostgresEventStore(t *testing.T) {
	ctx := context.Background()
	// Create a new PGEventStore
	pgEventStore, err := storage.NewPostgresEventStore(ctx, testDatabaseUrl, true)
	if err != nil {
		t.Fatal(err)
	}
	defer pgEventStore.Close()

	streamId1 := "streamid1"
	streamId2 := "streamid2"
	streamId3 := "streamid3"

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
	streamsOrder1 = append(streamsOrder1, "streamid1", "streamid2")

	var streamsOrder2 []string
	streamsOrder2 = append(streamsOrder1, "streamid2", "streamid1")

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
	streamsOrder1 = append(streamsOrder1, "streamid1", "streamid3")

	streamsOrder2 = streamsOrder2[:0]
	streamsOrder2 = append(streamsOrder2, "streamid3", "streamid1")

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

	//Test that we can delete all streams
	err = pgEventStore.DeleteAllStreams(ctx)

	if err != nil {
		t.Fatal(err)
	}

	streams, err = pgEventStore.GetStreams(ctx)
	if err != nil {
		t.Fatal(err)
	}

	if len(streams) != 0 {
		t.Fatal("Expected 0 streams, got ", len(streams))
	}
}
