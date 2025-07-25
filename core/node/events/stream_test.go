package events

import (
	"context"
	"fmt"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
	"google.golang.org/protobuf/types/known/emptypb"

	. "github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/crypto"
	. "github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/testutils"
)

func MakeGenesisMiniblockForSpaceStream(
	t *testing.T,
	userWallet *crypto.Wallet,
	nodeWallet *crypto.Wallet,
	streamId StreamId,
	settings *StreamSettings,
) *MiniblockInfo {
	inception, err := MakeParsedEventWithPayload(
		userWallet,
		Make_SpacePayload_Inception(streamId, settings),
		&MiniblockRef{},
	)
	require.NoError(t, err)

	mb, err := MakeGenesisMiniblock(nodeWallet, []*ParsedEvent{inception})
	require.NoError(t, err)

	mbInfo, err := NewMiniblockInfoFromProto(
		mb, nil,
		NewParsedMiniblockInfoOpts().
			WithExpectedBlockNumber(0).
			WithDoNotParseEvents(true),
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
		mb, nil,
		NewParsedMiniblockInfoOpts().
			WithExpectedBlockNumber(0).
			WithDoNotParseEvents(true),
	)
	require.NoError(t, err)

	return mbInfo
}

func MakeGenesisMiniblockForMediaStream(
	t *testing.T,
	userWallet *crypto.Wallet,
	nodeWallet *crypto.Wallet,
	media *MediaPayload_Inception,
) *MiniblockInfo {
	inception, err := MakeParsedEventWithPayload(
		userWallet,
		Make_MediaPayload_Inception(media),
		&MiniblockRef{},
	)
	require.NoError(t, err)

	mb, err := MakeGenesisMiniblock(nodeWallet, []*ParsedEvent{inception})
	require.NoError(t, err)

	mbInfo, err := NewMiniblockInfoFromProto(
		mb, nil,
		NewParsedMiniblockInfoOpts().
			WithExpectedBlockNumber(0).
			WithDoNotParseEvents(true),
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
		false,
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

	mb, err := NewMiniblockInfoFromHeaderAndParsed(nodeWallet, header, []*ParsedEvent{event}, nil)
	require.NoError(t, err)

	return mb
}

func MakeEvent(
	t *testing.T,
	wallet *crypto.Wallet,
	payload IsStreamEvent_Payload,
	ephemeral bool,
	prevMiniblock *MiniblockRef,
) *ParsedEvent {
	var envelope *Envelope
	var err error
	if ephemeral {
		envelope, err = MakeEphemeralEnvelopeWithPayload(wallet, payload, prevMiniblock)
	} else {
		envelope, err = MakeEnvelopeWithPayload(wallet, payload, prevMiniblock)
	}
	require.NoError(t, err)
	return parsedEvent(t, envelope)
}

func addEventToStream(
	t *testing.T,
	ctx context.Context,
	streamCacheParams *StreamCacheParams,
	stream *Stream,
	data string,
	prevMiniblock *MiniblockRef,
	ephemeral bool,
) {
	err := stream.AddEvent(
		ctx,
		MakeEvent(
			t,
			streamCacheParams.Wallet,
			Make_MemberPayload_Username(&EncryptedData{Ciphertext: data}),
			ephemeral,
			prevMiniblock,
		),
	)
	require.NoError(t, err)
}

func addEventToView(
	t *testing.T,
	streamCacheParams *StreamCacheParams,
	view *StreamView,
	data string,
	prevMiniblock *MiniblockRef,
) *StreamView {
	view, err := view.copyAndAddEvent(
		MakeEvent(
			t,
			streamCacheParams.Wallet,
			Make_MemberPayload_Username(&EncryptedData{Ciphertext: data}),
			false,
			prevMiniblock,
		),
	)
	require.NoError(t, err)
	require.NotNil(t, view)
	return view
}

func getView(t *testing.T, ctx context.Context, stream *Stream) *StreamView {
	view, err := stream.GetViewIfLocal(ctx)
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
		&StreamSettings{
			DisableMiniblockCreation: true,
		},
	)

	stream, view := tt.createStream(spaceStreamId, genesisMb.Proto)

	addEventToStream(t, ctx, tt.instances[0].params, stream, "1", view.LastBlock().Ref, false)
	addEventToStream(t, ctx, tt.instances[0].params, stream, "2", view.LastBlock().Ref, false)

	candidate, err := tt.instances[0].makeAndSaveMbCandidate(ctx, stream, 0)
	require.NoError(err)
	mb := candidate.headerEvent.Event.GetMiniblockHeader()
	events := candidate.Events()
	require.Equal(2, len(events))
	require.Equal(2, len(mb.EventHashes))
	require.EqualValues(view.LastBlock().Ref.Hash[:], mb.PrevMiniblockHash)
	require.Equal(int64(1), mb.MiniblockNum)

	// Test candidates are getting skipped after 10 candidates.
	for range 9 {
		_, err := tt.instances[0].makeAndSaveMbCandidate(ctx, stream, 1)
		require.NoError(err)
	}
	// 11th candidate should be skipped on block 1 and produced on block 2.
	_, err = tt.instances[0].makeAndSaveMbCandidate(ctx, stream, 1)
	require.ErrorIs(err, RiverError(Err_RESOURCE_EXHAUSTED, ""))

	_, err = tt.instances[0].makeAndSaveMbCandidate(ctx, stream, 2)
	require.NoError(err)

	if params.addAfterProposal {
		addEventToStream(t, ctx, tt.instances[0].params, stream, "3", view.LastBlock().Ref, false)
	}

	require.NoError(err)
	require.Equal(2, len(events))
	require.Equal(int64(1), mb.MiniblockNum)

	err = stream.ApplyMiniblock(ctx, candidate)
	require.NoError(err)

	view2, err := stream.GetView(ctx)
	require.NoError(err)
	stats := view2.GetStats()
	require.Equal(params.eventsInMinipool, stats.EventsInMinipool)
	addEventToStream(t, ctx, tt.instances[0].params, stream, "4", view2.LastBlock().Ref, false)

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
		nil,
	)

	syncStream, view := tt.createStream(spaceStreamId, genesisMb.Proto)
	stream := syncStream

	addEventToStream(t, ctx, tt.instances[0].params, stream, "1", view.LastBlock().Ref, false)
	addEventToStream(t, ctx, tt.instances[0].params, stream, "2", view.LastBlock().Ref, false)

	candidate, err := tt.instances[0].makeMbCandidate(
		ctx,
		stream,
	)
	require.NoError(err)
	mb := candidate.headerEvent.Event.GetMiniblockHeader()
	events := candidate.Events()
	require.Equal(2, len(events))
	require.Equal(2, len(mb.EventHashes))
	require.EqualValues(view.LastBlock().Ref.Hash[:], mb.PrevMiniblockHash)
	require.Equal(int64(1), mb.MiniblockNum)

	require.NoError(stream.SaveMiniblockCandidate(ctx, candidate))

	err = stream.SaveMiniblockCandidate(ctx, candidate)
	require.ErrorIs(err, RiverError(Err_ALREADY_EXISTS, ""))

	require.NoError(stream.promoteCandidate(ctx, candidate.Ref))

	view, err = stream.GetViewIfLocal(ctx)
	require.NoError(err)
	require.EqualValues(candidate.Ref, view.LastBlock().Ref)
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
		nil,
	)

	syncStream, view := tt.createStream(spaceStreamId, genesisMb.Proto)
	stream := syncStream

	addEventToStream(t, ctx, params, stream, "1", view.LastBlock().Ref, false)
	addEventToStream(t, ctx, params, stream, "2", view.LastBlock().Ref, false)

	view = getView(t, ctx, stream)
	require.Equal(2, view.minipool.size())
	candidate1, err := tt.instances[0].makeMbCandidateForView(ctx, view)
	require.NoError(err)
	require.NotNil(candidate1)
	require.Len(candidate1.Events(), 2)
	require.Len(candidate1.Proto.Events, 2)
	mbHeader := candidate1.headerEvent.Event.GetMiniblockHeader()
	require.Equal(2, len(mbHeader.EventHashes))
	require.EqualValues(view.LastBlock().Ref.Hash[:], mbHeader.PrevMiniblockHash)
	require.Equal(int64(1), mbHeader.MiniblockNum)

	require.NoError(stream.promoteCandidate(ctx, candidate1.Ref))
	view = getView(t, ctx, stream)
	require.Equal(int64(0), view.LastBlock().Ref.Num)
	require.Equal(2, view.minipool.size())
	require.Len(stream.local.pendingCandidates, 1)
	require.EqualValues(candidate1.Ref, stream.local.pendingCandidates[0])

	require.NoError(stream.SaveMiniblockCandidate(ctx, candidate1))

	view = getView(t, ctx, stream)
	require.Equal(int64(1), view.LastBlock().Ref.Num)
	require.EqualValues(candidate1.Ref, view.LastBlock().Ref)
	require.Equal(0, view.minipool.events.Len())

	for i := 0; i < 2; i++ {
		view1 := getView(t, ctx, stream)
		view1 = addEventToView(t, params, view1, fmt.Sprintf("%d", i+3), view1.LastBlock().Ref)

		candidate2, err := tt.instances[0].makeMbCandidateForView(ctx, view1)
		require.NoError(err)
		require.NotNil(candidate2)
		require.Equal(int64(i*3+2), candidate2.headerEvent.Event.GetMiniblockHeader().MiniblockNum)

		view2, _, err := view1.copyAndApplyBlock(candidate2, chainConfig)
		require.NoError(err)
		require.EqualValues(candidate2.Ref, view2.LastBlock().Ref)

		view2 = addEventToView(t, params, view2, "4", view2.LastBlock().Ref)
		view2 = addEventToView(t, params, view2, "5", view2.LastBlock().Ref)

		candidate3, err := tt.instances[0].makeMbCandidateForView(ctx, view2)
		require.NoError(err)
		require.NotNil(candidate3)
		require.Equal(int64(i*3+3), candidate3.headerEvent.Event.GetMiniblockHeader().MiniblockNum)

		view3, _, err := view2.copyAndApplyBlock(candidate3, chainConfig)
		require.NoError(err)
		require.EqualValues(candidate3.Ref, view3.LastBlock().Ref)

		view3 = addEventToView(t, params, view3, "6", view3.LastBlock().Ref)
		view3 = addEventToView(t, params, view3, "7", view3.LastBlock().Ref)

		candidate4, err := tt.instances[0].makeMbCandidateForView(ctx, view3)
		require.NoError(err)
		require.NotNil(candidate4)
		require.Equal(int64(i*3+4), candidate4.headerEvent.Event.GetMiniblockHeader().MiniblockNum)

		require.NoError(stream.promoteCandidate(ctx, candidate2.Ref))
		require.NoError(stream.promoteCandidate(ctx, candidate3.Ref))
		require.NoError(stream.promoteCandidate(ctx, candidate4.Ref))
		require.Len(stream.local.pendingCandidates, 3)

		if i == 0 {
			require.NoError(stream.SaveMiniblockCandidate(ctx, candidate2))
			require.NoError(stream.SaveMiniblockCandidate(ctx, candidate3))
			require.NoError(stream.SaveMiniblockCandidate(ctx, candidate4))
		} else {
			require.NoError(stream.SaveMiniblockCandidate(ctx, candidate4))
			require.NoError(stream.SaveMiniblockCandidate(ctx, candidate2))
			require.NoError(stream.SaveMiniblockCandidate(ctx, candidate3))
		}

		view = getView(t, ctx, stream)
		require.Equal(int64(i*3+4), view.LastBlock().Ref.Num)
	}
}

