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
	block, err := MakeEnvelopeWithPayload(
		wallet,
		Make_MiniblockHeader(&protocol.MiniblockHeader{
			MiniblockNum: 0,
			Timestamp:    NextMiniblockTimestamp(nil),
			EventHashes:  [][]byte{inception.Hash, join.Hash},
		}),
		[][]byte{join.Hash},
	)
	assert.NoError(t, err)

	envelopes := []*protocol.Envelope{
		inception,
		join,
		block,
	}
	view, err := MakeStreamView(envelopes)
	assert.NoError(t, err)

	assert.Equal(t, "streamid$1", view.StreamId())

	i := view.InceptionEvent()
	assert.NotNil(t, i)
	assert.Equal(t, inception.Hash, i.Hash)

	ip := view.InceptionPayload()
	assert.NotNil(t, ip)
	assert.Equal(t, "streamid$1", ip.GetStreamId())

	users, err := view.JoinedUsers()
	assert.NoError(t, err)
	assert.NotNil(t, users["userid$1"])

	last := view.LastEvent()
	assert.NotNil(t, last)
	assert.Equal(t, join.Hash, last.Hash)

	newEnvelopes := view.Envelopes()
	assert.Equal(t, 3, len(newEnvelopes))
	assert.Equal(t, envelopes, newEnvelopes)

	cookie := view.SyncCookie()
	assert.NotNil(t, cookie)
	assert.Equal(t, "streamid$1", cookie.StreamId)
	assert.Equal(t, int64(1), cookie.MiniblockNum)
	assert.Equal(t, int64(0), cookie.MinipoolSlot)

	// Check minipool, should be empty
	assert.Equal(t, 0, len(view.minipool.events.A))
}

// TODO: add negative tests
