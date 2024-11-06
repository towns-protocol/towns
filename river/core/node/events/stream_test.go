package events

import (
	"context"
	"fmt"
	"testing"

	"google.golang.org/protobuf/types/known/emptypb"

	"github.com/river-build/river/core/node/crypto"
	. "github.com/river-build/river/core/node/protocol"
	. "github.com/river-build/river/core/node/shared"
	"github.com/river-build/river/core/node/testutils"

	"github.com/stretchr/testify/require"
)

func MakeGenesisMiniblockForSpaceStream(
	t *testing.T,
	userWallet *crypto.Wallet,
	nodeWallet *crypto.Wallet,
	streamId StreamId,
) *MiniblockInfo {
	inception, err := MakeParsedEventWithPayload(
		userWallet,
		Make_SpacePayload_Inception(streamId, nil),
		&MiniblockRef{},
	)
	require.NoError(t, err)

	mb, err := MakeGenesisMiniblock(nodeWallet, []*ParsedEvent{inception})
	require.NoError(t, err)

	mbInfo, err := NewMiniblockInfoFromProto(
		mb,
		NewMiniblockInfoFromProtoOpts{ExpectedBlockNumber: 0, DontParseEvents: true},
	)
	require.NoError(t, err)
	return mbInfo
}

func MakeGenesisMiniblockForUserSettingsStream(
	t *testing.T,
	userWallet *crypto.Wallet,
	nodeWallet *crypto.Wallet,
	streamId StreamId,
) *MiniblockInfo {
	inception, err := MakeParsedEventWithPayload(
		userWallet,
		Make_UserSettingsPayload_Inception(streamId, nil),
		&MiniblockRef{},
	)
	require.NoError(t, err)

	mb, err := MakeGenesisMiniblock(nodeWallet, []*ParsedEvent{inception})
	require.NoError(t, err)

	mbInfo, err := NewMiniblockInfoFromProto(
		mb,
		NewMiniblockInfoFromProtoOpts{ExpectedBlockNumber: 0, DontParseEvents: true},
	)
	require.NoError(t, err)

	return mbInfo
}

func MakeTestBlockForUserSettingsStream(
	t *testing.T,
	userWallet *crypto.Wallet,
	nodeWallet *crypto.Wallet,
	prevBlock *MiniblockInfo,
) *MiniblockInfo {
	event := MakeEvent(
		t,
		userWallet,
		Make_UserSettingsPayload_FullyReadMarkers(&UserSettingsPayload_FullyReadMarkers{}),
		prevBlock.Ref,
	)

	header := &MiniblockHeader{
		MiniblockNum:             prevBlock.Ref.Num + 1,
		Timestamp:                NextMiniblockTimestamp(prevBlock.header().Timestamp),
		EventHashes:              [][]byte{event.Hash[:]},
		PrevMiniblockHash:        prevBlock.Ref.Hash[:],
		EventNumOffset:           prevBlock.header().EventNumOffset + 2,
		PrevSnapshotMiniblockNum: prevBlock.header().PrevSnapshotMiniblockNum,
		Content: &MiniblockHeader_None{
			None: &emptypb.Empty{},
		},
	}

	mb, err := NewMiniblockInfoFromHeaderAndParsed(nodeWallet, header, []*ParsedEvent{event})
	require.NoError(t, err)

	return mb
}

func MakeEvent(
	t *testing.T,
	wallet *crypto.Wallet,
	payload IsStreamEvent_Payload,
	prevMiniblock *MiniblockRef,
) *ParsedEvent {
	envelope, err := MakeEnvelopeWithPayload(wallet, payload, prevMiniblock)
	require.NoError(t, err)
	return parsedEvent(t, envelope)
}

func addEvent(
	t *testing.T,
	ctx context.Context,
	streamCacheParams *StreamCacheParams,
	stream SyncStream,
	data string,
	prevMiniblock *MiniblockRef,
) {
	err := stream.AddEvent(
		ctx,
		MakeEvent(
			t,
			streamCacheParams.Wallet,
			Make_MemberPayload_Username(&EncryptedData{Ciphertext: data}),
			prevMiniblock,
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
	ctx, tt := makeCacheTestContext(t, testParams{replFactor: 1})
	_ = tt.initCache(0, nil)
	require := require.New(t)

	spaceStreamId := testutils.FakeStreamId(STREAM_SPACE_BIN)
	genesisMb := MakeGenesisMiniblockForSpaceStream(
		t,
		tt.instances[0].params.Wallet,
		tt.instances[0].params.Wallet,
		spaceStreamId,
	)

	stream, view := tt.createStream(spaceStreamId, genesisMb.Proto)

	addEvent(t, ctx, tt.instances[0].params, stream, "1", view.LastBlock().Ref)
	addEvent(t, ctx, tt.instances[0].params, stream, "2", view.LastBlock().Ref)

	proposal, err := mbProduceCandidate(ctx, tt.instances[0].params, stream.(*streamImpl), false)
	mb := proposal.headerEvent.Event.GetMiniblockHeader()
	events := proposal.events
	require.NoError(err)
	require.Equal(2, len(events))
	require.Equal(2, len(mb.EventHashes))
	require.EqualValues(view.LastBlock().Ref.Hash[:], mb.PrevMiniblockHash)
	require.Equal(int64(1), mb.MiniblockNum)

	if params.addAfterProposal {
		addEvent(t, ctx, tt.instances[0].params, stream, "3", view.LastBlock().Ref)
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
	addEvent(t, ctx, tt.instances[0].params, stream, "4", view2.LastBlock().Ref)

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
