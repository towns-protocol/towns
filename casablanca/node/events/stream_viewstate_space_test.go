package events

import (
	"casablanca/node/crypto"
	"casablanca/node/protocol"
	"casablanca/node/storage"
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"google.golang.org/protobuf/proto"
)

func makeEnvelopeWithPayload_T(t *testing.T, wallet *crypto.Wallet, payload protocol.IsStreamEvent_Payload, prevHashes [][]byte) *protocol.Envelope {
	envelope, err := MakeEnvelopeWithPayload(wallet, payload, prevHashes)
	assert.NoError(t, err)
	return envelope
}

func makeTestSpaceStream(t *testing.T, wallet *crypto.Wallet, userId string, spaceId string, streamSettings *protocol.StreamSettings) []*ParsedEvent {
	if streamSettings == nil {
		streamSettings = &protocol.StreamSettings{
			MinEventsPerSnapshot: 2,
			MiniblockTimeMs:      10000000, // should not run during test
		}
	}
	inception := makeEnvelopeWithPayload_T(
		t,
		wallet,
		Make_SpacePayload_Inception(
			spaceId,
			streamSettings,
		),
		nil,
	)
	join := makeEnvelopeWithPayload_T(
		t,
		wallet,
		Make_SpacePayload_Membership(protocol.MembershipOp_SO_JOIN, userId),
		[][]byte{inception.Hash},
	)
	return []*ParsedEvent{
		parsedEvent(t, inception),
		parsedEvent(t, join),
	}
}

func makeTestChannelStream(
	t *testing.T,
	wallet *crypto.Wallet,
	userId string,
	channelStreamId string,
	spaceSpaceId string,
	channelProperties *protocol.EncryptedData,
	streamSettings *protocol.StreamSettings,
) []*ParsedEvent {
	if streamSettings == nil {
		streamSettings = &protocol.StreamSettings{
			MinEventsPerSnapshot: 2,
			MiniblockTimeMs:      10000000,
		}
	}
	if channelProperties == nil {
		channelProperties = &protocol.EncryptedData{
			Text: "encrypted text supposed to be here",
		}
	}
	inception := makeEnvelopeWithPayload_T(
		t,
		wallet,
		Make_ChannelPayload_Inception(
			channelStreamId,
			spaceSpaceId,
			channelProperties,
			streamSettings,
		),
		nil,
	)
	join := makeEnvelopeWithPayload_T(
		t,
		wallet,
		Make_ChannelPayload_Membership(protocol.MembershipOp_SO_JOIN, userId),
		[][]byte{inception.Hash},
	)
	return []*ParsedEvent{
		parsedEvent(t, inception),
		parsedEvent(t, join),
	}
}

func joinSpace_T(
	t *testing.T,
	wallet *crypto.Wallet,
	ctx context.Context,
	syncStream SyncStream,
	spaceEvents []*ParsedEvent,
	users []string,
) {
	stream := syncStream.(*streamImpl)
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
					),
					[][]byte{spaceEvents[1].Hash},
				),
			),
		)
		assert.NoError(t, err)
	}
}

func joinChannel_T(
	t *testing.T,
	wallet *crypto.Wallet,
	ctx context.Context,
	syncStream SyncStream,
	channelEvents []*ParsedEvent,
	users []string,
) {
	stream := syncStream.(*streamImpl)
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
					),
					[][]byte{channelEvents[1].Hash},
				),
			),
		)
		assert.NoError(t, err)
	}
}

func leaveChannel_T(
	t *testing.T,
	wallet *crypto.Wallet,
	ctx context.Context,
	syncStream SyncStream,
	channelEvents []*ParsedEvent,
	users []string,
) {
	stream := syncStream.(*streamImpl)
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
					),
					[][]byte{channelEvents[1].Hash},
				),
			),
		)
		assert.NoError(t, err)
	}
}

