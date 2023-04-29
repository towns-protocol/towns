package rpc_test

import (
	"testing"

	"casablanca/node/crypto"
	"casablanca/node/events"
	"casablanca/node/protocol"
	"casablanca/node/rpc"
)

func TestLoad(t *testing.T) {
	wallet, _ := crypto.NewWallet()
	rollup := rpc.NewView(func() ([]*protocol.Envelope, error) {
		inception, err := events.MakeEnvelopeWithPayload(
			wallet,
			events.MakePayload_Inception("streamid$1", protocol.StreamKind_SK_USER, ""),
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
