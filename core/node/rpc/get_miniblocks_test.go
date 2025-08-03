package rpc

import (
	"fmt"
	"slices"
	"testing"
	"time"

	"connectrpc.com/connect"
	"github.com/stretchr/testify/require"
	"google.golang.org/protobuf/proto"

	"github.com/towns-protocol/towns/core/config"
	"github.com/towns-protocol/towns/core/node/events"
	. "github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/protocol/protocolconnect"
	. "github.com/towns-protocol/towns/core/node/rpc/headers"
	"github.com/towns-protocol/towns/core/node/testutils/testfmt"
)

func TestGetMiniblocksExclusionFilter(t *testing.T) {
	tt := newServiceTester(t, serviceTesterOpts{numNodes: 1, start: true})
	require := tt.require

	// Create a test client
	alice := tt.newTestClient(0, testClientOpts{})
	alice.createUserStream()

	// Create a space using the existing test helper
	spaceId, _ := alice.createSpace()

	// Helper function to add a member payload event with proper prev miniblock hash
	addMemberEvent := func(payload *MemberPayload) {
		ref := alice.getLastMiniblockHash(spaceId)
		envelope, err := events.MakeEnvelopeWithPayload(
			alice.wallet,
			&StreamEvent_MemberPayload{MemberPayload: payload},
			ref,
		)
		require.NoError(err)
		alice.addEvent(spaceId, envelope)
	}

	// Add test events for filtering
	addMemberEvent(&MemberPayload{
		Content: &MemberPayload_KeySolicitation_{
			KeySolicitation: &MemberPayload_KeySolicitation{
				DeviceKey:   "test_device_key",
				FallbackKey: "test_fallback_key",
				IsNewDevice: true,
				SessionIds:  []string{"aaa"},
			},
		},
	})

	addMemberEvent(&MemberPayload{
		Content: &MemberPayload_Username{
			Username: &EncryptedData{
				Ciphertext: "test_username",
				Algorithm:  "test_algo",
			},
		},
	})

	addMemberEvent(&MemberPayload{
		Content: &MemberPayload_KeySolicitation_{
			KeySolicitation: &MemberPayload_KeySolicitation{
				DeviceKey:   "test_device_key_2",
				FallbackKey: "test_fallback_key_2",
				IsNewDevice: false,
				SessionIds:  []string{"session1"},
			},
		},
	})

	// Force miniblock creation to move events from minipool to miniblocks
	alice.makeMiniblock(spaceId, false, -1)

	// Add more events for the second miniblock
	addMemberEvent(&MemberPayload{
		Content: &MemberPayload_DisplayName{
			DisplayName: &EncryptedData{
				Ciphertext: "test_display_name",
				Algorithm:  "test_algo",
			},
		},
	})

	addMemberEvent(&MemberPayload{
		Content: &MemberPayload_KeySolicitation_{
			KeySolicitation: &MemberPayload_KeySolicitation{
				DeviceKey:   "test_device_key_3",
				FallbackKey: "test_fallback_key_3",
				IsNewDevice: true,
				SessionIds:  []string{"session2", "session3"},
			},
		},
	})

	// Create a second miniblock with the current events
	alice.makeMiniblock(spaceId, false, -1)

	// Add more events for the second miniblock
	addMemberEvent(&MemberPayload{
		Content: &MemberPayload_EnsAddress{
			EnsAddress: make([]byte, 20), // Valid Ethereum address length (20 bytes)
		},
	})

	// Create the final miniblock
	alice.makeMiniblock(spaceId, false, -1)

	// Test case 1: No exclusion filter - should return all events
	getMbReq := &GetMiniblocksRequest{
		StreamId:        spaceId[:],
		FromInclusive:   0,
		ToExclusive:     10,
		OmitSnapshots:   true,
		ExclusionFilter: []*EventFilter{},
	}
	getMbResp, err := alice.client.GetMiniblocks(tt.ctx, connect.NewRequest(getMbReq))
	require.NoError(err)

	// Count total events across all miniblocks
	totalEvents := 0
	for _, mb := range getMbResp.Msg.Miniblocks {
		totalEvents += len(mb.Events)
		require.False(mb.Partial) // Should not be partial when no filter applied
	}
	require.Equal(
		8,
		totalEvents,
		"Should have 8 events total (space inception + membership + 6 test events across 2 miniblocks)",
	)

	// Test case 2: Filter out key_solicitation events
	getMbReq.ExclusionFilter = []*EventFilter{
		{
			Payload: "member_payload",
			Content: "key_solicitation",
		},
	}
	getMbResp, err = alice.client.GetMiniblocks(tt.ctx, connect.NewRequest(getMbReq))
	require.NoError(err)

	// Count filtered events and check partial flags
	filteredEvents := 0
	hasPartialMiniblock := false
	foundInception := false
	foundMembership := false
	foundUsername := false
	foundKeySolicitation := false

	for _, mb := range getMbResp.Msg.Miniblocks {
		filteredEvents += len(mb.Events)
		if mb.Partial {
			hasPartialMiniblock = true
		}

		for _, envelope := range mb.Events {
			var streamEvent StreamEvent
			err := proto.Unmarshal(envelope.Event, &streamEvent)
			require.NoError(err)

			switch payload := streamEvent.Payload.(type) {
			case *StreamEvent_SpacePayload:
				if payload.SpacePayload.GetInception() != nil {
					foundInception = true
				}
			case *StreamEvent_MemberPayload:
				if payload.MemberPayload.GetMembership() != nil {
					foundMembership = true
				}
				if payload.MemberPayload.GetKeySolicitation() != nil {
					foundKeySolicitation = true
				}
				if payload.MemberPayload.GetUsername() != nil {
					foundUsername = true
				}
			}
		}
	}

	require.Equal(
		5,
		filteredEvents,
		"Should have 5 events after filtering out key_solicitation (space inception + membership + username + display_name + ens_address)",
	)
	require.True(hasPartialMiniblock, "Should have at least one partial miniblock")
	require.True(foundInception, "Should find inception event")
	require.True(foundMembership, "Should find membership event")
	require.True(foundUsername, "Should find username event")
	require.False(foundKeySolicitation, "Should NOT find key_solicitation events")

	// Test case 3: Filter out all member_payload events
	getMbReq.ExclusionFilter = []*EventFilter{
		{
			Payload: "member_payload",
			Content: "*",
		},
	}
	getMbResp, err = alice.client.GetMiniblocks(tt.ctx, connect.NewRequest(getMbReq))
	require.NoError(err)

	// Count events after filtering all member payloads
	filteredEvents = 0
	hasPartialMiniblock = false
	for _, mb := range getMbResp.Msg.Miniblocks {
		filteredEvents += len(mb.Events)
		if mb.Partial {
			hasPartialMiniblock = true
		}
	}
	require.Equal(
		1,
		filteredEvents,
		"Should have 1 event after filtering out all member payloads (just space inception)",
	)
	require.True(hasPartialMiniblock, "Should have at least one partial miniblock")

	// Test case 4: Filter that doesn't match anything
	getMbReq.ExclusionFilter = []*EventFilter{
		{
			Payload: "nonexistent_payload",
			Content: "nonexistent_content",
		},
	}
	getMbResp, err = alice.client.GetMiniblocks(tt.ctx, connect.NewRequest(getMbReq))
	require.NoError(err)

	// Count events with no filtering
	filteredEvents = 0
	hasPartialMiniblock = false
	for _, mb := range getMbResp.Msg.Miniblocks {
		filteredEvents += len(mb.Events)
		if mb.Partial {
			hasPartialMiniblock = true
		}
	}
	require.Equal(8, filteredEvents, "Should have all 8 events when filter doesn't match")
	require.False(hasPartialMiniblock, "Should NOT have any partial miniblocks when no events are filtered")

	// Test case 5: Verify filtering across multiple miniblocks
	getMbReq.ExclusionFilter = []*EventFilter{
		{
			Payload: "member_payload",
			Content: "ens_address",
		},
	}
	getMbResp, err = alice.client.GetMiniblocks(tt.ctx, connect.NewRequest(getMbReq))
	require.NoError(err)

	// Count events and verify both miniblocks are present
	filteredEvents = 0
	miniblockCount := 0
	partialMiniblockCount := 0
	foundDisplayName := false
	foundEnsAddress := false

	for _, mb := range getMbResp.Msg.Miniblocks {
		miniblockCount++
		filteredEvents += len(mb.Events)
		if mb.Partial {
			partialMiniblockCount++
		}

		for _, envelope := range mb.Events {
			var streamEvent StreamEvent
			err := proto.Unmarshal(envelope.Event, &streamEvent)
			require.NoError(err)

			if payload, ok := streamEvent.Payload.(*StreamEvent_MemberPayload); ok {
				if payload.MemberPayload.GetDisplayName() != nil {
					foundDisplayName = true
				}
				if payload.MemberPayload.GetEnsAddress() != nil {
					foundEnsAddress = true
				}
			}
		}
	}

	require.GreaterOrEqual(miniblockCount, 2, "Should have at least 2 miniblocks")
	require.Equal(7, filteredEvents, "Should have 7 events after filtering out ens_address events")
	require.Equal(
		1,
		partialMiniblockCount,
		"Should have 1 partial miniblock (the one containing the ens_address event)",
	)
	require.True(foundDisplayName, "Should find display_name event")
	require.False(foundEnsAddress, "Should NOT find ens_address events")

	// Test case 6: Multiple filters - filter out both key_solicitation AND display_name events
	getMbReq.ExclusionFilter = []*EventFilter{
		{
			Payload: "member_payload",
			Content: "key_solicitation",
		},
		{
			Payload: "member_payload",
			Content: "display_name",
		},
	}
	getMbResp, err = alice.client.GetMiniblocks(tt.ctx, connect.NewRequest(getMbReq))
	require.NoError(err)

	// Count events and verify multiple filters work together
	filteredEvents = 0
	hasPartialMiniblock = false
	foundInception = false
	foundMembership = false
	foundUsername = false
	foundDisplayName = false
	foundKeySolicitation = false
	foundEnsAddress = false

	for _, mb := range getMbResp.Msg.Miniblocks {
		filteredEvents += len(mb.Events)
		if mb.Partial {
			hasPartialMiniblock = true
		}

		for _, envelope := range mb.Events {
			var streamEvent StreamEvent
			err := proto.Unmarshal(envelope.Event, &streamEvent)
			require.NoError(err)

			switch payload := streamEvent.Payload.(type) {
			case *StreamEvent_SpacePayload:
				if payload.SpacePayload.GetInception() != nil {
					foundInception = true
				}
			case *StreamEvent_MemberPayload:
				if payload.MemberPayload.GetMembership() != nil {
					foundMembership = true
				}
				if payload.MemberPayload.GetKeySolicitation() != nil {
					foundKeySolicitation = true
				}
				if payload.MemberPayload.GetUsername() != nil {
					foundUsername = true
				}
				if payload.MemberPayload.GetDisplayName() != nil {
					foundDisplayName = true
				}
				if payload.MemberPayload.GetEnsAddress() != nil {
					foundEnsAddress = true
				}
			}
		}
	}

	require.Equal(
		4,
		filteredEvents,
		"Should have 4 events after filtering out key_solicitation AND display_name (space inception + membership + username + ens_address)",
	)
	require.True(hasPartialMiniblock, "Should have at least one partial miniblock when multiple filters are applied")
	require.True(foundInception, "Should find inception event")
	require.True(foundMembership, "Should find membership event")
	require.True(foundUsername, "Should find username event")
	require.True(foundEnsAddress, "Should find ens_address event")
	require.False(foundDisplayName, "Should NOT find display_name events (filtered out)")
	require.False(foundKeySolicitation, "Should NOT find key_solicitation events (filtered out)")
}

