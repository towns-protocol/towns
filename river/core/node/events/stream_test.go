package events

import (
	"context"
	"fmt"
	"testing"

	"google.golang.org/protobuf/types/known/emptypb"

	. "github.com/river-build/river/core/node/base"
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
		Timestamp:                NextMiniblockTimestamp(prevBlock.Header().Timestamp),
		EventHashes:              [][]byte{event.Hash[:]},
		PrevMiniblockHash:        prevBlock.Ref.Hash[:],
		EventNumOffset:           prevBlock.Header().EventNumOffset + 2,
		PrevSnapshotMiniblockNum: prevBlock.Header().PrevSnapshotMiniblockNum,
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

func addEventToStream(
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

func addEventToView(
	t *testing.T,
	streamCacheParams *StreamCacheParams,
	view *streamViewImpl,
	data string,
	prevMiniblock *MiniblockRef,
) *streamViewImpl {
	view, err := view.copyAndAddEvent(
		MakeEvent(
			t,
			streamCacheParams.Wallet,
			Make_MemberPayload_Username(&EncryptedData{Ciphertext: data}),
			prevMiniblock,
		),
	)
	require.NoError(t, err)
	require.NotNil(t, view)
	return view
}

func getView(t *testing.T, ctx context.Context, stream *streamImpl) *streamViewImpl {
	view, err := stream.getView(ctx)
	require.NoError(t, err)
	require.NotNil(t, view)
	return view
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

	addEventToStream(t, ctx, tt.instances[0].params, stream, "1", view.LastBlock().Ref)
	addEventToStream(t, ctx, tt.instances[0].params, stream, "2", view.LastBlock().Ref)

	proposal, err := mbProduceCandidate(ctx, tt.instances[0].params, stream.(*streamImpl), false)
	mb := proposal.headerEvent.Event.GetMiniblockHeader()
	events := proposal.events()
	require.NoError(err)
	require.Equal(2, len(events))
	require.Equal(2, len(mb.EventHashes))
	require.EqualValues(view.LastBlock().Ref.Hash[:], mb.PrevMiniblockHash)
	require.Equal(int64(1), mb.MiniblockNum)

	if params.addAfterProposal {
		addEventToStream(t, ctx, tt.instances[0].params, stream, "3", view.LastBlock().Ref)
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
	addEventToStream(t, ctx, tt.instances[0].params, stream, "4", view2.LastBlock().Ref)

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

func TestCandidatePromotionCandidateInPlace(t *testing.T) {
	ctx, tt := makeCacheTestContext(t, testParams{replFactor: 1})
	_ = tt.initCache(0, &MiniblockProducerOpts{TestDisableMbProdcutionOnBlock: true})
	require := require.New(t)

	spaceStreamId := testutils.FakeStreamId(STREAM_SPACE_BIN)
	genesisMb := MakeGenesisMiniblockForSpaceStream(
		t,
		tt.instances[0].params.Wallet,
		tt.instances[0].params.Wallet,
		spaceStreamId,
	)

	syncStream, viewInt := tt.createStream(spaceStreamId, genesisMb.Proto)
	stream := syncStream.(*streamImpl)
	view := viewInt.(*streamViewImpl)

	addEventToStream(t, ctx, tt.instances[0].params, stream, "1", view.LastBlock().Ref)
	addEventToStream(t, ctx, tt.instances[0].params, stream, "2", view.LastBlock().Ref)

	proposal, err := mbProduceCandiate_Make(
		ctx,
		tt.instances[0].params,
		getView(t, ctx, stream),
		false,
		stream.nodes.GetRemotes(),
	)
	require.NoError(err)
	mb := proposal.headerEvent.Event.GetMiniblockHeader()
	events := proposal.events()
	require.Equal(2, len(events))
	require.Equal(2, len(mb.EventHashes))
	require.EqualValues(view.LastBlock().Ref.Hash[:], mb.PrevMiniblockHash)
	require.Equal(int64(1), mb.MiniblockNum)

	require.NoError(stream.SaveMiniblockCandidate(ctx, proposal.Proto))

	err = stream.SaveMiniblockCandidate(ctx, proposal.Proto)
	require.ErrorIs(err, RiverError(Err_ALREADY_EXISTS, ""))

	require.NoError(stream.promoteCandidate(ctx, proposal.Ref))

	view, err = stream.getView(ctx)
	require.NoError(err)
	require.EqualValues(proposal.Ref, view.LastBlock().Ref)
	require.Equal(0, view.minipool.events.Len())
}

func TestCandidatePromotionCandidateIsDelayed(t *testing.T) {
	ctx, tt := makeCacheTestContext(t, testParams{replFactor: 1})
	_ = tt.initCache(0, &MiniblockProducerOpts{TestDisableMbProdcutionOnBlock: true})
	require := require.New(t)
	params := tt.instances[0].params
	chainConfig := tt.instances[0].params.ChainConfig.Get()

	spaceStreamId := testutils.FakeStreamId(STREAM_SPACE_BIN)
	genesisMb := MakeGenesisMiniblockForSpaceStream(
		t,
		params.Wallet,
		params.Wallet,
		spaceStreamId,
	)

	syncStream, viewInt := tt.createStream(spaceStreamId, genesisMb.Proto)
	stream := syncStream.(*streamImpl)
	view := viewInt.(*streamViewImpl)
	remotes := stream.nodes.GetRemotes()

	addEventToStream(t, ctx, params, stream, "1", view.LastBlock().Ref)
	addEventToStream(t, ctx, params, stream, "2", view.LastBlock().Ref)

	view = getView(t, ctx, stream)
	require.Equal(2, view.minipool.size())
	proposal1, err := mbProduceCandiate_Make(ctx, params, view, false, remotes)
	require.NoError(err)
	require.NotNil(proposal1)
	require.Len(proposal1.events(), 2)
	require.Len(proposal1.Proto.Events, 2)
	mbHeader := proposal1.headerEvent.Event.GetMiniblockHeader()
	require.Equal(2, len(mbHeader.EventHashes))
	require.EqualValues(view.LastBlock().Ref.Hash[:], mbHeader.PrevMiniblockHash)
	require.Equal(int64(1), mbHeader.MiniblockNum)

	require.NoError(stream.promoteCandidate(ctx, proposal1.Ref))
	view = getView(t, ctx, stream)
	require.Equal(int64(0), view.LastBlock().Ref.Num)
	require.Equal(2, view.minipool.size())
	require.Len(stream.local.pendingCandidates, 1)
	require.EqualValues(proposal1.Ref, stream.local.pendingCandidates[0])

	require.NoError(stream.SaveMiniblockCandidate(ctx, proposal1.Proto))

	view = getView(t, ctx, stream)
	require.Equal(int64(1), view.LastBlock().Ref.Num)
	require.EqualValues(proposal1.Ref, view.LastBlock().Ref)
	require.Equal(0, view.minipool.events.Len())

	for i := 0; i < 2; i++ {
		view1 := getView(t, ctx, stream)
		view1 = addEventToView(t, params, view1, fmt.Sprintf("%d", i+3), view1.LastBlock().Ref)

		proposal2, err := mbProduceCandiate_Make(ctx, params, view1, false, remotes)
		require.NoError(err)
		require.NotNil(proposal2)
		require.Equal(int64(i*3+2), proposal2.headerEvent.Event.GetMiniblockHeader().MiniblockNum)

		view2, _, err := view1.copyAndApplyBlock(proposal2, chainConfig)
		require.NoError(err)
		require.EqualValues(proposal2.Ref, view2.LastBlock().Ref)

		view2 = addEventToView(t, params, view2, "4", view2.LastBlock().Ref)
		view2 = addEventToView(t, params, view2, "5", view2.LastBlock().Ref)

		proposal3, err := mbProduceCandiate_Make(ctx, params, view2, false, remotes)
		require.NoError(err)
		require.NotNil(proposal3)
		require.Equal(int64(i*3+3), proposal3.headerEvent.Event.GetMiniblockHeader().MiniblockNum)

		view3, _, err := view2.copyAndApplyBlock(proposal3, chainConfig)
		require.NoError(err)
		require.EqualValues(proposal3.Ref, view3.LastBlock().Ref)

		view3 = addEventToView(t, params, view3, "6", view3.LastBlock().Ref)
		view3 = addEventToView(t, params, view3, "7", view3.LastBlock().Ref)

		proposal4, err := mbProduceCandiate_Make(ctx, params, view3, false, remotes)
		require.NoError(err)
		require.NotNil(proposal4)
		require.Equal(int64(i*3+4), proposal4.headerEvent.Event.GetMiniblockHeader().MiniblockNum)

		require.NoError(stream.promoteCandidate(ctx, proposal2.Ref))
		require.NoError(stream.promoteCandidate(ctx, proposal3.Ref))
		require.NoError(stream.promoteCandidate(ctx, proposal4.Ref))
		require.Len(stream.local.pendingCandidates, 3)

		if i == 0 {
			require.NoError(stream.SaveMiniblockCandidate(ctx, proposal2.Proto))
			require.NoError(stream.SaveMiniblockCandidate(ctx, proposal3.Proto))
			require.NoError(stream.SaveMiniblockCandidate(ctx, proposal4.Proto))
		} else {
			require.NoError(stream.SaveMiniblockCandidate(ctx, proposal4.Proto))
			require.NoError(stream.SaveMiniblockCandidate(ctx, proposal2.Proto))
			require.NoError(stream.SaveMiniblockCandidate(ctx, proposal3.Proto))
		}

		view = getView(t, ctx, stream)
		require.Equal(int64(i*3+4), view.LastBlock().Ref.Num)
	}
}
