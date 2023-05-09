package storage_test

import (
	"testing"

	"casablanca/node/crypto"
	"casablanca/node/events"
	"casablanca/node/protocol"
	"casablanca/node/storage"
)

func TestLoad(t *testing.T) {

	wallet, _ := crypto.NewWallet()
	rollup := storage.NewView(func() ([]*protocol.Envelope, error) {
		inception, err := events.MakeEnvelopeWithPayload(
			wallet,
			events.Make_UserPayload_Inception("streamid$1"),
			nil,
		)
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