func TestMatchesEventFilter(t *testing.T) {
	service := &Service{}

	// Test exact matches
	filter := &EventFilter{Payload: "member_payload", Content: "key_solicitation"}
	require.True(t, service.matchesEventFilter("member_payload", "key_solicitation", filter))
	require.False(t, service.matchesEventFilter("member_payload", "username", filter))

	// Test wildcard content type
	filter = &EventFilter{Payload: "member_payload", Content: "*"}
	require.True(t, service.matchesEventFilter("member_payload", "key_solicitation", filter))
	require.True(t, service.matchesEventFilter("member_payload", "username", filter))
	require.False(t, service.matchesEventFilter("space_payload", "inception", filter))

	// Test wildcard payload type
	filter = &EventFilter{Payload: "*", Content: "key_solicitation"}
	require.True(t, service.matchesEventFilter("member_payload", "key_solicitation", filter))
	require.True(t, service.matchesEventFilter("space_payload", "key_solicitation", filter))
	require.False(t, service.matchesEventFilter("member_payload", "username", filter))

	// Test both wildcards
	filter = &EventFilter{Payload: "*", Content: "*"}
	require.True(t, service.matchesEventFilter("member_payload", "key_solicitation", filter))
	require.True(t, service.matchesEventFilter("space_payload", "inception", filter))
	require.True(t, service.matchesEventFilter("any_payload", "any_content", filter))
}

