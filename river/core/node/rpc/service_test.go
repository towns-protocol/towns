package rpc

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"math/rand"
	"os"
	"slices"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"connectrpc.com/connect"
	"github.com/ethereum/go-ethereum/accounts"
	"github.com/ethereum/go-ethereum/common"
	eth_crypto "github.com/ethereum/go-ethereum/crypto"
	. "github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/crypto"
	"github.com/towns-protocol/towns/core/node/events"
	"github.com/towns-protocol/towns/core/node/logging"
	"github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/protocol/protocolconnect"
	river_sync "github.com/towns-protocol/towns/core/node/rpc/sync"
	. "github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/testutils"
	"github.com/towns-protocol/towns/core/node/testutils/testfmt"
	"github.com/stretchr/testify/require"
	"google.golang.org/protobuf/proto"
)

func TestMain(m *testing.M) {
	c := m.Run()
	if c != 0 {
		os.Exit(c)
	}

	crypto.TestMainForLeaksIgnoreGeth()
}

func createUserMetadataStream(
	ctx context.Context,
	wallet *crypto.Wallet,
	client protocolconnect.StreamServiceClient,
	streamSettings *protocol.StreamSettings,
) (*protocol.SyncCookie, []byte, error) {
	userMetadataStreamId := UserMetadataStreamIdFromAddress(wallet.Address)
	inception, err := events.MakeEnvelopeWithPayload(
		wallet,
		events.Make_UserMetadataPayload_Inception(userMetadataStreamId, streamSettings),
		nil,
	)
	if err != nil {
		return nil, nil, err
	}
	res, err := client.CreateStream(ctx, connect.NewRequest(&protocol.CreateStreamRequest{
		Events:   []*protocol.Envelope{inception},
		StreamId: userMetadataStreamId[:],
	}))
	if err != nil {
		return nil, nil, err
	}
	return res.Msg.Stream.NextSyncCookie, inception.Hash, nil
}

func makeDelegateSig(primaryWallet *crypto.Wallet, deviceWallet *crypto.Wallet, expiryEpochMs int64) ([]byte, error) {
	devicePubKey := eth_crypto.FromECDSAPub(&deviceWallet.PrivateKeyStruct.PublicKey)
	hashSrc, err := crypto.RiverDelegateHashSrc(devicePubKey, expiryEpochMs)
	if err != nil {
		return nil, err
	}
	hash := accounts.TextHash(hashSrc)
	delegatSig, err := primaryWallet.SignHash(hash)
	return delegatSig, err
}

func createUserWithMismatchedId(
	ctx context.Context,
	wallet *crypto.Wallet,
	client protocolconnect.StreamServiceClient,
) (*protocol.SyncCookie, []byte, error) {
	userStreamId := UserStreamIdFromAddr(wallet.Address)
	inception, err := events.MakeEnvelopeWithPayload(
		wallet,
		events.Make_UserPayload_Inception(
			userStreamId,
			nil,
		),
		nil,
	)
	if err != nil {
		return nil, nil, err
	}
	badId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	res, err := client.CreateStream(ctx, connect.NewRequest(&protocol.CreateStreamRequest{
		Events:   []*protocol.Envelope{inception},
		StreamId: badId[:],
	}))
	if err != nil {
		return nil, nil, err
	}
	return res.Msg.Stream.NextSyncCookie, inception.Hash, nil
}

func createUser(
	ctx context.Context,
	wallet *crypto.Wallet,
	client protocolconnect.StreamServiceClient,
	streamSettings *protocol.StreamSettings,
) (*protocol.SyncCookie, []byte, error) {
	userStreamId := UserStreamIdFromAddr(wallet.Address)
	inception, err := events.MakeEnvelopeWithPayload(
		wallet,
		events.Make_UserPayload_Inception(
			userStreamId,
			streamSettings,
		),
		nil,
	)
	if err != nil {
		return nil, nil, err
	}
	res, err := client.CreateStream(ctx, connect.NewRequest(&protocol.CreateStreamRequest{
		Events:   []*protocol.Envelope{inception},
		StreamId: userStreamId[:],
	}))
	if err != nil {
		return nil, nil, err
	}
	return res.Msg.Stream.NextSyncCookie, inception.Hash, nil
}

func createUserSettingsStream(
	ctx context.Context,
	wallet *crypto.Wallet,
	client protocolconnect.StreamServiceClient,
	streamSettings *protocol.StreamSettings,
) (StreamId, *protocol.SyncCookie, *MiniblockRef, error) {
	streamdId := UserSettingStreamIdFromAddr(wallet.Address)
	inception, err := events.MakeEnvelopeWithPayload(
		wallet,
		events.Make_UserSettingsPayload_Inception(streamdId, streamSettings),
		nil,
	)
	if err != nil {
		return StreamId{}, nil, nil, err
	}
	res, err := client.CreateStream(ctx, connect.NewRequest(&protocol.CreateStreamRequest{
		Events:   []*protocol.Envelope{inception},
		StreamId: streamdId[:],
	}))
	if err != nil {
		return StreamId{}, nil, nil, err
	}
	return streamdId, res.Msg.Stream.NextSyncCookie, MiniblockRefFromCookie(res.Msg.Stream.NextSyncCookie), nil
}

func createSpace(
	ctx context.Context,
	wallet *crypto.Wallet,
	client protocolconnect.StreamServiceClient,
	spaceStreamId StreamId,
	streamSettings *protocol.StreamSettings,
) (*protocol.SyncCookie, []byte, error) {
	space, err := events.MakeEnvelopeWithPayload(
		wallet,
		events.Make_SpacePayload_Inception(spaceStreamId, streamSettings),
		nil,
	)
	if err != nil {
		return nil, nil, err
	}
	userId, err := AddressHex(wallet.Address.Bytes())
	if err != nil {
		return nil, nil, err
	}
	joinSpace, err := events.MakeEnvelopeWithPayload(
		wallet,
		events.Make_SpacePayload_Membership(
			protocol.MembershipOp_SO_JOIN,
			userId,
			userId,
		),
		nil,
	)
	if err != nil {
		return nil, nil, err
	}

	resspace, err := client.CreateStream(ctx, connect.NewRequest(&protocol.CreateStreamRequest{
		Events:   []*protocol.Envelope{space, joinSpace},
		StreamId: spaceStreamId[:],
	},
	))
	if err != nil {
		return nil, nil, err
	}

	// if resspace.Msg.DerivedEvents doesn't contain an event in the user stream, return an error
	userStreamId := UserStreamIdFromAddr(wallet.Address)
	foundUserStreamEvent := false
	for _, event := range resspace.Msg.DerivedEvents {
		if bytes.Equal(event.StreamId, userStreamId[:]) {
			foundUserStreamEvent = true
			break
		}
	}
	if !foundUserStreamEvent {
		return nil, nil, fmt.Errorf("expected user stream to contain an event")
	}

	return resspace.Msg.Stream.NextSyncCookie, joinSpace.Hash, nil
}

