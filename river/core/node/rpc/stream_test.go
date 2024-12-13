package rpc

import (
	"fmt"
	"testing"
	"time"

	"github.com/river-build/river/core/node/crypto"
	"github.com/river-build/river/core/node/protocol"
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
