package migrations

import (
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/towns-protocol/towns/core/node/base/test"
	"github.com/towns-protocol/towns/core/node/crypto"
	. "github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/testutils"
)

// nasty bug with the insert_sorted function, it was inserting an extra element at the end
// every insert, we need to remove duplicates

func TestSnapshotMigration0001(t *testing.T) {
	ctx := test.NewTestContext(t)
	userWallet, _ := crypto.NewWallet(ctx)
	spaceId := testutils.FakeStreamId(0x10) // events.STREAM_SPACE_BIN
	channelId := testutils.MakeChannelId(spaceId)

	// snaps have multiple member instances
	badMemberSnap := &Snapshot{
		Members: &MemberPayload_Snapshot{
			Joined: []*MemberPayload_Snapshot_Member{
				{
					UserAddress: userWallet.Address[:],
				},
				{
					UserAddress: userWallet.Address[:],
				},
			},
		},
	}
	// migrate
	snapshot_migration_0001(badMemberSnap)
	require.Equal(t, 1, len(badMemberSnap.Members.Joined))

	// space channel payloads
	badSpaceChannel := &Snapshot{
		Content: &Snapshot_SpaceContent{
			SpaceContent: &SpacePayload_Snapshot{
				Channels: []*SpacePayload_ChannelMetadata{
					{
						ChannelId: channelId[:],
					},
					{
						ChannelId: channelId[:],
					},
				},
			},
		},
	}
	snapshot_migration_0001(badSpaceChannel)
	require.Equal(t, 1, len(badSpaceChannel.GetSpaceContent().Channels))

	// user payload user membership
	badUserPayload := &Snapshot{
		Content: &Snapshot_UserContent{
			UserContent: &UserPayload_Snapshot{
				Memberships: []*UserPayload_UserMembership{
					{
						StreamId: spaceId[:],
					},
					{
						StreamId: spaceId[:],
					},
				},
			},
		},
	}
	snapshot_migration_0001(badUserPayload)
	require.Equal(t, 1, len(badUserPayload.GetUserContent().Memberships))

	// user settings fully read markers
	badUserSettings := &Snapshot{
		Content: &Snapshot_UserSettingsContent{
			UserSettingsContent: &UserSettingsPayload_Snapshot{
				FullyReadMarkers: []*UserSettingsPayload_FullyReadMarkers{
					{
						StreamId: channelId[:],
					},
					{
						StreamId: channelId[:],
					},
				},
			},
		},
	}
	snapshot_migration_0001(badUserSettings)
	require.Equal(t, 1, len(badUserSettings.GetUserSettingsContent().FullyReadMarkers))
}
