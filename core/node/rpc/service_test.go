package rpc

import (
	"bytes"
	"context"
	"fmt"
	"log"
	"math/rand"
	"os"
	"slices"
	"strconv"
	"sync"
	"testing"
	"time"

	"connectrpc.com/connect"
	"github.com/ethereum/go-ethereum/accounts"
	"github.com/ethereum/go-ethereum/common"
	eth_crypto "github.com/ethereum/go-ethereum/crypto"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/require"
	"google.golang.org/protobuf/proto"

	. "github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/base/test"
	"github.com/towns-protocol/towns/core/node/crypto"
	"github.com/towns-protocol/towns/core/node/events"
	"github.com/towns-protocol/towns/core/node/logging"
	"github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/protocol/protocolconnect"
	. "github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/testutils"
	"github.com/towns-protocol/towns/core/node/testutils/dbtestutils"
	"github.com/towns-protocol/towns/core/node/testutils/testfmt"
)

// Creation of extensions can cause race conditions in the database even if
// they are created with an "IF NOT EXISTS" clause, causing migrations across
// multiple tests to fail. Therefore we create all required extensions in
// pg one time here.
func initPostgres() {
	ctx := test.NewTestContextForTestMain("core/node/rpc")

	// We are not creating a schema for this connection, therefore no need to tear
	// it down - do not call the closer.
	cfg, _, _, err := dbtestutils.ConfigureDbWithSchemaName(ctx, "")
	if err != nil {
		log.Fatalf("Unable to create postgres extensions: unable to configure db: %v", err)
	}

	conn, err := pgxpool.New(ctx, cfg.GetUrl())
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer conn.Close()
	_, err = conn.Exec(ctx, "CREATE EXTENSION IF NOT EXISTS btree_gin;")
	if err != nil {
		log.Fatalf("Unable to create extension: %v", err)
	}
}

func TestMain(m *testing.M) {
	initPostgres()

	c := m.Run()
	if c != 0 {
		os.Exit(c)
	}

	crypto.TestMainForLeaksIgnoreGeth()
}

func createUserInboxStream(
	ctx context.Context,
	wallet *crypto.Wallet,
	client protocolconnect.StreamServiceClient,
	streamSettings *protocol.StreamSettings,
) (*protocol.SyncCookie, []byte, error) {
	userInboxStreamId := UserInboxStreamIdFromAddr(wallet.Address)
	inception, err := events.MakeEnvelopeWithPayload(
		wallet,
		events.Make_UserInboxPayload_Inception(userInboxStreamId, streamSettings),
		nil,
	)
	if err != nil {
		return nil, nil, err
	}
	res, err := client.CreateStream(ctx, connect.NewRequest(&protocol.CreateStreamRequest{
		Events:   []*protocol.Envelope{inception},
		StreamId: userInboxStreamId[:],
	}))
	if err != nil {
		return nil, nil, err
	}
	return res.Msg.Stream.NextSyncCookie, inception.Hash, nil
}

