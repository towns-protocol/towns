package events

import (
	"casablanca/node/crypto"
	"casablanca/node/protocol"
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
)

func parsedEvent(t *testing.T, envelope *protocol.Envelope) *ParsedEvent {
	parsed, err := ParseEvent(envelope)
	if err != nil {
		assert.NoError(t, err)
	}
	return parsed
}

func TestLoad(t *testing.T) {
	wallet, _ := crypto.NewWallet(context.Background())
	minEventsPerSnapshot := 2
	inception, err := MakeEnvelopeWithPayload(
		wallet,
		Make_UserPayload_Inception("streamid$1", &protocol.StreamSettings{MinEventsPerSnapshot: int32(minEventsPerSnapshot), MiniblockTimeMs: 1000}),
		nil,
	)
	assert.NoError(t, err)
	join, err := MakeEnvelopeWithPayload(
		wallet,
		Make_UserPayload_Membership(protocol.MembershipOp_SO_JOIN, "userid$1", "streamid$1", nil),
		[][]byte{inception.Hash},
	)
	assert.NoError(t, err)
	miniblockHeader, err := Make_GenisisMiniblockHeader([]*ParsedEvent{parsedEvent(t, inception), parsedEvent(t, join)})
	assert.NoError(t, err)
	block, err := MakeEnvelopeWithPayload(
		wallet,
		Make_MiniblockHeader(miniblockHeader),
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

	ip := view.InceptionPayload()
	assert.NotNil(t, ip)
	assert.Equal(t, parsedEvent(t, inception).Event.GetInceptionPayload().GetStreamId(), ip.GetStreamId())
	assert.Equal(t, "streamid$1", ip.GetStreamId())

	users, err := view.JoinedUsers()
	assert.NoError(t, err)
	assert.NotNil(t, users["userid$1"])

	last := view.LastEvent()
	assert.NotNil(t, last)
	assert.Equal(t, join.Hash, last.Hash)

	miniEnvelopes := view.MinipoolEnvelopes()
	assert.Equal(t, 0, len(miniEnvelopes))

	newEnvelopes := make([]*protocol.Envelope, 0, len(envelopes))
	_ = view.forEachEvent(0, func(e *ParsedEvent) (bool, error) {
		newEnvelopes = append(newEnvelopes, e.Envelope)
		return true, nil
	})

	assert.Equal(t, 3, len(newEnvelopes))
	assert.Equal(t, envelopes, newEnvelopes)

	cookie := view.SyncCookie()
	assert.NotNil(t, cookie)
	assert.Equal(t, "streamid$1", cookie.StreamId)
	assert.Equal(t, int64(1), cookie.MiniblockNum)
	assert.Equal(t, int64(0), cookie.MinipoolSlot)

	// Check minipool, should be empty
	assert.Equal(t, 0, len(view.minipool.events.Values))

	// check snapshot generation
	assert.Equal(t, minEventsPerSnapshot, view.getMinEventsPerSnapshot())
	assert.Equal(t, false, view.shouldSnapshot())

	// add one more event (just join again)
	join2, err := MakeEnvelopeWithPayload(
		wallet,
		Make_UserPayload_Membership(protocol.MembershipOp_SO_JOIN, "userid$2", "streamid$1", nil),
		[][]byte{join.Hash},
	)
	assert.NoError(t, err)
	view, err = view.copyAndAddEvent(parsedEvent(t, join2))
	assert.NoError(t, err)
	// with one new event, we shouldn't snapshot yet
	assert.Equal(t, false, view.shouldSnapshot())
	// and miniblocks should have nil snapshots
	miniblock := view.makeMiniblockHeader(context.Background())
	assert.Nil(t, miniblock.Snapshot)
	// add another join event
	join3, err := MakeEnvelopeWithPayload(
		wallet,
		Make_UserPayload_Membership(protocol.MembershipOp_SO_JOIN, "userid$3", "streamid$1", nil),
		[][]byte{join2.Hash},
	)
	assert.NoError(t, err)
	view, err = view.copyAndAddEvent(parsedEvent(t, join3))
	assert.NoError(t, err)
	// with two new events, we should snapshot
	assert.Equal(t, true, view.shouldSnapshot())
	assert.Equal(t, 2, len(view.eventsSinceLastSnapshot()))
	// and miniblocks should have non - nil snapshots
	miniblock = view.makeMiniblockHeader(context.Background())
	assert.NotNil(t, miniblock.Snapshot)

}

// TODO: add negative tests
