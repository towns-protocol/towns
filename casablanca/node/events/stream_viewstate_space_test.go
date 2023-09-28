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
	s, view1, err := streamCache.CreateStream(ctx, "streamid$1", spaceEvents)
	stream := s.(*streamImpl)
	assert.NoError(t, err)
	assert.NotNil(t, stream)
	// add two more membership events
	// user_2
	err = stream.AddEvent(
		ctx,
		parsedEvent(
			t,
			makeEnvelopeWithPayload_T(
				t,
				user2Wallet,
				Make_SpacePayload_Membership(
					protocol.MembershipOp_SO_JOIN,
					"user_2",
				),
				[][]byte{view1.LastEvent().Hash},
			),
		),
	)
	assert.NoError(t, err)
	// refresh view
	_, err = stream.GetView(ctx)
	assert.NoError(t, err)
	// user_3
	err = stream.AddEvent(
		ctx,
		parsedEvent(
			t,
			makeEnvelopeWithPayload_T(
				t,
				user3Wallet,
				Make_SpacePayload_Membership(
					protocol.MembershipOp_SO_JOIN,
					"user_3",
				),
				[][]byte{spaceEvents[1].Hash},
			),
		),
	)
	assert.NoError(t, err)
	// refresh view
	view1, err = stream.GetView(ctx)
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
		Miniblocks: [][]byte{miniblockProtoBytes},
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
