package rpc

import (
	"testing"

	"connectrpc.com/connect"
	"github.com/stretchr/testify/require"
	"google.golang.org/protobuf/proto"

	"github.com/towns-protocol/towns/core/node/events"
	. "github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/testutils"
)

func TestGetMiniblocksExclusionFilter(t *testing.T) {
	tt := newServiceTester(t, serviceTesterOpts{numNodes: 1, start: true})
	require := tt.require

	// Create a test client
	alice := tt.newTestClient(0, testClientOpts{})
	alice.createUserStream()

	// Create a space stream with multiple event types
	spaceId := testutils.FakeStreamId(STREAM_SPACE_BIN)
	
	// Create inception event
	inception, err := events.MakeEnvelopeWithPayload(
		alice.wallet,
		events.Make_SpacePayload_Inception(spaceId, &StreamSettings{}),
		nil,
	)
	require.NoError(err)

	// Create key solicitation events
	keySolicitation1, err := events.MakeEnvelopeWithPayload(
		alice.wallet,
		&StreamEvent_MemberPayload{
			MemberPayload: &MemberPayload{
				Content: &MemberPayload_KeySolicitation_{
					KeySolicitation: &MemberPayload_KeySolicitation{
						DeviceKey:   "test_device_key",
						FallbackKey: "test_fallback_key",
						IsNewDevice: true,
						SessionIds:  []string{},
					},
				},
			},
		},
		nil,
	)
	require.NoError(err)

	// Create username event
	username, err := events.MakeEnvelopeWithPayload(
		alice.wallet,
		&StreamEvent_MemberPayload{
			MemberPayload: &MemberPayload{
				Content: &MemberPayload_Username{
					Username: &EncryptedData{
						Ciphertext: "test_username",
						Algorithm:  "test_algo",
					},
				},
			},
		},
		nil,
	)
	require.NoError(err)

	// Create second key solicitation event
	keySolicitation2, err := events.MakeEnvelopeWithPayload(
		alice.wallet,
		&StreamEvent_MemberPayload{
			MemberPayload: &MemberPayload{
				Content: &MemberPayload_KeySolicitation_{
					KeySolicitation: &MemberPayload_KeySolicitation{
						DeviceKey:   "test_device_key_2",
						FallbackKey: "test_fallback_key_2",
						IsNewDevice: false,
						SessionIds:  []string{"session1"},
					},
				},
			},
		},
		nil,
	)
	require.NoError(err)

	// Create the stream with events
	spaceEvents := []*Envelope{inception, keySolicitation1, username, keySolicitation2}
	req := &CreateStreamRequest{
		Events:   spaceEvents,
		StreamId: spaceId[:],
	}
	response, err := alice.client.CreateStream(tt.ctx, connect.NewRequest(req))
	require.NoError(err)
	require.NotNil(response.Msg.Stream)

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
	require.Len(getMbResp.Msg.Miniblocks, 1) // Should have 1 miniblock
	require.Len(getMbResp.Msg.Miniblocks[0].Events, 4) // All 4 events
	require.False(getMbResp.Msg.Miniblocks[0].Partial) // Not partial

	// Test case 2: Filter out key_solicitation events
	getMbReq.ExclusionFilter = []string{"member_payload.key_solicitation"}
	getMbResp, err = alice.client.GetMiniblocks(tt.ctx, connect.NewRequest(getMbReq))
	require.NoError(err)
	require.Len(getMbResp.Msg.Miniblocks, 1)
	require.Len(getMbResp.Msg.Miniblocks[0].Events, 2) // Should have 2 events (inception + username)
	require.True(getMbResp.Msg.Miniblocks[0].Partial)  // Should be marked as partial

	// Verify that the remaining events are correct
	mb := getMbResp.Msg.Miniblocks[0]
	foundInception := false
	foundUsername := false
	foundKeySolicitation := false

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
			if payload.MemberPayload.GetKeySolicitation() != nil {
				foundKeySolicitation = true
			}
			if payload.MemberPayload.GetUsername() != nil {
				foundUsername = true
			}
		}
	}

	require.True(foundInception, "Should find inception event")
	require.True(foundUsername, "Should find username event")
	require.False(foundKeySolicitation, "Should NOT find key_solicitation events")

	// Test case 3: Filter out all member_payload events
	getMbReq.ExclusionFilter = []string{"member_payload.*"}
	getMbResp, err = alice.client.GetMiniblocks(tt.ctx, connect.NewRequest(getMbReq))
	require.NoError(err)
	require.Len(getMbResp.Msg.Miniblocks, 1)
	require.Len(getMbResp.Msg.Miniblocks[0].Events, 1) // Should have 1 event (just inception)
	require.True(getMbResp.Msg.Miniblocks[0].Partial)  // Should be marked as partial

	// Test case 4: Multiple filters
	getMbReq.ExclusionFilter = []string{"member_payload.key_solicitation", "member_payload.username"}
	getMbResp, err = alice.client.GetMiniblocks(tt.ctx, connect.NewRequest(getMbReq))
	require.NoError(err)
	require.Len(getMbResp.Msg.Miniblocks, 1)
	require.Len(getMbResp.Msg.Miniblocks[0].Events, 1) // Should have 1 event (just inception)
	require.True(getMbResp.Msg.Miniblocks[0].Partial)  // Should be marked as partial

	// Test case 5: Filter that doesn't match anything
	getMbReq.ExclusionFilter = []string{"nonexistent_payload.nonexistent_content"}
	getMbResp, err = alice.client.GetMiniblocks(tt.ctx, connect.NewRequest(getMbReq))
	require.NoError(err)
	require.Len(getMbResp.Msg.Miniblocks, 1)
	require.Len(getMbResp.Msg.Miniblocks[0].Events, 4) // Should have all 4 events
	require.False(getMbResp.Msg.Miniblocks[0].Partial) // Should NOT be marked as partial
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