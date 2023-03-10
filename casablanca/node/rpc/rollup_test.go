package rpc_test

import (
	"fmt"
	"sync"
	"testing"
	"time"

	"casablanca/node/protocol"
	"casablanca/node/rpc"
	"casablanca/node/testutils"

	log "github.com/sirupsen/logrus"
	"github.com/stretchr/testify/assert"
)

func TestLoad(t *testing.T) {

	userId := []byte{0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9}
	rollup := rpc.NewRollup(func(s string) ([]*protocol.Envelope, error) {
		inception, err := testutils.UserStreamInceptionEvent(1, userId, "streamid$1")
		if err != nil {
			t.Fatalf("error creating inception event: %v", err)
		}
		return []*protocol.Envelope{
			inception,
		}, nil
	})

	payloads, err := rollup.Get("test1")
	if err != nil {
		t.Fatalf("error loading: %v", err)
	}
	if len(payloads) != 1 {
		t.Fatalf("expected 1 payload, got %d", len(payloads))
	}
}

func TestMultiaccess(t *testing.T) {

	userId := []byte{0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9}
	rollup := rpc.NewRollup(func(s string) ([]*protocol.Envelope, error) {
		inception, err := testutils.UserStreamInceptionEvent(1, userId, "streamid$1")
		if err != nil {
			t.Fatalf("error creating inception event: %v", err)
		}
		// emulate slow load
		time.Sleep(100 * time.Millisecond)

		return []*protocol.Envelope{
			inception,
		}, nil
	})

	wg := sync.WaitGroup{}
	getter := func() {
		defer wg.Done()
		payloads, err := rollup.Get("test1")
		assert.Nil(t, err, "error loading: %v", err)
		assert.LessOrEqual(t, 1, len(payloads))
	}

	for i := 0; i < 10; i++ {
		wg.Add(1)
		go getter()
	}

	wg.Wait()
}

func TestMultiaccessFail(t *testing.T) {

	rollup := rpc.NewRollup(func(s string) ([]*protocol.Envelope, error) {
		time.Sleep(100 * time.Millisecond)
		log.Debug("returning error")
		return nil, fmt.Errorf("error")
	})

	wg := sync.WaitGroup{}
	getter := func() {
		payloads, err := rollup.Get("test1")
		assert.NotNil(t, err, "expected error")
		defer wg.Done()
		assert.Equal(t, 0, len(payloads))
	}

	for i := 0; i < 10; i++ {
		wg.Add(1)
		go getter()
	}

	wg.Wait()
}
