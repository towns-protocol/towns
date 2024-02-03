package events

import (
	"context"
	"testing"
	"time"

	"github.com/river-build/river/config"
	"github.com/river-build/river/crypto"
	"github.com/river-build/river/protocol"
	. "github.com/river-build/river/protocol"
	"github.com/river-build/river/storage"

	"github.com/stretchr/testify/assert"
	"google.golang.org/protobuf/proto"
)

var recencyConstraintsConfig_t = config.RecencyConstraintsConfig{
	Generations: 5,
	AgeSeconds:  11,
}
var minEventsPerSnapshot = 2

var streamConfig_t = config.StreamConfig{
	Media: config.MediaStreamConfig{
		MaxChunkCount: 100,
		MaxChunkSize:  1000000,
	},
	RecencyConstraints: config.RecencyConstraintsConfig{
		AgeSeconds:  11,
		Generations: 5,
	},
	DefaultMinEventsPerSnapshot: minEventsPerSnapshot,
	MinEventsPerSnapshot: map[string]int{
		"streamid$1": minEventsPerSnapshot,
	},
}

var config_t = &config.Config{
	Stream: streamConfig_t,
}

func parsedEvent(t *testing.T, envelope *protocol.Envelope) *ParsedEvent {
	parsed, err := ParseEvent(envelope)
	assert.NoError(t, err)
	return parsed
}

func TestLoad(t *testing.T) {
	ctx := config.CtxWithConfig(context.Background(), config_t)
	wallet, _ := crypto.NewWallet(ctx)

	inception, err := MakeEnvelopeWithPayload(
		wallet,
		Make_UserPayload_Inception("streamid$1", nil),
		nil,
	)
	assert.NoError(t, err)
	join, err := MakeEnvelopeWithPayload(
		wallet,
		Make_UserPayload_Membership(protocol.MembershipOp_SO_JOIN, nil, "userid$1", "streamid$1", nil),
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

	view, err := MakeStreamView(&storage.ReadStreamFromLastSnapshotResult{
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

	// check for invalid config
	num := view.getMinEventsPerSnapshot(context.Background())
	assert.Equal(t, num, 100) // hard coded default

	// check snapshot generation
	num = view.getMinEventsPerSnapshot(ctx)
	assert.Equal(t, minEventsPerSnapshot, num)
	assert.Equal(t, false, view.shouldSnapshot(ctx))

	blockHash := view.LastBlock().Hash

	// add one more event (just join again)
	join2, err := MakeEnvelopeWithPayload(
		wallet,
		Make_UserPayload_Membership(protocol.MembershipOp_SO_JOIN, nil, "userid$2", "streamid$1", nil),
		blockHash,
	)
	assert.NoError(t, err)
	nextEvent := parsedEvent(t, join2)
	err = view.ValidateNextEvent(nextEvent, &recencyConstraintsConfig_t)
	assert.NoError(t, err)
	view, err = view.copyAndAddEvent(nextEvent)
	assert.NoError(t, err)

	// with one new event, we shouldn't snapshot yet
	assert.Equal(t, false, view.shouldSnapshot(ctx))

	// and miniblocks should have nil snapshots
	proposal, _ := view.ProposeNextMiniblock(ctx, false)
	miniblockHeader, _, _ = view.makeMiniblockHeader(ctx, proposal)
	assert.Nil(t, miniblockHeader.Snapshot)

	// add another join event
	join3, err := MakeEnvelopeWithPayload(
		wallet,
		Make_UserPayload_Membership(protocol.MembershipOp_SO_JOIN, nil, "userid$3", "streamid$1", nil),
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
	assert.Equal(t, true, view.shouldSnapshot(ctx))
	assert.Equal(t, 1, len(view.blocks))
	assert.Equal(t, 2, len(view.blocks[0].events))
	// and miniblocks should have non - nil snapshots
	proposal, _ = view.ProposeNextMiniblock(ctx, false)
	miniblockHeader, envelopes, _ := view.makeMiniblockHeader(ctx, proposal)
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
	// with 5 generations (5 blocks kept in memory)
	newSV1, err := view.copyAndApplyBlock(miniblock, &config.StreamConfig{
		RecencyConstraints: config.RecencyConstraintsConfig{
			Generations: 5,
			AgeSeconds:  11,
		},
	})
	assert.NoError(t, err)
	assert.Equal(t, len(newSV1.blocks), 2) // we should have both blocks in memory
	// with 0 generations (0 in memory block history)
	newSV2, err := view.copyAndApplyBlock(miniblock, &config.StreamConfig{
		RecencyConstraints: config.RecencyConstraintsConfig{
			Generations: 0,
			AgeSeconds:  11,
		},
	})
	assert.NoError(t, err)
	assert.Equal(t, len(newSV2.blocks), 1) // we should only have the latest block in memory
	// add an event with an old hash
	join4, err := MakeEnvelopeWithPayload(
		wallet,
		Make_UserPayload_Membership(protocol.MembershipOp_SO_LEAVE, nil, "userid$3", "streamid$1", nil),
		newSV1.blocks[0].Hash,
	)
	assert.NoError(t, err)
	nextEvent = parsedEvent(t, join4)
	assert.NoError(t, err)
	err = newSV1.ValidateNextEvent(nextEvent, &recencyConstraintsConfig_t)
	assert.NoError(t, err)
	_, err = newSV1.copyAndAddEvent(nextEvent)
	assert.NoError(t, err)
	// wait 1 second
	time.Sleep(1 * time.Second)
	// try with tighter recency constraints
	err = newSV1.ValidateNextEvent(nextEvent, &config.RecencyConstraintsConfig{
		Generations: 5,
		AgeSeconds:  1,
	})
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "BAD_PREV_MINIBLOCK_HASH")

}