func createChannel(
	ctx context.Context,
	wallet *crypto.Wallet,
	client protocolconnect.StreamServiceClient,
	spaceId StreamId,
	channelStreamId StreamId,
	streamSettings *protocol.StreamSettings,
) (*protocol.SyncCookie, *MiniblockRef, error) {
	channel, err := events.MakeEnvelopeWithPayload(
		wallet,
		events.Make_ChannelPayload_Inception(
			channelStreamId,
			spaceId,
			streamSettings,
		),
		nil,
	)
	if err != nil {
		return nil, nil, err
	}
	userId, err := AddressHex(wallet.Address.Bytes())
	if err != nil {
		return nil, nil, err
	}
	joinChannel, err := events.MakeEnvelopeWithPayload(
		wallet,
		events.Make_ChannelPayload_Membership(
			protocol.MembershipOp_SO_JOIN,
			userId,
			userId,
			&spaceId,
		),
		nil,
	)
	if err != nil {
		return nil, nil, err
	}
	reschannel, err := client.CreateStream(ctx, connect.NewRequest(&protocol.CreateStreamRequest{
		Events:   []*protocol.Envelope{channel, joinChannel},
		StreamId: channelStreamId[:],
	},
	))
	if err != nil {
		return nil, nil, err
	}
	if len(reschannel.Msg.Stream.Miniblocks) == 0 {
		return nil, nil, fmt.Errorf("expected at least one miniblock")
	}

	// if reschannel.Msg.DerivedEvents doesn't contain an event in the user stream, return an error
	userStreamId := UserStreamIdFromAddr(wallet.Address)
	foundUserStreamEvent := false
	for _, event := range reschannel.Msg.DerivedEvents {
		if bytes.Equal(event.StreamId, userStreamId[:]) {
			foundUserStreamEvent = true
			break
		}
	}
	if !foundUserStreamEvent {
		return nil, nil, fmt.Errorf("expected user stream to contain an event")
	}

	// if reschannel.Msg.DerivedEvents doesn't contain an event in the space stream, return an error
	foundSpaceStreamEvent := false
	for _, event := range reschannel.Msg.DerivedEvents {
		if bytes.Equal(event.StreamId, spaceId[:]) {
			foundSpaceStreamEvent = true
			break
		}
	}
	if !foundSpaceStreamEvent {
		return nil, nil, fmt.Errorf("expected space stream to contain an event")
	}

	lastMb := reschannel.Msg.Stream.Miniblocks[len(reschannel.Msg.Stream.Miniblocks)-1]
	return reschannel.Msg.Stream.NextSyncCookie, &MiniblockRef{
		Hash: common.BytesToHash(lastMb.Header.Hash),
		Num:  0,
	}, nil
}

func addUserBlockedFillerEvent(
	ctx context.Context,
	wallet *crypto.Wallet,
	client protocolconnect.StreamServiceClient,
	streamId StreamId,
	prevMiniblockRef *MiniblockRef,
) error {
	addr := crypto.GetTestAddress()
	ev, err := events.MakeEnvelopeWithPayload(
		wallet,
		events.Make_UserSettingsPayload_UserBlock(
			&protocol.UserSettingsPayload_UserBlock{
				UserId:    addr[:],
				IsBlocked: true,
				EventNum:  22,
			},
		),
		prevMiniblockRef,
	)
	if err != nil {
		return err
	}
	_, err = client.AddEvent(ctx, connect.NewRequest(&protocol.AddEventRequest{
		StreamId: streamId[:],
		Event:    ev,
	}))
	return err
}

func makeMiniblock(
	ctx context.Context,
	client protocolconnect.StreamServiceClient,
	streamId StreamId,
	forceSnapshot bool,
	lastKnownMiniblockNum int64,
) (*MiniblockRef, error) {
	resp, err := client.Info(ctx, connect.NewRequest(&protocol.InfoRequest{
		Debug: []string{
			"make_miniblock",
			streamId.String(),
			fmt.Sprintf("%t", forceSnapshot),
			fmt.Sprintf("%d", lastKnownMiniblockNum),
		},
	}))
	if err != nil {
		return nil, AsRiverError(err, protocol.Err_INTERNAL).
			Message("client.Info make_miniblock failed").
			Func("makeMiniblock")
	}
	var hashBytes []byte
	if resp.Msg.Graffiti != "" {
		hashBytes = common.FromHex(resp.Msg.Graffiti)
	}
	num := int64(0)
	if resp.Msg.Version != "" {
		num, _ = strconv.ParseInt(resp.Msg.Version, 10, 64)
	}
	return &MiniblockRef{
		Hash: common.BytesToHash(hashBytes),
		Num:  num,
	}, nil
}

func testMethods(tester *serviceTester) {
	testMethodsWithClient(tester, tester.testClient(0))
}

func testMethodsWithClient(tester *serviceTester, client protocolconnect.StreamServiceClient) {
	ctx := tester.ctx
	require := tester.require

	wallet1, _ := crypto.NewWallet(ctx)
	wallet2, _ := crypto.NewWallet(ctx)

	response, err := client.Info(ctx, connect.NewRequest(&protocol.InfoRequest{}))
	require.NoError(err)
	require.Equal("River Node welcomes you!", response.Msg.Graffiti)

	_, err = client.CreateStream(ctx, connect.NewRequest(&protocol.CreateStreamRequest{}))
	require.Error(err)

	_, _, err = createUserWithMismatchedId(ctx, wallet1, client)
	require.Error(err) // expected Error when calling CreateStream with mismatched id

	userStreamId := UserStreamIdFromAddr(wallet1.Address)

	// if optional is true, stream should be nil instead of throwing an error
	resp, err := client.GetStream(ctx, connect.NewRequest(&protocol.GetStreamRequest{
		StreamId: userStreamId[:],
		Optional: true,
	}))
	require.NoError(err)
	require.Nil(resp.Msg.Stream, "expected user stream to not exist")

	// if optional is false, error should be thrown
	_, err = client.GetStream(ctx, connect.NewRequest(&protocol.GetStreamRequest{
		StreamId: userStreamId[:],
	}))
	require.Error(err)

	// create user stream for user 1
	res, _, err := createUser(ctx, wallet1, client, nil)
	require.NoError(err)
	require.NotNil(res, "nil sync cookie")

	_, _, err = createUserMetadataStream(ctx, wallet1, client, nil)
	require.NoError(err)

	// get stream optional should now return not nil
	resp, err = client.GetStream(ctx, connect.NewRequest(&protocol.GetStreamRequest{
		StreamId: userStreamId[:],
		Optional: true,
	}))
	require.NoError(err)
	require.NotNil(resp.Msg, "expected user stream to exist")

	// create user stream for user 2
	resuser, _, err := createUser(ctx, wallet2, client, nil)
	require.NoError(err)
	require.NotNil(resuser, "nil sync cookie")

	_, _, err = createUserMetadataStream(ctx, wallet2, client, nil)
	require.NoError(err)

	// create space
	spaceId := testutils.FakeStreamId(STREAM_SPACE_BIN)
	resspace, _, err := createSpace(ctx, wallet1, client, spaceId, nil)
	require.NoError(err)
	require.NotNil(resspace, "nil sync cookie")

	// create channel
	channelId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	channel, channelHash, err := createChannel(
		ctx,
		wallet1,
		client,
		spaceId,
		channelId,
		&protocol.StreamSettings{
			DisableMiniblockCreation: true,
		},
	)
	require.NoError(err)
	require.NotNil(channel, "nil sync cookie")

	// user2 joins channel
	userJoin, err := events.MakeEnvelopeWithPayload(
		wallet2,
		events.Make_UserPayload_Membership(
			protocol.MembershipOp_SO_JOIN,
			channelId,
			nil,
			spaceId[:],
		),
		&MiniblockRef{
			Hash: common.BytesToHash(resuser.PrevMiniblockHash),
			Num:  resuser.MinipoolGen - 1,
		},
	)
	require.NoError(err)

	_, err = client.AddEvent(
		ctx,
		connect.NewRequest(
			&protocol.AddEventRequest{
				StreamId: resuser.StreamId,
				Event:    userJoin,
			},
		),
	)
	require.NoError(err)

	newMbRef, err := makeMiniblock(ctx, client, channelId, false, 0)
	require.NoError(err)
	require.Greater(newMbRef.Num, int64(0))

	message, err := events.MakeEnvelopeWithPayload(
		wallet2,
		events.Make_ChannelPayload_Message("hello"),
		channelHash,
	)
	require.NoError(err)

	_, err = client.AddEvent(
		ctx,
		connect.NewRequest(
			&protocol.AddEventRequest{
				StreamId: channelId[:],
				Event:    message,
			},
		),
	)
	require.NoError(err)

	newMbRef2, err := makeMiniblock(ctx, client, channelId, false, 0)
	require.NoError(err)
	require.Greater(newMbRef2.Num, newMbRef.Num)

	_, err = client.GetMiniblocks(ctx, connect.NewRequest(&protocol.GetMiniblocksRequest{
		StreamId:      channelId[:],
		FromInclusive: 0,
		ToExclusive:   1,
	}))
	require.NoError(err)

	syncCtx, syncCancel := context.WithCancel(ctx)
	syncRes, err := client.SyncStreams(
		syncCtx,
		connect.NewRequest(
			&protocol.SyncStreamsRequest{
				SyncPos: []*protocol.SyncCookie{
					channel,
				},
			},
		),
	)
	require.NoError(err)

	syncRes.Receive()
	// verify the first message is new a sync
	syncRes.Receive()
	msg := syncRes.Msg()
	require.NotNil(msg.SyncId, "expected non-nil sync id")
	require.True(len(msg.SyncId) > 0, "expected non-empty sync id")
	msg = syncRes.Msg()
	syncCancel()

	require.NotNil(msg.Stream, "expected non-nil stream")

	// join, miniblock, message, miniblock
	require.Equal(4, len(msg.Stream.Events), "expected 4 events")

	var payload protocol.StreamEvent
	err = proto.Unmarshal(msg.Stream.Events[len(msg.Stream.Events)-2].Event, &payload)
	require.NoError(err)
	switch p := payload.Payload.(type) {
	case *protocol.StreamEvent_ChannelPayload:
		// ok
		switch p.ChannelPayload.Content.(type) {
		case *protocol.ChannelPayload_Message:
			// ok
		default:
			require.FailNow("expected message event, got %v", p.ChannelPayload.Content)
		}
	default:
		require.FailNow("expected channel event, got %v", payload.Payload)
	}
}

