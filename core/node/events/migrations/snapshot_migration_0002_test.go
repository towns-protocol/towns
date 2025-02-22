package migrations

import (
	"bytes"
	"testing"

	"github.com/stretchr/testify/require"

	. "github.com/towns-protocol/towns/core/node/protocol"

	"github.com/towns-protocol/towns/core/node/shared"
)

func TestSnapshotMigration0002(t *testing.T) {
	spaceId, err := shared.MakeSpaceId()
	require.NoError(t, err)

	defaultChannelId, err := shared.MakeDefaultChannelId(spaceId)
	require.NoError(t, err)

	channelId1, err := shared.MakeChannelId(spaceId)
	require.NoError(t, err)

	spaceSnap := &Snapshot{
		Content: &Snapshot_SpaceContent{
			SpaceContent: &SpacePayload_Snapshot{
				Inception: &SpacePayload_Inception{
					StreamId: spaceId[:],
				},
				Channels: []*SpacePayload_ChannelMetadata{
					{
						ChannelId: defaultChannelId[:],
					},
					{
						ChannelId: channelId1[:],
					},
				},
			},
		},
	}

	migratedSnapshot := snapshot_migration_0002(spaceSnap)

	require.Equal(t, 2, len(migratedSnapshot.GetSpaceContent().Channels))

	require.True(t, bytes.Equal(migratedSnapshot.GetSpaceContent().Channels[0].ChannelId, defaultChannelId[:]))
	require.True(t, bytes.Equal(migratedSnapshot.GetSpaceContent().Channels[1].ChannelId, channelId1[:]))

	require.True(t, migratedSnapshot.GetSpaceContent().Channels[0].Settings.Autojoin)
	require.False(t, migratedSnapshot.GetSpaceContent().Channels[1].Settings.Autojoin)

	require.False(t, migratedSnapshot.GetSpaceContent().Channels[0].Settings.HideUserJoinLeaveEvents)
	require.False(t, migratedSnapshot.GetSpaceContent().Channels[1].Settings.HideUserJoinLeaveEvents)
}
