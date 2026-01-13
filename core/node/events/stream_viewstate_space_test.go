package events

import (
	"context"
	"testing"

	"github.com/ethereum/go-ethereum/common"
	"github.com/stretchr/testify/require"
	"google.golang.org/protobuf/proto"

	"github.com/towns-protocol/towns/core/node/crypto"
	"github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/storage"
	"github.com/towns-protocol/towns/core/node/testutils"
)

func makeEnvelopeWithPayload_T(
	t *testing.T,
	wallet *crypto.Wallet,
	payload protocol.IsStreamEvent_Payload,
	prevMiniblock *MiniblockRef,
) *protocol.Envelope {
	envelope, err := MakeEnvelopeWithPayload(wallet, payload, prevMiniblock)
	require.NoError(t, err)
	return envelope
}

func makeTestSpaceStream(
	t *testing.T,
	userWallet *crypto.Wallet,
	spaceId StreamId,
	streamSettings *protocol.StreamSettings,
) ([]*ParsedEvent, *protocol.Miniblock) {
	userAddess := userWallet.Address.Bytes()
	if streamSettings == nil {
		streamSettings = &protocol.StreamSettings{
			DisableMiniblockCreation: true,
		}
	}
	inception := makeEnvelopeWithPayload_T(
		t,
		userWallet,
		Make_SpacePayload_Inception(
			spaceId,
			streamSettings,
		),
		nil,
	)
	join := makeEnvelopeWithPayload_T(
		t,
		userWallet,
		Make_MemberPayload_Membership(
			protocol.MembershipOp_SO_JOIN,
			userAddess,
			userAddess,
			nil,
			common.Address{},
			common.Address{},
		),
		nil,
	)

	events := []*ParsedEvent{
		parsedEvent(t, inception),
		parsedEvent(t, join),
	}
	mb, err := MakeGenesisMiniblock(userWallet, events)
	require.NoError(t, err)
	return events, mb
}

func makeTestChannelStream(
	t *testing.T,
	wallet *crypto.Wallet,
	userId string,
	channelStreamId StreamId,
	spaceSpaceId StreamId,
	streamSettings *protocol.StreamSettings,
) ([]*ParsedEvent, *protocol.Miniblock) {
	if streamSettings == nil {
		streamSettings = &protocol.StreamSettings{
			DisableMiniblockCreation: true,
		}
	}
	inception := makeEnvelopeWithPayload_T(
		t,
		wallet,
		Make_ChannelPayload_Inception(
			channelStreamId,
			streamSettings,
		),
		nil,
	)
	join := makeEnvelopeWithPayload_T(
		t,
		wallet,
		Make_ChannelPayload_Membership(protocol.MembershipOp_SO_JOIN, userId, userId),
		nil,
	)
	events := []*ParsedEvent{
		parsedEvent(t, inception),
		parsedEvent(t, join),
	}
	mb, err := MakeGenesisMiniblock(wallet, events)
	require.NoError(t, err)
	return events, mb
}

func joinSpace_T(
	t *testing.T,
	wallet *crypto.Wallet,
	ctx context.Context,
	syncStream *Stream,
	users []string,
) {
	stream := syncStream
	for _, user := range users {
		err := stream.AddEvent(
			ctx,
			parsedEvent(
				t,
				makeEnvelopeWithPayload_T(
					t,
					wallet,
					Make_SpacePayload_Membership(
						protocol.MembershipOp_SO_JOIN,
						user,
						user,
					),
					stream.getViewLocked().LastBlock().Ref,
				),
			),
		)
		require.NoError(t, err)
	}
}

func joinChannel_T(
	t *testing.T,
	wallet *crypto.Wallet,
	ctx context.Context,
	syncStream *Stream,
	users []string,
) {
	stream := syncStream
	for _, user := range users {
		err := stream.AddEvent(
			ctx,
			parsedEvent(
				t,
				makeEnvelopeWithPayload_T(
					t,
					wallet,
					Make_ChannelPayload_Membership(
						protocol.MembershipOp_SO_JOIN,
						user,
						user,
					),
					stream.getViewLocked().LastBlock().Ref,
				),
			),
		)
		require.NoError(t, err)
	}
}

func leaveChannel_T(
	t *testing.T,
	wallet *crypto.Wallet,
	ctx context.Context,
	syncStream *Stream,
	users []string,
) {
	stream := syncStream
	for _, user := range users {
		err := stream.AddEvent(
			ctx,
			parsedEvent(
				t,
				makeEnvelopeWithPayload_T(
					t,
					wallet,
					Make_ChannelPayload_Membership(
						protocol.MembershipOp_SO_LEAVE,
						user,
						user,
					),
					stream.getViewLocked().LastBlock().Ref,
				),
			),
		)
		require.NoError(t, err)
	}
}

