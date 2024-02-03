package events

import (
	"context"
	"testing"

	"github.com/river-build/river/config"
	"github.com/river-build/river/crypto"
	"github.com/river-build/river/protocol"
	"github.com/river-build/river/storage"

	"github.com/stretchr/testify/assert"
	"google.golang.org/protobuf/proto"
)

var streamConfig_viewstate_space_t = config.StreamConfig{
	Media: config.MediaStreamConfig{
		MaxChunkCount: 100,
		MaxChunkSize:  1000000,
	},
	RecencyConstraints: config.RecencyConstraintsConfig{
		AgeSeconds:  5,
		Generations: 5,
	},
	DefaultMinEventsPerSnapshot: 2,
	MinEventsPerSnapshot:        map[string]int{},
}

var config_viewstate_space_t = config.Config{
	Stream: streamConfig_viewstate_space_t,
}

type noopBlockMonitor struct{}

var _ crypto.BlockMonitor = (*noopBlockMonitor)(nil)

func (b *noopBlockMonitor) AddListener(listener crypto.OnNewBlock) {}

func makeEnvelopeWithPayload_T(
	t *testing.T,
	wallet *crypto.Wallet,
	payload protocol.IsStreamEvent_Payload,
	prevMiniblockHash []byte,
) *protocol.Envelope {
	envelope, err := MakeEnvelopeWithPayload(wallet, payload, prevMiniblockHash)
	assert.NoError(t, err)
	return envelope
}

func makeTestSpaceStream(
	t *testing.T,
	wallet *crypto.Wallet,
	userId string,
	spaceId string,
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
		nil,
	)

	events := []*ParsedEvent{
		parsedEvent(t, inception),
		parsedEvent(t, join),
	}
	mb, err := MakeGenesisMiniblock(wallet, events)
	assert.NoError(t, err)
	return events, mb
}

func makeTestChannelStream(
	t *testing.T,
	wallet *crypto.Wallet,
	userId string,
	channelStreamId string,
	spaceSpaceId string,
	channelProperties *protocol.EncryptedData,
	streamSettings *protocol.StreamSettings,
) ([]*ParsedEvent, *protocol.Miniblock) {
	if streamSettings == nil {
		streamSettings = &protocol.StreamSettings{
			DisableMiniblockCreation: true,
		}
	}
	if channelProperties == nil {
		channelProperties = &protocol.EncryptedData{
			Ciphertext: "encrypted text supposed to be here",
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
		nil,
	)
	events := []*ParsedEvent{
		parsedEvent(t, inception),
		parsedEvent(t, join),
	}
	mb, err := MakeGenesisMiniblock(wallet, events)
	assert.NoError(t, err)
	return events, mb
}

func joinSpace_T(
	t *testing.T,
	wallet *crypto.Wallet,
	ctx context.Context,
	syncStream SyncStream,
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
					stream.view.LastBlock().Hash,
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
					stream.view.LastBlock().Hash,
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
					stream.view.LastBlock().Hash,
				),
			),
		)
		assert.NoError(t, err)
	}
}

func getStreamNodes() *StreamNodes {
	return NewStreamNodes([]string{"node_1", "node_2", "node_3"}, "node_1")
}

func TestSpaceViewState(t *testing.T) {
	ctx := config.CtxWithConfig(context.Background(), &config_viewstate_space_t)
	nodeWallet, _ := crypto.NewWallet(ctx)
	user1Wallet, _ := crypto.NewWallet(ctx)
	user2Wallet, _ := crypto.NewWallet(ctx)
	user3Wallet, _ := crypto.NewWallet(ctx)

	streamCache := NewStreamCache(
		&StreamCacheParams{
			Storage:                storage.NewMemStorage(),
			Wallet:                 nodeWallet,
			RiverChainBlockMonitor: &noopBlockMonitor{},
		},
		&streamConfig_viewstate_space_t)
	// create a stream
	_, mb := makeTestSpaceStream(t, user1Wallet, "user_1", "space_1", nil)
	s, _, err := streamCache.CreateStream(ctx, "streamid$1", getStreamNodes(), mb)
	stream := s.(*streamImpl)
	assert.NoError(t, err)
	assert.NotNil(t, stream)
	// add two more membership events
	// user_2
	joinSpace_T(t, user2Wallet, ctx, stream, []string{"user_2"})
	// user_3
	joinSpace_T(t, user3Wallet, ctx, stream, []string{"user_3"})
	// refresh view
	view1, err := stream.GetView(ctx)
	assert.NoError(t, err)
	// check that users 2 and 3 are not joined yet, since we haven't made a miniblock
	spaceViewStateTest_CheckUserJoined(t, view1.(JoinableStreamView), "user_1", true)
	spaceViewStateTest_CheckUserJoined(t, view1.(JoinableStreamView), "user_2", false)
	spaceViewStateTest_CheckUserJoined(t, view1.(JoinableStreamView), "user_3", false)
	// make a miniblock
	_, err = stream.MakeMiniblock(ctx, false)
	assert.NoError(t, err)
	// check that we have 2 blocks
	assert.Equal(t, 2, len(stream.view.blocks))
	// refresh view
	view2, err := stream.GetView(ctx)
	assert.NoError(t, err)
	// check that users are joined
	spaceViewStateTest_CheckUserJoined(t, view2.(JoinableStreamView), "user_1", true)
	spaceViewStateTest_CheckUserJoined(t, view2.(JoinableStreamView), "user_2", true)
	spaceViewStateTest_CheckUserJoined(t, view2.(JoinableStreamView), "user_3", true)
	// now, turn that block into bytes, then load it back into a view
	miniblocks := stream.view.MiniblocksFromLastSnapshot()
	assert.Equal(t, 1, len(miniblocks))
	miniblock := miniblocks[0]
	miniblockProtoBytes, err := proto.Marshal(miniblock)
	assert.NoError(t, err)

	// load up a brand new view from the latest snapshot result
	var view3 StreamView
	view3, err = MakeStreamView(&storage.ReadStreamFromLastSnapshotResult{
		StartMiniblockNumber: 1,
		Miniblocks:           [][]byte{miniblockProtoBytes},
	})
	assert.NoError(t, err)
	assert.NotNil(t, view3)

	// check that users are joined when loading from the snapshot
	spaceViewStateTest_CheckUserJoined(t, view3.(JoinableStreamView), "user_1", true)
	spaceViewStateTest_CheckUserJoined(t, view3.(JoinableStreamView), "user_2", true)
	spaceViewStateTest_CheckUserJoined(t, view3.(JoinableStreamView), "user_3", true)
}

