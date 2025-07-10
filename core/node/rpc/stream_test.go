package rpc

import (
	"crypto/tls"
	"fmt"
	"net"
	"testing"
	"time"

	"connectrpc.com/connect"
	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/stretchr/testify/assert"

	"github.com/towns-protocol/towns/core/config"
	"github.com/towns-protocol/towns/core/contracts/river"
	"github.com/towns-protocol/towns/core/node/crypto"
	"github.com/towns-protocol/towns/core/node/events"
	"github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/testutils/testcert"
	"github.com/towns-protocol/towns/core/node/testutils/testfmt"
)

func TestGetStreamEx(t *testing.T) {
	tt := newServiceTester(
		t,
		serviceTesterOpts{
			numNodes: 1,
			start:    true,
			btcParams: &crypto.TestParams{
				AutoMine:         true,
				AutoMineInterval: 10 * time.Millisecond,
				MineOnTx:         true,
			},
		},
	)
	require := tt.require

	alice := tt.newTestClient(0, testClientOpts{})
	_ = alice.createUserStream()
	spaceId, _ := alice.createSpace()
	channelId, _, _ := alice.createChannel(spaceId)

	for count := range 100 {
		alice.say(channelId, fmt.Sprintf("hello from Alice %d", count))
	}

	// Expected number of events is 102 because the first event is the channel creation event (inception),
	// the second event is the joining the channel event (membership), and the rest are the messages.
	const expectedEventsNumber = 102

	require.Eventually(func() bool {
		mbs := make([]*protocol.Miniblock, 0, expectedEventsNumber)
		alice.getStreamEx(channelId, func(mb *protocol.Miniblock) {
			mbs = append(mbs, mb)
		})

		events := make([]*protocol.Envelope, 0, expectedEventsNumber)
		for _, mb := range mbs {
			events = append(events, mb.GetEvents()...)
		}

		return len(events) == expectedEventsNumber
	}, time.Second*5, time.Millisecond*200)
}

// expected miniblock nums seq: [1, step, 2*step, 3*step, ...]
func logsAreSequentialAndStartFrom1(logs []*river.StreamMiniblockUpdate, step uint64) bool {
	if len(logs) < 3 {
		return false
	}

	if logs[0].LastMiniblockNum != 1 {
		return false
	}

	for i := 1; i < len(logs); i++ {
		exp := uint64(i) * step
		if logs[i].LastMiniblockNum != exp {
			return false
		}
	}

	return true
}

