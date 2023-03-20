package storage_test

import (
	"context"
	"fmt"
	"os"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	_ "github.com/lib/pq"
	log "github.com/sirupsen/logrus"
	"github.com/stretchr/testify/assert"

	"casablanca/node/protocol"
	"casablanca/node/storage"
	"casablanca/node/testutils"
)

var testDatabaseUrl string

func TestMain(m *testing.M) {
	log.SetLevel(log.DebugLevel)

	dbUrl, closer, err := testutils.StartDB(context.Background())
	if err != nil {
		log.Fatalf("Could not connect to docker: %s", err)
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
	pgEventStore, err := storage.NewPGEventStore(ctx, testDatabaseUrl)
	if err != nil {
		t.Fatal(err)
	}
	defer pgEventStore.Close()

	userId := []byte{0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9}
	inceptionEvent, err := testutils.UserStreamInceptionEvent(1, userId, "streamid1")
	if err != nil {
		t.Fatal(err)
	}

	// Create a new stream
	streamId := "streamid1"
	inceptionEvents := []*protocol.Envelope{inceptionEvent}
	_, err = pgEventStore.CreateStream(ctx, streamId, inceptionEvents)
	if err != nil {
		t.Fatal(err)
	}

	streams, err := pgEventStore.GetStreams(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if len(streams) != 1 {
		t.Fatal("Expected 1 stream, got ", len(streams))
	}
	if string(streams[0]) != "streamid1" {
		t.Fatal("Expected table name streamid got ", streams[0])
	}

	cookie0 := storage.SeqNumToBytes(0)

	cookie, err := pgEventStore.AddEvent(ctx, streamId, inceptionEvent)
	if err != nil {
		t.Fatal(err)
	}

	seq, err := storage.BytesToSeqNum(cookie), nil
	if err != nil {
		t.Fatal(err)
	}

	assert.Equal(t, int64(2), seq)

	// test sync
	cookie2a, err := pgEventStore.AddEvent(ctx, streamId, inceptionEvent)
	if err != nil {
		t.Fatal(err)
	}
	if cookie2a == nil {
		t.Fatal("cookie2 is nil")
	}
	eventsPos, err := pgEventStore.SyncStreams(ctx, []*protocol.SyncPos{{StreamId: streamId, SyncCookie: cookie0}}, -1, 1000)
	if err != nil {
		t.Fatal(err)
	}
	if len(eventsPos) != 1 {
		t.Fatal("Expected 1 event, got ", len(eventsPos))
	}
	assert.Equal(t, cookie2a, eventsPos[string(streamId)].SyncCookie)

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

func TestPGEventStoreLongPoll(t *testing.T) {
	ctx := context.Background()
	// Create a new PGEventStore
	pgEventStore, err := storage.NewPGEventStore(ctx, testDatabaseUrl)
	if err != nil {
		t.Fatal(err)
	}
	defer pgEventStore.Close()

	streamId := "streamid1"

	userId := []byte{0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9}
	inceptionEvent1, err := testutils.UserStreamInceptionEvent(1, userId, "streamid1")
	if err != nil {
		t.Fatal(err)
	}
	inceptionEvents := []*protocol.Envelope{inceptionEvent1}
	cookie1, err := pgEventStore.CreateStream(ctx, streamId, inceptionEvents)
	if err != nil {
		t.Fatal(err)
	}

	wg := sync.WaitGroup{}
	wg.Add(1)
	// create a message in parallel after 1000ms
	go func() {
		defer wg.Done()
		time.Sleep(1 * time.Second)

		inceptionEvent2, err := testutils.UserStreamInceptionEvent(2, userId, "streamid1")
		if err != nil {
			log.Error(err)
			return
		}
		_, err = pgEventStore.AddEvent(ctx, streamId, inceptionEvent2)
		if err != nil {
			log.Error(err)
			return
		}
	}()

	// check long poll in the first 100ms (must be no event)
	{
		events, err := pgEventStore.SyncStreams(ctx, []*protocol.SyncPos{{StreamId: streamId, SyncCookie: cookie1}}, -1, 100)
		if err != nil {
			t.Fatal(err)
		}
		if len(events) != 0 {
			t.Fatal("Expected 0 events, got ", len(events))
		}
	}

	// check long poll from 0 sequence (must be one event)
	{
		cookie0 := storage.SeqNumToBytes(0)
		events, err := pgEventStore.SyncStreams(ctx, []*protocol.SyncPos{{StreamId: streamId, SyncCookie: cookie0}}, -1, 50)
		if err != nil {
			t.Fatal(err)
		}
		if len(events) != 1 {
			t.Fatal("Expected 1 events, got ", len(events))
		}
		assert.Equal(t, cookie1, events[string(streamId)].SyncCookie)
	}

	// check long poll for the 1000ms (must be one event)
	successfulPoll := func() {
		defer wg.Done()
		events, err := pgEventStore.SyncStreams(ctx, []*protocol.SyncPos{{StreamId: streamId, SyncCookie: cookie1}}, -1, 10000)
		assert.Nil(t, err)
		assert.NotNil(t, events)
		assert.Len(t, events, 1)
		assert.Len(t, cookie1, 8)
		assert.Equal(t, storage.BytesToSeqNum(cookie1)+1, storage.BytesToSeqNum(events[string(streamId)].SyncCookie))
	}

	for i := 0; i < 10; i++ {
		wg.Add(1)
		go successfulPoll()
	}

	wg.Wait()
}

func TestPGEventStoreLongPollStress(t *testing.T) {

	totalMessages := 200

	ctx := context.Background()
	// Create a new PGEventStore
	pgEventStore, err := storage.NewPGEventStore(ctx, testDatabaseUrl)
	if err != nil {
		t.Fatal(err)
	}
	defer pgEventStore.Close()

	streamId := "streamid1"

	userId := []byte{0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9}
	inceptionEvent1, err := testutils.UserStreamInceptionEvent(1, userId, "streamid1")
	if err != nil {
		t.Fatal(err)
	}
	inceptionEvents := []*protocol.Envelope{inceptionEvent1}
	cookie1, err := pgEventStore.CreateStream(ctx, streamId, inceptionEvents)
	if err != nil {
		t.Fatal(err)
	}

	wg := sync.WaitGroup{}
	// create a message in parallel after 1000ms
	idx := atomic.Int32{}
	idx.Store(1000)
	insert := func(sleepMs int) {
		defer wg.Done()

		time.Sleep(time.Duration(sleepMs) * time.Millisecond)

		msg, err := testutils.MessageEvent(int(idx.Add(1)), userId, "streamid1", []byte("hello"))
		if err != nil {
			log.Error(err)
			return
		}
		_, err = pgEventStore.AddEvent(ctx, streamId, msg)
		if err != nil {
			log.Error(err)
			return
		}
	}

	for i := 0; i < totalMessages; i++ {
		wg.Add(1)
		go insert(i * 10)
	}

	poll := func(i int) {
		defer wg.Done()
		counter := 0

		allHashes := make(map[string]struct{})
		for i := 0; i < totalMessages; i++ {
			allHashes[fmt.Sprintf("hash%d", 1001+i)] = struct{}{}
		}

		syncCookie := cookie1
		for counter < totalMessages {
			events, err := pgEventStore.SyncStreams(ctx, []*protocol.SyncPos{{StreamId: streamId, SyncCookie: syncCookie}}, -1, 1000)
			assert.Nil(t, err)
			if len(events) != 0 {
				counter += len(events[streamId].Events)
				syncCookie = events[string(streamId)].SyncCookie
			}
			for _, e := range events[streamId].Events {
				if _, ok := allHashes[string(e.Hash)]; !ok {
					panic(fmt.Sprintf("%d hash %s not found", i, string(e.Hash)))
				}
				delete(allHashes, string(e.Hash))
			}

			hashes := strings.Builder{}
			for e := range allHashes {
				hashes.WriteString(e)
				hashes.WriteString(",")
			}
			log.Infof("%d counter %d %d missing %s", i, storage.BytesToSeqNum(syncCookie), counter, hashes.String())
		}
	}

	for i := 0; i < 300; i++ {
		wg.Add(1)
		go poll(i)
		//time.Sleep(20 * time.Millisecond)
	}

	wg.Wait()
}
