package sync

import (
	"context"
	"testing"

	mapset "github.com/deckarep/golang-set/v2"
	"github.com/ethereum/go-ethereum/common"
	"github.com/stretchr/testify/require"
	"google.golang.org/protobuf/proto"

	. "github.com/towns-protocol/towns/core/node/events"
	. "github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/shared"
)

// mockUserPreferences implements UserPreferencesStore for testing
type mockUserPreferences struct {
	blocked map[common.Address]map[common.Address]bool
}

func newMockUserPreferences() *mockUserPreferences {
	return &mockUserPreferences{
		blocked: make(map[common.Address]map[common.Address]bool),
	}
}

func (m *mockUserPreferences) BlockUser(user, blockedUser common.Address) {
	if m.blocked[user] == nil {
		m.blocked[user] = make(map[common.Address]bool)
	}
	m.blocked[user][blockedUser] = true
}

func (m *mockUserPreferences) UnblockUser(user, blockedUser common.Address) {
	if m.blocked[user] != nil {
		delete(m.blocked[user], blockedUser)
	}
}

func (m *mockUserPreferences) IsBlocked(user, blockedUser common.Address) bool {
	if m.blocked[user] == nil {
		return false
	}
	return m.blocked[user][blockedUser]
}

// mockListener implements StreamEventListener for testing
type mockListener struct {
	messageEvents []*ParsedEvent
}

func newMockListener() *mockListener {
	return &mockListener{
		messageEvents: make([]*ParsedEvent, 0),
	}
}

func (m *mockListener) OnMessageEvent(
	ctx context.Context,
	streamID shared.StreamId,
	spaceID *shared.StreamId,
	members mapset.Set[string],
	event *ParsedEvent,
) {
	m.messageEvents = append(m.messageEvents, event)
}

// TestNotificationStreamView_MemberTracking verifies that member join/leave events are tracked correctly
func TestNotificationStreamView_MemberTracking(t *testing.T) {
	ctx := context.Background()
	streamID := shared.StreamId{0x20} // Channel stream

	// Create snapshot with 2 initial members
	member1 := common.HexToAddress("0x1111111111111111111111111111111111111111")
	member2 := common.HexToAddress("0x2222222222222222222222222222222222222222")

	snapshot := &Snapshot{
		Content: &Snapshot_ChannelContent{
			ChannelContent: &ChannelPayload_Snapshot{},
		},
		Members: &MemberPayload_Snapshot{
			Joined: []*MemberPayload_Snapshot_Member{
				{UserAddress: member1.Bytes()},
				{UserAddress: member2.Bytes()},
			},
		},
	}

	snapshotBytes, err := proto.Marshal(snapshot)
	require.NoError(t, err)

	stream := &StreamAndCookie{
		Snapshot: &Envelope{Event: snapshotBytes},
	}

	prefs := newMockUserPreferences()
	listener := newMockListener()
	view, err := NewNotificationStreamView(ctx, streamID, nil, stream, listener, prefs)
	require.NoError(t, err)

	// Verify initial members
	members, err := view.GetChannelMembers()
	require.NoError(t, err)
	require.Equal(t, 2, members.Cardinality())
	require.True(t, members.Contains(member1.Hex()))
	require.True(t, members.Contains(member2.Hex()))

	// Test member join
	member3 := common.HexToAddress("0x3333333333333333333333333333333333333333")
	joinEvent := &StreamEvent{
		Payload: &StreamEvent_MemberPayload{
			MemberPayload: &MemberPayload{
				Content: &MemberPayload_Membership_{
					Membership: &MemberPayload_Membership{
						Op:          MembershipOp_SO_JOIN,
						UserAddress: member3.Bytes(),
					},
				},
			},
		},
	}

	// Note: tests bypass hash validation by directly processing membership
	err = view.updateMembershipFromEvent(joinEvent)
	require.NoError(t, err)

	// Verify member was added
	members, err = view.GetChannelMembers()
	require.NoError(t, err)
	require.Equal(t, 3, members.Cardinality())
	require.True(t, members.Contains(member3.Hex()))

	// Test member leave
	leaveEvent := &StreamEvent{
		Payload: &StreamEvent_MemberPayload{
			MemberPayload: &MemberPayload{
				Content: &MemberPayload_Membership_{
					Membership: &MemberPayload_Membership{
						Op:          MembershipOp_SO_LEAVE,
						UserAddress: member1.Bytes(),
					},
				},
			},
		},
	}

	err = view.updateMembershipFromEvent(leaveEvent)
	require.NoError(t, err)

	// Verify member was removed
	members, err = view.GetChannelMembers()
	require.NoError(t, err)
	require.Equal(t, 2, members.Cardinality())
	require.False(t, members.Contains(member1.Hex()))
	require.True(t, members.Contains(member2.Hex()))
	require.True(t, members.Contains(member3.Hex()))
}

// TestNotificationStreamView_BlockedUsers verifies blocked user tracking
func TestNotificationStreamView_BlockedUsers(t *testing.T) {
	ctx := context.Background()
	user := common.HexToAddress("0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")
	blockedUser := common.HexToAddress("0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb")

	// User settings stream ID (0xa5 prefix + user address)
	streamID := shared.StreamId{0xa5}
	copy(streamID[1:21], user.Bytes())

	snapshot := &Snapshot{
		Content: &Snapshot_UserSettingsContent{
			UserSettingsContent: &UserSettingsPayload_Snapshot{},
		},
	}

	snapshotBytes, err := proto.Marshal(snapshot)
	require.NoError(t, err)

	stream := &StreamAndCookie{
		Snapshot: &Envelope{Event: snapshotBytes},
	}

	prefs := newMockUserPreferences()
	listener := newMockListener()
	_, err = NewNotificationStreamView(ctx, streamID, nil, stream, listener, prefs)
	require.NoError(t, err)

	// Test blocking (preferences store is shared across all streams)
	prefs.BlockUser(user, blockedUser)

	// Verify user was blocked
	require.True(t, prefs.IsBlocked(user, blockedUser))

	// Test unblocking
	prefs.UnblockUser(user, blockedUser)

	// Verify user was unblocked
	require.False(t, prefs.IsBlocked(user, blockedUser))
}
