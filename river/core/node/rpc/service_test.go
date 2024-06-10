package rpc_test

import (
	"context"
	"crypto/tls"
	"fmt"
	"net"
	"net/http"
	"os"
	"strconv"
	"testing"

	"github.com/river-build/river/core/node/crypto"
	"github.com/river-build/river/core/node/dlog"
	"github.com/river-build/river/core/node/events"
	"github.com/river-build/river/core/node/nodes"
	"github.com/river-build/river/core/node/protocol"
	"github.com/river-build/river/core/node/protocol/protocolconnect"
	. "github.com/river-build/river/core/node/shared"
	"github.com/river-build/river/core/node/testutils"
	"golang.org/x/net/http2"

	"connectrpc.com/connect"
	"github.com/ethereum/go-ethereum/accounts"
	"github.com/ethereum/go-ethereum/common"
	eth_crypto "github.com/ethereum/go-ethereum/crypto"
	"github.com/stretchr/testify/require"
	"google.golang.org/protobuf/proto"
)

func setupTestHttpClient() {
	nodes.TestHttpClientMaker = func() *http.Client {
		return &http.Client{
			Transport: &http2.Transport{
				// So http2.Transport doesn't complain the URL scheme isn't 'https'
				AllowHTTP: true,
				// Pretend we are dialing a TLS endpoint. (Note, we ignore the passed tls.Config)
				DialTLSContext: func(ctx context.Context, network, addr string, cfg *tls.Config) (net.Conn, error) {
					var d net.Dialer
					return d.DialContext(ctx, network, addr)
				},
			},
		}
	}
}

func TestMain(m *testing.M) {
	setupTestHttpClient()
	os.Exit(m.Run())
}