func testRiverDeviceId(tester *serviceTester) {
	ctx := tester.ctx
	require := tester.require
	client := tester.testClient(0)

	wallet, _ := crypto.NewWallet(ctx)
	deviceWallet, _ := crypto.NewWallet(ctx)

	resuser, _, err := createUser(ctx, wallet, client, nil)
	require.NoError(err)
	require.NotNil(resuser)

	_, _, err = createUserMetadataStream(ctx, wallet, client, nil)
	require.NoError(err)

	spaceId := testutils.FakeStreamId(STREAM_SPACE_BIN)
	space, _, err := createSpace(ctx, wallet, client, spaceId, nil)
	require.NoError(err)
	require.NotNil(space)

	channelId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	channel, channelHash, err := createChannel(ctx, wallet, client, spaceId, channelId, nil)
	require.NoError(err)
	require.NotNil(channel)

	delegateSig, err := makeDelegateSig(wallet, deviceWallet, 0)
	require.NoError(err)

	event, err := events.MakeDelegatedStreamEvent(
		wallet,
		events.Make_ChannelPayload_Message(
			"try to send a message without RDK",
		),
		channelHash,
		delegateSig,
	)
	require.NoError(err)
	msg, err := events.MakeEnvelopeWithEvent(
		deviceWallet,
		event,
	)
	require.NoError(err)

	_, err = client.AddEvent(
		ctx,
		connect.NewRequest(
			&protocol.AddEventRequest{
				StreamId: channelId[:],
				Event:    msg,
			},
		),
	)
	require.NoError(err)

	_, err = client.AddEvent(
		ctx,
		connect.NewRequest(
			&protocol.AddEventRequest{
				StreamId: channelId[:],
				Event:    msg,
			},
		),
	)
	require.Error(err) // expected error when calling AddEvent

	// send it optionally
	resp, err := client.AddEvent(
		ctx,
		connect.NewRequest(
			&protocol.AddEventRequest{
				StreamId: channelId[:],
				Event:    msg,
				Optional: true,
			},
		),
	)
	require.NoError(err) // expected error when calling AddEvent
	require.NotNil(resp.Msg.Error, "expected error")
}

func testSyncStreams(tester *serviceTester) {
	ctx := tester.ctx
	require := tester.require
	client := tester.testClient(0)

	// create the streams for a user
	wallet, _ := crypto.NewWallet(ctx)
	_, _, err := createUser(ctx, wallet, client, nil)
	require.Nilf(err, "error calling createUser: %v", err)
	_, _, err = createUserMetadataStream(ctx, wallet, client, nil)
	require.Nilf(err, "error calling createUserMetadataStream: %v", err)
	// create space
	spaceId := testutils.FakeStreamId(STREAM_SPACE_BIN)
	space1, _, err := createSpace(ctx, wallet, client, spaceId, nil)
	require.Nilf(err, "error calling createSpace: %v", err)
	require.NotNil(space1, "nil sync cookie")
	// create channel
	channelId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	channel1, channelHash, err := createChannel(ctx, wallet, client, spaceId, channelId, nil)
	require.Nilf(err, "error calling createChannel: %v", err)
	require.NotNil(channel1, "nil sync cookie")

	/**
	Act
	*/
	// sync streams
	syncCtx, syncCancel := context.WithCancel(ctx)
	syncRes, err := client.SyncStreams(
		syncCtx,
		connect.NewRequest(
			&protocol.SyncStreamsRequest{
				SyncPos: []*protocol.SyncCookie{
					channel1,
				},
			},
		),
	)
	require.Nilf(err, "error calling SyncStreams: %v", err)
	// get the syncId for requires later
	syncRes.Receive()
	syncId := syncRes.Msg().SyncId
	// add an event to verify that sync is working
	message, err := events.MakeEnvelopeWithPayload(
		wallet,
		events.Make_ChannelPayload_Message("hello"),
		channelHash,
	)
	require.Nilf(err, "error creating message event: %v", err)
	_, err = client.AddEvent(
		ctx,
		connect.NewRequest(
			&protocol.AddEventRequest{
				StreamId: channelId[:],
				Event:    message,
			},
		),
	)
	require.Nilf(err, "error calling AddEvent: %v", err)
	// wait for the sync
	syncRes.Receive()
	msg := syncRes.Msg()
	// stop the sync loop
	syncCancel()

	/**
	requires
	*/
	require.NotEmpty(syncId, "expected non-empty sync id")
	require.NotNil(msg.Stream, "expected 1 stream")
	require.Equal(syncId, msg.SyncId, "expected sync id to match")
}

func testAddStreamsToSync(tester *serviceTester) {
	ctx := tester.ctx
	require := tester.require
	aliceClient := tester.testClient(0)

	// create alice's wallet and streams
	aliceWallet, _ := crypto.NewWallet(ctx)
	alice, _, err := createUser(ctx, aliceWallet, aliceClient, nil)
	require.Nilf(err, "error calling createUser: %v", err)
	require.NotNil(alice, "nil sync cookie for alice")
	_, _, err = createUserMetadataStream(ctx, aliceWallet, aliceClient, nil)
	require.Nilf(err, "error calling createUserMetadataStream: %v", err)

	// create bob's client, wallet, and streams
	bobClient := tester.testClient(0)
	bobWallet, _ := crypto.NewWallet(ctx)
	bob, _, err := createUser(ctx, bobWallet, bobClient, nil)
	require.Nilf(err, "error calling createUser: %v", err)
	require.NotNil(bob, "nil sync cookie for bob")
	_, _, err = createUserMetadataStream(ctx, bobWallet, bobClient, nil)
	require.Nilf(err, "error calling createUserMetadataStream: %v", err)
	// alice creates a space
	spaceId := testutils.FakeStreamId(STREAM_SPACE_BIN)
	space1, _, err := createSpace(ctx, aliceWallet, aliceClient, spaceId, nil)
	require.Nilf(err, "error calling createSpace: %v", err)
	require.NotNil(space1, "nil sync cookie")
	// alice creates a channel
	channelId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	channel1, channelHash, err := createChannel(
		ctx,
		aliceWallet,
		aliceClient,
		spaceId,
		channelId,
		nil,
	)
	require.Nilf(err, "error calling createChannel: %v", err)
	require.NotNil(channel1, "nil sync cookie")

	/**
	Act
	*/
	// bob sync streams
	syncCtx, syncCancel := context.WithCancel(ctx)
	syncRes, err := bobClient.SyncStreams(
		syncCtx,
		connect.NewRequest(
			&protocol.SyncStreamsRequest{
				SyncPos: []*protocol.SyncCookie{},
			},
		),
	)
	require.Nilf(err, "error calling SyncStreams: %v", err)
	// get the syncId for requires later
	syncRes.Receive()
	syncId := syncRes.Msg().SyncId
	// add an event to verify that sync is working
	message, err := events.MakeEnvelopeWithPayload(
		aliceWallet,
		events.Make_ChannelPayload_Message("hello"),
		channelHash,
	)
	require.Nilf(err, "error creating message event: %v", err)
	_, err = aliceClient.AddEvent(
		ctx,
		connect.NewRequest(
			&protocol.AddEventRequest{
				StreamId: channelId[:],
				Event:    message,
			},
		),
	)
	require.Nilf(err, "error calling AddEvent: %v", err)
	// bob adds alice's stream to sync
	_, err = bobClient.AddStreamToSync(
		ctx,
		connect.NewRequest(
			&protocol.AddStreamToSyncRequest{
				SyncId:  syncId,
				SyncPos: channel1,
			},
		),
	)
	require.NoError(err, "error calling AddStreamsToSync")
	// wait for the sync
	syncRes.Receive()
	msg := syncRes.Msg()
	// stop the sync loop
	syncCancel()

	/**
	requires
	*/
	require.NotEmpty(syncId, "expected non-empty sync id")
	require.NotNil(msg.Stream, "expected 1 stream")
	require.Equal(len(msg.Stream.Events), 1, "expected 1 event")
	require.Equal(syncId, msg.SyncId, "expected sync id to match")
}

