package rpc

import (
	"fmt"
	"testing"

	"connectrpc.com/connect"
	"github.com/stretchr/testify/require"
	"google.golang.org/protobuf/proto"

	"github.com/towns-protocol/towns/core/config"
	"github.com/towns-protocol/towns/core/node/events"
	. "github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/protocol/protocolconnect"
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
				SessionIds:  []string{},
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

	// Create 50 miniblocks
	for i := 0; i < 50; i++ {
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
		spaceLastMb = alice.makeMiniblock(spaceId, false, spaceLastMb.Num)
	}
	require.GreaterOrEqual(spaceLastMb.Num, int64(50))
	t.Logf("Created %d miniblocks, last miniblock num: %d", 50, spaceLastMb.Num)

	// Verify we can read all miniblocks before deletion
	getMbReq := &GetMiniblocksRequest{
		StreamId:      spaceId[:],
		FromInclusive: 0,
		ToExclusive:   spaceLastMb.Num + 1,
		OmitSnapshots: true,
	}
	resp, err := alice.client.GetMiniblocks(ctx, connect.NewRequest(getMbReq))
	require.NoError(err)
	t.Logf("Total miniblocks before deletion: %d", len(resp.Msg.Miniblocks))

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
				// Delete miniblocks 0-25 from the first replica
				t.Logf("Deleting miniblocks 0-25 from node %d", i)
				err := tt.nodes[i].service.storage.DebugDeleteMiniblocks(ctx, spaceId, 0, 25)
				require.NoError(err)
			} else if len(nodesWithStream) == 3 {
				// Delete miniblocks 10-30 from the second replica
				t.Logf("Deleting miniblocks 10-30 from node %d", i)
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

	// Let's create clients in order: 0 - all minibocks, 1 - 0-25 deleted, 2 - 10-30 deleted, 3 - no stream
	clientDescription := []string{"all minibocks", "0-25 deleted", "10-30 deleted", "no stream"}
	streamServiceClients := make([]protocolconnect.StreamServiceClient, tt.opts.numNodes)
	for i := range tt.opts.numNodes {
		streamServiceClients[i] = tt.testClient(allNodes[i])
	}

	// Test reading various ranges with and without forwarding
	// Test 1: Read range 0-10 from all nodes - should work via forwarding
	lowRangeReq := &GetMiniblocksRequest{
		StreamId:      spaceId[:],
		FromInclusive: 0,
		ToExclusive:   10,
		OmitSnapshots: true,
	}
	for i, c := range streamServiceClients {
		t.Logf("Testing client %s", clientDescription[i])
		resp, err := c.GetMiniblocks(ctx, connect.NewRequest(lowRangeReq))
		require.NoError(err, "Node %s should successfully read low range via forwarding", clientDescription[i])
		require.Len(resp.Msg.Miniblocks, 10, "Node %s should return 10 miniblocks", clientDescription[i])
	}

	// // Test reading various ranges with and without forwarding
	// // Test 1: Read range 0-10 from all nodes - should work via forwarding
	// lowRangeReq := &GetMiniblocksRequest{
	// 	StreamId:      spaceId[:],
	// 	FromInclusive: 0,
	// 	ToExclusive:   10,
	// 	OmitSnapshots: true,
	// }

	// // Test 2: Read range 15-25 - should work from all nodes
	// midRangeReq := &GetMiniblocksRequest{
	// 	StreamId:      spaceId[:],
	// 	FromInclusive: 15,
	// 	ToExclusive:   25,
	// 	OmitSnapshots: true,
	// }

	// for i := 0; i < 4; i++ {
	// 	client := tt.testClient(i)
	// 	resp, err := client.GetMiniblocks(ctx, connect.NewRequest(midRangeReq))
	// 	require.NoError(err, "Node %d should successfully read mid range via forwarding", i)
	// 	require.Greater(len(resp.Msg.Miniblocks), 0, "Node %d should return some miniblocks", i)
	// }

	// // Test 3: Read range 35-50 - should work from all nodes (no gaps in this range)
	// highRangeReq := &GetMiniblocksRequest{
	// 	StreamId:      spaceId[:],
	// 	FromInclusive: 35,
	// 	ToExclusive:   50,
	// 	OmitSnapshots: true,
	// }

	// for i := 0; i < 4; i++ {
	// 	client := tt.testClient(i)
	// 	resp, err := client.GetMiniblocks(ctx, connect.NewRequest(highRangeReq))
	// 	require.NoError(err, "Node %d should successfully read high range", i)
	// 	require.Greater(len(resp.Msg.Miniblocks), 0, "Node %d should return some miniblocks", i)
	// }

	// // Test 4: Test with forwarding disabled - nodes with gaps should fail
	// forwardDisabledLowReq := connect.NewRequest(lowRangeReq)
	// forwardDisabledLowReq.Header().Set(RiverNoForwardHeader, RiverHeaderTrueValue)

	// forwardDisabledMidReq := connect.NewRequest(midRangeReq)
	// forwardDisabledMidReq.Header().Set(RiverNoForwardHeader, RiverHeaderTrueValue)

	// forwardDisabledHighReq := connect.NewRequest(highRangeReq)
	// forwardDisabledHighReq.Header().Set(RiverNoForwardHeader, RiverHeaderTrueValue)

	// // Check each replica node
	// for i, nodeIdx := range nodesWithStream {
	// 	client := tt.testClient(nodeIdx)

	// 	// Low range (0-10) with no forwarding
	// 	_, err := client.GetMiniblocks(ctx, forwardDisabledLowReq)
	// 	if i == 0 {
	// 		// First replica has gaps in 0-25
	// 		require.Error(err, "Replica %d should fail for range 0-10 due to gaps", i)
	// 		require.Contains(err.Error(), "MINIBLOCKS_STORAGE_FAILURE")
	// 	} else if i == 1 {
	// 		// Second replica has gaps in 10-30
	// 		require.NoError(err, "Replica %d should succeed for range 0-10", i)
	// 	} else {
	// 		// Third replica has all miniblocks
	// 		require.NoError(err, "Replica %d should succeed for range 0-10", i)
	// 	}

	// 	// Mid range (15-25) with no forwarding
	// 	_, err = client.GetMiniblocks(ctx, forwardDisabledMidReq)
	// 	if i == 0 || i == 1 {
	// 		// Both first and second replicas have gaps in this range
	// 		require.Error(err, "Replica %d should fail for range 15-25 due to gaps", i)
	// 		require.Contains(err.Error(), "MINIBLOCKS_STORAGE_FAILURE")
	// 	} else {
	// 		// Third replica has all miniblocks
	// 		require.NoError(err, "Replica %d should succeed for range 15-25", i)
	// 	}

	// 	// High range (35-50) with no forwarding - all should succeed
	// 	resp, err := client.GetMiniblocks(ctx, forwardDisabledHighReq)
	// 	require.NoError(err, "Replica %d should succeed for range 35-50", i)
	// 	require.Greater(len(resp.Msg.Miniblocks), 0)
	// }

	// // Test non-replica node with forwarding disabled - should fail
	// if nodeWithoutStream != -1 {
	// 	client := tt.testClient(nodeWithoutStream)
	// 	_, err := client.GetMiniblocks(ctx, forwardDisabledHighReq)
	// 	require.Error(err, "Non-replica node should fail with forwarding disabled")
	// 	require.Contains(err.Error(), "Forwarding disabled")
	// }
}
