package migrations

import (
	"testing"

	"github.com/river-build/river/core/node/base/test"
	"github.com/river-build/river/core/node/crypto"
	. "github.com/river-build/river/core/node/protocol"
	"github.com/river-build/river/core/node/testutils"
	"github.com/stretchr/testify/require"
)

// nasty bug with the insert_sorted function, it was inserting an extra element at the end
// every insert, we need to remove duplicates

func TestSnapshotMigration0001(t *testing.T) {
	ctx, cancel := test.NewTestContext()
	defer cancel()
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
	migratedSnapshot := snapshot_migration_0001(badMemberSnap)
	require.Equal(t, 1, len(migratedSnapshot.Members.Joined))

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
	migratedSnapshot = snapshot_migration_0001(badSpaceChannel)
	require.Equal(t, 1, len(migratedSnapshot.GetSpaceContent().Channels))

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
	migratedSnapshot = snapshot_migration_0001(badUserPayload)
	require.Equal(t, 1, len(migratedSnapshot.GetUserContent().Memberships))

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
	migratedSnapshot = snapshot_migration_0001(badUserSettings)
	require.Equal(t, 1, len(migratedSnapshot.GetUserSettingsContent().FullyReadMarkers))
}