func testRemoveStreamsFromSync(tester *serviceTester) {
	ctx := tester.ctx
	require := tester.require
	aliceClient := tester.testClient(0)
	log := logging.FromCtx(ctx)

	// create alice's wallet and streams
	aliceWallet, _ := crypto.NewWallet(ctx)
	alice, _, err := createUser(ctx, aliceWallet, aliceClient, nil)
	require.Nilf(err, "error calling createUser: %v", err)
	require.NotNil(alice, "nil sync cookie for alice")
	_, _, err = createUserMetadataStream(ctx, aliceWallet, aliceClient, nil)
	require.NoError(err)

	// create bob's client, wallet, and streams
	bobClient := tester.testClient(0)
	bobWallet, _ := crypto.NewWallet(ctx)
	bob, _, err := createUser(ctx, bobWallet, bobClient, nil)
	require.Nilf(err, "error calling createUser: %v", err)
	require.NotNil(bob, "nil sync cookie for bob")
	_, _, err = createUserMetadataStream(ctx, bobWallet, bobClient, nil)
	require.Nilf(err, "error calling createUserMetadataStream: %v", err)
	// alice creates a space
	spaceId := testutils.FakeStreamId(STREAM_SPACE_BIN)
	space1, _, err := createSpace(ctx, aliceWallet, aliceClient, spaceId, nil)
	require.Nilf(err, "error calling createSpace: %v", err)
	require.NotNil(space1, "nil sync cookie")
	// alice creates a channel
	channelId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	channel1, channelHash, err := createChannel(ctx, aliceWallet, aliceClient, spaceId, channelId, nil)
	require.Nilf(err, "error calling createChannel: %v", err)
	require.NotNil(channel1, "nil sync cookie")
	// bob sync streams
	syncCtx, syncCancel := context.WithCancel(ctx)
	syncRes, err := bobClient.SyncStreams(
		syncCtx,
		connect.NewRequest(
			&protocol.SyncStreamsRequest{
				SyncPos: []*protocol.SyncCookie{},
			},
		),
	)
	require.Nilf(err, "error calling SyncStreams: %v", err)
	// get the syncId for requires later
	syncRes.Receive()
	syncId := syncRes.Msg().SyncId

	// add an event to verify that sync is working
	message1, err := events.MakeEnvelopeWithPayload(
		aliceWallet,
		events.Make_ChannelPayload_Message("hello"),
		channelHash,
	)
	require.Nilf(err, "error creating message event: %v", err)
	_, err = aliceClient.AddEvent(
		ctx,
		connect.NewRequest(
			&protocol.AddEventRequest{
				StreamId: channelId[:],
				Event:    message1,
			},
		),
	)
	require.Nilf(err, "error calling AddEvent: %v", err)

	// bob adds alice's stream to sync
	resp, err := bobClient.AddStreamToSync(
		ctx,
		connect.NewRequest(
			&protocol.AddStreamToSyncRequest{
				SyncId:  syncId,
				SyncPos: channel1,
			},
		),
	)
	require.NoError(err, "AddStreamsToSync")
	log.Infow("AddStreamToSync", "resp", resp)
	// When AddEvent is called, node calls streamImpl.notifyToSubscribers() twice
	// for different events. 	See hnt-3683 for explanation. First event is for
	// the externally added event (by AddEvent). Second event is the miniblock
	// event with headers.
	// drain the events
	receivedCount := 0
OuterLoop:
	for syncRes.Receive() {
		update := syncRes.Msg()
		log.Infow("received update", "update", update)
		if update.Stream != nil {
			sEvents := update.Stream.Events
			for _, envelope := range sEvents {
				receivedCount++
				parsedEvent, _ := events.ParseEvent(envelope)
				log.Infow("received update inner loop", "envelope", parsedEvent)
				if parsedEvent != nil && parsedEvent.Event.GetMiniblockHeader() != nil {
					break OuterLoop
				}
			}
		}
	}

	require.Equal(2, receivedCount, "expected 2 events")
	/**
	Act
	*/
	// bob removes alice's stream to sync
	removeRes, err := bobClient.RemoveStreamFromSync(
		ctx,
		connect.NewRequest(
			&protocol.RemoveStreamFromSyncRequest{
				SyncId:   syncId,
				StreamId: channelId[:],
			},
		),
	)
	require.Nilf(err, "error calling RemoveStreamsFromSync: %v", err)

	// alice sends another message
	message2, err := events.MakeEnvelopeWithPayload(
		aliceWallet,
		events.Make_ChannelPayload_Message("world"),
		channelHash,
	)
	require.Nilf(err, "error creating message event: %v", err)
	_, err = aliceClient.AddEvent(
		ctx,
		connect.NewRequest(
			&protocol.AddEventRequest{
				StreamId: channelId[:],
				Event:    message2,
			},
		),
	)
	require.Nilf(err, "error calling AddEvent: %v", err)

	gotUnexpectedMsg := make(chan *protocol.SyncStreamsResponse)
	go func() {
		if syncRes.Receive() {
			gotUnexpectedMsg <- syncRes.Msg()
		}
	}()

	select {
	case <-time.After(3 * time.Second):
		break
	case <-gotUnexpectedMsg:
		require.Fail("received message after stream was removed from sync")
	}

	syncCancel()

	/**
	requires
	*/
	require.NotEmpty(syncId, "expected non-empty sync id")
	require.NotNil(removeRes.Msg, "expected non-nil remove response")
}

type testFunc func(*serviceTester)

func run(t *testing.T, numNodes int, tf testFunc) {
	tf(newServiceTester(t, serviceTesterOpts{numNodes: numNodes, start: true}))
}

func TestSingleAndMulti(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name string
		test testFunc
	}{
		{"testMethods", testMethods},
		{"testRiverDeviceId", testRiverDeviceId},
		{"testSyncStreams", testSyncStreams},
		{"testAddStreamsToSync", testAddStreamsToSync},
		{"testRemoveStreamsFromSync", testRemoveStreamsFromSync},
	}

	t.Run("single", func(t *testing.T) {
		t.Parallel()
		for _, tt := range tests {
			t.Run(tt.name, func(t *testing.T) {
				run(t, 1, tt.test)
			})
		}
	})

	t.Run("multi", func(t *testing.T) {
		t.Parallel()
		for _, tt := range tests {
			t.Run(tt.name, func(t *testing.T) {
				run(t, 10, tt.test)
			})
		}
	})
}

// This number is large enough that we're pretty much guaranteed to have a node forward a request to
// another node that is down.
const TestStreams = 40