// TestMiniBlockProductionFrequency ensures only every 1 out of StreamMiniblockRegistrationFrequencyKey miniblock
// is registered for a stream.
func TestMiniBlockProductionFrequency(t *testing.T) {
	tt := newServiceTester(t, serviceTesterOpts{numNodes: 1, start: false, btcParams: &crypto.TestParams{
		AutoMine: true,
	}})
	miniblockRegistrationFrequency := uint64(3)
	tt.btc.SetConfigValue(
		t,
		tt.ctx,
		crypto.StreamMiniblockRegistrationFrequencyKey,
		crypto.ABIEncodeUint64(miniblockRegistrationFrequency),
	)

	tt.initNodeRecords(0, 1, river.NodeStatus_Operational)
	tt.startNodes(0, 1, startOpts{configUpdater: func(config *config.Config) {
		config.Graffiti = "firstNode"
	}})

	alice := tt.newTestClient(0, testClientOpts{})
	_ = alice.createUserStream()
	spaceId, _ := alice.createSpace()
	channelId, _, _ := alice.createChannel(spaceId)

	// retrieve set last miniblock events and make sure that only 1 out of miniblockRegistrationFrequency
	// miniblocks is registered
	filterer, err := river.NewStreamRegistryV1Filterer(tt.btc.RiverRegistryAddress, tt.btc.Client())
	tt.require.NoError(err)

	i := -1
	var conversation [][]string
	tt.require.Eventually(func() bool {
		i++

		msg := fmt.Sprint("hi!", i)
		conversation = append(conversation, []string{msg})
		alice.say(channelId, msg)

		// get all logs and make sure that at least 3 miniblocks are registered
		logs, err := filterer.FilterStreamUpdated(&bind.FilterOpts{
			Start:   0,
			End:     nil,
			Context: tt.ctx,
		}, []uint8{uint8(river.StreamUpdatedEventTypeLastMiniblockBatchUpdated)})
		tt.require.NoError(err)

		var streamUpdates []*river.StreamMiniblockUpdate
		for logs.Next() {
			parsedLogs, err := river.ParseStreamUpdatedEvent(logs.Event)
			tt.require.NoError(err)

			for _, parsedLog := range parsedLogs {
				tt.require.Equal(river.StreamUpdatedEventTypeLastMiniblockBatchUpdated, parsedLog.Reason())
				if parsedLog.GetStreamId() == channelId {
					streamUpdates = append(streamUpdates, parsedLog.(*river.StreamMiniblockUpdate))
				}
			}
		}

		if testfmt.Enabled() {
			mbs := alice.getMiniblocks(channelId, 0, 100)
			testfmt.Print(t, "iter", i, "logsFound", len(streamUpdates), "mbs", len(mbs))
			for _, l := range streamUpdates {
				testfmt.Print(t, "    log", l.LastMiniblockNum)
			}
		}

		if len(streamUpdates) < 3 {
			return false
		}

		return logsAreSequentialAndStartFrom1(streamUpdates, miniblockRegistrationFrequency)
	}, 20*time.Second, 25*time.Millisecond)

	alice.listen(channelId, []common.Address{alice.userId}, conversation)

	// alice sees "firstNode" in the graffiti
	infoResp, err := alice.client.Info(tt.ctx, connect.NewRequest(&protocol.InfoRequest{}))
	tt.require.NoError(err)
	tt.require.Equal(infoResp.Msg.Graffiti, "firstNode")

	// restart node
	firstNode := tt.nodes[0]
	address := firstNode.service.listener.Addr()
	firstNode.service.Close()

	// poll until it's possible to create new listener on the same address
	var listener net.Listener
	j := -1
	tt.require.Eventually(func() bool {
		j++
		testfmt.Print(t, "making listener", j)
		listener, err = net.Listen("tcp", address.String())
		if err != nil {
			return false
		}
		listener = tls.NewListener(listener, testcert.GetHttp2LocalhostTLSConfig(nil))

		return true
	}, 20*time.Second, 25*time.Millisecond)

	tt.require.NoError(tt.startSingle(0, startOpts{
		listeners: []net.Listener{listener},
		configUpdater: func(config *config.Config) {
			config.Graffiti = "secondNode"
		},
	}))

	// alice sees "secondNode" in the graffiti
	infoResp, err = alice.client.Info(tt.ctx, connect.NewRequest(&protocol.InfoRequest{}))
	tt.require.NoError(err)
	tt.require.Equal(infoResp.Msg.Graffiti, "secondNode")

	alice.listen(channelId, []common.Address{alice.userId}, conversation)

	tt.require.Eventually(func() bool {
		i++

		msg := fmt.Sprint("hi again!", i)
		conversation = append(conversation, []string{msg})
		alice.say(channelId, msg)

		// get all logs and make sure that at least 3 miniblocks are registered
		logs, err := filterer.FilterStreamUpdated(&bind.FilterOpts{
			Start:   0,
			End:     nil,
			Context: tt.ctx,
		}, []uint8{uint8(river.StreamUpdatedEventTypeLastMiniblockBatchUpdated)})
		tt.require.NoError(err)

		var streamUpdates []*river.StreamMiniblockUpdate
		for logs.Next() {
			parsedLogs, err := river.ParseStreamUpdatedEvent(logs.Event)
			tt.require.NoError(err)

			for _, parsedLog := range parsedLogs {
				tt.require.Equal(river.StreamUpdatedEventTypeLastMiniblockBatchUpdated, parsedLog.Reason())
				if parsedLog.GetStreamId() == channelId {
					streamUpdates = append(streamUpdates, parsedLog.(*river.StreamMiniblockUpdate))
				}
			}
		}

		if testfmt.Enabled() {
			mbs := alice.getMiniblocks(channelId, 0, 100)
			testfmt.Print(t, "iter", i, "logsFound", len(streamUpdates), "mbs", len(mbs))
		}

		testfmt.Printf(t, "found %d logs", len(streamUpdates))

		if len(streamUpdates) < 10 {
			return false
		}

		// make sure that the logs have last miniblock num frequency apart
		return logsAreSequentialAndStartFrom1(streamUpdates, miniblockRegistrationFrequency)
	}, 20*time.Second, 25*time.Millisecond)

	alice.listen(channelId, []common.Address{alice.userId}, conversation)
}

