package storage_test

import (
	"context"
	"errors"
	"fmt"
	"os"
	"sync"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgconn"
	_ "github.com/lib/pq"
	log "github.com/sirupsen/logrus"
	"github.com/stretchr/testify/assert"

	"casablanca/node/crypto"
	"casablanca/node/events"
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

	streamId := "streamid1"

	wallet, _ := crypto.NewWallet()
	inceptionEvent, err := events.MakeEnvelopeWithPayload(
		wallet,
		events.Make_UserPayload_Inception(streamId),
		nil,
	)
	if err != nil {
		t.Fatal(err)
	}

	// Create a new stream
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

	wallet, _ := crypto.NewWallet()
	inceptionEvent1, err := events.MakeEnvelopeWithPayload(
		wallet,
		events.Make_UserPayload_Inception(streamId),
		nil,
	)
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

		inceptionEvent2, err := events.MakeEnvelopeWithPayload(
			wallet,
			events.Make_UserPayload_Inception(streamId),
			nil,
		)
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

type SyncByteSet struct {
	data map[string]struct{}
	mu   sync.RWMutex
}

func NewSyncByteSet() *SyncByteSet {
	return &SyncByteSet{
		data: make(map[string]struct{}),
	}
}

func (s *SyncByteSet) Add(value []byte) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.data[string(value)] = struct{}{}
}

func (s *SyncByteSet) Remove(value []byte) {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.data, string(value))
}

func (s *SyncByteSet) Contains(value []byte) bool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	_, ok := s.data[string(value)]
	return ok
}

func (s *SyncByteSet) Values() [][]byte {
	s.mu.RLock()
	defer s.mu.RUnlock()

	values := make([][]byte, 0, len(s.data))
	for k := range s.data {
		values = append(values, []byte(k))
	}
	return values
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

	wallet, _ := crypto.NewWallet()
	inceptionEvent1, err := events.MakeEnvelopeWithPayload(
		wallet,
		events.Make_UserPayload_Inception(streamId),
		nil,
	)
	if err != nil {
		t.Fatal(err, requestId)
	}
	inceptionEvents := []*protocol.Envelope{inceptionEvent1}
	cookie1, err := pgEventStore.CreateStream(ctx, streamId, inceptionEvents)
	if err != nil {
		t.Fatal(err, requestId)
	}

	allHashes := NewSyncByteSet()
	wg := sync.WaitGroup{}
	// create a message in parallel after 1000ms
	insert := func(i int) {
		defer wg.Done()

		ctx, _, _ := infra.SetLoggerWithRequestId(context.Background())

		time.Sleep(time.Duration(i*10) * time.Millisecond)

		if t.Failed() {
			return
		}

		msg, err := events.MakeEnvelopeWithPayload(
			wallet,
			events.Make_ChannelPayload_Message(fmt.Sprintf("hello %d", i)),
			[][]byte{inceptionEvent1.Hash},
		)
		if err != nil {
			t.Error(err)
			return
		}
		allHashes.Add(msg.Hash)
		_, err = pgEventStore.AddEvent(ctx, streamId, msg)
		if err != nil {
			t.Error(err)
			return
		}
	}

	for i := 0; i < totalMessages; i++ {
		wg.Add(1)
		go insert(i)
	}

	if t.Failed() {
		return
	}

	poll := func(i int) {
		defer wg.Done()

		if t.Failed() {
			return
		}

		counter := 0
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
				if !allHashes.Contains(e.Hash) {
					t.Errorf("%d hash %s not found (requestId: %s)", i, string(e.Hash), requestId)
					return
				}
			}
		}
	}

	for i := 0; i < 300; i++ {
		wg.Add(1)
		go poll(i)
	}

	wg.Wait()
}