func createUserDeviceKeyStream(
	ctx context.Context,
	wallet *crypto.Wallet,
	client protocolconnect.StreamServiceClient,
	streamSettings *protocol.StreamSettings,
) (*protocol.SyncCookie, []byte, error) {
	userDeviceKeyStreamId := UserDeviceKeyStreamIdFromAddress(wallet.Address)
	inception, err := events.MakeEnvelopeWithPayload(
		wallet,
		events.Make_UserDeviceKeyPayload_Inception(userDeviceKeyStreamId, streamSettings),
		nil,
	)
	if err != nil {
		return nil, nil, err
	}
	res, err := client.CreateStream(ctx, connect.NewRequest(&protocol.CreateStreamRequest{
		Events:   []*protocol.Envelope{inception},
		StreamId: userDeviceKeyStreamId[:],
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
) (StreamId, *protocol.SyncCookie, []byte, error) {
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
	return streamdId, res.Msg.Stream.NextSyncCookie, inception.Hash, nil
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

	return resspace.Msg.Stream.NextSyncCookie, joinSpace.Hash, nil
}

func createChannel(
	ctx context.Context,
	wallet *crypto.Wallet,
	client protocolconnect.StreamServiceClient,
	spaceId StreamId,
	channelStreamId StreamId,
	streamSettings *protocol.StreamSettings,
) (*protocol.SyncCookie, []byte, error) {
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
	miniblockHash := reschannel.Msg.Stream.Miniblocks[len(reschannel.Msg.Stream.Miniblocks)-1].Header.Hash
	return reschannel.Msg.Stream.NextSyncCookie, miniblockHash, nil
}

func addUserBlockedFillerEvent(
	ctx context.Context,
	wallet *crypto.Wallet,
	client protocolconnect.StreamServiceClient,
	streamId StreamId,
	prevMiniblockHash []byte,
) error {
	if prevMiniblockHash == nil {
		resp, err := client.GetLastMiniblockHash(ctx, connect.NewRequest(&protocol.GetLastMiniblockHashRequest{
			StreamId: streamId[:],
		}))
		if err != nil {
			return err
		}
		prevMiniblockHash = resp.Msg.Hash
	}

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
		prevMiniblockHash,
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
) ([]byte, int64, error) {
	resp, err := client.Info(ctx, connect.NewRequest(&protocol.InfoRequest{
		Debug: []string{
			"make_miniblock",
			streamId.String(),
			fmt.Sprintf("%t", forceSnapshot),
			fmt.Sprintf("%d", lastKnownMiniblockNum),
		},
	}))
	if err != nil {
		return nil, -1, err
	}
	var hashBytes []byte
	if resp.Msg.Graffiti != "" {
		hashBytes = common.FromHex(resp.Msg.Graffiti)
	}
	num := int64(-1)
	if resp.Msg.Version != "" {
		num, _ = strconv.ParseInt(resp.Msg.Version, 10, 64)
	}
	return hashBytes, num, nil
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

	_, _, err = createUserDeviceKeyStream(ctx, wallet1, client, nil)
	require.NoError(err)

	// get stream optional should now return not nil
	resp, err = client.GetStream(ctx, connect.NewRequest(&protocol.GetStreamRequest{
		StreamId: userStreamId[:],
		Optional: true,
	}))
	require.NoError(err)
	require.NotNil(resp.Msg, "expected user stream to not exist")

	// create user stream for user 2
	resuser, _, err := createUser(ctx, wallet2, client, nil)
	require.NoError(err)
	require.NotNil(resuser, "nil sync cookie")

	_, _, err = createUserDeviceKeyStream(ctx, wallet2, client, nil)
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
		resuser.PrevMiniblockHash,
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

	_, newMbNum, err := makeMiniblock(ctx, client, channelId, false, 0)
	require.NoError(err)
	require.Greater(newMbNum, int64(0))

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

	_, newMbNum2, err := makeMiniblock(ctx, client, channelId, false, 0)
	require.NoError(err)
	require.Greater(newMbNum2, newMbNum)

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

	_, _, err = createUserDeviceKeyStream(ctx, wallet, client, nil)
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
	_, _, err = createUserDeviceKeyStream(ctx, wallet, client, nil)
	require.Nilf(err, "error calling createUserDeviceKeyStream: %v", err)
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
	_, _, err = createUserDeviceKeyStream(ctx, aliceWallet, aliceClient, nil)
	require.Nilf(err, "error calling createUserDeviceKeyStream: %v", err)

	// create bob's client, wallet, and streams
	bobClient := tester.testClient(0)
	bobWallet, _ := crypto.NewWallet(ctx)
	bob, _, err := createUser(ctx, bobWallet, bobClient, nil)
	require.Nilf(err, "error calling createUser: %v", err)
	require.NotNil(bob, "nil sync cookie for bob")
	_, _, err = createUserDeviceKeyStream(ctx, bobWallet, bobClient, nil)
	require.Nilf(err, "error calling createUserDeviceKeyStream: %v", err)
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
	require.Nilf(err, "error calling AddStreamsToSync: %v", err)
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

func testRemoveStreamsFromSync(tester *serviceTester) {
	ctx := tester.ctx
	require := tester.require
	aliceClient := tester.testClient(0)
	log := dlog.FromCtx(ctx)

	// create alice's wallet and streams
	aliceWallet, _ := crypto.NewWallet(ctx)
	alice, _, err := createUser(ctx, aliceWallet, aliceClient, nil)
	require.Nilf(err, "error calling createUser: %v", err)
	require.NotNil(alice, "nil sync cookie for alice")
	_, _, err = createUserDeviceKeyStream(ctx, aliceWallet, aliceClient, nil)
	require.NoError(err)

	// create bob's client, wallet, and streams
	bobClient := tester.testClient(0)
	bobWallet, _ := crypto.NewWallet(ctx)
	bob, _, err := createUser(ctx, bobWallet, bobClient, nil)
	require.Nilf(err, "error calling createUser: %v", err)
	require.NotNil(bob, "nil sync cookie for bob")
	_, _, err = createUserDeviceKeyStream(ctx, bobWallet, bobClient, nil)
	require.Nilf(err, "error calling createUserDeviceKeyStream: %v", err)
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
	require.Nilf(err, "error calling AddStreamsToSync: %v", err)
	log.Info("AddStreamToSync", "resp", resp)
	// When AddEvent is called, node calls streamImpl.notifyToSubscribers() twice
	// for different events. 	See hnt-3683 for explanation. First event is for
	// the externally added event (by AddEvent). Second event is the miniblock
	// event with headers.
	// drain the events
	receivedCount := 0
OuterLoop:
	for syncRes.Receive() {
		update := syncRes.Msg()
		log.Info("received update", "update", update)
		if update.Stream != nil {
			sEvents := update.Stream.Events
			for _, envelope := range sEvents {
				receivedCount++
				parsedEvent, _ := events.ParseEvent(envelope)
				log.Info("received update inner loop", "envelope", parsedEvent)
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

	/**
	For debugging only. Uncomment to see syncRes.Receive() block.
	bobClient's syncRes no longer receives the latest events from alice.

	// wait to see if we got a message. We shouldn't.
	// uncomment: syncRes.Receive()
	*/
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
		"GetStreamEx": func(t *testing.T, ctx context.Context, client protocolconnect.StreamServiceClient, streamId StreamId) {
			resp, err := client.GetStreamEx(ctx, connect.NewRequest(&protocol.GetStreamExRequest{
				StreamId: streamId[:],
			}))
			require.NoError(t, err)

			// Read messages
			msgs := make([]*protocol.GetStreamExResponse, 0)
			for resp.Receive() {
				msgs = append(msgs, resp.Msg())
			}
			require.NoError(t, resp.Err())
			// Expect 1 miniblock, 1 empty minipool message.
			require.Len(t, msgs, 2)
		},
	}

	for testName, requester := range tests {
		t.Run(testName, func(t *testing.T) {
			serviceTester := newServiceTester(t, serviceTesterOpts{numNodes: 5, replicationFactor: 3, start: true})

			ctx := serviceTester.ctx

			userStreamIds := make([]StreamId, 0, TestStreams)

			// Stream registry seems biased to allocate locally so we'll make requests from a different node
			// to increase likelyhood of retries.
			client0 := serviceTester.testClient(0)
			client4 := serviceTester.testClient(4)

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

			// All stream requests should succeed.
			for _, streamId := range userStreamIds {
				requester(t, ctx, client4, streamId)
			}
		})
	}
}