func TestSpaceViewState(t *testing.T) {
	ctx, tt := makeCacheTestContext(t, testParams{
		defaultMinEventsPerSnapshot: 2,
	})
	_ = tt.initCache(0, nil)

	user1Wallet, _ := crypto.NewWallet(ctx)
	user2Wallet, _ := crypto.NewWallet(ctx)
	user3Wallet, _ := crypto.NewWallet(ctx)

	// create a stream
	spaceStreamId := testutils.FakeStreamId(STREAM_SPACE_BIN)
	user2Id, err := AddressHex(user2Wallet.Address.Bytes())
	require.NoError(t, err)
	user3Id, err := AddressHex(user3Wallet.Address.Bytes())
	require.NoError(t, err)

	_, mb := makeTestSpaceStream(t, user1Wallet, spaceStreamId, nil)
	s, _ := tt.createStream(spaceStreamId, mb)
	stream := s
	require.NotNil(t, stream)
	// refresh view
	view0, err := stream.GetView(ctx)
	require.NoError(t, err)
	// check that users 2 and 3 are not joined yet,
	spaceViewStateTest_CheckUserJoined(t, view0, user1Wallet, true)
	spaceViewStateTest_CheckUserJoined(t, view0, user2Wallet, false)
	spaceViewStateTest_CheckUserJoined(t, view0, user3Wallet, false)
	// add two more membership events
	// user_2
	joinSpace_T(t, user2Wallet, ctx, stream, []string{user2Id})
	// user_3
	joinSpace_T(t, user3Wallet, ctx, stream, []string{user3Id})
	// get a new view
	view1, err := stream.GetView(ctx)
	require.NoError(t, err)
	// users show up as joined immediately, because we need that information to continue to add events
	spaceViewStateTest_CheckUserJoined(t, view1, user1Wallet, true)
	spaceViewStateTest_CheckUserJoined(t, view1, user2Wallet, true)
	spaceViewStateTest_CheckUserJoined(t, view1, user3Wallet, true)
	require.Equal(t, 1, len(stream.getViewLocked().blocks))

	// make a miniblock
	_ = tt.makeMiniblock(0, spaceStreamId, false)
	// check that we have 2 blocks
	require.Equal(t, 2, len(stream.getViewLocked().blocks))
	// refresh view
	view2, err := stream.GetView(ctx)
	require.NoError(t, err)
	// check that users are joined
	spaceViewStateTest_CheckUserJoined(t, view2, user1Wallet, true)
	spaceViewStateTest_CheckUserJoined(t, view2, user2Wallet, true)
	spaceViewStateTest_CheckUserJoined(t, view2, user3Wallet, true)
	// now, turn that block into bytes, then load it back into a view
	miniblocks, snapshot := stream.getViewLocked().MiniblocksFromLastSnapshot()
	require.Equal(t, 1, len(miniblocks))
	require.NotNil(t, snapshot)
	miniblock := miniblocks[0]
	miniblockProtoBytes, err := proto.Marshal(miniblock)
	require.NoError(t, err)
	snapshotBytes, err := proto.Marshal(snapshot)
	require.NoError(t, err)

	// load up a brand new view from the latest snapshot result
	var view3 *StreamView
	view3, err = MakeStreamView(
		ctx,
		spaceStreamId,
		&storage.ReadStreamFromLastSnapshotResult{
			Miniblocks: []*storage.MiniblockDescriptor{
				{Number: 1, Data: miniblockProtoBytes, Snapshot: snapshotBytes},
			},
		},
	)
	require.NoError(t, err)
	require.NotNil(t, view3)

	// check that users are joined when loading from the snapshot
	spaceViewStateTest_CheckUserJoined(t, view3, user1Wallet, true)
	spaceViewStateTest_CheckUserJoined(t, view3, user2Wallet, true)
	spaceViewStateTest_CheckUserJoined(t, view3, user3Wallet, true)
}

func spaceViewStateTest_CheckUserJoined(
	t *testing.T,
	view *StreamView,
	userWallet *crypto.Wallet,
	expected bool,
) {
	joined, err := view.IsMember(userWallet.Address.Bytes())
	require.NoError(t, err)
	require.Equal(t, expected, joined)
}