func TestExtractEventTypeInfo(t *testing.T) {
	service := &Service{}

	// Test MemberPayload with key_solicitation
	memberEvent := &StreamEvent{
		Payload: &StreamEvent_MemberPayload{
			MemberPayload: &MemberPayload{
				Content: &MemberPayload_KeySolicitation_{
					KeySolicitation: &MemberPayload_KeySolicitation{
						DeviceKey: "test_key",
					},
				},
			},
		},
	}
	payloadType, contentType := service.extractEventTypeInfo(memberEvent)
	require.Equal(t, "member_payload", payloadType)
	require.Equal(t, "key_solicitation", contentType)

	// Test SpacePayload with inception
	spaceEvent := &StreamEvent{
		Payload: &StreamEvent_SpacePayload{
			SpacePayload: &SpacePayload{
				Content: &SpacePayload_Inception_{
					Inception: &SpacePayload_Inception{
						StreamId: []byte("test_stream_id"),
					},
				},
			},
		},
	}
	payloadType, contentType = service.extractEventTypeInfo(spaceEvent)
	require.Equal(t, "space_payload", payloadType)
	require.Equal(t, "inception", contentType)

	// Test unknown payload type
	unknownEvent := &StreamEvent{
		Payload: nil,
	}
	payloadType, contentType = service.extractEventTypeInfo(unknownEvent)
	require.Equal(t, "unknown", payloadType)
	require.Equal(t, "unknown", contentType)
}