func TestForwardingWithRetries(t *testing.T) {
	t.Parallel()

	tests := map[string]func(t *testing.T, ctx context.Context, client protocolconnect.StreamServiceClient, streamId StreamId){
		"GetStream": func(t *testing.T, ctx context.Context, client protocolconnect.StreamServiceClient, streamId StreamId) {
			resp, err := client.GetStream(ctx, connect.NewRequest(&protocol.GetStreamRequest{
				StreamId: streamId[:],
			}))
			require.NoError(t, err)
			require.NotNil(t, resp)
			require.Equal(t, streamId[:], resp.Msg.Stream.NextSyncCookie.StreamId)
		},
		// "GetStreamEx": func(t *testing.T, ctx context.Context, client protocolconnect.StreamServiceClient, streamId StreamId) {
		// 	// Note: the GetStreamEx implementation bypasses the stream cache, which fetches miniblocks from the
		// 	// registry if none are yet present in the local cache. The stream creation flow returns when a quorum of
		// 	// nodes terminates the stream creation call successfully, meaning that some nodes may not have finished
		// 	// committing the stream's genesis miniblock to storage yet. We use the info request to force the making of
		// 	// a miniblock for this stream, but these streams are replicated and the debug make miniblock call only
		// 	// operates on a local node. This means that the GetStreamEx request may occasionally return an empty
		// 	// stream on a node that hasn't caught up to the latest state, so we retry until we get the expected result.
		// 	require.Eventually(
		// 		t,
		// 		func() bool {
		// 			resp, err := client.GetStreamEx(ctx, connect.NewRequest(&protocol.GetStreamExRequest{
		// 				StreamId: streamId[:],
		// 			}))
		// 			require.NoError(t, err)

		// 			// Read messages
		// 			msgs := make([]*protocol.GetStreamExResponse, 0)
		// 			for resp.Receive() {
		// 				msgs = append(msgs, resp.Msg())
		// 			}
		// 			require.NoError(t, resp.Err())
		// 			return len(msgs) == 2
		// 		},
		// 		10*time.Second,
		// 		100*time.Millisecond,
		// 	)
		// },
	}

	for testName, requester := range tests {
		t.Run(testName, func(t *testing.T) {
			serviceTester := newServiceTester(t, serviceTesterOpts{numNodes: 5, replicationFactor: 3, start: true})

			ctx := serviceTester.ctx

			userStreamIds := make([]StreamId, 0, TestStreams)

			// Stream registry seems biased to allocate locally so we'll make requests from a different node
			// to increase likelyhood of retries.
			client0 := serviceTester.testClient(0)

			// Allocate TestStreams user streams
			for i := 0; i < TestStreams; i++ {
				// Create a user stream
				wallet, err := crypto.NewWallet(ctx)
				require.NoError(t, err)

				res, _, err := createUser(ctx, wallet, client0, nil)
				streamId := UserStreamIdFromAddr(wallet.Address)
				require.NoError(t, err)
				require.NotNil(t, res, "nil sync cookie")
				userStreamIds = append(userStreamIds, streamId)

				_, err = client0.Info(ctx, connect.NewRequest(&protocol.InfoRequest{
					Debug: []string{"make_miniblock", streamId.String(), "false"},
				}))
				require.NoError(t, err)
			}

			// Shut down replicationfactor - 1 nodes. All streams should still be available, but many
			// stream requests should result in at least some retries.
			serviceTester.CloseNode(0)
			serviceTester.CloseNode(1)

			client4 := serviceTester.testClient(4)
			// All stream requests should succeed.
			for _, streamId := range userStreamIds {
				requester(t, ctx, client4, streamId)
			}
		})
	}
}

