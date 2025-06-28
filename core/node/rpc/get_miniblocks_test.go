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

	// Test case 1: No exclusion filter - should return all events
	getMbReq := &GetMiniblocksRequest{
		StreamId:        spaceId[:],
		FromInclusive:   0,
		ToExclusive:     10,
		OmitSnapshots:   true,
		ExclusionFilter: []string{},
	}
	getMbResp, err := alice.client.GetMiniblocks(tt.ctx, connect.NewRequest(getMbReq))
	require.NoError(err)
	
	// Count total events across all miniblocks
	totalEvents := 0
	for _, mb := range getMbResp.Msg.Miniblocks {
		totalEvents += len(mb.Events)
		require.False(mb.Partial) // Should not be partial when no filter applied
	}
	require.Equal(5, totalEvents, "Should have 5 events total (space inception + membership + 3 test events)")

	// Test case 2: Filter out key_solicitation events
	getMbReq.ExclusionFilter = []string{"member_payload.key_solicitation"}
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

	require.Equal(3, filteredEvents, "Should have 3 events after filtering (space inception + membership + username)")
	require.True(hasPartialMiniblock, "Should have at least one partial miniblock")
	require.True(foundInception, "Should find inception event")
	require.True(foundMembership, "Should find membership event")
	require.True(foundUsername, "Should find username event")
	require.False(foundKeySolicitation, "Should NOT find key_solicitation events")

	// Test case 3: Filter out all member_payload events
	getMbReq.ExclusionFilter = []string{"member_payload.*"}
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
	getMbReq.ExclusionFilter = []string{"nonexistent_payload.nonexistent_content"}
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
	require.Equal(5, filteredEvents, "Should have all 5 events when filter doesn't match")
	require.False(hasPartialMiniblock, "Should NOT have any partial miniblocks when no events are filtered")
}

func TestMatchesFilter(t *testing.T) {
	service := &Service{}

	// Test exact matches
	require.True(t, service.matchesFilter("member_payload", "key_solicitation", "member_payload.key_solicitation"))
	require.False(t, service.matchesFilter("member_payload", "username", "member_payload.key_solicitation"))

	// Test wildcard content type
	require.True(t, service.matchesFilter("member_payload", "key_solicitation", "member_payload.*"))
	require.True(t, service.matchesFilter("member_payload", "username", "member_payload.*"))
	require.False(t, service.matchesFilter("space_payload", "inception", "member_payload.*"))

	// Test wildcard payload type
	require.True(t, service.matchesFilter("member_payload", "key_solicitation", "*.key_solicitation"))
	require.True(t, service.matchesFilter("space_payload", "key_solicitation", "*.key_solicitation"))
	require.False(t, service.matchesFilter("member_payload", "username", "*.key_solicitation"))

	// Test invalid filter formats
	require.False(t, service.matchesFilter("member_payload", "key_solicitation", "invalid_filter"))
	require.False(t, service.matchesFilter("member_payload", "key_solicitation", "too.many.parts.here"))
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