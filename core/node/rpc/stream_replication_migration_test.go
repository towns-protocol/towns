package rpc

import (
	"slices"
	"testing"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/towns-protocol/towns/core/node/testutils/testfmt"

	"github.com/towns-protocol/towns/core/contracts/river"
	"github.com/towns-protocol/towns/core/node/crypto"
)

// TestStreamNonReplToReplMigration tests the stream migration from a non-replicated to a replicated stream.
func TestStreamNonReplToReplMigration(t *testing.T) {
	const replFactor = 3

	tt := newServiceTester(t, serviceTesterOpts{numNodes: 2 * replFactor, start: true, btcParams: &crypto.TestParams{
		AutoMine: true,
	}})

	// start with pre-migration settings
	tt.btc.SetConfigValue(
		t,
		tt.ctx,
		crypto.StreamReplicationFactorConfigKey,
		crypto.ABIEncodeUint64(1),
	)

	alice := tt.newTestClient(0, testClientOpts{})
	_ = alice.createUserStream()
	spaceId, _ := alice.createSpace()
	channelId, _, cookie := alice.createChannel(spaceId)

	for i, node := range tt.nodes {
		if node.address == common.BytesToAddress(cookie.NodeAddress) {
			testfmt.Printf(t, "stream %s placed on node %s / numNodes %d\n", channelId, node.address, i)
		}
	}

	testfmt.Logf(t, "created stream %s on node %s", channelId, common.BytesToAddress(cookie.GetNodeAddress()))

	// create several miniblocks
	tt.require.Eventually(func() bool {
		alice.say(channelId, "hello from Alice")
		cookie := alice.getStream(channelId)
		return cookie.GetNextSyncCookie().GetMinipoolGen() > 2
	}, time.Second*10, time.Millisecond*100)

	// place stream on replFactor nodes with a replication factor of 1. This simulates the scenario that only
	// the first initial node takes part on stream quorum while  the others sync the stream into their local
	// storage but don't participate in the quorum (yet).
	leadingNodeAddress := common.BytesToAddress(cookie.NodeAddress)
	placementNodeAddresses := []common.Address{leadingNodeAddress}
	for _, node := range tt.nodes {
		if node.address != leadingNodeAddress && len(placementNodeAddresses) < replFactor {
			placementNodeAddresses = append(placementNodeAddresses, node.address)
		}
	}

	testfmt.Logf(
		t,
		"Set stream %s repl factor to %d / placementNodeAddresses: %v",
		channelId,
		1,
		placementNodeAddresses,
	)

	tt.btc.SetStreamReplicationFactor(
		t,
		tt.ctx,
		[]river.SetStreamReplicationFactor{
			{
				StreamId:          channelId,
				Nodes:             placementNodeAddresses,
				ReplicationFactor: 1,
			},
		},
	)

	// ensure that the all nodes synced the stream into their local storage while it isn't progressing
	stream, err := tt.btc.StreamRegistry.GetStream(nil, channelId)
	require.NoError(t, err)
	atLeastMBNum := int64(stream.LastMiniblockNum) // ensure all nodes track stream progress

	tt.require.EventuallyWithT(func(c *assert.CollectT) {
		syncedNodes := 0
		for _, node := range tt.nodes {
			participating := slices.Contains(placementNodeAddresses, node.address)
			if participating { // ensure that node has synced the stream in storage
				lastMBNum, err := node.service.storage.GetLastMiniblockNumber(tt.ctx, channelId)
				if err == nil && lastMBNum >= atLeastMBNum {
					syncedNodes++
				}

				testfmt.Logf(t, "node %s synced stream %s to miniblock %d / atLeast %d",
					node.address, channelId, lastMBNum, atLeastMBNum)
			}
		}

		assert.EqualValues(c, len(placementNodeAddresses), syncedNodes, "unexpected number of synced nodes")
	}, time.Second*10, time.Millisecond*100)

	// ensure that the all nodes synced the stream into their local storage while the stream progresses
	stream, err = tt.btc.StreamRegistry.GetStream(nil, channelId)
	require.NoError(t, err)
	atLeastMBNum = int64(stream.LastMiniblockNum + 5) // ensure all nodes track stream progress

	tt.require.EventuallyWithT(func(c *assert.CollectT) {
		alice.say(channelId, "hello from Alice")

		syncedNodes := 0

		for _, node := range tt.nodes {
			participating := slices.Contains(placementNodeAddresses, node.address)
			if participating { // ensure that node has synced the stream in storage
				lastMBNum, err := node.service.storage.GetLastMiniblockNumber(tt.ctx, channelId)
				if err == nil && lastMBNum >= atLeastMBNum {
					syncedNodes++
				}

				testfmt.Logf(t, "node %s synced stream %s to miniblock %d / atLeast %d",
					node.address, channelId, lastMBNum, atLeastMBNum)
			}
		}

		assert.EqualValues(c, len(placementNodeAddresses), syncedNodes, "unexpected number of synced nodes")
	}, time.Second*10, time.Millisecond*1000)

	// bump the replication factor to all replacement nodes and ensure that the stream is now quorum-replicated
	tt.btc.SetStreamReplicationFactor(
		t,
		tt.ctx,
		[]river.SetStreamReplicationFactor{
			{
				StreamId:          channelId,
				Nodes:             placementNodeAddresses,
				ReplicationFactor: uint8(len(placementNodeAddresses)),
			},
		})

	testfmt.Logf(t, "Stream %s replicated over nodes %v", channelId, placementNodeAddresses)
	stream, err = tt.btc.StreamRegistry.GetStream(nil, channelId)
	require.NoError(t, err)
	atLeastMBNum = int64(stream.LastMiniblockNum + 5) // ensure miniblocks can be reproduced

	tt.require.EventuallyWithT(func(c *assert.CollectT) {
		alice.say(channelId, "hello from Alice")

		syncedNodes := 0
		for _, node := range tt.nodes {
			participating := slices.Contains(placementNodeAddresses, node.address)
			if participating { // ensure that node has synced the stream in storage
				lastMBNum, err := node.service.storage.GetLastMiniblockNumber(tt.ctx, channelId)
				if err == nil && lastMBNum >= atLeastMBNum {
					syncedNodes++
				}

				testfmt.Logf(t, "node %s synced stream %s to miniblock %d / atLeast %d",
					node.address, channelId, lastMBNum, atLeastMBNum)
			}
		}

		assert.EqualValues(c, len(placementNodeAddresses), syncedNodes, "unexpected number of synced nodes")
	}, time.Second*10, time.Millisecond*100)
}