func TestEphemeralMessageInChat(t *testing.T) {
	tt := newServiceTester(
		t,
		serviceTesterOpts{
			numNodes:          4,
			replicationFactor: 3,
			start:             true,
			btcParams: &crypto.TestParams{
				AutoMine:         true,
				AutoMineInterval: 200 * time.Millisecond,
				MineOnTx:         false,
			},
		},
	)
	require := tt.require

	clients := tt.newTestClients(tt.opts.numNodes, testClientOpts{enableSync: true})

	spaceId, _ := clients[0].createSpace()
	channelId, _ := clients.createChannelAndJoin(spaceId)

	// Each client sends an ephemeral message to test all routing permutations
	var ephemeralMessages []string

	for i, client := range clients {
		ephemeralMessage := fmt.Sprintf("Ephemeral message from client %d", i)
		ephemeralMessages = append(ephemeralMessages, ephemeralMessage)

		clientView := client.getLastMiniblockHash(channelId)
		ephemeralEnvelope, err := events.MakeEphemeralEnvelopeWithPayload(
			client.wallet,
			events.Make_ChannelPayload_Message(ephemeralMessage),
			&shared.MiniblockRef{Hash: clientView.Hash, Num: clientView.Num},
		)
		require.NoError(err)

		// Add the ephemeral message to the channel
		_, err = client.client.AddEvent(
			tt.ctx,
			connect.NewRequest(&protocol.AddEventRequest{
				StreamId: channelId[:],
				Event:    ephemeralEnvelope,
			}),
		)
		require.NoError(err)
	}

	// Find a node that has the stream and make a miniblock
	var miniblockErr error
	for i := 0; i < len(tt.nodes); i++ {
		_, miniblockErr = tt.nodes[i].service.cache.TestMakeMiniblock(tt.ctx, channelId, false)
		if miniblockErr == nil {
			break
		}
	}
	require.NoError(miniblockErr)

	// ensure that all clients got all 4 ephemeral messages through sync
	require.EventuallyWithT(func(collect *assert.CollectT) {
		for clientIdx, client := range clients {
			syncedMessages := client.getAllSyncedMessages(channelId)
			if len(syncedMessages) != tt.opts.numNodes {
				collect.Errorf("client %d: expected 4 messages, got %d", clientIdx, len(syncedMessages))
				return
			}

			// Check that all 4 ephemeral messages were received
			for i, expectedMessage := range ephemeralMessages {
				if syncedMessages[i].message != expectedMessage {
					collect.Errorf("client %d: expected message %d to be '%s', got '%s'",
						clientIdx, i, expectedMessage, syncedMessages[i].message)
				}
			}
		}
	}, 20*time.Second, 25*time.Millisecond)

	// ensure that ephemeral messages are not persisted in storage
	clients.listen(channelId, [][]string{})
}

func TestGetStreamWithPrecedingMiniblocks(t *testing.T) {
	tt := newServiceTester(
		t,
		serviceTesterOpts{
			numNodes: 1,
			start:    true,
			btcParams: &crypto.TestParams{
				AutoMine:         true,
				AutoMineInterval: 10 * time.Millisecond,
				MineOnTx:         true,
			},
		},
	)
	require := tt.require
	
	// Create a user and a channel with some messages
	alice := tt.newTestClient(0, testClientOpts{})
	_ = alice.createUserStream()
	spaceId, _ := alice.createSpace()
	channelId, _, _ := alice.createChannel(spaceId)
	
	// Send multiple messages to create several miniblocks
	for i := 0; i < 20; i++ {
		alice.say(channelId, fmt.Sprintf("Message %d", i))
		if i%5 == 4 {
			// Force miniblock creation every 5 messages
			time.Sleep(100 * time.Millisecond)
		}
	}
	
	// Wait for miniblocks to be created
	time.Sleep(500 * time.Millisecond)
	
	// Test 1: GetStream without additional preceding miniblocks
	resp1, err := alice.client.GetStream(tt.ctx, connect.NewRequest(&protocol.GetStreamRequest{
		StreamId:                       channelId[:],
		NumberOfPrecedingMiniblocks:    0,
	}))
	require.NoError(err)
	require.NotNil(resp1.Msg.Stream)
	
	// Store the original snapshot index and miniblock count
	originalSnapshotIndex := resp1.Msg.Stream.SnapshotMiniblockIndex
	originalMiniblockCount := len(resp1.Msg.Stream.Miniblocks)
	
	// Test 2: GetStream with 3 additional preceding miniblocks
	resp2, err := alice.client.GetStream(tt.ctx, connect.NewRequest(&protocol.GetStreamRequest{
		StreamId:                       channelId[:],
		NumberOfPrecedingMiniblocks:    3,
	}))
	require.NoError(err)
	require.NotNil(resp2.Msg.Stream)
	
	// Verify we got the same or more miniblocks
	require.GreaterOrEqual(len(resp2.Msg.Stream.Miniblocks), originalMiniblockCount)
	
	// Verify the snapshot index is adjusted if we got more miniblocks
	if len(resp2.Msg.Stream.Miniblocks) > originalMiniblockCount {
		additionalBlocks := len(resp2.Msg.Stream.Miniblocks) - originalMiniblockCount
		require.Equal(originalSnapshotIndex+int64(additionalBlocks), resp2.Msg.Stream.SnapshotMiniblockIndex)
	}
	
	// Test 3: GetStream with a large number of preceding miniblocks
	resp3, err := alice.client.GetStream(tt.ctx, connect.NewRequest(&protocol.GetStreamRequest{
		StreamId:                       channelId[:],
		NumberOfPrecedingMiniblocks:    100, // More than available
	}))
	require.NoError(err)
	require.NotNil(resp3.Msg.Stream)
	
	// Should get all available miniblocks, but not error
	require.GreaterOrEqual(len(resp3.Msg.Stream.Miniblocks), originalMiniblockCount)
}
