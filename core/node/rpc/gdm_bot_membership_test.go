package rpc

import (
	"context"
	"testing"

	"connectrpc.com/connect"
	"github.com/ethereum/go-ethereum/common"
	"github.com/stretchr/testify/require"

	"github.com/towns-protocol/towns/core/node/crypto"
	"github.com/towns-protocol/towns/core/node/events"
	. "github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/protocol/protocolconnect"
	. "github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/testutils"
)

// createBotUser creates a bot user stream with app_address in inception
func createBotUser(
	ctx context.Context,
	require *require.Assertions,
	botWallet *crypto.Wallet,
	appAddress common.Address,
	client protocolconnect.StreamServiceClient,
) *SyncCookie {
	userStreamId := UserStreamIdFromAddr(botWallet.Address)
	inceptionPayload := &StreamEvent_UserPayload{
		UserPayload: &UserPayload{
			Content: &UserPayload_Inception_{
				Inception: &UserPayload_Inception{
					StreamId:   userStreamId[:],
					AppAddress: appAddress.Bytes(),
				},
			},
		},
	}
	inception, err := events.MakeEnvelopeWithPayload(botWallet, inceptionPayload, nil)
	require.NoError(err)
	res, err := client.CreateStream(ctx, connect.NewRequest(&CreateStreamRequest{
		Events:   []*Envelope{inception},
		StreamId: userStreamId[:],
	}))
	require.NoError(err)
	return res.Msg.Stream.NextSyncCookie
}

// joinGDMSelfSign has a user sign their own join event (initiator becomes the signer)
func joinGDMSelfSign(
	ctx context.Context,
	userWallet *crypto.Wallet,
	inviterAddress common.Address, // Only used if event signed by node
	gdmStreamId StreamId,
	userSyncCookie *SyncCookie,
	client protocolconnect.StreamServiceClient,
) error {
	userJoin, err := events.MakeEnvelopeWithPayload(
		userWallet,
		events.Make_UserPayload_Membership(
			MembershipOp_SO_JOIN,
			gdmStreamId,
			inviterAddress,
			nil,
		),
		&MiniblockRef{
			Hash: common.BytesToHash(userSyncCookie.PrevMiniblockHash),
			Num:  userSyncCookie.MinipoolGen - 1,
		},
	)
	if err != nil {
		return err
	}
	_, err = client.AddEvent(ctx, connect.NewRequest(&AddEventRequest{
		StreamId: userSyncCookie.StreamId,
		Event:    userJoin,
	}))
	return err
}

func TestGDMBotMembership_BotJoinWithSponsor(t *testing.T) {
	tester := newServiceTester(t, serviceTesterOpts{numNodes: 1, start: true})
	ctx := tester.ctx
	require := tester.require
	client := tester.testClient(0)

	aliceWallet, _ := crypto.NewWallet(ctx)
	bobWallet, _ := crypto.NewWallet(ctx)
	carolWallet, _ := crypto.NewWallet(ctx)
	botWallet, _ := crypto.NewWallet(ctx)
	appAddress := common.HexToAddress("0x1234567890123456789012345678901234567890")

	for _, w := range []*crypto.Wallet{aliceWallet, bobWallet, carolWallet} {
		_, _, err := createUser(ctx, w, client, nil)
		require.NoError(err)
		_, _, err = createUserMetadataStream(ctx, w, client, nil)
		require.NoError(err)
	}

	botCookie := createBotUser(ctx, require, botWallet, appAddress, client)

	gdmStreamId := testutils.FakeStreamId(STREAM_GDM_CHANNEL_BIN)
	_, _, err := createGDMChannel(ctx, aliceWallet, []*crypto.Wallet{bobWallet, carolWallet}, client, gdmStreamId, nil)
	require.NoError(err)

	// Bot joins GDM - bot signs event, bob listed as inviter
	// The app_sponsor_address will be set to the initiator (which becomes bot when bot signs)
	err = joinGDMSelfSign(ctx, botWallet, bobWallet.Address, gdmStreamId, botCookie, client)
	require.NoError(err, "bot should be able to join GDM")
}

func TestGDMBotMembership_RegularUserCannotSelfJoin(t *testing.T) {
	tester := newServiceTester(t, serviceTesterOpts{numNodes: 1, start: true})
	ctx := tester.ctx
	require := tester.require
	client := tester.testClient(0)

	aliceWallet, _ := crypto.NewWallet(ctx)
	bobWallet, _ := crypto.NewWallet(ctx)
	carolWallet, _ := crypto.NewWallet(ctx)
	daveWallet, _ := crypto.NewWallet(ctx)

	for _, w := range []*crypto.Wallet{aliceWallet, bobWallet, carolWallet} {
		_, _, err := createUser(ctx, w, client, nil)
		require.NoError(err)
		_, _, err = createUserMetadataStream(ctx, w, client, nil)
		require.NoError(err)
	}
	daveCookie, _, err := createUser(ctx, daveWallet, client, nil)
	require.NoError(err)
	_, _, err = createUserMetadataStream(ctx, daveWallet, client, nil)
	require.NoError(err)

	gdmStreamId := testutils.FakeStreamId(STREAM_GDM_CHANNEL_BIN)
	_, _, err = createGDMChannel(ctx, aliceWallet, []*crypto.Wallet{bobWallet, carolWallet}, client, gdmStreamId, nil)
	require.NoError(err)

	// Dave (non-member) tries to self-join - should fail
	// When dave signs, initiator=dave, user=dave, so it's a self-join without invite
	err = joinGDMSelfSign(ctx, daveWallet, daveWallet.Address, gdmStreamId, daveCookie, client)
	require.Error(err, "non-member cannot self-join GDM without invite")
}

