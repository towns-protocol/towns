package rpc

import (
	"fmt"
	"testing"
	"time"

	"connectrpc.com/connect"
	"github.com/stretchr/testify/assert"

	"github.com/towns-protocol/towns/core/node/crypto"
	"github.com/towns-protocol/towns/core/node/events"
	"github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/shared"
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

			// Check that all 4 ephemeral messages were received (order doesn't matter)
			receivedMessageStrings := make([]string, len(syncedMessages))
			for i, msg := range syncedMessages {
				receivedMessageStrings[i] = msg.message
			}

			assert.ElementsMatch(collect, ephemeralMessages, receivedMessageStrings,
				"client %d: messages don't match", clientIdx)
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
		StreamId:                    channelId[:],
		NumberOfPrecedingMiniblocks: 0,
	}))
	require.NoError(err)
	require.NotNil(resp1.Msg.Stream)

	// Store the original snapshot index and miniblock count
	originalSnapshotIndex := resp1.Msg.Stream.SnapshotMiniblockIndex
	originalMiniblockCount := len(resp1.Msg.Stream.Miniblocks)

	// Test 2: GetStream with 3 additional preceding miniblocks
	resp2, err := alice.client.GetStream(tt.ctx, connect.NewRequest(&protocol.GetStreamRequest{
		StreamId:                    channelId[:],
		NumberOfPrecedingMiniblocks: 3,
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
		StreamId:                    channelId[:],
		NumberOfPrecedingMiniblocks: 100, // More than available
	}))
	require.NoError(err)
	require.NotNil(resp3.Msg.Stream)

	// Should get all available miniblocks, but not error
	require.GreaterOrEqual(len(resp3.Msg.Stream.Miniblocks), originalMiniblockCount)
}