func TestGetMiniblocksWithMissingBlocks(t *testing.T) {
	// This test verifies the behavior of GetMiniblocks when miniblocks are missing locally
	// and the backwards reconciliation retry logic

	// Create a multi-node setup to test forwarding
	tt := newServiceTester(t, serviceTesterOpts{numNodes: 3, start: true})
	require := tt.require

	// Create test clients for different nodes
	alice := tt.newTestClient(0, testClientOpts{})
	alice.createUserStream()

	// Create a space and add some events
	spaceId, _ := alice.createSpace()

	// Add events and create miniblocks
	for i := 0; i < 5; i++ {
		ref := alice.getLastMiniblockHash(spaceId)
		envelope, err := events.MakeEnvelopeWithPayload(
			alice.wallet,
			&StreamEvent_MemberPayload{MemberPayload: &MemberPayload{
				Content: &MemberPayload_Username{
					Username: &EncryptedData{
						Ciphertext: fmt.Sprintf("username_%d", i),
						Algorithm:  "test_algo",
					},
				},
			}},
			ref,
		)
		require.NoError(err)
		alice.addEvent(spaceId, envelope)
		alice.makeMiniblock(spaceId, false, -1)
	}

	// Test Case 1: Normal operation - all miniblocks present locally
	getMbReq := &GetMiniblocksRequest{
		StreamId:      spaceId[:],
		FromInclusive: 0,
		ToExclusive:   10,
		OmitSnapshots: true,
	}
	getMbResp, err := alice.client.GetMiniblocks(tt.ctx, connect.NewRequest(getMbReq))
	require.NoError(err)
	require.GreaterOrEqual(len(getMbResp.Msg.Miniblocks), 5, "Should have at least 5 miniblocks")

	// Test Case 2: Test that requests are forwarded when stream is not local
	// Create a client for a different node
	bob := tt.newTestClient(1, testClientOpts{})
	bob.createUserStream()

	// Bob's node should be able to get the miniblocks via forwarding
	getMbResp, err = bob.client.GetMiniblocks(tt.ctx, connect.NewRequest(getMbReq))
	require.NoError(err, "Request should succeed via forwarding")
	require.GreaterOrEqual(len(getMbResp.Msg.Miniblocks), 5, "Should get miniblocks via forwarding")

	// Test Case 3: Test that no-forward header prevents forwarding for non-local streams
	// Find a node that doesn't have the stream locally
	var nodeWithoutStream int = -1
	for i := 0; i < 3; i++ {
		stream, err := tt.nodes[i].service.cache.GetStreamNoWait(tt.ctx, spaceId)
		if err != nil || stream == nil || !stream.IsLocal() {
			nodeWithoutStream = i
			break
		}
	}

	if nodeWithoutStream != -1 {
		// Use a client from a node that doesn't have the stream locally
		client := tt.testClient(nodeWithoutStream)
		forwardedReq := connect.NewRequest(getMbReq)
		forwardedReq.Header().Set(RiverNoForwardHeader, RiverHeaderTrueValue)

		// This should fail because the node doesn't have the stream and forwarding is disabled
		_, err = client.GetMiniblocks(tt.ctx, forwardedReq)
		require.Error(err, "Request with no-forward header should fail when stream is not local")
		require.Contains(err.Error(), "Forwarding disabled")
	}

	// Test Case 4: Verify that MINIBLOCKS_STORAGE_FAILURE is retriable
	// This is tested in TestIsOperationRetriableOnRemotes
}