func TestAddEventWithEphemeralEvents(t *testing.T) {
	ctx, tt := makeCacheTestContext(t, testParams{replFactor: 1})
	_ = tt.initCache(0, &MiniblockProducerOpts{TestDisableMbProdcutionOnBlock: true})
	require := require.New(t)
	params := tt.instances[0].params

	spaceStreamId := testutils.FakeStreamId(STREAM_SPACE_BIN)
	genesisMb := MakeGenesisMiniblockForSpaceStream(
		t,
		params.Wallet,
		params.Wallet,
		spaceStreamId,
		nil,
	)

	stream, view := tt.createStream(spaceStreamId, genesisMb.Proto)

	subscriber := &testSubscriber{}
	err := stream.Sub(ctx, view.SyncCookie(tt.instances[0].params.Wallet.Address), subscriber)
	require.NoError(err)

	addEventToStream(t, ctx, params, stream, "1", view.LastBlock().Ref, false)
	addEventToStream(t, ctx, params, stream, "2", view.LastBlock().Ref, true)

	view = getView(t, ctx, stream)
	require.True(view.minipool.size() == 1, "Storage.WriteEvent should be called for non-ephemeral events")

	// Give some time for notifications to be processed
	time.Sleep(10 * time.Millisecond)
	require.Eventually(
		func() bool {
			return len(subscriber.receivedUpdates) == 3
		},
		10*time.Second,
		10*time.Millisecond,
		"Subscriber should receive updates for ephemeral events",
	)

	// Cleanup
	stream.Unsub(subscriber)
}

// testSubscriber is a test implementation of SyncResultReceiver for testing notifications
type testSubscriber struct {
	receivedUpdates []*StreamAndCookie
	receivedErrors  []error
	streamErrors    []StreamId
}

func (s *testSubscriber) OnUpdate(sac *StreamAndCookie) {
	s.receivedUpdates = append(s.receivedUpdates, sac)
}

func (s *testSubscriber) OnSyncError(err error) {
	s.receivedErrors = append(s.receivedErrors, err)
}

func (s *testSubscriber) OnStreamSyncDown(streamID StreamId) {
	s.streamErrors = append(s.streamErrors, streamID)
}