// TestUnstableStreams ensures that when a stream becomes unavailable a SyncOp_Down message is received and when
// available again allows the client to resubscribe.
func TestUnstableStreams(t *testing.T) {
	var (
		req      = require.New(t)
		services = newServiceTester(t, serviceTesterOpts{numNodes: 5, start: true})
		client0  = services.testClient(0)
		client1  = services.testClient(1)
		ctx      = services.ctx
		wallets  []*crypto.Wallet
		users    []*protocol.SyncCookie
		channels []*protocol.SyncCookie
	)

	// create users that will join and add messages to channels.
	for range 10 {
		// Create user streams
		wallet, err := crypto.NewWallet(ctx)
		req.NoError(err, "new wallet")
		syncCookie, _, err := createUser(ctx, wallet, client0, nil)
		req.NoError(err, "create user")

		_, _, err = createUserMetadataStream(ctx, wallet, client0, nil)
		req.NoError(err)

		wallets = append(wallets, wallet)
		users = append(users, syncCookie)
	}

	// create a space and several channels in it
	spaceID := testutils.FakeStreamId(STREAM_SPACE_BIN)
	resspace, _, err := createSpace(ctx, wallets[0], client0, spaceID, nil)
	req.NoError(err)
	req.NotNil(resspace, "create space sync cookie")

	// create enough channels that they will be distributed among local and remote nodes
	for range TestStreams {
		channelId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
		channel, _, err := createChannel(ctx, wallets[0], client0, spaceID, channelId, nil)
		req.NoError(err)
		req.NotNil(channel, "nil create channel sync cookie")
		channels = append(channels, channel)
	}

	// subscribe to channel updates
	syncPos := append(users, channels...)
	syncRes, err := client1.SyncStreams(ctx, connect.NewRequest(&protocol.SyncStreamsRequest{SyncPos: syncPos}))
	req.NoError(err, "sync streams")

	syncRes.Receive()
	syncID := syncRes.Msg().SyncId
	testfmt.Logf(t, "subscription %s created on node: %s", syncID, services.nodes[1].address)

	// collect sync cookie updates for channels
	var (
		messages           = make(chan string, 512)
		mu                 sync.Mutex
		streamDownMessages = make(map[StreamId]struct{})
		syncCookies        = make(map[StreamId][]*protocol.StreamAndCookie)
	)

	go func() {
		for syncRes.Receive() {
			msg := syncRes.Msg()

			switch msg.GetSyncOp() {
			case protocol.SyncOp_SYNC_NEW:
				syncID := msg.GetSyncId()
				testfmt.Logf(t, "start stream sync %s ", syncID)
			case protocol.SyncOp_SYNC_UPDATE:
				req.Equal(syncID, msg.GetSyncId(), "sync id")
				req.NotNil(msg.GetStream(), "stream")
				req.NotNil(msg.GetStream().GetNextSyncCookie(), "next sync cookie")
				cookie := msg.GetStream().GetNextSyncCookie()
				streamID, err := StreamIdFromBytes(cookie.GetStreamId())
				if err != nil {
					req.NoError(err, "invalid stream id in sync op update")
				}

				mu.Lock()
				syncCookies[streamID] = append(syncCookies[streamID], msg.GetStream())
				delete(streamDownMessages, streamID)
				mu.Unlock()

				for _, e := range msg.GetStream().GetEvents() {
					var payload protocol.StreamEvent
					err = proto.Unmarshal(e.Event, &payload)
					req.NoError(err)
					switch p := payload.Payload.(type) {
					case *protocol.StreamEvent_ChannelPayload:
						switch p.ChannelPayload.Content.(type) {
						case *protocol.ChannelPayload_Message:
							messages <- p.ChannelPayload.GetMessage().GetCiphertext()
						}
					}
				}

			case protocol.SyncOp_SYNC_DOWN:
				req.Equal(syncID, msg.GetSyncId(), "sync id")
				streamID, err := StreamIdFromBytes(msg.GetStreamId())
				req.NoError(err, "stream id")

				mu.Lock()
				if _, found := streamDownMessages[streamID]; found {
					t.Error("received a second down message in a row for a stream")
					return
				}
				streamDownMessages[streamID] = struct{}{}
				mu.Unlock()

			case protocol.SyncOp_SYNC_CLOSE:
				req.Equal(syncID, msg.GetSyncId(), "invalid sync id in sync close message")
				close(messages)

			case protocol.SyncOp_SYNC_UNSPECIFIED, protocol.SyncOp_SYNC_PONG:
				continue

			default:
				t.Errorf("unexpected sync operation %s", msg.GetSyncOp())
				return
			}
		}
	}()

	// users join channels
	channelsCount := len(channels)
	for i, wallet := range wallets[1:] {
		for c := range channelsCount {
			channel := channels[c]

			miniBlockHashResp, err := client1.GetLastMiniblockHash(
				ctx,
				connect.NewRequest(&protocol.GetLastMiniblockHashRequest{StreamId: users[i+1].StreamId}))

			req.NoError(err, "get last miniblock hash")

			channelId, _ := StreamIdFromBytes(channel.GetStreamId())
			userJoin, err := events.MakeEnvelopeWithPayload(
				wallet,
				events.Make_UserPayload_Membership(protocol.MembershipOp_SO_JOIN, channelId, nil, spaceID[:]),
				&MiniblockRef{
					Hash: common.BytesToHash(miniBlockHashResp.Msg.GetHash()),
					Num:  miniBlockHashResp.Msg.GetMiniblockNum(),
				},
			)
			req.NoError(err)

			resp, err := client1.AddEvent(
				ctx,
				connect.NewRequest(
					&protocol.AddEventRequest{
						StreamId: users[i+1].StreamId,
						Event:    userJoin,
					},
				),
			)

			req.NoError(err)
			req.Nil(resp.Msg.GetError())
		}
	}

	// send a bunch of messages and ensure that all are received
	sendMessagesAndReceive(100, wallets, channels, req, client0, ctx, messages, func(StreamId) bool { return false })

	testfmt.Logf(t, "first messages batch received")

	// bring ~25% of the streams down
	streamsDownCounter := 0
	rand.Shuffle(len(channels), func(i, j int) { channels[i], channels[j] = channels[j], channels[i] })

	for i, syncCookie := range channels {
		streamID, _ := StreamIdFromBytes(syncCookie.GetStreamId())
		if _, err = client1.Info(ctx, connect.NewRequest(&protocol.InfoRequest{Debug: []string{
			"drop_stream",
			syncID,
			streamID.String(),
		}})); err != nil {
			req.NoError(err, "unable to bring stream down")
		}

		streamsDownCounter++

		testfmt.Logf(t, "bring stream %s down", streamID)

		if i > TestStreams/4 {
			break
		}
	}

	// make sure that for all streams that are down a SyncOp_Down msg is received
	req.Eventuallyf(func() bool {
		mu.Lock()
		count := len(streamDownMessages)
		mu.Unlock()

		return count == streamsDownCounter
	}, 20*time.Second, 100*time.Millisecond, "didn't receive for all streams a down message")

	testfmt.Logf(t, "received SyncOp_Down message for all expected streams")

	// make sure that no more stream down messages are received
	req.Never(func() bool {
		mu.Lock()
		count := len(streamDownMessages)
		mu.Unlock()
		return count > streamsDownCounter
	}, 5*time.Second, 100*time.Millisecond, "received unexpected stream down message")

	// send a bunch of messages to streams and ensure that we messages are received streams that are up
	sendMessagesAndReceive(100, wallets, channels, req, client0, ctx, messages, func(streamID StreamId) bool {
		mu.Lock()
		defer mu.Unlock()

		_, found := streamDownMessages[streamID]
		return found
	})

	testfmt.Logf(t, "second messages batch received")

	// resubscribe to the head on down streams and ensure that messages are received for all streams again
	mu.Lock()
	for streamID := range streamDownMessages {
		getStreamResp, err := client1.GetStream(ctx, connect.NewRequest(&protocol.GetStreamRequest{
			StreamId: streamID[:],
			Optional: false,
		}))
		req.NoError(err, "GetStream")

		_, err = client1.AddStreamToSync(ctx, connect.NewRequest(&protocol.AddStreamToSyncRequest{
			SyncId:  syncID,
			SyncPos: getStreamResp.Msg.GetStream().GetNextSyncCookie(),
		}))
		req.NoError(err, "AddStreamToSync")
	}
	mu.Unlock()

	testfmt.Logf(t, "resubscribed to streams that where brought down")

	// ensure that messages for all streams are received again
	sendMessagesAndReceive(100, wallets, channels, req, client0, ctx, messages, func(StreamId) bool { return false })

	testfmt.Logf(t, "third messages batch received")

	// unsub from ~25% streams and ensure that no updates are received again
	unsubbedStreams := make(map[StreamId]struct{})
	rand.Shuffle(len(channels), func(i, j int) { channels[i], channels[j] = channels[j], channels[i] })
	for i, syncCookie := range channels {
		streamID, _ := StreamIdFromBytes(syncCookie.GetStreamId())
		_, err = client1.RemoveStreamFromSync(ctx, connect.NewRequest(&protocol.RemoveStreamFromSyncRequest{
			SyncId:   syncID,
			StreamId: streamID[:],
		}))
		req.NoError(err, "RemoveStreamFromSync")

		unsubbedStreams[streamID] = struct{}{}

		testfmt.Logf(t, "unsubbed from stream %s", streamID)

		if i > TestStreams/4 {
			break
		}
	}

	sendMessagesAndReceive(100, wallets, channels, req, client0, ctx, messages, func(streamID StreamId) bool {
		_, found := unsubbedStreams[streamID]
		return found
	})

	testfmt.Logf(t, "fourth messages batch received")

	// resubscribe to the head on down streams and ensure that messages are received for all streams again
	mu.Lock()
	for streamID := range unsubbedStreams {
		getStreamResp, err := client1.GetStream(ctx, connect.NewRequest(&protocol.GetStreamRequest{
			StreamId: streamID[:],
			Optional: false,
		}))
		req.NoError(err, "GetStream")

		_, err = client1.AddStreamToSync(ctx, connect.NewRequest(&protocol.AddStreamToSyncRequest{
			SyncId:  syncID,
			SyncPos: getStreamResp.Msg.GetStream().GetNextSyncCookie(),
		}))
		req.NoError(err, "AddStreamToSync")
	}
	mu.Unlock()

	testfmt.Logf(t, "resubscribed to streams that where brought down")

	sendMessagesAndReceive(100, wallets, channels, req, client0, ctx, messages, func(streamID StreamId) bool {
		return false
	})

	testfmt.Logf(t, "fifth messages batch received")

	// drop all streams from a node
	var (
		targetNodeAddr = services.nodes[4].address
		targetStreams  []StreamId
	)

	mu.Lock()
	streamDownMessages = map[StreamId]struct{}{}
	mu.Unlock()

	for _, pos := range syncPos {
		if bytes.Equal(pos.GetNodeAddress(), targetNodeAddr.Bytes()) {
			streamID, _ := StreamIdFromBytes(pos.GetStreamId())
			targetStreams = append(targetStreams, streamID)
		}
	}

	for _, targetStream := range targetStreams {
		_, err = client1.Info(ctx, connect.NewRequest(&protocol.InfoRequest{Debug: []string{
			"drop_stream",
			syncID,
			targetStream.String(),
		}}))
		req.NoError(err, "drop stream")
	}

	// make sure that for all streams that are down a SyncOp_Down msg is received
	req.Eventuallyf(func() bool {
		mu.Lock()
		count := len(streamDownMessages)
		mu.Unlock()

		return count == len(targetStreams)
	}, 20*time.Second, 100*time.Millisecond, "didn't receive for all streams a down message")

	testfmt.Logf(t, "received SyncOp_Down message for all expected streams")

	sendMessagesAndReceive(100, wallets, channels, req, client0, ctx, messages, func(streamID StreamId) bool {
		mu.Lock()
		_, found := streamDownMessages[streamID]
		mu.Unlock()
		return found
	})

	testfmt.Logf(t, "sixt messages batch received")

	// make sure we can resubscribe to these streams
	for _, streamID := range targetStreams {
		getStreamResp, err := client1.GetStream(ctx, connect.NewRequest(&protocol.GetStreamRequest{
			StreamId: streamID[:],
			Optional: false,
		}))
		req.NoError(err, "GetStream")

		_, err = client1.AddStreamToSync(ctx, connect.NewRequest(&protocol.AddStreamToSyncRequest{
			SyncId:  syncID,
			SyncPos: getStreamResp.Msg.GetStream().GetNextSyncCookie(),
		}))
		req.NoError(err, "AddStreamToSync")
	}

	sendMessagesAndReceive(100, wallets, channels, req, client0, ctx, messages, func(streamID StreamId) bool {
		return false
	})

	testfmt.Logf(t, "seventh messages batch received")

	_, err = client1.CancelSync(ctx, connect.NewRequest(&protocol.CancelSyncRequest{SyncId: syncID}))
	req.NoError(err, "cancel sync")

	testfmt.Logf(t, "Streams subscription cancelled")

	sendMessagesAndReceive(100, wallets, channels, req, client0, ctx, messages, func(streamID StreamId) bool {
		return true
	})

	testfmt.Logf(t, "eight messages batch received")

	// make sure that SyncOp_Close msg is received (messages is closed)
	req.Eventuallyf(func() bool {
		select {
		case _, gotMsg := <-messages:
			return !gotMsg
		default:
			return false
		}
	}, 20*time.Second, 100*time.Millisecond, "no SyncOp_Close message received")
}

