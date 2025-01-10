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

	"github.com/river-build/river/core/config"
	"github.com/river-build/river/core/contracts/river"
	"github.com/river-build/river/core/node/crypto"
	"github.com/river-build/river/core/node/protocol"
	"github.com/river-build/river/core/node/testutils/testcert"
	"github.com/river-build/river/core/node/testutils/testfmt"
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

	alice := tt.newTestClient(0)
	_ = alice.createUserStream()
	spaceId, _ := alice.createSpace()
	channelId, _ := alice.createChannel(spaceId)

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
func logsAreSequentialAndStartFrom1(logs []*river.StreamRegistryV1StreamLastMiniblockUpdated, step uint64) bool {
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

	alice := tt.newTestClient(0)
	_ = alice.createUserStream()
	spaceId, _ := alice.createSpace()
	channelId, _ := alice.createChannel(spaceId)

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
		logs, err := filterer.FilterStreamLastMiniblockUpdated(&bind.FilterOpts{
			Start:   0,
			End:     nil,
			Context: tt.ctx,
		})
		tt.require.NoError(err)

		var logsFound []*river.StreamRegistryV1StreamLastMiniblockUpdated
		for logs.Next() {
			if log := logs.Event; log.StreamId == channelId {
				logsFound = append(logsFound, log)
			}
		}

		if testfmt.Enabled() {
			mbs := alice.getMiniblocks(channelId, 0, 100)
			testfmt.Print(t, "iter", i, "logsFound", len(logsFound), "mbs", len(mbs))
			for _, l := range logsFound {
				testfmt.Print(t, "    log", l.LastMiniblockNum)
			}
		}

		if len(logsFound) < 3 {
			return false
		}

		return logsAreSequentialAndStartFrom1(logsFound, miniblockRegistrationFrequency)
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
		listener = tls.NewListener(listener, testcert.GetHttp2LocalhostTLSConfig())

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
		var logsFound []*river.StreamRegistryV1StreamLastMiniblockUpdated

		msg := fmt.Sprint("hi again!", i)
		conversation = append(conversation, []string{msg})
		alice.say(channelId, msg)

		// get all logs and make sure that at least 3 miniblocks are registered
		logs, err := filterer.FilterStreamLastMiniblockUpdated(&bind.FilterOpts{
			Start:   0,
			End:     nil,
			Context: tt.ctx,
		})
		tt.require.NoError(err)

		for logs.Next() {
			if log := logs.Event; log.StreamId == channelId {
				logsFound = append(logsFound, log)
			}
		}

		if testfmt.Enabled() {
			mbs := alice.getMiniblocks(channelId, 0, 100)
			testfmt.Print(t, "iter", i, "logsFound", len(logsFound), "mbs", len(mbs))
		}

		if len(logsFound) < 10 {
			return false
		}

		// make sure that the logs have last miniblock num frequency apart
		return logsAreSequentialAndStartFrom1(logsFound, miniblockRegistrationFrequency)
	}, 20*time.Second, 25*time.Millisecond)

	alice.listen(channelId, []common.Address{alice.userId}, conversation)
}
