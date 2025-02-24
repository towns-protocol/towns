package rpc

import (
	"fmt"
	"testing"
	"time"

	"github.com/towns-protocol/towns/core/node/crypto"
	. "github.com/towns-protocol/towns/core/node/protocol"
)

// Test_Node2Node_GetMiniblocksByIds tests fetching miniblocks by their IDs using internode RPC endpoints.
func Test_Node2Node_GetMiniblocksByIds(t *testing.T) {
	tt := newServiceTester(t, serviceTesterOpts{
		numNodes: 1,
		start:    true,
		btcParams: &crypto.TestParams{
			AutoMine:         true,
			AutoMineInterval: 10 * time.Millisecond,
			MineOnTx:         true,
		},
	})

	alice := tt.newTestClient(0)
	_ = alice.createUserStream()
	spaceId, _ := alice.createSpace()
	channelId, creationMb := alice.createChannel(spaceId)

	mbNums := []int64{creationMb.Num}
	const messagesNumber = 100
	for count := range messagesNumber {
		alice.say(channelId, fmt.Sprintf("hello from Alice %d", count))
		newMb, err := makeMiniblock(tt.ctx, alice.client, channelId, false, mbNums[len(mbNums)-1])
		tt.require.NoError(err)
		mbNums = append(mbNums, newMb.Num)
	}

	// Expected number of events is messagesNumber+2 because the first event is the channel creation event (inception),
	// the second event is the joining the channel event (membership), and the rest are the messages.
	const expectedEventsNumber = messagesNumber + 2

	tt.require.Eventually(func() bool {
		mbs := make([]*Miniblock, 0, expectedEventsNumber)
		alice.getMiniblocksByIds(channelId, mbNums, func(mb *Miniblock) {
			mbs = append(mbs, mb)
		})

		events := make([]*Envelope, 0, expectedEventsNumber)
		for _, mb := range mbs {
			events = append(events, mb.GetEvents()...)
		}

		return len(events) == expectedEventsNumber
	}, time.Second*5, time.Millisecond*200)
}
