package rpc

import (
	"context"
	"fmt"
	"testing"
	"time"

	"connectrpc.com/connect"

	"github.com/towns-protocol/towns/core/node/crypto"
	"github.com/towns-protocol/towns/core/node/logging"
	. "github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/protocol/protocolconnect"
	"github.com/towns-protocol/towns/core/node/rpc/node2nodeauth"
	"github.com/towns-protocol/towns/core/node/testutils/testcert"
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

	alice := tt.newTestClient(0, testClientOpts{})
	_ = alice.createUserStream()
	spaceId, _ := alice.createSpace()
	channelId, creationMb, _ := alice.createChannel(spaceId)

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

func TestNode2NodeAuth(t *testing.T) {
	tt := newServiceTester(t, serviceTesterOpts{
		numNodes: 1,
		start:    true,
		btcParams: &crypto.TestParams{
			AutoMine:         true,
			AutoMineInterval: 10 * time.Millisecond,
			MineOnTx:         true,
		},
	})

	alice := tt.newTestClient(0, testClientOpts{})
	_ = alice.createUserStream()
	spaceId, _ := alice.createSpace()
	channelId, creationMb, _ := alice.createChannel(spaceId)

	alice.say(channelId, "hello from Alice")
	_, err := makeMiniblock(tt.ctx, alice.client, channelId, false, creationMb.Num)
	tt.require.NoError(err)

	// Create another client with invalid certificate - unknown signer of certificate
	wallet, err := crypto.NewWallet(context.Background())
	tt.require.NoError(err)
	clientWithInvalidCert, err := testcert.GetHttp2LocalhostTLSClientWithCert(
		tt.ctx, tt.getConfig(), node2nodeauth.CertGetter(logging.FromCtx(tt.ctx), wallet, tt.btc.ChainId),
	)
	tt.require.NoError(err)
	client := protocolconnect.NewNodeToNodeClient(clientWithInvalidCert, tt.nodes[0].url, connect.WithGRPCWeb())
	resp, err := client.GetMiniblocksByIds(tt.ctx, connect.NewRequest(&GetMiniblocksByIdsRequest{
		StreamId:     channelId[:],
		MiniblockIds: []int64{0, 1},
	}))
	tt.require.NoError(err)
	tt.require.False(resp.Receive())
	tt.require.Contains(resp.Err().Error(), "tls: bad certificate")
}
