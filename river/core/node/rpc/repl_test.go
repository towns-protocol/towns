package rpc

import (
	"testing"

	"github.com/river-build/river/core/node/crypto"
	"github.com/river-build/river/core/node/protocol"
)

func TestReplCreate(t *testing.T) {
	tt := newServiceTester(t, serviceTesterOpts{numNodes: 5, replicationFactor: 5, start: true})
	ctx := tt.ctx
	require := tt.require

	client := tt.testClient(2)

	wallet, err := crypto.NewWallet(ctx)
	require.NoError(err)
	streamId, _, _, err := createUserSettingsStream(
		ctx,
		wallet,
		client,
		nil,
	)
	require.NoError(err)

	// Read mb 0 from storage.
	mbs, err := tt.nodes[4].service.storage.ReadMiniblocks(ctx, streamId, 0, 100)
	require.NoError(err)
	require.Len(mbs, 1)
	mb := mbs[0]

	// Check all other nodes have the same mb.
	for i := range 4 {
		mbs, err := tt.nodes[i].service.storage.ReadMiniblocks(ctx, streamId, 0, 100)
		require.NoError(err)
		require.Len(mbs, 1)
		require.Equal(mb, mbs[0])
	}
}

func TestReplAdd(t *testing.T) {
	tt := newServiceTester(t, serviceTesterOpts{numNodes: 5, replicationFactor: 5, start: true})
	ctx := tt.ctx
	require := tt.require

	client := tt.testClient(2)

	wallet, err := crypto.NewWallet(ctx)
	require.NoError(err)
	streamId, cookie, _, err := createUserSettingsStream(
		ctx,
		wallet,
		client,
		&protocol.StreamSettings{
			DisableMiniblockCreation: true,
		},
	)
	require.NoError(err)

	require.NoError(addUserBlockedFillerEvent(ctx, wallet, client, streamId, cookie.PrevMiniblockHash))

	// Read data from storage.
	data, err := tt.nodes[4].service.storage.ReadStreamFromLastSnapshot(ctx, streamId, 0)
	require.NoError(err)
	require.Zero(data.StartMiniblockNumber)
	require.Len(data.Miniblocks, 1)
	require.Len(data.MinipoolEnvelopes, 1)

	// Check all other nodes have the same data.
	for i := range 4 {
		data2, err := tt.nodes[i].service.storage.ReadStreamFromLastSnapshot(ctx, streamId, 0)
		require.NoError(err)
		require.Equal(data, data2)
	}
}
