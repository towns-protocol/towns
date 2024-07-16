package rpc

import (
	"testing"

	"github.com/river-build/river/core/node/crypto"
	"github.com/river-build/river/core/node/protocol"
	"github.com/river-build/river/core/node/testutils"
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

	tt.eventuallyCompareStreamDataInStorage(streamId, 1, 0)
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

	tt.eventuallyCompareStreamDataInStorage(streamId, 1, 1)
}

func TestReplMiniblock(t *testing.T) {
	testutils.SkipFlackyTest(t)

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

	for range 100 {
		require.NoError(addUserBlockedFillerEvent(ctx, wallet, client, streamId, cookie.PrevMiniblockHash))
	}

	tt.eventuallyCompareStreamDataInStorage(streamId, 1, 100)

	_, mbNum, err := tt.nodes[0].service.mbProducer.TestMakeMiniblock(ctx, streamId, false)
	require.NoError(err)
	require.EqualValues(1, mbNum)
	tt.eventuallyCompareStreamDataInStorage(streamId, 2, 0)
}