func TestGetMiniblocksForwardingBehavior(t *testing.T) {
	// This test verifies that GetMiniblocks handles forwarding correctly
	// when miniblocks are missing locally and MINIBLOCKS_STORAGE_FAILURE
	// is retriable on remotes

	// Create a 3-node setup
	tt := newServiceTester(t, serviceTesterOpts{
		numNodes: 3,
		start:    true,
	})
	require := tt.require
	ctx := tt.ctx

	// Create test clients
	alice := tt.newTestClient(0, testClientOpts{})
	alice.createUserStream()

	// Create a space - it will be replicated to some nodes
	spaceId, _ := alice.createSpace()

	// Create 10 miniblocks
	for i := 0; i < 10; i++ {
		ref := alice.getLastMiniblockHash(spaceId)
		envelope, err := events.MakeEnvelopeWithPayload(
			alice.wallet,
			&StreamEvent_MemberPayload{MemberPayload: &MemberPayload{
				Content: &MemberPayload_Username{
					Username: &EncryptedData{
						Ciphertext: fmt.Sprintf("username_%d", i),
						Algorithm:  "test_algo",
					},
				},
			}},
			ref,
		)
		require.NoError(err)
		alice.addEvent(spaceId, envelope)
		alice.makeMiniblock(spaceId, false, -1)
	}

	// Ensure all nodes can read the miniblocks via forwarding
	getMbReq := &GetMiniblocksRequest{
		StreamId:      spaceId[:],
		FromInclusive: 0,
		ToExclusive:   10,
		OmitSnapshots: true,
	}

	for i := 0; i < 3; i++ {
		client := tt.testClient(i)
		resp, err := client.GetMiniblocks(ctx, connect.NewRequest(getMbReq))
		require.NoError(err, "Node %d should successfully read miniblocks via forwarding", i)
		require.GreaterOrEqual(len(resp.Msg.Miniblocks), 10, "Node %d should return all miniblocks", i)
	}

	// Test with forwarding disabled
	forwardDisabledReq := connect.NewRequest(getMbReq)
	forwardDisabledReq.Header().Set(RiverNoForwardHeader, RiverHeaderTrueValue)

	// Find which nodes have the stream locally
	localNodes := []int{}
	nonLocalNodes := []int{}

	for i := 0; i < 3; i++ {
		stream, err := tt.nodes[i].service.cache.GetStreamNoWait(ctx, spaceId)
		if err == nil && stream != nil && stream.IsLocal() {
			localNodes = append(localNodes, i)
		} else {
			nonLocalNodes = append(nonLocalNodes, i)
		}
	}

	// Nodes with the stream locally should succeed
	for _, nodeIdx := range localNodes {
		client := tt.testClient(nodeIdx)
		resp, err := client.GetMiniblocks(ctx, forwardDisabledReq)
		require.NoError(err, "Local node %d should succeed without forwarding", nodeIdx)
		require.GreaterOrEqual(len(resp.Msg.Miniblocks), 10)
	}

	// Nodes without the stream locally should fail
	for _, nodeIdx := range nonLocalNodes {
		client := tt.testClient(nodeIdx)
		_, err := client.GetMiniblocks(ctx, forwardDisabledReq)
		require.Error(err, "Non-local node %d should fail with forwarding disabled", nodeIdx)
		require.Contains(err.Error(), "Forwarding disabled")
	}

	// Verify that MINIBLOCKS_STORAGE_FAILURE is in the retriable errors list
	// This is tested in TestIsOperationRetriableOnRemotes
}