func sendMessagesAndReceive(
	N int,
	wallets []*crypto.Wallet,
	channels []*protocol.SyncCookie,
	require *require.Assertions,
	client protocolconnect.StreamServiceClient,
	ctx context.Context,
	messages chan string,
	expectNoReceive func(streamID StreamId) bool,
) {
	var (
		prefix          = fmt.Sprintf("%d", time.Now().UnixMilli()%100000)
		sendMsgCount    = 0
		expMsgToReceive = make(map[string]struct{})
	)

	// send a bunch of messages to random channels
	for range N {
		wallet := wallets[rand.Int()%len(wallets)]
		channel := channels[rand.Int()%len(channels)]
		streamID, _ := StreamIdFromBytes(channel.GetStreamId())
		expNoRecv := expectNoReceive(streamID)
		msgContents := fmt.Sprintf("%s: msg #%d", prefix, sendMsgCount)

		getStreamResp, err := client.GetStream(ctx, connect.NewRequest(&protocol.GetStreamRequest{
			StreamId: channel.GetStreamId(),
			Optional: false,
		}))
		require.NoError(err)

		message, err := events.MakeEnvelopeWithPayload(
			wallet,
			events.Make_ChannelPayload_Message(msgContents),
			MiniblockRefFromCookie(getStreamResp.Msg.GetStream().GetNextSyncCookie()),
		)
		require.NoError(err)

		_, err = client.AddEvent(
			ctx,
			connect.NewRequest(
				&protocol.AddEventRequest{
					StreamId: channel.GetStreamId(),
					Event:    message,
				},
			),
		)

		require.NoError(err)

		if !expNoRecv {
			expMsgToReceive[msgContents] = struct{}{}
			sendMsgCount++
		}
	}

	// make sure all expected messages are received
	require.Eventuallyf(func() bool {
		for {
			select {
			case msg, ok := <-messages:
				if !ok {
					return len(expMsgToReceive) == 0
				}

				delete(expMsgToReceive, msg)
				continue
			default:
				return len(expMsgToReceive) == 0
			}
		}
	}, 20*time.Second, 100*time.Millisecond, "didn't receive messages in reasonable time")
}

// TestStreamSyncPingPong test stream sync subscription ping/pong
func TestStreamSyncPingPong(t *testing.T) {
	var (
		req      = require.New(t)
		services = newServiceTester(t, serviceTesterOpts{numNodes: 2, start: true})
		client   = services.testClient(0)
		ctx      = services.ctx
		mu       sync.Mutex
		pongs    []string
		syncID   string
	)

	// create stream sub
	syncRes, err := client.SyncStreams(ctx, connect.NewRequest(&protocol.SyncStreamsRequest{SyncPos: nil}))
	req.NoError(err, "sync streams")

	pings := []string{"ping1", "ping2", "ping3", "ping4", "ping5"}
	sendPings := func() {
		for _, ping := range pings {
			_, err := client.PingSync(ctx, connect.NewRequest(&protocol.PingSyncRequest{SyncId: syncID, Nonce: ping}))
			req.NoError(err, "ping sync")
		}
	}

	go func() {
		for syncRes.Receive() {
			msg := syncRes.Msg()
			switch msg.GetSyncOp() {
			case protocol.SyncOp_SYNC_NEW:
				syncID = msg.GetSyncId()
				// send some pings and ensure all pongs are received
				sendPings()
			case protocol.SyncOp_SYNC_PONG:
				req.NotEmpty(syncID, "expected non-empty sync id")
				req.Equal(syncID, msg.GetSyncId(), "sync id")
				mu.Lock()
				pongs = append(pongs, msg.GetPongNonce())
				mu.Unlock()
			case protocol.SyncOp_SYNC_CLOSE, protocol.SyncOp_SYNC_DOWN,
				protocol.SyncOp_SYNC_UNSPECIFIED, protocol.SyncOp_SYNC_UPDATE:
				continue
			default:
				t.Errorf("unexpected sync operation %s", msg.GetSyncOp())
				return
			}
		}
	}()

	req.Eventuallyf(func() bool {
		mu.Lock()
		defer mu.Unlock()
		return slices.Equal(pings, pongs)
	}, 20*time.Second, 100*time.Millisecond, "didn't receive all pongs in reasonable time or out of order")
}

type slowStreamsResponseSender struct {
	sendDuration time.Duration
}

func (s slowStreamsResponseSender) Send(msg *protocol.SyncStreamsResponse) error {
	time.Sleep(s.sendDuration)
	return nil
}

// TestSyncSubscriptionWithTooSlowClient ensures that a sync operation cancels itself when a subscriber isn't able to
// keep up with sync updates.
func TestSyncSubscriptionWithTooSlowClient(t *testing.T) {
	var (
		req      = require.New(t)
		services = newServiceTester(t, serviceTesterOpts{numNodes: 5, start: true})
		client0  = services.testClient(0)
		client1  = services.testClient(1)
		node1    = services.nodes[1]
		ctx      = services.ctx
		wallets  []*crypto.Wallet
		users    []*protocol.SyncCookie
		channels []*protocol.SyncCookie
		syncID   = GenNanoid()
	)

	// create users that will join and add messages to channels.
	for range 10 {
		// Create user streams
		wallet, err := crypto.NewWallet(ctx)
		req.NoError(err, "new wallet")
		syncCookie, _, err := createUser(ctx, wallet, client0, nil)
		req.NoError(err, "create user")

		_, _, err = createUserMetadataStream(ctx, wallet, client0, nil)
		req.NoError(err)

		wallets = append(wallets, wallet)
		users = append(users, syncCookie)
	}

	// create a space and several channels in it
	spaceID := testutils.FakeStreamId(STREAM_SPACE_BIN)
	resspace, _, err := createSpace(ctx, wallets[0], client0, spaceID, nil)
	req.NoError(err)
	req.NotNil(resspace, "create space sync cookie")

	// create enough channels that they will be distributed among local and remote nodes
	for range TestStreams {
		channelId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
		channel, _, err := createChannel(ctx, wallets[0], client0, spaceID, channelId, nil)
		req.NoError(err)
		req.NotNil(channel, "nil create channel sync cookie")
		channels = append(channels, channel)
	}

	// subscribe to channel updates on node 1 direct through a sync op to have better control over it
	testfmt.Logf(t, "subscribe on node %s", node1.address)
	syncPos := append(users, channels...)
	syncOp, err := river_sync.NewStreamsSyncOperation(
		ctx, syncID, node1.address, node1.service.cache, node1.service.nodeRegistry, nil)
	req.NoError(err, "NewStreamsSyncOperation")

	syncOpResult := make(chan error)
	syncOpStopped := atomic.Bool{}

	// run the subscription in the background that takes a long time for each update to send to the client.
	// this must cancel the sync op with a buffer too full error.
	go func() {
		slowSubscriber := slowStreamsResponseSender{sendDuration: 250 * time.Millisecond}
		syncOpErr := syncOp.Run(connect.NewRequest(&protocol.SyncStreamsRequest{SyncPos: syncPos}), slowSubscriber)
		syncOpStopped.Store(true)
		syncOpResult <- syncOpErr
	}()

	// users join channels
	channelsCount := len(channels)
	for i, wallet := range wallets[1:] {
		for c := range channelsCount {
			channel := channels[c]
			miniBlockHashResp, err := client1.GetLastMiniblockHash(ctx,
				connect.NewRequest(&protocol.GetLastMiniblockHashRequest{StreamId: users[i+1].StreamId}))

			req.NoError(err, "get last mini-block hash")

			channelId, _ := StreamIdFromBytes(channel.GetStreamId())
			userJoin, err := events.MakeEnvelopeWithPayload(
				wallet,
				events.Make_UserPayload_Membership(protocol.MembershipOp_SO_JOIN, channelId, nil, spaceID[:]),
				MiniblockRefFromLastHash(miniBlockHashResp.Msg),
			)
			req.NoError(err)

			resp, err := client1.AddEvent(
				ctx,
				connect.NewRequest(
					&protocol.AddEventRequest{
						StreamId: users[i+1].StreamId,
						Event:    userJoin,
					},
				),
			)

			req.NoError(err)
			req.Nil(resp.Msg.GetError())
		}
	}

	// send a bunch of messages and ensure that the sync op is cancelled because the client can't keep up
	for i := range 2500 {
		if syncOpStopped.Load() { // no need to send additional messages, sync op already cancelled
			break
		}

		wallet := wallets[rand.Int()%len(wallets)]
		channel := channels[rand.Int()%len(channels)]
		msgContents := fmt.Sprintf("msg #%d", i)

		getStreamResp, err := client1.GetStream(ctx, connect.NewRequest(&protocol.GetStreamRequest{
			StreamId: channel.GetStreamId(),
			Optional: false,
		}))
		req.NoError(err)

		message, err := events.MakeEnvelopeWithPayload(
			wallet,
			events.Make_ChannelPayload_Message(msgContents),
			MiniblockRefFromCookie(getStreamResp.Msg.GetStream().GetNextSyncCookie()),
		)
		req.NoError(err)

		_, err = client1.AddEvent(
			ctx,
			connect.NewRequest(
				&protocol.AddEventRequest{
					StreamId: channel.GetStreamId(),
					Event:    message,
				},
			),
		)

		req.NoError(err)
	}

	// At some moment one of the syncers in the sync op syncer set encounters a buffer full and cancels the sync op.
	// Ensure that the sync op ends with protocol.Err_BUFFER_FULL.
	req.Eventuallyf(func() bool {
		select {
		case err := <-syncOpResult:
			var riverErr *RiverErrorImpl
			if errors.As(err, &riverErr) {
				req.Equal(riverErr.Code, protocol.Err_BUFFER_FULL, "unexpected error code")
				return true
			}
			req.FailNow("received unexpected err", err)
			return false
		default:
			return false
		}
	}, 20*time.Second, 100*time.Millisecond, "sync operation not stopped within reasonable time")
}

