package events_test

import (
	"casablanca/node/crypto"
	"casablanca/node/events"
	"casablanca/node/protocol"
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestLoad(t *testing.T) {
	wallet, _ := crypto.NewWallet(context.Background())
	inception, err := events.MakeEnvelopeWithPayload(
		wallet,
		events.Make_UserPayload_Inception("streamid$1"),
		nil,
	)
	assert.NoError(t, err)
	join, err := events.MakeEnvelopeWithPayload(
		wallet,
		events.Make_UserPayload_Membership(protocol.MembershipOp_SO_JOIN, "userid$1", "streamid$1", nil),
		[][]byte{inception.Hash},
	)
	assert.NoError(t, err)

	envelopes := []*protocol.Envelope{
		inception,
		join,
	}
	view, err := events.MakeStreamView(envelopes)
	assert.NoError(t, err)

	assert.Equal(t, 2, len(view.Events()))
	assert.Equal(t, 2, len(view.EventsByHash()))
	assert.Equal(t, 1, len(view.LeafEvents()))
	assert.Equal(t, 1, len(view.LeafEventHashes()))
}

// TODO: add negative tests