func createUserMetadataStream(
	ctx context.Context,
	wallet *crypto.Wallet,
	client protocolconnect.StreamServiceClient,
	streamSettings *protocol.StreamSettings,
) (*protocol.SyncCookie, []byte, error) {
	userMetadataStreamId := UserMetadataStreamIdFromAddr(wallet.Address)
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
	delegatSig, err := primaryWallet.SignHash(common.BytesToHash(hash))
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

func joinChannel(
	ctx context.Context,
	wallet *crypto.Wallet,
	userStreamSyncCookie *protocol.SyncCookie,
	client protocolconnect.StreamServiceClient,
	spaceId StreamId,
	channelId StreamId,
) error {
	userJoin, err := events.MakeEnvelopeWithPayload(
		wallet,
		events.Make_UserPayload_Membership(
			protocol.MembershipOp_SO_JOIN,
			channelId,
			common.Address{},
			nil,
		),
		&MiniblockRef{
			Hash: common.BytesToHash(userStreamSyncCookie.PrevMiniblockHash),
			Num:  userStreamSyncCookie.MinipoolGen - 1,
		},
	)
	if err != nil {
		return err
	}

	_, err = client.AddEvent(
		ctx,
		connect.NewRequest(
			&protocol.AddEventRequest{
				StreamId: userStreamSyncCookie.StreamId,
				Event:    userJoin,
			},
		),
	)
	if err != nil {
		return err
	}
	return nil
}

// createChannel creates a channel and adds the creator to the channel. It checks the derived
// events of the stream creation to validate that the creator's user stream has the join event,
// and the space stream also contains an event for the channel, returning error conditions if
// either check fails.
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

// makeMiniblock uses debug commands on the info endpoint of the stream service client to provoke
// the stream node into making a miniblock for the specified stream.
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
	channelId := testutils.MakeChannelId(spaceId)
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
	err = joinChannel(
		ctx,
		wallet2,
		resuser,
		client,
		spaceId,
		channelId,
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
		connect.NewRequest(&protocol.SyncStreamsRequest{
			SyncPos: []*protocol.SyncCookie{
				channel,
			},
		}),
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

	channelId := testutils.MakeChannelId(spaceId)
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
	envelope, err := events.MakeEnvelopeWithEvent(
		deviceWallet,
		event,
	)
	require.NoError(err)

	_, err = client.AddEvent(
		ctx,
		connect.NewRequest(
			&protocol.AddEventRequest{
				StreamId: channelId[:],
				Event:    envelope,
			},
		),
	)
	require.NoError(err)

	_, err = client.AddEvent(
		ctx,
		connect.NewRequest(
			&protocol.AddEventRequest{
				StreamId: channelId[:],
				Event:    envelope,
			},
		),
	)
	require.NoError(err) // Duplicate event is allowed

	// receive optional error
	event, err = events.MakeDelegatedStreamEvent(
		wallet,
		events.Make_ChannelPayload_Inception(channelId, nil),
		channelHash,
		delegateSig,
	)
	require.NoError(err)
	envelope, err = events.MakeEnvelopeWithEvent(
		deviceWallet,
		event,
	)
	require.NoError(err)

	resp, err := client.AddEvent(
		ctx,
		connect.NewRequest(
			&protocol.AddEventRequest{
				StreamId: channelId[:],
				Event:    envelope,
			},
		),
	)
	require.Error(err)
	require.Nil(resp)
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
	channelId := testutils.MakeChannelId(spaceId)
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
		connect.NewRequest(&protocol.SyncStreamsRequest{
			SyncPos: []*protocol.SyncCookie{
				channel1,
			},
		}),
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
	channelId := testutils.MakeChannelId(spaceId)
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
		connect.NewRequest(&protocol.SyncStreamsRequest{
			SyncPos: []*protocol.SyncCookie{},
		}),
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
	_, err = bobClient.ModifySync(
		ctx,
		connect.NewRequest(
			&protocol.ModifySyncRequest{
				SyncId:     syncId,
				AddStreams: []*protocol.SyncCookie{channel1},
			},
		),
	)
	require.NoError(err, "error calling ModifySync")
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
	channelId := testutils.MakeChannelId(spaceId)
	channel1, channelHash, err := createChannel(ctx, aliceWallet, aliceClient, spaceId, channelId, nil)
	require.Nilf(err, "error calling createChannel: %v", err)
	require.NotNil(channel1, "nil sync cookie")
	// bob sync streams

	syncCtx, syncCancel := context.WithCancel(ctx)
	syncRes, err := bobClient.SyncStreams(
		syncCtx,
		connect.NewRequest(&protocol.SyncStreamsRequest{
			SyncPos: []*protocol.SyncCookie{},
		}),
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
	resp, err := bobClient.ModifySync(
		ctx,
		connect.NewRequest(
			&protocol.ModifySyncRequest{
				SyncId:     syncId,
				AddStreams: []*protocol.SyncCookie{channel1},
			},
		),
	)
	require.NoError(err, "ModifySync")
	log.Infow("ModifySync", "resp", resp)
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
	removeRes, err := bobClient.ModifySync(
		ctx,
		connect.NewRequest(
			&protocol.ModifySyncRequest{
				SyncId:        syncId,
				RemoveStreams: [][]byte{channelId[:]},
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
		{"testModifySyncAdd", testAddStreamsToSync},
		{"testModifySyncRemove", testRemoveStreamsFromSync},
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
		// "GetStreamEx": func(t *testing.T, ctx context.Context, client protocolconnect.StreamServiceClient, streamId
		// StreamId) {
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

func TestModifySyncWithWrongCookie(t *testing.T) {
	tt := newServiceTester(t, serviceTesterOpts{numNodes: 2, start: true})

	alice := tt.newTestClient(0, testClientOpts{enableSync: true})
	cookie := alice.createUserStreamGetCookie()

	alice.startSync()

	// Replace node address in the cookie with the address of the other node
	if common.BytesToAddress(cookie.NodeAddress) == tt.nodes[0].address {
		cookie.NodeAddress = tt.nodes[1].address.Bytes()
	} else {
		cookie.NodeAddress = tt.nodes[0].address.Bytes()
	}

	testfmt.Print(t, "Modifying sync with wrong cookie")
	resp, err := alice.client.ModifySync(alice.ctx, connect.NewRequest(&protocol.ModifySyncRequest{
		SyncId:     alice.SyncID(),
		AddStreams: []*protocol.SyncCookie{cookie},
	}))
	tt.require.NoError(err)
	tt.require.Len(resp.Msg.GetAdds(), 0)
	tt.require.Len(resp.Msg.GetRemovals(), 0)
}

func TestStartSyncWithWrongCookie(t *testing.T) {
	tt := newServiceTester(t, serviceTesterOpts{numNodes: 2, start: true, replicationFactor: 1})

	alice := tt.newTestClient(0, testClientOpts{enableSync: false})
	_ = alice.createUserStreamGetCookie()
	spaceId, _ := alice.createSpace()
	channelId, _, cookie := alice.createChannel(spaceId)

	// Replace node address in the cookie with the address of the other node
	if common.BytesToAddress(cookie.NodeAddress) == tt.nodes[0].address {
		cookie.NodeAddress = tt.nodes[1].address.Bytes()
	} else {
		cookie.NodeAddress = tt.nodes[0].address.Bytes()
	}

	alice.say(channelId, "hello from Alice")

	testfmt.Print(t, "StartSync with wrong cookie")
	// The context timeout should be a bit higher than the context timeout in syncer set when sending request to modify
	// sync
	syncCtx, syncCancel := context.WithTimeout(alice.ctx, 25*time.Second)
	defer syncCancel()

	updates, err := alice.client.SyncStreams(
		syncCtx,
		connect.NewRequest(&protocol.SyncStreamsRequest{SyncPos: []*protocol.SyncCookie{cookie}}),
	)
	tt.require.NoError(err)
	testfmt.Print(t, "StartSync with wrong cookie done")

	for updates.Receive() {
		msg := updates.Msg()
		if msg.GetSyncOp() == protocol.SyncOp_SYNC_UPDATE &&
			testutils.StreamIdFromBytes(msg.GetStream().GetNextSyncCookie().GetStreamId()) == channelId {
			syncCancel()
		}
	}
	tt.require.ErrorIs(updates.Err(), context.Canceled)
}