// TestGetMiniblocksRangeLimit checks that GetMiniblocks endpoint has a validation for a max range of blocks
// to be fetched at once.
func TestGetMiniblocksRangeLimit(t *testing.T) {
	const expectedLimit = 200
	tt := newServiceTester(t, serviceTesterOpts{numNodes: 1, start: true})
	tt.btc.SetConfigValue(
		t,
		tt.ctx,
		crypto.StreamGetMiniblocksMaxPageSizeConfigKey,
		crypto.ABIEncodeUint64(uint64(expectedLimit)),
	)

	alice := tt.newTestClient(0)
	_ = alice.createUserStream()
	spaceId, _ := alice.createSpace()
	channelId, _ := alice.createChannel(spaceId)

	// Here we create a miniblock for each message sent by Alice.
	// Creating a bit more miniblocks than limit.
	var lastMbNum int64
	for count := range expectedLimit + 10 {
		alice.say(channelId, fmt.Sprintf("hello from Alice %d", count))
		mb, err := makeMiniblock(tt.ctx, alice.client, channelId, false, lastMbNum)
		tt.require.NoError(err)
		lastMbNum = mb.Num
	}

	// Try to get miniblocks with invalid range
	resp, err := alice.client.GetMiniblocks(alice.ctx, connect.NewRequest(&protocol.GetMiniblocksRequest{
		StreamId:      channelId[:],
		FromInclusive: expectedLimit + 100,
		ToExclusive:   5,
	}))
	tt.require.Nil(resp)
	tt.require.ErrorContains(err, "invalid range")

	tt.require.Eventually(func() bool {
		// Requesting a list of miniblocks with the limit > max limit and expect to return "limit" miniblocks.
		resp, err := alice.client.GetMiniblocks(alice.ctx, connect.NewRequest(&protocol.GetMiniblocksRequest{
			StreamId:      channelId[:],
			FromInclusive: 5,
			ToExclusive:   expectedLimit + 100,
		}))
		tt.require.NoError(err)

		if len(resp.Msg.GetMiniblocks()) != expectedLimit {
			return false
		}

		tt.require.Equal(int64(5), resp.Msg.GetFromInclusive())
		tt.require.Equal(int64(expectedLimit), resp.Msg.GetLimit())
		tt.require.Len(resp.Msg.GetMiniblocks(), expectedLimit)

		return true
	}, 20*time.Second, 100*time.Millisecond)
}

// TestCreateMediaStream tests creating a media stream
func TestCreateMediaStream(t *testing.T) {
	tt := newServiceTester(t, serviceTesterOpts{numNodes: 1, start: true})

	alice := tt.newTestClient(0)
	_ = alice.createUserStream()
	spaceId, _ := alice.createSpace()
	channelId, _ := alice.createChannel(spaceId)

	mediaStreamId, err := StreamIdFromString(STREAM_MEDIA_PREFIX + strings.Repeat("0", 62))
	tt.require.NoError(err)

	const chunks = 10
	inception, err := events.MakeEnvelopeWithPayload(
		alice.wallet,
		events.Make_MediaPayload_Inception(&protocol.MediaPayload_Inception{
			StreamId:   mediaStreamId[:],
			ChannelId:  channelId[:],
			SpaceId:    spaceId[:],
			UserId:     alice.userId[:],
			ChunkCount: chunks,
		}),
		nil,
	)
	tt.require.NoError(err)

	// Create media stream
	csResp, err := alice.client.CreateStream(alice.ctx, connect.NewRequest(&protocol.CreateStreamRequest{
		Events:   []*protocol.Envelope{inception},
		StreamId: mediaStreamId[:],
	}))
	tt.require.NoError(err)

	mb := &MiniblockRef{
		Hash: common.BytesToHash(csResp.Msg.Stream.NextSyncCookie.PrevMiniblockHash),
		Num:  0,
	}
	mediaChunks := make([][]byte, chunks)
	for i := 0; i < chunks; i++ {
		// Create media chunk event
		mediaChunks[i] = []byte("chunk " + fmt.Sprint(i))
		mp := events.Make_MediaPayload_Chunk(mediaChunks[i], int32(i))
		envelope, err := events.MakeEnvelopeWithPayload(alice.wallet, mp, mb)
		tt.require.NoError(err)

		// Add media chunk event
		aeResp, err := alice.client.AddEvent(alice.ctx, connect.NewRequest(&protocol.AddEventRequest{
			StreamId: mediaStreamId[:],
			Event:    envelope,
		}))
		tt.require.NoError(err)
		tt.require.Nil(aeResp.Msg.Error)

		mb, err = makeMiniblock(tt.ctx, alice.client, mediaStreamId, false, int64(i))
		tt.require.NoError(err, i)
	}

	// Get Miniblocks for the given media stream
	resp, err := alice.client.GetMiniblocks(alice.ctx, connect.NewRequest(&protocol.GetMiniblocksRequest{
		StreamId:      mediaStreamId[:],
		FromInclusive: 0,
		ToExclusive:   chunks * 2, // adding a threshold to make sure there are no unexpected events
	}))
	tt.require.NoError(err)
	tt.require.NotNil(resp)
	tt.require.Len(resp.Msg.GetMiniblocks(), chunks+1) // The first miniblock is the stream creation one

	mbs := resp.Msg.GetMiniblocks()

	// The first miniblock is the stream creation one
	tt.require.Len(mbs[0].GetEvents(), 1)
	pe, err := events.ParseEvent(mbs[0].GetEvents()[0])
	tt.require.NoError(err)
	mp, ok := pe.Event.GetPayload().(*protocol.StreamEvent_MediaPayload)
	tt.require.True(ok)
	tt.require.Equal(int32(chunks), mp.MediaPayload.GetInception().GetChunkCount())

	// The rest of the miniblocks are the media chunks
	for i, mb := range mbs[1:] {
		tt.require.Len(mb.GetEvents(), 1)
		pe, err = events.ParseEvent(mb.GetEvents()[0])
		tt.require.NoError(err)
		mp, ok = pe.Event.GetPayload().(*protocol.StreamEvent_MediaPayload)
		tt.require.True(ok)
		tt.require.Equal(mediaChunks[i], mp.MediaPayload.GetChunk().Data)
	}
}
