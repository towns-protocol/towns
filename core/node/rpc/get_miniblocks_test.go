package rpc

import (
	"testing"

	"connectrpc.com/connect"
	"github.com/stretchr/testify/require"
	"google.golang.org/protobuf/proto"

	"github.com/towns-protocol/towns/core/node/events"
	. "github.com/towns-protocol/towns/core/node/protocol"
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
	require.Equal(8, totalEvents, "Should have 8 events total (space inception + membership + 6 test events across 2 miniblocks)")

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

	require.Equal(5, filteredEvents, "Should have 5 events after filtering out key_solicitation (space inception + membership + username + display_name + ens_address)")
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
	require.Equal(1, filteredEvents, "Should have 1 event after filtering out all member payloads (just space inception)")
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
	require.Equal(1, partialMiniblockCount, "Should have 1 partial miniblock (the one containing the ens_address event)")
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
	
	require.Equal(4, filteredEvents, "Should have 4 events after filtering out key_solicitation AND display_name (space inception + membership + username + ens_address)")
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