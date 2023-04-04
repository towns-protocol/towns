package storage_test

import (
	"context"
	"errors"
	"fmt"
	"os"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgconn"
	_ "github.com/lib/pq"
	log "github.com/sirupsen/logrus"
	"github.com/stretchr/testify/assert"

	"casablanca/node/infra"
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
	ctx, _, _ := infra.SetLoggerWithRequestId(context.Background())
	// Create a new PGEventStore
	pgEventStore, err := storage.NewPGEventStore(ctx, testDatabaseUrl, true)
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

	foundStreamIdx := -1
	for idx, stream := range streams {
		if string(stream) == streamId {
			foundStreamIdx = idx
		}
	}
	if foundStreamIdx == -1 {
		t.Fatal("Expected to find stream streamid1, found none")
	}

	cookie, err := pgEventStore.AddEvent(ctx, streamId, inceptionEvent)
	if err != nil {
		t.Fatal(err)
	}

	seq, cookieStr := storage.BytesToSeqNum(cookie)
	if cookieStr != streamId {
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

	cookie0 := storage.SeqNumToBytes(0, streamId)
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
	ctx, _, _ := infra.SetLoggerWithRequestId(context.Background())

	// Create a new PGEventStore
	pgEventStore, err := storage.NewPGEventStore(ctx, testDatabaseUrl, true)
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
		cookie0 := storage.SeqNumToBytes(0, streamId)
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
		ctx, cancel := context.WithCancel(ctx)
		defer cancel()
		ctx, _, requestId := infra.SetLoggerWithRequestId(ctx)
		// 40s will exceed the 30s timeout of the test
		events, err := pgEventStore.SyncStreams(ctx, []*protocol.SyncPos{{StreamId: streamId, SyncCookie: cookie1}}, -1, 40000)
		assert.Nil(t, err, requestId)
		assert.NotNil(t, events, requestId)
		assert.Len(t, events, 1, requestId)
		assert.Greater(t, len(cookie1), 8, requestId)
		sq1, _ := storage.BytesToSeqNum(cookie1)
		sq2, _ := storage.BytesToSeqNum(events[string(streamId)].SyncCookie)
		assert.Equal(t, sq1+1, sq2, requestId)
	}

	for i := 0; i < 10; i++ {
		wg.Add(1)
		go successfulPoll()
	}

	wg.Wait()
}

func TestPGEventStoreLongPollStress(t *testing.T) {

	totalMessages := 200

	ctx, _, requestId := infra.SetLoggerWithRequestId(context.Background())
	// Create a new PGEventStore
	pgEventStore, err := storage.NewPGEventStore(ctx, testDatabaseUrl, true)
	if err != nil {
		t.Fatal(err)
	}
	defer pgEventStore.Close()

	streamId := "streamid1"

	userId := []byte{0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9}
	inceptionEvent1, err := testutils.UserStreamInceptionEvent(1, userId, "streamid1")
	if err != nil {
		t.Fatal(err, requestId)
	}
	inceptionEvents := []*protocol.Envelope{inceptionEvent1}
	cookie1, err := pgEventStore.CreateStream(ctx, streamId, inceptionEvents)
	if err != nil {
		t.Fatal(err, requestId)
	}

	wg := sync.WaitGroup{}
	// create a message in parallel after 1000ms
	idx := atomic.Int32{}
	idx.Store(1000)
	insert := func(sleepMs int) {
		defer wg.Done()
		ctx, log, _ := infra.SetLoggerWithRequestId(context.Background())

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
			ctx, log, requestId := infra.SetLoggerWithRequestId(context.Background())
			events, err := pgEventStore.SyncStreams(ctx, []*protocol.SyncPos{{StreamId: streamId, SyncCookie: syncCookie}}, -1, 1000)
			if err != nil {
				if errors.Is(err, context.DeadlineExceeded) {
					log.Warnf("deadline exceeded %d", i)
					continue
				}
				if pgconn.SafeToRetry(err) {
					log.Warnf("safe to retry %d", i)
					continue
				}
			}
			assert.Nil(t, err)
			if len(events) != 0 {
				counter += len(events[streamId].Events)
				syncCookie = events[string(streamId)].SyncCookie
			}
			for _, e := range events[streamId].Events {
				if _, ok := allHashes[string(e.Hash)]; !ok {
					panic(fmt.Sprintf("%d hash %s not found (requestId: %s)", i, string(e.Hash), requestId))
				}
				delete(allHashes, string(e.Hash))
			}

			hashes := strings.Builder{}
			for e := range allHashes {
				hashes.WriteString(e)
				hashes.WriteString(",")
			}
			c, s := storage.BytesToSeqNum(syncCookie)
			log.Infof("%d counter %d %d:%s missing %s", i, counter, c, s, hashes.String())
		}
	}

	for i := 0; i < 300; i++ {
		wg.Add(1)
		go poll(i)
		//time.Sleep(20 * time.Millisecond)
	}

	wg.Wait()
}
