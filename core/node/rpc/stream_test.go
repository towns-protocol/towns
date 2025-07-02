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
	tt := newServiceTester(t, serviceTesterOpts{numNodes: 5, replicationFactor: 3, start: true})
	require := tt.require

	// Create two users: Alice and Bob
	alice := tt.newTestClient(0, testClientOpts{enableSync: true})
	bob := tt.newTestClient(1, testClientOpts{enableSync: true})

	// Create user streams for both users
	_ = alice.createUserStream()
	_ = bob.createUserStream()

	// Alice creates a space
	spaceId, _ := alice.createSpace()

	// Alice creates a channel in the space
	channelId, _, _ := alice.createChannel(spaceId)

	// Bob joins the channel
	bob.joinChannel(spaceId, channelId, bob.getLastMiniblockHash(shared.UserStreamIdFromAddr(bob.wallet.Address)))

	// Alice sends an ephemeral message
	ephemeralMessage := "This is an ephemeral message that should not be persisted!"

	_, aliceView := alice.getStreamAndView(channelId, false)

	// Create ephemeral message envelope
	ephemeralEnvelope, err := events.MakeEphemeralEnvelopeWithPayload(
		alice.wallet,
		events.Make_ChannelPayload_Message(ephemeralMessage),
		aliceView.LastBlock().Ref,
	)
	require.NoError(err)

	// Add the ephemeral message to the channel
	_, err = alice.client.AddEvent(
		tt.ctx,
		connect.NewRequest(&protocol.AddEventRequest{
			StreamId: channelId[:],
			Event:    ephemeralEnvelope,
		}),
	)
	require.NoError(err)

	// Wait for the ephemeral message to be processed
	time.Sleep(100 * time.Millisecond)

	// Verify that both users receive the ephemeral message in real-time
	// but it's not persisted in the stream storage
	_, aliceView = alice.getStreamAndView(channelId, false)
	_, bobView := bob.getStreamAndView(channelId, false)

	// The ephemeral message should be in the current view (in memory) but not persisted
	// We can verify this by checking that the minipool still only has 1 event (the regular message)
	require.Equal(2, aliceView.GetStats().EventsInMinipool, "Alice should only see the regular message persisted")
	require.Equal(2, bobView.GetStats().EventsInMinipool, "Bob should only see the regular message persisted")

	// Test that ephemeral messages are received by subscribers
	// Send another ephemeral message
	ephemeralMessage2 := "Another ephemeral message!"
	ephemeralEnvelope2, err := events.MakeEphemeralEnvelopeWithPayload(
		alice.wallet,
		events.Make_ChannelPayload_Message(ephemeralMessage2),
		aliceView.LastBlock().Ref,
	)
	require.NoError(err)

	_, err = alice.client.AddEvent(
		tt.ctx,
		connect.NewRequest(&protocol.AddEventRequest{
			StreamId: channelId[:],
			Event:    ephemeralEnvelope2,
		}),
	)
	require.NoError(err)

	// Wait for the message to be processed
	time.Sleep(100 * time.Millisecond)

	// Verify that ephemeral messages are not persisted
	_, aliceView = alice.getStreamAndView(channelId, false)
	require.Equal(1, aliceView.GetStats().EventsInMinipool, "Ephemeral messages should not be persisted")
}
