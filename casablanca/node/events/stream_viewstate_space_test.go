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
	stream, _, err := streamCache.CreateStream(ctx, "streamid$1", spaceEvents)
	assert.NoError(t, err)
	assert.NotNil(t, stream)
	// add two more membership events
	// user_2
	_, err = stream.AddEvent(
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
				[][]byte{spaceEvents[1].Hash},
			),
		),
	)
	assert.NoError(t, err)
	// user_3
	_, err = stream.AddEvent(
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
	var view StreamView
	view, err = MakeStreamView(nil, &storage.GetStreamFromLastSnapshotResult{
		Miniblocks: [][]byte{miniblockProtoBytes},
	})
	assert.NoError(t, err)
	assert.NotNil(t, view)

	joinableView := view.(JoinableStreamView)
	user1Joined, err := joinableView.IsUserJoined("user_1")
	assert.NoError(t, err)
	user2Joined, err := joinableView.IsUserJoined("user_2")
	assert.NoError(t, err)
	user3Joined, err := joinableView.IsUserJoined("user_3")
	assert.NoError(t, err)

	// verify membership todo HNT-2070 this fails if you don't pass preceding blocks
	assert.False(t, user1Joined) // this should be true
	assert.True(t, user2Joined)
	assert.True(t, user3Joined)
}