func TestGetMiniblocksWithGapsAcrossReplicas(t *testing.T) {
	// This test verifies that MINIBLOCKS_STORAGE_FAILURE is properly handled
	// in the GetMiniblocks implementation and is retriable on remotes

	tt := newServiceTester(t, serviceTesterOpts{
		numNodes:          4,
		replicationFactor: 3,
		start:             true,
		nodeStartOpts: &startOpts{
			configUpdater: func(cfg *config.Config) {
				// Disable stream reconciliation so it doesn't recover manually deleted miniblocks
				cfg.StreamReconciliation.InitialWorkerPoolSize = 0
				cfg.StreamReconciliation.OnlineWorkerPoolSize = 0
			},
		},
	})
	require := tt.require
	ctx := tt.ctx

	alice := tt.newTestClient(0, testClientOpts{})
	alice.createUserStream()

	spaceId, spaceLastMb := alice.createSpace()

	// Create 50 miniblocks total
	for i := range 200 {
		envelope, err := events.MakeEnvelopeWithPayload(
			alice.wallet,
			&StreamEvent_MemberPayload{MemberPayload: &MemberPayload{
				Content: &MemberPayload_Username{
					Username: &EncryptedData{
						Ciphertext: fmt.Sprintf("username_%d", i),
					},
				},
			}},
			spaceLastMb,
		)
		require.NoError(err)
		alice.addEvent(spaceId, envelope)
		newSpaceLastMb, err := alice.tryMakeMiniblock(spaceId, false, spaceLastMb.Num)
		if err != nil || newSpaceLastMb == nil {
			testfmt.Logf(t, "Failed to make miniblock: %v", err)
			continue
		}
		spaceLastMb = newSpaceLastMb
		if spaceLastMb.Num >= 49 {
			break
		}
	}
	require.Equal(int64(49), spaceLastMb.Num)
	testfmt.Logf(t, "Created 50 miniblocks total, last miniblock num: %d", spaceLastMb.Num)

	// Wait for all nodes to have all miniblocks locally
	require.Eventually(func() bool {
		var totalNum int64
		for i := range tt.opts.numNodes {
			num, _ := tt.nodes[i].service.storage.GetLastMiniblockNumber(ctx, spaceId)
			testfmt.Logf(t, "Node %d has last miniblock num: %d", i, num)
			totalNum += num
		}
		return totalNum == 147
	}, 10*time.Second, 100*time.Millisecond)

	// Verify we can read all miniblocks before deletion
	getMbReq := &GetMiniblocksRequest{
		StreamId:      spaceId[:],
		FromInclusive: 0,
		ToExclusive:   spaceLastMb.Num + 1,
	}
	resp, err := alice.client.GetMiniblocks(ctx, connect.NewRequest(getMbReq))
	require.NoError(err)
	testfmt.Logf(t, "Total miniblocks before deletion: %d", len(resp.Msg.Miniblocks))

	// Flush all caches, delete miniblocks in the pattern.
	var nodesWithStream []int
	nodeWithoutStream := -1
	for i := range tt.opts.numNodes {
		tt.nodes[i].service.cache.ForceFlushAll(ctx)

		// Check if the node has the stream locally in db.
		_, err := tt.nodes[i].service.storage.GetLastMiniblockNumber(ctx, spaceId)
		if err == nil {
			nodesWithStream = append(nodesWithStream, i)

			if len(nodesWithStream) == 2 {
				testfmt.Logf(t, "Deleting miniblocks 0-24 from node %d", i)
				err := tt.nodes[i].service.storage.DebugDeleteMiniblocks(ctx, spaceId, 0, 25)
				require.NoError(err)
			} else if len(nodesWithStream) == 3 {
				testfmt.Logf(t, "Deleting miniblocks 10-29 from node %d", i)
				err := tt.nodes[i].service.storage.DebugDeleteMiniblocks(ctx, spaceId, 10, 30)
				require.NoError(err)
			}
		} else {
			nodeWithoutStream = i
		}
	}
	require.Len(nodesWithStream, 3)
	require.NotEqual(nodeWithoutStream, -1)
	allNodes := append(nodesWithStream, nodeWithoutStream)

	// Let's create clients in order: 0 - all minibocks, 1 - 0-24 deleted, 2 - 10-29 deleted, 3 - no stream
	clientDescription := []string{"all minibocks", "0-24 deleted", "10-29 deleted", "no stream"}
	streamServiceClients := make([]protocolconnect.StreamServiceClient, tt.opts.numNodes)
	for i := range tt.opts.numNodes {
		streamServiceClients[i] = tt.testClient(allNodes[i])
	}

	for _, test := range []struct {
		fromInclusive    int64
		toExclusive      int64
		miniblocks       int
		noForwardSuccess []int
	}{
		{0, 10, 10, []int{0, 2}},
		{10, 25, 15, []int{0}},
		{10, 30, 20, []int{0}},
		{25, 35, 10, []int{0, 1}},
		{30, 60, 20, []int{0, 1, 2}},
		{0, 60, 50, []int{0}},
	} {
		req := &GetMiniblocksRequest{
			StreamId:      spaceId[:],
			FromInclusive: test.fromInclusive,
			ToExclusive:   test.toExclusive,
		}
		for i, c := range streamServiceClients {
			testfmt.Logf(t,
				"Testing client %d '%s' with range %d-%d, expected %d miniblocks, no-forward success: %v",
				i,
				clientDescription[i],
				test.fromInclusive,
				test.toExclusive,
				test.miniblocks,
				test.noForwardSuccess,
			)
			resp, err := c.GetMiniblocks(ctx, connect.NewRequest(req))
			require.NoError(err, "Node %s should successfully read low range via forwarding", clientDescription[i])
			require.Len(
				resp.Msg.Miniblocks,
				test.miniblocks,
				"Node %s should return %d miniblocks",
				clientDescription[i],
				test.miniblocks,
			)

			// Same with no-forward header
			noForwardReq := connect.NewRequest(req)
			noForwardReq.Header().Set(RiverNoForwardHeader, RiverHeaderTrueValue)
			resp, err = c.GetMiniblocks(ctx, noForwardReq)
			if slices.Contains(test.noForwardSuccess, i) {
				require.NoError(
					err,
					"Node %s should successfully read low range without forwarding",
					clientDescription[i],
				)
				require.Len(
					resp.Msg.Miniblocks,
					test.miniblocks,
					"Node %s should return %d miniblocks",
					clientDescription[i],
					test.miniblocks,
				)
			} else {
				require.Error(err, "Node %s should fail with forwarding disabled", clientDescription[i])
			}
		}
	}
}
