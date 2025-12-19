//go:build !race

// This file contains tests that are skipped when the race detector is enabled
// because they are too resource-intensive.

package rpc

import (
	"testing"
	"time"

	"connectrpc.com/connect"
	"github.com/ethereum/go-ethereum/common"

	"github.com/towns-protocol/towns/core/node/crypto"
	"github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/testutils"
	"github.com/towns-protocol/towns/core/node/testutils/testfmt"
)

// TestSyncWithEmptyNodeAddress_NoRace tests that the sync service can handle an empty node address by using sticky
// peer.
func TestSyncWithEmptyNodeAddress_NoRace(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping TestSyncWithEmptyNodeAddress_NoRace in short mode")
	}
	numNodes := 10
	tt := newServiceTester(t, serviceTesterOpts{numNodes: numNodes, start: true})
	ctx := tt.ctx
	require := tt.require

	syncClients := makeSyncClients(tt, 1)
	syncClient0 := syncClients.clients[0].client

	wallet, err := crypto.NewWallet(ctx)
	require.NoError(err)
	resuser, _, err := createUser(ctx, wallet, syncClient0, nil)
	require.NoError(err)
	require.NotNil(resuser)

	_, _, err = createUserMetadataStream(ctx, wallet, syncClient0, nil)
	require.NoError(err)

	// create space with 500 channels and add 1 event to each channel
	spaceId := testutils.FakeStreamId(STREAM_SPACE_BIN)
	_, _, err = createSpace(ctx, wallet, syncClient0, spaceId, &protocol.StreamSettings{})
	require.NoError(err)

	produceChannel := func() (*protocol.SyncCookie, *MiniblockRef) {
		channelId := testutils.MakeChannelId(spaceId)
		channel, channelHash, err := createChannel(
			ctx,
			wallet,
			syncClient0,
			spaceId,
			channelId,
			&protocol.StreamSettings{DisableMiniblockCreation: true},
		)
		require.NoError(err)
		require.NotNil(channel)
		b0ref, err := makeMiniblock(ctx, syncClient0, channelId, false, -1)
		require.NoError(err)
		require.Equal(int64(0), b0ref.Num)

		// do not specify the node address to force the sync service to use sticky peer
		return &protocol.SyncCookie{
			StreamId:          channel.GetStreamId(),
			MinipoolGen:       channel.GetMinipoolGen(),
			PrevMiniblockHash: channel.GetPrevMiniblockHash(),
		}, channelHash
	}

	var channelCookies []*protocol.SyncCookie
	for range 50 {
		channel, channelHash := produceChannel()
		addMessageToChannel(ctx, syncClient0, wallet, "hello", StreamId(channel.StreamId), channelHash, require)
		channelCookies = append(channelCookies, channel)
	}

	// start sync session with all channels and ensure that for each stream an update is received with 1 message
	now := time.Now()
	cleanup := syncClients.startSyncMany(t, ctx, channelCookies)
	defer cleanup()

	syncClients.expectNUpdates(
		t,
		len(channelCookies),
		30*time.Second,
		&updateOpts{events: 1, eventType: "ChannelPayload"},
	)
	testfmt.Printf(
		t,
		"Received first update for all %d streams in init sync session took: %s",
		len(channelCookies),
		time.Since(now),
	)

	// create more streams and add them to the sync via the modify sync endpoint
	var add []*protocol.SyncCookie
	for range 50 {
		channel, channelHash := produceChannel()
		addMessageToChannel(ctx, syncClient0, wallet, "hello", StreamId(channel.StreamId), channelHash, require)
		add = append(add, channel)
	}

	// remove half of the previously added streams and send one more message to the remaining half
	var remove [][]byte
	for _, existingStream := range channelCookies[:len(channelCookies)/2] {
		remove = append(remove, existingStream.GetStreamId())
	}
	for _, existingStream := range channelCookies[len(channelCookies)/2:] {
		res, err := syncClient0.GetLastMiniblockHash(ctx, connect.NewRequest(&protocol.GetLastMiniblockHashRequest{
			StreamId: existingStream.GetStreamId(),
		}))
		require.NoError(err)

		addMessageToChannel(
			ctx,
			syncClient0,
			wallet,
			"hello",
			StreamId(existingStream.GetStreamId()),
			&MiniblockRef{
				Hash: common.BytesToHash(res.Msg.Hash),
				Num:  res.Msg.MiniblockNum,
			},
			require,
		)
	}

	// send modify sync request
	syncClients.modifySync(t, ctx, add, remove)
	syncClients.expectNUpdates(
		t,
		len(add)+len(channelCookies[len(channelCookies)/2:]),
		30*time.Second,
		&updateOpts{events: 1, eventType: "ChannelPayload"},
	)
	testfmt.Printf(
		t,
		"Received second update for all %d streams in init sync session took: %s",
		len(channelCookies),
		time.Since(now),
	)

	// finish testing
	syncClients.cancelAll(t, ctx)
	syncClients.checkDone(t)
}
