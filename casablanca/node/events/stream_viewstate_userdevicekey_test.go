package events

import (
	"casablanca/node/common"
	"casablanca/node/crypto"
	"casablanca/node/protocol"
	"casablanca/node/storage"
	"context"
	"encoding/hex"
	"testing"

	"github.com/stretchr/testify/assert"
	"google.golang.org/protobuf/proto"
)

func makeTestUserDeviceKeyStream(t *testing.T, wallet *crypto.Wallet, streamSettings *protocol.StreamSettings) ([]*ParsedEvent, string, string) {
	userId, err := common.AddressHex(wallet.Address.Bytes())
	assert.NoError(t, err)
	streamId, err := common.UserDeviceKeyStreamIdFromId(userId)
	assert.NoError(t, err)
	if streamSettings == nil {
		streamSettings = &protocol.StreamSettings{
			MinEventsPerSnapshot: 2,
			MiniblockTimeMs:      10000000, // should not run during test
		}
	}
	inception := makeEnvelopeWithPayload_T(
		t,
		wallet,
		Make_UserDeviceKeyPayload_Inception(
			streamId,
			userId,
			streamSettings,
		),
		nil,
	)
	return []*ParsedEvent{
		parsedEvent(t, inception),
	}, streamId, userId
}

func TestUserDeviceKeyViewState(t *testing.T) {
	ctx := context.Background()
	nodeWallet, _ := crypto.NewWallet(ctx)

	userWallet1, _ := crypto.NewWallet(ctx)
	userWallet2, _ := crypto.NewWallet(ctx)
	userWallet3, _ := crypto.NewWallet(ctx)

	deviceId1, err := crypto.GetDeviceId(userWallet1)
	assert.NoError(t, err)
	deviceId2, err := crypto.GetDeviceId(userWallet2)
	assert.NoError(t, err)
	deviceId3, err := crypto.GetDeviceId(userWallet3)
	assert.NoError(t, err)

	streamCache := NewStreamCache(&StreamCacheParams{
		Storage:    storage.NewMemStorage(),
		Wallet:     nodeWallet,
		DefaultCtx: ctx,
	})
	// create a stream
	events, streamId, userId := makeTestUserDeviceKeyStream(t, userWallet1, nil)
	s, view1, err := streamCache.CreateStream(ctx, streamId, events)
	stream := s.(*streamImpl)
	assert.NoError(t, err)
	assert.NotNil(t, stream)
	// assert assumptions
	UDKViewStateText_CheckDKRevoked(t, view1.(UserDeviceStreamView), deviceId1, false)
	// add some revocations, enough to allow a snapshot
	for _, deviceId := range []string{deviceId1, deviceId2, deviceId3} {
		err = stream.AddEvent(
			ctx,
			parsedEvent(
				t,
				makeEnvelopeWithPayload_T(
					t,
					userWallet1,
					Make_UserDeviceKeyPayload_RevokeUserDeviceKey(
						userId,
						deviceId,
					),
					[][]byte{stream.view.LastEvent().Hash},
				),
			),
		)
		assert.NoError(t, err)
	}
	// update the view to latest
	view1, err = stream.GetView(ctx)
	assert.NoError(t, err)
	// check that users are joined when loading from the snapshot
	UDKViewStateText_CheckDKRevoked(t, view1.(UserDeviceStreamView), deviceId1, true)
	UDKViewStateText_CheckDKRevoked(t, view1.(UserDeviceStreamView), deviceId2, true)
	UDKViewStateText_CheckDKRevoked(t, view1.(UserDeviceStreamView), deviceId3, true)

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
	UDKViewStateText_CheckDKRevoked(t, view2.(UserDeviceStreamView), deviceId1, true)
	UDKViewStateText_CheckDKRevoked(t, view2.(UserDeviceStreamView), deviceId2, true)
	UDKViewStateText_CheckDKRevoked(t, view2.(UserDeviceStreamView), deviceId3, true)
}

func UDKViewStateText_CheckDKRevoked(t *testing.T, view UserDeviceStreamView, deviceIdStr string, expected bool) {
	deviceId, err := hex.DecodeString(deviceIdStr)
	assert.NoError(t, err)
	deviceRdkId, err := crypto.RdkIdFromSlice(deviceId)
	assert.NoError(t, err)
	joined, err := view.IsDeviceIdRevoked(deviceRdkId)
	assert.NoError(t, err)
	assert.Equal(t, expected, joined)
}
