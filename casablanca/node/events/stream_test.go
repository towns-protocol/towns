package events

import (
	"context"
	"testing"

	. "github.com/river-build/river/base"
	"github.com/river-build/river/crypto"
	. "github.com/river-build/river/protocol"

	"github.com/stretchr/testify/assert"
)

func MakeGenesisMiniblockForSpaceStream(
	t *testing.T,
	wallet *crypto.Wallet,
	spaceStreamId string,
) *Miniblock {
	inception, err := MakeEnvelopeWithPayload(
		wallet,
		Make_SpacePayload_Inception(spaceStreamId, nil),
		nil,
	)
	assert.NoError(t, err)

	miniblockHeader, err := Make_GenesisMiniblockHeader([]*ParsedEvent{parsedEvent(t, inception)})
	assert.NoError(t, err)
	miniblockHeaderProto, err := MakeEnvelopeWithPayload(
		wallet,
		Make_MiniblockHeader(miniblockHeader),
		nil,
	)
	assert.NoError(t, err)

	miniblockProto := &Miniblock{
		Header: miniblockHeaderProto,
		Events: []*Envelope{inception},
	}

	return miniblockProto
}

func MakeEvent(
	t *testing.T,
	wallet *crypto.Wallet,
	payload IsStreamEvent_Payload,
	prevMiniblockHash []byte,
) *ParsedEvent {
	envelope, err := MakeEnvelopeWithPayload(wallet, payload, prevMiniblockHash)
	assert.NoError(t, err)
	return parsedEvent(t, envelope)
}

func addEvent(t *testing.T, ctx context.Context, streamCacheParams *StreamCacheParams, stream SyncStream, data string, mbHash []byte) {
	err := stream.AddEvent(
		ctx,
		MakeEvent(t, streamCacheParams.Wallet, Make_SpacePayload_Username(&EncryptedData{Ciphertext: data}), mbHash),
	)
	assert.NoError(t, err)
}

type mbTestParams struct {
	addAfterProposal bool
	addAfterMake     bool
	eventsInMinipool int
}

func mbTest(
	t *testing.T,
	params mbTestParams,
) {
	ctx, tt := makeTestStreamParams(testParams{usePostgres: true})
	defer tt.closer()
	assert := assert.New(t)

	spaceStreamId := GenShortNanoid()
	miniblockProto := MakeGenesisMiniblockForSpaceStream(t, tt.params.Wallet, spaceStreamId)

	stream, view, err := tt.createStream(ctx, spaceStreamId, miniblockProto)
	assert.NoError(err)

	addEvent(t, ctx, tt.params, stream, "1", view.LastBlock().Hash)
	addEvent(t, ctx, tt.params, stream, "2", view.LastBlock().Hash)

	proposal, err := stream.ProposeNextMiniblock(ctx, false)
	assert.NoError(err)
	assert.Equal(2, len(proposal.Hashes))
	assert.EqualValues(view.LastBlock().Hash, proposal.PrevMiniblockHash)
	assert.Equal(int64(1), proposal.NewMiniblockNum)

	if params.addAfterProposal {
		addEvent(t, ctx, tt.params, stream, "3", view.LastBlock().Hash)
	}

	mb, events, err := stream.MakeMiniblockHeader(ctx, proposal)
	assert.NoError(err)
	assert.Equal(2, len(events))
	assert.Equal(2, len(mb.EventHashes))
	assert.EqualValues(view.LastBlock().Hash, mb.PrevMiniblockHash)
	assert.Equal(int64(1), mb.MiniblockNum)

	if params.addAfterMake {
		addEvent(t, ctx, tt.params, stream, "4", view.LastBlock().Hash)
	}

	err = stream.ApplyMiniblock(ctx, mb, events)
	assert.NoError(err)

	view2, err := stream.GetView(ctx)
	assert.NoError(err)
	stats := view2.GetStats()
	assert.Equal(params.eventsInMinipool, stats.EventsInMinipool)
	addEvent(t, ctx, tt.params, stream, "5", view2.LastBlock().Hash)

	view2, err = stream.GetView(ctx)
	assert.NoError(err)
	stats = view2.GetStats()
	assert.Equal(int64(1), stats.LastMiniblockNum)
	assert.Equal(params.eventsInMinipool+1, stats.EventsInMinipool)
	assert.Equal(5, stats.EventsInMiniblocks)
	assert.Equal(5+stats.EventsInMinipool, stats.TotalEventsEver)
}

func TestMiniblockProduction0(t *testing.T) {
	mbTest(
		t,
		mbTestParams{
			addAfterProposal: false,
			addAfterMake:     false,
			eventsInMinipool: 0,
		},
	)
}

func TestMiniblockProduction1(t *testing.T) {
	mbTest(
		t,
		mbTestParams{
			addAfterProposal: true,
			addAfterMake:     false,
			eventsInMinipool: 1,
		},
	)
}

func TestMiniblockProduction2(t *testing.T) {
	mbTest(
		t,
		mbTestParams{
			addAfterProposal: false,
			addAfterMake:     true,
			eventsInMinipool: 1,
		},
	)
}

func TestMiniblockProduction3(t *testing.T) {
	mbTest(
		t,
		mbTestParams{
			addAfterProposal: true,
			addAfterMake:     true,
			eventsInMinipool: 2,
		},
	)
}
