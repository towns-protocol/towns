package events

import (
	"casablanca/node/config"
	"casablanca/node/crypto"
	"casablanca/node/protocol"
	. "casablanca/node/protocol"
	"casablanca/node/storage"
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"google.golang.org/protobuf/proto"
)

var recencyConstraintsConfig_t = config.RecencyConstraintsConfig{
	Generations: 5,
	AgeSeconds:  11,
}

func parsedEvent(t *testing.T, envelope *protocol.Envelope) *ParsedEvent {
	parsed, err := ParseEvent(envelope)
	assert.NoError(t, err)
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
		nil,
	)
	assert.NoError(t, err)
	miniblockHeader, err := Make_GenesisMiniblockHeader([]*ParsedEvent{parsedEvent(t, inception), parsedEvent(t, join)})
	assert.NoError(t, err)
	miniblockHeaderProto, err := MakeEnvelopeWithPayload(
		wallet,
		Make_MiniblockHeader(miniblockHeader),
		nil,
	)
	assert.NoError(t, err)

	miniblockProto := &Miniblock{
		Header: miniblockHeaderProto,
		Events: []*Envelope{inception, join},
	}
	miniblockProtoBytes, err := proto.Marshal(miniblockProto)
	assert.NoError(t, err)

	view, err := MakeStreamView(&storage.GetStreamFromLastSnapshotResult{
		Miniblocks: [][]byte{miniblockProtoBytes},
	})

	assert.NoError(t, err)

	assert.Equal(t, "streamid$1", view.StreamId())

	ip := view.InceptionPayload()
	assert.NotNil(t, ip)
	assert.Equal(t, parsedEvent(t, inception).Event.GetInceptionPayload().GetStreamId(), ip.GetStreamId())
	assert.Equal(t, "streamid$1", ip.GetStreamId())

	joined, err := view.IsUserJoined("userid$1") // joined is only valid on space and channel views
	assert.NoError(t, err)
	assert.False(t, joined)

	last := view.LastEvent()
	assert.NotNil(t, last)
	assert.Equal(t, join.Hash, last.Hash)

	miniEnvelopes := view.MinipoolEnvelopes()
	assert.Equal(t, 0, len(miniEnvelopes))

	newEnvelopesHashes := make([]string, 0)
	_ = view.forEachEvent(0, func(e *ParsedEvent) (bool, error) {
		newEnvelopesHashes = append(newEnvelopesHashes, e.HashStr)
		return true, nil
	})

	assert.Equal(t, 3, len(newEnvelopesHashes))
	assert.Equal(t, []string{string(inception.Hash), string(join.Hash), string(miniblockHeaderProto.Hash)}, newEnvelopesHashes)

	cookie := view.SyncCookie("nodeAddress$1")
	assert.NotNil(t, cookie)
	assert.Equal(t, "streamid$1", cookie.StreamId)
	assert.Equal(t, int64(1), cookie.MinipoolGen)
	assert.Equal(t, int64(0), cookie.MinipoolSlot)

	// Check minipool, should be empty
	assert.Equal(t, 0, len(view.minipool.events.Values))

	// check snapshot generation
	num, _ := view.getMinEventsPerSnapshot()
	assert.Equal(t, minEventsPerSnapshot, num)
	assert.Equal(t, false, view.shouldSnapshot())

	blockHash := view.LastBlock().Hash

	// add one more event (just join again)
	join2, err := MakeEnvelopeWithPayload(
		wallet,
		Make_UserPayload_Membership(protocol.MembershipOp_SO_JOIN, "userid$2", "streamid$1", nil),
		blockHash,
	)
	assert.NoError(t, err)
	nextEvent := parsedEvent(t, join2)
	err = view.ValidateNextEvent(nextEvent, &recencyConstraintsConfig_t)
	assert.NoError(t, err)
	view, err = view.copyAndAddEvent(nextEvent)
	assert.NoError(t, err)

	// with one new event, we shouldn't snapshot yet
	assert.Equal(t, false, view.shouldSnapshot())

	// and miniblocks should have nil snapshots
	proposal, _ := view.ProposeNextMiniblock(context.Background())
	miniblockHeader, _, _ = view.makeMiniblockHeader(context.Background(), proposal)
	assert.Nil(t, miniblockHeader.Snapshot)

	// add another join event
	join3, err := MakeEnvelopeWithPayload(
		wallet,
		Make_UserPayload_Membership(protocol.MembershipOp_SO_JOIN, "userid$3", "streamid$1", nil),
		view.LastBlock().Hash,
	)
	assert.NoError(t, err)
	nextEvent = parsedEvent(t, join3)
	assert.NoError(t, err)
	err = view.ValidateNextEvent(nextEvent, &recencyConstraintsConfig_t)
	assert.NoError(t, err)
	view, err = view.copyAndAddEvent(nextEvent)
	assert.NoError(t, err)
	// with two new events, we should snapshot
	assert.Equal(t, true, view.shouldSnapshot())
	assert.Equal(t, 1, len(view.blocks))
	assert.Equal(t, 2, len(view.blocks[0].events))
	// and miniblocks should have non - nil snapshots
	proposal, _ = view.ProposeNextMiniblock(context.Background())
	miniblockHeader, envelopes, _ := view.makeMiniblockHeader(context.Background(), proposal)
	assert.NotNil(t, miniblockHeader.Snapshot)

	// check count
	count := 0
	err = view.forEachEvent(0, func(e *ParsedEvent) (bool, error) {
		count++
		return true, nil
	})
	assert.NoError(t, err)
	assert.GreaterOrEqual(t, count, 3)
	assert.Equal(t, int64(count), miniblockHeader.EventNumOffset)
	// test copy and apply block
	// how many blocks do we currently have?
	assert.Equal(t, len(view.blocks), 1)
	// create a new block
	miniblockHeaderEvent, err := MakeParsedEventWithPayload(wallet, Make_MiniblockHeader(miniblockHeader), view.LastBlock().Hash)
	assert.NoError(t, err)
	miniblock, err := NewMiniblockInfoFromParsed(miniblockHeaderEvent, envelopes)
	assert.NoError(t, err)
	// with 5 generations
	newSV, err := view.copyAndApplyBlock(miniblock, &config.StreamConfig{
		RecencyConstraints: config.RecencyConstraintsConfig{
			Generations: 5,
			AgeSeconds:  11,
		},
	})
	assert.NoError(t, err)
	assert.Equal(t, len(newSV.blocks), 2)
	// with 0 generations
	newSV, err = view.copyAndApplyBlock(miniblock, &config.StreamConfig{
		RecencyConstraints: config.RecencyConstraintsConfig{
			Generations: 0,
			AgeSeconds:  11,
		},
	})
	assert.NoError(t, err)
	assert.Equal(t, len(newSV.blocks), 1)
}
