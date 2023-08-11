package storage_test

import (
	"context"
	"os"
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