func TestGDMBotMembership_RegularUserCannotJoinEvenWithMemberInviter(t *testing.T) {
	tester := newServiceTester(t, serviceTesterOpts{numNodes: 1, start: true})
	ctx := tester.ctx
	require := tester.require
	client := tester.testClient(0)

	aliceWallet, _ := crypto.NewWallet(ctx)
	bobWallet, _ := crypto.NewWallet(ctx)
	carolWallet, _ := crypto.NewWallet(ctx)
	daveWallet, _ := crypto.NewWallet(ctx)

	for _, w := range []*crypto.Wallet{aliceWallet, bobWallet, carolWallet} {
		_, _, err := createUser(ctx, w, client, nil)
		require.NoError(err)
		_, _, err = createUserMetadataStream(ctx, w, client, nil)
		require.NoError(err)
	}
	daveCookie, _, err := createUser(ctx, daveWallet, client, nil)
	require.NoError(err)
	_, _, err = createUserMetadataStream(ctx, daveWallet, client, nil)
	require.NoError(err)

	gdmStreamId := testutils.FakeStreamId(STREAM_GDM_CHANNEL_BIN)
	_, _, err = createGDMChannel(ctx, aliceWallet, []*crypto.Wallet{bobWallet, carolWallet}, client, gdmStreamId, nil)
	require.NoError(err)

	// Dave signs event with bob as inviter - but since dave signs (not a node),
	// the inviter field is ignored and initiator=dave. So this is still a self-join.
	err = joinGDMSelfSign(ctx, daveWallet, bobWallet.Address, gdmStreamId, daveCookie, client)
	require.Error(err, "user-signed event ignores inviter field, treated as self-join")
}

func TestGDMBotMembership_BotJoinWithoutSponsor(t *testing.T) {
	tester := newServiceTester(t, serviceTesterOpts{numNodes: 1, start: true})
	ctx := tester.ctx
	require := tester.require
	client := tester.testClient(0)

	aliceWallet, _ := crypto.NewWallet(ctx)
	bobWallet, _ := crypto.NewWallet(ctx)
	carolWallet, _ := crypto.NewWallet(ctx)
	botWallet, _ := crypto.NewWallet(ctx)
	appAddress := common.HexToAddress("0x1234567890123456789012345678901234567890")

	for _, w := range []*crypto.Wallet{aliceWallet, bobWallet, carolWallet} {
		_, _, err := createUser(ctx, w, client, nil)
		require.NoError(err)
		_, _, err = createUserMetadataStream(ctx, w, client, nil)
		require.NoError(err)
	}

	// Create bot user with app_address
	createBotUser(ctx, require, botWallet, appAddress, client)

	gdmStreamId := testutils.FakeStreamId(STREAM_GDM_CHANNEL_BIN)
	gdmCookie, _, err := createGDMChannel(ctx, aliceWallet, []*crypto.Wallet{bobWallet, carolWallet}, client, gdmStreamId, nil)
	require.NoError(err)

	// Try to add membership event directly to GDM stream without sponsor.
	// This tests that membership events cannot bypass the user stream flow.
	// Only nodes can add MemberPayload events to channel streams.
	memberPayload := &StreamEvent_MemberPayload{
		MemberPayload: &MemberPayload{
			Content: &MemberPayload_Membership_{
				Membership: &MemberPayload_Membership{
					UserAddress: botWallet.Address.Bytes(),
					Op:          MembershipOp_SO_JOIN,
					AppAddress:  appAddress.Bytes(),
					// No AppSponsorAddress
				},
			},
		},
	}

	envelope, err := events.MakeEnvelopeWithPayload(
		botWallet,
		memberPayload,
		&MiniblockRef{
			Hash: common.BytesToHash(gdmCookie.PrevMiniblockHash),
			Num:  gdmCookie.MinipoolGen - 1,
		},
	)
	require.NoError(err)

	_, err = client.AddEvent(ctx, connect.NewRequest(&AddEventRequest{
		StreamId: gdmStreamId[:],
		Event:    envelope,
	}))
	// Event is rejected - user cannot directly add membership events to GDM stream
	require.Error(err, "direct membership event on GDM should fail")
}
