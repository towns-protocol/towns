package events

import (
	"casablanca/node/crypto"
	"casablanca/node/protocol"
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestLoad(t *testing.T) {
	wallet, _ := crypto.NewWallet(context.Background())
	inception, err := MakeEnvelopeWithPayload(
		wallet,
		Make_UserPayload_Inception("streamid$1"),
		nil,
	)
	assert.NoError(t, err)
	join, err := MakeEnvelopeWithPayload(
		wallet,
		Make_UserPayload_Membership(protocol.MembershipOp_SO_JOIN, "userid$1", "streamid$1", nil),
		[][]byte{inception.Hash},
	)
	assert.NoError(t, err)

	envelopes := []*protocol.Envelope{
		inception,
		join,
	}
	view, err := MakeStreamView(envelopes)
	assert.NoError(t, err)

	assert.Equal(t, 2, len(view.Events()))
	assert.Equal(t, 2, len(view.EventsByHash()))
	assert.Equal(t, 1, len(view.LeafEvents()))
	assert.Equal(t, 1, len(view.LeafEventHashes()))
}

// TODO: add negative tests
