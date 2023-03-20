package rpc_test

import (
	"testing"

	"casablanca/node/protocol"
	"casablanca/node/rpc"
	"casablanca/node/testutils"
)

func TestLoad(t *testing.T) {

	userId := []byte{0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9}
	rollup := rpc.NewView(func() ([]*protocol.Envelope, error) {
		inception, err := testutils.UserStreamInceptionEvent(1, userId, "streamid$1")
		if err != nil {
			t.Fatalf("error creating inception event: %v", err)
		}
		return []*protocol.Envelope{
			inception,
		}, nil
	})

	payloads, err := rollup.Get()
	if err != nil {
		t.Fatalf("error loading: %v", err)
	}
	if len(payloads) != 1 {
		t.Fatalf("expected 1 payload, got %d", len(payloads))
	}
}