func TestSpaceViewState(t *testing.T) {
	ctx := context.Background()
	nodeWallet, _ := crypto.NewWallet(ctx)
	user1Wallet, _ := crypto.NewWallet(ctx)
	user2Wallet, _ := crypto.NewWallet(ctx)
	user3Wallet, _ := crypto.NewWallet(ctx)

	streamCache := NewStreamCache(&StreamCacheParams{
		Storage:    storage.NewMemStorage(),
		Wallet:     nodeWallet,
		DefaultCtx: ctx,
	})
	// create a stream
	spaceEvents := makeTestSpaceStream(t, user1Wallet, "user_1", "space_1", nil)
	s, _, err := streamCache.CreateStream(ctx, "streamid$1", spaceEvents)
	stream := s.(*streamImpl)
	assert.NoError(t, err)
	assert.NotNil(t, stream)
	// add two more membership events
	// user_2
	joinSpace_T(t, user2Wallet, ctx, stream, spaceEvents, []string{"user_2"})
	// refresh view
	_, err = stream.GetView(ctx)
	assert.NoError(t, err)
	// user_3
	joinSpace_T(t, user3Wallet, ctx, stream, spaceEvents, []string{"user_3"})
	// refresh view
	view1, err := stream.GetView(ctx)
	assert.NoError(t, err)
	// check that users are joined when loading from the snapshot
	spaceViewStateTest_CheckUserJoined(t, view1.(JoinableStreamView), "user_1", true)
	spaceViewStateTest_CheckUserJoined(t, view1.(JoinableStreamView), "user_2", true)
	spaceViewStateTest_CheckUserJoined(t, view1.(JoinableStreamView), "user_3", true)

	// make a miniblock
	err = stream.makeMiniblock(ctx)
	assert.NoError(t, err)
	// check that we have 2 blocks
	assert.Equal(t, 2, len(stream.view.blocks))
	// now, turn that block into bytes, then load it back into a view
	miniblocks := stream.view.MiniblocksFromLastSnapshot()
	assert.Equal(t, 1, len(miniblocks))
	miniblock := miniblocks[0]
	miniblockProtoBytes, err := proto.Marshal(miniblock)
	assert.NoError(t, err)
	// load up a brand new view from the latest snapshot result
	var view2 StreamView
	view2, err = MakeStreamView(&storage.GetStreamFromLastSnapshotResult{
		StartMiniblockNumber: 1,
		Miniblocks:           [][]byte{miniblockProtoBytes},
	})
	assert.NoError(t, err)
	assert.NotNil(t, view2)

	// check that users are joined when loading from the snapshot
	spaceViewStateTest_CheckUserJoined(t, view2.(JoinableStreamView), "user_1", true)
	spaceViewStateTest_CheckUserJoined(t, view2.(JoinableStreamView), "user_2", true)
	spaceViewStateTest_CheckUserJoined(t, view2.(JoinableStreamView), "user_3", true)

}

func spaceViewStateTest_CheckUserJoined(t *testing.T, view JoinableStreamView, userId string, expected bool) {
	joined, err := view.IsUserJoined(userId)
	assert.NoError(t, err)
	assert.Equal(t, expected, joined)
}

