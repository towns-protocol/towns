package rpc

import (
	"crypto/tls"
	"fmt"
	"net"
	"strings"
	"testing"
	"time"

	"connectrpc.com/connect"
	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/stretchr/testify/assert"
	"google.golang.org/protobuf/proto"

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

	clients := tt.newTestClients(4, testClientOpts{enableSync: true})
	alice := clients[0]

	// let alice create a channel and let all clients join
	spaceId, _ := alice.createSpace()
	channelId, _ := clients.createChannelAndJoin(spaceId)

	// add a non-ephemeral message that must be included in the stream
	nonEphemeralMessage := "This is a message that should be persisted!"
	alice.say(channelId, nonEphemeralMessage)

	// add a ephemeral message that must not be included in the stream
	ephemeralMessage := "This is an ephemeral message that should not be persisted!"
	aliceView := alice.getLastMiniblockHash(channelId)
	ephemeralEnvelope, err := events.MakeEphemeralEnvelopeWithPayload(
		alice.wallet,
		events.Make_ChannelPayload_Message(ephemeralMessage),
		&shared.MiniblockRef{Hash: aliceView.Hash, Num: aliceView.Num},
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

	// ensure that all clients got both the non and ephemeral message through sync in the correct order
	require.EventuallyWithT(func(collect *assert.CollectT) {
		for _, client := range clients {
			syncedMessages := client.getAllSyncedMessages(channelId)
			if len(syncedMessages) != 2 {
				collect.Errorf("synced messages must contain both non-ephemeral and ephemeral messages")
			} else if syncedMessages[0].message != nonEphemeralMessage {
				collect.Errorf("synced messages must contain the non-ephemeral message as first event")
			} else if syncedMessages[1].message != ephemeralMessage {
				collect.Errorf("synced messages must contain the ephemeral message as second event")
			}
		}
	}, 20*time.Second, 25*time.Millisecond)

	// ensure that the ephemeral message is not included in the stream
	clients.listen(channelId, [][]string{{nonEphemeralMessage}})

	// Find the nodes that has the stream and make a miniblock
	var miniblockErr error
	for i := 0; i < len(tt.nodes); i++ {
		_, miniblockErr = tt.nodes[i].service.cache.TestMakeMiniblock(tt.ctx, channelId, false)
		if miniblockErr == nil {
			break
		}
	}
	require.NoError(miniblockErr)

	// ensure that the ephemeral message is not included in miniblocks as stored in storage
	// and that the non-ephemeral message is included and replicated correctly
	ephemeralEventHash := common.BytesToHash(ephemeralEnvelope.Hash)
	nonEphemeralMessageFound := 0
	ephemeralMessageFound := 0
	nodesWithStream := 0

	for i := 0; i < len(tt.nodes); i++ {
		nodeMessageCount := 0
		err := tt.nodes[i].service.storage.ReadMiniblocksByStream(
			tt.ctx,
			channelId,
			false,
			func(mbBytes []byte, _ int64, snBytes []byte) error {
				var mb protocol.Miniblock
				if err = proto.Unmarshal(mbBytes, &mb); err != nil {
					return err
				}

				for _, event := range mb.GetEvents() {
					parsedEvent, err := events.ParseEvent(event)
					require.NoError(err)

					// Check if this is the ephemeral message (should not be found)
					if parsedEvent.Hash == ephemeralEventHash {
						ephemeralMessageFound++
					}

					// Check if this is the non-ephemeral message
					if channelPayload := parsedEvent.Event.GetChannelPayload(); channelPayload != nil {
						if message := channelPayload.GetMessage(); message != nil {
							if message.GetCiphertext() == nonEphemeralMessage {
								nonEphemeralMessageFound++
								nodeMessageCount++
							}
						}
					}
				}

				return nil
			},
		)

		// Skip nodes that don't have the stream (stream not found error is expected)
		if err != nil && !strings.Contains(err.Error(), "Stream not found") {
			tt.require.NoError(err)
		} else if err == nil {
			nodesWithStream++
		}
	}

	// Verify that ephemeral message was not persisted in any miniblock
	tt.require.Equal(0, ephemeralMessageFound, "ephemeral message should not be found in any miniblock")

	// Debug output
	t.Logf("Nodes with stream: %d, Non-ephemeral messages found: %d", nodesWithStream, nonEphemeralMessageFound)

	// Verify that non-ephemeral message was replicated exactly 3 times (replication factor)
	tt.require.Equal(3, nonEphemeralMessageFound, "non-ephemeral message should be replicated exactly 3 times")

	// Verify that exactly 3 nodes have the stream (matching replication factor)
	tt.require.Equal(3, nodesWithStream, "exactly 3 nodes should have the stream")
}