func TestChannelViewState_JoinedMembers(t *testing.T) {
	ctx, tt := makeCacheTestContext(t, testParams{
		replFactor:                  1,
		defaultMinEventsPerSnapshot: 2,
	})
	_ = tt.initCache(0, nil)

	userWallet, _ := crypto.NewWallet(ctx)
	aliceWallet, _ := crypto.NewWallet(ctx)
	bobWallet, _ := crypto.NewWallet(ctx)
	carolWallet, _ := crypto.NewWallet(ctx)
	alice, err := AddressHex(aliceWallet.Address.Bytes())
	require.NoError(t, err)
	bob, err := AddressHex(bobWallet.Address.Bytes())
	require.NoError(t, err)
	carol, err := AddressHex(carolWallet.Address.Bytes())
	require.NoError(t, err)
	spaceStreamId := testutils.FakeStreamId(STREAM_SPACE_BIN)
	channelStreamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)

	// create a space stream and add the members
	_, mb := makeTestSpaceStream(t, userWallet, spaceStreamId, nil)
	sStream, _ := tt.createStream(spaceStreamId, mb)
	spaceStream := sStream
	joinSpace_T(t, userWallet, ctx, spaceStream, []string{bob, carol})
	// create a channel stream and add the members
	_, mb = makeTestChannelStream(t, userWallet, alice, channelStreamId, spaceStreamId, nil)
	cStream, _ := tt.createStream(channelStreamId, mb)
	channelStream := cStream
	joinChannel_T(t, userWallet, ctx, channelStream, []string{alice, bob, carol})
	// make a miniblock
	_ = tt.makeMiniblock(0, channelStreamId, false)
	// get the miniblock's last snapshot and convert it into bytes
	miniblocks, snapshot := channelStream.getViewLocked().MiniblocksFromLastSnapshot()
	require.NotNil(t, snapshot)
	miniblock := miniblocks[0]
	miniblockProtoBytes, _ := proto.Marshal(miniblock)
	snapshotBytes, _ := proto.Marshal(snapshot)
	// create a stream view from the miniblock bytes
	var streamView *StreamView
	streamView, err = MakeStreamView(
		ctx,
		channelStreamId,
		&storage.ReadStreamFromLastSnapshotResult{
			Miniblocks: []*storage.MiniblockDescriptor{
				{Number: 1, Data: miniblockProtoBytes, Snapshot: snapshotBytes},
			},
		},
	)
	require.NoError(t, err)

	/* Act */
	// create a channel view from the stream view
	allJoinedMembers, err := streamView.GetChannelMembers()

	/* Assert */
	require.NoError(t, err)
	require.Equal(t, allJoinedMembers.Cardinality(), 3)
	require.Equal(t, allJoinedMembers.Contains(alice), true)
	require.Equal(t, allJoinedMembers.Contains(bob), true)
	require.Equal(t, allJoinedMembers.Contains(carol), true)
}

func TestChannelViewState_RemainingMembers(t *testing.T) {
	ctx, tt := makeCacheTestContext(t, testParams{
		replFactor:                  1,
		defaultMinEventsPerSnapshot: 2,
	})
	_ = tt.initCache(0, nil)

	userWallet, _ := crypto.NewWallet(ctx)
	aliceWallet, _ := crypto.NewWallet(ctx)
	bobWallet, _ := crypto.NewWallet(ctx)
	carolWallet, _ := crypto.NewWallet(ctx)
	alice, err := AddressHex(aliceWallet.Address.Bytes())
	require.NoError(t, err)
	bob, err := AddressHex(bobWallet.Address.Bytes())
	require.NoError(t, err)
	carol, err := AddressHex(carolWallet.Address.Bytes())
	require.NoError(t, err)
	spaceStreamId := testutils.FakeStreamId(STREAM_SPACE_BIN)
	channelStreamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)

	// create a space stream and add the members
	_, mb := makeTestSpaceStream(t, userWallet, spaceStreamId, nil)
	sStream, _ := tt.createStream(spaceStreamId, mb)
	spaceStream := sStream
	joinSpace_T(t, userWallet, ctx, spaceStream, []string{bob, carol})
	// create a channel stream and add the members
	_, mb = makeTestChannelStream(t, userWallet, alice, channelStreamId, spaceStreamId, nil)
	cStream, _ := tt.createStream(channelStreamId, mb)
	channelStream := cStream
	joinChannel_T(t, userWallet, ctx, channelStream, []string{alice, bob, carol})
	// bob leaves the channel
	leaveChannel_T(t, userWallet, ctx, channelStream, []string{bob})
	// make a miniblock
	_ = tt.makeMiniblock(0, channelStreamId, false)
	// get the miniblock's last snapshot and convert it into bytes
	miniblocks, snapshot := channelStream.getViewLocked().MiniblocksFromLastSnapshot()
	require.NotNil(t, snapshot)
	miniblock := miniblocks[0]
	miniblockProtoBytes, _ := proto.Marshal(miniblock)
	snapshotBytes, _ := proto.Marshal(snapshot)
	// create a stream view from the miniblock bytes
	var streamView *StreamView
	streamView, err = MakeStreamView(
		ctx,
		channelStreamId,
		&storage.ReadStreamFromLastSnapshotResult{
			Miniblocks: []*storage.MiniblockDescriptor{
				{Number: 1, Data: miniblockProtoBytes, Snapshot: snapshotBytes},
			},
		},
	)
	require.NoError(t, err)

	/* Act */
	// create a channel view from the stream view
	allJoinedMembers, err := streamView.GetChannelMembers()

	/* Assert */
	require.NoError(t, err)
	require.Equal(t, 2, allJoinedMembers.Cardinality())
	require.Equal(t, true, allJoinedMembers.Contains(alice))
	require.Equal(t, false, allJoinedMembers.Contains(bob))
	require.Equal(t, true, allJoinedMembers.Contains(carol))
}