func TestChannelViewState_JoinedMembers(t *testing.T) {
	/* Arrange */
	ctx := context.Background()
	nodeWallet, _ := crypto.NewWallet(ctx)
	userWallet, _ := crypto.NewWallet(ctx)
	alice := "alice"
	bob := "bob"
	carol := "carol"
	spaceStreamId := "space_1_streamId"
	channelStreamId := "channel_1_streamId"
	streamCache := NewStreamCache(&StreamCacheParams{
		Storage:    storage.NewMemStorage(),
		Wallet:     nodeWallet,
		DefaultCtx: ctx,
	})
	// create a space stream and add the members
	spaceEvents := makeTestSpaceStream(t, userWallet, alice, spaceStreamId, nil)
	sStream, _, _ := streamCache.CreateStream(ctx, spaceStreamId, spaceEvents)
	spaceStream := sStream.(*streamImpl)
	joinSpace_T(t, userWallet, ctx, spaceStream, spaceEvents, []string{bob, carol})
	// create a channel stream and add the members
	channelEvents := makeTestChannelStream(t, userWallet, alice, channelStreamId, spaceStreamId, nil, nil)
	cStream, _, _ := streamCache.CreateStream(ctx, channelStreamId, channelEvents)
	channelStream := cStream.(*streamImpl)
	joinChannel_T(t, userWallet, ctx, channelStream, channelEvents, []string{alice, bob, carol})
	// make a miniblock
	err := channelStream.makeMiniblock(ctx)
	assert.NoError(t, err)
	// get the miniblock's last snapshot and convert it into bytes
	miniblocks := channelStream.view.MiniblocksFromLastSnapshot()
	miniblock := miniblocks[0]
	miniblockProtoBytes, _ := proto.Marshal(miniblock)
	// create a stream view from the miniblock bytes
	var streamView StreamView
	streamView, err = MakeStreamView(&storage.GetStreamFromLastSnapshotResult{
		StartMiniblockNumber: 1,
		Miniblocks:           [][]byte{miniblockProtoBytes},
	})
	assert.NoError(t, err)

	/* Act */
	// create a channel view from the stream view
	channelView := streamView.(JoinableStreamView)
	allJoinedMembers, err := channelView.GetChannelMembers()

	/* Assert */
	assert.NoError(t, err)
	assert.Equal(t, (*allJoinedMembers).Cardinality(), 3)
	assert.Equal(t, (*allJoinedMembers).Contains(alice), true)
	assert.Equal(t, (*allJoinedMembers).Contains(bob), true)
	assert.Equal(t, (*allJoinedMembers).Contains(carol), true)
}

func TestChannelViewState_RemainingMembers(t *testing.T) {
	/* Arrange */
	ctx := context.Background()
	nodeWallet, _ := crypto.NewWallet(ctx)
	userWallet, _ := crypto.NewWallet(ctx)
	alice := "alice"
	bob := "bob"
	carol := "carol"
	spaceStreamId := "space_1_streamId"
	channelStreamId := "channel_1_streamId"
	streamCache := NewStreamCache(&StreamCacheParams{
		Storage:    storage.NewMemStorage(),
		Wallet:     nodeWallet,
		DefaultCtx: ctx,
	})
	// create a space stream and add the members
	spaceEvents := makeTestSpaceStream(t, userWallet, alice, spaceStreamId, nil)
	sStream, _, _ := streamCache.CreateStream(ctx, spaceStreamId, spaceEvents)
	spaceStream := sStream.(*streamImpl)
	joinSpace_T(t, userWallet, ctx, spaceStream, spaceEvents, []string{bob, carol})
	// create a channel stream and add the members
	channelEvents := makeTestChannelStream(t, userWallet, alice, channelStreamId, spaceStreamId, nil, nil)
	cStream, _, _ := streamCache.CreateStream(ctx, channelStreamId, channelEvents)
	channelStream := cStream.(*streamImpl)
	joinChannel_T(t, userWallet, ctx, channelStream, channelEvents, []string{alice, bob, carol})
	// bob leaves the channel
	leaveChannel_T(t, userWallet, ctx, channelStream, channelEvents, []string{bob})
	// make a miniblock
	err := channelStream.makeMiniblock(ctx)
	assert.NoError(t, err)
	// get the miniblock's last snapshot and convert it into bytes
	miniblocks := channelStream.view.MiniblocksFromLastSnapshot()
	miniblock := miniblocks[0]
	miniblockProtoBytes, _ := proto.Marshal(miniblock)
	// create a stream view from the miniblock bytes
	var streamView StreamView
	streamView, err = MakeStreamView(&storage.GetStreamFromLastSnapshotResult{
		StartMiniblockNumber: 1,
		Miniblocks:           [][]byte{miniblockProtoBytes},
	})
	assert.NoError(t, err)

	/* Act */
	// create a channel view from the stream view
	channelView := streamView.(JoinableStreamView)
	allJoinedMembers, err := channelView.GetChannelMembers()

	/* Assert */
	assert.NoError(t, err)
	assert.Equal(t, (*allJoinedMembers).Cardinality(), 2)
	assert.Equal(t, (*allJoinedMembers).Contains(alice), true)
	assert.Equal(t, (*allJoinedMembers).Contains(bob), false)
	assert.Equal(t, (*allJoinedMembers).Contains(carol), true)
}
