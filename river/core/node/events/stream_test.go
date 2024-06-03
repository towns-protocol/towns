package events

import (
	"context"
	"fmt"
	"testing"

	"github.com/ethereum/go-ethereum/common"
	"github.com/river-build/river/core/node/crypto"
	. "github.com/river-build/river/core/node/protocol"
	. "github.com/river-build/river/core/node/shared"
	"github.com/river-build/river/core/node/testutils"

	"github.com/stretchr/testify/require"
)

func MakeGenesisMiniblockForSpaceStream(
	t *testing.T,
	wallet *crypto.Wallet,
	spaceStreamId StreamId,
) *Miniblock {
	inception, err := MakeEnvelopeWithPayload(
		wallet,
		Make_SpacePayload_Inception(spaceStreamId, nil),
		nil,
	)
	require.NoError(t, err)

	miniblockHeader, err := Make_GenesisMiniblockHeader([]*ParsedEvent{parsedEvent(t, inception)})
	require.NoError(t, err)
	miniblockHeaderProto, err := MakeEnvelopeWithPayload(
		wallet,
		Make_MiniblockHeader(miniblockHeader),
		nil,
	)
	require.NoError(t, err)

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
	require.NoError(t, err)
	return parsedEvent(t, envelope)
}

func addEvent(
	t *testing.T,
	ctx context.Context,
	streamCacheParams *StreamCacheParams,
	stream SyncStream,
	data string,
	mbHash common.Hash,
) {
	err := stream.AddEvent(
		ctx,
		MakeEvent(
			t,
			streamCacheParams.Wallet,
			Make_MemberPayload_Username(&EncryptedData{Ciphertext: data}),
			mbHash.Bytes(),
		),
	)
	require.NoError(t, err)
}

type mbTestParams struct {
	addAfterProposal bool
	eventsInMinipool int
}

func mbTest(
	t *testing.T,
	params mbTestParams,
) {
	ctx, tt := makeTestStreamParams(testParams{replFactor: 1})
	defer tt.closer()
	require := require.New(t)

	spaceStreamId := testutils.FakeStreamId(STREAM_SPACE_BIN)
	miniblockProto := MakeGenesisMiniblockForSpaceStream(t, tt.params.Wallet, spaceStreamId)

	stream, view, err := tt.createStream(ctx, spaceStreamId, miniblockProto)
	require.NoError(err)

	addEvent(t, ctx, tt.params, stream, "1", view.LastBlock().Hash)
	addEvent(t, ctx, tt.params, stream, "2", view.LastBlock().Hash)

	proposal, err := stream.ProposeNextMiniblock(ctx, false)
	mb := proposal.headerEvent.Event.GetMiniblockHeader()
	events := proposal.events
	require.NoError(err)
	require.Equal(2, len(events))
	require.Equal(2, len(mb.EventHashes))
	require.EqualValues(view.LastBlock().Hash[:], mb.PrevMiniblockHash)
	require.Equal(int64(1), mb.MiniblockNum)

	if params.addAfterProposal {
		addEvent(t, ctx, tt.params, stream, "3", view.LastBlock().Hash)
	}

	require.NoError(err)
	require.Equal(2, len(events))
	require.Equal(int64(1), mb.MiniblockNum)

	err = stream.ApplyMiniblock(ctx, proposal)
	require.NoError(err)

	view2, err := stream.GetView(ctx)
	require.NoError(err)
	stats := view2.GetStats()
	require.Equal(params.eventsInMinipool, stats.EventsInMinipool)
	addEvent(t, ctx, tt.params, stream, "4", view2.LastBlock().Hash)

	view2, err = stream.GetView(ctx)
	require.NoError(err)
	stats = view2.GetStats()
	require.Equal(int64(1), stats.LastMiniblockNum)
	require.Equal(params.eventsInMinipool+1, stats.EventsInMinipool)
	require.Equal(5, stats.EventsInMiniblocks)
	require.Equal(5+stats.EventsInMinipool, stats.TotalEventsEver)
}

func TestMiniblockProduction(t *testing.T) {
	cases := []mbTestParams{
		{false, 0},
		{true, 1},
	}

	for i, c := range cases {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			mbTest(t, c)
		})
	}
}