func spaceViewStateTest_CheckUserJoined(t *testing.T, view JoinableStreamView, userId string, expected bool) {
	joined, err := view.IsUserJoined(userId)
	assert.NoError(t, err)
	assert.Equal(t, expected, joined)
}

func TestChannelViewState_JoinedMembers(t *testing.T) {
	/* Arrange */
	ctx := config.CtxWithConfig(context.Background(), &config_viewstate_space_t)
	nodeWallet, _ := crypto.NewWallet(ctx)
	userWallet, _ := crypto.NewWallet(ctx)
	alice := "alice"
	bob := "bob"
	carol := "carol"
	spaceStreamId := "space_1_streamId"
	channelStreamId := "channel_1_streamId"
	streamCache := NewStreamCache(&StreamCacheParams{
		Storage:                storage.NewMemStorage(),
		Wallet:                 nodeWallet,
		RiverChainBlockMonitor: &noopBlockMonitor{},
	}, &streamConfig_viewstate_space_t)
	// create a space stream and add the members
	_, mb := makeTestSpaceStream(t, userWallet, alice, spaceStreamId, nil)
	sStream, _, _ := streamCache.CreateStream(ctx, spaceStreamId, getStreamNodes(), mb)
	spaceStream := sStream.(*streamImpl)
	joinSpace_T(t, userWallet, ctx, spaceStream, []string{bob, carol})
	// create a channel stream and add the members
	_, mb = makeTestChannelStream(t, userWallet, alice, channelStreamId, spaceStreamId, nil, nil)
	cStream, _, _ := streamCache.CreateStream(ctx, channelStreamId, getStreamNodes(), mb)
	channelStream := cStream.(*streamImpl)
	joinChannel_T(t, userWallet, ctx, channelStream, []string{alice, bob, carol})
	// make a miniblock
	_, err := channelStream.MakeMiniblock(ctx, false)
	assert.NoError(t, err)
	// get the miniblock's last snapshot and convert it into bytes
	miniblocks := channelStream.view.MiniblocksFromLastSnapshot()
	miniblock := miniblocks[0]
	miniblockProtoBytes, _ := proto.Marshal(miniblock)
	// create a stream view from the miniblock bytes
	var streamView StreamView
	streamView, err = MakeStreamView(&storage.ReadStreamFromLastSnapshotResult{
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
	ctx := config.CtxWithConfig(context.Background(), &config_viewstate_space_t)
	nodeWallet, _ := crypto.NewWallet(ctx)
	userWallet, _ := crypto.NewWallet(ctx)
	alice := "alice"
	bob := "bob"
	carol := "carol"
	spaceStreamId := "space_1_streamId"
	channelStreamId := "channel_1_streamId"
	streamCache := NewStreamCache(&StreamCacheParams{
		Storage:                storage.NewMemStorage(),
		Wallet:                 nodeWallet,
		RiverChainBlockMonitor: &noopBlockMonitor{},
	}, &streamConfig_viewstate_space_t)
	// create a space stream and add the members
	_, mb := makeTestSpaceStream(t, userWallet, alice, spaceStreamId, nil)
	sStream, _, _ := streamCache.CreateStream(ctx, spaceStreamId, getStreamNodes(), mb)
	spaceStream := sStream.(*streamImpl)
	joinSpace_T(t, userWallet, ctx, spaceStream, []string{bob, carol})
	// create a channel stream and add the members
	_, mb = makeTestChannelStream(t, userWallet, alice, channelStreamId, spaceStreamId, nil, nil)
	cStream, _, _ := streamCache.CreateStream(ctx, channelStreamId, getStreamNodes(), mb)
	channelStream := cStream.(*streamImpl)
	joinChannel_T(t, userWallet, ctx, channelStream, []string{alice, bob, carol})
	// bob leaves the channel
	leaveChannel_T(t, userWallet, ctx, channelStream, []string{bob})
	// make a miniblock
	_, err := channelStream.MakeMiniblock(ctx, false)
	assert.NoError(t, err)
	// get the miniblock's last snapshot and convert it into bytes
	miniblocks := channelStream.view.MiniblocksFromLastSnapshot()
	miniblock := miniblocks[0]
	miniblockProtoBytes, _ := proto.Marshal(miniblock)
	// create a stream view from the miniblock bytes
	var streamView StreamView
	streamView, err = MakeStreamView(&storage.ReadStreamFromLastSnapshotResult{
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
